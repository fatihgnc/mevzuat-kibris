import * as cheerio from 'cheerio';

import { SECTION_HEADINGS, type Section } from '../../src/lib/constants/sections';
import type { RefType } from '../../src/lib/constants/doc-types';

/**
 * Parser for the archive's İÇERİK (contents) cell — spec 3.3.
 *
 * CRITICAL RULE: a single İÇERİK cell may hold dozens of records, and they may
 * be out of order or repeated. The parser asks "how many separate records are in
 * this text"; it does not take the first match and stop.
 *
 * The same subject can appear both in EK III under an A.E. number and in EK IV
 * BÖLÜM I under a Ü(K-I) number. Those are stored as separate records and linked
 * afterwards via related_record_id (link-related.ts).
 */

export interface ParsedRecord {
  section: Section;
  refType: RefType | null;
  refNumber: string | null;
  title: string;
  /** Whatever follows KONU:, if present */
  subject: string | null;
  /** Position within the cell — for deterministic slug generation inside one issue */
  ordinal: number;
  /** Whether this is a DÜZELTME (correction) record */
  isCorrection: boolean;
}

/**
 * Reference anchors — the table in spec 3.3.
 *
 * Order matters: Ü(K-I) and Ü(K-II) look alike, so the longer one must be tried
 * first. GENELGE MİA, KARAR SAYISI and KARAR NO also come before the general
 * patterns.
 */
const REF_PATTERNS: Array<{ type: RefType; pattern: RegExp }> = [
  { type: 'ukii', pattern: /Ü\(K-II\)\s?(\d+-\d{4}|\d+)/ },
  { type: 'uki', pattern: /Ü\(K-I\)\s?(\d+-\d{4}|\d+)/ },
  /*
   * Period-specific prefixes of Council of Ministers decisions (see the
   * REF_TYPES note). S(K-II) and TE(K-I) must be tried BEFORE K(II): all three
   * carry a parenthesised series letter, and this order stops the short one from
   * matching inside the long one.
   *
   * The `s` pattern is deliberately narrow — a bare "S-" is far too general and
   * would mistake in-title citations ("KARAR İPTALİ (S-1265-2005 ...)") for
   * records. We require the full NUMBER-YEAR form.
   */
  { type: 'skii', pattern: /S\(K-II\)\s?(\d+-\d{4}|\d+)/ },
  { type: 'teki', pattern: /TE\(K-I\)\s?(\d+-\d{4}|\d+)/ },
  /*
   * 2020-2022 prefixes (see the REF_TYPES note). These must come BEFORE the bare
   * forms above them would ever be reached, and they are anchored on their own
   * leading letter for the same reason `s` is narrow: `E.S(K-I)` and `F.S(K-I)`
   * both contain `S(K-I`, so a looser pattern here would take the wrong prefix.
   *
   * `fskiii` before `fski`: "F.S(K-III)" starts with "F.S(K-I", so the shorter
   * one would match inside the longer and lose the series.
   */
  { type: 'fskiii', pattern: /F\.S\.?\(K-III\)\s?(\d+-\d{4}|\d+)/ },
  { type: 'fski', pattern: /F\.S\.?\(K-I\)\s?(\d+-\d{4}|\d+)/ },
  { type: 'eski', pattern: /E\.S\.?\(K-I\)\s?(\d+-\d{4}|\d+)/ },
  { type: 'etki', pattern: /E\.T\.?\(K-I\)\s?(\d+-\d{4}|\d+)/ },
  { type: 'kii', pattern: /K\(II\)[-\s]?(\d+-\d{4}|\d+)/ },
  { type: 's', pattern: /\bS-(\d{1,5}-\d{4})/ },
  { type: 'mia', pattern: /GENELGE\s+MİA\.(\d+\/\d{4})/i },
  { type: 'rekabet', pattern: /KARAR\s+SAYISI:\s?(\d+\/\d{4})/i },
  { type: 'eskieser', pattern: /KARAR\s+NO:\s?(\d+\/\d+)/i },
  { type: 'yt', pattern: /Y\.T\.NO:\s?(\d+\/\d+\/\d{4})/i },
  { type: 'yo', pattern: /Y\.Ö\.NO:\s?(\d+\/\d+\/\d{4})/i },
  // The 2018 archive uses a thousands separator: "A.E.1.093" = A.E. 1093.
  { type: 'ae', pattern: /A\.E\.\s?(\d+(?:\.\d{3})+|\d+)/ },
  { type: 'sm', pattern: /Ş\.M\.\s?(\d+)/ },
  { type: 'mt', pattern: /M\.T\.\s?(\d+)/ },
];

