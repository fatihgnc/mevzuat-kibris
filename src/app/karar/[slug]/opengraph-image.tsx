import { ImageResponse } from 'next/og';

import { getRecordBySlug } from '@/lib/db/queries/records';
import { formatDateLong } from '@/lib/text/dates';
import { SITE_NAME } from '@/lib/seo/config';
import { truncateTitle } from '@/lib/text/truncate';

export const alt = 'Mevzuat Kıbrıs kayıt kartı';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

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
        'RG sayı ' + record.issue.number + '/' + record.issue.year,
      ].join('  ·  ')
    : 'KKTC Resmî Gazete arama ve takip';

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
          <span style={{ fontSize: 30, fontWeight: 700, color: '#17181A', letterSpacing: '-0.01em' }}>
            {SITE_NAME}
          </span>
          <span style={{ fontSize: 22, color: '#6B6B75' }}>bağımsız arşiv</span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: heading.length > 80 ? 48 : 58,
            lineHeight: 1.24,
            fontWeight: 600,
            color: '#17181A',
            letterSpacing: '-0.015em',
          }}
        >
          {heading}
        </div>

        <div style={{ display: 'flex', fontSize: 26, color: '#6B6B75' }}>{meta}</div>
      </div>
    ),
    size,
  );
}
