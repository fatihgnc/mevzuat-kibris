import { Mistral } from '@mistralai/mistralai';

import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

import { MISTRAL_OCR_MODEL, assembleIssueText, type MistralOcrPage } from './mistral-engine';
import { getLabeledRecords, writeLabeledBodies, type LabeledRecord } from './mistral-shared';

/**
 * The Mistral OCR 3 Batch API runner -- $1/1000 pages instead of the
 * synchronous mistral-run.ts's $2/1000 (see HANDOFF.md §8.5 and the pricing
 * check that found the 2x gap). One batch job covers every unprocessed issue
 * for a given year: upload a `.jsonl` of {issue id -> pdf_url}, let Mistral
 * queue and run the whole thing, then slice each issue's result into its
 * records exactly like mistral-run.ts does.
 *
 * Uses the official SDK (not raw fetch like mistral-engine.ts) -- the
 * multi-step upload/create/poll/download flow is enough surface that the
 * SDK's typed requests are worth the dependency; it comes out once the
 * Mistral pilot is settled.
 *
 * Usage: tsx scripts/extract-text/mistral-batch-run.ts <year> [issueLimit]
 */

const POLL_INTERVAL_MS = 15_000;

interface IssueRow {
  id: number;
  pdf_url: string;
  year: number;
  number: number;
}

async function readStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  return await new Response(stream).text();
}

async function main() {
  const year = Number(process.argv[2]);
  if (!year) {
    console.error('kullanım: tsx scripts/extract-text/mistral-batch-run.ts <year> [issueLimit]');
    process.exit(2);
  }
  const issueLimit = Number(process.argv[3]) || undefined;

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY tanımlı değil');
  const client = new Mistral({ apiKey });

  const issues = await sql<IssueRow[]>`
    select id, pdf_url, year, number from issues
     where year = ${year} and mistral_ocr_at is null
     order by number
     ${issueLimit ? sql`limit ${issueLimit}` : sql``}
  `;
  log.info('mistral-batch-run başlıyor', { year, issueCount: issues.length });

  // Issues with no OCR-able record don't need a page of Mistral's time --
  // mark them done directly, same shortcut as mistral-run.ts's processIssue.
  //
  // Keys are STRINGS throughout: postgres.js returns bigint (bigserial)
  // columns as JS strings at runtime regardless of the `number` type we
  // declare here (that's a drizzle-only hint, meaningless to the raw `sql`
  // client) -- comparing a Number()-converted custom_id against a
  // string-keyed Map silently missed every lookup the first time this ran.
  const labeledByIssue = new Map<string, LabeledRecord[]>();
  const toSubmit: IssueRow[] = [];
  for (const issue of issues) {
    const labeled = await getLabeledRecords(issue.id);
    if (labeled.length === 0) {
      await sql`update issues set mistral_ocr_at = now() where id = ${issue.id}`;
      continue;
    }
    labeledByIssue.set(String(issue.id), labeled);
    toSubmit.push(issue);
  }
  log.info('kuyruk hazırlandı', {
    submitting: toSubmit.length,
    skippedNoRecords: issues.length - toSubmit.length,
  });

  if (toSubmit.length === 0) {
    log.info('gönderilecek sayı yok, çıkılıyor');
    return;
  }

  const jsonl = toSubmit
    .map((issue) =>
      JSON.stringify({
        custom_id: String(issue.id),
        body: {
          document: { type: 'document_url', document_url: issue.pdf_url },
          confidence_scores_granularity: 'page',
        },
      }),
    )
    .join('\n');

  const uploaded = await client.files.upload({
    file: { fileName: `mistral-batch-${year}.jsonl`, content: Buffer.from(jsonl, 'utf8') },
    purpose: 'batch',
  });
  log.info('batch dosyası yüklendi', { fileId: uploaded.id, bytes: jsonl.length });

  let job = await client.batch.jobs.create({
    inputFiles: [uploaded.id],
    model: MISTRAL_OCR_MODEL,
    endpoint: '/v1/ocr',
    timeoutHours: 24,
    metadata: { purpose: 'mevzuat-kibris-ocr-backfill', year: String(year) },
  });
  log.info('batch job oluşturuldu', { jobId: job.id, totalRequests: job.totalRequests });

  while (job.status === 'QUEUED' || job.status === 'RUNNING') {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    job = await client.batch.jobs.get({ jobId: job.id });
    log.info('batch job durumu', {
      status: job.status,
      completed: job.completedRequests,
      succeeded: job.succeededRequests,
      failed: job.failedRequests,
      total: job.totalRequests,
    });
  }

  if (job.status !== 'SUCCESS') {
    log.warn('batch job SUCCESS ile bitmedi, elde olanla devam ediliyor', { status: job.status });
  }

  if (job.errorFile) {
    const errorText = await readStreamToString(await client.files.download({ fileId: job.errorFile }));
    log.warn('bazı istekler başarısız oldu', { errorFile: job.errorFile, raw: errorText.slice(0, 4000) });
  }

  if (!job.outputFile) {
    log.warn('çıktı dosyası yok, hiçbir kayıt yazılmadı');
    return;
  }

  const outputText = await readStreamToString(await client.files.download({ fileId: job.outputFile }));
  const lines = outputText.split('\n').filter((l) => l.trim().length > 0);
  log.info('çıktı indirildi', { lines: lines.length });

  let issuesWritten = 0;
  let recordsWritten = 0;
  for (const line of lines) {
    const parsed = JSON.parse(line) as {
      custom_id: string;
      // Exact wrapper key wasn't documented anywhere we could find -- both
      // observed shapes are handled; whichever is real, one of the two hits.
      response?: { body?: { pages?: MistralOcrPage[] } };
      result?: { pages?: MistralOcrPage[] };
      error?: unknown;
    };
    const issueId = parsed.custom_id;
    const pages = parsed.result?.pages ?? parsed.response?.body?.pages;

    if (!pages) {
      log.warn('bu satırda pages yok, atlanıyor', { issueId, error: parsed.error, raw: line.slice(0, 500) });
      continue;
    }

    const labeled = labeledByIssue.get(issueId);
    if (!labeled) {
      log.warn('custom_id bilinmeyen bir sayıya ait', { issueId });
      continue;
    }

    const { text, minConfidence, avgConfidence } = assembleIssueText(pages);
    const { written } = await writeLabeledBodies(labeled, text);
    await sql`update issues set mistral_ocr_at = now() where id = ${issueId}`;

    issuesWritten += 1;
    recordsWritten += written;
    log.info('sayı yazıldı', { issueId, written, total: labeled.length, minConfidence, avgConfidence });
  }

  log.info('mistral-batch-run tamam', { year, issuesWritten, recordsWritten, submitted: toSubmit.length });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
