/**
 * Hizmet süresi hesabı — bütün araçların ortak zemini.
 *
 * Beş araç "işe giriş tarihinden bugüne kaç yıl" sorusunu soruyor ve üçü bu
 * sayıyı bir eşik tablosunda arıyor (yıllık izin madde 43, ihbar süresi madde 12,
 * toplu işten çıkarma tazminatı madde 19). Eşikler "beş yıldan fazla", "on yıl ve
 * daha fazla" gibi ifadelerle yazıldığı için süreyi ondalık yıla çevirip
 * karşılaştırmak YETMİYOR: 4.999 yıl ile 5 yıl arasındaki fark, tabloda 14 ile 18
 * iş günü arasındaki farka denk geliyor. Bu yüzden süre takvim üzerinden
 * (yıl/ay/gün) hesaplanıyor ve eşik karşılaştırmaları tam sayı ay üzerinden
 * yapılıyor.
 */

export interface ServiceDuration {
  /** Tam yıl. */
  years: number;
  /** Yıldan artan tam ay (0-11). */
  months: number;
  /** Aydan artan gün. */
  days: number;
  /** Toplam tam ay — eşik karşılaştırmalarının yapıldığı birim. */
  totalMonths: number;
  /** Toplam gün — orantılı (kıst) izin hesabı için. */
  totalDays: number;
}

/** `YYYY-MM-DD` metnini yerel saat diliminde bir Date'e çevirir. */
export function parseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  /*
   * `new Date(2026, 1, 31)` sessizce 3 Mart'a taşar. Ay ve günü geri okuyup
   * karşılaştırmak, 31 Şubat gibi bir girdinin geçerli sayılmasını engelliyor.
   */
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function toDateInputValue(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Ay ekler. Ayın son gününü koruyarak: 31 Ocak + 1 ay = 28/29 Şubat, 1 Mart
 * değil. `setMonth` tek başına taşırdığı için gün ayrıca kırpılıyor.
 */
export function addMonths(date: Date, months: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(date.getDate(), lastDay));
  return next;
}

/** İki tarih arasındaki tam gün sayısı. */
export function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * İki tarih arasındaki hizmet süresi.
 *
 * Bitiş tarihi başlangıçtan önceyse bütün alanlar sıfır döner — negatif bir
 * hizmet süresini eşik tablosuna sokmak, tablonun en alt basamağını "hak edilmiş"
 * gibi göstermek olurdu.
 */
export function serviceDuration(start: Date, end: Date): ServiceDuration {
  if (daysBetween(start, end) < 0) {
    return { years: 0, months: 0, days: 0, totalMonths: 0, totalDays: 0 };
  }

  let totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  /*
   * Ayın günü henüz gelmediyse o ay dolmamıştır: 10 Ocak → 5 Şubat bir ay
   * değil, 26 gündür.
   */
  if (end.getDate() < start.getDate()) totalMonths -= 1;
  if (totalMonths < 0) totalMonths = 0;

  const anniversary = addMonths(start, totalMonths);

  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: daysBetween(anniversary, end),
    totalMonths,
    totalDays: daysBetween(start, end),
  };
}

/** "3 yıl 4 ay 12 gün" — sıfır olan parçalar yazılmıyor. */
export function formatDuration(duration: ServiceDuration): string {
  const parts: string[] = [];
  if (duration.years) parts.push(`${duration.years} yıl`);
  if (duration.months) parts.push(`${duration.months} ay`);
  if (duration.days) parts.push(`${duration.days} gün`);
  return parts.length ? parts.join(' ') : '0 gün';
}

const TR_MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

/** "14 Mart 2026". */
export function formatDate(date: Date): string {
  return `${date.getDate()} ${TR_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}
