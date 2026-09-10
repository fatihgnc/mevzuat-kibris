import { describe, expect, it } from 'vitest';

import { MINIMUM_WAGE } from './constants';
import { addMonths, daysBetween, serviceDuration } from './duration';
import { calculateOvertime } from './overtime';
import { calculatePayroll } from './payroll';
import { maternityTimeline } from './parental-leave';
import { calculateProvidentFund } from './provident-fund';
import { calculateSeverance, noticeTier, severanceTier, weeklyWage } from './severance';
import { calculateWorkPermitPenalty } from './work-permit-penalty';

const d = (value: string) => new Date(value + 'T00:00:00');

describe('duration', () => {
  it('ayın günü gelmediyse o ay dolmamış sayılıyor', () => {
    expect(serviceDuration(d('2026-01-10'), d('2026-02-05')).totalMonths).toBe(0);
    expect(serviceDuration(d('2026-01-10'), d('2026-02-10')).totalMonths).toBe(1);
  });

  it('addMonths ayın son gününü taşırmıyor', () => {
    expect(addMonths(d('2026-01-31'), 1).getMonth()).toBe(1);
    expect(addMonths(d('2026-01-31'), 1).getDate()).toBe(28);
  });

  it('bitiş başlangıçtan önceyse süre sıfır', () => {
    const result = serviceDuration(d('2026-09-10'), d('2026-01-01'));
    expect(result.totalMonths).toBe(0);
    expect(result.totalDays).toBe(0);
  });
});

describe('severance — madde 19 ve madde 12', () => {
  it('üç ayı doldurmayan hizmette madde 19 tazminatı doğmuyor', () => {
    expect(severanceTier(2)).toBeNull();
    expect(severanceTier(3)?.weeks).toBe(1);
  });

  it('tam beş yıl (Ç) bendinde kalıyor, altıncı yılda (D) başlıyor', () => {
    expect(severanceTier(60)?.weeks).toBe(4);
    expect(severanceTier(61)?.weeks).toBe(5);
  });

  it('madde 12 ilk basamağı altı ayı içeriyor', () => {
    expect(noticeTier(6).weeks).toBe(1);
    expect(noticeTier(7).weeks).toBe(3);
    expect(noticeTier(60).weeks).toBe(5);
    expect(noticeTier(61).weeks).toBe(6);
  });

  it('haftalık ücret aylık × 12 ÷ 52 — ayı dört hafta saymıyor', () => {
    expect(weeklyWage(52000)).toBeCloseTo(12000, 5);
  });

  it('iki kalemi ayrı ayrı ve toplam olarak veriyor', () => {
    const result = calculateSeverance({
      startDate: d('2020-01-01'),
      endDate: d('2026-01-01'),
      grossMonthlyWage: 52000,
    });
    expect(result.duration.years).toBe(6);
    expect(result.severance.weeks).toBe(5);
    expect(result.notice.weeks).toBe(6);
    expect(result.severance.amount).toBeCloseTo(60000, 5);
    expect(result.total).toBeCloseTo(132000, 5);
  });

  it('madde 19(4): mevsimlik işte tazminat yok, ihbar süresi duruyor', () => {
    const result = calculateSeverance({
      startDate: d('2024-01-01'),
      endDate: d('2026-01-01'),
      grossMonthlyWage: 52000,
      seasonal: true,
    });
    expect(result.severance.amount).toBe(0);
    expect(result.notice.weeks).toBe(5);
  });

  it('madde 19(1) eşiği: beş kişi VE %20 birlikte aranıyor', () => {
    const under = calculateSeverance({
      startDate: d('2024-01-01'),
      endDate: d('2026-01-01'),
      grossMonthlyWage: 1,
      headcount: 100,
      dismissedCount: 10,
    });
    expect(under.thresholdMet).toBe(false);

    const over = calculateSeverance({
      startDate: d('2024-01-01'),
      endDate: d('2026-01-01'),
      grossMonthlyWage: 1,
      headcount: 20,
      dismissedCount: 5,
    });
    expect(over.thresholdMet).toBe(true);
  });
});

