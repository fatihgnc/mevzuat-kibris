/*
 * Yeniden çıkarım — mevcut kayıtların gövdelerini güncel hatla yeniden üretir.
 *
 * NEDEN AYRI BİR SÜRÜCÜ
 * `backfill` yalnızca `text_status = 'pending'` sayıları işliyor; arşivdeki
 * sayılar `extracted`/`ocr` olduğu için ona dokunmuyor. Bu script hedefi
 * açıkça seçiyor.
 *
 * NEDEN ŞİMDİ
 *   - 20 KB tavanı kalktı (migration 0011): 590 kaydın kesilen metni geri
 *     gelecek, ölçülen 20.365.804 karakter.
 *   - Anchor toleransı eklendi: ölçümde 2.818 kaydın (%16,3) gövdesi yoktu,
 *     çünkü sayfada "U(K-I)" / "O(K-I)" / "Ü(K-1)" yazıyordu.
 *
 * GÜVENLİK KURALLARI (ürün sahibinin koydukları)
 *   1. KURU ÇALIŞTIRMA VARSAYILAN. `--apply` olmadan tek satır yazılmaz.
 *   2. Eski gövde `record_body_backup`'a alınır, sonra üzerine yazılır.
 *   3. Kötüleşen kayıt geri alınır ve sayısı raporlanır.
 *   4. Partiler hâlinde ilerler, checkpoint tutar, kaldığı yerden devam eder.
 *   5. Takipçilere bildirim GÖNDERİLMEZ — `dispatch-alerts` çağrılmaz.
 *      Revalidate sona bırakılır ve yalnızca `--apply` ile çalışır.
 *
 * Kullanım:
 *   tsx scripts/reextract/index.ts --limit 50              (kuru)
 *   tsx scripts/reextract/index.ts --limit 50 --apply      (yazar)
 *   tsx scripts/reextract/index.ts --apply                 (hepsi)
 */
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { sql, closeDb } from '../shared/db';
import { log } from '../shared/logger';
import { processIssue } from '../parse-records';
import { triggerRevalidate } from '../revalidate';

const APPLY = process.argv.includes('--apply');
const RUN_LABEL = process.env.REEXTRACT_LABEL ?? new Date().toISOString().slice(0, 16);
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;
const OUT = process.env.REEXTRACT_OUT ?? join(process.cwd(), '.reextract');
const DONE = join(OUT, 'done.txt');
const REPORT = join(OUT, 'report.jsonl');
const SKIPPED = join(OUT, 'skipped.txt');

/** Sayı başına sert bütçe. Aşan sayı atlanır ve listeye yazılır. */
const ISSUE_BUDGET_MS = Number(process.env.ISSUE_BUDGET_MIN ?? 20) * 60_000;

/** Ağ kaynaklı, geçici veritabanı hatası mı? */
function isTransientDbError(error: unknown): boolean {
  return /ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|CONNECTION_CLOSED|CONNECTION_ENDED|socket hang up/i
    .test(String(error));
}

/*
 * Gece koşumu DNS düşmesinden bir kez öldü: postgres.js bağlantıyı 30 sn boşta
 * kalınca kapatıyor, uzun bir sayıdan sonra yeni bağlantı yeni DNS sorgusu
 * demek ve o ara sıra patlıyor. `politeFetch` yeniden deniyordu, veritabanı
 * sorgusu denemiyordu.
 */
async function dbRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const backoff = [2_000, 5_000, 15_000, 30_000, 60_000];
  let last: unknown;
  for (let i = 0; i <= backoff.length; i += 1) {
    try { return await fn(); } catch (e) {
      last = e;
      if (!isTransientDbError(e) || i === backoff.length) break;
      log.warn('DB geçici hata, yeniden denenecek', { label, ms: backoff[i] });
      await new Promise((r) => setTimeout(r, backoff[i]!));
    }
  }
  throw last;
}

/** Sert zaman aşımı. Alt süreçler (ocrmypdf) execFile timeout'uyla ayrıca sınırlı. */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(new Error(`BÜTÇE AŞILDI: ${label} (${ms / 60000} dk)`)), ms);
    p.then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); });
  });
}

/** Yeni gövde eskisinden bu oranın altına düşerse kötüleşme sayılır. */
const SHRINK_LIMIT = 0.9;
/** 20 KB tavanının kestiği kayıtların imzası — bunlarda büyüme beklenir. */
const wasTruncated = (len: number) => len >= 18380 && len <= 18432;

interface Row { id: string; body_text: string | null; page_from: number | null }

