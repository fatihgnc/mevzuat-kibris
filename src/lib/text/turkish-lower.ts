/**
 * Türkçe küçük harf tuzağı (spec 5.3).
 *
 * 'İ'.toLocaleLowerCase('tr') bazı ortamlarda `i` + U+0307 (combining dot above)
 * üretir. İki karakterli bu sonuç trigram indeksinde tek karakterli i ile eşleşmez,
 * yani "İHALE" araması "ihale" kaydını bulamaz. Birleşen noktayı açıkça düşürüyoruz.
 *
 * Aynı fonksiyon hem ingest sırasında title_normalized yazılırken hem sorgu
 * normalizasyonunda kullanılır. İkisi ayrışırsa arama sessizce bozulur.
 */
const COMBINING_DOT_ABOVE = /\u0307/g;

export function turkishLower(input: string): string {
  return input.toLocaleLowerCase('tr').replace(COMBINING_DOT_ABOVE, '');
}

export function turkishUpper(input: string): string {
  return input.toLocaleUpperCase('tr');
}

/**
 * Aksanları düşürür. Postgres tarafındaki unaccent ile aynı sonucu vermeli;
 * Türkçeye özgü harfler için açık eşleme kullanılıyor çünkü NFD ayrıştırması
 * ı ve ğ için unaccent'ten farklı davranıyor.
 */
const FOLD_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

export function foldAccents(input: string): string {
  return input.replace(/[çğıöşüâîû]/g, (ch) => FOLD_MAP[ch] ?? ch);
}

/** Arama ve karşılaştırma için tek biçim: küçük harf + aksansız + tek boşluk. */
export function normalizeForSearch(input: string): string {
  return foldAccents(turkishLower(input)).replace(/\s+/g, ' ').trim();
}

/**
 * Görüntülenmek üzere ham gazete metnini temizler: gazete dökümünde satır sonları
 * sözcük ortasında olabiliyor, çoklu boşluk sık. Orijinal karakterler korunur.
 */
export function tidyWhitespace(input: string): string {
  return input.replace(/[ \t\u00a0]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}
