import * as cheerio from 'cheerio';

import { absolutize } from '../shared/http';

/**
 * Pure archive-HTML parsing, split out of index.ts so it can be unit-tested
 * without a database. `index.ts` imports `../shared/db` at module scope for
 * `crawlYear`, and that module throws immediately if DATABASE_URL is unset
 * (CI's test job never sets one — parse tests are meant to run on logic
 * alone, per spec 7.3). Importing `../crawl-archive` for these functions
 * pulled the db import in as a side effect and failed every CI run.
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
