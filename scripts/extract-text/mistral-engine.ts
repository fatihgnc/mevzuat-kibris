import { log } from '../shared/logger';

const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr';
// Deliberately OCR 3 (batch $1/1000 pages), not `mistral-ocr-latest` -- that alias
// now points at OCR 4 ($2/1000 pages). See HANDOFF.md §8.5.
export const MISTRAL_OCR_MODEL = 'mistral-ocr-2512';

export interface MistralOcrPage {
  index: number;
  markdown: string;
  confidence_scores?: {
    average_page_confidence_score: number;
    minimum_page_confidence_score: number;
  };
}

interface MistralOcrResponse {
  pages: MistralOcrPage[];
}

/**
 * We never request `include_image_base64`, so no actual image bytes ever come
 * back -- but the model still emits a markdown reference for every image it
 * detects (`![img-0.jpeg](img-0.jpeg)`), pointing at nothing. Mistral has no
 * parameter to suppress this (checked their docs), so we strip it ourselves;
 * left in, BodyMarkdown (record-detail/index.tsx) renders a broken-image icon.
 * `[^\]]*` on the alt text, not `.*`, so this can't swallow the rest of the line
 * if a page ever has two image refs back to back.
 */
function stripImageRefs(markdown: string): string {
  return markdown.replace(/!\[[^\]]*\]\([^)]*\)\n*/g, '');
}

/**
 * Turns a raw `pages[]` array (from either the synchronous OCR response or one
 * line of a batch job's output file -- same shape either way) into the single
 * concatenated text extractBody expects, plus the pilot-stage confidence
 * numbers. Shared so mistral-run.ts (sync) and mistral-batch-run.ts (batch)
 * don't each reimplement image-stripping and confidence aggregation.
 */
export function assembleIssueText(pages: MistralOcrPage[]): {
  text: string;
  pageCount: number;
  minConfidence: number | null;
  avgConfidence: number | null;
} {
  const sorted = [...pages].sort((a, b) => a.index - b.index);

  const scores = sorted.map((p) => p.confidence_scores).filter((s) => s !== undefined);
  // No threshold decision here -- we haven't measured enough real issues to know what
  // "low" means for this source's scan quality (memory: ölçmeden konuşma). This is
  // pilot-stage visibility only; the runners just log it per issue.
  const minConfidence = scores.length ? Math.min(...scores.map((s) => s.minimum_page_confidence_score)) : null;
  const avgConfidence = scores.length
    ? scores.reduce((sum, s) => sum + s.average_page_confidence_score, 0) / scores.length
    : null;

  return {
    text: sorted.map((p) => stripImageRefs(p.markdown)).join('\n\n'),
    pageCount: sorted.length,
    minConfidence,
    avgConfidence,
  };
}

/**
 * The raw synchronous call, one HTTP request. `pages` (0-indexed) lets a
 * caller ask for a slice of a document instead of the whole thing -- needed
 * because Mistral caps a single request at 1,000 pages (measured: issue
 * 2026/97 has 1,030 and came back HTTP 400 `document_parser_too_many_pages`
 * in the batch run). Exported so a one-off oversized-issue fix can fetch two
 * slices and merge them before handing the combined pages to assembleIssueText.
 *
 * Read the API key at call time, not module load -- a frozen constant would
 * survive a `.env.local` reload and, per the env-constant lesson in
 * HANDOFF.md §4.7, is how a stale value ends up baked into a long-running process.
 */
export async function fetchOcrPages(pdfUrl: string, pages?: number[]): Promise<MistralOcrPage[]> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY tanımlı değil');

  const response = await fetch(MISTRAL_OCR_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MISTRAL_OCR_MODEL,
      document: { type: 'document_url', document_url: pdfUrl },
      confidence_scores_granularity: 'page',
      ...(pages ? { pages } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Mistral OCR isteği başarısız: HTTP ${response.status} — ${body}`);
  }

  const data = (await response.json()) as MistralOcrResponse;
  return data.pages;
}

/**
 * Sends one issue's PDF (already public at `pdfUrl`, so no upload step) to
 * Mistral OCR and returns the whole issue as one concatenated markdown text --
 * the same shape ocrIssue() (deepseek-engine.ts) returns, so extractBody's
 * boundary logic (parser.ts) is reused as-is.
 *
 * No local table repair here: measured output (HANDOFF.md §8.5) already comes
 * back with cell-consistent HTML tables, unlike DeepSeek-OCR's (table-repair.ts).
 */
export async function ocrIssueMistral(
  pdfUrl: string,
): Promise<{ text: string; pageCount: number; minConfidence: number | null; avgConfidence: number | null }> {
  const t0 = Date.now();
  const pages = await fetchOcrPages(pdfUrl);
  const result = assembleIssueText(pages);

  log.info('Mistral OCR tamam', {
    pdfUrl,
    pages: result.pageCount,
    seconds: Math.round((Date.now() - t0) / 1000),
    minConfidence: result.minConfidence,
    avgConfidence: result.avgConfidence,
  });

  return result;
}
