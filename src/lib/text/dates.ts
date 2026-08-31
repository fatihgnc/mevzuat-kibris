/**
 * Tarih biçimleri — artboard'da iki biçim var ve ikisi de bilerek farklı:
 *   liste satırı  -> "31 Ara 2025"    (92px künye sütununa sığması gerekiyor)
 *   künye/detay   -> "31 Aralık 2025" (tek satır, kısaltmaya gerek yok)
 *
 * Intl kullanılıyor; date-fns gibi bir bağımlılık JS bütçesine (spec 13) girmiyor.
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

const DAY_MONTH = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const WEEKDAY = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', timeZone: 'UTC' });

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value + 'T00:00:00Z');
}

/** "31 Aralık 2025" */
export function formatDateLong(value: string | Date): string {
  return LONG.format(toDate(value));
}

/** "31 Ara 2025" — Intl kısa ay adını noktalı verebiliyor, noktayı atıyoruz. */
export function formatDateShort(value: string | Date): string {
  return SHORT.format(toDate(value)).replace(/\./g, '');
}

/** "5 Ocak pazartesi" — takip onay ekranındaki ilk özet tarihi. */
export function formatDateWithWeekday(value: string | Date): string {
  const date = toDate(value);
  return DAY_MONTH.format(date) + ' ' + WEEKDAY.format(date);
}

/** ISO 8601 (YYYY-MM-DD) — JSON-LD ve time etiketi için. */
export function toIsoDate(value: string | Date): string {
  return toDate(value).toISOString().slice(0, 10);
}

/** Başvuru bitiş tarihi geçmiş mi (spec 3.9) — gün hassasiyetinde, UTC. */
export function isDeadlinePassed(deadline: string | Date | null, now = new Date()): boolean {
  if (!deadline) return false;
  const end = toDate(deadline);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return end < today;
}

/** 0 = pazar. Haftalık digest gün atamasında kullanılır (spec 10.3). */
export const TR_WEEKDAYS = [
  'pazar',
  'pazartesi',
  'salı',
  'çarşamba',
  'perşembe',
  'cuma',
  'cumartesi',
] as const;

/** Verilen hafta gününün bir sonraki tarihini döndürür (UTC). */
export function nextWeekday(weekday: number, from = new Date()): Date {
  const start = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
  );
  const delta = (weekday - start.getUTCDay() + 7) % 7 || 7;
  start.setUTCDate(start.getUTCDate() + delta);
  return start;
}
