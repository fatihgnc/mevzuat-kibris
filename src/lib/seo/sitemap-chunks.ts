import 'server-only';

import { sql } from 'drizzle-orm';
import type { MetadataRoute } from 'next';

import { db } from '@/lib/db/client';
import { type Row } from '@/lib/db/queries/shared';
import { TOPIC_SLUGS } from '@/lib/constants/topics';
import { GUIDES } from '@/lib/content/guides';

import { ARCHIVE_START_YEAR, absoluteUrl } from './config';

/**
 * Sitemap önceliklendirmesi — spec 8.2 madde 1.
 *
 * 100 bin+ sayfada crawl budget yönetimi şart. Kural: son 24 ay yüksek öncelik
 * ve aylık changefreq, eski arşiv düşük öncelik ve yıllık. Yeni kayıtlar ayrı
 * bir parçada tutuluyor çünkü Google en sık onu çekiyor.
 */

const RECENT_MONTHS = 24;

type Entry = MetadataRoute.Sitemap[number];

function entry(
  path: string,
  options: { lastModified?: Date | string; priority: number; changeFrequency: Entry['changeFrequency'] },
): Entry {
  return {
    url: absoluteUrl(path),
    lastModified: options.lastModified,
    changeFrequency: options.changeFrequency,
    priority: options.priority,
  };
}

/** Statik sayfalar ve konu girişleri. */
export function staticEntries(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    entry('/', { lastModified: now, priority: 1, changeFrequency: 'daily' }),
    entry('/sayilar', { lastModified: now, priority: 0.6, changeFrequency: 'weekly' }),
    entry('/rehber', { priority: 0.7, changeFrequency: 'monthly' }),
    entry('/hakkinda', { priority: 0.5, changeFrequency: 'yearly' }),
    entry('/iletisim', { priority: 0.4, changeFrequency: 'yearly' }),
    entry('/gizlilik', { priority: 0.3, changeFrequency: 'yearly' }),
    entry('/kullanim-kosullari', { priority: 0.3, changeFrequency: 'yearly' }),
    ...GUIDES.map((guide) =>
      entry('/rehber/' + guide.slug, { priority: 0.7, changeFrequency: 'monthly' }),
    ),
    ...TOPIC_SLUGS.map((slug) =>
      entry('/konu/' + slug, { lastModified: now, priority: 0.8, changeFrequency: 'daily' }),
    ),
  ];
}

/** Son 24 ayın kayıtları — Google'ın en sık çektiği parça. */
export async function recentRecordEntries(): Promise<MetadataRoute.Sitemap> {
  const rows = await db.execute<Row<{ slug: string; published_at: string | Date }>>(sql`
    select slug, published_at
      from records
     where has_own_page
       and published_at > current_date - (${RECENT_MONTHS} || ' months')::interval
     order by published_at desc
     limit 45000
  `);

  return rows.map((row) =>
    entry('/karar/' + row.slug, {
      lastModified: new Date(row.published_at),
      priority: 0.8,
      changeFrequency: 'monthly',
    }),
  );
}

/** Eski arşiv — düşük öncelik, yıllık changefreq. */
export async function archiveRecordEntries(page: number, pageSize = 45000): Promise<MetadataRoute.Sitemap> {
  const rows = await db.execute<Row<{ slug: string; published_at: string | Date }>>(sql`
    select slug, published_at
      from records
     where has_own_page
       and published_at <= current_date - (${RECENT_MONTHS} || ' months')::interval
     order by published_at desc
     limit ${pageSize} offset ${page * pageSize}
  `);

  return rows.map((row) =>
    entry('/karar/' + row.slug, {
      lastModified: new Date(row.published_at),
      priority: 0.3,
      changeFrequency: 'yearly',
    }),
  );
}

/** Sayı sayfaları ve yıl dizinleri. */
export async function issueEntries(): Promise<MetadataRoute.Sitemap> {
  const rows = await db.execute<Row<{ year: number; number: number; published_at: string | Date }>>(sql`
    select year, number, published_at from issues order by published_at desc
  `);

  const years = new Set<number>();
  const entries: MetadataRoute.Sitemap = [];

  for (const row of rows) {
    years.add(row.year);
    entries.push(
      entry('/sayilar/' + row.year + '/' + row.number, {
        lastModified: new Date(row.published_at),
        priority: 0.4,
        changeFrequency: 'yearly',
      }),
    );
  }

  for (const year of years) {
    entries.push(
      entry('/sayilar/' + year, {
        priority: year >= new Date().getFullYear() - 1 ? 0.6 : 0.3,
        changeFrequency: year >= new Date().getFullYear() ? 'weekly' : 'yearly',
      }),
    );
  }

  return entries;
}

/**
 * Varlık sayfaları — record_count >= 2 eşiği burada da geçerli (spec 8.2 madde 3).
 * Boş varlık sayfası üretilmiyorsa sitemap'e de girmemeli.
 */
export async function entityEntries(): Promise<MetadataRoute.Sitemap> {
  const rows = await db.execute<Row<{ kind: string; slug: string; record_count: number }>>(sql`
    select kind, slug, record_count from entities where record_count >= 2
  `);

  const path: Record<string, string> = {
    institution: '/kurum/',
    company: '/sirket/',
    place: '/yer/',
  };

  return rows.map((row) =>
    entry(path[row.kind]! + row.slug, {
      priority: row.record_count > 20 ? 0.6 : 0.4,
      changeFrequency: 'monthly',
    }),
  );
}

/** Konu × yıl arşiv sayfaları. */
export function topicYearEntries(): MetadataRoute.Sitemap {
  const currentYear = new Date().getFullYear();
  const entries: MetadataRoute.Sitemap = [];

  for (const topic of TOPIC_SLUGS) {
    for (let year = currentYear; year >= ARCHIVE_START_YEAR; year -= 1) {
      entries.push(
        entry('/konu/' + topic + '/' + year, {
          priority: year >= currentYear - 1 ? 0.6 : 0.3,
          changeFrequency: year >= currentYear ? 'weekly' : 'yearly',
        }),
      );
    }
  }

  return entries;
}
