/**
 * Monthly income tax withholding on wages — 24/1982 Gelir Vergisi Yasası.
 *
 * SOURCES. Brackets: article 52 as amended by 25/2026. Personal allowance:
 * Ü(K-I) 132-2026 (RG 16, 28 January 2026), 655,000 TL for 2026. The other
 * allowances are fixed percentages of that figure (articles 12-15). All of it
 * matches the Tax Department's published 2026 table, which also gives the
 * monthly brackets as the annual ones divided by the number of salaries paid
 * in a year (12 or 13).
 *
 * SPECIAL ALLOWANCE BASE. Article 14(1) says 10% "of the GROSS amount" of the
 * wage. The Tax Department's table footnote says "after social security
 * contributions". The two differ by ~92 TL of tax at the minimum wage, and
 * only the statutory reading reproduces the Labour Department's published net
 * minimum wage (61,677 TL, i.e. no tax). The statute wins here.
 *
 * SOCIAL SECURITY CAP. Article 7(1)(f) caps the deductible employee
 * contribution (social insurance + provident fund) at a share of gross, raised
 * by Council of Ministers decision to 13%. Nationals pay exactly 13% (9% + 4%);
 * YGK 83/2026 foreign insured pay 17%, so four points are not deductible.
 *
 * OUT OF SCOPE: the year-end annual return, several employers (article 18:
 * allowances only against the highest wage), non-residents (no allowances),
 * pensioners who also work (doubled allowance), and pro-rating for foreign
 * workers who did not work the full year (article 19).
 */

export const INCOME_TAX_YEAR = 2026;

/** Article 52 (25/2026) — annual bracket widths and rates (percent). */
export const ANNUAL_BRACKETS: ReadonlyArray<{ width: number; rate: number }> = [
  { width: 45_000, rate: 10 },
  { width: 45_000, rate: 20 },
  { width: 120_000, rate: 25 },
  { width: 190_000, rate: 30 },
  { width: Number.POSITIVE_INFINITY, rate: 37 },
];

/** Article 12(1), Ü(K-I) 132-2026. */
export const PERSONAL_ALLOWANCE = 655_000;

/** Article 14(1) — on the gross wage. */
export const SPECIAL_ALLOWANCE_RATE = 10;

/** Article 7(1)(f), as raised by Council of Ministers decision. */
export const SOCIAL_DEDUCTION_CAP_RATE = 13;

/** Percentages of the personal allowance (articles 12(2), 13(1), 15). */
export const ALLOWANCE_RATES = {
  spouse: 8,
  childA: 6,
  childB: 8,
  childC: 11,
  disability50: 15,
  disability100: 30,
  over65: 5,
} as const;

/** Article 13(1)(D) — off the tax itself, not the base. */
export const LARGE_FAMILY_REDUCTION = { third: 15, eachAfter: 5 } as const;

export type Disability = 'none' | '50' | '100';

export interface IncomeTaxInput {
  grossMonthlyWage: number;
  /** Employee social insurance + provident fund actually withheld this month. */
  socialContributions: number;
  salariesPerYear: 12 | 13;
  /** Article 12(2): a spouse living with the taxpayer in the TRNC. */
  spouse: boolean;
  /**
   * Article 13(1)(A): 16 or under and not in school, or in primary school
   * ("ilkokul"). A child in middle school is not here but in B — the statute
   * says ilkokul; the Tax Department's table says ilköğretim.
   */
  childrenA: number;
  /** Article 13(1)(B): secondary school, military service, or permanently disabled. */
  childrenB: number;
  /** Article 13(1)(C): higher education (capped at education spending — assumed at the cap). */
  childrenC: number;
  disability: Disability;
  /** Article 15(2): only when no disability allowance is claimed. */
  over65: boolean;
}

export interface AllowanceLine {
  label: string;
  /** Monthly amount. */
  amount: number;
}

export interface IncomeTaxResult {
  socialDeduction: number;
  socialDeductionCapped: boolean;
  specialAllowance: number;
  allowances: readonly AllowanceLine[];
  allowancesTotal: number;
  taxableBase: number;
  taxBeforeReduction: number;
  largeFamilyRate: number;
  largeFamilyReduction: number;
  tax: number;
  /** Top marginal rate the base reached. */
  marginalRate: number;
}

