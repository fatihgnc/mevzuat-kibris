import { SITE_URL } from '../../src/lib/seo/config';

import { log } from '../shared/logger';

/**
 * Aşama 8 — Next.js on-demand revalidation tetikle (spec 7.1, 11.2).
 *
 * Etkilenen tüm tag'ler tek istekte gidiyor. Bu çağrı başarısız olursa
 * ingest'i durdurmuyoruz ama gürültülü biçimde logluyoruz: sayfalar bir
 * sonraki ISR penceresinde zaten tazelenecek, sadece geç.
 */
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

  try {
    const response = await fetch(SITE_URL + '/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, ...payload }),
    });

    if (!response.ok) {
      log.error('revalidation reddedildi', { status: response.status });
      return;
    }

    const data = (await response.json()) as { revalidated?: string[] };
    log.info('revalidation tamam', { count: data.revalidated?.length ?? 0 });
  } catch (error) {
    log.error('revalidation isteği başarısız', { message: String(error) });
  }
}

if (process.argv[1]?.includes('revalidate')) {
  triggerRevalidate({ topics: [], entities: [], issues: [] })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
