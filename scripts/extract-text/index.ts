import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { politeFetch } from '../shared/http';
import { log } from '../shared/logger';

const run = promisify(execFile);

/**
 * Aşama 2-3 — PDF'i geçici indir, metnini çıkar, sil.
 *
 * PDF SAKLANMIYOR (spec 3.6). Runner'ın geçici dizinine iniyor, metni
 * çıkarılıyor, iş bitince siliniyor. 20 yıl × ~250 sayı × ~2 MB ≈ 10 GB;
 * bu, ücretsiz altyapıda taşınamaz ve zaten kamuya açık bir kaynağın
 * kopyasını tutmanın ürüne kattığı bir şey yok.
 */

export type TextStatus = 'extracted' | 'ocr' | 'failed' | 'needs_review';

export interface ExtractionResult {
  text: string;
  pageCount: number | null;
  status: TextStatus;
  quality: number;
}

/** Taranmış kabul etme eşiği — sayfa başına karakter (spec 7.2). */
const SCANNED_THRESHOLD = 150;

/**
 * Sayfa sayısı YOKKEN taranmış tespiti: çıkan metin baytının PDF baytına oranı.
 *
 * Spec 7.2 sayfa başına karaktere bakıyor ama `pdfinfo` her ortamda kurulu
 * değil (bu makinede yok) ve yokken `pdfPageCount` null dönüyor. O durumda
 * eski kod `perPage`'i TÜM metin uzunluğuna düşürüyordu; 150 eşiği hiçbir
 * zaman tetiklenmiyor, yani sayfa sayısı yoksa taranmış tespiti tamamen
 * devre dışı kalıyordu.
 *
 * Gerçek 2025 sayılarında ölçüldü:
 *
 *   sayı 100   2,7 MB → 12 KB metin   %0,45   metin PDF
 *   sayı 262   3,2 MB →  9 KB metin   %0,27   metin PDF
 *   sayı 175  23,8 MB →  2 KB metin   %0,01   TARANMIŞ (yalnızca kapakta
 *                                              metin katmanı var)
 *
 * Aradaki fark 27 kat; %0,1 rahat bir ayraç.
 *
 * Bu denetim şart çünkü `estimateQuality` bu hatayı YAKALAYAMIYOR: taranmış
 * sayıdan çıkan az miktarda metin (kapak sayfası) tertemiz Türkçe olduğu için
 * kalite 0.99 geliyor. Kalite metnin *doğruluğunu* ölçüyor, *eksikliğini*
 * değil. Bu denetim olmadan taranmış sayılar `extracted` damgasıyla neredeyse
 * boş gövdeyle kaydediliyordu — sessiz veri kaybı.
 */
const SCANNED_TEXT_RATIO = 0.001;

/** Bu oranın altı "needs_review" (spec 7.2). */
const QUALITY_THRESHOLD = 0.55;

/**
 * Türkçe sözlük oranı. Tam bir sözlük yerine Türkçe metnin karakter ve ek
 * istatistiğini kullanıyoruz: OCR bozulmasında en belirgin sinyal, sözcüklerin
 * Türkçede mümkün olmayan harf dizileri içermesi.
 */
export function estimateQuality(text: string): number {
  const words = text
    .toLocaleLowerCase('tr')
    .split(/[^a-zçğıöşü]+/)
    .filter((word) => word.length >= 3);

  if (words.length < 20) return 0;

  let plausible = 0;

  for (const word of words) {
    const hasVowel = /[aeıioöuü]/.test(word);
    // Türkçede üç ünsüz yan yana gelmez; OCR bozulmasının en net izi bu.
    const tripleConsonant = /[bcçdfgğhjklmnprsştvyz]{4}/.test(word);
    // q, w, x Türkçe alfabede yok.
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
    // -v desteklemeyen komutlar için: ENOENT değilse komut var demektir.
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
 * Metin çıkarma hattı (spec 7.2):
 *   pdftotext -layout
 *     -> karakter/sayfa < 150 ise taranmış kabul et
 *     -> ocrmypdf --language tur --skip-text
 *     -> pdftotext tekrar
 *     -> text_quality hesapla
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
     * Sayfa sayısı varsa spec 7.2'nin ölçüsünü kullan; yoksa bayt oranına düş.
     * İkisi de yoksa taranmış tespiti yapılamaz demektir, bunu varsayma.
     */
    const looksScanned =
      pageCount && pageCount > 0
        ? text.length / pageCount < SCANNED_THRESHOLD
        : text.length / Math.max(pdfBytes.length, 1) < SCANNED_TEXT_RATIO;

    let status: TextStatus = 'extracted';

    if (looksScanned) {
      // Taranmış görüntü — OCR şart.
      if (await commandExists('ocrmypdf')) {
        const ocrOutput = join(dir, 'ocr.pdf');
        try {
          await run(
            'ocrmypdf',
            ['--language', 'tur', '--skip-text', '--optimize', '1', '--output-type', 'pdf', input, ocrOutput],
            { maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60_000 },
          );
          const { stdout } = await run('pdftotext', ['-layout', '-enc', 'UTF-8', ocrOutput, '-'], {
            maxBuffer: 64 * 1024 * 1024,
          });
          text = stdout;
          status = 'ocr';
        } catch (error) {
          log.warn('OCR başarısız', { pdfUrl, message: String(error) });
          status = 'failed';
        }
      } else {
        log.warn('ocrmypdf kurulu değil, OCR atlandı', { pdfUrl });
        status = 'failed';
      }
    }

    const quality = estimateQuality(text);

    if (status !== 'failed' && quality < QUALITY_THRESHOLD) {
      // Kayıt yine de saklanır, kullanıcıya kalite düşük diye söylenir (spec 7.2).
      status = 'needs_review';
    }
    if (!text.trim()) status = 'failed';

    return { text, pageCount, status, quality };
  } finally {
    // PDF her durumda siliniyor — başarı da hata da olsa.
    await rm(dir, { recursive: true, force: true });
  }
}
