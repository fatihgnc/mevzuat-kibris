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
 * Parçalı sitemap — spec 8.2 madde 1.
 *
 * Next.js generateSitemaps ile /sitemap/[id].xml üretiyor ve kök
 * /sitemap.xml bunların indeksi oluyor. Parça 0 statik sayfalar ve konular,
 * 1 son 24 ayın kayıtları (en sık çekilen), 2 sayılar, 3 varlıklar,
 * 4 konu × yıl, 5+ eski arşiv.
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
   * Next.js parça kimliğini URL segmentinden geçiriyor ve string olarak
   * veriyor. switch strict eşitlik kullandığı için "0" hiçbir case'e uymuyor,
   * default'a düşüyor ve archiveRecordEntries("0" - 5) = -5 offset'iyle
   * çağrılıp "OFFSET must not be negative" ile build'i kırıyordu.
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
