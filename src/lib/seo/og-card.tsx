import type { ReactNode } from 'react';
import { ImageResponse } from 'next/og';

import { SITE_NAME, SITE_URL } from '@/lib/seo/config';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

type OgCardInput = {
  /** Small label next to the site name, e.g. "bağımsız arşiv". */
  kicker: string;
  heading: string;
  /** Optional block under the heading: a sentence, or richer content such as chips. */
  summary?: ReactNode;
  /** Bottom-left line. */
  footer: string;
  /** Heading size override; long headings pass a smaller one. */
  headingSize?: number;
};

const INK = '#FFFFFF';
const MUTED = '#BFDADB';
const GROUND = '#1E5F63';
const ACCENT = '#F2C14E';

/**
 * The one share-card layout every og:image on the site is drawn with.
 *
 * Brand-teal ground with the site mark, so a link pasted into a feed reads as one
 * recognisable block instead of a white rectangle the feed's own background swallows.
 * The home page, record pages and calculators all go through here — three hand-copied
 * layouts had already started to drift apart.
 *
 * No font is downloaded: ImageResponse's default face carries the Turkish characters.
 */
export function ogCard({ kicker, heading, summary, footer, headingSize }: OgCardInput) {
  const host = SITE_URL.replace(/^https?:\/\//, '');

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: GROUND,
          padding: '60px 72px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg width="64" height="64" viewBox="0 0 32 32">
            <rect x="2" y="2" width="28" height="28" rx="6" fill="#174B4F" />
            <rect x="6" y="8" width="14" height="4" rx="2" fill="#FFFFFF" />
            <rect x="10" y="14" width="16" height="4" rx="2" fill={ACCENT} />
            <rect x="6" y="20" width="18" height="4" rx="2" fill="#FFFFFF" />
          </svg>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: INK, letterSpacing: '-0.01em' }}>
              {SITE_NAME}
            </span>
            <span style={{ fontSize: 24, color: MUTED }}>{kicker}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', width: 96, height: 8, borderRadius: 4, background: ACCENT }} />
          <div
            style={{
              display: 'flex',
              fontSize: headingSize ?? 68,
              lineHeight: 1.18,
              fontWeight: 700,
              color: INK,
              letterSpacing: '-0.02em',
            }}
          >
            {heading}
          </div>
          {summary ? (
            <div style={{ display: 'flex', fontSize: 28, lineHeight: 1.4, color: MUTED }}>
              {summary}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: 26,
            color: MUTED,
          }}
        >
          <span>{footer}</span>
          <span style={{ color: INK, fontWeight: 700 }}>{host}</span>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
