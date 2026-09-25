import { IS_PRODUCTION_DEPLOY, SITE_URL } from '@/lib/seo/config';

/**
 * robots.txt as a route handler instead of app/robots.ts.
 *
 * WHY: `MetadataRoute.Robots` cannot express the `Content-Signal` directive
 * (contentsignals.org), so the file is written by hand. Everything else is the
 * same policy the metadata version had.
 *
 * On preview deployments the whole site is closed off (spec 8.4). This shuts down a
 * class of bug as dangerous as the canonical escaping to *.vercel.app: the preview
 * getting indexed and producing duplicate content against production.
 *
 * ONLY WHAT NOTHING LINKS TO GOES IN THE DISALLOW LIST.
 *
 * `/ara` used to be disallowed while carrying a `noindex` meta AND being linked
 * from every page. A disallow stops the CRAWL, not the INDEXING: Google never
 * fetches the page, so it never reads the `noindex`, and a URL with inbound links
 * can still enter the index as a bare URL. `/ara` is `noindex, follow`, so the
 * crawler is let in and the links on a results page flow to the record pages.
 *
 * `/api/` holds route handlers, not pages — they have no meta tag to carry a
 * `noindex`, so robots.txt is the only instrument available for them.
 *
 * /sitemap.xml is Next's own metadata path and answers 404 here, because
 * app/sitemap.ts uses generateSitemaps. See app/sitemap-index.xml/route.ts.
 */
export const revalidate = 86400;

export function GET(): Response {
  const lines = IS_PRODUCTION_DEPLOY
    ? [
        'User-Agent: *',
        // A preference declaration only: the site is public legal text and should
        // show up in search and in AI answers.
        'Content-Signal: search=yes, ai-input=yes, ai-train=yes',
        'Allow: /',
        'Disallow: /api/',
        '',
        'Host: ' + SITE_URL,
        'Sitemap: ' + SITE_URL + '/sitemap-index.xml',
      ]
    : ['User-Agent: *', 'Disallow: /'];

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400',
    },
  });
}
