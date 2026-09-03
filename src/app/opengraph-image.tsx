import { ImageResponse } from 'next/og';

import { ARCHIVE_START_YEAR, SITE_KICKER, SITE_NAME, SITE_TAGLINE } from '@/lib/seo/config';

export const alt = SITE_NAME + ' — ' + SITE_TAGLINE;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The site-wide share card — spec 8.4.
 *
 * `buildMetadata` promises `twitter:card = summary_large_image` on every page, but
 * the only image the site had was the per-record card under /karar/[slug]. Every
 * other page — the home page, the topic hubs, the guides written specifically to be
 * shared — went out with a large-card declaration and no image behind it.
 *
 * This file sits at the app root, so the file convention hands it to every route
 * that does not define its own; the record card still wins on record pages.
 *
 * Same palette and construction as that card, deliberately: two cards from one site
 * should look like two cards from one site. As there, no font is downloaded —
 * ImageResponse's default face carries the Turkish characters, and fetching a font
 * on every generation buys nothing at this size.
 */
export default function Image() {
  const coverage = ARCHIVE_START_YEAR + ' — bugün';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FFFFFF',
          padding: '64px 72px',
          borderTop: '10px solid #1F6E7C',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span
            style={{ fontSize: 30, fontWeight: 700, color: '#17181A', letterSpacing: '-0.01em' }}
          >
            {SITE_NAME}
          </span>
          <span style={{ fontSize: 22, color: '#6B6B75' }}>{SITE_KICKER}</span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 58,
            lineHeight: 1.24,
            fontWeight: 600,
            color: '#17181A',
            letterSpacing: '-0.015em',
          }}
        >
          {SITE_TAGLINE}
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: '#6B6B75' }}>
          {'Resmî Gazete arşivi, aranabilir  ·  ' + coverage}
        </div>
      </div>
    ),
    size,
  );
}
