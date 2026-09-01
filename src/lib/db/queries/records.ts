import 'server-only';

import { cache } from 'react';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { docTypeLabel, formatRef } from '@/lib/constants/doc-types';
import { isTopicSlug, type TopicSlug } from '@/lib/constants/topics';
import { HEADLINE_OPTIONS } from '@/lib/search/highlight';
import { maskTitle } from '@/lib/search/mask-title';
import type { BuiltQuery, SearchParams, SortOption } from '@/lib/search/build-query';
import type { RecordDetail, RecordListItem } from '@/types/record';

import {
  LIST_COLUMNS,
  LIST_JOINS,
  inList,
  mapListItem,
  type RawListRow,
  type Row,
} from './shared';

/**
 * Upper bound on the total counter. Above this the UI shows "10.000+".
 * An unbounded count(*) over a 100k-row match blows the p95 400 ms target (spec
 * 13) on its own, and pagination already stops at 500 pages.
 */
const COUNT_CAP = 10_000;

export interface SearchResult {
  items: RecordListItem[];
  total: number;
  /** Whether the count hit the cap — so the UI can write "10.000+". */
  capped: boolean;
  facets: {
    topics: Array<{ key: TopicSlug; n: number }>;
    docTypes: Array<{ key: string; label: string; n: number }>;
  };
}

/**
 * Filter conditions — shared by search, the topic feed and entity pages.
 *
 * If `exclude` is given, that dimension's own filter is NOT APPLIED.
 *
 * This is essential for facet counts. When counts were computed with every filter
 * applied, a user who picked "Atama" saw only Atama in the topic list: the other
 * topics went to zero, dropped off the list, and the selection became
 * IRREVERSIBLE. Faceted search expects the opposite — a dimension's counts are
 * computed with all filters except that dimension applied, so the question "if I
 * also picked this, how many results would remain" can be answered.
 */
function filterConditions(params: Partial<SearchParams>, exclude?: 'konu' | 'tur') {
  const parts = [sql`true`];

  /*
   * We use `in (...)` rather than `= any(array)`: drizzle passes the JS array to
   * postgres-js as a positional parameter, which bypasses postgres-js's array
   * serialisation, and the query blew up with "malformed array literal" — meaning
   * the topic and document-type filters did not work at all (see
   * queries/shared.ts).
   */
  if (params.konu?.length && exclude !== 'konu') {
    parts.push(
      sql`exists (
        select 1 from record_topics rt
         where rt.record_id = r.id and rt.topic in (${inList(params.konu)})
      )`,
    );
  }
  if (params.tur?.length && exclude !== 'tur') {
    parts.push(sql`r.doc_type in (${inList(params.tur)})`);
  }
  if (params.yil) {
    parts.push(sql`i.year = ${params.yil}`);
  }
  if (params.baslangic) {
    parts.push(sql`r.published_at >= ${params.baslangic}::date`);
  }
  if (params.bitis) {
    parts.push(sql`r.published_at <= ${params.bitis}::date`);
  }
  if (params.kurum) {
    parts.push(
      sql`exists (
        select 1 from record_entities re join entities e on e.id = re.entity_id
         where re.record_id = r.id and e.kind = 'institution' and e.slug = ${params.kurum}
      )`,
    );
  }
  if (params.yer) {
    parts.push(
      sql`exists (
        select 1 from record_entities re join entities e on e.id = re.entity_id
         where re.record_id = r.id and e.kind = 'place' and e.slug = ${params.yer}
      )`,
    );
  }

  return sql.join(parts, sql` and `);
}

/*
 * The "most relevant" (rank desc) option was removed, so the branch that checked
 * hasQuery went with it: with or without a text search, ordering is by date. The
 * `rank` column is still computed (for ts_headline highlighting and so the option
 * can be restored) but no longer drives ordering. See build-query.ts ->
 * SORT_OPTIONS.
 */
function orderBy(sort: SortOption) {
  if (sort === 'eski') return sql`r.published_at asc, r.id asc`;
  return sql`r.published_at desc, r.id desc`;
}

