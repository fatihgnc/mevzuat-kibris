/**
 * The Turkish lowercase trap (spec 5.3).
 *
 * In some environments 'İ'.toLocaleLowerCase('tr') produces `i` + U+0307
 * (combining dot above). That two-character result does not match a
 * single-character i in the trigram index, so searching "İHALE" fails to find an
 * "ihale" record. We drop the combining dot explicitly.
 *
 * The same function is used both when writing title_normalized during ingest and
 * when normalising a query. If the two diverge, search breaks silently.
 */
const COMBINING_DOT_ABOVE = /\u0307/g;

export function turkishLower(input: string): string {
  return input.toLocaleLowerCase('tr').replace(COMBINING_DOT_ABOVE, '');
}

export function turkishUpper(input: string): string {
  return input.toLocaleUpperCase('tr');
}

/**
 * Strips accents. It must produce the same result as unaccent on the Postgres
 * side; an explicit mapping is used for the Turkish-specific letters, because NFD
 * decomposition behaves differently from unaccent for ı and ğ.
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

/** One canonical form for search and comparison: lowercase + unaccented + single spaces. */
export function normalizeForSearch(input: string): string {
  return foldAccents(turkishLower(input)).replace(/\s+/g, ' ').trim();
}

/**
 * Cleans raw gazette text for display: in the gazette dump, line breaks can fall
 * mid-word and multiple spaces are common. The original characters are preserved.
 */
export function tidyWhitespace(input: string): string {
  return input.replace(/[ \t\u00a0]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}
