import { ImageResponse } from 'next/og';

import { SITE_NAME } from '@/lib/seo/config';
import { findTool } from '@/lib/tools/registry';

export const TOOL_OG_SIZE = { width: 1200, height: 630 };
export const TOOL_OG_CONTENT_TYPE = 'image/png';

/**
 * Hesaplayıcıların paylaşım kartı.
 *
 * BU DOSYA HER ARAÇ KLASÖRÜNDE AYRI AYRI ÇAĞRILIYOR, çünkü Next'in
 * `opengraph-image` dosya kuralı iç içe rotalara MİRAS BIRAKMIYOR: kökteki
 * `src/app/opengraph-image.tsx` yalnızca ana sayfaya uygulanıyor, alt rotalar
 * `twitter:card = summary_large_image` sözü verip arkasında görsel olmadan
 * paylaşılıyordu. Kayıt sayfasının kendi kartı da aynı sebeple kendi klasöründe
 * duruyor.
 *
 * Kart, sitedeki diğer iki kartla AYNI dilde çiziliyor — aynı palet, aynı üstten
 * çizgi, aynı yerleşim. İki kart tek siteden geliyorsa öyle görünmeli. Yazı tipi
 * indirilmiyor: `ImageResponse`'un varsayılan yüzü Türkçe karakterleri taşıyor ve
 * her üretimde font çekmek bu boyutta hiçbir şey kazandırmıyor.
 */
export function toolOgImage(slug: string) {
  const tool = findTool(slug);

  const heading = tool?.heading ?? 'Hesaplayıcılar';
  const summary = tool?.summary ?? 'KKTC iş mevzuatına göre hesaplayıcılar';

  /*
   * Dayanak, kartın alt satırı. Paylaşılan bağlantıya bakan kişi sayfayı
   * açmadan hesabın neye dayandığını görüyor — bu araçlarda güvenilirliği
   * taşıyan tek şey de o.
   *
   * YALNIZCA İLK YASANIN maddeleri yazılıyor. Bordro aracı gibi birden fazla
   * yasaya dayananlarda bütün madde numaralarını tek yasanın adının yanına
   * dizmek, 16/1976'nın maddesini 73/2007'ye aitmiş gibi gösterirdi.
   */
  const primaryLaw = tool?.legal[0]?.law ?? '';
  const articles =
    tool?.legal
      .filter((reference) => reference.law === primaryLaw)
      .map((reference) => reference.article)
      .join('  ·  ') ?? '';

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
          <span style={{ fontSize: 22, color: '#6B6B75' }}>hesaplayıcı</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div
            style={{
              display: 'flex',
              /* Uzun başlıklarda punto düşüyor; kayıt kartındaki eşikle aynı mantık. */
              fontSize: heading.length > 40 ? 52 : 62,
              lineHeight: 1.2,
              fontWeight: 600,
              color: '#17181A',
              letterSpacing: '-0.015em',
            }}
          >
            {heading}
          </div>
          <div style={{ display: 'flex', fontSize: 28, lineHeight: 1.4, color: '#43444A' }}>
            {summary}
          </div>
        </div>

        <div style={{ display: 'flex', fontSize: 24, color: '#6B6B75' }}>
          {primaryLaw ? primaryLaw + '  ·  ' + articles : 'KKTC iş mevzuatı'}
        </div>
      </div>
    ),
    TOOL_OG_SIZE,
  );
}
