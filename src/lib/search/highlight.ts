import type { Token, TokenLevel } from '@/types/record';
import { normalizeForSearch } from '@/lib/text/turkish-lower';

/**
 * Highlighting — spec 5.4 step 6 and artboard 1b.
 *
 * We give ts_headline our own delimiters instead of HTML. The chance of hitting a
 * string like <b> inside gazette text is not zero, and parsing HTML would require
 * dangerouslySetInnerHTML; producing tokens with a control character plus split
 * is both safe and an exact fit for the design's token model.
 */
export const HEADLINE_START = '\u0001';
export const HEADLINE_STOP = '\u0002';

export const HEADLINE_OPTIONS = [
  'StartSel=' + HEADLINE_START,
  'StopSel=' + HEADLINE_STOP,
  'MaxWords=40',
  'MinWords=20',
  'ShortWord=3',
  'MaxFragments=1',
].join(', ');

/**
 * Splits ts_headline output into tokens. Matching fragments get level 3 (yellow
 * background), the rest get the excerpt level. There is no masking in an excerpt:
 * body text must stay readable, and only the match should stand out.
 */
export function parseHeadline(headline: string | null | undefined): Token[] | null {
  if (!headline) return null;

  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < headline.length) {
    const start = headline.indexOf(HEADLINE_START, cursor);
    if (start === -1) {
      tokens.push({ t: headline.slice(cursor), lvl: 0 });
      break;
    }

    if (start > cursor) tokens.push({ t: headline.slice(cursor, start), lvl: 0 });

    const stop = headline.indexOf(HEADLINE_STOP, start);
    if (stop === -1) {
      tokens.push({ t: headline.slice(start + 1), lvl: 3 });
      break;
    }

    tokens.push({ t: headline.slice(start + 1, stop), lvl: 3 });
    cursor = stop + 1;
  }

  const cleaned = tokens.filter((token) => token.t.length > 0);
  return cleaned.length ? cleaned : null;
}

/**
 * Overlays the search match onto a masked title.
 *
 * The mask level is not preserved; a matching fragment becomes level 3. In the
 * design the yellow background is always on top, because seeing where the thing
 * you searched for occurs matters more than the boilerplate/distinctive
 * distinction.
 */
export function overlayMatches(tokens: Token[], query: string): Token[] {
  const terms = matchTerms(query);
  if (!terms.length) return tokens;

  const out: Token[] = [];

  for (const token of tokens) {
    const ranges = findRanges(token.t, terms);
    if (!ranges.length) {
      out.push(token);
      continue;
    }

    let cursor = 0;
    for (const [start, end] of ranges) {
      if (start > cursor) out.push({ t: token.t.slice(cursor, start), lvl: token.lvl });
      out.push({ t: token.t.slice(start, end), lvl: 3 });
      cursor = end;
    }
    if (cursor < token.t.length) out.push({ t: token.t.slice(cursor), lvl: token.lvl });
  }

  return out;
}

/**
 * Searchable terms. Quoted phrases stay whole, everything else goes word by
 * word. Words shorter than three letters are dropped: highlighting conjunctions
 * like "ve" or "bir" makes the line unreadable.
 */
function matchTerms(query: string): string[] {
  const terms: string[] = [];
  const quoted = query.match(/"([^"]+)"/g) ?? [];

  for (const phrase of quoted) {
    const value = normalizeForSearch(phrase.slice(1, -1));
    if (value.length >= 2) terms.push(value);
  }

  const rest = normalizeForSearch(query.replace(/"[^"]+"/g, ' '));
  for (const word of rest.split(' ')) {
    if (word.length >= 3 && !word.startsWith('-')) terms.push(word);
  }

  return terms.sort((a, b) => b.length - a.length);
}

const COMBINING_DOT_ABOVE = /\u0307/g;

const FOLD: Record<string, string> = {
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

/**
 * Lowercase and strip accents without changing the length.
 *
 * normalizeForSearch also collapses whitespace, which shifts indices and makes it
 * unusable here — highlight ranges have to line up with indices into the original
 * text. The combining dot is replaced by a space (not removed) so the character
 * count stays fixed.
 */
function foldPreservingLength(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(COMBINING_DOT_ABOVE, ' ')
    .replace(/[çğıöşüâîû]/g, (ch) => FOLD[ch] ?? ch);
}

/** Finds the match ranges; the indices refer to the original text. */
function findRanges(text: string, terms: string[]): Array<[number, number]> {
  const haystack = foldPreservingLength(text);
  const ranges: Array<[number, number]> = [];

  for (const term of terms) {
    let from = 0;
    for (;;) {
      const index = haystack.indexOf(term, from);
      if (index === -1) break;

      // At a word start — searching "ihale" must not highlight inside "muhalefet".
      const before = index === 0 ? ' ' : (haystack[index - 1] ?? ' ');
      if (/[a-z0-9]/.test(before)) {
        from = index + 1;
        continue;
      }

      ranges.push([index, index + term.length]);
      from = index + term.length;
    }
  }

  if (!ranges.length) return ranges;

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [ranges[0]!];
  for (const range of ranges.slice(1)) {
    const last = merged[merged.length - 1]!;
    if (range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push(range);
    }
  }
  return merged;
}

/**
 * Maps a token level to a class name.
 *
 * The classes are written out IN FULL; they are not composed as 'tok-' + level.
 * Tailwind's content scan looks for the class name verbatim in the source files,
 * cannot see dynamically composed names, and strips those rules. That is why the
 * masking never appeared on the page at all: every token rendered at the same
 * weight.
 */
/*
 * Level 0 used to be `text-ink-placeholder`: 2.2:1 on white, i.e. unreadable.
 * Boilerplate words should recede, but they are TEXT, and all text has to be
 * readable. When a title counted as entirely boilerplate ("SÖZLEŞMELİ PERSONEL")
 * dropped to that colour, the whole line disappeared.
 *
 * The distinction is now carried by WEIGHT more than colour: between 0 and 1
 * there is a font-light / font-semibold difference, and both are in a readable
 * tone.
 */
const MASK_CLASS: Record<TokenLevel, string> = {
  0: 'font-light text-ink-fainter', // boilerplate — 4.9:1
  1: 'font-semibold text-ink', //          distinctive
  2: 'font-normal text-ink-muted', //      ara bilgi
  3: 'rounded-sm bg-mark font-semibold text-ink', // search match
};

/** No masking in an excerpt; only the match is highlighted. */
const QUOTE_CLASS: Record<TokenLevel, string> = {
  0: 'font-normal text-ink-muted',
  1: 'font-normal text-ink-muted',
  2: 'font-normal text-ink-muted',
  3: 'rounded-sm bg-mark font-semibold text-ink',
};

export function tokenClass(level: TokenLevel, variant: 'mask' | 'quote' = 'mask'): string {
  return variant === 'quote' ? QUOTE_CLASS[level] : MASK_CLASS[level];
}
