import { sql } from 'drizzle-orm';
import { docTypeLabel, formatRef } from '@/lib/constants/doc-types';
import { TOPICS, isTopicSlug, type TopicSlug } from '@/lib/constants/topics';
import { overlayMatches, parseHeadline } from '@/lib/search/highlight';
import { maskTitle } from '@/lib/search/mask-title';
import type { RecordListItem } from '@/types/record';

/**
 * drizzle's db.execute generic imposes a Record<string, unknown> constraint. We
 * wrap the raw row interfaces so they satisfy it; the field types are preserved
 * and only an index signature is added.
 */
export type Row<T> = T & Record<string, unknown>;

/**
 * The safe way to get JS arrays into SQL.
 *
 * drizzle's sql template passes parameters to postgres-js positionally, and on
 * that path postgres-js's array serialisation IS NOT INVOKED: in `= any(${array})`
 * Postgres receives the parameter as plain text and fails with "malformed array
 * literal". A ::text[] cast does not save it either, because the problem is in the
 * transport.
 *
 * We use `in (...)` for comparison and `array[...]` for storage; both pass every
 * value as a separate parameter, so they never need array serialisation and stay
 * closed to SQL injection.
 */
export function inList(values: readonly (string | number)[]) {
  return sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  );
}

export function arrayParam(values: readonly (string | number)[], cast: string) {
  if (!values.length) return sql.raw("'{}'::" + cast);
  return sql`array[${inList(values)}]::${sql.raw(cast)}`;
}

/** The shared SELECT body of the list queries — kept in one place so the fields cannot drift. */
export const LIST_COLUMNS = `
  r.id,
  r.slug,
  r.has_own_page,
  r.title,
  r.summary,
  r.doc_type,
  r.ref_type,
  r.ref_number,
  r.published_at,
  r.deadline_at,
  i.year   as issue_year,
  i.number as issue_number,
  coalesce(tp.slugs, '{}') as topics,
  inst.name as institution,
  (r.body_text is not null and length(r.body_text) > 0) as has_body
`;

/**
 * The topic list and the primary institution come from a lateral join. The
 * lateral reads at most a few rows per record; done with GROUP BY, the whole
 * result set would have to be grouped before pagination.
 */
export const LIST_JOINS = `
  join issues i on i.id = r.issue_id
  left join lateral (
    select array_agg(rt.topic order by rt.topic) as slugs
      from record_topics rt
     where rt.record_id = r.id
  ) tp on true
  left join lateral (
    select e.name
      from record_entities re
      join entities e on e.id = re.entity_id
     where re.record_id = r.id and e.kind = 'institution'
     order by re.confidence desc, e.record_count desc
     limit 1
  ) inst on true
`;

export interface RawListRow {
  id: string | number;
  slug: string;
  has_own_page: boolean;
  title: string;
  summary: string | null;
  doc_type: string;
  ref_type: string | null;
  ref_number: string | null;
  published_at: string | Date;
  deadline_at: string | Date | null;
  issue_year: number;
  issue_number: number;
  topics: string[] | null;
  institution: string | null;
  has_body: boolean;
  snippet?: string | null;
}

function toDateString(value: string | Date | null): string | null {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

/**
 * The primary topic — it determines the coloured dot on the row. A record can
 * belong to several topics (spec 3.5); the design has a single dot, so the one
 * earliest in topic order is picked. Because that order is fixed, the same record
 * gets the same colour in every list.
 */
function pickPrimaryTopic(topics: TopicSlug[]): TopicSlug | null {
  if (!topics.length) return null;
  return [...topics].sort((a, b) => TOPICS[a].sortOrder - TOPICS[b].sortOrder)[0] ?? null;
}

/**
 * Turns a raw row into a list item; masking and highlighting happen here.
 *
 * If `query` is given, the match is overlaid on both the title mask and the
 * snippet. ts_headline already inserts its own delimiters, but the title does not
 * go through ts_headline (we need its masked form), so its highlighting is done
 * application-side.
 */
export function mapListItem(row: RawListRow, query = ''): RecordListItem {
  const topics = (row.topics ?? []).filter(isTopicSlug);
  const titleTokens = maskTitle(row.title);
  const snippet = parseHeadline(row.snippet);

  return {
    id: Number(row.id),
    slug: row.slug,
    hasOwnPage: row.has_own_page,
    issueYear: row.issue_year,
    issueNumber: row.issue_number,
    publishedAt: toDateString(row.published_at)!,
    refLabel: formatRef(row.ref_type, row.ref_number),
    title: row.title,
    titleTokens: query ? overlayMatches(titleTokens, query) : titleTokens,
    summary: row.summary,
    docType: row.doc_type as RecordListItem['docType'],
    docTypeLabel: docTypeLabel(row.doc_type),
    topics,
    primaryTopic: pickPrimaryTopic(topics),
    institution: row.institution,
    hasBody: row.has_body,
    snippet,
    deadlineAt: toDateString(row.deadline_at),
  };
}

/**
 * The record link — thin records get no page of their own (spec 8.2 rule 2) and
 * point at their anchor on the issue page instead.
 */
export function recordHref(item: Pick<RecordListItem, 'slug' | 'hasOwnPage' | 'issueYear' | 'issueNumber' | 'refLabel'>): string {
  if (item.hasOwnPage) return '/karar/' + item.slug;
  const anchor = item.refLabel ? '#karar-' + encodeURIComponent(item.refLabel) : '';
  return '/sayilar/' + item.issueYear + '/' + item.issueNumber + anchor;
}

/** The format used in issue listings: "1.280" */
export function formatCount(value: number): string {
  return value.toLocaleString('tr-TR');
}
