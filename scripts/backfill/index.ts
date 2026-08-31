import { crawlYear } from '../crawl-archive';
import { processIssue } from '../parse-records';
import { triggerRevalidate } from '../revalidate';
import { closeDb, finishRun, sql, startRun } from '../shared/db';
import { log, toErrorEntry } from '../shared/logger';

/**
 * Geriye dönük doldurma — bir yılın TÜM işlenmemiş sayılarını işler.
 *
 * `daily`'den farkı iki tane, ikisi de kasıtlı:
 *
 * 1. Sayı sınırı yok. `daily` çalıştırma başına 40 sayıyla sınırlı çünkü
 *    GitHub Actions runner dakikası ölçülü harcanmalı ve günlük iş zaten
 *    birkaç sayı. Bir yılın tamamı (2025'te 262 sayı) o sınırla ancak 7
 *    çalıştırmada biter ve her çalıştırma arşiv sayfasını yeniden çeker —
 *    kaynak siteye 6 gereksiz istek. Backfill arşivi bir kez tarar.
 *
 * 2. `ingest_runs.kind = 'backfill'`. Şema bu türü baştan tanımlıyordu
 *    (0003-core-tables.sql) ama betiği yazılmamıştı.
 *
 * KESİLEBİLİR. Yalnızca `text_status = 'pending'` olanları seçiyor ve her
 * sayıyı işledikten sonra durumunu yazıyor; yarıda kesilirse yeniden
 * çalıştırmak kaldığı yerden devam eder, baştan başlamaz. Uzun sürüyor
 * (sayı başına bir PDF indirmesi + saniyede bir istek sınırı), o yüzden bu
 * özellik teorik değil.
 *
 * Kullanım: tsx scripts/backfill/index.ts <yıl> [--skip-crawl]
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
     * Yalnızca 'pending'. Yeniden deneme kuyruğu (failed/needs_review)
     * bilerek DIŞARIDA: onların bekleme süresi ve deneme sayacı var
     * (spec 7.2) ve o mantık `daily`'nin işi. Backfill'in işi hiç
     * denenmemişleri bitirmek.
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
         * Tek sayının patlaması backfill'i durdurmuyor. Arşivde ölü PDF
         * bağlantısı var (2018 sayı 130 → HTTP 404); bir 404 yüzünden
         * kalan 261 sayıdan vazgeçmek yanlış olur. Hata kaydediliyor ve
         * çalıştırma sonunda 'failed' damgası alıyor.
         */
        log.error('sayı işlenemedi', {
          year: issue.year,
          number: issue.number,
          message: String(error),
        });
        errors.push(toErrorEntry('backfill-issue', error, { year: issue.year, number: issue.number }));
      }

      done += 1;
      // Uzun sürüyor; ilerleme görünür olmalı yoksa takıldı mı belli olmuyor.
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
