import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { politeFetch } from '../shared/http';
import { log } from '../shared/logger';

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

async function runOcr(dir: string, input: string, pdfUrl: string): Promise<string | null> {
  for (const mode of OCR_MODES) {
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
 * Text extraction pipeline (spec 7.2):
 *   pdftotext -layout
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
    try {
      const { stdout } = await run('pdftotext', ['-layout', '-enc', 'UTF-8', input, '-'], {
        maxBuffer: 64 * 1024 * 1024,
      });
      text = stdout;
    } catch (error) {
      log.warn('pdftotext başarısız', { pdfUrl, message: String(error) });
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
