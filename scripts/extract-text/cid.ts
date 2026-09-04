/**
 * Broken-font recovery for the text layer.
 *
 * Some source PDFs embed a subset font whose ToUnicode mapping cannot be used.
 * `pdftotext` prints such a character by its raw code, and the result is text
 * shifted by 29: "<$6$" is "YASA", "'(öøùø./ø." is "DEĞİŞİKLİK". That output is
 * unrecoverable in place, because a shifted character is INDISTINGUISHABLE from
 * ordinary punctuation and digits — "1983" and a shifted word look alike, and a
 * decoder that guesses damages real text. Measured on the archive, a word-level
 * decoder over pdftotext output corrupted 3,218 sound words.
 *
 * pdfminer marks the same character as "(cid:60)" instead. The marker removes
 * the ambiguity entirely, which is why extraction goes through it.
 *
 * The shift is uniform across the whole set, SPACE INCLUDED: cid 3 is 0x20.
 * Digits and punctuation shift too (cid 15 is a comma). Turkish letters fall
 * outside that range and carry their own table.
 */

const SHIFT = 29;
const SHIFT_LO = 0x03;
const SHIFT_HI = 0x5d;

/**
 * Turkish letters, DERIVED RATHER THAN GUESSED.
 *
 * Clean record titles were aligned against the same words in the shifted body,
 * and each slot was counted: İ from 772 alignments, Ş from 157, Ö from 42. A
 * first attempt guessed this table and had Ğ and Ö the wrong way round, which
 * turned "ÖĞRETMENLER" into "ĞöRETMENLER".
 *
 * Every entry sits OUTSIDE the shift range, and that is what makes the table
 * unambiguous: a code inside the range is already an ordinary shifted letter.
 */
const TURKISH = new Map<number, string>([
  [0x64, 'Ç'],
  [0x67, 'Ö'],
  [0x68, 'Ü'],
  [0xf6, 'Ğ'],
  [0xf8, 'İ'],
  [0xf9, 'Ş'],
  [0x6f, 'ç'],
  [0x7c, 'ö'],
  [0x81, 'ü'],
  [0xf7, 'ğ'],
  [0xd5, 'ı'],
  [0xfa, 'ş'],
  [0xb6, '’'],
  [0xb3, '“'],
  [0xb4, '”'],
]);

const CID = /\(cid:(\d+)\)/g;

/** One `(cid:N)` marker to the character it stands for. */
export function decodeCid(code: number): string {
  const turkish = TURKISH.get(code);
  if (turkish !== undefined) return turkish;
  if (code >= SHIFT_LO && code <= SHIFT_HI) return String.fromCharCode(code + SHIFT);
  /*
   * Unknown codes are DROPPED rather than kept as "(cid:N)". Leaving the marker
   * in place would put literal "(cid:212)" into a gazette record's body and into
   * search results; an unrecoverable character is better absent than displayed
   * as debug output. On the issue this was measured against, 7 characters out of
   * a 36-page document landed here.
   */
  return '';
}

/** Replace every `(cid:N)` in pdfminer's output. Text without markers is returned unchanged. */
export function decodeCidText(text: string): string {
  return text.replace(CID, (_match, digits: string) => decodeCid(Number(digits)));
}

/** How many markers a text still holds — for logging what a document cost. */
export function countCid(text: string): number {
  return text.match(CID)?.length ?? 0;
}
