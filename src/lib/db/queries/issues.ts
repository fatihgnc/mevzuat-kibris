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

/** /sayilar — yıl listesi ve her yılın sayı adedi. */
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
 * Sayı içeriği — bölüme göre gruplanmış. İnce kayıtlar da burada listelenir
 * (kendi sayfaları yok ama sayı sayfasında anchor alıyorlar, spec 8.2).
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

/** Sayı içeriğini bölüm sırasına göre gruplar. */
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

/** Önceki/sonraki sayı navigasyonu. */
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

/** Bir yılın ortalama metin kalitesi — "arşiv kalitesi düşük" etiketi için (spec 7.2). */
export async function yearTextQuality(year: number): Promise<number | null> {
  const rows = await db.execute<Row<{ avg: number | null }>>(sql`
    select avg(text_quality)::real as avg from issues where year = ${year} and text_quality is not null
  `);
  return rows[0]?.avg ?? null;
}
