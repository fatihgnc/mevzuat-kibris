import 'server-only';

import { sql } from 'drizzle-orm';

import { db } from '@/lib/db/client';
import { ARCHIVE_START_YEAR } from '@/lib/seo/config';
import { coverageSince, dativeYear } from '@/lib/text/turkish-number';

import { formatCount, type Row } from './shared';

/**
 * Gerçek arşiv kapsamı — spec 8.4'ün kapsam kuralının ikinci yarısı.
 *
 * ARCHIVE_START_YEAR arşivin HEDEFLENEN başlangıcı ve tek kaynak olarak kalıyor
 * (sitemap, yıl navigasyonu, geçerli yıl aralığı hep oradan besleniyor). Ama
 * sayfada "2006'dan bugüne" YAZMAK ayrı bir şey: o bir kapsam İDDİASI ve
 * arkasında veri yoksa yalan oluyor.
 *
 * Backfill (spec 15 Milestone 5) arka planda ilerleyen bir iş; o bitene kadar
 * site 2006'yı iddia ederse, kullanıcı 2010'u aratıp boş sonuç alıyor ve spec
 * 8.4'ün "güveni tek seferde bitirir" dediği şey oluyor. Bu yüzden görünen
 * cümle veriden türetiliyor: elimizde ne varsa onu söylüyoruz.
 */
export interface ArchiveCoverage {
  earliestYear: number | null;
  latestYear: number | null;
  totalRecords: number;
  /** Hedeflenen başlangıca ulaşıldı mı — ulaşılmadıysa backfill sürüyor. */
  isComplete: boolean;
}

/**
 * `topic` verilirse kapsam o konuya daraltılır. Konu sayfası da bir kapsam
 * iddiası yapıyor ("N kayıt, 2006'dan bugüne") ve o iddianın da veriye
 * dayanması gerekiyor: münhal 2019'dan beri işlenmişse öyle demeli.
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
 * Kapsam cümlesi. Üç durum var ve üçü de farklı şey söylemek zorunda:
 *
 *   veri yok            -> kapsam iddiası YOK
 *   backfill sürüyor    -> elimizdeki gerçek aralık + sürdüğü bilgisi
 *   backfill tamam      -> hedeflenen kapsam
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

/** Footer ve statik sayfalar için kısa hâli. */
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

/** Yalnızca yıl aralığı — konu sayfası ve filtre rayı etiketleri için. */
export function coverageRange(coverage: ArchiveCoverage): string | null {
  if (!coverage.totalRecords || coverage.earliestYear === null) return null;
  if (coverage.isComplete) return coverageSince(ARCHIVE_START_YEAR);
  if (coverage.earliestYear === coverage.latestYear) return String(coverage.earliestYear);
  return coverage.earliestYear + '–' + coverage.latestYear;
}
