import { crawlYear } from '../crawl-archive';
import { processIssue } from '../parse-records';
import { triggerRevalidate } from '../revalidate';
import { closeDb, finishRun, sql, startRun } from '../shared/db';
import { log, toErrorEntry } from '../shared/logger';

/**
 * Backfill — processes ALL unprocessed issues of one year.
 *
 * Two deliberate differences from `daily`:
 *
 * 1. No issue limit. `daily` is capped at 40 issues per run because GitHub
 *    Actions runner minutes must be spent sparingly and the daily workload is a
 *    few issues anyway. A whole year (262 issues in 2025) would take 7 runs
 *    under that cap, and every run re-fetches the archive page — 6 needless
 *    requests to the source site. Backfill scans the archive once.
 *
 * 2. `ingest_runs.kind = 'backfill'`. The schema defined this kind from the
 *    start (0003-core-tables.sql) but the script had never been written.
 *
 * INTERRUPTIBLE. It only selects issues with `text_status = 'pending'` and
 * writes each issue's status as soon as it is processed; if it is cut off,
 * re-running continues from where it stopped rather than starting over. It takes
 * a long time (one PDF download per issue plus a one-request-per-second limit),
 * so this property is not theoretical.
 *
 * Usage: tsx scripts/backfill/index.ts <year> [--skip-crawl]
 */

interface PendingIssue {
  id: string;
  year: number;
  number: number;
  published_at: string | Date;
  pdf_url: string;
  raw_index_html: string | null;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

async function main() {
  const year = Number(process.argv[2]);
  if (!Number.isInteger(year)) {
    throw new Error('Kullanım: tsx scripts/backfill/index.ts <yıl> [--skip-crawl]');
  }

  const skipCrawl = process.argv.includes('--skip-crawl');
  const runId = await startRun('backfill', year);
  const errors: unknown[] = [];

  let issuesSeen = 0;
  let issuesNew = 0;
  let recordsNew = 0;

  const topics = new Set<string>();
  const entities = new Set<string>();
  const issues: Array<{ year: number; number: number }> = [];

  try {
    if (skipCrawl) {
      log.info('arşiv taraması atlandı', { year });
    } else {
      const crawl = await crawlYear(year);
      issuesSeen = crawl.seen;
      issuesNew = crawl.inserted;
    }

    /*
     * Only 'pending'. The retry queue (failed/needs_review) is deliberately
     * EXCLUDED: those have a waiting period and an attempt counter (spec 7.2),
     * and that logic is `daily`'s job. Backfill's job is to finish the ones that
     * have never been tried.
     */
    const pending = await sql<PendingIssue[]>`
      select id, year, number, published_at, pdf_url, raw_index_html
        from issues
       where year = ${year}
         and text_status = 'pending'
       order by number asc
    `;

    log.info('backfill başlıyor', { year, pending: pending.length });

    let done = 0;

    for (const issue of pending) {
      try {
        const result = await processIssue({
          id: Number(issue.id),
          year: issue.year,
          number: issue.number,
          publishedAt: toIso(issue.published_at),
          pdfUrl: issue.pdf_url,
          rawIndexHtml: issue.raw_index_html,
        });

        recordsNew += result.recordsWritten;
        for (const topic of result.topics) topics.add(topic);
        for (const entity of result.entities) entities.add(entity);
        issues.push({ year: issue.year, number: issue.number });
      } catch (error) {
        /*
         * One issue blowing up does not stop the backfill. The archive contains
         * dead PDF links (2018 issue 130 -> HTTP 404); abandoning the remaining
         * 261 issues over one 404 would be wrong. The error is recorded and the
         * run gets a 'failed' stamp at the end.
         */
        log.error('sayı işlenemedi', {
          year: issue.year,
          number: issue.number,
          message: String(error),
        });
        errors.push(toErrorEntry('backfill-issue', error, { year: issue.year, number: issue.number }));
      }

      done += 1;
      // It runs for a long time; progress has to be visible or a hang looks identical.
      if (done % 10 === 0 || done === pending.length) {
        log.info('ilerleme', { done, total: pending.length, recordsNew, errors: errors.length });
      }
    }

    await triggerRevalidate({ topics: [...topics], entities: [...entities], issues });

    await finishRun(runId, errors.length ? 'failed' : 'ok', { issuesSeen, issuesNew, recordsNew }, errors);
    log.info('backfill bitti', { year, issuesSeen, issuesNew, recordsNew, errors: errors.length });
  } catch (error) {
    errors.push(toErrorEntry('backfill', error));
    await finishRun(runId, 'failed', { issuesSeen, issuesNew, recordsNew }, errors);
    throw error;
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  log.error('backfill başarısız', { message: String(error) });
  process.exit(1);
});
