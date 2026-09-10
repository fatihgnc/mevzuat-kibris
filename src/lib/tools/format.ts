/**
 * Hesaplayıcı çıktılarının biçimlendirilmesi.
 *
 * `Intl` örnekleri modül düzeyinde bir kez kuruluyor. Her render'da yeniden
 * kurmak, sekiz alanlı bir formda her tuş vuruşunda onlarca `NumberFormat`
 * yaratmak demekti.
 */

const CURRENCY = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 2,
});

const DECIMAL = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const PERCENT = new Intl.NumberFormat('tr-TR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return CURRENCY.format(value);
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return DECIMAL.format(value);
}

/** Yüzde işaretini kendimiz koyuyoruz: `style: 'percent'` girdi olarak oran bekler. */
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `%${PERCENT.format(value)}`;
}

/**
 * "14 iş günü" gibi. Kesirli gün, madde 43(4) kesirleri aktardığı için
 * yuvarlanmadan iki basamakla gösteriliyor.
 */
export function formatDays(value: number): string {
  return `${formatNumber(value)} iş günü`;
}

/** Girdi alanından gelen metni sayıya çevirir; boş ve geçersiz değer `null`. */
export function parseNumberInput(value: string): number | null {
  const trimmed = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