/**
 * Primary references are the gazette's own publication numbers and mark where a
 * record starts. Secondary ones (Competition Board KARAR SAYISI, Antiquities
 * KARAR NO, GENELGE MİA) are the decision's own internal number and mostly occur
 * inside the TITLE of an A.E. record.
 *
 * Without this distinction the line "A.E. 1070 REKABET KURULU KARARI-KARAR
 * SAYISI:318/2025 KONU:..." was split into two records, when it is one. If a
 * line has no primary reference at all, the secondary one is used as the
 * record's reference.
 */
const PRIMARY_REF_TYPES = new Set<RefType>([
  'ae',
  'uki',
  'ukii',
  's',
  'skii',
  'kii',
  'teki',
  'eski',
  'etki',
  'fski',
  'fskiii',
  'sm',
  'mt',
  'yt',
  'yo',
]);

/** Whether this line is a section heading, and if so which section. */
function matchSectionHeading(line: string): Section | null {
  const trimmed = line.trim().replace(/\s+/g, ' ').replace(/[:.]+$/, '');
  for (const [pattern, section] of SECTION_HEADINGS) {
    if (pattern.test(trimmed)) return section;
  }
  return null;
}

/**
 * Finds every reference on a line. A single line can carry several references;
 * we return all of them so the record count comes out right.
 */
function findRefs(text: string): Array<{ type: RefType; number: string; index: number }> {
  const found: Array<{ type: RefType; number: string; index: number }> = [];

  for (const { type, pattern } of REF_PATTERNS) {
    const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let match: RegExpExecArray | null;

    while ((match = global.exec(text)) !== null) {
      // The Ü(K-I) pattern also matches inside Ü(K-II); let the longer match win.
      const overlapping = found.some(
        (item) => match!.index >= item.index && match!.index < item.index + 12,
      );
      if (!overlapping) {
        /*
         * Drop the thousands separator: 2018's "A.E.1.093" and 2025's
         * "A.E.1071" are from the same series. Keeping the dot stores one
         * reference as two different numbers and breaks alert matching across
         * years.
         */
        const number = type === 'ae' ? match[1]!.replace(/\./g, '') : match[1]!;
        found.push({ type, number, index: match.index });
      }
    }
  }

  return found.sort((a, b) => a.index - b.index);
}

/**
 * Returns the PRIMARY references in a text — the public face.
 *
 * Needed so that amendment/annulment records can inherit their topic from the
 * decision they cite (scripts/reclassify/inherit.ts): the reference in a title
 * like "Ü(K-I) 1880-2024 SAYI VE ... KARARIN TADİL EDİLMESİ" has to be resolved.
 * Secondary references (Competition KARAR SAYISI and the like) are deliberately
 * left out: those are a decision's internal number and do not point at a
 * separate record.
 */
export function findPrimaryRefs(text: string): Array<{ type: RefType; number: string }> {
  return findRefs(text)
    .filter((ref) => PRIMARY_REF_TYPES.has(ref.type))
    .map((ref) => ({ type: ref.type, number: ref.number }));
}

/** Splits off whatever follows KONU:. */
function splitSubject(text: string): { title: string; subject: string | null } {
  const match = /\bKONU:\s*/i.exec(text);
  if (!match) return { title: text.trim(), subject: null };

  return {
    title: text.trim(),
    subject: text.slice(match.index + match[0].length).trim() || null,
  };
}

/**
 * Finds record boundaries.
 *
 * In the gazette dump a record does not always sit on its own line; the
 * reference number marks where a record starts. Blocks with no reference (court
 * notices, for instance) still count as records but keep refType null —
 * discarding those would make part of the gazette invisible.
 */
