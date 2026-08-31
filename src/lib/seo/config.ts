/**
 * Marka, domain ve kapsam için TEK kaynak (spec 8.4).
 *
 * Hiçbir bileşen marka adını, domaini ya da arşiv başlangıç yılını sabit metin
 * olarak yazmaz. Kapsam iddiası sayfadan sayfaya değişirse, kullanıcı kapsam dışı
 * bir yılı aratıp boş sonuç aldığında güven tek seferde biter.
 */

export const SITE_NAME = 'Mevzuat Kıbrıs';
export const SITE_TAGLINE = 'KKTC Resmî Gazete arama ve takip';
export const SITE_KICKER = 'bağımsız arşiv';

/** Preview deployment'larda kendi origin'ini kullan; canonical üretimi buradan tek noktadan akar. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://mevzuatkibris.com'
).replace(/\/$/, '');

/**
 * Arşivin başladığı yıl.
 *
 * DİKKAT — tasarım artboard'ı bu değeri 1975 olarak gösteriyor (Kıbrıs Türk Federe
 * Devleti dönemi dahil iddiasıyla). Spec 3.1 ise kaynak arşivin basimevi.gov.ct.tr
 * üzerinde 2006'dan itibaren yayımlandığını söylüyor ve spec 8.4 kapsam yılının
 * gerçeğe uygun olmasını açıkça şart koşuyor. Elimizde 2006 öncesi veri yok, o yüzden
 * 2006 yazıyor. Backfill daha geriye giderse yalnızca bu satır değişir; bütün sayfalar,
 * arama boş-sonuç mesajı ve ana sayfa metni buradan besleniyor.
 */
export const ARCHIVE_START_YEAR = 2006;

/** Kaynak site — her kayıt sayfasında orijinale link verilir (spec 3.6). */
export const SOURCE_NAME = 'KKTC Resmî Gazete';
export const SOURCE_BASE_URL = 'https://basimevi.gov.ct.tr';

export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'iletisim@mevzuatkibris.com';

/**
 * Preview ve non-production deployment'lar indekslenmez (spec 8.4).
 * Vercel production dışındaki her ortam noindex.
 */
export const IS_PRODUCTION_DEPLOY =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  (!process.env.NEXT_PUBLIC_VERCEL_ENV && process.env.NODE_ENV === 'production');

export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || '';

/** Liste sayfalarında sayfa başına kayıt. Tasarımdaki sayfalama bu değere göre. */
export const PAGE_SIZE = 20;

/**
 * Kaynak siteye kendini tanıtan User-Agent (spec 3.6).
 *
 * SADECE ASCII — pazarlık konusu değil. HTTP başlık değerleri ByteString, yani
 * karakter başına en fazla 255. Marka adı olduğu gibi konunca ("Mevzuat Kıbrıs")
 * fetch daha isteği kurmadan patlıyordu:
 *
 *   TypeError: Cannot convert argument to a ByteString because the character
 *   at index 9 has a value of 305 which is greater than 255      ('ı')
 *
 * Bu hata politeFetch'in yeniden deneme döngüsüne yakalanıp sıradan bir ağ
 * hatası gibi görünüyordu; yani ingest boru hattı hiçbir zaman tek bir istek
 * bile atamazdı. Marka adını buraya bağlama, aksanları elle düşür.
 */
export const CRAWLER_USER_AGENT =
  'MevzuatKibris arsiv botu (+' + SITE_URL + '/hakkinda; ' + CONTACT_EMAIL + ')';

export function absoluteUrl(path: string): string {
  return SITE_URL + (path.startsWith('/') ? path : '/' + path);
}
