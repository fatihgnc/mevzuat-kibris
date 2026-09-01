import 'server-only';

import { sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
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

export async function getEntity(kind: EntityKind, slug: string): Promise<EntityRow | null> {
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
export async function coOccurring(entityId: number, limit = 8): Promise<CoOccurringEntity[]> {
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