function toIso(v: unknown): string {
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const done = new Set(
    existsSync(DONE)
      ? (await readFile(DONE, 'utf8')).split('\n').map((l) => l.trim()).filter(Boolean)
      : [],
  );

  if (!APPLY) log.warn('KURU ÇALIŞTIRMA — hiçbir şey yazılmayacak (--apply ile yazar)');

  const issues = await sql<Array<{
    id: string; year: number; number: number; published_at: unknown;
    pdf_url: string; raw_index_html: string | null;
  }>>`
    select id, year, number, published_at, pdf_url, raw_index_html
      from issues
     where pdf_url not like '%arsiv.basimevi%'   -- o host 503 veriyor
     order by year desc, number desc
  `;

  let seen = 0, buyuyen = 0, kotulesen = 0, geriAlinan = 0, dokunulmayan = 0, atlanan = 0;
  let kazanilanKarakter = 0;
  const degisenIssue: Array<{ year: number; number: number }> = [];

  for (const issue of issues) {
    if (done.has(String(issue.id))) continue;
    if (seen >= LIMIT) break;
    seen += 1;

    // 1. ÖNCE: mevcut gövdeleri oku (kuru koşumda da lazım, karşılaştırma için)
    const once = await dbRetry(() => sql<Row[]>`
      select id, body_text, page_from from records where issue_id = ${issue.id}
    `, 'once');
    const oncekiler = new Map(once.map((r) => [String(r.id), r]));

    if (!APPLY) {
      // Kuru koşum: yazmadan ne olacağını göremeyiz, çünkü processIssue yazıyor.
      // Bu yüzden kuru modda yalnızca hedefi listeliyoruz.
      log.info('kuru: işlenecek', { sayi: `${issue.year}/${issue.number}`, kayit: once.length });
      await appendFile(REPORT, JSON.stringify({
        dry: true, issue: `${issue.year}/${issue.number}`, records: once.length,
      }) + '\n', 'utf8');
      continue;
    }

    // 2. YEDEK — üzerine yazmadan önce.
    await sql`
      insert into record_body_backup (record_id, body_text, page_from, run_label)
      select id, body_text, page_from, ${RUN_LABEL} from records where issue_id = ${issue.id}
      on conflict (record_id) do nothing
    `;

    // 3. Üretim yolunun kendisi. Ayrı bir kopya yazmıyoruz ki davranış ayrışmasın.
    try {
      await withTimeout(processIssue({
        id: Number(issue.id),
        year: issue.year,
        number: issue.number,
        publishedAt: toIso(issue.published_at),
        pdfUrl: issue.pdf_url,
        rawIndexHtml: issue.raw_index_html,
      }), ISSUE_BUDGET_MS, `sayı ${issue.year}/${issue.number}`);
    } catch (error) {
      /*
       * Bir sayı bütün koşumu durdurmaz. Bütçeyi aşan ya da patlayan sayı
       * atlananlar listesine yazılır; gövdeler yedekten zaten korunuyor ve
       * `processIssue` yarıda kaldıysa aşağıdaki karşılaştırma kötüleşenleri
       * geri alır.
       */
      atlanan += 1;
      log.error('sayı atlandı', {
        sayi: `${issue.year}/${issue.number}`, sebep: String(error).slice(0, 160),
      });
      await appendFile(
        SKIPPED,
        [issue.year + '/' + issue.number, String(error).slice(0, 200)].join('\t') + '\n',
        'utf8',
      );
    }

    // 4. SONRA: karşılaştır, kötüleşeni geri al.
    const sonra = await dbRetry(() => sql<Row[]>`
      select id, body_text, page_from from records where issue_id = ${issue.id}
    `, 'sonra');
    let issueDegisti = false;
    for (const yeni of sonra) {
      const eski = oncekiler.get(String(yeni.id));
      if (!eski) continue;
      const eskiLen = eski.body_text?.length ?? 0;
      const yeniLen = yeni.body_text?.length ?? 0;
      if (eskiLen === yeniLen) { dokunulmayan += 1; continue; }

      const kayip = eskiLen > 0 && yeniLen < eskiLen * SHRINK_LIMIT;
      if (kayip && !wasTruncated(eskiLen)) {
        // Kötüleşti — eski metni geri yaz.
        await sql`
          update records set body_text = ${eski.body_text}, page_from = ${eski.page_from}
           where id = ${yeni.id}
        `;
        kotulesen += 1; geriAlinan += 1;
        log.warn('kayıt kötüleşti, geri alındı', {
          id: String(yeni.id), eski: eskiLen, yeni: yeniLen,
        });
      } else if (yeniLen > eskiLen) {
        buyuyen += 1; kazanilanKarakter += yeniLen - eskiLen; issueDegisti = true;
      } else {
        dokunulmayan += 1;
      }
    }
    if (issueDegisti) degisenIssue.push({ year: issue.year, number: issue.number });

    await appendFile(REPORT, JSON.stringify({
      issue: `${issue.year}/${issue.number}`, buyuyen, kotulesen,
    }) + '\n', 'utf8');
    await appendFile(DONE, String(issue.id) + '\n', 'utf8');
    log.info('sayı yeniden çıkarıldı', {
      sayi: `${issue.year}/${issue.number}`, buyuyen, geriAlinan,
    });
  }

  log.info('BİTTİ', {
    islenenSayi: seen, buyuyenKayit: buyuyen, kotulesenKayit: kotulesen,
    geriAlinan, dokunulmayan, atlanan, kazanilanKarakter,
  });

  /*
   * Revalidate en sonda ve yalnızca yazma modunda. Alarm gönderimi (
   * `dispatch-alerts`) BİLEREK çağrılmıyor: bu bir yeniden işleme, yeni yayın
   * değil; takipçilere eski kararlar için e-posta gitmemeli.
   */
  if (APPLY && degisenIssue.length) {
    await triggerRevalidate({ issues: degisenIssue, topics: [], entities: [] });
    log.info('revalidate tetiklendi', { sayi: degisenIssue.length });
  }
}

main()
  .catch((error) => { log.error('yeniden çıkarım başarısız', { message: String(error) }); process.exitCode = 1; })
  .finally(() => closeDb());
