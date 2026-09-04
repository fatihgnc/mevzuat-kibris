import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { politeFetch } from '../shared/http';
import { log } from '../shared/logger';

import { countCid, decodeCidText } from './cid';

const run = promisify(execFile);

/**
 * Stages 2-3 — download the PDF to a temp dir, extract its text, delete it.
 *
 * THE PDF IS NOT KEPT (spec 3.6). It lands in the runner's temp directory, the
 * text is extracted, and it is deleted when the job finishes. 20 years x ~250
 * issues x ~2 MB is roughly 10 GB; that will not fit on free infrastructure,
 * and keeping a copy of an already-public source adds nothing to the product.
 */

export type TextStatus = 'extracted' | 'ocr' | 'failed' | 'needs_review';

export interface ExtractionResult {
  text: string;
  pageCount: number | null;
  status: TextStatus;
  /** Null when there is not enough text to measure — "unknown", not "bad". */
  quality: number | null;
}

/** Threshold for calling an issue scanned — characters per page (spec 7.2). */
const SCANNED_THRESHOLD = 150;

/**
 * Scanned detection WITHOUT a page count: extracted text bytes over PDF bytes.
 *
 * Spec 7.2 measures characters per page, but `pdfinfo` is not installed in
 * every environment (it is missing on this machine) and without it
 * `pdfPageCount` returns null. In that case the old code fell back to dividing
 * `perPage` by the WHOLE text length; the 150 threshold never fired, so with no
 * page count the scanned check was effectively switched off.
 *
 * Measured on real 2025 issues:
 *
 *   issue 100   2.7 MB -> 12 KB text   0.45%   text PDF
 *   issue 262   3.2 MB ->  9 KB text   0.27%   text PDF
 *   issue 175  23.8 MB ->  2 KB text   0.01%   SCANNED (only the cover page
 *                                              carries a text layer)
 *
 * The gap is 27x, so 0.1% is a comfortable separator.
 *
 * This check is essential because `estimateQuality` CANNOT catch this failure:
 * the little text a scanned issue does yield (the cover page) is perfectly
 * clean Turkish, so quality comes back at 0.99. Quality measures how *correct*
 * the text is, not how *complete* it is. Without this check, scanned issues
 * were stored with an `extracted` stamp and a near-empty body — silent data
 * loss.
 */
const SCANNED_TEXT_RATIO = 0.001;

/**
 * Below this ratio an issue is marked "needs_review" (spec 7.2).
 *
 * VERIFIED AGAINST REAL OUTPUT (422 issues, 2025+2026). Measured distribution:
 *
 *   text PDFs    (383 issues)   0.596 - 0.999   average 0.979
 *   OCR output    (32 issues)   0.887 - 0.999   average 0.985
 *   broken text layer            0.246 - 0.545
 *
 * 0.55 sits exactly between the known-broken ceiling (0.545) and the
 * sound-text floor (0.596), so the threshold is where it belongs. An earlier
 * session noted it had been "set by guesswork"; measurement confirmed it, and
 * there is no reason to move it.
 *
 * Read this with the caveat, though: the threshold does NOT catch OCR FAILURE.
 * The floor of OCR output is 0.887, a full 0.33 above it. Quality measures how
 * *correct* the text is, not how *complete* — three clean Turkish lines off a
 * scanned issue's cover page also score 0.99. The only thing that catches
 * scannedness is `SCANNED_TEXT_RATIO`; this threshold is not a substitute.
 */
const QUALITY_THRESHOLD = 0.55;

/**
 * Minimum words needed before quality can be measured at all.
 *
 * Below it the measurement is MEANINGLESS: a single-decision issue may have a
 * body of 8-10 words, and over that few samples the ratio is pure noise.
 * Treating that as "quality 0" caused a real bug: 2025 issue 59 (one record,
 * short text) scored 0, was stamped `needs_review`, entered the retry queue,
 * and had its PDF re-downloaded every 30 days for the same result — forever,
 * and at the source site's expense.
 *
 * Unmeasurable quality is `null`. "I don't know" and "bad" are different
 * things, and the database can tell them apart (text_quality is nullable).
 */
