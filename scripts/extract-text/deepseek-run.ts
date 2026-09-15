import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

import { REF_TYPES, type RefType } from '../../src/lib/constants/doc-types';
import { bodyAnchor, extractBody } from '../parse-records/parser';
import { ocrIssue } from './deepseek-engine';

/**
 * The DeepSeek-OCR production runner -- backfill and daily ingest share this
 * one script (see the column comment on issues.deepseek_ocr_at, migration
 * 0012). It always picks the NEWEST unprocessed issue first: freshly
 * ingested issues would otherwise wait behind the entire ~1,800-issue
 * backfill, and recent content is what readers are actually looking at.
 * Older issues are worked backward from there, run after run.
 *
 * Runs on the operator's own machine (GPU required, no flash-attn on
 * Windows -- see deepseek_ocr.py) -- NOT on the GitHub Actions runner that
 * runs the rest of ingest. Re-run this manually or on a schedule; it always
 * resumes from `deepseek_ocr_at is null`, so partial runs are safe.
 *
 * Usage: tsx scripts/extract-text/deepseek-run.ts [issueLimit]
 */

function asRefType(value: string | null): RefType | null {
  return value !== null && (REF_TYPES as readonly string[]).includes(value)
    ? (value as RefType)
    : null;
}

interface IssueRow {
  id: number;
  pdf_url: string;
  year: number;
  number: number;
}

interface RecordRow {
  id: number;
  ref_type: string | null;
  ref_number: string | null;
  has_own_page: boolean;
}

/**
 * One issue, start to finish: OCR every page, slice out every extractable
 * record's body, write them all, mark the issue done.
 *
 * MARKED DONE EVEN WHEN NO RECORD YIELDS A BODY. An issue whose records are
 * all older-era refs with no printed body anchor (parser.ts's bodyAnchor
 * note on A.E./period-specific prefixes) will legitimately extract zero
 * bodies every time; without this, the runner would re-download and
 * re-OCR the same issue forever.
 */
async function processIssue(issue: IssueRow): Promise<{ written: number; total: number }> {
  const records = await sql<RecordRow[]>`
    select id, ref_type, ref_number, has_own_page from records where issue_id = ${issue.id}
  `;

  const labeled = records
    .map((r) => ({ ...r, label: bodyAnchor(asRefType(r.ref_type), r.ref_number) }))
    .filter((r): r is RecordRow & { label: string } => r.label !== null && r.has_own_page);

  if (labeled.length === 0) {
    log.info('bu sayıda çıkarılabilir kayıt yok, atlanıyor', { issueId: issue.id });
    await sql`update issues set deepseek_ocr_at = now() where id = ${issue.id}`;
    return { written: 0, total: records.length };
  }

  const { text } = await ocrIssue(issue.pdf_url);

  let written = 0;
  for (const record of labeled) {
    const otherLabels = labeled.filter((r) => r.id !== record.id).map((r) => r.label);
    const { body } = extractBody(text, record.label, otherLabels);
    if (!body) {
      log.warn('gövde bulunamadı, atlanıyor', { recordId: record.id, label: record.label });
      continue;
    }
    await sql`
      update records set body_markdown = ${body}, text_source = 'deepseek_ocr'
      where id = ${record.id}
    `;
    written += 1;
  }

  await sql`update issues set deepseek_ocr_at = now() where id = ${issue.id}`;
  return { written, total: labeled.length };
}

async function main() {
  const issueLimit = Number(process.argv[2]) || 5;

  const issues = await sql<IssueRow[]>`
    select id, pdf_url, year, number from issues
     where deepseek_ocr_at is null
     order by published_at desc
     limit ${issueLimit}
  `;

  log.info('deepseek-run başlıyor', { issueCount: issues.length, issueLimit });

  for (const issue of issues) {
    const t0 = Date.now();
    try {
      const { written, total } = await processIssue(issue);
      log.info('sayı işlendi', {
        issueId: issue.id,
        year: issue.year,
        number: issue.number,
        written,
        total,
        seconds: Math.round((Date.now() - t0) / 1000),
      });
    } catch (error) {
      // One bad issue (a dead PDF link, an OCR crash) must not stop the run --
      // it is left with deepseek_ocr_at still null, so a later run retries it.
      log.warn('sayı başarısız, sonraki denemede tekrar denenecek', {
        issueId: issue.id,
        year: issue.year,
        number: issue.number,
        message: String(error),
      });
    }
  }

  const [remainingRow] = await sql<
    Array<{ remaining: number }>
  >`select count(*)::int as remaining from issues where deepseek_ocr_at is null`;
  log.info('deepseek-run tamam', { remaining: remainingRow?.remaining ?? null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