/**
 * Search — spec 5.4 steps 4-6.
 *
 * Ordering is ts_rank_cd * recency_boost. recency_boost is a SQL function
 * (0007-search-functions.sql) because the same multiplier has to be identical in
 * alert matching and in the topic feed.
 */
export async function searchRecords(
  params: SearchParams,
  built: BuiltQuery,
): Promise<SearchResult> {
  const filters = filterConditions(params);
  const tsq = built.tsquery
    ? sql`mk_tsquery(${built.tsquery})`
    : null;

  const matchCondition = tsq ? sql`r.search_vector @@ ${tsq}` : sql`true`;
  const rankExpr = tsq
    ? sql`ts_rank_cd(r.search_vector, ${tsq}) * recency_boost(r.published_at)`
    : sql`0::real`;
  const snippetExpr = tsq
    ? sql`ts_headline('tr_rg', coalesce(r.body_text, ''), ${tsq}, ${HEADLINE_OPTIONS})`
    : sql`null::text`;

  const rowsQuery = db.execute<Row<RawListRow & { rank: number }>>(sql`
    select ${sql.raw(LIST_COLUMNS)},
           ${snippetExpr} as snippet,
           ${rankExpr} as rank
      from records r
      ${sql.raw(LIST_JOINS)}
     where ${matchCondition}
       and r.has_own_page
       and ${filters}
     order by ${orderBy(params.sirala)}
     limit ${built.limit} offset ${built.offset}
  `);

  const countQuery = db.execute<Row<{ n: string }>>(sql`
    select count(*)::int as n from (
      select 1
        from records r
        join issues i on i.id = r.issue_id
       where ${matchCondition}
         and r.has_own_page
         and ${filters}
       limit ${COUNT_CAP}
    ) capped
  `);

  // Facet counts are computed from the result set, not from the archive total —
  // which is why the numbers in artboard 1b's left rail change with the filters.
  // But each dimension is counted excluding ITS OWN filter; see filterConditions.
  const topicFacetFilters = filterConditions(params, 'konu');
  const docTypeFacetFilters = filterConditions(params, 'tur');

  const facetQuery = db.execute<Row<{ kind: string; key: string; n: string }>>(sql`
    select 'topic' as kind, rt.topic as key, count(*)::int as n
      from records r
      join issues i on i.id = r.issue_id
      join record_topics rt on rt.record_id = r.id
     where ${matchCondition} and r.has_own_page and ${topicFacetFilters}
     group by rt.topic
    union all
    select 'doc_type', r.doc_type, count(*)::int
      from records r
      join issues i on i.id = r.issue_id
     where ${matchCondition} and r.has_own_page and ${docTypeFacetFilters}
     group by r.doc_type
  `);

  const [rows, counted, facetRows] = await Promise.all([rowsQuery, countQuery, facetQuery]);

  const total = Number(counted[0]?.n ?? 0);

  const topics: SearchResult['facets']['topics'] = [];
  const docTypes: SearchResult['facets']['docTypes'] = [];

  for (const row of facetRows) {
    const n = Number(row.n);
    if (row.kind === 'topic' && isTopicSlug(row.key)) {
      topics.push({ key: row.key, n });
    } else if (row.kind === 'doc_type') {
      docTypes.push({ key: row.key, label: docTypeLabel(row.key), n });
    }
  }

  topics.sort((a, b) => b.n - a.n);
  docTypes.sort((a, b) => b.n - a.n);

  return {
    items: rows.map((row) => mapListItem(row, built.raw)),
    total,
    capped: total >= COUNT_CAP,
    facets: { topics, docTypes },
  };
}

/** Trigram suggestion on 0 results (spec 5.4 step 7, artboard 1f). */
export interface Suggestion {
  slug: string;
  title: string;
  summary: string | null;
  similarity: number;
}

export async function suggestSimilar(normalizedQuery: string): Promise<Suggestion | null> {
  if (normalizedQuery.length < 3) return null;

  const rows = await db.execute<Row<{
    slug: string;
    title: string;
    summary: string | null;
    similarity: number;
  }>>(sql`
    select r.slug, r.title, r.summary, similarity(r.title_normalized, ${normalizedQuery}) as similarity
      from records r
     where r.has_own_page
       and r.title_normalized % ${normalizedQuery}
       and similarity(r.title_normalized, ${normalizedQuery}) > 0.3
     order by similarity desc, r.published_at desc
     limit 1
  `);

  return rows[0] ?? null;
}

