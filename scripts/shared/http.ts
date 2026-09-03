import { CRAWLER_USER_AGENT, SOURCE_BASE_URL } from '../../src/lib/seo/config';

import { log } from './logger';

/**
 * Polite access to the source site — spec 3.6.
 *
 * We never send more than one request per second, and the User-Agent identifies
 * itself and carries a contact address. This is not courtesy but a condition of
 * the product's survival: if the source site blocks access, the product stops
 * (spec 16).
 */
const MIN_INTERVAL_MS = 1000;
let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

interface FetchOptions {
  retries?: number;
  timeoutMs?: number;
}

/** Throttled fetch with exponential backoff. */
export async function politeFetch(
  url: string,
  { retries = 3, timeoutMs = 60_000 }: FetchOptions = {},
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await throttle();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': CRAWLER_USER_AGENT, 'Accept-Language': 'tr,en;q=0.8' },
        signal: controller.signal,
        redirect: 'follow',
      });

      if (response.status === 429 || response.status >= 500) {
        throw new Error('HTTP ' + response.status);
      }

      return response;
    } catch (error) {
      lastError = error;

      /*
       * A TypeError means the request itself could not be constructed (invalid
       * URL, a header that will not fit in a ByteString). Retrying does not fix
       * that; it only sends needless requests to the source site and disguises
       * the real cause as an ordinary network error. A Turkish character in
       * CRAWLER_USER_AGENT once hid in exactly this way.
       */
      if (error instanceof TypeError) throw error;

      const backoff = Math.min(30_000, 2000 * 2 ** attempt);
      log.warn('istek başarısız, yeniden denenecek', { url, attempt, backoff });
      await new Promise((resolve) => setTimeout(resolve, backoff));
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error('İstek ' + (retries + 1) + ' denemede başarısız: ' + url + ' — ' + String(lastError));
}

/**
 * URL of a year's archive page. The path is Turkish and URL-encoded:
 * https://basimevi.gov.ct.tr/ARŞİV/2025
 */
export function archiveUrl(year: number): string {
  return SOURCE_BASE_URL + '/' + encodeURIComponent('ARŞİV') + '/' + year;
}

/**
 * The second host — `/Portals/105/` PDFs do NOT live on the main site.
 *
 * MEASURED while sizing the 2006-2024 backfill. The archive pages for 2018, 2019
 * and 2020 (plus 14 issues of 2021 and 1 of 2010) link their PDFs under
 * `/Portals/105/` instead of `/Portals/6/`, and resolving those against the main
 * host returns 404 for every single one:
 *
 *   https://basimevi.gov.ct.tr/Portals/105/2018/194.pdf        404 (1.2 kB HTML)
 *   https://basimevi.gov.ct.tr/Portals/6/2018/194.pdf          404 (not a path swap)
 *   http://arsiv.basimevi.gov.ct.tr/Portals/105/2018/194.pdf   200, 22.9 MB PDF
 *
 * That is 629 issues, 14.5% of the backfill — three whole years would have come
 * back empty, and `crawlYear` would not have caught it: the archive PAGE parses
 * fine, only the PDFs are missing, so every issue would land as `failed` text.
 *
 * The rule is path-based, not a blanket host swap: `/Portals/6/` is 404 on the
 * archive host, so both hosts are needed. And it is plain HTTP — the archive host
 * serves no TLS at all (a TLS handshake to it fails outright), so upgrading the
 * scheme would break every one of these downloads.
 *
 * robots.txt on that host is the same stock DotNetNuke template as the main site,
 * `/Portals/` included — the posture recorded in HANDOFF §2.1 covers it unchanged.
 */
const ARCHIVE_HOST_BASE = 'http://arsiv.basimevi.gov.ct.tr';
const ARCHIVE_HOST_PREFIX = '/Portals/105/';

/** Turns the source site's relative links into absolute ones. */
export function absolutize(href: string): string {
  const base = href.startsWith(ARCHIVE_HOST_PREFIX) ? ARCHIVE_HOST_BASE : SOURCE_BASE_URL;

  try {
    return new URL(href, base + '/').toString();
  } catch {
    return href;
  }
}
