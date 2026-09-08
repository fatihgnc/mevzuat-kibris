/*
 * KURU yeniden çıkarım + sayfa bazlı kalite ölçümü.
 *
 * VERİTABANINA HİÇBİR ŞEY YAZMAZ. Yalnızca `select` yapar; bütün sonuçlar
 * JSONL olarak diske düşer. `processIssue` (yazan fonksiyon) çağrılmaz.
 *
 * NE ÖLÇER
 *   1. 20 KB tavanının kestiği 670 kaydın gövdesi tam çıkarıldığında ne
 *      kadar metin geri geliyor (tavan artık parse-records'ta yok).
 *   2. İndirilen her sayının SAYFA bazlı kalite dağılımı (rg_teshis.py) —
 *      §6'daki A/B/C/D kararının tıkandığı ölçüm.
 *
 * NEDEN OCR YOK
 *   Handoff'ta ölçülmüş: tek bir sayı OCR yüzünden 2 saat 5 dakika sürdü ve
 *   sayı başına üst sınır yoktu. Bu koşumun amacı ölçmek, kurtarmak değil.
 *   Metin katmanı kötü olan sayı "kötü" diye kaydedilir ve geçilir.
 *
 * TAKILMAMA GARANTİLERİ
 *   - Her alt sürece ayrı zaman aşımı (indirme / pdfminer / teşhis)
 *   - Sayı başına sert bütçe; aşılırsa sayı `timeout` işaretlenip geçilir
 *   - Genel duvar saati bütçesi; dolunca temiz kapanış + özet
 *   - Checkpoint: çöker veya durdurulursa kaldığı yerden devam eder
 *   - PDF işlendikten sonra silinir (spec 3.6), disk sabit kalır
 */
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile, readFile, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { sql, closeDb } from '../shared/db';
import { politeFetch } from '../shared/http';
import { decodeCidText } from '../extract-text/cid';
import { parseIndexTable, parseIndexCell, bodyAnchor, extractBody } from '../parse-records/parser';
import { stripHtml } from '../parse-records/index';

const run = promisify(execFile);

const OUT_DIR = process.env.DRY_OUT ?? join(process.cwd(), '.dry-reextract');
const RESULTS = join(OUT_DIR, 'results.jsonl');
const DONE = join(OUT_DIR, 'done.txt');
const LOG = join(OUT_DIR, 'run.log');

const DOWNLOAD_MS = 90_000;
const PDFMINER_MS = 120_000;
const DIAGNOSE_MS = 90_000;
const PER_ISSUE_MS = 300_000;
const WALL_CLOCK_MS = Number(process.env.DRY_HOURS ?? 7) * 3_600_000;
/** Sayı arası ek bekleme. politeFetch'in 1 sn'lik aralığı gündüz yetmedi. */
const GAP_MS = Number(process.env.DRY_GAP_MS ?? 0);

const startedAt = Date.now();
const left = () => WALL_CLOCK_MS - (Date.now() - startedAt);

async function log(line: string): Promise<void> {
  const stamped = `${new Date().toISOString()} ${line}`;
  console.log(stamped);
  await appendFile(LOG, stamped + '\n', 'utf8').catch(() => {});
}

/** Bir söze sert zaman aşımı takar. Alt süreç ayrıca kendi kill'ini taşır. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ZAMAN AŞIMI: ${label} (${ms}ms)`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/** Üretimdeki birincil yol: pdfminer + cid çözme. OCR yedeği bilerek yok. */
async function pdfminerText(path: string): Promise<string | null> {
  const script = join(process.cwd(), 'scripts', 'extract-text', 'pdf_text.py');
  for (const python of ['python3', 'python']) {
    try {
      const { stdout } = await run(python, [script, path], {
        maxBuffer: 128 * 1024 * 1024,
        encoding: 'utf8',
        timeout: PDFMINER_MS,
        killSignal: 'SIGKILL',
      });
      return decodeCidText(stdout);
    } catch {
      /* sonraki yorumlayıcı adı */
    }
  }
  return null;
}

interface PageRow { page: number; cls: string; lex: number; chars: number }

async function diagnosePages(pdfPath: string): Promise<PageRow[] | null> {
  const script = join(process.cwd(), 'scripts', 'rg_teshis.py');
  for (const python of ['python3', 'python']) {
    try {
      const { stdout } = await run(python, [script, pdfPath, '--json'], {
        maxBuffer: 64 * 1024 * 1024,
        encoding: 'utf8',
        timeout: DIAGNOSE_MS,
        killSignal: 'SIGKILL',
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
      });
      const parsed = JSON.parse(stdout) as Array<{ report: PageRow[] }>;
      return parsed[0]?.report ?? null;
    } catch {
      /* sonraki yorumlayıcı adı */
    }
  }
  return null;
}

