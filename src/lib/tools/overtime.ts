/**
 * Fazla mesai ve resmî tatil ücreti — 22/1992 İş Yasası madde 27 ve 40.
 *
 * DİKKAT — ZAM ORANLARI 2010'DA DEĞİŞTİ. Madde 27(3)(A) ve (B), 50/2010 sayılı
 * Değişiklik Yasası ile yeniden yazıldı. Yürürlükteki metin:
 *
 *   (A) normal çalışma gününde her fazla saat → saat başı ücretin %10 fazlası
 *   (B) hafta tatili ve resmî tatilde her fazla saat → %50 fazlası
 *
 * İnternette dolaşan ve üniversite/kurum sitelerinde hâlâ yayımlanan 25/2000
 * birleştirmesinde bu oranlar %50 ve "bir kat fazlası" (yani ×2) olarak geçiyor.
 * O metin 2010 öncesine ait. Buradaki oranlar, Çalışma Dairesi'nin yayımladığı
 * 30/1993, 25/2000, 51/2002, 15/2004, 50/2010 ve 23/2015 ile birleştirilmiş
 * güncel metinden alındı.
 */

import { MONTHS_PER_YEAR, NORMAL_WORK, WEEKS_PER_YEAR } from './constants';

/** Madde 27(3)(A) — normal çalışma günü. */
export const WEEKDAY_OVERTIME_UPLIFT = 0.1;
/** Madde 27(3)(B) — hafta tatili ve resmî tatil. */
export const HOLIDAY_OVERTIME_UPLIFT = 0.5;

/** Madde 27(2): günde en çok dört saat, yılda en çok doksan iş günü. */
export const MAX_OVERTIME_HOURS_PER_DAY = 4;
export const MAX_OVERTIME_DAYS_PER_YEAR = 90;

/** Madde 40(2)(A) ve (Ç): resmî tatil günü ücreti = saat başı ücretin sekiz katı. */
export const PUBLIC_HOLIDAY_HOURS = 8;

/**
 * Madde 27(3)(Ç): saat başı ücret = aylık brüt ücret ÷ o ay normal mesaide
 * çalışılan saatler toplamı.
 *
 * Payda "ayda 30 gün" ya da "720 saat" DEĞİL: yalnızca o ay fiilen normal
 * mesaide çalışılan saatler. 22 iş günü × 8 saat = 176 saat gibi. Paydayı büyük
 * tutmak saat ücretini, dolayısıyla fazla mesai alacağını küçültür.
 */
export function hourlyRate(grossMonthlyWage: number, normalHoursInMonth: number): number {
  if (normalHoursInMonth <= 0) return 0;
  return grossMonthlyWage / normalHoursInMonth;
}

/** Haftalık ödeme yapılan işyerleri için madde 27(3)(D)'nin çevrimi. */
export function monthlyFromWeekly(weeklyWage: number): number {
  return (weeklyWage * WEEKS_PER_YEAR) / MONTHS_PER_YEAR;
}

/** Ayın iş günü sayısından normal mesai saatinin varsayılanı. */
export function defaultNormalHours(workingDaysInMonth: number): number {
  return workingDaysInMonth * NORMAL_WORK.hoursPerDay;
}

export interface OvertimeInput {
  grossMonthlyWage: number;
  /** O ay normal mesaide çalışılan toplam saat — madde 27(3)(Ç)'nin paydası. */
  normalHoursInMonth: number;
  /** Normal çalışma günlerinde yapılan fazla mesai saati. */
  weekdayOvertimeHours: number;
  /** Hafta tatili ve resmî tatil günlerinde yapılan fazla mesai saati. */
  holidayOvertimeHours: number;
  /** Fazla mesai yapılan gün sayısı — madde 27(2) yıllık sınırı için. */
  overtimeDaysInYear?: number | null;
  /** Fazla mesainin yoğunlaştığı gündeki saat — günlük dört saat sınırı için. */
  maxHoursInOneDay?: number | null;
  /** Çalışılan resmî tatil günü sayısı — madde 40(2) ek ödemesi için. */
  publicHolidayDaysWorked?: number;
}

export interface OvertimeResult {
  hourlyRate: number;
  weekday: { hours: number; rate: number; amount: number };
  holiday: { hours: number; rate: number; amount: number };
  overtimeTotal: number;
  publicHoliday: {
    days: number;
    /** Bir günün ek ödemesi: saat başı ücret × 8. */
    perDay: number;
    amount: number;
  };
  total: number;
  warnings: Array<'daily-limit' | 'yearly-limit'>;
}

export function calculateOvertime(input: OvertimeInput): OvertimeResult {
  const rate = hourlyRate(Math.max(0, input.grossMonthlyWage), input.normalHoursInMonth);

  const weekdayHours = Math.max(0, input.weekdayOvertimeHours || 0);
  const holidayHours = Math.max(0, input.holidayOvertimeHours || 0);
  const holidayDays = Math.max(0, input.publicHolidayDaysWorked || 0);

  const weekdayRate = rate * (1 + WEEKDAY_OVERTIME_UPLIFT);
  const holidayRate = rate * (1 + HOLIDAY_OVERTIME_UPLIFT);

  const weekdayAmount = weekdayHours * weekdayRate;
  const holidayAmount = holidayHours * holidayRate;
  const publicHolidayPerDay = rate * PUBLIC_HOLIDAY_HOURS;
  const publicHolidayAmount = holidayDays * publicHolidayPerDay;

  /*
   * Sınır aşıldığında hesap DURMUYOR, yalnızca uyarı ekleniyor. Yasal sınırın
   * üstünde çalıştırılmış olmak işçinin o saatlerin ücretini kaybetmesi anlamına
   * gelmez; sınırı aşan işveren için ayrı bir sorumluluk doğurur.
   */
  const warnings: OvertimeResult['warnings'] = [];
  if ((input.maxHoursInOneDay ?? 0) > MAX_OVERTIME_HOURS_PER_DAY) warnings.push('daily-limit');
  if ((input.overtimeDaysInYear ?? 0) > MAX_OVERTIME_DAYS_PER_YEAR) warnings.push('yearly-limit');

  return {
    hourlyRate: rate,
    weekday: { hours: weekdayHours, rate: weekdayRate, amount: weekdayAmount },
    holiday: { hours: holidayHours, rate: holidayRate, amount: holidayAmount },
    overtimeTotal: weekdayAmount + holidayAmount,
    publicHoliday: { days: holidayDays, perDay: publicHolidayPerDay, amount: publicHolidayAmount },
    total: weekdayAmount + holidayAmount + publicHolidayAmount,
    warnings,
  };
}
