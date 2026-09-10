/**
 * Toplu işten çıkarma tazminatı (madde 19) ve ihbar süresi (madde 12).
 *
 * İKİSİ AYNI DOSYADA, çünkü yasa ikisini birbirine bağlıyor: madde 19(2), toplu
 * işten çıkarma tazminatını "bu Yasanın 12'nci maddesindeki bildirime ilişkin
 * kurallar SAKLI KALMAK KOŞULUYLA" veriyor. Yani toplu çıkarmada iki ayrı kalem
 * doğuyor ve yalnızca birini gösteren bir hesaplayıcı, işçiye alacağının yarısını
 * söylemiş olur.
 */

import { serviceDuration, type ServiceDuration } from './duration';
import { MONTHS_PER_YEAR, WEEKS_PER_YEAR } from './constants';

/** Madde 19(1): madde ancak bu iki eşik birlikte aşıldığında uygulanıyor. */
export const COLLECTIVE_MIN_HEADCOUNT = 5;
export const COLLECTIVE_MIN_SHARE = 0.2;

export interface WeekTier {
  clause: string;
  weeks: number;
  label: string;
}

/**
 * Madde 19(2). Basamaklar "üç aydan, altı aya kadar" biçiminde yazılmış:
 * alt uç dahil, üst uç bir sonraki basamağın alt ucu. Son basamak "beş yıldan
 * FAZLA" dediği için tam beş yıl (Ç)'de kalıyor.
 */
const S_A: WeekTier = { clause: 'A', weeks: 1, label: 'Üç aydan altı aya kadar' };
const S_B: WeekTier = { clause: 'B', weeks: 2, label: 'Altı aydan bir yıla kadar' };
const S_C: WeekTier = { clause: 'C', weeks: 3, label: 'Bir yıldan iki yıla kadar' };
const S_CE: WeekTier = { clause: 'Ç', weeks: 4, label: 'İki yıldan beş yıla kadar' };
const S_D: WeekTier = { clause: 'D', weeks: 5, label: 'Beş yıldan fazla' };

export const SEVERANCE_TIERS: readonly WeekTier[] = [S_A, S_B, S_C, S_CE, S_D];

export function severanceTier(totalMonths: number): WeekTier | null {
  if (totalMonths < 3) return null;
  if (totalMonths < 6) return S_A;
  if (totalMonths < 12) return S_B;
  if (totalMonths < 24) return S_C;
  if (totalMonths <= 60) return S_CE;
  return S_D;
}

/**
 * Madde 12(1)(A) bildirim süreleri. İlk basamak "en çok altı ayı sürmüş" —
 * yani altı ay dahil — olduğu için (a) 0-6 ay aralığını kapsıyor ve (b) altıncı
 * ayın dolmasından sonra başlıyor.
 */
const N_A: WeekTier = { clause: 'a', weeks: 1, label: 'En çok altı ay' };
const N_B: WeekTier = { clause: 'b', weeks: 3, label: 'Altı aydan bir yıla kadar' };
const N_C: WeekTier = { clause: 'c', weeks: 4, label: 'Bir yıldan iki yıla kadar' };
const N_CE: WeekTier = { clause: 'ç', weeks: 5, label: 'İki yıldan beş yıla kadar' };
const N_D: WeekTier = { clause: 'd', weeks: 6, label: 'Beş yıldan fazla' };

export const NOTICE_TIERS: readonly WeekTier[] = [N_A, N_B, N_C, N_CE, N_D];

export function noticeTier(totalMonths: number): WeekTier {
  if (totalMonths <= 6) return N_A;
  if (totalMonths < 12) return N_B;
  if (totalMonths < 24) return N_C;
  if (totalMonths <= 60) return N_CE;
  return N_D;
}

/**
 * Haftalık ücret.
 *
 * Madde 27(3)(D) ve 40(2)(B), haftalık ücretten aylığa geçişi "× 52 ÷ 12" olarak
 * tarif ediyor. Ters yön de aynı orandan çıkıyor. Ayı dört hafta saymak (yaygın
 * kestirme) haftalık ücreti %8,5 yüksek gösterir.
 */
export function weeklyWage(grossMonthly: number): number {
  return (grossMonthly * MONTHS_PER_YEAR) / WEEKS_PER_YEAR;
}

export interface SeveranceInput {
  startDate: Date;
  endDate: Date;
  grossMonthlyWage: number;
  /** Madde 19(4): niteliği gereği altı aydan az süren mevsimlik/kampanya işi. */
  seasonal?: boolean;
  /** İşyerindeki toplam çalışan sayısı — madde 19(1) eşiği için. */
  headcount?: number | null;
  /** Aynı anda veya kısa aralıklarla çıkarılan işçi sayısı. */
  dismissedCount?: number | null;
}

export interface SeveranceResult {
  duration: ServiceDuration;
  weeklyWage: number;
  /** Madde 19(1) eşiği: veriler girildiyse sağlanıyor mu. `null` = bilinmiyor. */
  thresholdMet: boolean | null;
  dismissedShare: number | null;
  seasonalExempt: boolean;
  severance: {
    tier: WeekTier | null;
    weeks: number;
    amount: number;
  };
  notice: {
    tier: WeekTier;
    weeks: number;
    /**
     * Madde 12(1)(C): bildirim yapılmazsa bu sürenin ücreti kadar TAZMİNAT
     * ödenir. Usulüne uygun bildirim yapıldıysa işçi bu süre boyunca zaten
     * çalışıp ücretini alır; ayrıca bir ödeme doğmaz.
     */
    amount: number;
  };
  /** İki kalemin toplamı — bildirim hiç yapılmadığı varsayımıyla. */
  total: number;
}

export function calculateSeverance(input: SeveranceInput): SeveranceResult {
  const duration = serviceDuration(input.startDate, input.endDate);
  const weekly = weeklyWage(Math.max(0, input.grossMonthlyWage));

  const seasonalExempt = Boolean(input.seasonal);
  const tier = seasonalExempt ? null : severanceTier(duration.totalMonths);
  const notice = noticeTier(duration.totalMonths);

  const dismissedShare =
    input.headcount && input.headcount > 0 && input.dismissedCount != null
      ? input.dismissedCount / input.headcount
      : null;
  const thresholdMet =
    input.headcount && input.headcount > 0 && input.dismissedCount != null
      ? input.dismissedCount >= COLLECTIVE_MIN_HEADCOUNT &&
        input.dismissedCount / input.headcount >= COLLECTIVE_MIN_SHARE
      : null;

  const severanceAmount = (tier?.weeks ?? 0) * weekly;
  const noticeAmount = notice.weeks * weekly;

  return {
    duration,
    weeklyWage: weekly,
    thresholdMet,
    dismissedShare,
    seasonalExempt,
    severance: { tier, weeks: tier?.weeks ?? 0, amount: severanceAmount },
    notice: { tier: notice, weeks: notice.weeks, amount: noticeAmount },
    total: severanceAmount + noticeAmount,
  };
}
