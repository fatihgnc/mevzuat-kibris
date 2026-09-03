import type { Metadata, Viewport } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import Script from 'next/script';

import { DEFAULT_METADATA } from '@/lib/seo/metadata';
import { ADSENSE_CLIENT, SITE_URL } from '@/lib/seo/config';
import { websiteJsonLd } from '@/lib/seo/json-ld';

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
 * metadataBase is set here once and no page builds its own canonical by hand (spec
 * 8.4). This line is the single thing preventing the canonical from escaping to a
 * preview domain.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...DEFAULT_METADATA,
  alternates: {
    canonical: '/',
    types: { 'application/rss+xml': [{ url: '/rss.xml', title: 'Tüm kayıtlar' }] },
  },
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
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
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
      </body>
    </html>
  );
}