describe('overtime — madde 27 (50/2010 ile değişik) ve madde 40', () => {
  const base = {
    grossMonthlyWage: 44000,
    normalHoursInMonth: 176,
    weekdayOvertimeHours: 10,
    holidayOvertimeHours: 8,
  };

  it('saat başı ücret aylık brütün normal mesai saatine bölümü', () => {
    expect(calculateOvertime(base).hourlyRate).toBeCloseTo(250, 5);
  });

  it('hafta içi %10, hafta tatili/resmî tatil %50 zamlı', () => {
    const result = calculateOvertime(base);
    expect(result.weekday.rate).toBeCloseTo(275, 5);
    expect(result.holiday.rate).toBeCloseTo(375, 5);
    expect(result.overtimeTotal).toBeCloseTo(10 * 275 + 8 * 375, 5);
  });

  it('madde 40(2): çalışılan resmî tatil günü başına saat ücretinin sekiz katı', () => {
    const result = calculateOvertime({ ...base, publicHolidayDaysWorked: 2 });
    expect(result.publicHoliday.perDay).toBeCloseTo(2000, 5);
    expect(result.publicHoliday.amount).toBeCloseTo(4000, 5);
  });

  it('yasal sınır aşılınca hesap durmuyor, uyarı ekleniyor', () => {
    const result = calculateOvertime({
      ...base,
      maxHoursInOneDay: 5,
      overtimeDaysInYear: 95,
    });
    expect(result.warnings).toContain('daily-limit');
    expect(result.warnings).toContain('yearly-limit');
    expect(result.overtimeTotal).toBeGreaterThan(0);
  });

  it('normal mesai saati sıfırsa sıfıra bölme yerine sıfır dönüyor', () => {
    expect(calculateOvertime({ ...base, normalHoursInMonth: 0 }).hourlyRate).toBe(0);
  });
});

describe('maternityTimeline — madde 56', () => {
  const timeline = maternityTimeline(d('2026-06-10'));

  it('yasak doğumdan altı hafta önce başlıyor', () => {
    expect(daysBetween(timeline.mandatoryStart, d('2026-06-10'))).toBe(42);
  });

  it('yasağın son günü doğum + 41 gün', () => {
    expect(daysBetween(d('2026-06-10'), timeline.mandatoryEnd)).toBe(41);
  });

  it('isteğe bağlı ödeneksiz izinle birlikte son gün doğum + 83 gün', () => {
    expect(daysBetween(d('2026-06-10'), timeline.unpaidEnd)).toBe(83);
  });

  it('emzirme izni doğumdan dokuz ay sonra bitiyor', () => {
    expect(timeline.nursingEnd.getMonth()).toBe(2);
    expect(timeline.nursingEnd.getDate()).toBe(9);
    expect(timeline.nursingEnd.getFullYear()).toBe(2027);
  });
});

