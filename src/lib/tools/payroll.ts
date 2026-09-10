/**
 * Sosyal güvenlik kesintileri ve işveren maliyeti.
 *
 * İKİ AYRI SİGORTA REJİMİ VAR ve hangisine tabi olduğunuzu ilk sigortalılık
 * tarihiniz belirliyor:
 *
 *  - 73/2007 Sosyal Güvenlik Yasası 1 Ocak 2008'de yürürlüğe girdi. Geçici
 *    kurallar (madde 2 ve devamı), o tarihte hâlihazırda bir sosyal güvenlik
 *    sistemine bağlı olanların ESKİ sistemlerine bağlı kalmaya devam edeceğini
 *    söylüyor. Yani 2008'den önce sigortalı olanlar 16/1976 Kıbrıs Türk Sosyal
 *    Sigortalar Yasası'na, o tarihten sonra ilk kez sigortalı olanlar 73/2007'ye
 *    tabi.
 *  - Prim oranları iki yasada FARKLI (73/2007 madde 78 ve 16/1976 madde 83), ama
 *    tesadüfen işçi kesintisinin toplamı ikisinde de %9 çıkıyor. Bileşenler
 *    farklı olduğu için tek bir tabloyla göstermek yanlış olurdu.
 *
 * Bir de İhtiyat Sandığı var; o ayrı bir yasa (34/1993, 74/2007 ile değişik
 * madde 8) ve oranı da aynı ayrıma göre değişiyor: eski sistemde %5, Sosyal
 * Güvenlik Yasası'ndan sonra ilk kez girenlerde %4.
 *
 * DOĞRULAMA: Çalışma Dairesi 1 Temmuz 2026 asgari ücretini brüt 70.893 TL, net
 * 61.677 TL olarak ilan ediyor. 70.893 × (%9 + %4) = 9.216,09 ve
 * 70.893 − 9.216,09 = 61.676,91. Aradaki 9 kuruş yuvarlamadan. Yani Dairenin
 * "net"i tam olarak bu iki kesintiden ibaret.
 *
 * GELİR VERGİSİ BU HESABIN DIŞINDA. Stopaj, 24/1982 Gelir Vergisi Yasası'nın
 * dilim ve indirim kurallarına bağlı; medeni hal, çocuk sayısı ve diğer şahsi
 * indirimlerle değişiyor. Asgari ücret düzeyinde vergi çıkmadığı için Dairenin
 * ilan ettiği net tutuyor, daha yüksek ücretlerde tutmaz. Bu yüzden çıktı
 * "net maaş" değil, "sosyal güvenlik kesintileri sonrası ücret" olarak
 * adlandırılıyor.
 */

import { MINIMUM_WAGE } from './constants';

export type InsuranceScheme = 'sgk' | 'legacy';

export interface ContributionLine {
  branch: string;
  /** Toplam oran, yüzde olarak (6.5 = %6,5). */
  total: number;
  employee: number;
  employer: number;
  state: number;
  note?: string;
}

/** 73/2007 madde 78(1) — 1 Ocak 2008'den sonra ilk kez sigortalı olanlar. */
export const SGK_CONTRIBUTIONS: readonly ContributionLine[] = [
  {
    branch: 'İş kazaları ve meslek hastalıkları',
    total: 0.5,
    employee: 0,
    employer: 0.5,
    state: 0,
    note: 'Tehlike sınıfına göre %0,5 ile %6 arası; tamamı işverene ait (madde 78(1)(A), 79).',
  },
  { branch: 'Hastalık', total: 6.5, employee: 2.25, employer: 2.25, state: 2 },
  { branch: 'Analık', total: 1, employee: 0.5, employer: 0.5, state: 0 },
  { branch: 'Malullük, yaşlılık ve ölüm', total: 16.5, employee: 5.5, employer: 7, state: 4 },
  { branch: 'İşsizlik', total: 1.5, employee: 0.75, employer: 0.75, state: 0 },
];

/** 16/1976 madde 83 (2/2012 ile değişik) — 2008 öncesi sigortalılar. */
export const LEGACY_CONTRIBUTIONS: readonly ContributionLine[] = [
  {
    branch: 'İş kazaları ve meslek hastalıkları',
    total: 0,
    employee: 0,
    employer: 0,
    state: 0,
    note: 'Tarifeye göre saptanıyor, %6’yı geçemez; tamamı işverene ait (madde 83(1), 84).',
  },
  { branch: 'Hastalık', total: 6, employee: 2, employer: 2, state: 2 },
  { branch: 'Analık', total: 1, employee: 0, employer: 0.5, state: 0.5 },
  { branch: 'Malullük, yaşlılık ve ölüm', total: 16, employee: 6, employer: 7, state: 3 },
  { branch: 'İşsizlik', total: 3, employee: 1, employer: 1, state: 1 },
];

/** İş kazası priminin yasadaki alt ve üst sınırı (73/2007 madde 78(1)(A)). */
export const ACCIDENT_RATE_RANGE = { min: 0.5, max: 6 } as const;

