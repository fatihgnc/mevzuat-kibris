import { foldAccents, turkishLower } from './turkish-lower';

/** Kesme işaretinin gazete metninde görülen bütün varyantları. */
const APOSTROPHES = /[\u0027\u2019\u2018\u0060\u00b4]/g;

/**
 * Türkçe uyumlu slug üretimi. ı->i, ş->s, ğ->g eşlemesi foldAccents'ten gelir;
 * NFD tabanlı genel çözümler ı harfini düşürüp "kbrs" gibi sonuçlar veriyor.
 */
export function slugify(input: string, maxLength = 80): string {
  const base = foldAccents(turkishLower(input))
    .replace(APOSTROPHES, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base.length <= maxLength) return base;

  // Sözcük ortasında kesme: son tam sözcükte dur.
  const cut = base.slice(0, maxLength);
  const lastDash = cut.lastIndexOf('-');
  return lastDash > maxLength * 0.6 ? cut.slice(0, lastDash) : cut;
}

/**
 * Kayıt slug'ı — spec 8.1: {yil}-{ref_type}-{ref_number}-{baslik-slug}
 *
 * Slug asla değişmez. Başlık sonradan düzeltilse bile üretilmiş slug korunur;
 * bu yüzden çağıran taraf veritabanında slug görünce yeniden üretmemeli.
 */
export function recordSlug(params: {
  year: number;
  refType: string | null;
  refNumber: string | null;
  title: string;
  /** Referansı olmayan kayıtlar için benzersizlik anahtarı (kayıt id'si) */
  fallbackKey?: string | number;
}): string {
  const { year, refType, refNumber, title, fallbackKey } = params;
  const refPart =
    refType && refNumber ? refType + '-' + slugify(refNumber, 24) : 'x-' + String(fallbackKey ?? '0');
  const titlePart = slugify(title, 70);
  return [String(year), refPart, titlePart].filter(Boolean).join('-');
}

/** Varlık slug'ı — kurum, şirket ve yer sayfaları için. */
export function entitySlug(name: string): string {
  return slugify(name, 70);
}