interface IssueRow {
  id: number; year: number; number: number; pdf_url: string; raw_index_html: string | null;
}

/** Ağ kaynaklı, geçici veritabanı hatası mı? */
function isTransientDbError(error: unknown): boolean {
  const s = String(error);
  return /ENOTFOUND|EAI_AGAIN|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|CONNECTION_CLOSED|CONNECTION_ENDED|socket hang up/i.test(s);
}

class DbDownError extends Error {}

/*
 * Handoff §2.5'in dersi: `politeFetch` yeniden deniyor, veritabanı sorgusu
 * denemiyordu. İlk gece koşumu tam olarak buradan öldü —
 * `getaddrinfo ENOTFOUND ...pooler.supabase.com`. postgres.js bağlantıyı 30 sn
 * boşta kalınca kapatıyor (idle_timeout: 30); uzun süren bir sayıdan sonra
 * yeni bağlantı yeni DNS sorgusu demek ve o ara sıra düşüyor.
 */
async function withDbRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const backoff = [2_000, 5_000, 15_000, 30_000, 60_000];
  let lastError: unknown;
  for (let attempt = 0; attempt <= backoff.length; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === backoff.length) break;
      const wait = backoff[attempt]!;
      await log(`DB geçici hata (${label}), ${wait / 1000}s sonra yeniden: ${String(error).slice(0, 90)}`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  if (isTransientDbError(lastError)) throw new DbDownError(String(lastError));
  throw lastError;
}

