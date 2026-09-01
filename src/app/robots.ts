import type { MetadataRoute } from 'next';

import { IS_PRODUCTION_DEPLOY, SITE_URL } from '@/lib/seo/config';

/**
 * On preview deployments the whole site is closed off (spec 8.4). This shuts down a
 * class of bug as dangerous as the canonical escaping to *.vercel.app: the preview
 * getting indexed and producing duplicate content against production.
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
        // Search results are not indexed; leave the crawl budget for record pages.
        disallow: ['/ara', '/takip', '/hesap', '/api/', '/auth/'],
      },
    ],
    sitemap: SITE_URL + '/sitemap.xml',
    host: SITE_URL,
  };
}
