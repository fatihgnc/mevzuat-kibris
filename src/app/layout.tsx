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
  /* Tarayıcı arayüzü de temayla dönsün; ikinci değer koyu temanın zemini. */
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#171A1B' },
  ],
  width: 'device-width',
  initialScale: 1,
};

/**
 * Temayı İLK BOYAMADAN ÖNCE kuran betik.
 *
 * React'in içinden yapılamaz: hidrasyon sayfa boyandıktan sonra çalışıyor,
 * yani koyu tema seçmiş kullanıcı önce beyaz bir ekran görüp sonra karanlığa
 * atlardı. Bu yüzden senkron, satır içi ve <body>'nin ilk çocuğu.
 *
 * Sıra: kullanıcının açık seçimi > işletim sistemi tercihi. Seçim yoksa
 * sisteme uyuyoruz; kullanıcı bir kez anahtara dokunduysa artık onun kararı
 * geçerli ve sistem tercihi ezmiyor.
 *
 * try/catch: gizli sekmede ve site verisi engelliyken localStorage okumak
 * istisna atıyor. Yakalanmazsa betik ölür ve sayfa temasız kalırdı.
 */
const THEME_INIT = `(function(){try{var t=localStorage.getItem('tema');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /*
     * suppressHydrationWarning yalnızca <html> etiketinin KENDİ öznitelikleri
     * için geçerli, içeriğe inmiyor. Gerekli, çünkü tema betiği React
     * hidrasyondan önce data-theme ekliyor ve sunucudan gelen HTML'de o
     * öznitelik yok — React bunu uyuşmazlık sayıyor. Kasıtlı bir fark;
     * uyarıyı susturmak doğru olan, betiği geciktirmek değil.
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
