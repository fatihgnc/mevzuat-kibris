import { SITE_URL } from '@/lib/seo/config';

/**
 * Decides, in the browser, whether this visit may load AdSense at all.
 *
 * AdSense judges a site by the ad requests it receives, and it counts every
 * one of them: the owner refreshing the live site while building it, a
 * headless browser scraping the archive, a page opened on a tunnel or a
 * preview host. The account was once disabled for "invalid traffic" before a
 * single ad unit had gone live, with only the loader on the page. So the
 * loader no longer goes out unconditionally — every visit has to pass this
 * check first, and when it fails no request reaches Google.
 *
 * Three ways to fail:
 *   1. Wrong host  — anything other than the production domain (localhost,
 *                    a preview URL, an IP, a mirror).
 *   2. Opted out   — the owner's own browsers. Visiting any page with
 *                    `?reklamsiz=1` marks the browser for good; `?reklamsiz=0`
 *                    lifts it. Kept in localStorage, so it survives restarts
 *                    and does not depend on a cookie banner.
 *   3. Automated   — a browser that says it is driven (navigator.webdriver) or
 *                    whose user agent names a crawler or a headless engine.
 *                    Crawlers that do not run JavaScript never get this far;
 *                    this catches the ones that do.
 *
 * Client-only: it reads window, navigator and localStorage. Call it from an
 * effect, never during render, or server and client HTML will disagree.
 */

const OPT_OUT_KEY = 'reklamsiz';
const OPT_OUT_PARAM = 'reklamsiz';

const AUTOMATED_UA =
  /bot|crawl|spider|slurp|headless|phantomjs|puppeteer|playwright|selenium|lighthouse|pagespeed|chrome-lighthouse|python|curl|wget|scrapy|go-http-client|httpclient|java\/|node-fetch|axios/i;

const PRODUCTION_HOST = new URL(SITE_URL).hostname;

/** Applies `?reklamsiz=1|0` from the current URL and reports the stored choice. */
function ownerOptedOut(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get(OPT_OUT_PARAM);
    if (param === '1') localStorage.setItem(OPT_OUT_KEY, '1');
    if (param === '0') localStorage.removeItem(OPT_OUT_KEY);
    return localStorage.getItem(OPT_OUT_KEY) === '1';
  } catch {
    // Storage blocked (private window, site data off): the param alone still decides this visit.
    return new URLSearchParams(window.location.search).get(OPT_OUT_PARAM) === '1';
  }
}

function isAutomated(): boolean {
  if (navigator.webdriver) return true;
  return AUTOMATED_UA.test(navigator.userAgent);
}

function isProductionHost(): boolean {
  const host = window.location.hostname;
  return host === PRODUCTION_HOST || host === 'www.' + PRODUCTION_HOST;
}

export function adsAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  // The opt-out runs first so `?reklamsiz=…` is stored even when another check would also fail.
  if (ownerOptedOut()) return false;
  return isProductionHost() && !isAutomated();
}
