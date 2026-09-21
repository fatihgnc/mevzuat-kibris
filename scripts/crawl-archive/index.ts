import { SOURCE_BASE_URL } from '../../src/lib/seo/config';

import { archiveUrl, politeFetch } from '../shared/http';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

import { parseArchiveHtml, type CrawledIssue } from './parse';

export type { CrawledIssue } from './parse';
export { parseTurkishDate, parseIssueNumber, parseArchiveHtml } from './parse';

/**
 * Stage 1 — fetch the archive page, extract the issue list, write new ones to
 * issues.
 *
 * Every stage is idempotent (spec 7.1): re-running does no harm. Here that is
 * guaranteed by the (year, number) unique constraint and ON CONFLICT.
 * raw_index_html is refreshed on every run, because the source site sometimes
 * corrects the contents dump after the fact.
 */

async function fetchHtml(url: string): Promise<string> {
  const response = await politeFetch(url);
  if (!response.ok) throw new Error('Sayfa alınamadı: HTTP ' + response.status + ' — ' + url);
  return response.text();
}

/**
 * Finds the issue list for a year.
 *
 * THE CURRENT YEAR IS NOT ON THE ARCHIVE PAGE. The source site only fills in
 * `/ARŞİV/<year>` once the year has closed; the current year's issues live on the
 * HOME PAGE. For 2026, `/ARŞİV/2026` returns HTTP 200 but contains no table at
 * all (a 24 KB empty shell), while the home page lists issues 1-160 with the same
 * `SAYI | TARİH | İÇERİK` structure. The site's own archive menu does not list
 * 2026 either.
 *
 * This affected the daily ingest too: `daily` crawls the current year every day,
 * so it was looking at the empty page and failing with "no issues found".
 *
 * The fallback path is NOT BLIND. Rows coming from the home page are filtered by
 * the year in the TARİH column. That is essential: without the filter, when
 * `/ARŞİV/2019` came back empty the 2026 issues from the home page would have
 * been stored as 2019. The year is now validated against the requested value
 * rather than against whatever `parseArchiveHtml` stamped on it.
 */
async function findIssues(year: number): Promise<CrawledIssue[]> {
  const url = archiveUrl(year);
  log.info('arşiv sayfası çekiliyor', { year, url });

  const fromArchive = parseArchiveHtml(await fetchHtml(url), year);
  if (fromArchive.length) return fromArchive;

  log.warn('arşiv sayfası boş, ana sayfaya bakılıyor', { year, url });

  const fromHome = parseArchiveHtml(await fetchHtml(SOURCE_BASE_URL + '/'), year).filter(
    (issue) => issue.publishedAt.startsWith(String(year) + '-'),
  );

  log.info('ana sayfadan bulunan sayı', { year, count: fromHome.length });
  return fromHome;
}

export async function crawlYear(year: number): Promise<{ seen: number; inserted: number; insertedNumbers: number[] }> {
  const issues = await findIssues(year);

  /*
   * Health check — spec 16: if the source site changes its structure, ingest must
   * not break silently. Finding zero issues for a year is not normal; we throw so
   * the workflow turns red and an alert email goes out.
   */
  if (issues.length === 0) {
    throw new Error(
      year + ' için hiç sayı bulunamadı. Kaynak sitenin tablo yapısı değişmiş olabilir.',
    );
  }

  let inserted = 0;
  const insertedNumbers: number[] = [];

  for (const issue of issues) {
    const rows = await sql<Array<{ inserted: boolean }>>`
      insert into issues (year, number, published_at, pdf_url, raw_index_html)
      values (${issue.year}, ${issue.number}, ${issue.publishedAt}, ${issue.pdfUrl}, ${issue.rawIndexHtml})
      on conflict (year, number) do update
        set raw_index_html = excluded.raw_index_html,
            pdf_url        = excluded.pdf_url,
            published_at   = excluded.published_at,
            updated_at     = now()
      returning (xmax = 0) as inserted
    `;
    if (rows[0]?.inserted) {
      inserted += 1;
      insertedNumbers.push(issue.number);
    }
  }

  // Records copy the issue date at parse time; a later date correction on the issue must follow.
  await sql`
    update records r set published_at = i.published_at
      from issues i
     where r.issue_id = i.id and i.year = ${year} and r.published_at <> i.published_at
  `;

  log.info('arşiv taraması bitti', { year, seen: issues.length, inserted });
  return { seen: issues.length, inserted, insertedNumbers };
}

async function main() {
  const arg = process.argv[2];
  const year = arg ? Number(arg) : new Date().getFullYear();

  if (!Number.isInteger(year)) {
    throw new Error('Kullanım: tsx scripts/crawl-archive/index.ts [yıl]');
  }

  try {
    await crawlYear(year);
  } finally {
    await closeDb();
  }
}

if (process.argv[1]?.includes('crawl-archive')) {
  main().catch((error) => {
    log.error('crawl-archive başarısız', { message: String(error) });
    process.exit(1);
  });
}