async function handleIssue(issue: IssueRow, dbBodies: Map<string, { id: string; len: number }>) {
  const dir = await mkdtemp(join(tmpdir(), 'mk-dry-'));
  const pdfPath = join(dir, 'input.pdf');
  try {
    const res = await withTimeout(
      politeFetch(issue.pdf_url, { timeoutMs: DOWNLOAD_MS }), DOWNLOAD_MS + 15_000, 'indirme');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(pdfPath, Buffer.from(await res.arrayBuffer()));

    const pdfText = await pdfminerText(pdfPath);
    if (!pdfText) throw new Error('pdfminer metin veremedi');

    // Sayfa kalitesi gece koşumunda bütün arşiv için ölçüldü; SKIP_PAGES=1 ile
    // tekrar ölçülmüyor. Sayı başına 2 pdftotext + 1 pymupdf çağrısı eder.
    const pages = process.env.SKIP_PAGES === '1' ? null : await diagnosePages(pdfPath);

    const rawIndex = issue.raw_index_html ?? '';
    const fromTable = parseIndexTable(rawIndex);
    const parsed = fromTable?.length ? fromTable : parseIndexCell(stripHtml(rawIndex));
    const allAnchors = parsed
      .map((p) => bodyAnchor(p.refType, p.refNumber))
      .filter((l): l is string => Boolean(l));

    // Kuyruk bir kez hesaplanıyor: `ranToEof` kontrolü kayıt başına TÜM metni
    // kopyalıyordu (311 kayıtlı, 2 MB metinli bir sayıda kayıt başına 2 MB).
    // Gövde zaten trim'li döndüğü için son 200 karakteri karşılaştırmak yeter.
    const eofTail = pdfText.trimEnd().slice(-200);
    const records = parsed.map((rec) => {
      const anchor = bodyAnchor(rec.refType, rec.refNumber);
      const { body, pageFrom } = extractBody(pdfText, anchor, allAnchors.filter((l) => l !== anchor));
      const key = `${rec.refType ?? ''}|${rec.refNumber ?? ''}`;
      const db = dbBodies.get(key);
      const newLen = body?.length ?? 0;
      const oldLen = db?.len ?? 0;

      /*
       * FAIL-CLOSED ÖLÇÜMÜ — asıl sorulan soru.
       *
       * `extractBody` bitiş çapasını bulup bulmadığını söylemiyor; bulamayınca
       * `end = pdfText.length` yapıyor. Dolayısıyla gövde PDF metninin SONUNA
       * kadar gidiyorsa bitiş çapası bulunamamış demektir.
       *
       * Bu, "çok kayıtlı sayıda güvenilir sınır yoksa gövde verme" kuralının
       * kaç kaydın gövdesini alacağını verir. O sayı bilinmeden kural
       * onaylanamaz.
       */
      const startFound = body !== null;
      const ranToEof =
        startFound && body!.length >= eofTail.length && body!.endsWith(eofTail);

      return {
        ref: key, anchor, pageFrom,
        dbRecordId: db?.id ?? null,
        oldLen, newLen, delta: newLen - oldLen,
        // Tavanın kestiği kayıtların imzası
        wasTruncated: oldLen >= 18380 && oldLen <= 18432,
        startFound,
        // bitiş çapası bulunamadı
        ranToEof,
      };
    });

    /*
     * SAYISAL BOZULMA SİNYALİ — kayıt 76569 (2026/167, A.E. 818) yüzünden.
     * Harfleri temiz, rakamları bozuk: "%3.04" → "903.04", "2015=100" →
     * "20152100". Türkçe düzyazı sağlam olduğu için `estimateQuality` 0,964
     * veriyor ve sayfa sınıflandırıcısı da "OK" diyor — ikisi de harflere
     * bakıyor. İstatistik, kur ve bütçe belgelerinde asıl içerik rakam.
     *
     * Burada tespit YAPMIYORUZ, yalnızca ham sayaçları kaydediyoruz: PDF'leri
     * saklamadığımız için ölçüyü sonradan geliştirmek yeniden indirme demek.
     * Veriyi şimdi topla, dedektörü çevrimdışı yaz.
     */
    const numTokens = pdfText.match(/\S*\d\S*/g) ?? [];
    const numeric = {
      tokens: numTokens.length,
      // rakama bitişik tırnak/kırık noktalama: "637.70, 20152100
      odd: numTokens.filter((t) => /[“”"'`^~|]/.test(t)).length,
      // harf-rakam karışık token
      mixed: numTokens.filter((t) => /\p{L}/u.test(t)).length,
      // 5+ haneli ondalıksız sayı — birleşmiş rakam dizisi şüphesi
      long: numTokens.filter((t) => /^\d{5,}$/.test(t)).length,
    };

    const recovered = records.filter((r) => r.wasTruncated);
    return {
      ok: true as const,
      issue: `${issue.year}/${issue.number}`, issueId: issue.id,
      numeric,
      pages: pages?.length ?? null,
      pageQuality: pages
        ? {
            ok: pages.filter((p) => p.cls === 'OK').length,
            A: pages.filter((p) => p.cls === 'A').length,
            B: pages.filter((p) => p.cls === 'B').length,
            C: pages.filter((p) => p.cls === 'C').length,
            D: pages.filter((p) => p.cls === 'D').length,
          }
        : null,
      pageDetail: pages,
      recordCount: records.length,
      truncatedFixed: recovered.length,
      charsRecovered: recovered.reduce((a, r) => a + Math.max(0, r.delta), 0),
      records,
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  /*
   * `.trim()` ŞART. Checkpoint dosyası elle yeniden yazıldığında (ulaşılamayan
   * issue'ları ayıklamak için) Windows satır sonuyla `\r\n` yazılabiliyor;
   * `split('\n')` sonda `\r` bırakıyor ve hiçbir kayıt eşleşmiyordu. Sonuç
   * sessizdi: koşum "656 sayı atlanacak" deyip hepsini baştan işliyordu.
   */
  const done = new Set(
    existsSync(DONE)
      ? (await readFile(DONE, 'utf8')).split('\n').map((l) => l.trim()).filter(Boolean)
      : [],
  );
  await log(`BAŞLIYOR — tamamlanmış ${done.size} sayı atlanacak, bütçe ${(WALL_CLOCK_MS / 3.6e6).toFixed(1)} saat`);

  // FAZ 1: kesilmiş kayıt taşıyan sayılar. FAZ 2: kalan her şey, yeniden eskiye.
  const phase1 = await withDbRetry(() => sql<IssueRow[]>`
    select distinct i.id, i.year, i.number, i.pdf_url, i.raw_index_html
      from issues i join records r on r.issue_id = i.id
     where length(r.body_text) between 18380 and 18432
     order by i.year desc, i.number desc`, 'faz1 kuyruğu');
  const phase2 = await withDbRetry(() => sql<IssueRow[]>`
    select i.id, i.year, i.number, i.pdf_url, i.raw_index_html
      from issues i
     where not exists (
       select 1 from records r where r.issue_id = i.id
        and length(r.body_text) between 18380 and 18432)
     order by i.year desc, i.number desc`, 'faz2 kuyruğu');

  const queue = [...phase1, ...phase2];
  await log(`kuyruk: faz1 ${phase1.length} (kesilmiş) + faz2 ${phase2.length} = ${queue.length}`);

  let okCount = 0, failCount = 0, fixedTotal = 0, charsTotal = 0;
  let dbDownStreak = 0;
  /*
   * SİGORTA. Kaynak devlet sunucusu; art arda hata almak "bize kızdı"
   * demektir, ısrar etmek hem veri getirmez hem zarar verir. 5 arka arkaya
   * hatada yavaşla, 25'te temiz dur.
   */
  let failStreak = 0;

  for (const issue of queue) {
    if (left() < 120_000) { await log('duvar saati bütçesi doldu, temiz kapanış'); break; }
    if (GAP_MS) await new Promise((r) => setTimeout(r, GAP_MS));
    const key = String(issue.id);
    if (done.has(key)) continue;

    let record: unknown;
    try {
      const bodies = await withDbRetry(() => sql<Array<{ id: string; ref_type: string | null; ref_number: string | null; len: number }>>`
        select id, ref_type, ref_number, coalesce(length(body_text), 0) as len
          from records where issue_id = ${issue.id}`, `gövdeler ${issue.year}/${issue.number}`);
      const map = new Map(bodies.map((b) => [`${b.ref_type ?? ''}|${b.ref_number ?? ''}`, { id: b.id, len: Number(b.len) }]));

      record = await withTimeout(handleIssue(issue, map), PER_ISSUE_MS, `sayı ${issue.year}/${issue.number}`);
      const r = record as { truncatedFixed: number; charsRecovered: number; pageQuality: Record<string, number> | null };
      okCount += 1; fixedTotal += r.truncatedFixed; charsTotal += r.charsRecovered;
      const q = r.pageQuality;
      await log(`✓ ${issue.year}/${issue.number} kesik-onarilan=${r.truncatedFixed} +${r.charsRecovered} kar` +
        (q ? ` sayfa[OK ${q.ok} A ${q.A} B ${q.B} C ${q.C} D ${q.D}]` : ''));
    } catch (error) {
      /*
       * Veritabanı düştüyse sayıyı TAMAMLANDI diye işaretleme — yoksa DNS
       * birkaç dakika bozukken bütün kuyruk "hatalı" damgasıyla tükenirdi.
       * Bekle, aynı sayıya sonra dön.
       */
      if (error instanceof DbDownError) {
        dbDownStreak += 1;
        await log(`DB erişilemiyor (üst üste ${dbDownStreak}) — ${issue.year}/${issue.number} işaretlenmedi, 2 dk sonra devam`);
        if (dbDownStreak >= 10) { await log('DB üst üste 10 kez düştü, temiz kapanış'); break; }
        await new Promise((r) => setTimeout(r, 120_000));
        continue;
      }
      failCount += 1;
      failStreak += 1;
      record = { ok: false, issue: `${issue.year}/${issue.number}`, issueId: issue.id, error: String(error).slice(0, 300) };
      await log(`✗ ${issue.year}/${issue.number} ${String(error).slice(0, 140)}`);
      if (failStreak >= 25) {
        await log('art arda 25 hata — kaynak sunucu bizi kısıtlıyor olmalı, temiz duruluyor');
        await appendFile(RESULTS, JSON.stringify(record) + '\n', 'utf8');
        break;
      }
      if (failStreak >= 5) {
        const wait = Math.min(60_000, 5_000 * (failStreak - 4));
        await log(`art arda ${failStreak} hata, ${wait / 1000}s yavaşlama`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }

    dbDownStreak = 0;
    if ((record as { ok?: boolean }).ok) failStreak = 0;
    await appendFile(RESULTS, JSON.stringify(record) + '\n', 'utf8');
    /*
     * YALNIZCA BAŞARILI SAYI checkpoint'lenir.
     *
     * Önceki sürüm hatalı sayıyı da "tamamlandı" yazıyordu. Kaynak sunucu
     * gündüz yükü altında bizi kısıtlayınca 440 sayı arka arkaya düştü ve
     * hepsi kalıcı işaretlendi — bir daha hiç denenmeyeceklerdi. Handoff'un
     * backfill sürücüsü bunu doğru yapıyor: düşenleri ikinci geçiş toplar.
     */
    if ((record as { ok?: boolean }).ok) await appendFile(DONE, key + '\n', 'utf8');
  }

  await log(`BİTTİ — başarılı ${okCount}, hatalı ${failCount}, onarılan kesik kayıt ${fixedTotal}, geri gelen ${charsTotal} karakter`);
  await log(`sonuçlar: ${RESULTS}`);
}

main()
  .catch(async (error) => { await log(`ÖLÜMCÜL: ${String(error)}`); process.exitCode = 1; })
  .finally(() => closeDb());
