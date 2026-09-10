import { TOOL_OG_CONTENT_TYPE, TOOL_OG_SIZE, toolOgImage } from '@/lib/seo/tool-og-image';
import { findTool } from '@/lib/tools/registry';

const SLUG = 'net-brut-maas-hesaplayici';

/*
 * Kart ÇİZİMİ paylaşılan bir modülde; burada duran tek şey, Next'in dosya
 * kuralının gerektirdiği kabuk. Kural iç içe rotalara miras bırakmadığı için her
 * araç klasörünün kendi dosyası olmak zorunda.
 */
export const alt = (findTool(SLUG)?.heading ?? 'Hesaplayıcı') + ' — Mevzuat Kıbrıs';
export const size = TOOL_OG_SIZE;
export const contentType = TOOL_OG_CONTENT_TYPE;

export default function Image() {
  return toolOgImage(SLUG);
}
