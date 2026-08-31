import { config as loadEnv } from 'dotenv';

/*
 * Betikler için env yükleme — TEK kaynak.
 *
 * Next.js .env.local'i kendisi okuyor ama tsx ile çalışan scriptler okumuyor.
 * Aynı dosyadan beslenmezlerse "uygulamada çalışıyor, ingest'te çalışmıyor"
 * sınıfında bir hata çıkıyor. Öncelik Next ile aynı: .env.local > .env
 *
 * Neden ayrı dosya: bu yükleme eskiden `shared/db.ts` içindeydi ve env'in
 * yüklenmesi o modülü import etmeye BAĞLIYDI. Veritabanına dokunmayan
 * betikler (`scripts/revalidate`) env'siz kalıyordu — `npm run revalidate`
 * bu yüzden hiç çalışmamıştı, her seferinde "REVALIDATE_SECRET yok" deyip
 * sessizce çıkıyordu.
 *
 * DİKKAT — import sırası. `src/lib/seo/config.ts` gibi modüller env'i
 * DEĞERLENDİRİLDİKLERİ anda okuyup sabite donduruyor. Bir betik hem böyle bir
 * modülü hem bunu import ediyorsa, bunun ÖNCE değerlendiğine güvenme: ESM
 * import sırası dosyadaki yazım sırasına bağlı ve linter onu yeniden
 * sıralayabilir. Env'e bağlı değeri sabitten değil, kullanım anında
 * `process.env`'den oku (örnek: `scripts/revalidate` → `revalidateBaseUrl`).
 */
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });
