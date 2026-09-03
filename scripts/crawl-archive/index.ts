import * as cheerio from 'cheerio';

import { SOURCE_BASE_URL } from '../../src/lib/seo/config';

import { archiveUrl, absolutize, politeFetch } from '../shared/http';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * Stage 1 — fetch the archive page, extract the issue list, write new ones to
 * issues.
 *
 * Every stage is idempotent (spec 7.1): re-running does no harm. Here that is
 * guaranteed by the (year, number) unique constraint and ON CONFLICT.
 * raw_index_html is refreshed on every run, because the source site sometimes
 * corrects the contents dump after the fact.
 */

export interface CrawledIssue {
  year: number;
  number: number;
  publishedAt: string;
  pdfUrl: string;
  rawIndexHtml: string;
}

const TR_MONTHS: Record<string, number> = {
  ocak: 1,
  şubat: 2,
  mart: 3,
  nisan: 4,
  mayıs: 5,
  haziran: 6,
  temmuz: 7,
  ağustos: 8,
  eylül: 9,
  ekim: 10,
  kasım: 11,
  aralık: 12,
};

/** "31.12.2025", "31/12/2025" or "31 Aralık 2025" */
export function parseTurkishDate(raw: string): string | null {
  const text = raw.replace(/\s+/g, ' ').trim();

  /*
   * The separator is REPEATABLE AND IT IS NOT ALWAYS A DOT: the source contains
   * typos such as "22..04.2026" (2026 issue 78), "29,05.2020" (2020 issue 93)
   * and "14,.03.2022" (2022 issue 43). Requiring a single dot left the date
   * unparsed, and because `publishedAt` was null the row was dropped entirely —
   * losing a whole gazette issue over one typo is not acceptable.
   *
   * The comma cost exactly that twice: a coverage audit of 2020-2026 found two
   * issue numbers missing from the archive that the source page listed all
   * along. Nothing reported an error; the rows simply never arrived.
   */
  const numeric = /(\d{1,2})[.,/]+(\d{1,2})[.,/]+(\d{4})/.exec(text);
  if (numeric) {
    const [, d, m, y] = numeric;
    return isoOrNull(Number(y), Number(m), Number(d));
  }

  const named = /(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/.exec(text);
  if (named) {
    const month = TR_MONTHS[named[2]!.toLocaleLowerCase('tr')];
    if (month) return isoOrNull(Number(named[3]), month, Number(named[1]));
  }

  return null;
}

function isoOrNull(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/**
 * The largest plausible issue number in a year. 2025 reached 262; 999 is a
 * comfortable ceiling. The point is not to impose a limit but to turn a format
 * change into a loud error rather than silent corruption (spec 16).
 */
const MAX_ISSUE_NUMBER = 999;

/**
 * Reads the issue number out of the SAYI cell.
 *
 * The cell is NOT always a bare number: for jointly published issues it comes as
 * several parts, e.g. "195/1 195/2 195/3 195/4" (twice in 2018). The old code
 * concatenated all the digits — 1.95e+23. That number PASSES the
 * `Number.isInteger` check (as every whole-valued float does), so garbage would
 * have been written to a bigint column with the guard never firing.
 *
 * We take the first number: the parts are sections of one issue and point at a
 * single PDF.
 */
export function parseIssueNumber(raw: string): number | null {
  const match = /\d+/.exec(raw);
  if (!match) return null;

  const number = Number(match[0]);
  if (!Number.isInteger(number) || number <= 0 || number > MAX_ISSUE_NUMBER) return null;

  return number;
}

/**
 * Parses the archive HTML. Table columns: SAYI | TARİH | İÇERİK.
 * The issue number links to the PDF (spec 3.1).
 */
export function parseArchiveHtml(html: string, year: number): CrawledIssue[] {
  const $ = cheerio.load(html);
  const issues: CrawledIssue[] = [];

  $('table tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const numberCell = cells.eq(0);
    const link = numberCell.find('a').attr('href');
    const number = parseIssueNumber(numberCell.text());
    if (number === null || !link) return;

    const publishedAt = parseTurkishDate(cells.eq(1).text());
    if (!publishedAt) return;

    issues.push({
      year,
      number,
      publishedAt,
      pdfUrl: absolutize(link),
      // The İÇERİK cell is a flat text dump; it is the backbone of parsing (spec 3.1).
      rawIndexHtml: cells.eq(2).html() ?? cells.eq(2).text(),
    });
  });

  return issues;
}

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

export async function crawlYear(year: number): Promise<{ seen: number; inserted: number }> {
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
    if (rows[0]?.inserted) inserted += 1;
  }

  log.info('arşiv taraması bitti', { year, seen: issues.length, inserted });
  return { seen: issues.length, inserted };
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
