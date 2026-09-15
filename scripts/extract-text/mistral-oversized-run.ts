import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { Mistral } from '@mistralai/mistralai';

import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';
import { politeFetch } from '../shared/http';

import { MISTRAL_OCR_MODEL, assembleIssueText, type MistralOcrPage } from './mistral-engine';
import { getLabeledRecords, writeLabeledBodies, type LabeledRecord } from './mistral-shared';

const run = promisify(execFile);
const MAX_PAGES_PER_REQUEST = 1000;
const POLL_INTERVAL_MS = 15_000;

/**
 * Fixes issues whose PDF exceeds Mistral's 1,000-page-per-request cap (found
 * running the 2026 and 2024 batches -- `pages` does NOT work around this,
 * Mistral rejects on the SOURCE document's total page count before it even
 * looks at which pages were asked for; measured directly).
 *
 * Splits each issue's PDF into <=1000-page chunks with pdftocairo (poppler,
 * already on this machine), uploads every chunk via the Files API (purpose
 * "ocr"), then runs all chunks -- across every issue passed in -- through
 * ONE Batch API job so this still gets the $1/1000 batch rate instead of the
 * synchronous endpoint's $2/1000. A `document_url` can't express "here is a
 * file I'm holding locally"; a file upload + file_id reference is the
 * documented way (FileChunk in the SDK/API).
 *
 * Usage: tsx scripts/extract-text/mistral-oversized-run.ts <issueId> [issueId...]
 */
async function pdfPageCount(path: string): Promise<number> {
  const { stdout } = await run('pdfinfo', [path]);
  const match = /Pages:\s+(\d+)/.exec(stdout);
  if (!match) throw new Error('pdfinfo sayfa sayısını veremedi');
  return Number(match[1]);
}

async function readStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  return await new Response(stream).text();
}

interface ChunkMeta {
  issueId: string;
  chunkIndex: number;
  pagesInChunk: number;
}

