import { turkishLower, turkishUpper } from './turkish-lower';

/** Words a Turkish title keeps in lowercase unless they open it. */
const SMALL_WORDS = new Set(['ve', 'ile', 'veya', 'ya', 'da', 'de', 'için', 'ait', 'ilişkin', 'gibi']);

/**
 * "TAPU VE KADASTRO DAİRESİ (KURULUŞ, GÖREV VE ÇALIŞMA ESASLARI) YASASI" ->
 * "Tapu ve Kadastro Dairesi (Kuruluş, Görev ve Çalışma Esasları) Yasası".
 *
 * For the gazette's SHOUTED law titles only, so a search result reads like the name
 * people type. Abbreviations and Roman numerals are not handled (a title with those is
 * better left as it is), and a suffix after an apostrophe stays lowercase.
 */
export function titleCaseTr(input: string): string {
  const words = input.replace(/\s+/g, ' ').trim().split(' ');

  return words
    .map((word, index) => {
      const lower = turkishLower(word);
      const letter = lower.search(/\p{L}/u);
      if (letter === -1) return lower;

      const bare = lower.replace(/[^\p{L}]/gu, '');
      if (index > 0 && SMALL_WORDS.has(bare)) return lower;

      return lower.slice(0, letter) + turkishUpper(lower.charAt(letter)) + lower.slice(letter + 1);
    })
    .join(' ');
}
