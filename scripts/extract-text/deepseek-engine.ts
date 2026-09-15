import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { politeFetch } from '../shared/http';
import { log } from '../shared/logger';

import { repairAllTables } from './table-repair';

const run = promisify(execFile);

const PYTHON = process.env.DEEPSEEK_OCR_PYTHON ?? 'C:\\ocrtest\\Scripts\\python.exe';

async function pdfPageCount(path: string): Promise<number> {
  const { stdout } = await run('pdfinfo', [path]);
  const match = /Pages:\s+(\d+)/.exec(stdout);
  if (!match) throw new Error('pdfinfo sayfa sayısını veremedi');
  return Number(match[1]);
}

/**
 * Downloads one issue's PDF, runs every page through DeepSeek-OCR, and
 * returns the whole issue as one concatenated, table-repaired markdown text
 * -- the same shape extractBody already expects from the legacy pdfminer
 * path, so parser.ts's boundary logic is reused as-is (see deepseek-run.ts).
 *
 * ONE GPU PASS PER ISSUE, NOT PER RECORD. An issue's PDF holds every record
 * printed in it (spec: a gazette issue is shared across ~10-25 records), so
 * paying for OCR once and slicing the result N ways is the only sane cost
 * shape -- re-running OCR per record would multiply GPU time by the record
 * count for no benefit.
 */
export async function ocrIssue(pdfUrl: string): Promise<{ text: string; pageCount: number }> {
  const dir = await mkdtemp(join(tmpdir(), 'mk-deepseek-'));
  try {
    const pdfPath = join(dir, 'issue.pdf');
    const response = await politeFetch(pdfUrl, { timeoutMs: 180_000 });
    if (!response.ok) throw new Error(`PDF indirilemedi: HTTP ${response.status}`);
    await writeFile(pdfPath, Buffer.from(await response.arrayBuffer()));

    const pageCount = await pdfPageCount(pdfPath);

    const pagesDir = join(dir, 'pages');
    await mkdir(pagesDir, { recursive: true });
    await run('pdftoppm', ['-png', '-r', '200', pdfPath, join(pagesDir, 'p')], {
      maxBuffer: 64 * 1024 * 1024,
    });

    const pageFiles = (await readdir(pagesDir)).filter((f) => f.endsWith('.png')).sort();
    if (pageFiles.length !== pageCount) {
      log.warn('sayfa sayısı uyuşmuyor', { pdfUrl, expected: pageCount, got: pageFiles.length });
    }

    const ocrOutDir = join(dir, 'ocr-out');
    const args = [
      join(import.meta.dirname, 'deepseek_ocr.py'),
      ocrOutDir,
      ...pageFiles.map((f) => join(pagesDir, f)),
    ];
    const t0 = Date.now();
    const { stderr } = await run(PYTHON, args, {
      maxBuffer: 256 * 1024 * 1024,
      timeout: 60 * 60_000,
    });
    log.info('DeepSeek-OCR tamam', {
      pdfUrl,
      pages: pageFiles.length,
      seconds: Math.round((Date.now() - t0) / 1000),
    });

    // deepseek_ocr.py prints "OK <page>: Ns" / "FAIL <page> (attempt N/M):" plus a
    // traceback per page to stderr. Surfacing the FAIL lines here is the only way
    // to see WHY a page came back empty -- previously this was discarded entirely,
    // so a page silently missing its result.mmd gave no clue why (see deepseek-run.ts
    // history: a 20-issue run lost several pages with no visible cause).
    const failures = stderr
      .split('\n')
      .filter((line) => line.startsWith('FAIL '))
      .map((line) => line.trim());
    if (failures.length) log.warn('bazı sayfalar başarısız oldu', { pdfUrl, failures });

    const pageTexts: string[] = [];
    for (const file of pageFiles) {
      const name = file.replace(/\.png$/, '');
      const mmdPath = join(ocrOutDir, name, 'result.mmd');
      try {
        pageTexts.push(await readFile(mmdPath, 'utf8'));
      } catch {
        log.warn('sayfa çıktısı okunamadı, atlanıyor', { pdfUrl, file });
      }
    }

    const { text, anyNeedsReview } = repairAllTables(pageTexts.join('\n\n'));
    if (anyNeedsReview) log.warn('en az bir tabloda hücre sayısı uyuşmadı, elle kontrol gerek', { pdfUrl });

    return { text, pageCount };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
