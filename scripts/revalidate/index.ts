import { SITE_URL } from '../../src/lib/seo/config';

// This script never touches the database, so it has to load env itself.
import '../shared/env';
import { log } from '../shared/logger';

/**
 * Stage 8 — trigger Next.js on-demand revalidation (spec 7.1, 11.2).
 *
 * Every affected tag goes in a single request. If this call fails we do not stop
 * the ingest, but we log it loudly: the pages will refresh in the next ISR window
 * anyway, just later.
 */
/**
 * The revalidation target — env is read AT CALL TIME, not at module load.
 *
 * The `SITE_URL` constant in `seo/config.ts` reads
 * `process.env.NEXT_PUBLIC_SITE_URL` the moment it is evaluated. In scripts the
 * import chain (`crawl-archive` -> `shared/http` -> `seo/config`) evaluates that
 * module BEFORE `shared/db`, which loads dotenv. The result: the constant freezes
 * to the production domain even though `.env.local` says
 * `http://localhost:3000`.
 *
 * That is not harmless: once the domain is live, every ingest run locally would
 * hit PRODUCTION's revalidate endpoint. If the secrets match, a local experiment
 * would purge production's cache.
 *
 * The read here is independent of import order; `SITE_URL` is only a fallback for
 * when env was never provided at all.
 */
function revalidateBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  return (fromEnv ? fromEnv.replace(/\/$/, '') : SITE_URL);
}

export async function triggerRevalidate(payload: {
  topics: string[];
  entities: string[];
  issues: Array<{ year: number; number: number }>;
}): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    log.warn('REVALIDATE_SECRET yok, revalidation atlandı');
    return;
  }

  const target = revalidateBaseUrl();

  try {
    const response = await fetch(target + '/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, ...payload }),
    });

    if (!response.ok) {
      log.error('revalidation reddedildi', { status: response.status, target });
      return;
    }

    const data = (await response.json()) as { revalidated?: string[] };
    log.info('revalidation tamam', { count: data.revalidated?.length ?? 0, target });
  } catch (error) {
    // `target` is essential: a bare "fetch failed" cannot tell a network error from a wrong address.
    log.error('revalidation isteği başarısız', { message: String(error), target });
  }
}

if (process.argv[1]?.includes('revalidate')) {
  triggerRevalidate({ topics: [], entities: [], issues: [] })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
