import { OG_CONTENT_TYPE, OG_SIZE, ogCard } from '@/lib/seo/og-card';
import { findTool } from '@/lib/tools/registry';

export const TOOL_OG_SIZE = OG_SIZE;
export const TOOL_OG_CONTENT_TYPE = OG_CONTENT_TYPE;

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

  return ogCard({
    kicker: 'hesaplayıcı',
    heading,
    summary,
    footer: tool?.ogFooter ?? (primaryLaw ? primaryLaw + '  ·  ' + articles : 'KKTC mevzuatı'),
    /* Uzun başlıklarda punto düşüyor; kayıt kartındaki eşikle aynı mantık. */
    headingSize: heading.length > 40 ? 54 : 64,
  });
}
