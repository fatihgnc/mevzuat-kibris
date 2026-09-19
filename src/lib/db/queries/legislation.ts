import 'server-only';

import { sql } from 'drizzle-orm';

import { cachedQuery } from '@/lib/db/cache';
import { db } from '@/lib/db/client';
import type { LegislationKind, LegislationSource } from '@/lib/legislation/labels';
import type { LegislationDetail, LegislationItem } from '@/types/legislation';

import { type Row } from './shared';

/**
 * Reads for /yasa and /tuzuk.
 *
 * NO CACHE TAG, ON PURPOSE. `cachedQuery` tags are how ingest invalidates pages
 * through /api/revalidate, and a tag nothing ever fires is a silent no-op — the trap
 * db/cache.ts describes at length. The legislation table is a static snapshot that
 * nothing rewrites, so there is nothing to fire it: these rely on the TTL alone (an
 * hour), which only matters the day the table is loaded or replaced. If something
 * starts updating it, add a tag here and the matching revalidateTag there in the
 * same change.
 */
const TTL = 3600;

interface RawItem {
  slug: string;
  kind: string;
  law_key: string | null;
  title: string;
  law_number: number | null;
  law_year: number | null;
  body_modified_at: Date | string | null;
  body_source: string | null;
}

interface RawDetail extends RawItem {
  body_text: string | null;
  extract_status: string;
  transcribed: boolean;
  portal_url: string | null;
  portal_modified_at: Date | string | null;
  official_url: string | null;
  official_modified_at: Date | string | null;
}

/** timestamptz -> 'YYYY-MM-DD'. Only the day is shown, and the day is what formatDateLong takes. */
function day(value: Date | string | null): string | null {
  if (!value) return null;
  return (value instanceof Date ? value.toISOString() : String(value)).slice(0, 10);
}

function mapItem(row: RawItem): LegislationItem {
  return {
    slug: row.slug,
    kind: row.kind as LegislationKind,
    lawKey: row.law_key,
    title: row.title,
    lawNumber: row.law_number,
    lawYear: row.law_year,
    bodyModifiedAt: day(row.body_modified_at),
    bodySource: row.body_source as LegislationSource | null,
  };
}

/** The list page: every law whose text was extracted, in title order. */
export function listLegislation(kind: LegislationKind): Promise<LegislationItem[]> {
  return cachedQuery(['listLegislation', kind], [], () => listLegislationUncached(kind), TTL);
}

async function listLegislationUncached(kind: LegislationKind): Promise<LegislationItem[]> {
  const rows = await db.execute<Row<RawItem>>(sql`
    select slug, kind, law_key, title, law_number, law_year, body_modified_at, body_source
      from legislation
     where kind = ${kind} and lang = 'tr' and extract_status = 'ok'
     order by title_normalized, law_key
  `);
  return rows.map(mapItem);
}

/** One law by slug. The kind is part of the lookup so /tuzuk/<a-yasa-slug> is a 404. */
export function getLegislation(
  kind: LegislationKind,
  slug: string,
): Promise<LegislationDetail | null> {
  return cachedQuery(['getLegislation', kind, slug], [], () => getLegislationUncached(kind, slug), TTL);
}

async function getLegislationUncached(
  kind: LegislationKind,
  slug: string,
): Promise<LegislationDetail | null> {
  const rows = await db.execute<Row<RawDetail>>(sql`
    select slug, kind, law_key, title, law_number, law_year, body_modified_at, body_source,
           body_text, extract_status, transcribed, portal_url, portal_modified_at,
           official_url, official_modified_at
      from legislation
     where kind = ${kind} and slug = ${slug}
     limit 1
  `);

  const row = rows[0];
  if (!row) return null;

  return {
    ...mapItem(row),
    bodyText: row.body_text,
    extractStatus: row.extract_status as LegislationDetail['extractStatus'],
    transcribed: row.transcribed,
    portalUrl: row.portal_url,
    portalModifiedAt: day(row.portal_modified_at),
    officialUrl: row.official_url,
    officialModifiedAt: day(row.official_modified_at),
  };
}