const MIN_WORDS_FOR_QUALITY = 20;

/**
 * Turkish dictionary ratio. Instead of a full dictionary we use character and
 * suffix statistics of Turkish text: the clearest signal of OCR corruption is
 * words containing letter sequences that are impossible in Turkish.
 *
 * Returns `null` when there are too few words to measure — see
 * MIN_WORDS_FOR_QUALITY.
 */
export function estimateQuality(text: string): number | null {
  const words = text
    .toLocaleLowerCase('tr')
    .split(/[^a-zçğıöşü]+/)
    .filter((word) => word.length >= 3);

  if (words.length < MIN_WORDS_FOR_QUALITY) return null;

  let plausible = 0;

  for (const word of words) {
    const hasVowel = /[aeıioöuü]/.test(word);
    // Turkish never puts three consonants side by side; the clearest OCR damage.
    const tripleConsonant = /[bcçdfgğhjklmnprsştvyz]{4}/.test(word);
    // q, w and x do not exist in the Turkish alphabet.
    const foreignLetters = /[qwx]/.test(word);

    if (hasVowel && !tripleConsonant && !foreignLetters) plausible += 1;
  }

  return plausible / words.length;
}

/**
 * Corruption the quality score CANNOT see: a dropped dotted capital İ.
 *
 * Some source PDFs carry a text layer whose İ comes out as a lowercase "i" in
 * the middle of an otherwise capitalised word — "ÜRETiM", "iLAN", "ÖDENEKSiZ".
 * `estimateQuality` scores that text 0.98-0.99, because it looks for four
 * consonants in a row and a missing dot does not produce any. Measured across
 * 1,012 issues that hold a body:
 *
 *   clean                         463
 *   light   (<2 per 10k chars)    137
 *   medium  (2-10 per 10k)        228
 *   heavy   (>=10 per 10k)        184     quality still 0.985-0.997
 *
 * The pattern is CAPITAL + lowercase i + CAPITAL. Sampled against 400 random
 * bodies, every match was real damage (ÖĞRETMENLERiN, TARiH, BENZiN); Turkish
 * does not spell a word that way.
 */
const BROKEN_CAPITAL_I = /[A-ZÇĞÖŞÜ]{2,}i[A-ZÇĞÖŞÜ]/g;

/** Damaged words in the text. */
export function corruptionCount(text: string): number {
  return text.match(BROKEN_CAPITAL_I)?.length ?? 0;
}

/**
 * Word count, for comparing two readings of the SAME document. Digits count:
 * the loss that started this was a tender table, and its numbers are the part a
 * reader is looking for.
 */
export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
}

/** Damaged words per 10,000 characters. */
export function corruptionRate(text: string): number {
  if (!text.length) return 0;
  return (corruptionCount(text) * 10_000) / text.length;
}

/**
 * When to re-read a page that already has text — EITHER measure can fire.
 *
 * The rate alone was tried first and it missed the worst issues in the archive.
 * A long issue dilutes its own damage: 2025 issue 173 carries 102 damaged words
 * and still scores 3.1 per 10k across 334,000 characters, while a 500-character
 * issue with 4 damaged words scores 83. Measured over 1,012 issues:
 *
 *   0 damaged words        624
 *   1-4                    259
 *   5-9                     62
 *   10-14                   19
 *   15+                     48     <- the ones a reader actually notices
 *
 * So the rate catches short badly-damaged issues and the count catches long
 * ones. Neither subsumes the other; the trigger is the OR of the two.
 */
const CORRUPTION_RATE_THRESHOLD = 2;
const CORRUPTION_COUNT_THRESHOLD = 15;

function needsReread(text: string): boolean {
  return (
    corruptionRate(text) >= CORRUPTION_RATE_THRESHOLD ||
    corruptionCount(text) >= CORRUPTION_COUNT_THRESHOLD
  );
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await run(command, ['-v']);
    return true;
  } catch (error) {
    // For commands that do not support -v: anything other than ENOENT means it exists.
    return (error as NodeJS.ErrnoException).code !== 'ENOENT';
  }
}

