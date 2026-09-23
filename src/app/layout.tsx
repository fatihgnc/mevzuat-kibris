import type { Metadata, Viewport } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import { Suspense } from 'react';
import Script from 'next/script';

import { RouteProgress } from '@/components/route-progress';
import { DEFAULT_METADATA, RSS_ALTERNATE } from '@/lib/seo/metadata';
import { ADSENSE_CLIENT, IS_PRODUCTION_DEPLOY, SITE_URL } from '@/lib/seo/config';
import { organizationJsonLd, websiteJsonLd } from '@/lib/seo/json-ld';

import '@/styles/globals.css';

/**
 * One family, self-hosted (spec 13). next/font downloads it from Google at build
 * time and serves it from our own origin; at runtime there is no request to
 * fonts.googleapis.com. With `display: swap` the text is visible on first paint and
 * LCP does not wait on the font.
 */
const sans = Source_Sans_3({
  subsets: ['latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

/**
 * `metadataBase` is set here once and no page builds an absolute canonical by hand
 * (spec 8.4). It is the single thing keeping canonicals off a preview domain.
 *
 * NO `canonical` HERE, though — that one belongs to the home page, in app/page.tsx.
 *
 * Next merges metadata by field, so anything declared in this object is INHERITED
 * by every page that does not declare the same field. A canonical is the one value
 * that must never be inherited: it names one specific URL. While `canonical: '/'`
 * sat here, `/ara` — a page that builds its own metadata without an `alternates`
 * block — emitted a canonical pointing at the home page, telling Google it was the
 * home page. It is noindex, so nothing broke; the mechanism was the problem, because every future page that forgot
 * `alternates` would have done the same silently.
 *
 * `types` stays: a feed declaration genuinely is site-wide.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...DEFAULT_METADATA,
  alternates: { types: RSS_ALTERNATE },
};

export const viewport: Viewport = {
  /* Let the browser chrome follow the theme too; the second value is the dark theme's ground. */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#171A1B' },
  ],
  width: 'device-width',
  initialScale: 1,
};

/**
 * The script that sets the theme BEFORE THE FIRST PAINT.
 *
 * It cannot be done from inside React: hydration runs after the page has painted,
 * so a user who chose the dark theme would see a white screen first and then jump
 * to dark. Hence it is synchronous, inline, and the first child of <body>.
 *
 * Order: the user's explicit choice > light. With no choice the site defaults to
 * light regardless of OS preference; once the user has touched the switch, their
 * decision stands.
 *
 * try/catch: reading localStorage throws in a private window and with site data
 * blocked. Uncaught, the script would die and the page would be left with no theme.
 */
const THEME_INIT = `(function(){try{var t=localStorage.getItem('tema');if(t!=='dark'&&t!=='light'){t='light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * suppressHydrationWarning applies only to the <html> tag's OWN attributes; it
     * does not reach into the content. It is needed because the theme script adds
     * data-theme before React hydrates and that attribute is absent from the HTML
     * the server sent — which React counts as a mismatch. The difference is
     * deliberate; silencing the warning is the right move, not delaying the script.
     */
    <html lang="tr" className={sans.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-surface font-sans text-ink-body">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-surface"
        >
          İçeriğe geç
        </a>
        {/*
         * THE SUSPENSE BOUNDARY IS LOAD-BEARING. RouteProgress reads
         * useSearchParams, and an unwrapped useSearchParams in a client
         * component forces every page above it out of static rendering — one
         * component would have de-optimised the whole prerendered archive.
         * Wrapped, the rest of the tree still prerenders. `fallback={null}`
         * because there is nothing to show before the first navigation.
         */}
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>

        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
        />
        {/* The publisher entity behind every page — see organizationJsonLd. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        {/*
         * The AdSense loader is lazyOnload: it comes down after the page is
         * interactive and stays out of LCP (spec 13, 14.4). If ADSENSE_CLIENT is
         * empty it is not emitted at all — before approval the site runs ad-free.
         */}
        {ADSENSE_CLIENT ? (
          <Script
            id="adsense"
            strategy="lazyOnload"
            crossOrigin="anonymous"
            src={
              'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' +
              ADSENSE_CLIENT
            }
          />
        ) : null}
        {/*
         * Cloudflare Web Analytics — page counts only, no cookie and no
         * per-visitor trail. The privacy page has promised this since it was
         * written. Replaces the Vercel Web Analytics tag, which 404'd once the
         * app moved off Vercel's edge (that route only ever existed there).
         *
         * The beacon token identifies the site, not the visitor — it is meant
         * to sit in the page source, same as GA's measurement id.
         */}
        {IS_PRODUCTION_DEPLOY ? (
          <Script
            id="cloudflare-analytics"
            strategy="lazyOnload"
            type="module"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token": "7e71efa4bc7148f4afa5306475316383"}'
          />
        ) : null}
      </body>
    </html>
  );
}
