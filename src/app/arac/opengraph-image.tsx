import { ImageResponse } from 'next/og';

import { SITE_NAME } from '@/lib/seo/config';
import { TOOL_OG_CONTENT_TYPE, TOOL_OG_SIZE } from '@/lib/seo/tool-og-image';
import { TOOLS } from '@/lib/tools/registry';

export const alt = 'Mevzuat Kıbrıs hesaplayıcıları';
export const size = TOOL_OG_SIZE;
export const contentType = TOOL_OG_CONTENT_TYPE;

/**
 * Hub sayfasının kartı — tek bir araç değil, listenin kendisi.
 *
 * Araç kartlarıyla aynı palet ve yerleşim; farkı, gövdede bir başlık yerine
 * araçların adlarının durması. Sayı KAYITTAN okunuyor, elle yazılmıyor: sekizinci
 * araç eklendiğinde kartta hâlâ "7 hesaplayıcı" yazması, güncellenmeyi en son
 * hatırlanacak yerdir.
 */
export default function Image() {
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
          <span style={{ fontSize: 22, color: '#6B6B75' }}>hesaplayıcılar</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 62,
              lineHeight: 1.2,
              fontWeight: 600,
              color: '#17181A',
              letterSpacing: '-0.015em',
            }}
          >
            {TOOLS.length + ' hesaplayıcı, her sonucun altında dayandığı madde'}
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px 14px',
              fontSize: 24,
              color: '#43444A',
            }}
          >
            {TOOLS.map((tool) => (
              <span
                key={tool.slug}
                style={{
                  display: 'flex',
                  padding: '6px 14px',
                  borderRadius: 6,
                  background: '#F3F4F5',
                }}
              >
                {tool.name}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: '#6B6B75' }}>
          {'Yıllık izin  ·  fazla mesai  ·  tazminat  ·  doğum izni  ·  net maaş'}
        </div>
      </div>
    ),
    TOOL_OG_SIZE,
  );
}
