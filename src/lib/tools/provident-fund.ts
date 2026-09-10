/**
 * İhtiyat Sandığı birikimi ve avans hakkı — İhtiyat Sandığı Yasası (34/1993),
 * 74/2007 sayılı Değişiklik Yasası ile değişik madde 8, 9 ve 10.
 *
 * BU BİR TAHMİN ARACI. Sandıktaki gerçek bakiye, her ay yatırılan primlerin
 * Bakanlar Kurulu kararıyla belirlenen faiz oranlarıyla işletilmesinden çıkıyor
 * ve o oran yıldan yıla değişiyor. Araç tek bir yıllık oranı bütün geçmişe
 * uyguluyor; sonucu "hesap dökümü" gibi sunmak yanlış olur, ekranda da öyle
 * sunulmuyor.
 */

import { serviceDuration, type ServiceDuration } from './duration';

/** Madde 8(1) ve (3): Sosyal Güvenlik Yasası öncesi kapsama girenler. */
export const LEGACY_RATES = { employee: 0.05, employer: 0.05 } as const;
/** Madde 8(6): Sosyal Güvenlik Yasası'ndan sonra ilk defa kapsama girenler. */
export const CURRENT_RATES = { employee: 0.04, employer: 0.04 } as const;

/** Madde 10(1): birikimin en fazla yarısı avans olarak çekilebiliyor. */
export const ADVANCE_SHARE = 0.5;
/** Madde 10(3): en az on beş yıl yatırım → birikimin dörtte biri, bir defaya mahsus. */
export const QUARTER_WITHDRAWAL_YEARS = 15;
export const QUARTER_WITHDRAWAL_SHARE = 0.25;
/** Madde 10(3): dörtte birini alan iştirakçi iki yıl avans alamıyor. */
export const QUARTER_WITHDRAWAL_ADVANCE_BLOCK_YEARS = 2;

/** Madde 9(9): tüm birikimi faiziyle çekme yaşı. */
export const FULL_WITHDRAWAL_AGE_SGK = 60;
export const FULL_WITHDRAWAL_AGE_OTHER = 55;

export type ProvidentScheme = 'legacy' | 'current';

export interface ProvidentFundInput {
  joinDate: Date;
  asOf: Date;
  /** Aylık brüt ücret — primin matrahı. */
  grossMonthlyWage: number;
  scheme: ProvidentScheme;
  /** Yıllık ücret artışı, oran olarak (0.30 = %30). Boş bırakılabilir. */
  annualWageGrowth?: number | null;
  /** Yıllık faiz oranı, oran olarak (0.41 = %41). Boş bırakılırsa faiz işletilmez. */
  annualInterestRate?: number | null;
  /** Madde 8(6) son cümlesi / 8(1): sözleşmeyle artırılmış oran varsa. */
  employeeRateOverride?: number | null;
  employerRateOverride?: number | null;
}

export interface ProvidentFundResult {
  duration: ServiceDuration;
  employeeRate: number;
  employerRate: number;
  /** Aylık toplam yatırım (işçi primi + işveren depoziti), bugünkü ücretle. */
  monthlyContribution: number;
  /** Faiz hariç, yalnızca yatırılan tutarların toplamı. */
  contributionsTotal: number;
  /** Faiz işletilmiş tahmini birikim. Faiz girilmediyse contributionsTotal'a eşit. */
  estimatedBalance: number;
  /** Madde 10(1): çekilebilecek azami avans. */
  maxAdvance: number;
  quarter: {
    eligible: boolean;
    /** Hak kazanılmadıysa kalan tam ay. */
    monthsRemaining: number;
    amount: number;
  };
}

export function calculateProvidentFund(input: ProvidentFundInput): ProvidentFundResult {
  const duration = serviceDuration(input.joinDate, input.asOf);
  const base = input.scheme === 'legacy' ? LEGACY_RATES : CURRENT_RATES;

  /*
   * Madde 8(1) ve (3) oranları ASGARİ, madde 8(6) oranları ise "iki katını
   * aşmamak ve eşit oranlarda olmak koşuluyla" artırılabilir. Kullanıcı kendi
   * bordrosundaki oranı girerse yasadaki tabanın altına düşmesine izin verilmiyor.
   */
  const employeeRate = Math.max(base.employee, input.employeeRateOverride ?? 0);
  const employerRate = Math.max(base.employer, input.employerRateOverride ?? 0);
  const totalRate = employeeRate + employerRate;

  const wage = Math.max(0, input.grossMonthlyWage || 0);
  const months = duration.totalMonths;
  const growth = Math.max(0, input.annualWageGrowth ?? 0);
  const interest = Math.max(0, input.annualInterestRate ?? 0);

  /*
   * Ay ay ilerleyen bir döngü. Kapalı formül yazılabilirdi ama ücret artışı ve
   * faiz farklı dönemlerde bileşiklendiği için formül okunmaz hale gelirdi;
   * en uzun senaryoda bile (45 yıl) 540 iterasyon, tarayıcıda ölçülemez.
   */
  const monthlyInterest = interest > 0 ? Math.pow(1 + interest, 1 / 12) - 1 : 0;
  let balance = 0;
  let contributionsTotal = 0;

  for (let month = 0; month < months; month += 1) {
    const wageAtMonth = growth > 0 ? wage / Math.pow(1 + growth, (months - month) / 12) : wage;
    const contribution = wageAtMonth * totalRate;
    contributionsTotal += contribution;
    balance = balance * (1 + monthlyInterest) + contribution;
  }

  const quarterEligible = duration.years >= QUARTER_WITHDRAWAL_YEARS;

  return {
    duration,
    employeeRate,
    employerRate,
    monthlyContribution: wage * totalRate,
    contributionsTotal,
    estimatedBalance: balance,
    maxAdvance: balance * ADVANCE_SHARE,
    quarter: {
      eligible: quarterEligible,
      monthsRemaining: quarterEligible ? 0 : QUARTER_WITHDRAWAL_YEARS * 12 - duration.totalMonths,
      amount: quarterEligible ? balance * QUARTER_WITHDRAWAL_SHARE : 0,
    },
  };
}
