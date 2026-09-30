import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/seo/og-card';
import { TOOLS } from '@/lib/tools/registry';

export const alt = 'Mevzuat Kıbrıs hesaplayıcıları';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Hub sayfasının kartı — tek bir araç değil, listenin kendisi.
 *
 * Araç kartlarıyla aynı palet ve yerleşim; farkı, gövdede bir başlık yerine
 * araçların adlarının durması. Sayı KAYITTAN okunuyor, elle yazılmıyor: sekizinci
 * araç eklendiğinde kartta hâlâ "7 hesaplayıcı" yazması, güncellenmeyi en son
 * hatırlanacak yerdir.
 */
export default function Image() {
  return ogCard({
    kicker: 'hesaplayıcılar',
    heading: TOOLS.length + ' hesaplayıcı, her sonucun altında dayandığı madde',
    headingSize: 58,
    summary: (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 12px', fontSize: 22 }}>
        {TOOLS.map((tool) => (
          <span
            key={tool.slug}
            style={{
              display: 'flex',
              padding: '6px 14px',
              borderRadius: 6,
              background: '#174B4F',
              color: '#FFFFFF',
            }}
          >
            {tool.name}
          </span>
        ))}
      </div>
    ),
    footer: 'Yıllık izin  ·  fazla mesai  ·  tazminat  ·  doğum izni  ·  net maaş',
  });
}
