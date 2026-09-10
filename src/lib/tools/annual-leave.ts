/**
 * Yıllık ücretli izin — 22/1992 İş Yasası madde 43, 44, 46.
 *
 * Madde 43(1) basamakları, yasadaki ifadenin kelimesi kelimesine karşılığı:
 *
 *   (A) "Hizmet süresi altı aydan beş yıla kadar"        → 14 iş günü
 *   (B) "beş yıldan fazla, on yıldan az"                 → 18 iş günü
 *   (C) "on yıl ve daha fazla, on beş yıldan az"         → 22 iş günü
 *   (D) "onbeş yıl ve daha fazla"                        → 25 iş günü
 *
 * SINIRLARIN HANGİ BASAMAĞA DÜŞTÜĞÜ, ARADAKİ TEK FARK OLAN YERDE ÖNEMLİ: tam beş
 * yıl (A)'da kalır (14 gün), çünkü (B) "beş yıldan FAZLA" diyor ve (A)'nın üst
 * ucu "beş yıla KADAR". Buna karşılık tam on yıl (C)'ye, tam on beş yıl (D)'ye
 * düşer; ikisi de "ve daha fazla" ifadesiyle yazılmış. Yani sınırların hepsi aynı
 * yönde çalışmıyor — "alt sınır dahil" diye tek bir kural uydurmak beş yıllık
 * işçiye dört gün fazla izin yazdırırdı.
 */

import { serviceDuration, type ServiceDuration } from './duration';

/** Madde 43(1)'in izin hakkı doğurması için gereken asgari hizmet: altı ay. */
export const MIN_SERVICE_MONTHS = 6;

/** Madde 43(1) son cümlesi: 18 yaşında ve daha küçük işçi için taban. */
export const YOUNG_WORKER_MIN_DAYS = 18;

/** Madde 46(5): bir sonraki yıla aktarılabilecek iznin üst sınırı. */
export const MAX_CARRY_OVER_DAYS = 50;

/** Madde 46(4): o yıl içinde mutlaka kullanılması gereken asgari izin. */
export const MIN_DAYS_USED_IN_YEAR = 14;

export interface LeaveTier {
  /** Madde 43(1) bendi. */
  clause: 'A' | 'B' | 'C' | 'D';
  days: number;
  label: string;
}

/*
 * Basamaklar dizi indeksi yerine adlandırılmış sabitler: `TIERS[0]` yazmak,
 * `noUncheckedIndexedAccess` altında her okumada `undefined` ihtimali doğuruyor
 * ve okurken de hangi bendin kastedildiğini gizliyor.
 */
const TIER_A: LeaveTier = { clause: 'A', days: 14, label: 'Altı aydan beş yıla kadar' };
const TIER_B: LeaveTier = { clause: 'B', days: 18, label: 'Beş yıldan fazla, on yıldan az' };
const TIER_C: LeaveTier = { clause: 'C', days: 22, label: 'On yıl ve daha fazla, on beş yıldan az' };
const TIER_D: LeaveTier = { clause: 'D', days: 25, label: 'On beş yıl ve daha fazla' };

export const LEAVE_TIERS: readonly LeaveTier[] = [TIER_A, TIER_B, TIER_C, TIER_D];

export function leaveTierForMonths(totalMonths: number): LeaveTier | null {
  if (totalMonths < MIN_SERVICE_MONTHS) return null;
  /*
   * 60 ay = tam beş yıl ve (A)'da kalıyor; (B) 61'inci aydan başlıyor. 120 ve 180
   * ise kendi basamaklarının ilk ayı.
   */
  if (totalMonths <= 60) return TIER_A;
  if (totalMonths < 120) return TIER_B;
  if (totalMonths < 180) return TIER_C;
  return TIER_D;
}

export interface AnnualLeaveInput {
  startDate: Date;
  /** Hesabın yapıldığı tarih. */
  asOf: Date;
  /** Doğum tarihi — madde 43(1) son cümlesindeki 18 yaş kontrolü için. */
  birthDate?: Date | null;
  /** Bu hizmet yılında kullanılmış izin günü. */
  usedDays?: number;
  /**
   * Madde 44(5): niteliği gereği altı aydan az süren mevsimlik veya kampanya
   * işi. Böyle bir işte yıllık izin kuralları hiç uygulanmıyor.
   */
  seasonal?: boolean;
}

