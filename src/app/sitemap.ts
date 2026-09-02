import type { MetadataRoute } from 'next';

import {
  archiveRecordEntries,
  entityEntries,
  issueEntries,
  recentRecordEntries,
  staticEntries,
  topicYearEntries,
  SITEMAP_CHUNK_COUNT,
} from '@/lib/seo/sitemap-chunks';

/**
 * A chunked sitemap — spec 8.2 rule 1.
 *
 * generateSitemaps puts the chunks at /sitemap/<id>.xml. Chunk 0 is static pages
 * and topics, 1 the last 24 months of records (fetched most often), 2 issues, 3
 * entities, 4 topic x year, 5+ the older archive.
 *
 * THE INDEX AT /sitemap.xml IS OURS TO SERVE — see app/sitemap.xml/route.ts. Next
 * does not create one when generateSitemaps is used; the comment here used to
 * claim it did, and because nothing ever requested that path locally the claim
 * survived until production returned 404 for it while robots.txt pointed straight
 * at it.
 */
export const revalidate = 86400;

export function generateSitemaps() {
  return Array.from({ length: SITEMAP_CHUNK_COUNT }, (_, id) => ({ id }));
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
