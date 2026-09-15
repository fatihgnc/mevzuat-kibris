import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

import { REF_TYPES, type RefType } from '../../src/lib/constants/doc-types';
import { bodyAnchor, extractBody } from '../parse-records/parser';
import { ocrIssue } from './deepseek-engine';

/** DB rows carry ref_type as plain text; parser.ts's bodyAnchor wants the narrow union. */
function asRefType(value: string | null): RefType | null {
  return value !== null && (REF_TYPES as readonly string[]).includes(value)
    ? (value as RefType)
    : null;
}

/**
 * One-off debug tool for the DeepSeek-OCR replacement path: runs ONE issue's
 * PDF through the pipeline and writes body_markdown for ONE target record,
 * printing the extracted body so it can be read before committing.
 *
 * The production path is deepseek-run.ts, which processes every record in an
 * issue from a single OCR pass instead of one record at a time -- use this
 * only to inspect a specific record in isolation.
 *
 * Usage: tsx scripts/extract-text/deepseek-pilot.ts <recordId>
 */
async function main() {
  const recordId = Number(process.argv[2]);
  if (!recordId) {
    console.error('kullanım: tsx scripts/extract-text/deepseek-pilot.ts <recordId>');
    process.exit(2);
  }

  const [record] = await sql<
    Array<{ id: number; issue_id: number; ref_type: string | null; ref_number: string | null }>
  >`select id, issue_id, ref_type, ref_number from records where id = ${recordId}`;
  if (!record) throw new Error(`records.id=${recordId} bulunamadı`);

  const [issue] = await sql<
    Array<{ id: number; pdf_url: string }>
  >`select id, pdf_url from issues where id = ${record.issue_id}`;
  if (!issue) throw new Error(`issues.id=${record.issue_id} bulunamadı`);

  const siblings = await sql<
    Array<{ id: number; ref_type: string | null; ref_number: string | null }>
  >`select id, ref_type, ref_number from records where issue_id = ${record.issue_id}`;
  const otherLabels = siblings
    .filter((r) => r.id !== record.id)
    .map((r) => bodyAnchor(asRefType(r.ref_type), r.ref_number))
    .filter((label): label is string => label !== null);

  const thisLabel = bodyAnchor(asRefType(record.ref_type), record.ref_number);
  if (!thisLabel) throw new Error("bu kaydın anchor label'ı yok (ref_type/ref_number eksik)");

  log.info('pilot başlıyor', { recordId, issueId: issue.id, pdfUrl: issue.pdf_url, thisLabel });

  const { text } = await ocrIssue(issue.pdf_url);
  const { body, pageFrom } = extractBody(text, thisLabel, otherLabels);
  if (!body) throw new Error('gövde bulunamadı — anchor metinde yok');

  console.log('\n=== ÇIKARILAN GÖVDE ===\n');
  console.log(body);
  console.log('\n=== /ÇIKARILAN GÖVDE ===\n');

  await sql`
    update records set body_markdown = ${body}, text_source = 'deepseek_ocr'
    where id = ${recordId}
  `;

  log.info('DB güncellendi', { recordId, pageFrom, bodyLength: body.length });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
