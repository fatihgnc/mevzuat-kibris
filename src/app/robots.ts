import type { MetadataRoute } from 'next';

import { IS_PRODUCTION_DEPLOY, SITE_URL } from '@/lib/seo/config';

/**
 * Preview deployment'larda tüm site kapalı (spec 8.4). Bu, canonical'ın
 * *.vercel.app'e kaçması kadar tehlikeli bir hata sınıfını daha kapatıyor:
 * preview'un indekslenip production ile duplicate content üretmesi.
 */
export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_DEPLOY) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Arama sonuçları indekslenmiyor; crawl budget'ı kayıt sayfalarına bırak.
        disallow: ['/ara', '/takip', '/hesap', '/api/', '/auth/'],
      },
    ],
    sitemap: SITE_URL + '/sitemap.xml',
    host: SITE_URL,
  };
}