describe('work permit penalty — 63/2006 madde 24 ve 25', () => {
  const wage = 70893;

  it('ilk tespitte kişi başı bir kat asgari ücret', () => {
    const result = calculateWorkPermitPenalty({
      kind: 'unlicensed-employment',
      minimumWage: wage,
      count: 3,
      occurrenceInYear: 1,
    });
    expect(result.multiplierPerUnit).toBe(1);
    expect(result.administrativeFine).toBe(3 * wage);
  });

  it('aynı yıl ikinci tekrarda iki kat, üçüncüde dört kat', () => {
    expect(
      calculateWorkPermitPenalty({
        kind: 'unlicensed-employment',
        minimumWage: wage,
        count: 1,
        occurrenceInYear: 2,
      }).multiplierPerUnit,
    ).toBe(2);
    expect(
      calculateWorkPermitPenalty({
        kind: 'unlicensed-employment',
        minimumWage: wage,
        count: 1,
        occurrenceInYear: 3,
      }).multiplierPerUnit,
    ).toBe(4);
  });

  it('madde 24(2)(D) artırımı mevcut katın üstüne biniyor', () => {
    const result = calculateWorkPermitPenalty({
      kind: 'unlicensed-employment',
      minimumWage: wage,
      count: 1,
      occurrenceInYear: 2,
      previouslyReportedStopped: true,
    });
    expect(result.multiplierPerUnit).toBe(4);
  });

  it('bildirim ve tüzük ihlallerinde asgari ücretin yarısı', () => {
    const result = calculateWorkPermitPenalty({
      kind: 'regulation',
      minimumWage: wage,
      count: 2,
      occurrenceInYear: 1,
    });
    expect(result.administrativeFine).toBe(wage);
    expect(result.warningFirst).toBe(true);
  });

  it('mahkeme sınırı izinsiz çalıştırmada on iki kat ve hapis riskli', () => {
    const unlicensed = calculateWorkPermitPenalty({
      kind: 'unlicensed-employment',
      minimumWage: wage,
      count: 1,
      occurrenceInYear: 1,
    });
    expect(unlicensed.court.maxMultiplier).toBe(12);
    expect(unlicensed.court.maxPrisonYears).toBe(2);

    const minor = calculateWorkPermitPenalty({
      kind: 'inspection',
      minimumWage: wage,
      count: 1,
      occurrenceInYear: 1,
    });
    expect(minor.court.maxMultiplier).toBe(10);
    expect(minor.court.maxPrisonYears).toBeNull();
  });
});

describe('provident fund — 34/1993 madde 8 ve 10', () => {
  const input = {
    joinDate: d('2016-09-10'),
    asOf: d('2026-09-10'),
    grossMonthlyWage: 50000,
    scheme: 'current' as const,
  };

  it('faiz girilmezse birikim yatırılanların toplamı', () => {
    const result = calculateProvidentFund(input);
    expect(result.duration.years).toBe(10);
    expect(result.monthlyContribution).toBeCloseTo(4000, 5);
    expect(result.estimatedBalance).toBeCloseTo(120 * 4000, 5);
  });

  it('avans birikimin yarısı', () => {
    const result = calculateProvidentFund(input);
    expect(result.maxAdvance).toBeCloseTo(result.estimatedBalance / 2, 5);
  });

  it('on beş yıl dolmadan dörtte bir hakkı doğmuyor', () => {
    const result = calculateProvidentFund(input);
    expect(result.quarter.eligible).toBe(false);
    expect(result.quarter.monthsRemaining).toBe(60);
    expect(result.quarter.amount).toBe(0);
  });

  it('on beş yıl dolunca dörtte bir hesaplanıyor', () => {
    const result = calculateProvidentFund({ ...input, joinDate: d('2010-09-10') });
    expect(result.quarter.eligible).toBe(true);
    expect(result.quarter.amount).toBeCloseTo(result.estimatedBalance / 4, 5);
  });

  it('eski sistemde oran %5 + %5', () => {
    const result = calculateProvidentFund({ ...input, scheme: 'legacy' });
    expect(result.employeeRate).toBe(0.05);
    expect(result.monthlyContribution).toBeCloseTo(5000, 5);
  });

  it('faiz oranı birikimi yatırılanların üstüne çıkarıyor', () => {
    const result = calculateProvidentFund({ ...input, annualInterestRate: 0.4 });
    expect(result.estimatedBalance).toBeGreaterThan(result.contributionsTotal);
  });
});

