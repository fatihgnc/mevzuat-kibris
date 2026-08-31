/**
 * Sayılara Türkçe ek getirme.
 *
 * Ek, sayının OKUNUŞUNA göre değişiyor: 2006 "iki bin altı" diye okunuyor,
 * son ünlü "ı", dolayısıyla "2006'dan". 1975 "bin dokuz yüz yetmiş beş",
 * son ünlü "e", dolayısıyla "1975'ten".
 *
 * Bu, kapsam yılı sabitten geldiği için (spec 8.4) gerekli: yıl değiştiğinde
 * eki elle düzeltmeyi unutmak, sayfada yanlış Türkçe bırakıyor. Sabit
 * "'dan" yazılmış hâli "2006'dan" için doğru ama "1975'dan" için yanlıştı.
 */

/** Rakamların okunuşundaki son ünlü. */
const DIGIT_VOWEL: Record<string, string> = {
  0: 'ı', // sıfır
  1: 'i', // bir
  2: 'i', // iki
  3: 'ü', // üç
  4: 'ö', // dört
  5: 'e', // beş
  6: 'ı', // altı
  7: 'i', // yedi
  8: 'i', // sekiz
  9: 'u', // dokuz
};

/** Onlar basamağının okunuşundaki son ünlü (birler sıfırken belirleyici). */
const TENS_VOWEL: Record<string, string> = {
  1: 'o', // on
  2: 'i', // yirmi
  3: 'u', // otuz
  4: 'ı', // kırk
  5: 'i', // elli
  6: 'ı', // altmış
  7: 'i', // yetmiş
  8: 'e', // seksen
  9: 'a', // doksan
};

const BACK = new Set(['a', 'ı', 'o', 'u']);
const VOICELESS_READING = new Set(['3', '4', '5']); // üç, dört, beş -> sert biter

/** Sayının okunuşundaki son ünlü. */
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
 * Okunuşu ünlüyle bitiyor mu: altı, yedi, iki, yirmi, elli, doksan...
 * Yönelme ekinde araya y girip girmeyeceğini belirliyor.
 */
function endsWithVowelSound(value: number): boolean {
  const digits = String(Math.abs(Math.trunc(value)));
  const ones = digits[digits.length - 1]!;

  // iki, altı, yedi ünlüyle; bir, üç, dört, beş, sekiz, dokuz ünsüzle biter.
  if (ones !== '0') return ones === '2' || ones === '6' || ones === '7';

  // yirmi, elli ünlüyle; on, otuz, kırk, altmış, yetmiş, seksen, doksan ünsüzle.
  const tens = digits[digits.length - 2];
  if (tens && tens !== '0') return tens === '2' || tens === '5';

  return false; // yüz, bin
}

/** Okunuşu sert ünsüzle bitiyor mu (üç, dört, beş, kırk, altmış, yetmiş...). */
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
 * "2006'ya", "1975'e" — yönelme hâli.
 * Okunuş ünlüyle bitiyorsa araya y giriyor: "iki bin altı" -> altı+ya.
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

/** Kapsam ifadesi: "2006'dan bugüne" — tek kaynaktan türetiliyor. */
export function coverageSince(year: number): string {
  return ablativeYear(year) + ' bugüne';
}