/** İhtiyat Sandığı işçi primi — 74/2007 ile değişik madde 8. */
export const PROVIDENT_EMPLOYEE_RATE = { sgk: 4, legacy: 5 } as const;
export const PROVIDENT_EMPLOYER_RATE = { sgk: 4, legacy: 5 } as const;

/**
 * 73/2007 madde 83(1): prime esas günlük kazancın alt sınırı brüt asgari ücretin
 * otuzda biri, üst sınırı bu alt sınırın YEDİ KATI. Aylığa çevrilince taban brüt
 * asgari ücret, tavan onun yedi katı.
 *
 * 16/1976 madde 88'de böyle bir formül yok; sınırları Bakanlar Kurulu saptıyor.
 * Eski rejim seçildiğinde bu yüzden tavan uygulanmıyor ve ekranda neden
 * uygulanmadığı yazılıyor.
 */
export const SGK_CEILING_MULTIPLIER = 7;

export interface PayrollInput {
  grossMonthlyWage: number;
  scheme: InsuranceScheme;
  /** İş kazası prim oranı, yüzde. Yalnızca işveren maliyetini etkiliyor. */
  accidentRate?: number;
  /** Yürürlükteki aylık brüt asgari ücret — taban ve tavanın kaynağı. */
  minimumWage?: number;
  /** İhtiyat Sandığı oranı sözleşmeyle artırılmışsa, yüzde. */
  providentEmployeeRate?: number | null;
  providentEmployerRate?: number | null;
}

export interface PayrollResult {
  scheme: InsuranceScheme;
  grossMonthlyWage: number;
  /** Prime esas kazanç — taban ve tavan uygulandıktan sonra. */
  contributionBase: number;
  ceiling: number | null;
  ceilingApplied: boolean;
  floorApplied: boolean;
  lines: readonly ContributionLine[];
  socialSecurity: {
    employeeRate: number;
    employeeAmount: number;
    employerRate: number;
    employerAmount: number;
  };
  provident: {
    employeeRate: number;
    employeeAmount: number;
    employerRate: number;
    employerAmount: number;
  };
  totalEmployeeDeduction: number;
  /** Gelir vergisi HARİÇ ele geçen. */
  netBeforeTax: number;
  employerCost: number;
}

export function calculatePayroll(input: PayrollInput): PayrollResult {
  const gross = Math.max(0, input.grossMonthlyWage || 0);
  const minimumWage =
    input.minimumWage && input.minimumWage > 0 ? input.minimumWage : MINIMUM_WAGE.grossMonthly;

  const isSgk = input.scheme === 'sgk';
  const baseLines = isSgk ? SGK_CONTRIBUTIONS : LEGACY_CONTRIBUTIONS;

  const accidentRate = Math.min(
    ACCIDENT_RATE_RANGE.max,
    Math.max(0, input.accidentRate ?? ACCIDENT_RATE_RANGE.min),
  );
  const lines = baseLines.map((line, index) =>
    index === 0 ? { ...line, total: accidentRate, employer: accidentRate } : line,
  );

  const ceiling = isSgk ? minimumWage * SGK_CEILING_MULTIPLIER : null;
  const floorApplied = isSgk && gross > 0 && gross < minimumWage;
  const ceilingApplied = ceiling !== null && gross > ceiling;
  const contributionBase = ceilingApplied ? ceiling : floorApplied ? minimumWage : gross;

  const employeeRate = lines.reduce((sum, line) => sum + line.employee, 0);
  const employerRate = lines.reduce((sum, line) => sum + line.employer, 0);

  const providentEmployeeRate = Math.max(
    PROVIDENT_EMPLOYEE_RATE[input.scheme],
    input.providentEmployeeRate ?? 0,
  );
  const providentEmployerRate = Math.max(
    PROVIDENT_EMPLOYER_RATE[input.scheme],
    input.providentEmployerRate ?? 0,
  );

  const ssEmployee = (contributionBase * employeeRate) / 100;
  const ssEmployer = (contributionBase * employerRate) / 100;
  /*
   * İhtiyat Sandığı primi BRÜT ÜCRET üzerinden. 74/2007 ile değişik madde 8
   * matrahı "müstahdemin brüt ücreti" diye tanımlıyor ve sosyal sigorta prim
   * tavanına atıf yapmıyor — tavan yalnızca sigorta primlerine ait.
   */
  const pfEmployee = (gross * providentEmployeeRate) / 100;
  const pfEmployer = (gross * providentEmployerRate) / 100;

  const totalEmployeeDeduction = ssEmployee + pfEmployee;

  return {
    scheme: input.scheme,
    grossMonthlyWage: gross,
    contributionBase,
    ceiling,
    ceilingApplied,
    floorApplied,
    lines,
    socialSecurity: {
      employeeRate,
      employeeAmount: ssEmployee,
      employerRate,
      employerAmount: ssEmployer,
    },
    provident: {
      employeeRate: providentEmployeeRate,
      employeeAmount: pfEmployee,
      employerRate: providentEmployerRate,
      employerAmount: pfEmployer,
    },
    totalEmployeeDeduction,
    netBeforeTax: gross - totalEmployeeDeduction,
    employerCost: gross + ssEmployer + pfEmployer,
  };
}
