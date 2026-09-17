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
