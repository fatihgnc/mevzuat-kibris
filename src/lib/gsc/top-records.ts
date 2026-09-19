import 'server-only';

import { unstable_cache } from 'next/cache';

import { recordsBySlugs } from '@/lib/db/queries/records';
import type { RecordListItem } from '@/types/record';

import { topPages } from './client';

export const TOP_WINDOW_DAYS = 28;
/** Cached for 6 hours: the source data is a day or more behind anyway. */
const TTL_SECONDS = 6 * 60 * 60;

export interface TopRecord {
  record: RecordListItem;
  clicks: number;
}

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
  async (limit: number): Promise<TopRecord[]> => {
    const rows = await topPages('/karar/', TOP_WINDOW_DAYS, limit * 3);

    const clicksBySlug = new Map<string, number>();
    for (const row of rows) {
      const slug = slugFromPageUrl(row.page);
      if (slug && row.clicks > 0) {
        clicksBySlug.set(slug, (clicksBySlug.get(slug) ?? 0) + row.clicks);
      }
    }

    const records = await recordsBySlugs([...clicksBySlug.keys()]);
    return records.slice(0, limit).map((record) => ({ record, clicks: clicksBySlug.get(record.slug) ?? 0 }));
  },
  ['gsc-top-records'],
  { revalidate: TTL_SECONDS },
);

/** Most Google-clicked karar pages of the last month; empty when Search Console is unreachable. */
export async function googleTopRecords(limit = 5): Promise<TopRecord[]> {
  try {
    return await cachedTopRecords(limit);
  } catch (error) {
    console.error('GSC öne çıkanlar alınamadı', { message: String(error) });
    return [];
  }
}
