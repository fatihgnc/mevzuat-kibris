/**
 * THE single source for brand, domain and coverage (spec 8.4).
 *
 * No component hardcodes the brand name, the domain or the archive start year. If
 * the coverage claim varies from page to page, trust ends the moment a user
 * searches a year outside coverage and gets nothing.
 */

export const SITE_NAME = 'Mevzuat Kıbrıs';
export const SITE_TAGLINE = 'KKTC Resmî Gazete arama ve takip';
export const SITE_KICKER = 'bağımsız arşiv';

/** On preview deployments use their own origin; canonical generation flows from this one point. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://mevzuatkibris.com'
).replace(/\/$/, '');

/**
 * The year the archive starts.
 *
 * CAUTION — spec 8.4 requires the coverage year to be TRUTHFUL, and this constant
 * is the single place every claim about coverage is derived from: the home page
 * sentence, the footer, the OG card, the empty-search message and the
 * /sayilar/[yil] guard.
 *
 * It says 2020 because that is what we hold. It used to say 2006 — the year the
 * source archive itself begins — on the understanding that backfill would reach
 * back to meet it. The product owner then scoped the archive to 2020-2026 and
 * that plan was dropped, at which point the constant stopped describing an
 * unfinished job and started describing an unkept promise: production was telling
 * every visitor "arşiv 2006'ya doğru geriye genişletiliyor" about an expansion
 * that will not happen, and the OG card claimed "2006 — bugün" outright.
 *
 * The design artboard shows 1975 (claiming the Turkish Federated State of Cyprus
 * period) and spec 3.1 names 2006 as the source's own start. Neither is a claim we
 * can make. If backfill ever reaches further back, only this line changes.
 */
export const ARCHIVE_START_YEAR = 2020;

/** The source site — every record page links back to the original (spec 3.6). */
export const SOURCE_NAME = 'KKTC Resmî Gazete';
export const SOURCE_BASE_URL = 'https://basimevi.gov.ct.tr';

export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'iletisim@mevzuatkibris.com';

/**
 * Preview and non-production deployments are not indexed (spec 8.4).
 * Every environment other than Vercel production is noindex.
 */
export const IS_PRODUCTION_DEPLOY =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  (!process.env.NEXT_PUBLIC_VERCEL_ENV && process.env.NODE_ENV === 'production');

export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';

/** Records per page on list pages. The design's pagination is built around this value. */
export const PAGE_SIZE = 20;

/**
 * Entities per page on the index pages (/kurum, /sirket, /yer).
 *
 * Deliberately NOT PAGE_SIZE. That value is sized for record cards — a multi-line
 * block each. An index row is one name and one number, so twenty of them make a
 * page that is mostly whitespace and a pagination bar. It also matters at the other
 * end: company registry notices produce entities in the thousands, and at twenty a
 * page the hub would need hundreds of pages to reach them, which is more pagination
 * depth than a crawler will spend on a listing.
 */
export const ENTITY_INDEX_PAGE_SIZE = 60;

/**
 * The self-identifying User-Agent sent to the source site (spec 3.6).
 *
 * ASCII ONLY — not negotiable. HTTP header values are ByteStrings, i.e. at most
 * 255 per character. Putting the brand name in verbatim ("Mevzuat Kıbrıs") made
 * fetch fail before the request was even constructed:
 *
 *   TypeError: Cannot convert argument to a ByteString because the character
 *   at index 9 has a value of 305 which is greater than 255      ('ı')
 *
 * That error was caught by politeFetch's retry loop and looked like an ordinary
 * network failure; the ingest pipeline could never have sent a single request. Do
 * not wire the brand name in here — strip the accents by hand.
 */
export const CRAWLER_USER_AGENT =
  'MevzuatKibris arsiv botu (+' + SITE_URL + '/hakkinda; ' + CONTACT_EMAIL + ')';

/**
 * A PRODUCTION DEPLOY WITH A NON-HTTPS ORIGIN IS A BROKEN DEPLOY, SO FAIL LOUDLY.
 *
 * `SITE_URL` feeds every canonical, the sitemap, the RSS feeds, the OG images and
 * robots.txt's host line at once. One wrong `NEXT_PUBLIC_SITE_URL` therefore moves
 * the whole site's identity somewhere else, and nothing in the app would look
 * broken — the pages render fine, they just point at the wrong domain. That is the
 * same shape as the bug in §6.9: only machines ever request those paths, so nobody
 * notices until search engines have already acted on it.
 *
 * IT IS DELIBERATELY NOT GUARDED BY `IS_PRODUCTION_DEPLOY`. That constant is true
 * for any build with NODE_ENV=production, a local `next build` included — it is
 * written to fail SAFE for noindex, where treating an unknown environment as
 * production is the cautious direction. Here the cautious direction is the opposite
 * one: a developer running `next build` against `.env.local` has localhost in this
 * variable on purpose, and breaking that build would only teach them to delete the
 * check. Only a real Vercel production deploy can put a wrong domain in front of a
 * search engine, so only that case throws.
 *
 * It runs at module evaluation, so the deploy's build fails rather than shipping.
 */
if (process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' && !SITE_URL.startsWith('https://')) {
  throw new Error(
    'NEXT_PUBLIC_SITE_URL üretimde https:// ile başlamalı, şu an: ' +
      SITE_URL +
      '. Kanonik, sitemap, RSS ve robots.txt hepsi bu değerden türüyor.',
  );
}

export function absoluteUrl(path: string): string {
  return SITE_URL + (path.startsWith('/') ? path : '/' + path);
}
