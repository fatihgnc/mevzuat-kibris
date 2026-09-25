import 'server-only';

import { unstable_cache } from 'next/cache';

import { recordsBySlugs } from '@/lib/db/queries/records';
import { recordHref } from '@/lib/db/queries/shared';

import { topPages } from './client';
import { TOP_WINDOW_DAYS, type TopSearchItem } from './shared';

export { TOP_WINDOW_DAYS };

/** Cached for 6 hours: the source data is a day or more behind anyway. */
const TTL_SECONDS = 6 * 60 * 60;

export function slugFromPageUrl(page: string): string | null {
  try {
    const path = decodeURIComponent(new URL(page).pathname);
    const match = /^\/karar\/([^/]+)\/?$/.exec(path);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/*
 * The cached function THROWS on any failure. unstable_cache never stores a
 * thrown error, so a missing env var at build time or a Google outage is
 * retried on the next render instead of pinning an empty card for six hours.
 * The public wrapper below turns the throw into "no card".
 */
const cachedTopRecords = unstable_cache(
  async (limit: number): Promise<TopSearchItem[]> => {
    const rows = await topPages('/karar/', TOP_WINDOW_DAYS, limit * 3);

    const clicksBySlug = new Map<string, number>();
    for (const row of rows) {
      const slug = slugFromPageUrl(row.page);
      if (slug && row.clicks > 0) {
        clicksBySlug.set(slug, (clicksBySlug.get(slug) ?? 0) + row.clicks);
      }
    }

    const records = await recordsBySlugs([...clicksBySlug.keys()]);
    return records.slice(0, limit).map((record) => ({
      id: record.id,
      href: recordHref(record),
      summary: record.summary,
      titleTokens: record.titleTokens,
      clicks: clicksBySlug.get(record.slug) ?? 0,
    }));
  },
  ['gsc-top-items'],
  { revalidate: TTL_SECONDS },
);

/**
 * Most Google-clicked karar pages of the last month; empty when Search Console is
 * unreachable.
 *
 * Empty is not rare: it is what the BUILD gets whenever Search Console is out of
 * reach there, and the home page is prerendered, so the empty card used to stay
 * baked into the HTML until the next ISR regeneration — at least an hour after
 * every deploy. The card now refetches from /api/top-records when it starts empty.
 */
export async function googleTopRecords(limit = 5): Promise<TopSearchItem[]> {
  try {
    return await cachedTopRecords(limit);
  } catch (error) {
    console.error('GSC öne çıkanlar alınamadı', { message: String(error) });
    return [];
  }
}
