import { crawlYear } from '../crawl-archive';
import { processIssue } from '../parse-records';
import { triggerRevalidate } from '../revalidate';
import { closeDb, finishRun, sql, startRun } from '../shared/db';
import { log, toErrorEntry } from '../shared/logger';

/**
 * Daily ingest — runs the nine stages of spec 7.1 in order.
 *
 * The stages can also be run individually; this file ties them into a single
 * job for GitHub Actions. All of it is idempotent, so re-running does no harm.
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
  const year = Number(process.argv[2]) || new Date().getFullYear();
  const runId = await startRun('daily', year);
  const errors: unknown[] = [];

  let issuesSeen = 0;
  let issuesNew = 0;
  let recordsNew = 0;

  const topics = new Set<string>();
  const entities = new Set<string>();
  const issues: Array<{ year: number; number: number }> = [];

  try {
    const crawl = await crawlYear(year);
    issuesSeen = crawl.seen;
    issuesNew = crawl.inserted;

    /*
     * Unprocessed issues and the retry queue (spec 7.2) together. Retrying stops
     * after 3 attempts; trying to download the same broken PDF forever costs
     * both runner minutes and load on the source site.
     */
    const pending = await sql<PendingIssue[]>`
      select id, year, number, published_at, pdf_url, raw_index_html
        from issues
       where year = ${year}
         and (
           text_status = 'pending'
           or (text_status in ('failed','needs_review') and retry_count < 3
               and updated_at < now() - interval '30 days')
         )
       order by published_at desc
       limit 40
    `;

    log.info('işlenecek sayı', { count: pending.length, year });

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
        log.error('sayı işlenemedi', {
          year: issue.year,
          number: issue.number,
          message: String(error),
        });
        errors.push(toErrorEntry('process-issue', error, { year: issue.year, number: issue.number }));
      }
    }

    /*
     * Revalidation — spec 11.2. EVERY affected tag is refreshed, not just the
     * home page. The home page saying "3 new records" while the topic page says
     * "no records" destroys the product's credibility in one go.
     */
    await triggerRevalidate({
      topics: [...topics],
      entities: [...entities],
      issues,
    });

    await finishRun(runId, errors.length ? 'failed' : 'ok', { issuesSeen, issuesNew, recordsNew }, errors);
    log.info('günlük ingest bitti', { issuesSeen, issuesNew, recordsNew, errors: errors.length });
  } catch (error) {
    errors.push(toErrorEntry('daily', error));
    await finishRun(runId, 'failed', { issuesSeen, issuesNew, recordsNew }, errors);
    throw error;
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  log.error('daily ingest başarısız', { message: String(error) });
  process.exit(1);
});
