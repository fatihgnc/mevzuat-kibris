import { describe, expect, it } from 'vitest';

import { MINIMUM_WAGE } from './constants';
import { calculateIncomeTax, progressiveTax, type IncomeTaxInput } from './income-tax';
import { calculatePayroll } from './payroll';

const single: Omit<IncomeTaxInput, 'grossMonthlyWage' | 'socialContributions'> = {
  salariesPerYear: 12,
  spouse: false,
  childrenA: 0,
  childrenB: 0,
  childrenC: 0,
  disability: 'none',
  over65: false,
};

function taxFor(gross: number, extra: Partial<IncomeTaxInput> = {}) {
  const payroll = calculatePayroll({ grossMonthlyWage: gross, scheme: 'sgk' });
  return calculateIncomeTax({
    ...single,
    grossMonthlyWage: gross,
    socialContributions: payroll.totalEmployeeDeduction,
    ...extra,
  });
}

describe('income tax — 24/1982 articles 12-15, 52 (2026)', () => {
  /*
   * Independent check: the Labour Department's published net minimum wage
   * (61,677 TL) implies no tax. The statutory reading of article 14(1) leaves
   * a base of ~4 TL.
   */
  it('leaves essentially no tax at the minimum wage', () => {
    const result = taxFor(MINIMUM_WAGE.grossMonthly);
    expect(result.taxableBase).toBeCloseTo(4.28, 1);
    expect(result.tax).toBeLessThan(1);
  });

  it('matches the Tax Department monthly table cumulative figures', () => {
    expect(progressiveTax(7_500, 12).tax).toBeCloseTo(1_125, 5);
    expect(progressiveTax(17_500, 12).tax).toBeCloseTo(3_625, 5);
    expect(progressiveTax(33_333.33, 12).tax).toBeCloseTo(8_375, 1);
    expect(progressiveTax(30_769.23, 13).tax).toBeCloseTo(7_730.77, 1);
  });

  it('150.000 TL brüt, single: 37% band reached', () => {
    const result = taxFor(150_000);
    expect(result.socialDeduction).toBeCloseTo(19_500, 5);
    expect(result.taxableBase).toBeCloseTo(60_916.67, 1);
    expect(result.tax).toBeCloseTo(18_580.83, 1);
    expect(result.marginalRate).toBe(37);
  });

  it('spouse and children lower the base by the published amounts', () => {
    const base = taxFor(150_000);
    const family = taxFor(150_000, { spouse: true, childrenA: 1 });
    expect(base.taxableBase - family.taxableBase).toBeCloseTo((52_400 + 39_300) / 12, 5);
  });

  it('article 13(1)(D): 15% off the tax for a third child, +5% for each after', () => {
    const three = taxFor(200_000, { childrenA: 3 });
    const four = taxFor(200_000, { childrenA: 4 });
    expect(three.largeFamilyRate).toBe(15);
    expect(four.largeFamilyRate).toBe(20);
  });

  it('article 7(1)(f): only 13% of gross is deductible (YGK 83/2026 foreign insured pay 17%)', () => {
    const payroll = calculatePayroll({ grossMonthlyWage: 100_000, scheme: 'sgk', nationality: 'other' });
    const result = calculateIncomeTax({
      ...single,
      grossMonthlyWage: 100_000,
      socialContributions: payroll.totalEmployeeDeduction,
    });
    expect(payroll.totalEmployeeDeduction).toBeCloseTo(17_000, 5);
    expect(result.socialDeduction).toBeCloseTo(13_000, 5);
    expect(result.socialDeductionCapped).toBe(true);
  });

  it('age allowance is not added on top of a disability allowance', () => {
    const both = taxFor(150_000, { disability: '50', over65: true });
    const disabilityOnly = taxFor(150_000, { disability: '50' });
    expect(both.allowancesTotal).toBeCloseTo(disabilityOnly.allowancesTotal, 5);
  });
});
