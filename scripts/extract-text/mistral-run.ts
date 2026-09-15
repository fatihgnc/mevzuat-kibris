import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

import { ocrIssueMistral } from './mistral-engine';
import { getLabeledRecords, writeLabeledBodies } from './mistral-shared';

/**
 * The Mistral OCR 3 runner -- pilot counterpart to deepseek-run.ts (see
 * HANDOFF.md §8.5). Tracks progress on its own column, issues.mistral_ocr_at
 * (migration 0013), independently of deepseek_ocr_at: the two engines are
 * being compared on real records, so an issue done by one must not look done
 * to the other.
 *
 * This is the SYNCHRONOUS path -- one `/v1/ocr` call per issue, $2/1000 pages.
 * For a real backfill use mistral-batch-run.ts instead (Batch API, $1/1000);
 * this one stays for one-off pilots and re-running a single issue.
 *
 * Picks the NEWEST unprocessed issue first, same reasoning as deepseek-run.ts:
 * recent content is what readers actually look at.
 *
 * Usage: tsx scripts/extract-text/mistral-run.ts [issueLimit]
 */

interface IssueRow {
  id: number;
  pdf_url: string;
  year: number;
  number: number;
}

interface ProcessResult {
  written: number;
  total: number;
  minConfidence: number | null;
  avgConfidence: number | null;
}

async function processIssue(issue: IssueRow): Promise<ProcessResult> {
  const labeled = await getLabeledRecords(issue.id);

  if (labeled.length === 0) {
    log.info('bu sayıda çıkarılabilir kayıt yok, atlanıyor', { issueId: issue.id });
    await sql`update issues set mistral_ocr_at = now() where id = ${issue.id}`;
    return { written: 0, total: 0, minConfidence: null, avgConfidence: null };
  }

  const { text, minConfidence, avgConfidence } = await ocrIssueMistral(issue.pdf_url);
  const { written } = await writeLabeledBodies(labeled, text);

  await sql`update issues set mistral_ocr_at = now() where id = ${issue.id}`;
  return { written, total: labeled.length, minConfidence, avgConfidence };
}

async function main() {
  const issueLimit = Number(process.argv[2]) || 5;

  const issues = await sql<IssueRow[]>`
    select id, pdf_url, year, number from issues
     where mistral_ocr_at is null
     order by published_at desc
     limit ${issueLimit}
  `;

  log.info('mistral-run başlıyor', { issueCount: issues.length, issueLimit });

  for (const issue of issues) {
    const t0 = Date.now();
    try {
      const { written, total, minConfidence, avgConfidence } = await processIssue(issue);
      log.info('sayı işlendi', {
        issueId: issue.id,
        year: issue.year,
        number: issue.number,
        written,
        total,
        minConfidence,
        avgConfidence,
        seconds: Math.round((Date.now() - t0) / 1000),
      });
    } catch (error) {
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
  >`select count(*)::int as remaining from issues where mistral_ocr_at is null`;
  log.info('mistral-run tamam', { remaining: remainingRow?.remaining ?? null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
