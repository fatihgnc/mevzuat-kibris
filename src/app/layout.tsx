import type { Metadata, Viewport } from 'next';
import { Source_Sans_3 } from 'next/font/google';
import Script from 'next/script';

import { DEFAULT_METADATA } from '@/lib/seo/metadata';
import { ADSENSE_CLIENT, SITE_URL } from '@/lib/seo/config';
import { websiteJsonLd } from '@/lib/seo/json-ld';

import '@/styles/globals.css';

/**
 * Tek aile, self-host (spec 13). next/font Google'dan build sırasında indirip
 * kendi origin'imizden servis ediyor; runtime'da fonts.googleapis.com'a istek yok.
 * `display: swap` ile metin ilk boyamada görünüyor, LCP fonta takılmıyor.
 */
const sans = Source_Sans_3({
  subsets: ['latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

/**
 * metadataBase burada bir kez set ediliyor ve hiçbir sayfa kendi canonical'ını
 * elle kurmuyor (spec 8.4). Bu satır, canonical'ın preview domain'ine kaçmasını
 * engelleyen tek nokta.
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
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={sans.variable}>
      <body className="min-h-dvh bg-surface font-sans text-ink-body">
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
         * AdSense yükleyicisi lazyOnload: sayfa etkileşime hazır olduktan sonra
         * iniyor, LCP'ye girmiyor (spec 13, 14.4). ADSENSE_CLIENT boşsa hiç
         * basılmıyor — onay gelmeden site reklamsız çalışıyor.
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