/** Articles 13(1)(Ç) and 15(3): the ones and tens digits become zero. */
function dropTens(value: number): number {
  return Math.floor(value / 100) * 100;
}

export function annualAllowance(rate: number): number {
  return dropTens((PERSONAL_ALLOWANCE * rate) / 100);
}

export function progressiveTax(base: number, divisor: number): { tax: number; marginalRate: number } {
  let remaining = Math.max(0, base);
  let tax = 0;
  let marginalRate = 0;
  for (const bracket of ANNUAL_BRACKETS) {
    if (remaining <= 0) break;
    const width = bracket.width / divisor;
    const slice = Math.min(remaining, width);
    tax += (slice * bracket.rate) / 100;
    marginalRate = bracket.rate;
    remaining -= slice;
  }
  return { tax, marginalRate };
}

export function calculateIncomeTax(input: IncomeTaxInput): IncomeTaxResult {
  const gross = Math.max(0, input.grossMonthlyWage || 0);
  const divisor = input.salariesPerYear;
  const count = (value: number) => Math.max(0, Math.floor(value || 0));

  const cap = (gross * SOCIAL_DEDUCTION_CAP_RATE) / 100;
  const contributions = Math.max(0, input.socialContributions || 0);
  const socialDeduction = Math.min(contributions, cap);
  const specialAllowance = (gross * SPECIAL_ALLOWANCE_RATE) / 100;

  const monthly = (annual: number) => annual / divisor;
  const allowances: AllowanceLine[] = [
    { label: 'Kişisel indirim', amount: monthly(PERSONAL_ALLOWANCE) },
  ];
  if (input.spouse) {
    allowances.push({ label: 'Eş indirimi', amount: monthly(annualAllowance(ALLOWANCE_RATES.spouse)) });
  }
  const childLines: Array<[number, number, string]> = [
    [count(input.childrenA), ALLOWANCE_RATES.childA, 'okula gitmeyen / ilkokul'],
    [count(input.childrenB), ALLOWANCE_RATES.childB, 'ortaöğretim / askerlik / sakat'],
    [count(input.childrenC), ALLOWANCE_RATES.childC, 'yükseköğretim'],
  ];
  for (const [n, rate, label] of childLines) {
    if (n > 0) {
      allowances.push({
        label: `Çocuk indirimi (${n} × ${label})`,
        amount: monthly(annualAllowance(rate) * n),
      });
    }
  }
  if (input.disability !== 'none') {
    const rate = input.disability === '100' ? ALLOWANCE_RATES.disability100 : ALLOWANCE_RATES.disability50;
    allowances.push({ label: `Sakatlık indirimi (%${input.disability})`, amount: monthly(annualAllowance(rate)) });
  } else if (input.over65) {
    allowances.push({ label: 'Yaşlılık indirimi (65 yaş)', amount: monthly(annualAllowance(ALLOWANCE_RATES.over65)) });
  }

  const allowancesTotal = allowances.reduce((sum, line) => sum + line.amount, 0);
  const taxableBase = Math.max(0, gross - socialDeduction - specialAllowance - allowancesTotal);
  const { tax: taxBeforeReduction, marginalRate } = progressiveTax(taxableBase, divisor);

  const children = childLines.reduce((sum, [n]) => sum + n, 0);
  const largeFamilyRate =
    children >= 3
      ? Math.min(100, LARGE_FAMILY_REDUCTION.third + LARGE_FAMILY_REDUCTION.eachAfter * (children - 3))
      : 0;
  const largeFamilyReduction = (taxBeforeReduction * largeFamilyRate) / 100;

  return {
    socialDeduction,
    socialDeductionCapped: contributions > cap,
    specialAllowance,
    allowances,
    allowancesTotal,
    taxableBase,
    taxBeforeReduction,
    largeFamilyRate,
    largeFamilyReduction,
    tax: taxBeforeReduction - largeFamilyReduction,
    marginalRate,
  };
}