export interface AnnualLeaveResult {
  duration: ServiceDuration;
  /** Kurallar hiç uygulanmıyorsa (mevsimlik iş) veya süre altı ayı doldurmadıysa. */
  eligible: boolean;
  reason?: 'seasonal' | 'under-six-months';
  /** Yaşa göre değil, süreye göre hak edilen tam yıllık izin. */
  tier: LeaveTier | null;
  /** 18 yaş tabanı uygulandıktan sonraki tam yıllık izin. */
  fullYearDays: number;
  /** 18 yaş tabanı devreye girdi mi. */
  youngWorkerApplied: boolean;
  /** İçinde bulunulan hizmet yılında geçen tam ay. */
  monthsIntoCurrentYear: number;
  /**
   * Madde 43(4): 12 aydan kısa hizmet için orantılı izin. Ondalık; yasa kesirin
   * yuvarlanmasını değil, bir sonraki hesaplamaya AKTARILMASINI istiyor.
   */
  proRatedDays: number;
  /**
   * Madde 44(4) uyarınca ŞU AN kullanılabilir izin.
   *
   * Bir hizmet yılı dolduysa, o yılın izni gelecek hizmet yılı içinde kullanılır
   * — yani bugün masada duran hak, geçen yılın tam izni. Henüz bir yıl dolmadıysa
   * masada olan tek şey madde 43(4)'ün orantılı hakkı.
   */
  usableDays: number;
  usedDays: number;
  /** Kullanılabilir haktan kullanılan düşüldükten sonra kalan. Negatif olmaz. */
  remainingDays: number;
}

export function calculateAnnualLeave(input: AnnualLeaveInput): AnnualLeaveResult {
  const duration = serviceDuration(input.startDate, input.asOf);
  const usedDays = Math.max(0, input.usedDays ?? 0);

  const empty = {
    duration,
    tier: null,
    fullYearDays: 0,
    youngWorkerApplied: false,
    monthsIntoCurrentYear: duration.totalMonths % 12,
    proRatedDays: 0,
    usableDays: 0,
    usedDays,
    remainingDays: 0,
  };

  if (input.seasonal) return { ...empty, eligible: false, reason: 'seasonal' };
  if (duration.totalMonths < MIN_SERVICE_MONTHS) {
    return { ...empty, eligible: false, reason: 'under-six-months' };
  }

  const tier = leaveTierForMonths(duration.totalMonths);
  const tierDays = tier?.days ?? 0;

  /*
   * Yaş, hesap tarihindeki yaş. Bugün 18 olan bir işçi bu tabandan artık
   * yararlanmıyor; "on sekiz yaşında ve daha küçük" ifadesi 18'i içerdiği için
   * karşılaştırma `<= 18`.
   */
  const ageAtAsOf = input.birthDate
    ? serviceDuration(input.birthDate, input.asOf).years
    : null;
  const youngWorkerApplied = ageAtAsOf !== null && ageAtAsOf <= 18 && tierDays < YOUNG_WORKER_MIN_DAYS;
  const fullYearDays = youngWorkerApplied ? YOUNG_WORKER_MIN_DAYS : tierDays;

  /*
   * Madde 43(4) orantısı, İÇİNDE BULUNULAN hizmet yılına uygulanıyor: tamamlanan
   * her hizmet yılı zaten tam izni doğurmuş durumda. Bu araç "bu yıl ne kadar
   * biriktirdim" sorusunu yanıtlıyor, geçmiş yıllardan devreden bakiyeyi değil —
   * onu bilen tek yer işverenin madde 52 izin kaydı.
   */
  const monthsIntoCurrentYear = duration.totalMonths % 12;
  const proRatedDays = (fullYearDays * monthsIntoCurrentYear) / 12;

  /*
   * Dolan hizmet yılının izni, O YILIN sonundaki hizmet süresine göre belirlenir.
   * Bugün 5 yıl 2 aylık bir işçinin elindeki hak, beşinci yılı kapattığı andaki
   * basamaktan (60 ay → (A), 14 gün) gelir; 62 aya bakıp 18 gün yazmak, henüz
   * doğmamış bir hakkı bugüne çekmek olurdu.
   */
  const completedYearTier = duration.years >= 1 ? leaveTierForMonths(duration.years * 12) : null;
  const completedYearDays = completedYearTier
    ? youngWorkerApplied
      ? Math.max(completedYearTier.days, YOUNG_WORKER_MIN_DAYS)
      : completedYearTier.days
    : 0;
  const usableDays = duration.years >= 1 ? completedYearDays : proRatedDays;

  return {
    duration,
    eligible: true,
    tier,
    fullYearDays,
    youngWorkerApplied,
    monthsIntoCurrentYear,
    proRatedDays,
    usableDays,
    usedDays,
    remainingDays: Math.max(0, usableDays - usedDays),
  };
}