/**
 * How many records the suggestion actually corresponds to — artboard 1f's "6
 * kayıt" badge. The real result count of the suggested search, not an estimate.
 */
export async function countForQuery(query: string): Promise<number> {
  const rows = await db.execute<Row<{ n: string }>>(sql`
    select count(*)::int as n from (
      select 1 from records r
       where r.has_own_page
         and r.search_vector @@ mk_tsquery(${query})
       limit ${COUNT_CAP}
    ) capped
  `);
  return Number(rows[0]?.n ?? 0);
}

/** The shared list query for topic feeds, entity feeds and the home page. */
export interface ListOptions {
  topic?: TopicSlug;
  entitySlug?: string;
  year?: number;
  /** Only records whose applications are still open (spec 3.9, artboard 1e). */
  openDeadlineOnly?: boolean;
  limit?: number;
  offset?: number;
}

export async function listRecords(options: ListOptions): Promise<RecordListItem[]> {
  const conditions = [sql`r.has_own_page`];

  if (options.topic) {
    conditions.push(
      sql`exists (select 1 from record_topics rt where rt.record_id = r.id and rt.topic = ${options.topic})`,
    );
  }
  if (options.entitySlug) {
    conditions.push(
      sql`exists (
        select 1 from record_entities re join entities e on e.id = re.entity_id
         where re.record_id = r.id and e.slug = ${options.entitySlug}
      )`,
    );
  }
  if (options.year) conditions.push(sql`i.year = ${options.year}`);
  if (options.openDeadlineOnly) {
    conditions.push(sql`r.deadline_at is not null and r.deadline_at >= current_date`);
  }

  const rows = await db.execute<Row<RawListRow>>(sql`
    select ${sql.raw(LIST_COLUMNS)}, null::text as snippet
      from records r
      ${sql.raw(LIST_JOINS)}
     where ${sql.join(conditions, sql` and `)}
     order by r.published_at desc, r.id desc
     limit ${options.limit ?? 20} offset ${options.offset ?? 0}
  `);

  return rows.map((row) => mapListItem(row));
}

export async function countRecords(options: ListOptions): Promise<number> {
  const conditions = [sql`r.has_own_page`];

  if (options.topic) {
    conditions.push(
      sql`exists (select 1 from record_topics rt where rt.record_id = r.id and rt.topic = ${options.topic})`,
    );
  }
  if (options.entitySlug) {
    conditions.push(
      sql`exists (
        select 1 from record_entities re join entities e on e.id = re.entity_id
         where re.record_id = r.id and e.slug = ${options.entitySlug}
      )`,
    );
  }
  if (options.year) conditions.push(sql`i.year = ${options.year}`);
  if (options.openDeadlineOnly) {
    conditions.push(sql`r.deadline_at is not null and r.deadline_at >= current_date`);
  }

  const rows = await db.execute<Row<{ n: string }>>(sql`
    select count(*)::int as n
      from records r
      join issues i on i.id = r.issue_id
     where ${sql.join(conditions, sql` and `)}
  `);

  return Number(rows[0]?.n ?? 0);
}

/** Archive total per topic — the home page topic grid. */
/**
 * Record count per topic.
 *
 * The `has_own_page` condition is ESSENTIAL: the topic page and the search facets
 * also count only records that have their own page (spec 8.2 rule 2 — thin
 * content gets no URL of its own). Without this filter the index page said "Marka
 * 14" and clicking through produced 5 records. Two places counting the same thing
 * and disagreeing destroys a user's trust in the counters in one go (spec 8.4).
 */
export async function topicCounts(): Promise<Record<string, number>> {
  const rows = await db.execute<Row<{ topic: string; n: string }>>(sql`
    select rt.topic, count(*)::int as n
      from record_topics rt
      join records r on r.id = rt.record_id
     where r.has_own_page
     group by rt.topic
  `);

  return Object.fromEntries(rows.map((row) => [row.topic, Number(row.n)]));
}

