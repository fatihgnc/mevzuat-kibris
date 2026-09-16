import { Mistral } from '@mistralai/mistralai';

import { MISTRAL_OCR_MODEL, assembleIssueText, type MistralOcrPage } from '../extract-text/mistral-engine';
import { getLabeledRecords, writeLabeledBodies, type LabeledRecord } from '../extract-text/mistral-shared';
import { politeFetch } from '../shared/http';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * Same Batch API flow as `mistral-batch-run.ts` ($1/1000 pages), but scoped
 * to an EXPLICIT list of issue ids instead of "every pending issue in year
 * X". `mistral-batch-run.ts` selects by `year = any(years) AND
 * mistral_ocr_at IS NULL` -- fine for a real backfill, but wrong for
 * re-slicing a small, specific set of already-OCR'd issues: some of ours
 * span 2020/2021, years that separately have hundreds of genuinely pending
 * issues, and a year-scoped query would sweep all of those into the same
 * batch job too.
 *
 * Usage: tsx scripts/backfill/reslice-by-id-batch.ts <issueId>[,<issueId>...]
 */

interface IssueRow {
  id: number;
  pdf_url: string;
  year: number;
  number: number;
}

async function readStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  return await new Response(stream).text();
}

/** Same non-HTTPS handling as mistral-batch-run.ts -- see that file's comment. */
async function documentFor(
  issue: IssueRow,
  client: Mistral,
): Promise<{ type: 'document_url'; document_url: string } | { type: 'file'; file_id: string }> {
  if (issue.pdf_url.startsWith('https://')) {
    return { type: 'document_url', document_url: issue.pdf_url };
  }
  const response = await politeFetch(issue.pdf_url, { timeoutMs: 180_000 });
  if (!response.ok) throw new Error(`PDF indirilemedi: HTTP ${response.status}`);
  const uploaded = await client.files.upload({
    file: { fileName: `issue-${issue.id}.pdf`, content: Buffer.from(await response.arrayBuffer()) },
    purpose: 'ocr',
  });
  return { type: 'file', file_id: uploaded.id };
}

const POLL_INTERVAL_MS = 15_000;

async function main() {
  const ids = (process.argv[2] ?? '')
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  if (ids.length === 0) {
    console.error('kullanım: tsx scripts/backfill/reslice-by-id-batch.ts <issueId>[,<issueId>...]');
    process.exit(2);
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY tanımlı değil');
  const client = new Mistral({ apiKey });

  const issues = await sql<IssueRow[]>`
    select id, pdf_url, year, number from issues where id = any(${ids})
  `;
  log.info('yeniden dilimlenecek sayılar', { requested: ids.length, found: issues.length });

  const labeledByIssue = new Map<string, LabeledRecord[]>();
  const toSubmit: IssueRow[] = [];
  for (const issue of issues) {
    const labeled = await getLabeledRecords(issue.id);
    if (labeled.length === 0) {
      log.warn('etiketlenebilir kayıt kalmamış, atlanıyor', { issueId: issue.id });
      continue;
    }
    labeledByIssue.set(String(issue.id), labeled);
    toSubmit.push(issue);
  }
  log.info('kuyruk hazırlandı', { submitting: toSubmit.length });

  if (toSubmit.length === 0) {
    log.info('gönderilecek sayı yok, çıkılıyor');
    await closeDb();
    return;
  }

  const jsonlLines: string[] = [];
  for (const issue of toSubmit) {
    const document = await documentFor(issue, client);
    jsonlLines.push(
      JSON.stringify({
        custom_id: String(issue.id),
        body: { document, confidence_scores_granularity: 'page' },
      }),
    );
  }
  const jsonl = jsonlLines.join('\n');

  const uploaded = await client.files.upload({
    file: { fileName: `mistral-reslice-${Date.now()}.jsonl`, content: Buffer.from(jsonl, 'utf8') },
    purpose: 'batch',
  });
  log.info('batch dosyası yüklendi', { fileId: uploaded.id, bytes: jsonl.length });

  let job = await client.batch.jobs.create({
    inputFiles: [uploaded.id],
    model: MISTRAL_OCR_MODEL,
    endpoint: '/v1/ocr',
    timeoutHours: 24,
    metadata: { purpose: 'mevzuat-kibris-eskieser-anchor-fix' },
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
    await closeDb();
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

  log.info('reslice-by-id-batch tamam', { issuesWritten, recordsWritten, submitted: toSubmit.length });
  await closeDb();
}

main().catch((error) => {
  log.error('reslice-by-id-batch başarısız', { message: String(error) });
  process.exit(1);
});