async function main() {
  const issueIds = process.argv.slice(2);
  if (issueIds.length === 0) {
    console.error('kullanım: tsx scripts/extract-text/mistral-oversized-run.ts <issueId> [issueId...]');
    process.exit(2);
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY tanımlı değil');
  const client = new Mistral({ apiKey });

  const dir = await mkdtemp(join(tmpdir(), 'mk-mistral-split-'));
  const labeledByIssue = new Map<string, LabeledRecord[]>();
  // custom_id ("issueId:chunkIndex") -> chunk metadata, so the output can be
  // regrouped by issue and re-offset into reading order after the job returns.
  const chunkMetaByCustomId = new Map<string, ChunkMeta>();
  const jsonlLines: string[] = [];

  try {
    for (const issueId of issueIds) {
      const [issue] = await sql<Array<{ id: string; pdf_url: string; year: number; number: number }>>`
        select id, pdf_url, year, number from issues where id = ${issueId}
      `;
      if (!issue) {
        log.warn('sayı bulunamadı, atlanıyor', { issueId });
        continue;
      }

      const labeled = await getLabeledRecords(Number(issue.id));
      if (labeled.length === 0) {
        await sql`update issues set mistral_ocr_at = now() where id = ${issueId}`;
        log.info('bu sayıda çıkarılabilir kayıt yok', { issueId });
        continue;
      }
      labeledByIssue.set(issueId, labeled);

      const pdfPath = join(dir, `issue-${issueId}.pdf`);
      const response = await politeFetch(issue.pdf_url, { timeoutMs: 180_000 });
      if (!response.ok) throw new Error(`PDF indirilemedi: HTTP ${response.status}`);
      await writeFile(pdfPath, Buffer.from(await response.arrayBuffer()));

      const totalPages = await pdfPageCount(pdfPath);
      const chunkCount = Math.ceil(totalPages / MAX_PAGES_PER_REQUEST);
      const chunkSize = Math.ceil(totalPages / chunkCount);
      log.info('PDF indirildi, bölünüyor', {
        issueId,
        year: issue.year,
        number: issue.number,
        totalPages,
        chunkCount,
      });

      for (let i = 0; i < chunkCount; i++) {
        const first = i * chunkSize + 1;
        const last = Math.min((i + 1) * chunkSize, totalPages);
        const chunkPath = join(dir, `part-${issueId}-${i}.pdf`);
        await run('pdftocairo', ['-pdf', '-f', String(first), '-l', String(last), pdfPath, chunkPath]);

        const uploaded = await client.files.upload({
          file: { fileName: `part-${issueId}-${i}.pdf`, content: await readFile(chunkPath) },
          purpose: 'ocr',
        });

        const customId = `${issueId}:${i}`;
        chunkMetaByCustomId.set(customId, { issueId, chunkIndex: i, pagesInChunk: last - first + 1 });
        jsonlLines.push(
          JSON.stringify({
            custom_id: customId,
            body: {
              document: { type: 'file', file_id: uploaded.id },
              confidence_scores_granularity: 'page',
            },
          }),
        );
      }
    }

    if (jsonlLines.length === 0) {
      log.info('gönderilecek parça yok, çıkılıyor');
      return;
    }

    const batchFile = await client.files.upload({
      file: { fileName: 'mistral-oversized-batch.jsonl', content: Buffer.from(jsonlLines.join('\n'), 'utf8') },
      purpose: 'batch',
    });
    log.info('batch dosyası yüklendi', { fileId: batchFile.id, lines: jsonlLines.length });

    let job = await client.batch.jobs.create({
      inputFiles: [batchFile.id],
      model: MISTRAL_OCR_MODEL,
      endpoint: '/v1/ocr',
      timeoutHours: 24,
      metadata: { purpose: 'mevzuat-kibris-oversized-fix' },
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

    if (job.errorFile) {
      const errorText = await readStreamToString(await client.files.download({ fileId: job.errorFile }));
      log.warn('bazı parçalar başarısız oldu', { raw: errorText.slice(0, 4000) });
    }
    if (!job.outputFile) {
      log.warn('çıktı dosyası yok, hiçbir şey yazılmadı');
      return;
    }

    const outputText = await readStreamToString(await client.files.download({ fileId: job.outputFile }));
    const lines = outputText.split('\n').filter((l) => l.trim().length > 0);

    // Regroup chunk results by issue, in chunk order, with page indices offset
    // so assembleIssueText's sort reproduces the whole issue's reading order.
    const pagesByIssue = new Map<string, MistralOcrPage[]>();
    const chunksSeenByIssue = new Map<string, Map<number, MistralOcrPage[]>>();

    for (const line of lines) {
      const parsed = JSON.parse(line) as {
        custom_id: string;
        response?: { body?: { pages?: MistralOcrPage[] } };
        result?: { pages?: MistralOcrPage[] };
        error?: unknown;
      };
      const meta = chunkMetaByCustomId.get(parsed.custom_id);
      const pages = parsed.result?.pages ?? parsed.response?.body?.pages;
      if (!meta || !pages) {
        log.warn('parça sonucu eksik', { customId: parsed.custom_id, error: parsed.error });
        continue;
      }
      if (!chunksSeenByIssue.has(meta.issueId)) chunksSeenByIssue.set(meta.issueId, new Map());
      chunksSeenByIssue.get(meta.issueId)!.set(meta.chunkIndex, pages);
    }

    for (const [issueId, chunkMap] of chunksSeenByIssue) {
      const orderedChunkIndexes = [...chunkMap.keys()].sort((a, b) => a - b);
      const allPages: MistralOcrPage[] = [];
      let offset = 0;
      for (const chunkIndex of orderedChunkIndexes) {
        const pages = chunkMap.get(chunkIndex)!;
        for (const page of pages) allPages.push({ ...page, index: offset + page.index });
        offset += chunkMetaByCustomId.get(`${issueId}:${chunkIndex}`)!.pagesInChunk;
      }
      pagesByIssue.set(issueId, allPages);
    }

    for (const [issueId, pages] of pagesByIssue) {
      const labeled = labeledByIssue.get(issueId);
      if (!labeled) continue;
      const { text, pageCount, minConfidence, avgConfidence } = assembleIssueText(pages);
      const { written } = await writeLabeledBodies(labeled, text);
      await sql`update issues set mistral_ocr_at = now() where id = ${issueId}`;
      log.info('sayı yazıldı', { issueId, pageCount, written, total: labeled.length, minConfidence, avgConfidence });
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
