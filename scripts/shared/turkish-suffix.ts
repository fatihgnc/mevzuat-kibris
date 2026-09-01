import { turkishLower } from '../../src/lib/text/turkish-lower';

/**
 * Turkish suffix harmony — for summary sentence generation (spec 3.8).
 *
 * Summary sentences contain suffixed proper nouns such as "Toronto Rent A Car
 * Ltd'in", "Vadili'de", "Girne'de". When the suffix is wrong the sentence reads
 * as machine-generated and weakens the product's promise of a readable summary.
 * We apply vowel harmony and voiceless-consonant assimilation.
 *
 * On proper nouns the suffix is separated by an apostrophe (per TDK):
 * Vadili'de, Ltd'in.
 */

const BACK_VOWELS = new Set(['a', 'ı', 'o', 'u']);
const FRONT_VOWELS = new Set(['e', 'i', 'ö', 'ü']);
const ROUNDED = new Set(['o', 'u', 'ö', 'ü']);
const VOWELS = new Set([...BACK_VOWELS, ...FRONT_VOWELS]);

/** Voiceless consonants — the locative suffix takes t instead of d after these. */
const VOICELESS = new Set(['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p']);

/**
 * Vowel harmony follows the LAST WORD, not the whole phrase.
 *
 * For "Toronto Rent A Car Ltd", scanning the whole string backwards would find
 * the a in "Car" and produce "Ltd'ın". The correct form is "Ltd'in": the suffix
 * attaches to the last word and harmonises with how that word is pronounced.
 */
function lastWord(name: string): string {
  const parts = name.trim().split(/[\s\-–—]+/).filter(Boolean);
  return parts[parts.length - 1] ?? name;
}

/**
 * Abbreviations with no vowel take their suffix from how they are pronounced:
 * "Ltd" is read as "limited", so it takes a front-vowel suffix. Anything not in
 * the list is assumed front — most Turkish abbreviations are spelled out letter
 * by letter, and most letter names are front ("be", "ce", "de", "ef").
 */
const ABBREVIATION_VOWEL: Record<string, string> = {
  ltd: 'e',
  'a.ş.': 'e',
  as: 'e',
  kktc: 'e',
  kdv: 'e',
  tc: 'e',
};

function lastVowel(name: string): string | null {
  const word = turkishLower(lastWord(name));

  for (let i = word.length - 1; i >= 0; i -= 1) {
    const ch = word[i]!;
    if (VOWELS.has(ch)) return ch;
  }

  return ABBREVIATION_VOWEL[word.replace(/[^a-zçğıöşü.]/g, '')] ?? null;
}

function lastLetter(name: string): string {
  const lower = turkishLower(lastWord(name)).replace(/[^a-zçğıöşü]/g, '');
  return lower[lower.length - 1] ?? '';
}

/**
 * Genitive: -in / -ın / -un / -ün, with an inserted n after a vowel.
 * "Toronto Rent A Car Ltd" -> "Toronto Rent A Car Ltd'in"
 */
export function genitive(name: string): string {
  const vowel = lastVowel(name);
  const endsWithVowel = VOWELS.has(lastLetter(name));

  let suffix: string;
  if (vowel === null) {
    // Abbreviation with unknown pronunciation: front vowel is the default (see ABBREVIATION_VOWEL).
    suffix = 'in';
  } else if (BACK_VOWELS.has(vowel)) {
    suffix = ROUNDED.has(vowel) ? 'un' : 'ın';
  } else {
    suffix = ROUNDED.has(vowel) ? 'ün' : 'in';
  }

  return name + "'" + (endsWithVowel ? 'n' : '') + suffix;
}

/**
 * Locative: -de / -da / -te / -ta.
 * "Vadili" -> "Vadili'de", "Alayköy" -> "Alayköy'de", "Haspolat" -> "Haspolat'ta"
 */
export function locative(name: string): string {
  const vowel = lastVowel(name);
  const voiceless = VOICELESS.has(lastLetter(name));
  const consonant = voiceless ? 't' : 'd';
  const back = vowel === null ? false : BACK_VOWELS.has(vowel);

  return name + "'" + consonant + (back ? 'a' : 'e');
}

/**
 * Dative: -e / -a / -ye / -ya.
 * "Fiyat İstikrar Fonu" -> "Fiyat İstikrar Fonu'na"
 */
export function dative(name: string): string {
  const vowel = lastVowel(name);
  const endsWithVowel = VOWELS.has(lastLetter(name));
  const back = vowel === null ? false : BACK_VOWELS.has(vowel);

  return name + "'" + (endsWithVowel ? 'n' : '') + (back ? 'a' : 'e');
}

