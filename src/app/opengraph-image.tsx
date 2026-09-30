import { ARCHIVE_START_YEAR, SITE_KICKER, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/config';
import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/seo/og-card';

export const alt = SITE_NAME + ' — ' + SITE_TAGLINE;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * The site-wide share card — spec 8.4.
 *
 * `buildMetadata` promises `twitter:card = summary_large_image` on every page, so the
 * app root hands this card to every route that does not define its own. The layout
 * is shared with the record and calculator cards via `ogCard`.
 */
export default function Image() {
  return ogCard({
    kicker: SITE_KICKER,
    heading: SITE_TAGLINE,
    summary: 'Resmî Gazete kayıtlarını başlığa, konuya ve tarihe göre ara.',
    footer: 'Resmî Gazete arşivi  ·  ' + ARCHIVE_START_YEAR + ' — bugün',
    headingSize: 64,
  });
}