export function parseIndexCell(raw: string): ParsedRecord[] {
  const lines = raw
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  const records: ParsedRecord[] = [];
  let section: Section = 'MAIN';
  let ordinal = 0;

  for (const line of lines) {
    const heading = matchSectionHeading(line);
    if (heading) {
      section = heading;
      continue;
    }

    // Skip one-word lines that look like a section heading but are not
    if (line.length < 6) continue;

    const allRefs = findRefs(line);
    const isCorrection = /^DÜZELTME\s*:/i.test(line);

    // If the line has primary references, only those determine record boundaries.
    const primary = allRefs.filter((ref) => PRIMARY_REF_TYPES.has(ref.type));
    const refs = primary.length ? primary : allRefs;

    if (refs.length === 0) {
      const { title, subject } = splitSubject(line);
      records.push({
        section,
        refType: null,
        refNumber: null,
        title,
        subject,
        ordinal: ordinal++,
        isCorrection,
      });
      continue;
    }

    /*
     * If a line carries several references, each one is a separate record. The
     * title is the text from that reference up to the next. This correctly
     * splits multi-company records squeezed onto one line, such as "GLOBAL
     * INVESTMENT ..., NICOSIA LANGUAGE CENTRE LIMITED, ..." (spec 7.3's hard
     * case).
     */
    for (let i = 0; i < refs.length; i += 1) {
      const ref = refs[i]!;
      const next = refs[i + 1];
      const segment = line.slice(ref.index, next ? next.index : undefined).trim();
      /*
       * The DÜZELTME prefix comes before the reference and slicing cuts it off.
       * We add it back: the title stays faithful to the source, and the
       * classifier can see that the record is a correction.
       */
      const withPrefix = isCorrection && i === 0 ? 'DÜZELTME: ' + segment : segment;
      const { title, subject } = splitSubject(withPrefix || line);

      records.push({
        section,
        refType: ref.type,
        refNumber: ref.number,
        title,
        subject,
        ordinal: ordinal++,
        isCorrection,
      });
    }
  }

  return records;
}

