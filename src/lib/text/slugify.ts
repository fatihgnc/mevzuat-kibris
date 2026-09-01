import { foldAccents, turkishLower } from './turkish-lower';

/** Every apostrophe variant seen in gazette text. */
const APOSTROPHES = /[\u0027\u2019\u2018\u0060\u00b4]/g;

/**
 * Turkish-aware slug generation. The ı->i, ş->s, ğ->g mapping comes from
 * foldAccents; generic NFD-based solutions drop the ı entirely and produce
 * results like "kbrs".
 */
export function slugify(input: string, maxLength = 80): string {
  const base = foldAccents(turkishLower(input))
    .replace(APOSTROPHES, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base.length <= maxLength) return base;

  // Cut in the middle of a word: stop at the last whole word.
  const cut = base.slice(0, maxLength);
  const lastDash = cut.lastIndexOf('-');
  return lastDash > maxLength * 0.6 ? cut.slice(0, lastDash) : cut;
}

/**
 * The record slug — spec 8.1: {year}-{ref_type}-{ref_number}-{title-slug}
 *
 * A slug never changes. Even if the title is corrected later, the slug already
 * generated is preserved; so a caller that sees a slug in the database must not
 * regenerate it.
 */
export function recordSlug(params: {
  year: number;
  refType: string | null;
  refNumber: string | null;
  title: string;
  /** Uniqueness key for records with no reference (the record id) */
  fallbackKey?: string | number;
}): string {
  const { year, refType, refNumber, title, fallbackKey } = params;
  const refPart =
    refType && refNumber ? refType + '-' + slugify(refNumber, 24) : 'x-' + String(fallbackKey ?? '0');
  const titlePart = slugify(title, 70);
  return [String(year), refPart, titlePart].filter(Boolean).join('-');
}

/** The entity slug — for institution, company and place pages. */
export function entitySlug(name: string): string {
  return slugify(name, 70);
}
