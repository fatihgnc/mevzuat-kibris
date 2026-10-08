import { politeFetch } from '../shared/http';
import { parseTurkishDate } from './circular';
import { log } from '../shared/logger';

/**
 * Reads the Kamu Hizmeti Komisyonu's vacancy listing pages (khk.gov.ct.tr).
 *
 * The site is a DNN portal: one page per year, one sub-page per category, each a
 * plain HTML table of (last application day, circular number, department, PDF
 * link). The pages are public; the PDFs live under /Portals/, which the site's
 * robots.txt disallows -- the operator has decided to read them anyway, so keep
 * the request rate low and identify ourselves (see `politeFetch`).
 */

const BASE = 'https://khk.gov.ct.tr';

export interface KhkRow {
  year: number;
  category: string;
  /** Raw text of each cell, tags stripped. */
  cells: string[];
  /** "MİA.29/2026", "MT.41/2026" -- as the table writes it. */
  circular: string | null;
  department: string | null;
  /** The cell that holds a date; its text as printed. */
  deadlineText: string | null;
  pdfUrl: string | null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function cellText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** The table rows of one listing page. Header rows have no PDF link and drop out. */
export function parseListing(html: string, year: number, category: string): KhkRow[] {
  const rows: KhkRow[] = [];

  for (const tr of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const href = tr.match(/href="([^"]*\.pdf[^"]*)"/i)?.[1];
    if (!href) continue;

    const cells = (tr.match(/<td[\s\S]*?<\/td>/gi) ?? []).map(cellText);
    const pdfUrl = new URL(decodeEntities(href), BASE).toString();

    rows.push({
      year,
      category,
      cells,
      circular: cells.find((cell) => /\d+\s*\/\s*\d{4}/.test(cell) && cell.length < 24) ?? null,
      department:
        cells.find((cell) => cell.length > 4 && !/\d+\s*\/\s*\d{4}/.test(cell) && !/^tıklay/i.test(cell) && !hasDate(cell)) ??
        null,
      deadlineText: cells.find(hasDate) ?? null,
      pdfUrl,
    });
  }

  return rows;
}

function hasDate(text: string): boolean {
  return parseTurkishDate(text) !== null;
}

/**
 * The category sub-pages of a year are LINKED from the year page, not templated:
 * the slugs changed between years (2021 has no year suffix, 2023's teacher exam
 * page is missing its suffix), so guessing them silently drops categories.
 */
async function categoryPaths(year: number): Promise<string[]> {
  const yearPath = `/MÜNHALLER/${year}-YILI-MÜNHALLERİ-VE-GENELGELERİ`;
  const response = await politeFetch(BASE + encodeURI(yearPath));
  if (!response.ok) return [];

  const html = await response.text();
  const paths = new Set<string>();
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = decodeEntities(match[1]!);
    if (href.startsWith(yearPath + '/')) paths.add(href);
  }
  return [...paths];
}

export async function crawlYear(year: number): Promise<KhkRow[]> {
  const all: KhkRow[] = [];

  for (const path of await categoryPaths(year)) {
    const slug = decodeURIComponent(path.split('/').pop()!);
    const url = BASE + path;
    const response = await politeFetch(encodeURI(decodeURI(url)));

    if (!response.ok) {
      log.warn('khk listing unavailable', { url, status: response.status });
      continue;
    }

    const rows = parseListing(await response.text(), year, slug);
    log.info('khk listing read', { slug, rows: rows.length });
    all.push(...rows);
  }

  return all;
}
