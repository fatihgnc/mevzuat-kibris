import * as cheerio from 'cheerio';

import { archiveUrl, absolutize, politeFetch } from '../shared/http';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * Aşama 1 — arşiv sayfasını çek, sayı listesini çıkar, yeni olanları issues'a yaz.
 *
 * Her aşama idempotent (spec 7.1): yeniden çalıştırmak zarar vermiyor.
 * Burada bunu (year, number) unique kısıtı ve ON CONFLICT sağlıyor. raw_index_html
 * her çalıştırmada güncelleniyor çünkü kaynak site içindekiler dökümünü sonradan
 * düzeltebiliyor.
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

/** "31.12.2025", "31/12/2025" ya da "31 Aralık 2025" */
export function parseTurkishDate(raw: string): string | null {
  const text = raw.replace(/\s+/g, ' ').trim();

  const numeric = /(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(text);
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
 * Arşiv HTML'ini ayrıştırır. Tablo kolonları: SAYI | TARİH | İÇERİK.
 * Sayı numarası PDF'e link (spec 3.1).
 */
export function parseArchiveHtml(html: string, year: number): CrawledIssue[] {
  const $ = cheerio.load(html);
  const issues: CrawledIssue[] = [];

  $('table tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 3) return;

    const numberCell = cells.eq(0);
    const link = numberCell.find('a').attr('href');
    const number = Number(numberCell.text().replace(/\D/g, ''));
    if (!Number.isInteger(number) || number <= 0 || !link) return;

    const publishedAt = parseTurkishDate(cells.eq(1).text());
    if (!publishedAt) return;

    issues.push({
      year,
      number,
      publishedAt,
      pdfUrl: absolutize(link),
      // İÇERİK hücresi düz metin dökümü; ayrıştırmanın omurgası bu (spec 3.1).
      rawIndexHtml: cells.eq(2).html() ?? cells.eq(2).text(),
    });
  });

  return issues;
}

export async function crawlYear(year: number): Promise<{ seen: number; inserted: number }> {
  const url = archiveUrl(year);
  log.info('arşiv sayfası çekiliyor', { year, url });

  const response = await politeFetch(url);
  if (!response.ok) throw new Error('Arşiv sayfası alınamadı: HTTP ' + response.status);

  const html = await response.text();
  const issues = parseArchiveHtml(html, year);

  /*
   * Sağlık kontrolü — spec 16: kaynak site yapısını değiştirirse ingest sessizce
   * kırılmasın. Bir yıl için sıfır sayı bulmak normal değil; hata fırlatıyoruz
   * ki workflow kırmızıya dönsün ve alarm maili gitsin.
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
