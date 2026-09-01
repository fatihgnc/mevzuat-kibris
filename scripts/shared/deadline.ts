/**
 * Application deadline extraction — spec 3.9.
 *
 * Used in two places, both of which matter:
 *   1. Product: the "applications open" filter in the /konu/munhal flow, and a
 *      highlighted deadline on every record. That is the segment's real question.
 *   2. SEO: the mandatory validThrough field of JobPosting structured data.
 *
 * IF IT IS AMBIGUOUS THE FIELD IS LEFT EMPTY, NEVER GUESSED. A wrong deadline is
 * far more harmful than no deadline: the user loses their right to apply.
 */

const MONTHS: Record<string, number> = {
  ocak: 1,
  şubat: 2,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayıs: 5,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  ağustos: 8,
  agustos: 8,
  eylül: 9,
  eylul: 9,
  ekim: 10,
  kasım: 11,
  kasim: 11,
  aralık: 12,
  aralik: 12,
};

/** Phrases that signal a deadline; the date is looked for near one of these. */
const CUES = [
  'son başvuru',
  'başvuru süresi',
  'başvurular',
  'müracaatlar',
  'müracaat süresi',
  'başvuru tarihi',
  'son müracaat',
  'teklifler',
  'ihale tarihi',
];

const CUE_WINDOW = 160;

/** "26 Ocak 2026" ya da "26.01.2026" / "26/01/2026" */
const DATE_PATTERNS = [
  /(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/g,
  /(\d{1,2})[./](\d{1,2})[./](\d{4})/g,
];

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

interface Found {
  iso: string;
  index: number;
}

function findDates(text: string): Found[] {
  const found: Found[] = [];

  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const day = Number(match[1]);
      const rawMonth = match[2]!;
      const year = Number(match[3]);

      const month = /^\d+$/.test(rawMonth)
        ? Number(rawMonth)
        : MONTHS[rawMonth.toLocaleLowerCase('tr')];

      if (month === undefined) continue;

      const iso = toIso(year, month, day);
      if (iso) found.push({ iso, index: match.index });
    }
  }

  return found;
}

export interface DeadlineResult {
  deadlineAt: string | null;
  /** Extra context such as "Yazılı sınav 14 Şubat 2026, altı kadro" */
  note: string | null;
}

/**
 * Extracts the application deadline from the body text.
 *
 * Method: take the date nearest an occurrence of a cue phrase. If there are
 * several candidates and they are not all the same, the field is left empty — we
 * do not guess when we do not know which one is right.
 */
export function extractDeadline(bodyText: string | null): DeadlineResult {
  if (!bodyText) return { deadlineAt: null, note: null };

  const text = bodyText.replace(/\s+/g, ' ');
  const lower = text.toLocaleLowerCase('tr');
  const dates = findDates(text);
  if (!dates.length) return { deadlineAt: null, note: null };

  const candidates = new Set<string>();

  for (const cue of CUES) {
    let from = 0;
    for (;;) {
      const cueIndex = lower.indexOf(cue, from);
      if (cueIndex === -1) break;

      for (const date of dates) {
        if (Math.abs(date.index - cueIndex) <= CUE_WINDOW) candidates.add(date.iso);
      }

      from = cueIndex + cue.length;
    }
  }

  if (candidates.size !== 1) {
    // Zero candidates: no cue. Several differing candidates: which one is unclear.
    // In both cases we leave it empty (spec 3.9).
    return { deadlineAt: null, note: extractNote(text) };
  }

  return { deadlineAt: [...candidates][0]!, note: extractNote(text) };
}

/** Secondary detail such as exam date and number of posts — shown alongside, not highlighted. */
function extractNote(text: string): string | null {
  const exam = /(?:yazılı\s+)?sınav[^.]{0,60}?(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})/i.exec(text);
  const positions = /(\b(?:bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|on iki|on dört|yirmi bir)\b|\d+)\s+kadro/i.exec(
    text,
  );

  const parts: string[] = [];
  if (exam?.[1]) parts.push('Yazılı sınav ' + exam[1]);
  if (positions?.[0]) parts.push(positions[0].toLocaleLowerCase('tr'));

  return parts.length ? parts.join(', ') : null;
}
