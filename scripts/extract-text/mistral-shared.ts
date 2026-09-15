import { sql } from '../shared/db';
import { log } from '../shared/logger';

import { REF_TYPES, type RefType } from '../../src/lib/constants/doc-types';
import { bodyAnchor, extractBody } from '../parse-records/parser';

/**
 * Shared between the synchronous runner (mistral-run.ts) and the Batch API
 * runner (mistral-batch-run.ts) -- both need the same "which records in this
 * issue can get a body, and what's their anchor label" step and the same
 * "slice the OCR text and write it" step. Only how the OCR text is obtained
 * differs between the two.
 */

function asRefType(value: string | null): RefType | null {
  return value !== null && (REF_TYPES as readonly string[]).includes(value)
    ? (value as RefType)
    : null;
}

export interface LabeledRecord {
  id: number;
  label: string;
}

/** Records in an issue that have a resolvable anchor label AND get their own page. */
export async function getLabeledRecords(issueId: number): Promise<LabeledRecord[]> {
  const records = await sql<
    Array<{ id: number; ref_type: string | null; ref_number: string | null; has_own_page: boolean }>
  >`select id, ref_type, ref_number, has_own_page from records where issue_id = ${issueId}`;

  return records
    .map((r) => ({ id: r.id, has_own_page: r.has_own_page, label: bodyAnchor(asRefType(r.ref_type), r.ref_number) }))
    .filter((r): r is LabeledRecord & { has_own_page: boolean } => r.label !== null && r.has_own_page);
}

/** Slices the issue's whole OCR text into each labeled record's body and writes it. */
export async function writeLabeledBodies(labeled: LabeledRecord[], text: string): Promise<{ written: number }> {
  let written = 0;
  for (const record of labeled) {
    const otherLabels = labeled.filter((r) => r.id !== record.id).map((r) => r.label);
    const { body } = extractBody(text, record.label, otherLabels);
    if (!body) {
      log.warn('gövde bulunamadı, atlanıyor', { recordId: record.id, label: record.label });
      continue;
    }
    await sql`
      update records set body_markdown = ${body}, text_source = 'mistral_ocr'
      where id = ${record.id}
    `;
    written += 1;
  }
  return { written };
}
