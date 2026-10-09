import 'server-only';

import { sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import type { IssueSummary } from '@/types/issue';
import type { RecordListItem } from '@/types/record';

import { LIST_COLUMNS, LIST_JOINS, mapListItem, type RawListRow, type Row } from './shared';

function toDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

interface RawIssue {
  id: string | number;
  year: number;
  number: number;
  published_at: string | Date;
  pdf_url: string;
  page_count: number | null;
  text_status: string;
  text_quality: number | null;
  retry_count: number;
  n: string;
}

function mapIssue(row: RawIssue): IssueSummary {
  return {
    id: Number(row.id),
    year: row.year,
    number: row.number,
    publishedAt: toDate(row.published_at),
    pdfUrl: row.pdf_url,
    pageCount: row.page_count,
    textStatus: row.text_status as IssueSummary['textStatus'],
    textQuality: row.text_quality,
    retryCount: row.retry_count,
    recordCount: Number(row.n),
  };
}

const ISSUE_COLUMNS = `
  i.id, i.year, i.number, i.published_at, i.pdf_url, i.page_count,
  i.text_status, i.text_quality, i.retry_count,
  (select count(*)::int from records r where r.issue_id = i.id) as n
`;

/** /sayilar — the year list and each year's issue count. */
export async function listYears(): Promise<Array<{ year: number; issueCount: number; recordCount: number }>> {
  const rows = await db.execute<Row<{ year: number; issues: string; records: string }>>(sql`
    select i.year,
           count(distinct i.id)::int as issues,
           count(r.id)::int as records
      from issues i
      left join records r on r.issue_id = i.id
     group by i.year
     order by i.year desc
  `);

  return rows.map((row) => ({
    year: row.year,
    issueCount: Number(row.issues),
    recordCount: Number(row.records),
  }));
}

export async function listIssuesByYear(year: number): Promise<IssueSummary[]> {
  const rows = await db.execute<Row<RawIssue>>(sql`
    select ${sql.raw(ISSUE_COLUMNS)}
      from issues i
     where i.year = ${year}
     order by i.number desc
  `);
  return rows.map(mapIssue);
}

export async function getIssue(year: number, number: number): Promise<IssueSummary | null> {
  const rows = await db.execute<Row<RawIssue>>(sql`
    select ${sql.raw(ISSUE_COLUMNS)}
      from issues i
     where i.year = ${year} and i.number = ${number}
     limit 1
  `);
  const row = rows[0];
  return row ? mapIssue(row) : null;
}

/**
 * /bugun — every issue of the most recent publication day, plus the day before it.
 *
 * A day, not an issue: the gazette often publishes two or three numbers on the
 * same date (124, 125 and 126 all came out on 3 Temmuz 2026), and someone asking
 * for "today's gazette" means all of them.
 */
export async function latestIssueDay(): Promise<{
  date: string;
  issues: IssueSummary[];
  previousDate: string | null;
} | null> {
  const rows = await db.execute<Row<RawIssue>>(sql`
    select ${sql.raw(ISSUE_COLUMNS)}
      from issues i
     where i.published_at = (select max(published_at) from issues)
     order by i.number asc
  `);
  if (!rows.length) return null;

  const issues = rows.map(mapIssue);
  const date = issues[0]!.publishedAt;

  const prev = await db.execute<Row<{ d: string | Date | null }>>(sql`
    select max(published_at) as d from issues where published_at < ${date}
  `);
  const previousDate = prev[0]?.d ? toDate(prev[0].d) : null;

  return { date, issues, previousDate };
}

/** The issues published on one date — used to link /bugun to the previous day's numbers. */
export async function issuesOnDate(date: string): Promise<Array<{ year: number; number: number }>> {
  const rows = await db.execute<Row<{ year: number; number: number }>>(sql`
    select year, number from issues where published_at = ${date} order by number asc
  `);
  return rows.map((row) => ({ year: row.year, number: row.number }));
}

/**
 * Issue contents — grouped by section. Thin records are listed here too (they
 * have no page of their own but do get an anchor on the issue page, spec 8.2).
 */
export async function getIssueContents(issueId: number): Promise<RecordListItem[]> {
  const rows = await db.execute<Row<RawListRow & { section: string }>>(sql`
    select ${sql.raw(LIST_COLUMNS)}, null::text as snippet, r.section
      from records r
      ${sql.raw(LIST_JOINS)}
     where r.issue_id = ${issueId}
     order by r.section, r.id
  `);
  return rows.map((row) => mapListItem(row));
}

/** Groups the issue contents in section order. */
export async function getIssueSections(
  issueId: number,
): Promise<Array<{ section: string; records: RecordListItem[] }>> {
  const rows = await db.execute<Row<RawListRow & { section: string }>>(sql`
    select ${sql.raw(LIST_COLUMNS)}, null::text as snippet, r.section
      from records r
      ${sql.raw(LIST_JOINS)}
     where r.issue_id = ${issueId}
     order by r.section, r.id
  `);

  const groups = new Map<string, RecordListItem[]>();
  for (const row of rows) {
    const list = groups.get(row.section) ?? [];
    list.push(mapListItem(row));
    groups.set(row.section, list);
  }

  return [...groups.entries()].map(([section, records]) => ({ section, records }));
}

/** Previous/next issue navigation. */
export async function adjacentIssues(
  year: number,
  number: number,
): Promise<{ prev: { year: number; number: number } | null; next: { year: number; number: number } | null }> {
  const rows = await db.execute<Row<{ direction: string; year: number; number: number }>>(sql`
    (select 'prev' as direction, year, number from issues
      where (year, number) < (${year}, ${number}) order by year desc, number desc limit 1)
    union all
    (select 'next', year, number from issues
      where (year, number) > (${year}, ${number}) order by year asc, number asc limit 1)
  `);

  const prev = rows.find((row) => row.direction === 'prev') ?? null;
  const next = rows.find((row) => row.direction === 'next') ?? null;

  return {
    prev: prev ? { year: prev.year, number: prev.number } : null,
    next: next ? { year: next.year, number: next.number } : null,
  };
}

/** A year's average text quality — for the "low archive quality" label (spec 7.2). */
export async function yearTextQuality(year: number): Promise<number | null> {
  const rows = await db.execute<Row<{ avg: number | null }>>(sql`
    select avg(text_quality)::real as avg from issues where year = ${year} and text_quality is not null
  `);
  return rows[0]?.avg ?? null;
}
