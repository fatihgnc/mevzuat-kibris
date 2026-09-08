/**
 * Truncation that cuts at a sentence end — for meta descriptions (spec 8.4).
 * A description cut mid-sentence looks bad in search results; we look for a
 * period, and failing that cut at the last space and add an ellipsis.
 */
export function truncateAtSentence(input: string, maxLength = 155): string {
  const text = input.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;

  const window = text.slice(0, maxLength);
  const sentenceEnd = Math.max(
    window.lastIndexOf('. '),
    window.lastIndexOf('? '),
    window.lastIndexOf('! '),
  );
  if (sentenceEnd > maxLength * 0.5) return window.slice(0, sentenceEnd + 1);

  const lastSpace = window.lastIndexOf(' ');
  return window.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd() + '…';
}

/** Title truncation — 60 characters for the title element (spec 8.4). */
export function truncateTitle(input: string, maxLength = 60): string {
  const text = input.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  const window = text.slice(0, maxLength);
  const lastSpace = window.lastIndexOf(' ');
  return window.slice(0, lastSpace > 0 ? lastSpace : maxLength).trimEnd() + '…';
}

/*
 * The 20 KB body cap is GONE (migration 0011). It was cutting 670 records
 * (625 of them mid-sentence); in record 2977 the cut removed the ruling itself,
 * which sat cleanly in the PDF. `body_text` is now stored in full and the index is kept
 * in check by limiting `search_vector` to the first 30.720 characters of the
 * body instead — see supabase/migrations/0011-full-body-text.sql.
 *
 * Do not reintroduce a byte cap here. If storage ever needs bounding, bound
 * the index or the number of records, not the content of a record.
 */
