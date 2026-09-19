import { turkishLower } from '@/lib/text/turkish-lower';
import type { LegislationItem } from '@/types/legislation';

/**
 * The alphabet a law list is split by.
 *
 * A law is filed under the first letter of its title. Circumflexed capitals are
 * folded onto their plain letter (a title starting with "Â" belongs under A), and
 * anything that is not a letter at all — several laws start with a year, "2020 Mali
 * Yılı Bütçe Yasası" — goes under '#'. Dotted İ and dotless I stay separate
 * letters, as they are in the Turkish alphabet.
 */
const FOLD_FIRST: Record<string, string> = { Â: 'A', Î: 'İ', Û: 'U' };

export const DIGITS_SLUG = '0-9';

export function groupLetter(title: string): string {
  const first = title.trim().charAt(0).toLocaleUpperCase('tr');
  const letter = FOLD_FIRST[first] ?? first;
  return /\p{L}/u.test(letter) ? letter : '#';
}

/**
 * The letter as it appears in a URL: lower-case, Turkish letters kept ('ş', 'ç',
 * 'ı' and 'i' are different pages). Percent-encoding is left to the router.
 */
export function letterSlug(letter: string): string {
  return letter === '#' ? DIGITS_SLUG : turkishLower(letter);
}

export interface LetterGroup {
  letter: string;
  slug: string;
  items: LegislationItem[];
}

/** '#' first, then the Turkish alphabet order (Ç after C, Ş after S...). */
export function groupByLetter(items: LegislationItem[]): LetterGroup[] {
  const groups = new Map<string, LegislationItem[]>();

  for (const item of items) {
    const letter = groupLetter(item.title);
    const list = groups.get(letter);
    if (list) list.push(item);
    else groups.set(letter, [item]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b, 'tr')))
    .map(([letter, list]) => ({ letter, slug: letterSlug(letter), items: list }));
}
