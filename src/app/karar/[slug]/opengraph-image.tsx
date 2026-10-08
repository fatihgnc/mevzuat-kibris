import { getRecordBySlug } from '@/lib/db/queries/records';
import { formatDateLong } from '@/lib/text/dates';
import { SITE_KICKER, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/config';
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/seo/og-card';
import { truncateTitle } from '@/lib/text/truncate';

export const alt = 'Mevzuat Kıbrıs kayıt kartı';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * The dynamic og:image — spec 8.4: title + date + issue number.
 *
 * The site has no raster imagery (spec 14.3); this is the only exception. The card
 * is drawn with the design's palette so a shared link looks like the site. No font
 * is downloaded: ImageResponse's default body font carries the Turkish characters,
 * and downloading a font for every record would lengthen generation needlessly.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const record = await getRecordBySlug(slug);

  const heading = record ? truncateTitle(record.summary ?? record.title, 120) : SITE_NAME;
  const meta = record
    ? [
        formatDateLong(record.publishedAt),
        record.fromGazette ? 'RG sayı ' + record.issue.number + '/' + record.issue.year : 'Kamu Hizmeti Komisyonu',
      ].join('  ·  ')
    : SITE_TAGLINE;

  return ogCard({
    kicker: SITE_KICKER,
    heading,
    footer: meta,
    headingSize: heading.length > 80 ? 52 : 62,
  });
}