/**
 * Accusative: -i / -ı / -u / -ü, with an inserted y after a vowel.
 * "Vadili" -> "Vadili'yi"
 */
export function accusative(name: string): string {
  const vowel = lastVowel(name);
  const endsWithVowel = VOWELS.has(lastLetter(name));

  let suffix: string;
  if (vowel === null) suffix = 'i';
  else if (BACK_VOWELS.has(vowel)) suffix = ROUNDED.has(vowel) ? 'u' : 'ı';
  else suffix = ROUNDED.has(vowel) ? 'ü' : 'i';

  return name + "'" + (endsWithVowel ? 'y' : '') + suffix;
}

/**
 * Ablative on a noun that already carries a possessive: -nden / -ndan.
 * "tüketim maddeleri" -> "tüketim maddelerinden"
 */
export function ablativeFromPossessive(name: string): string {
  const vowel = lastVowel(name);
  const back = vowel === null ? false : BACK_VOWELS.has(vowel);
  return name + (back ? 'ndan' : 'nden');
}

/**
 * Makes ALL-CAPS source text readable.
 *
 * Gazette titles are entirely uppercase. Capitalising the first letter of every
 * word also capitalises conjunctions like "Ve" and "İle" and makes them look
 * like proper nouns; we leave conjunctions lowercase. Text that is already mixed
 * case is left alone.
 */
const LOWERCASE_WORDS = new Set([
  've',
  'ile',
  'veya',
  'ya',
  'da',
  'de',
  'ki',
  'ise',
  'için',
  'olarak',
  'bir',
]);

/**
 * Company type abbreviations are written like words, not like abbreviations:
 * "Toronto Rent A Car Ltd", not "TORONTO RENT A CAR LTD".
 */
const COMPANY_SUFFIXES: Record<string, string> = {
  ltd: 'Ltd',
  'ltd.': 'Ltd.',
  limited: 'Limited',
  'limited.': 'Limited.',
  co: 'Co',
  'co.': 'Co.',
  inc: 'Inc',
  'inc.': 'Inc.',
};

/** A word with no vowel is an abbreviation (KKTC, KDV, TC). It stays uppercase. */
function isAcronym(word: string): boolean {
  const letters = turkishLower(word).replace(/[^a-zçğıöşü]/g, '');
  if (!letters) return false;
  return ![...letters].some((ch) => VOWELS.has(ch));
}

/**
 * Turkish or foreign — the ONLY ambiguity when lowercasing is the capital I.
 *
 * In Turkish, I -> ı and İ -> i. In foreign words I must become i. Because the
 * source text is entirely uppercase, the word itself cannot settle it:
 * "ASLIHAN" is Turkish (Aslıhan) and "NICOSIA" is foreign (Nicosia), and both
 * contain only a plain I.
 *
 * The decision is made PER PHRASE, NOT PER WORD: if a distinctively Turkish
 * letter (ç ğ İ ö ş ü) appears anywhere in the phrase, the whole phrase counts
 * as Turkish. On the company registry this distinction works cleanly:
 *
 *   "KIBRIS TÜRK ELEKTRİK KURUMU"      -> has Ü, İ  -> Kıbrıs Türk Elektrik Kurumu
 *   "NICOSIA LANGUAGE CENTRE LIMITED"  -> none      -> Nicosia Language Centre Limited
 *   "HASPOLAT GIDA SANAYİ LTD"         -> has İ     -> Haspolat Gıda Sanayi Ltd
 *
 * Done per word, "KIBRIS" on its own would count as foreign and come out as
 * "Kibris"; per phrase it comes out right.
 */
const TURKISH_MARKERS = /[ÇĞİÖŞÜçğiöşü]/;

function looksTurkish(phrase: string): boolean {
  return TURKISH_MARKERS.test(phrase);
}

export function titleCase(input: string): string {
  const text = input.trim().replace(/\s+/g, ' ');

  // Already mixed case — leave it alone.
  if (text !== text.toLocaleUpperCase('tr')) return text;

  const turkish = looksTurkish(text);
  const toLower = (value: string) => (turkish ? turkishLower(value) : value.toLowerCase());
  const toUpperFirst = (value: string) =>
    turkish ? value.toLocaleUpperCase('tr') : value.toUpperCase();

  return text
    .split(' ')
    .map((word, index) => {
      const lower = toLower(word);

      if (index > 0 && LOWERCASE_WORDS.has(turkishLower(word))) return lower;

      const companySuffix = COMPANY_SUFFIXES[turkishLower(word)];
      if (companySuffix) return companySuffix;

      if (isAcronym(word)) return word;

      return toUpperFirst(lower.charAt(0)) + lower.slice(1);
    })
    .join(' ');
}
