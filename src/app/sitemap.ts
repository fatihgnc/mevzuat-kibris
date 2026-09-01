import type { MetadataRoute } from 'next';

import {
  archiveRecordEntries,
  entityEntries,
  issueEntries,
  recentRecordEntries,
  staticEntries,
  topicYearEntries,
} from '@/lib/seo/sitemap-chunks';

/**
 * A chunked sitemap — spec 8.2 rule 1.
 *
 * Next.js generates /sitemap/[id].xml via generateSitemaps, and the root
 * /sitemap.xml becomes their index. Chunk 0 is static pages and topics, 1 the last
 * 24 months of records (fetched most often), 2 issues, 3 entities, 4 topic x year,
 * 5+ the older archive.
 */
export const revalidate = 86400;

const ARCHIVE_CHUNKS = 6;

export function generateSitemaps() {
  return Array.from({ length: 5 + ARCHIVE_CHUNKS }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: number | string;
}): Promise<MetadataRoute.Sitemap> {
  /*
   * Next.js passes the chunk id through the URL segment and hands it over as a
   * string. Because switch uses strict equality, "0" matched no case, fell to
   * default, and archiveRecordEntries was called with an offset of ("0" - 5) = -5,
   * breaking the build with "OFFSET must not be negative".
   */
  const chunk = Number(id);

  switch (chunk) {
    case 0:
      return staticEntries();
    case 1:
      return recentRecordEntries();
    case 2:
      return issueEntries();
    case 3:
      return entityEntries();
    case 4:
      return topicYearEntries();
    default:
      return archiveRecordEntries(Math.max(0, chunk - 5));
  }
}
