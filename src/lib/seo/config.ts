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
 * CAUTION — the design artboard shows this as 1975 (claiming to include the
 * Turkish Federated State of Cyprus period). Spec 3.1, however, says the source
 * archive has been published on basimevi.gov.ct.tr from 2006 onward, and spec 8.4
 * explicitly requires the coverage year to be truthful. We hold no pre-2006 data,
 * so it says 2006. If backfill reaches further back, only this line changes; every
 * page, the empty-search message and the home page copy all feed from here.
 */
export const ARCHIVE_START_YEAR = 2006;

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

export function absoluteUrl(path: string): string {
  return SITE_URL + (path.startsWith('/') ? path : '/' + path);
}
