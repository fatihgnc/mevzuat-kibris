/**
 * Date formats — the artboard has two, and they differ deliberately:
 *   list row     -> "31 Ara 2025"    (has to fit a 92px meta column)
 *   meta/detail  -> "31 Aralık 2025" (single line, no need to abbreviate)
 *
 * Intl is used; a dependency like date-fns would eat into the JS budget (spec 13).
 */
const LONG = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const SHORT = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value + 'T00:00:00Z');
}

/** "31 Aralık 2025" */
export function formatDateLong(value: string | Date): string {
  return LONG.format(toDate(value));
}

/** "31 Ara 2025" — Intl may give the short month name with a trailing dot; we drop it. */
export function formatDateShort(value: string | Date): string {
  return SHORT.format(toDate(value)).replace(/\./g, '');
}

/** ISO 8601 (YYYY-MM-DD) — for JSON-LD and the time element. */
export function toIsoDate(value: string | Date): string {
  return toDate(value).toISOString().slice(0, 10);
}

/** Whether an application deadline has passed (spec 3.9) — day precision, UTC. */
export function isDeadlinePassed(deadline: string | Date | null, now = new Date()): boolean {
  if (!deadline) return false;
  const end = toDate(deadline);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return end < today;
}
