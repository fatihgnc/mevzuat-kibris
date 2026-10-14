import { normalizeForSearch } from '@/lib/text/turkish-lower';

/**
 * The search box on /yasa and /tuzuk. Every law is already on the page, so the
 * filter runs in the browser over titles and numbers; nothing is fetched.
 *
 * A law matches when EVERY word of the query starts a word of its title or number
 * ("iş yas" finds "İş Yasası", "fasıl 154" finds Cap. 154). Words are matched at
 * a word start only: "ihale" must not find "muhalefet", and "5/2015" must not find
 * "15/2015". Accents and Turkish case are folded on both sides, so "is yasasi"
 * finds it too.
 */

export interface Searchable {
  title: string;
  ref: string | null;
}

/** The text a law is searched by, folded once up front rather than on every keystroke. */
export function searchText(item: Searchable): string {
  return normalizeForSearch(item.title + (item.ref ? ' ' + item.ref : ''));
}

export function queryTerms(query: string): string[] {
  const normalized = normalizeForSearch(query);
  return normalized ? normalized.split(' ') : [];
}

function startsWord(haystack: string, term: string): boolean {
  for (let from = 0; ; ) {
    const index = haystack.indexOf(term, from);
    if (index === -1) return false;
    if (index === 0 || !/[a-z0-9]/.test(haystack[index - 1] ?? '')) return true;
    from = index + 1;
  }
}

export function matchesTerms(haystack: string, terms: string[]): boolean {
  return terms.every((term) => startsWord(haystack, term));
}

/**
 * The matching items, those whose title begins with the whole query first (a
 * reader typing "vergi" most likely wants "Vergi Usul Yasası", not every law that
 * mentions a tax). Otherwise the input order, which is the alphabetical list order.
 */
export function filterLegislation<T extends Searchable>(
  items: Array<{ item: T; text: string }>,
  query: string,
): T[] {
  const terms = queryTerms(query);
  if (!terms.length) return [];

  const whole = terms.join(' ');
  const leading: T[] = [];
  const rest: T[] = [];

  for (const { item, text } of items) {
    if (!matchesTerms(text, terms)) continue;
    (text.startsWith(whole) ? leading : rest).push(item);
  }

  return [...leading, ...rest];
}