interface RawDetailRow extends RawListRow {
  section: string;
  subject: string | null;
  body_text: string | null;
  summary_source: string | null;
  deadline_note: string | null;
  page_from: number | null;
  page_to: number | null;
  related_record_id: string | number | null;
  corrects_id: string | number | null;
  has_personal_data: boolean;
  title_normalized: string;
  issue_id: string | number;
  issue_published_at: string | Date;
  pdf_url: string;
  text_status: string;
  text_quality: number | null;
}

/**
 * ÇAĞRI BAŞINA BİR KEZ — `cache()` sarmalayıcısı için bkz. `getRecordBySlug`.
 */
async function loadRecordBySlug(slug: string): Promise<RecordDetail | null> {
  const rows = await db.execute<Row<RawDetailRow>>(sql`
    select ${sql.raw(LIST_COLUMNS)},
           null::text as snippet,
           r.section,
           r.subject,
           r.body_text,
           r.title_normalized,
           r.summary_source,
           r.deadline_note,
           r.page_from,
           r.page_to,
           r.related_record_id,
           r.corrects_id,
           r.has_personal_data,
           r.issue_id,
           i.published_at as issue_published_at,
           i.pdf_url,
           i.text_status,
           i.text_quality
      from records r
      ${sql.raw(LIST_JOINS)}
     where r.slug = ${slug}
     limit 1
  `);

  const row = rows[0];
  if (!row) return null;

  const id = Number(row.id);

  const [entityRows, relatedRows, correctionRows, sameIssueRows] = await Promise.all([
    db.execute<Row<{ id: string; kind: string; slug: string; name: string }>>(sql`
      select e.id, e.kind, e.slug, e.name
        from record_entities re
        join entities e on e.id = re.entity_id
       where re.record_id = ${id}
       order by re.confidence desc, e.record_count desc
       limit 12
    `),
    // Related record: the same subject appearing twice, as A.E. and as Ü(K-I) (spec 3.3)
    db.execute<Row<RawListRow>>(sql`
      select ${sql.raw(LIST_COLUMNS)}, null::text as snippet
        from records r
        ${sql.raw(LIST_JOINS)}
       where r.id = (select related_record_id from records where id = ${id})
          or r.related_record_id = ${id}
       limit 5
    `),
    db.execute<Row<RawListRow>>(sql`
      select ${sql.raw(LIST_COLUMNS)}, null::text as snippet
        from records r
        ${sql.raw(LIST_JOINS)}
       where r.corrects_id = ${id}
       order by r.published_at desc
       limit 5
    `),
    db.execute<Row<RawListRow>>(sql`
      select ${sql.raw(LIST_COLUMNS)}, null::text as snippet
        from records r
        ${sql.raw(LIST_JOINS)}
       where r.issue_id = (select issue_id from records where id = ${id})
         and r.id <> ${id}
         and r.has_own_page
       order by r.section, r.id
       limit 8
    `),
  ]);

  const base = mapListItem(row);

  return {
    id,
    issueId: Number(row.issue_id),
    slug: row.slug,
    section: row.section as RecordDetail['section'],
    docType: base.docType,
    refType: row.ref_type as RecordDetail['refType'],
    refNumber: row.ref_number,
    title: row.title,
    titleNormalized: row.title_normalized,
    subject: row.subject,
    bodyText: row.body_text,
    summary: row.summary,
    summarySource: row.summary_source as RecordDetail['summarySource'],
    deadlineAt: base.deadlineAt,
    deadlineNote: row.deadline_note,
    pageFrom: row.page_from,
    pageTo: row.page_to,
    publishedAt: base.publishedAt,
    relatedRecordId: row.related_record_id === null ? null : Number(row.related_record_id),
    correctsId: row.corrects_id === null ? null : Number(row.corrects_id),
    hasPersonalData: row.has_personal_data,
    hasOwnPage: row.has_own_page,
    issue: {
      id: Number(row.issue_id),
      year: row.issue_year,
      number: row.issue_number,
      publishedAt:
        row.issue_published_at instanceof Date
          ? row.issue_published_at.toISOString().slice(0, 10)
          : String(row.issue_published_at).slice(0, 10),
      pdfUrl: row.pdf_url,
      textStatus: row.text_status as RecordDetail['issue']['textStatus'],
      textQuality: row.text_quality,
    },
    topics: base.topics,
    entities: entityRows.map((entity) => ({
      id: Number(entity.id),
      kind: entity.kind as RecordDetail['entities'][number]['kind'],
      slug: entity.slug,
      name: entity.name,
    })),
    related: relatedRows.map((r) => mapListItem(r)),
    corrections: correctionRows.map((r) => mapListItem(r)),
    sameIssue: sameIssueRows.map((r) => mapListItem(r)),
  };
}

