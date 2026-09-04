import 'server-only';

import { sql } from 'drizzle-orm';
import type { MetadataRoute } from 'next';

import { db } from '@/lib/db/client';
import { type Row } from '@/lib/db/queries/shared';
import { topicYearCounts } from '@/lib/db/queries/records';
import { TOPIC_SLUGS, isTopicSlug } from '@/lib/constants/topics';
import { GUIDES } from '@/lib/content/guides';

import { ARCHIVE_START_YEAR, RECENT_MONTHS, absoluteUrl } from './config';

/**
 * Sitemap prioritisation — spec 8.2 rule 1.
 *
 * At 100k+ pages, crawl budget management is essential. The rule: the last 24
 * months get high priority and monthly changefreq, the older archive gets low
 * priority and yearly. New records are kept in a separate chunk because Google
 * fetches that one most often.
 */


/**
 * How many sitemap chunks exist: 5 fixed ones plus the archive pages.
 *
 * It lives here rather than in app/sitemap.ts because TWO routes need it and they
 * must not drift: generateSitemaps produces /sitemap/<id>.xml, and the index at
 * /sitemap.xml has to list exactly those ids. A mismatch is invisible until a
 * crawler follows a link to a chunk that was never generated.
 *
 * ONE archive chunk, not six. Six was provisioned for an archive reaching back to
 * 2006. The product owner scoped the archive to 2020-2026 instead, and the six
 * left production advertising eleven chunks of which FIVE WERE EMPTY — measured
 * against the live sitemap, chunks 6-10 returned zero URLs each. Google reports an
 * empty sitemap as an error, so the over-provisioning was not free.
 *
 * The archive bucket (records older than 24 months) holds 10,707 URLs against a
 * page size of 45,000, so one chunk covers it with room to spare. If the scope
 * ever reopens, raise this AND check the count: anything past
 * SITEMAP_ARCHIVE_CHUNKS * 45,000 falls out of the sitemap silently.
 */
export const SITEMAP_ARCHIVE_CHUNKS = 1;
export const SITEMAP_CHUNK_COUNT = 5 + SITEMAP_ARCHIVE_CHUNKS;

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

/** Static pages and topic entries. */
export function staticEntries(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    entry('/', { lastModified: now, priority: 1, changeFrequency: 'daily' }),
    entry('/sayilar', { lastModified: now, priority: 0.6, changeFrequency: 'weekly' }),
    /*
     * The entity hubs. They rank by record count, so their first page changes
     * whenever ingest runs — hence `weekly` rather than the `monthly` the entity
     * detail pages get in entityEntries().
     */
    entry('/kurum', { lastModified: now, priority: 0.6, changeFrequency: 'weekly' }),
    entry('/sirket', { lastModified: now, priority: 0.6, changeFrequency: 'weekly' }),
    entry('/yer', { lastModified: now, priority: 0.6, changeFrequency: 'weekly' }),
    entry('/rehber', { priority: 0.7, changeFrequency: 'monthly' }),
    entry('/hakkinda', { priority: 0.5, changeFrequency: 'yearly' }),
    entry('/iletisim', { priority: 0.4, changeFrequency: 'yearly' }),
    entry('/gizlilik', { priority: 0.3, changeFrequency: 'yearly' }),
    entry('/kullanim-kosullari', { priority: 0.3, changeFrequency: 'yearly' }),
    ...GUIDES.map((guide) =>
      entry('/rehber/' + guide.slug, { priority: 0.7, changeFrequency: 'monthly' }),
    ),
    /*
     * The topic hub, then the topics themselves. `/konu` was missing here while
     * every one of its children was listed — it is in the header navigation and
     * carries its own metadata, so nothing but this list made it invisible.
     *
     * Same priority as the topic pages rather than the 0.6 the entity hubs get:
     * this one is a landing page in its own right, and the topics under it are the
     * site's most-crawled section.
     */
    entry('/konu', { lastModified: now, priority: 0.8, changeFrequency: 'daily' }),
    ...TOPIC_SLUGS.map((slug) =>
      entry('/konu/' + slug, { lastModified: now, priority: 0.8, changeFrequency: 'daily' }),
    ),
  ];
}

/** Records from the last 24 months — the chunk Google fetches most often. */
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

/** The older archive — low priority, yearly changefreq. */
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

/** Issue pages and year indexes. */
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
 * Entity pages — the record_count >= 2 threshold applies here too (spec 8.2 rule
 * 3). If an empty entity page is not generated, it must not enter the sitemap
 * either.
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

/**
 * Topic x year archive pages — only the combinations that actually hold records.
 *
 * The counts come from the database rather than from a nested loop over
 * TOPIC_SLUGS x years. The loop announced ~190 URLs regardless of content, and the
 * page behind an empty one answers 200 with an empty list — a soft 404 in the
 * sitemap. `/sayilar/[yil]` has always called notFound() in that situation; the
 * topic-year page now does the same, and this query keeps the sitemap agreeing
 * with it.
 */
export async function topicYearEntries(): Promise<MetadataRoute.Sitemap> {
  const currentYear = new Date().getFullYear();
  const rows = await topicYearCounts();

  return rows
    .filter((row) => isTopicSlug(row.topic) && row.year >= ARCHIVE_START_YEAR)
    .map((row) =>
      entry('/konu/' + row.topic + '/' + row.year, {
        priority: row.year >= currentYear - 1 ? 0.6 : 0.3,
        changeFrequency: row.year >= currentYear ? 'weekly' : 'yearly',
      }),
    );
}
