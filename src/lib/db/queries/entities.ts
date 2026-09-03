import 'server-only';

import { sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { TAG, cachedQuery } from '@/lib/db/cache';
import { type Row } from './shared';
import { normalizeForSearch } from '@/lib/text/turkish-lower';
import type { CoOccurringEntity, EntityRow } from '@/types/entity';
import type { EntityKind } from '@/types/record';

interface RawEntity {
  id: string | number;
  kind: string;
  slug: string;
  name: string;
  name_normalized: string;
  aliases: string[] | null;
  district: string | null;
  record_count: number;
}

function mapEntity(row: RawEntity): EntityRow {
  return {
    id: Number(row.id),
    kind: row.kind as EntityKind,
    slug: row.slug,
    name: row.name,
    nameNormalized: row.name_normalized,
    aliases: row.aliases ?? [],
    district: row.district,
    recordCount: row.record_count,
  };
}

export function getEntity(kind: EntityKind, slug: string): Promise<EntityRow | null> {
  return cachedQuery(['getEntity', kind, slug], [TAG.latest, TAG.entity(slug)], () =>
    getEntityUncached(kind, slug),
  );
}

async function getEntityUncached(kind: EntityKind, slug: string): Promise<EntityRow | null> {
  const rows = await db.execute<Row<RawEntity>>(sql`
    select id, kind, slug, name, name_normalized, aliases, district, record_count
      from entities
     where kind = ${kind} and slug = ${slug}
     limit 1
  `);
  const row = rows[0];
  return row ? mapEntity(row) : null;
}

/** Spec 8.5: the most frequently co-occurring entities. */
export function coOccurring(entityId: number, limit = 8): Promise<CoOccurringEntity[]> {
  // Keyed by id, not slug, so the entity tag cannot be derived here — `latest`
  // covers it: co-occurrence only changes when new records arrive.
  return cachedQuery(['coOccurring', String(entityId), String(limit)], [TAG.latest], () =>
    coOccurringUncached(entityId, limit),
  );
}

async function coOccurringUncached(entityId: number, limit = 8): Promise<CoOccurringEntity[]> {
  const rows = await db.execute<Row<{
    id: string;
    kind: string;
    slug: string;
    name: string;
    shared_records: string;
  }>>(sql`select * from co_occurring_entities(${entityId}, ${limit})`);

  return rows.map((row) => ({
    id: Number(row.id),
    kind: row.kind as EntityKind,
    slug: row.slug,
    name: row.name,
    sharedRecords: Number(row.shared_records),
  }));
}

/**
 * The "search institutions" / "region, village or neighbourhood" boxes in the
 * filter rail. Backed by a trigram index; results are ordered by record count,
 * because users are usually after the most frequently occurring entity.
 */
export async function searchEntities(
  kind: EntityKind,
  query: string,
  limit = 8,
): Promise<EntityRow[]> {
  const normalized = normalizeForSearch(query);
  if (normalized.length < 2) return [];

  const rows = await db.execute<Row<RawEntity>>(sql`
    select id, kind, slug, name, name_normalized, aliases, district, record_count
      from entities
     where kind = ${kind}
       and (name_normalized like ${normalized + '%'} or name_normalized % ${normalized})
     order by (name_normalized like ${normalized + '%'}) desc, record_count desc
     limit ${limit}
  `);

  return rows.map(mapEntity);
}

/**
 * The 20 most active institutions in the footer (spec 8.5) and the place chips on
 * topic pages. Empty entity pages are not generated: anything with record_count <
 * 2 is never returned (spec 8.2 rule 3).
 */
export async function topEntities(kind: EntityKind, limit = 20): Promise<EntityRow[]> {
  const rows = await db.execute<Row<RawEntity>>(sql`
    select id, kind, slug, name, name_normalized, aliases, district, record_count
      from entities
     where kind = ${kind} and record_count >= 2
     order by record_count desc, name
     limit ${limit}
  `);
  return rows.map(mapEntity);
}

/** For the sitemap and generateStaticParams — the same 2-record threshold applies. */
export async function entitySlugs(kind: EntityKind): Promise<string[]> {
  const rows = await db.execute<Row<{ slug: string }>>(sql`
    select slug from entities where kind = ${kind} and record_count >= 2 order by record_count desc
  `);
  return rows.map((row) => row.slug);
}

/**
 * The entity index pages — /kurum, /sirket, /yer.
 *
 * THE `record_count >= 2` THRESHOLD IS NOT OPTIONAL HERE. The detail page calls
 * notFound() below it (spec 8.2 rule 3) and the sitemap applies the same filter, so
 * a hub built without it would fill itself with links to 404s — the exact opposite
 * of what a hub is for.
 *
 * Ordered by record count for the reason searchEntities gives: the user is after
 * the most active entity, not the alphabetically first one. `name` only breaks ties.
 */
export function listEntities(
  kind: EntityKind,
  options: { limit: number; offset: number },
): Promise<EntityRow[]> {
  return cachedQuery(
    ['listEntities', kind, String(options.limit), String(options.offset)],
    [TAG.latest],
    () => listEntitiesUncached(kind, options),
  );
}

async function listEntitiesUncached(
  kind: EntityKind,
  options: { limit: number; offset: number },
): Promise<EntityRow[]> {
  const rows = await db.execute<Row<RawEntity>>(sql`
    select id, kind, slug, name, name_normalized, aliases, district, record_count
      from entities
     where kind = ${kind} and record_count >= 2
     order by record_count desc, name
     limit ${options.limit} offset ${options.offset}
  `);
  return rows.map(mapEntity);
}

/** The total behind the index pagination — the same threshold as listEntities. */
export function countEntities(kind: EntityKind): Promise<number> {
  return cachedQuery(['countEntities', kind], [TAG.latest], () => countEntitiesUncached(kind));
}

async function countEntitiesUncached(kind: EntityKind): Promise<number> {
  const rows = await db.execute<Row<{ total: string }>>(sql`
    select count(*)::text as total
      from entities
     where kind = ${kind} and record_count >= 2
  `);
  return Number(rows[0]?.total ?? 0);
}
