import 'server-only';

import { sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { arrayParam, inList, type Row } from './shared';
import type { AlertFrequency, AlertRow } from '@/types/alert';
import type { DocType } from '@/lib/constants/doc-types';
import type { TopicSlug } from '@/lib/constants/topics';

interface RawAlert {
  id: string | number;
  user_id: string;
  label: string;
  query: string | null;
  topics: string[] | null;
  doc_types: string[] | null;
  entity_ids: Array<string | number> | null;
  frequency: string;
  preferred_weekday: number;
  is_active: boolean;
  last_sent_at: string | Date | null;
  created_at: string | Date;
}

function mapAlert(row: RawAlert): AlertRow {
  return {
    id: Number(row.id),
    userId: row.user_id,
    label: row.label,
    query: row.query,
    topics: (row.topics ?? []) as TopicSlug[],
    docTypes: (row.doc_types ?? []) as DocType[],
    entityIds: (row.entity_ids ?? []).map(Number),
    frequency: row.frequency as AlertFrequency,
    preferredWeekday: row.preferred_weekday,
    isActive: row.is_active,
    lastSentAt: row.last_sent_at ? new Date(row.last_sent_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listAlerts(userId: string): Promise<AlertRow[]> {
  const rows = await db.execute<Row<RawAlert>>(sql`
    select * from alerts where user_id = ${userId} order by created_at desc
  `);
  return rows.map(mapAlert);
}

export interface CreateAlertInput {
  userId: string;
  label: string;
  query?: string | null;
  topics?: TopicSlug[];
  docTypes?: DocType[];
  entityIds?: number[];
  frequency: AlertFrequency;
}

/**
 * Creates an alert and assigns a weekly subscriber to a day of the week (spec
 * 10.3 rule 2).
 *
 * The day is deterministic via assign_weekday(user_id): all of a user's weekly
 * alerts go out on the same day and can be combined into one email. If the daily
 * subscriber count has passed 60, the request is converted to weekly (spec 10.3
 * rule 5) — not silently: the caller must show the returned `frequency` to the
 * user.
 */
export async function createAlert(input: CreateAlertInput): Promise<AlertRow> {
  let frequency = input.frequency;

  if (frequency === 'daily') {
    const rows = await db.execute<Row<{ n: string }>>(sql`
      select count(*)::int as n from alerts where is_active and frequency = 'daily'
    `);
    if (Number(rows[0]?.n ?? 0) >= 60) frequency = 'weekly';
  }

  const rows = await db.execute<Row<RawAlert>>(sql`
    insert into alerts (user_id, label, query, topics, doc_types, entity_ids, frequency, preferred_weekday)
    values (
      ${input.userId},
      ${input.label},
      ${input.query ?? null},
      ${arrayParam(input.topics ?? [], 'text[]')},
      ${arrayParam(input.docTypes ?? [], 'text[]')},
      ${arrayParam(input.entityIds ?? [], 'bigint[]')},
      ${frequency},
      assign_weekday(${input.userId}::uuid)
    )
    returning *
  `);

  return mapAlert(rows[0]!);
}

export async function setAlertActive(
  alertId: number,
  userId: string,
  isActive: boolean,
): Promise<void> {
  await db.execute(sql`
    update alerts set is_active = ${isActive} where id = ${alertId} and user_id = ${userId}
  `);
}

export async function deleteAlert(alertId: number, userId: string): Promise<void> {
  await db.execute(sql`delete from alerts where id = ${alertId} and user_id = ${userId}`);
}

/**
 * Quota guard (spec 10.3 rule 4): how many dispatches have gone out today.
 * The Resend free tier's daily ceiling is 100.
 */
export const DAILY_EMAIL_CAP = 100;

export async function todayDeliveryCount(): Promise<number> {
  const rows = await db.execute<Row<{ n: string }>>(sql`
    select count(*)::int as n
      from alert_deliveries
     where status = 'sent' and sent_at::date = current_date
  `);
  return Number(rows[0]?.n ?? 0);
}

/**
 * The matching query — spec 10.2, verbatim.
 * It uses the same search_vector and the same tr_rg configuration as search, so
 * that what the user saw in search is what they get in the alert.
 */
export async function matchAlerts(
  newRecordIds: number[],
  frequency: AlertFrequency,
  weekday?: number,
): Promise<Array<{ alertId: number; userId: string; recordIds: number[] }>> {
  if (!newRecordIds.length) return [];

  const weekdayCondition =
    frequency === 'weekly' && weekday !== undefined
      ? sql`and a.preferred_weekday = ${weekday}`
      : sql``;

  const rows = await db.execute<Row<{ id: string; user_id: string; matched: Array<string | number> }>>(sql`
    select a.id, a.user_id, array_agg(distinct r.id) as matched
      from alerts a
      join records r on r.id in (${inList(newRecordIds)})
      left join record_topics rt   on rt.record_id = r.id
      left join record_entities re on re.record_id = r.id
     where a.is_active
       and a.frequency = ${frequency}
       ${weekdayCondition}
       and (
             (a.query is not null and r.search_vector @@ mk_tsquery(a.query))
          or (cardinality(a.topics)     > 0 and rt.topic     = any(a.topics))
          or (cardinality(a.doc_types)  > 0 and r.doc_type   = any(a.doc_types))
          or (cardinality(a.entity_ids) > 0 and re.entity_id = any(a.entity_ids))
       )
     group by a.id, a.user_id
  `);

  return rows.map((row) => ({
    alertId: Number(row.id),
    userId: row.user_id,
    recordIds: row.matched.map(Number),
  }));
}

export async function recordDelivery(
  alertId: number,
  recordIds: number[],
  status: 'sent' | 'failed' | 'skipped' | 'deferred',
  providerId?: string,
): Promise<void> {
  await db.execute(sql`
    insert into alert_deliveries (alert_id, record_ids, status, provider_id)
    values (${alertId}, ${arrayParam(recordIds, 'bigint[]')}, ${status}, ${providerId ?? null})
  `);

  if (status === 'sent') {
    await db.execute(sql`update alerts set last_sent_at = now() where id = ${alertId}`);
  }
}
