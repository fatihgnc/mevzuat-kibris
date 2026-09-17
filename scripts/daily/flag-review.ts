import { bodyAnchor } from '../parse-records/parser';
import { sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * Automates the mechanical half of the `verify-issue` skill's Step 1: the gap
 * classes that a SQL query can spot on its own, without reading the source
 * PDF. It never rewrites body content -- only marks records as worth a human
 * pass, the same as `verify-issue` would flag them.
 */

// Legal instruments where a missing reference number means the ingest
// pipeline's anchor search (bodyAnchor) never had anything to search for --
// see SKILL.md's gap category 1. A missing ref number on, say, a personnel
// notice is normal and not worth flagging.
const NO_ANCHOR_DOC_TYPES = new Set(['yasa', 'yasa_gucunde_kararname', 'tuzuk', 'emirname']);

// The tail of a body that is really the next PDF page's running header
// bleeding in (SKILL.md's masthead-bleed pattern), not part of the record's
// own content. Checked only near the end of the body -- these words can
// legitimately appear earlier, e.g. a law quoting "Resmi Gazete'de
// yayımlanır" in its own text.
//
// THE NEGATIVE LOOKAHEAD IS LOAD-BEARING, measured the expensive way across
// three rounds of a site-wide dry run. A first version with no lookahead at
// all flagged 30 records in a 2026/176-177 pilot and 27 were false positives
// -- almost every law ends its own "Yürürlüğe Giriş" article with "...Resmi
// Gazete'de yayımlandığı tarihten yürürlüğe girer.", and "Kuzey Kıbrıs Türk
// Cumhuriyeti'nde" is an ordinary phrase inside plenty of decisions. A second
// version excluded a following apostrophe, which fixed that but missed two
// more real patterns this archive uses for the exact same words: a case
// suffix attached WITHOUT an apostrophe ("Gazetede", "Gazetesi'nin" --
// "Gazetesi" is "Gazete" plus the possessive "-si", not a heading), and a
// bare number directly after "Cumhuriyeti" (every Kamulaştırma İhbarı/Emri
// record opens "Kuzey Kıbrıs Türk Cumhuriyeti <N> sayılı Resmi Gazetesi'nin
// ... yayınlanan..." -- boilerplate, not a heading, and in one record that
// had swallowed a second such record whole, this matched the swallowed
// record's own opening instead of the real masthead further down).
//
// Enumerating every possible Turkish suffix this way is a losing game. What
// actually distinguishes a masthead HEADING from any of these sentence uses
// is simpler: a heading is followed by whitespace, a newline, or another
// capitalized word/number-with-space ("RESMÎ GAZETE\n\nSayı : 177", "KUZEY
// KIBRIS TÜRK CUMHURİYETİ\nRESMÎ GAZETE") -- never by a lowercase letter
// continuing the same word, an apostrophe, or a number glued on with no
// space. Excluding those three catches every sentence-internal use found so
// far without having to name each suffix.
const MASTHEAD_TAIL_RE =
  /(?:RESM[İIÎ][ \t\n]*GAZETE|KUZEY[ \t\n]+KIBRIS[ \t\n]+TÜRK[ \t\n]+CUMHURİYETİ)(?![a-zçğıöşü'’]|[ \t\n]*\d)/i;
const MASTHEAD_TAIL_CHARS = 500;

export interface Candidate {
  id: number;
  refType: string | null;
  refNumber: string | null;
  docType: string;
  bodyMarkdown: string | null;
}

function countAnchorHits(body: string, refType: string | null, refNumber: string | null): number {
  const label = bodyAnchor(refType as Parameters<typeof bodyAnchor>[0], refNumber);
  if (!label) return 0;
  const pattern = label
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\./g, '\\.?')
    .replace(/\\\(/g, '\\.?\\(')
    .replace(/\s+/g, '\\s*');
  const matches = body.match(new RegExp(pattern, 'gi'));
  return matches ? matches.length : 0;
}

export function flagsFor(record: Candidate): string[] {
  const flags: string[] = [];

  if (!record.bodyMarkdown) {
    flags.push('no_body');
    if (!record.refType && NO_ANCHOR_DOC_TYPES.has(record.docType)) flags.push('no_anchor');
    return flags;
  }

  if (countAnchorHits(record.bodyMarkdown, record.refType, record.refNumber) > 1) {
    flags.push('neighbor_bleed');
  }

  const tail = record.bodyMarkdown.slice(-MASTHEAD_TAIL_CHARS);
  if (MASTHEAD_TAIL_RE.test(tail)) flags.push('masthead_bleed');

  return flags;
}

/**
 * Flags every record in the given issues that matches a known gap class, and
 * clears the flag on any record that no longer matches (e.g. a previous
 * `verify-issue` pass already fixed it). Returns how many records ended up
 * flagged, for the daily run's summary log.
 */
export async function flagForReview(issueIds: number[]): Promise<number> {
  if (issueIds.length === 0) return 0;

  const candidates = await sql<Candidate[]>`
    select id, ref_type as "refType", ref_number as "refNumber", doc_type as "docType",
           body_markdown as "bodyMarkdown"
      from records
     where issue_id = any(${issueIds})
  `;

  let flaggedCount = 0;

  for (const record of candidates) {
    const flags = flagsFor(record);

    if (flags.length > 0) {
      flaggedCount += 1;
      await sql`
        update records
           set review_flags = ${flags}, review_flagged_at = now()
         where id = ${record.id}
      `;
    } else {
      await sql`
        update records
           set review_flags = null, review_flagged_at = null
         where id = ${record.id} and review_flags is not null
      `;
    }
  }

  if (flaggedCount > 0) {
    log.info('inceleme için işaretlenen kayıt', { count: flaggedCount, issueIds });
  }

  return flaggedCount;
}
