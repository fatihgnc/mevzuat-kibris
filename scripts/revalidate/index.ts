import { SITE_URL } from '../../src/lib/seo/config';

// Bu betik veritabanına dokunmuyor, yani env'i kendisi yüklemeli.
import '../shared/env';
import { log } from '../shared/logger';

/**
 * Aşama 8 — Next.js on-demand revalidation tetikle (spec 7.1, 11.2).
 *
 * Etkilenen tüm tag'ler tek istekte gidiyor. Bu çağrı başarısız olursa
 * ingest'i durdurmuyoruz ama gürültülü biçimde logluyoruz: sayfalar bir
 * sonraki ISR penceresinde zaten tazelenecek, sadece geç.
 */
/**
 * Revalidation hedefi — env ÇAĞRI ANINDA okunuyor, modül yüklenirken değil.
 *
 * `seo/config.ts`'teki `SITE_URL` sabiti değerlendirildiği anda
 * `process.env.NEXT_PUBLIC_SITE_URL`'i okuyor. Betiklerde import zinciri
 * (`crawl-archive` → `shared/http` → `seo/config`) o modülü, dotenv'i
 * yükleyen `shared/db`'den ÖNCE değerlendiriyor. Sonuç: `.env.local`'de
 * `http://localhost:3000` yazılı olmasına rağmen sabit üretim domainine
 * donuyor.
 *
 * Zararsız değil: domain yayına girdiğinde yerelde çalıştırılan her ingest
 * ÜRETİMİN revalidate endpoint'ini vurur. Sırlar aynıysa yerel bir deneme
 * üretimin önbelleğini temizler.
 *
 * Buradaki okuma import sırasından bağımsız; `SITE_URL` yalnızca env hiç
 * verilmemişse yedek.
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
    // `target` şart: hedefsiz "fetch failed" ağ hatası mı yanlış adres mi ayırt ettirmiyor.
    log.error('revalidation isteği başarısız', { message: String(error), target });
  }
}

if (process.argv[1]?.includes('revalidate')) {
  triggerRevalidate({ topics: [], entities: [], issues: [] })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
