import { CRAWLER_USER_AGENT, SOURCE_BASE_URL } from '../../src/lib/seo/config';

import { log } from './logger';

/**
 * Kaynak siteye nazik erişim — spec 3.6.
 *
 * Saniyede birden fazla istek göndermiyoruz ve User-Agent kendini tanıtıp
 * iletişim adresi içeriyor. Bu bir kibarlık değil, ürünün devam edebilmesinin
 * şartı: kaynak site erişimi engellerse ürün durur (spec 16).
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

/** Üstel geri çekilmeli, throttle'lı fetch. */
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
 * Yıl arşiv sayfasının URL'i. Yol Türkçe ve URL-encoded:
 * https://basimevi.gov.ct.tr/ARŞİV/2025
 */
export function archiveUrl(year: number): string {
  return SOURCE_BASE_URL + '/' + encodeURIComponent('ARŞİV') + '/' + year;
}

/** Kaynak sitenin göreli bağlantılarını mutlak hâle getirir. */
export function absolutize(href: string): string {
  try {
    return new URL(href, SOURCE_BASE_URL + '/').toString();
  } catch {
    return href;
  }
}