/**
 * Kayıt sayfası bu sorguyu iki kez istiyor: bir `generateMetadata`, bir de
 * sayfanın kendisi. İkisi AYNI render pass'te çalıştığı için React'in `cache()`
 * sarmalayıcısı ikinci çağrıyı ilkinin sonucuyla karşılıyor — sayfa başına 10
 * sorgu 5'e iniyor.
 *
 * Ölçülen etkisi §6.5'te. Derleme ağa bağlı olduğu için (sorgu başına ~107 ms
 * gidiş-dönüş) bu doğrudan süreye yansıyor; çalışma zamanında da her istek
 * yarısı kadar sorgu yapıyor.
 *
 * `opengraph-image` AYRI bir render'dır, onun çağrısı bu kapsamın dışında kalır
 * ve dışında kalmalıdır — kapsam paylaşsalardı istekler arası sızıntı olurdu.
 */
export const getRecordBySlug = cache(loadRecordBySlug);

/** For ISR generateStaticParams: the last 12 months only (spec 11.1). */
export async function recentRecordSlugs(months = 12): Promise<string[]> {
  const rows = await db.execute<Row<{ slug: string }>>(sql`
    select slug from records
     where has_own_page
       and published_at > current_date - (${months} || ' months')::interval
     order by published_at desc
  `);
  return rows.map((row) => row.slug);
}

/** The status bar and the home page's "N records added today" line. */
export async function siteStatus(): Promise<{
  todayCount: number;
  totalRecords: number;
  latestIssue: { year: number; number: number; publishedAt: string; recordCount: number; pdfUrl: string } | null;
}> {
  const [counts, latest] = await Promise.all([
    db.execute<Row<{ today: string; total: string }>>(sql`
      select
        (select count(*)::int from records where created_at::date = current_date) as today,
        (select count(*)::int from records) as total
    `),
    db.execute<Row<{
      year: number;
      number: number;
      published_at: string | Date;
      pdf_url: string;
      n: string;
    }>>(sql`
      select i.year, i.number, i.published_at, i.pdf_url,
             (select count(*)::int from records r where r.issue_id = i.id) as n
        from issues i
       order by i.published_at desc, i.number desc
       limit 1
    `),
  ]);

  const issue = latest[0];

  return {
    todayCount: Number(counts[0]?.today ?? 0),
    totalRecords: Number(counts[0]?.total ?? 0),
    latestIssue: issue
      ? {
          year: issue.year,
          number: issue.number,
          publishedAt:
            issue.published_at instanceof Date
              ? issue.published_at.toISOString().slice(0, 10)
              : String(issue.published_at).slice(0, 10),
          recordCount: Number(issue.n),
          pdfUrl: issue.pdf_url,
        }
      : null,
  };
}

/** The most searched queries — the "Sık aranan" row on the home page. */
export async function popularQueries(limit = 3): Promise<string[]> {
  const rows = await db.execute<Row<{ query: string }>>(sql`
    select query
      from search_logs
     where result_count > 0
       and created_at > now() - interval '30 days'
     group by query
     order by count(*) desc
     limit ${limit}
  `);
  return rows.map((row) => row.query);
}

export async function logSearch(query: string, resultCount: number): Promise<void> {
  if (!query.trim()) return;
  await db.execute(sql`
    insert into search_logs (query, result_count) values (${query.trim()}, ${resultCount})
  `);
}

/** Builds and returns the masked title on the server — email and RSS use the same function. */
export { maskTitle, formatRef };
