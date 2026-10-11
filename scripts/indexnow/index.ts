// This script never touches the database on its own, so it has to load env itself.
import '../shared/env';
import { log } from '../shared/logger';

/**
 * IndexNow — tells Bing (and Yandex, Seznam, Naver, which share the protocol)
 * which URLs changed, instead of waiting for their crawlers to find out. Google
 * does not take part; it keeps reading the sitemap.
 *
 * The key is not a secret: the protocol proves ownership by serving it at
 * `/<key>.txt` on the same host (public/d5c5592f31605f05a86e9e82523697b3.txt).
 * Rotating it means replacing both that file and this constant.
 *
 * A failure here is logged and swallowed, like revalidation: the crawlers still
 * find the pages through the sitemap, only later.
 */
const KEY = 'd5c5592f31605f05a86e9e82523697b3';
const PRODUCTION_HOST = 'mevzuatkibris.com';
const ENDPOINT = 'https://api.indexnow.org/indexnow';

/** The protocol's per-request ceiling. */
const MAX_URLS = 10_000;

export async function submitIndexNow(paths: string[]): Promise<void> {
  if (process.env.INDEXNOW === 'off') return;

  /*
   * Read at call time for the same reason as `revalidateBaseUrl` in
   * scripts/revalidate: the SITE_URL constant can freeze before env loads. And
   * only production submits — a local run pointed at localhost has nothing a
   * search engine should hear about, and the endpoint would reject the host anyway.
   */
  const base = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  let host: string;
  try {
    host = new URL(base).host;
  } catch {
    log.warn('indexnow atlandı: NEXT_PUBLIC_SITE_URL yok');
    return;
  }
  if (host !== PRODUCTION_HOST) {
    log.info('indexnow atlandı: production değil', { host });
    return;
  }

  const urlList = [...new Set(paths)].map((path) => base + path).slice(0, MAX_URLS);
  if (urlList.length === 0) return;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host,
        key: KEY,
        keyLocation: base + '/' + KEY + '.txt',
        urlList,
      }),
    });

    // 200 and 202 both mean accepted; 202 is "key validation pending" on first use.
    if (response.status !== 200 && response.status !== 202) {
      log.error('indexnow reddedildi', { status: response.status, body: await response.text() });
      return;
    }
    log.info('indexnow tamam', { count: urlList.length, status: response.status });
  } catch (error) {
    log.error('indexnow isteği başarısız', { message: String(error) });
  }
}

// Matched on the script path itself, not a substring: an importer whose own file
// name contains "indexnow" would otherwise also fire this block with its own argv.
if (/[\\/]indexnow([\\/]index\.ts)?$/.test(process.argv[1] ?? '')) {
  // Manual use: `npx tsx scripts/indexnow /karar/slug /sayilar/2026/202`
  submitIndexNow(process.argv.slice(2))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