async function pdfPageCount(path: string): Promise<number | null> {
  try {
    const { stdout } = await run('pdfinfo', [path]);
    const match = /Pages:\s+(\d+)/.exec(stdout);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * OCR mode — `--redo-ocr`, NOT `--skip-text`.
 *
 * `--skip-text` skips an ENTIRE page that carries any text. On scanned issues
 * every page has exactly one real text object: the page number. ocrmypdf sees
 * it, says "skipping all processing on this page" and moves on, which left the
 * whole scanned body un-OCR'd. Measured on a three-page slice of the real 2025
 * issue 12 (45 pages, 27.5 MB):
 *
 *   --skip-text  ->      18 characters   ("18 149 150 151", page numbers only)
 *   --redo-ocr   ->   7,873 characters   (clean Turkish, quality 0.999)
 *   --force-ocr  ->   7,898 characters   (same, ~2.6 s/page)
 *
 * `--redo-ocr` is preferred because it PRESERVES a genuine text layer: the
 * queue also holds issues that are part text and part scan, and rasterising
 * those would mean deliberately throwing away the good text we already have.
 *
 * `--force-ocr` stays as a fallback. `--redo-ocr` does not accept every PDF
 * (e.g. files whose existing text layer cannot be parsed, digitally signed
 * documents, mixed encodings); for those, rasterising the page and reading it
 * from scratch beats getting no text at all. Order matters: preserving first,
 * forcing second.
 */
const OCR_MODES = ['--redo-ocr', '--force-ocr'] as const;

/**
 * `modes` overrides the default order. The scanned path wants --redo-ocr first
 * (it preserves a genuine text layer); the corruption path wants --force-ocr,
 * because there the existing text layer is exactly what we are discarding.
 */
async function runOcr(
  dir: string,
  input: string,
  pdfUrl: string,
  modes: readonly string[] = OCR_MODES,
): Promise<string | null> {
  for (const mode of modes) {
    const ocrOutput = join(dir, 'ocr' + mode.replace(/-/g, '') + '.pdf');
    try {
      await run(
        'ocrmypdf',
        ['--language', 'tur', mode, '--optimize', '1', '--output-type', 'pdf', input, ocrOutput],
        { maxBuffer: 64 * 1024 * 1024, timeout: 30 * 60_000 },
      );
      const { stdout } = await run('pdftotext', ['-layout', '-enc', 'UTF-8', ocrOutput, '-'], {
        maxBuffer: 64 * 1024 * 1024,
      });
      if (stdout.trim()) return stdout;
      log.warn('OCR boş metin döndürdü', { pdfUrl, mode });
    } catch (error) {
      log.warn('OCR başarısız', { pdfUrl, mode, message: String(error) });
    }
  }
  return null;
}

/**
 * The text layer, read through pdfminer and decoded.
 *
 * WHY NOT pdftotext HERE. Some source PDFs embed a subset font whose ToUnicode
 * mapping cannot be used. pdftotext prints those characters by their raw code and
 * the output comes back shifted by 29 — "<$6$" for "YASA" — with no way to tell a
 * shifted character from ordinary punctuation. Measured on 2024 issue 2: 4,265
 * corrupted characters, and a decoder working on that output damaged 3,218 sound
 * words elsewhere in the archive. pdfminer marks the same characters as
 * "(cid:60)", which removes the ambiguity; cid.ts turns them back.
 *
 * Measured, same document: pdftotext 5,959 words with 4,265 corrupted, pdfminer
 * 7,035 words with none. On five healthy issues the two agree to within 0.6%, so
 * this is not a trade — it is the same text plus the part pdftotext could not
 * read.
 *
 * THE COST IS SPEED: 10-26x slower (0.1-1.0s vs 1.2-26s per issue, measured).
 * Daily ingest handles a handful of issues, so it disappears there; a full
 * re-extraction of the archive is hours rather than minutes.
 */
async function pdfminerText(path: string, pdfUrl: string): Promise<string | null> {
  const script = join(import.meta.dirname, 'pdf_text.py');
  for (const python of ['python3', 'python']) {
    try {
      const { stdout } = await run(python, [script, path], {
        maxBuffer: 128 * 1024 * 1024,
        encoding: 'utf8',
      });
      const markers = countCid(stdout);
      const text = decodeCidText(stdout);
      if (markers) log.info('bozuk font katmanı çözüldü', { pdfUrl, markers });
      return text;
    } catch {
      // Sonraki yorumlayıcı adını dene; ikisi de yoksa aşağıda pdftotext'e düşülür.
    }
  }
  return null;
}

/**
 * Text extraction pipeline (spec 7.2):
 *   pdfminer + cid decode   (pdftotext if unavailable)
 *     -> treat as scanned if characters/page < 150
 *     -> ocrmypdf --language tur --redo-ocr
 *     -> pdftotext again
 *     -> compute text_quality
 */
export async function extractPdfText(pdfUrl: string): Promise<ExtractionResult> {
  const dir = await mkdtemp(join(tmpdir(), 'mk-ingest-'));
  const input = join(dir, 'input.pdf');

  try {
    const response = await politeFetch(pdfUrl, { timeoutMs: 180_000 });
    if (!response.ok) throw new Error('PDF indirilemedi: HTTP ' + response.status);

    const pdfBytes = Buffer.from(await response.arrayBuffer());
    await writeFile(input, pdfBytes);

    const pageCount = await pdfPageCount(input);

    let text = '';
    const viaPdfminer = await pdfminerText(input, pdfUrl);
    if (viaPdfminer !== null) {
      text = viaPdfminer;
    } else {
      /*
       * pdftotext stays as the fallback rather than being removed: it needs no
       * Python, so a local checkout without pdfminer still extracts. It cannot
       * read the broken font layer, and that is a known and logged loss.
       */
      log.warn('pdfminer kullanılamadı, pdftotext ile devam ediliyor', { pdfUrl });
      try {
        const { stdout } = await run('pdftotext', ['-layout', '-enc', 'UTF-8', input, '-'], {
          maxBuffer: 64 * 1024 * 1024,
        });
        text = stdout;
      } catch (error) {
        log.warn('pdftotext başarısız', { pdfUrl, message: String(error) });
      }
    }

    /*
     * Use spec 7.2's measure when a page count exists; otherwise fall back to
     * the byte ratio. If neither is available, scanned detection is impossible
     * — do not assume it.
     */
    const looksScanned =
      pageCount && pageCount > 0
        ? text.length / pageCount < SCANNED_THRESHOLD
        : text.length / Math.max(pdfBytes.length, 1) < SCANNED_TEXT_RATIO;

    const preOcrLength = text.length;
    let status: TextStatus = 'extracted';
    let ocrSeconds: number | null = null;

    if (looksScanned) {
      // Scanned image — OCR is mandatory.
      if (await commandExists('ocrmypdf')) {
        const startedAt = Date.now();
        const ocred = await runOcr(dir, input, pdfUrl);
        if (ocred === null) {
          status = 'failed';
        } else {
          text = ocred;
          status = 'ocr';
          ocrSeconds = Math.round((Date.now() - startedAt) / 1000);
        }
      } else {
        log.warn('ocrmypdf kurulu değil, OCR atlandı', { pdfUrl });
        status = 'failed';
      }
    }

    /*
     * A text layer can be present and still be wrong. If it is damaged past
     * CORRUPTION_THRESHOLD, rasterise the page and read it again — this is the
     * one case where throwing away an existing text layer is the right call,
     * so it uses --force-ocr rather than the --redo-ocr that `runOcr` prefers.
     *
     * Measured on 2021 issue 211: 20 damaged words before, 0 after, and the
     * text grew from 72,525 to 88,138 characters in 19 seconds. Lines that read
     * "BUÖDAY, YULAF, FİĞ (VIGO), TRITIKALB" came back as
     * "BUĞDAY, YULAF, FİĞ (VİGO), TRİTİKALE".
     *
     * THE RESULT IS ONLY KEPT IF IT IS ACTUALLY BETTER. OCR can fail in its own
     * ways, and silently replacing a merely-imperfect text layer with a worse
     * one would be a downgrade nobody would notice.
     */
    const corruption = corruptionCount(text);
    let reOcrSeconds: number | null = null;

    if (status !== 'failed' && needsReread(text) && (await commandExists('ocrmypdf'))) {
      const startedAt = Date.now();
      const redone = await runOcr(dir, input, pdfUrl, ['--force-ocr']);
      reOcrSeconds = Math.round((Date.now() - startedAt) / 1000);

      /*
       * A re-read that loses the document is not an improvement.
       *
       * Found by checking the output rather than trusting the corruption count:
       * re-read issues came back up to 23% shorter and the loss was real content.
       * On 2023 issue 113 — a tender list, all tables and figures — words fell
       * 53,230 -> 47,690 and numeric tokens 7,233 -> 5,481. ABDOMEN, AKCİĞER,
       * ANTİJEN simply vanished. Part of it is ocrmypdf dropping whole pages:
       * that PDF has 193 pages and the re-read output has 189. Neither
       * `--optimize 0` nor `--pages` avoids it (both measured).
       *
       * COUNTED IN WORDS, NOT CHARACTERS. OCR reflows whitespace, so characters
       * move a few percent on their own and the signal to noise is poor. Words
       * only fall when text is actually gone.
       *
       * 2% is deliberately tight. The first threshold here was 10% — chosen off
       * a character-length distribution — and it silently accepted six issues
       * that had lost between 2% and 10% of their text. Losing a fiftieth of a
       * gazette issue is not an acceptable price for cosmetic letter repair.
       *
       * When it fires we KEEP the corrupted text. Broken İ's in a complete
       * document beat a clean document with part of the tender list missing.
       */
      const wordsBefore = countWords(text);
      const wordsAfter = redone === null ? 0 : countWords(redone);
      const lostTooMuch = redone !== null && wordsAfter < wordsBefore * 0.98;

      if (lostTooMuch) {
        log.warn('yeniden okuma metni kısalttı, mevcut metin korundu', {
          pdfUrl,
          wordsBefore,
          wordsAfter,
          lossPct: Number((100 * (1 - wordsAfter / wordsBefore)).toFixed(1)),
        });
      } else if (redone !== null && corruptionCount(redone) < corruption) {
        log.info('bozuk metin katmanı yeniden okundu', {
          pdfUrl,
          before: corruption,
          after: corruptionCount(redone),
          rateBefore: Number(corruptionRate(text).toFixed(1)),
          charsBefore: text.length,
          charsAfter: redone.length,
          seconds: reOcrSeconds,
        });
        text = redone;
        status = 'ocr';
      } else {
        log.warn('yeniden okuma iyileştirmedi, mevcut metin korundu', {
          pdfUrl,
          before: corruption,
          after: redone === null ? null : corruptionCount(redone),
        });
      }
    }

    const quality = estimateQuality(text);

    if (status !== 'failed' && quality !== null && quality < QUALITY_THRESHOLD) {
      // The record is stored anyway; the user is told the quality is low (spec 7.2).
      status = 'needs_review';
    }
    if (!text.trim()) status = 'failed';

    /*
     * Extraction metrics — thresholds can only be tuned by looking at real
     * output (SCANNED_TEXT_RATIO and QUALITY_THRESHOLD were both calibrated
     * this way). Without this line, the only way to learn why an issue got a
     * `failed` stamp is to download the PDF by hand and measure it again.
     */
    log.info('metin çıkarıldı', {
      pdfUrl,
      status,
      quality: quality === null ? null : Number(quality.toFixed(3)),
      pdfBytes: pdfBytes.length,
      preOcrChars: preOcrLength,
      chars: text.length,
      textRatio: Number((preOcrLength / Math.max(pdfBytes.length, 1)).toFixed(5)),
      pageCount,
      ocrSeconds,
    });

    return { text, pageCount, status, quality };
  } finally {
    // The PDF is deleted in every case — on success and on failure alike.
    await rm(dir, { recursive: true, force: true });
  }
}
