import * as cheerio from 'cheerio';

import { SOURCE_BASE_URL } from '../../src/lib/seo/config';

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

  /*
   * Ayraç TEKRARLANABİLİR: kaynakta "22..04.2026" gibi yazım hataları var
   * (2026 sayı 78). Tek ayraç şart koşulduğunda tarih çözülemiyor ve kayıt
   * `publishedAt` null olduğu için tamamen düşüyordu — bir yazım hatası
   * yüzünden koca bir gazete sayısını kaybetmek doğru değil.
   */
  const numeric = /(\d{1,2})[./]+(\d{1,2})[./]+(\d{4})/.exec(text);
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
 * Bir yılda makul en büyük sayı numarası. 2025'te 262 çıktı; 999 rahat bir
 * tavan. Amaç sınırlamak değil, biçim değişikliğini sessiz bozulma yerine
 * gürültülü hataya çevirmek (spec 16).
 */
const MAX_ISSUE_NUMBER = 999;

/**
 * SAYI hücresinden sayı numarasını okur.
 *
 * Hücre her zaman yalın bir numara DEĞİL: birleşik yayımlanan sayılarda
 * "195/1 195/2 195/3 195/4" gibi çok parçalı oluyor (2018'de iki kez).
 * Eski hâl bütün rakamları yapıştırıyordu — 1.95e+23. Bu sayı `Number.isInteger`
 * denetiminden GEÇİYOR (kesirsiz her kayan nokta sayısı gibi), yani koruma
 * devreye girmeden bigint sütununa çöp yazılacaktı.
 *
 * İlk numarayı alıyoruz: parçalar tek sayının bölümleri ve tek PDF'e bakıyorlar.
 */
export function parseIssueNumber(raw: string): number | null {
  const match = /\d+/.exec(raw);
  if (!match) return null;

  const number = Number(match[0]);
  if (!Number.isInteger(number) || number <= 0 || number > MAX_ISSUE_NUMBER) return null;

  return number;
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
    const number = parseIssueNumber(numberCell.text());
    if (number === null || !link) return;

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

async function fetchHtml(url: string): Promise<string> {
  const response = await politeFetch(url);
  if (!response.ok) throw new Error('Sayfa alınamadı: HTTP ' + response.status + ' — ' + url);
  return response.text();
}

/**
 * Bir yılın sayı listesini bulur.
 *
 * İÇİNDE BULUNULAN YIL ARŞİV SAYFASINDA DEĞİL. Kaynak site `/ARŞİV/<yıl>`
 * sayfasını yalnızca yıl kapandıktan sonra dolduruyor; yürüyen yılın sayıları
 * ANA SAYFADA duruyor. 2026 için `/ARŞİV/2026` HTTP 200 dönüyor ama içinde tek
 * tablo yok (24 KB'lık boş kabuk), oysa ana sayfada 1–160 arası sayılar aynı
 * `SAYI | TARİH | İÇERİK` yapısıyla listeli. Sitenin arşiv menüsü de 2026'yı
 * hiç saymıyor.
 *
 * Bu, günlük ingest'i de etkiliyordu: `daily` her gün yürüyen yılı tarıyor,
 * yani boş sayfaya bakıp "hiç sayı bulunamadı" diye hata veriyordu.
 *
 * Yedek yol KÖR DEĞİL. Ana sayfadan gelen satırlar TARİH sütunundaki yıla göre
 * süzülüyor. Bu şart: süzme olmadan `/ARŞİV/2019` boş çıktığında ana sayfadaki
 * 2026 sayıları 2019 diye kaydedilirdi. Yıl artık istenen değere göre
 * doğrulanıyor, `parseArchiveHtml`in damgaladığı değere göre değil.
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
