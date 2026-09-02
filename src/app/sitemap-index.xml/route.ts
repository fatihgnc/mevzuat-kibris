import { SITE_URL } from '@/lib/seo/config';
import { SITEMAP_CHUNK_COUNT } from '@/lib/seo/sitemap-chunks';

/**
 * The sitemap index — spec 8.2 rule 1.
 *
 * NEXT DOES NOT PROVIDE ONE. When app/sitemap.ts uses generateSitemaps the chunks
 * are served at /sitemap/<id>.xml and nothing answers at /sitemap.xml. The comment
 * in sitemap.ts assumed the opposite and nothing caught it: no page links to that
 * path, so only crawlers ever asked for it. In production robots.txt pointed
 * straight at /sitemap.xml, it returned 404, and every one of the 3,000+ URLs was
 * invisible to search engines while all eleven chunks answered 200.
 *
 * WHY NOT /sitemap.xml: that path is reserved by the metadata convention for
 * app/sitemap.ts. A route handler placed there compiles but returns 500 at request
 * time (measured). Hence the separate name, declared to crawlers from robots.txt.
 *
 * The chunk count is the same constant generateSitemaps uses, so the index cannot
 * list an id that was never generated.
 */
export const revalidate = 86400;

export function GET(): Response {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Array.from(
      { length: SITEMAP_CHUNK_COUNT },
      (_, id) => '<sitemap><loc>' + SITE_URL + '/sitemap/' + id + '.xml</loc></sitemap>',
    ),
    '</sitemapindex>',
  ].join('\n');

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=86400',
    },
  });
}
