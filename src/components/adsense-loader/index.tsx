'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

import { adsAllowed } from '@/lib/ads';
import { ADSENSE_CLIENT } from '@/lib/seo/config';

/**
 * The AdSense loader, emitted only for visits that pass `adsAllowed()`.
 *
 * It used to be a plain <Script> in the root layout, which sent every visit —
 * the owner's, a headless scraper's, a preview host's — to Google. The check
 * needs the browser, so the decision is made after mount; the server HTML
 * never contains the loader. Site ownership is still verifiable without it:
 * the root layout emits the `google-adsense-account` meta tag and ads.txt is
 * served as before.
 *
 * lazyOnload as before: the loader stays out of LCP (spec 13, 14.4).
 */
export function AdsenseLoader() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    setAllowed(adsAllowed());
  }, []);

  if (!ADSENSE_CLIENT || !allowed) return null;

  return (
    <Script
      id="adsense"
      strategy="lazyOnload"
      crossOrigin="anonymous"
      src={'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT}
    />
  );
}
