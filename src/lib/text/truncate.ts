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

/** body_text is cut at 20 KB (spec 14.3) — measured in bytes, not characters. */
export const BODY_TEXT_LIMIT_BYTES = 20 * 1024;

export function truncateBytes(input: string, limit = BODY_TEXT_LIMIT_BYTES): string {
  const encoder = new TextEncoder();
  if (encoder.encode(input).length <= limit) return input;

  let out = input.slice(0, limit);
  while (encoder.encode(out).length > limit) {
    out = out.slice(0, Math.floor(out.length * 0.9));
  }
  const lastSpace = out.lastIndexOf(' ');
  return lastSpace > 0 ? out.slice(0, lastSpace) : out;
}
