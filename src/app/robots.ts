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
        /*
         * ONLY WHAT NOTHING LINKS TO GOES IN HERE.
         *
         * `/ara` and `/takip` used to be on this list while carrying a `noindex`
         * meta AND being linked from every page — the header, the footer, the
         * search form, the home page's "sık aranan" chips. Those three facts do
         * not combine the way they look like they do: a disallow stops the CRAWL,
         * not the INDEXING. Google never fetches the page, so it never reads the
         * `noindex` it was meant to obey, and a URL with inbound links can still
         * enter the index on the strength of those links alone — as a bare URL
         * with no title and no description, which is the worst of both outcomes.
         *
         * Both carry a `noindex` in their own metadata and that is the tool that
         * actually works. `/ara` is `noindex, follow`, so letting the crawler in
         * also lets the links on a results page flow through to the record pages;
         * `/takip` is `noindex, nofollow`, which is right for a page whose only
         * links are the user's own alerts.
         *
         * `/hesap` stays: nothing links to it (it redirects to /takip when signed
         * out), so there is no link for the index to latch onto and the disallow
         * costs nothing. `/api/` and `/auth/` are route handlers, not pages —
         * they have no meta tag to carry a `noindex`, so robots.txt is the only
         * instrument available for them.
         */
        disallow: ['/hesap', '/api/', '/auth/'],
      },
    ],
    // /sitemap.xml is Next's own metadata path and answers 404 here, because
    // app/sitemap.ts uses generateSitemaps. See app/sitemap-index.xml/route.ts.
    sitemap: SITE_URL + '/sitemap-index.xml',
    host: SITE_URL,
  };
}
