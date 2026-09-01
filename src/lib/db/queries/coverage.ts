import 'server-only';

import { sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { ARCHIVE_START_YEAR } from '@/lib/seo/config';
import { coverageSince, dativeYear } from '@/lib/text/turkish-number';

import { formatCount, type Row } from './shared';

/**
 * Real archive coverage — the second half of spec 8.4's coverage rule.
 *
 * ARCHIVE_START_YEAR remains the archive's INTENDED start and the single source
 * of truth (the sitemap, year navigation and the valid year range all feed from
 * it). But WRITING "from 2006 to today" on the page is a different matter: that
 * is a coverage CLAIM, and without data behind it, it is a lie.
 *
 * Backfill (spec 15 Milestone 5) is a job that advances in the background; until
 * it finishes, a site claiming 2006 leaves a user searching 2010 with no results
 * — exactly the thing spec 8.4 says "destroys trust in one go". So the sentence
 * shown is derived from the data: we state what we actually have.
 */
export interface ArchiveCoverage {
  earliestYear: number | null;
  latestYear: number | null;
  totalRecords: number;
  /** Whether the intended start has been reached — if not, backfill is still running. */
  isComplete: boolean;
}

/**
 * If `topic` is given, coverage is narrowed to that topic. A topic page makes a
 * coverage claim too ("N records, from 2006 to today"), and that claim also has
 * to rest on data: if vacancies have only been processed since 2019, it should
 * say so.
 */
export async function archiveCoverage(topic?: string): Promise<ArchiveCoverage> {
  const scope = topic
    ? sql`join record_topics rt on rt.record_id = r.id and rt.topic = ${topic}`
    : sql``;

  const rows = await db.execute<
    Row<{ earliest: number | null; latest: number | null; total: string }>
  >(sql`
    select min(i.year)::int as earliest,
           max(i.year)::int as latest,
           count(r.id)::int as total
      from records r
      join issues i on i.id = r.issue_id
      ${scope}
  `);

  const row = rows[0];
  const earliestYear = row?.earliest ?? null;
  const totalRecords = Number(row?.total ?? 0);

  return {
    earliestYear,
    latestYear: row?.latest ?? null,
    totalRecords,
    isComplete: earliestYear !== null && earliestYear <= ARCHIVE_START_YEAR,
  };
}

/**
 * The coverage sentence. There are three cases, and all three must say something
 * different:
 *
 *   no data              -> NO coverage claim
 *   backfill in progress -> the real range we hold, plus the fact it is ongoing
 *   backfill complete    -> the intended coverage
 */
export function coverageSentence(coverage: ArchiveCoverage): string {
  if (!coverage.totalRecords || coverage.earliestYear === null) {
    return 'Arşiv henüz hazırlanıyor, kayıtlar yüklendikçe burada görünecek.';
  }

  const count = formatCount(coverage.totalRecords) + ' kayıt';

  if (coverage.isComplete) {
    return coverageSince(ARCHIVE_START_YEAR) + ' ' + count + '.';
  }

  const range =
    coverage.earliestYear === coverage.latestYear
      ? 'yalnızca ' + coverage.earliestYear + ' yılından'
      : coverage.earliestYear + '–' + coverage.latestYear + ' arasından';

  return (
    'Şu an ' +
    range +
    ' ' +
    count +
    '; arşiv ' +
    dativeYear(ARCHIVE_START_YEAR) +
    ' doğru geriye genişletiliyor.'
  );
}

/** The short form, for the footer and static pages. */
export function coverageShort(coverage: ArchiveCoverage): string {
  if (!coverage.totalRecords || coverage.earliestYear === null) {
    return 'Arşiv hazırlanıyor';
  }
  if (coverage.isComplete) {
    return 'Arşiv ' + coverageSince(ARCHIVE_START_YEAR);
  }
  const range =
    coverage.earliestYear === coverage.latestYear
      ? String(coverage.earliestYear)
      : coverage.earliestYear + '–' + coverage.latestYear;
  return 'Arşiv ' + range + ', geriye doğru genişliyor';
}

/** The year range only — for topic page and filter rail labels. */
export function coverageRange(coverage: ArchiveCoverage): string | null {
  if (!coverage.totalRecords || coverage.earliestYear === null) return null;
  if (coverage.isComplete) return coverageSince(ARCHIVE_START_YEAR);
  if (coverage.earliestYear === coverage.latestYear) return String(coverage.earliestYear);
  return coverage.earliestYear + '–' + coverage.latestYear;
}