describe('payroll — 73/2007 madde 78/83, 16/1976 madde 83, İhtiyat Sandığı madde 8', () => {
  /*
   * Bağımsız doğrulama: Çalışma Dairesi 1 Temmuz 2026 asgari ücretini brüt
   * 70.893 TL, net 61.677 TL ilan ediyor. Hesap bunu tutturmuyorsa oranlardan
   * biri yanlıştır.
   */
  it('asgari ücrette Dairenin ilan ettiği neti tutturuyor', () => {
    const result = calculatePayroll({
      grossMonthlyWage: MINIMUM_WAGE.grossMonthly,
      scheme: 'sgk',
    });
    expect(result.socialSecurity.employeeRate).toBeCloseTo(9, 5);
    expect(result.provident.employeeRate).toBe(4);
    expect(Math.round(result.netBeforeTax)).toBe(MINIMUM_WAGE.netMonthly);
  });

  it('eski rejimde de işçi kesintisi %9 ama bileşenler farklı', () => {
    const result = calculatePayroll({
      grossMonthlyWage: MINIMUM_WAGE.grossMonthly,
      scheme: 'legacy',
    });
    expect(result.socialSecurity.employeeRate).toBeCloseTo(9, 5);
    expect(result.lines[3]?.employee).toBe(6);
    expect(result.provident.employeeRate).toBe(5);
  });

  it('73/2007 madde 83: prim tavanı brüt asgari ücretin yedi katı', () => {
    const gross = MINIMUM_WAGE.grossMonthly * 10;
    const result = calculatePayroll({ grossMonthlyWage: gross, scheme: 'sgk' });
    expect(result.ceilingApplied).toBe(true);
    expect(result.contributionBase).toBe(MINIMUM_WAGE.grossMonthly * 7);
    expect(result.socialSecurity.employeeAmount).toBeCloseTo(
      (MINIMUM_WAGE.grossMonthly * 7 * 9) / 100,
      5,
    );
  });

  it('İhtiyat Sandığı primine tavan uygulanmıyor', () => {
    const gross = MINIMUM_WAGE.grossMonthly * 10;
    const result = calculatePayroll({ grossMonthlyWage: gross, scheme: 'sgk' });
    expect(result.provident.employeeAmount).toBeCloseTo((gross * 4) / 100, 5);
  });

  it('eski rejimde yasada formüllü tavan yok, uygulanmıyor', () => {
    const result = calculatePayroll({
      grossMonthlyWage: MINIMUM_WAGE.grossMonthly * 10,
      scheme: 'legacy',
    });
    expect(result.ceiling).toBeNull();
    expect(result.ceilingApplied).toBe(false);
  });

  it('iş kazası oranı yalnızca işveren maliyetini değiştiriyor', () => {
    const low = calculatePayroll({ grossMonthlyWage: 100000, scheme: 'sgk', accidentRate: 0.5 });
    const high = calculatePayroll({ grossMonthlyWage: 100000, scheme: 'sgk', accidentRate: 6 });
    expect(low.netBeforeTax).toBe(high.netBeforeTax);
    expect(high.employerCost).toBeGreaterThan(low.employerCost);
  });

  /*
   * YGK 83/2026: citizens of non-agreement countries go on the D3 payroll. The
   * Department's published D3 totals: employee 13%, employer 9.75% + work
   * accident, state 1.25%.
   */
  it('YGK 83/2026: diğer ülke vatandaşında D3 oranları', () => {
    const result = calculatePayroll({
      grossMonthlyWage: MINIMUM_WAGE.grossMonthly,
      scheme: 'sgk',
      nationality: 'other',
      accidentRate: 0.5,
    });
    const state = result.lines.reduce((sum, line) => sum + line.state, 0);
    expect(result.socialSecurity.employeeRate).toBeCloseTo(13, 5);
    expect(result.socialSecurity.employerRate).toBeCloseTo(9.75 + 0.5, 5);
    expect(state).toBeCloseTo(1.25, 5);
    expect(result.netBeforeTax).toBeCloseTo(58841.19, 2);
  });

  it('TC vatandaşı KKTC vatandaşıyla aynı oranlara tabi', () => {
    const equal = calculatePayroll({ grossMonthlyWage: 90000, scheme: 'sgk', nationality: 'equal' });
    const none = calculatePayroll({ grossMonthlyWage: 90000, scheme: 'sgk' });
    expect(equal.netBeforeTax).toBe(none.netBeforeTax);
  });

  it('vatandaşlık ayrımı eski rejimi etkilemiyor', () => {
    const result = calculatePayroll({
      grossMonthlyWage: 90000,
      scheme: 'legacy',
      nationality: 'other',
    });
    expect(result.nationality).toBe('equal');
    expect(result.socialSecurity.employeeRate).toBeCloseTo(9, 5);
  });
});
