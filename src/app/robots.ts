import type { MetadataRoute } from 'next';

import { IS_PRODUCTION_DEPLOY, SITE_URL } from '@/lib/seo/config';

/**
 * On preview deployments the whole site is closed off (spec 8.4). This shuts down a
 * class of bug as dangerous as the canonical escaping to *.vercel.app: the preview
 * getting indexed and producing duplicate content against production.
 */
/**
 * Bulk scrapers and AI-training crawlers that respect robots.txt at all — the ones
 * ignoring it entirely aren't stopped by this file no matter what it says, that's
 * the middleware rate limiter's job (src/middleware.ts). This list only catches the
 * crawlers that DO honor the spec, so the OCR text we paid for doesn't get
 * bulk-harvested into someone else's training set or scraping product.
 *
 * Deliberately NOT here: `ChatGPT-User` (and no Anthropic equivalent is blocked
 * either). Those are the on-demand, single-page fetch a chat assistant makes when
 * a person pastes a /karar/ link and asks it to read or summarize that one page —
 * different from `GPTBot`/`ClaudeBot`/`anthropic-ai`, which crawl in bulk to build
 * a training set. Blocking the bulk crawlers stops that; blocking the on-demand
 * ones would just break the case of someone asking ChatGPT or Claude about a
 * specific record they found here, which is a case worth keeping working.
 */
const DISALLOWED_KARAR_BOTS = [
  'GPTBot',
  'CCBot',
  'Google-Extended',
  'anthropic-ai',
  'ClaudeBot',
  'Claude-Web',
  'Bytespider',
  'PerplexityBot',
  'Applebot-Extended',
  'Diffbot',
  'Omgili',
  'FacebookBot',
  'Amazonbot',
  'ImagesiftBot',
  'SemrushBot',
  'AhrefsBot',
  'MJ12bot',
  'DotBot',
];

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_DEPLOY) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: DISALLOWED_KARAR_BOTS,
        disallow: '/karar/',
      },
      {
        userAgent: '*',
        allow: '/',
        /*
         * ONLY WHAT NOTHING LINKS TO GOES IN HERE.
         *
         * `/ara` used to be on this list while carrying a `noindex` meta AND
         * being linked from every page — the header, the footer, the search
         * form, the home page's "sık aranan" chips. Those three facts do
         * not combine the way they look like they do: a disallow stops the CRAWL,
         * not the INDEXING. Google never fetches the page, so it never reads the
         * `noindex` it was meant to obey, and a URL with inbound links can still
         * enter the index on the strength of those links alone — as a bare URL
         * with no title and no description, which is the worst of both outcomes.
         *
         * It carries a `noindex` in its own metadata and that is the tool that
         * actually works. `/ara` is `noindex, follow`, so letting the crawler in
         * also lets the links on a results page flow through to the record pages.
         *
         * `/api/` holds route handlers, not pages — they have no meta tag to
         * carry a `noindex`, so robots.txt is the only instrument available for
         * them.
         */
        disallow: ['/api/'],
      },
    ],
    // /sitemap.xml is Next's own metadata path and answers 404 here, because
    // app/sitemap.ts uses generateSitemaps. See app/sitemap-index.xml/route.ts.
    sitemap: SITE_URL + '/sitemap-index.xml',
    host: SITE_URL,
  };
}