/** Makes cell text comparable: &nbsp; and collapsed whitespace. */
function cellText(raw: string): string {
  return raw.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * How long a reference cell may be. References are short ("S(K-II) 566-2006" is
 * 16 characters); titles are long. The threshold stops a citation inside a long
 * title from being mistaken for a reference cell.
 */
const REF_CELL_MAX = 40;

/**
 * Parses the INNER TABLE of the İÇERİK cell — this is the real archive's format.
 *
 * Why a separate path: parseIndexCell assumes a flat text dump and relies on the
 * reference being on the SAME line as the title. In the real archive the İÇERİK
 * cell is a columnar <table>:
 *
 *     SECTION | REFERENCE | TITLE | (leftover column)
 *
 * Flattened to text, every cell falls onto its own line and each record was
 * split in two: one carrying the reference with "A.E.1071" as its title, and one
 * carrying the title with no reference. For 2025 that turned 3,977 real lines
 * into 7,170 bogus records, 48% of them reference-less.
 *
 * Reading the structure beats flattening to text for more than accuracy: because
 * the reference comes FROM THE CELL, citations inside a title ("KARAR İPTALİ
 * (S-1265-2005 ...)") can no longer produce phantom records. On the text path
 * that could only be handled by boundary-finding heuristics.
 *
 * Returns null when there is no table; the caller falls back to the text path (2
 * of 262 issues in 2025, 1 of 194 in 2018).
 *
 * Measured format variation (2006, 2012, 2018, 2025 — 13,750 rows):
 * - Column count varies by year: 2018 is mostly 3, the others 4, some rows 5.
 *   Columns are therefore located by CONTENT rather than by fixed index.
 * - The SECTION column is filled on only ~15% of rows; it is a block heading and
 *   carries downward.
 * - A record without a reference is normal (laws: EK I BÖLÜM I, unnumbered).
 */
export function parseIndexTable(html: string): ParsedRecord[] | null {
  const $ = cheerio.load(html);
  if ($('table').length === 0) return null;

  const records: ParsedRecord[] = [];
  let section: Section = 'MAIN';
  let ordinal = 0;

  for (const row of $('tr').toArray()) {
    // Wrapper rows (those containing a table) are containers, not data.
    if ($(row).find('table').length > 0) continue;

    const cells = $(row)
      .find('td')
      .toArray()
      .map((cell) => cellText($(cell).text()));

    if (cells.every((cell) => !cell)) continue;

    /*
     * Column 1 is the section heading. An unrecognised value (a bare "EK V", or
     * a typo) is deliberately ignored: the carried-down section is preserved.
     * Guessing is no better than writing the wrong section.
     */
    if (cells[0]) {
      const heading = matchSectionHeading(cells[0]);
      if (heading) section = heading;
    }

    const rest = cells.slice(1);

    // The reference cell: the first cell that is short AND contains a primary reference.
    let refIndex = -1;
    let ref: { type: RefType; number: string } | null = null;

    for (let i = 0; i < rest.length; i += 1) {
      const candidate = rest[i]!;
      if (!candidate || candidate.length > REF_CELL_MAX) continue;

      const primary = findRefs(candidate).filter((item) => PRIMARY_REF_TYPES.has(item.type));
      if (primary.length) {
        refIndex = i;
        ref = { type: primary[0]!.type, number: primary[0]!.number };
        break;
      }
    }

    /*
     * The title is the longest of the remaining cells. A fixed index will not
     * do, because the title is in column 3 in 2018 and column 4 on some 2025
     * rows. "Longest" finds both correctly and filters out leftover columns.
     */
    let title = '';
    for (let i = 0; i < rest.length; i += 1) {
      if (i === refIndex) continue;
      const candidate = rest[i]!;
      if (candidate.length > title.length) title = candidate;
    }

    /*
     * A row with a reference but no title still deserves a record — the gazette
     * published that number. The reference label is used in place of a title so
     * the record is not left without any identifying text.
     */
    if (!title && ref) title = cells[refIndex + 1] ?? '';
    if (!title && !ref) continue;

    /*
     * If the reference column is empty, look inside the title. Bill and proposal
     * numbers are written inside the title by design ("... YASA TASARISI
     * (Y.T.NO:2/2006)") rather than in a separate column; nearly all of EK VI is
     * like this.
     *
     * This only runs when NO reference cell was found, so that on a row that has
     * one, citations in the title ("KARAR İPTALİ (S-1265-2005 ...)") cannot
     * hijack the record's reference.
     */
    if (!ref) {
      const inTitle = findRefs(title).filter((item) => PRIMARY_REF_TYPES.has(item.type));
      if (inTitle.length) ref = { type: inTitle[0]!.type, number: inTitle[0]!.number };
    }

    const isCorrection = /^DÜZELTME\b/i.test(title);
    const { title: cleanTitle, subject } = splitSubject(title);

    records.push({
      section,
      refType: ref?.type ?? null,
      refNumber: ref?.number ?? null,
      title: cleanTitle,
      subject,
      ordinal: ordinal++,
      isCorrection,
    });
  }

  return records;
}

/**
 * Extracts a record's body from the PDF text.
 *
 * We find where the reference number occurs in the PDF text and take everything
 * up to the next reference. If it is not found, null — an invented body is worse
 * than no body.
 */
export function extractBody(
  pdfText: string,
  refLabel: string | null,
  /**
   * The reference labels of the OTHER records in the same issue. These determine
   * where the body ends.
   */
  otherLabels: readonly string[] = [],
): { body: string | null; pageFrom: number | null } {
  if (!refLabel) return { body: null, pageFrom: null };

  const start = findLabel(pdfText, refLabel, 0);
  if (start === -1) return { body: null, pageFrom: null };

  /*
   * The end is the NEAREST other reference AFTER THE START.
   *
   * It used to look only for the label of the NEXT record in contents order; if
   * that was not found, the body ran to the end of the PDF. Not finding it is
   * common: the gazette's physical order need not match the contents order, and
   * the label may be typeset slightly differently in the PDF.
   *
   * The effect was measured: of 3,646 records with a body, 184 (5%) had bodies
   * spilling into other records — on average 7.9 foreign references per
   * overflowing record, with 13-18 KB bodies (median 1,219 characters). Since
   * that text is also indexed for search, a record could be found by words that
   * had nothing to do with it.
   *
   * If none is found the body runs to the end; that is the right behaviour for
   * the LAST record in the PDF.
   */
  const from = start + refLabel.length;
  let end = pdfText.length;

  for (const label of otherLabels) {
    const at = findLabel(pdfText, label, from);
    if (at !== -1 && at < end) end = at;
  }

  const body = pdfText.slice(start, end).trim();

  // pdftotext emits a form feed as the page separator; that is how we count
  // which page we are on.
  const pageFrom = pdfText.slice(0, start).split('').length;

  return { body: body.length > 40 ? body : null, pageFrom };
}

/**
 * Looks for a reference label in the text; returns its absolute offset if found.
 *
 * Whitespace is flexible (`\s*`): in the PDF "Ü(K-I) 2497-2025" sometimes comes
 * out as "Ü(K-I)2497-2025", and sometimes broken across a line end.
 */
function findLabel(text: string, label: string, from: number): number {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
  const match = new RegExp(escaped, 'i').exec(text.slice(from));
  return match ? from + match.index : -1;
}
