/**
 * Attaching Turkish suffixes to numbers.
 *
 * The suffix depends on how the number is READ ALOUD: 2006 is read "iki bin altı",
 * whose last vowel is "ı", hence "2006'dan". 1975 is "bin dokuz yüz yetmiş beş",
 * whose last vowel is "e", hence "1975'ten".
 *
 * This is needed because the coverage year comes from a constant (spec 8.4):
 * forgetting to fix the suffix by hand when the year changes leaves bad Turkish on
 * the page. The hardcoded "'dan" was right for "2006'dan" but wrong for
 * "1975'dan".
 */

/** The last vowel in how a digit is read aloud. */
const DIGIT_VOWEL: Record<string, string> = {
  0: 'ı', // sıfır (zero)
  1: 'i', // bir
  2: 'i', // iki
  3: 'ü', // üç (three)
  4: 'ö', // dört (four)
  5: 'e', // beş (five)
  6: 'ı', // altı (six)
  7: 'i', // yedi
  8: 'i', // sekiz
  9: 'u', // dokuz
};

/** The last vowel in how the tens digit is read (decisive when the units digit is zero). */
const TENS_VOWEL: Record<string, string> = {
  1: 'o', // on
  2: 'i', // yirmi
  3: 'u', // otuz
  4: 'ı', // kırk (forty)
  5: 'i', // elli
  6: 'ı', // altmış (sixty)
  7: 'i', // yetmiş (seventy)
  8: 'e', // seksen
  9: 'a', // doksan
};

const BACK = new Set(['a', 'ı', 'o', 'u']);
const VOICELESS_READING = new Set(['3', '4', '5']); // üç, dört, beş -> end in a voiceless consonant

/** The last vowel in how the whole number is read. */
function lastSpokenVowel(value: number): string {
  const digits = String(Math.abs(Math.trunc(value)));
  const ones = digits[digits.length - 1]!;

  if (ones !== '0') return DIGIT_VOWEL[ones]!;

  const tens = digits[digits.length - 2];
  if (tens && tens !== '0') return TENS_VOWEL[tens]!;

  // ...100 -> "yüz", ...000 -> "bin"
  return digits.length >= 4 && digits.slice(-3) === '000' ? 'i' : 'ü';
}

/**
 * Whether the reading ends in a vowel: altı, yedi, iki, yirmi, elli, doksan...
 * This decides whether a y is inserted before the dative suffix.
 */
function endsWithVowelSound(value: number): boolean {
  const digits = String(Math.abs(Math.trunc(value)));
  const ones = digits[digits.length - 1]!;

  // iki, altı, yedi end in a vowel; bir, üç, dört, beş, sekiz, dokuz in a consonant.
  if (ones !== '0') return ones === '2' || ones === '6' || ones === '7';

  // yirmi, elli end in a vowel; on, otuz, kırk, altmış, yetmiş, seksen, doksan do not.
  const tens = digits[digits.length - 2];
  if (tens && tens !== '0') return tens === '2' || tens === '5';

  return false; // yüz, bin
}

/** Whether the reading ends in a voiceless consonant (üç, dört, beş, kırk, altmış, yetmiş...). */
function endsVoiceless(value: number): boolean {
  const digits = String(Math.abs(Math.trunc(value)));
  const ones = digits[digits.length - 1]!;

  if (ones !== '0') return VOICELESS_READING.has(ones);

  const tens = digits[digits.length - 2];
  if (tens === '4' || tens === '6' || tens === '7') return true; // kırk, altmış, yetmiş
  return false;
}

/** "2006'dan", "1975'ten" */
export function ablativeYear(year: number): string {
  const back = BACK.has(lastSpokenVowel(year));
  const consonant = endsVoiceless(year) ? 't' : 'd';
  return year + "'" + consonant + (back ? 'an' : 'en');
}

/**
 * "2006'ya", "1975'e" — the dative case.
 * If the reading ends in a vowel, a y is inserted: "iki bin altı" -> altı+ya.
 */
export function dativeYear(year: number): string {
  const vowel = lastSpokenVowel(year);
  const back = BACK.has(vowel);
  return year + "'" + (endsWithVowelSound(year) ? 'y' : '') + (back ? 'a' : 'e');
}

/** "2006'da", "1975'te" */
export function locativeYear(year: number): string {
  const back = BACK.has(lastSpokenVowel(year));
  const consonant = endsVoiceless(year) ? 't' : 'd';
  return year + "'" + consonant + (back ? 'a' : 'e');
}

/** The coverage phrase: "2006'dan bugüne" — derived from a single source. */
export function coverageSince(year: number): string {
  return ablativeYear(year) + ' bugüne';
}
