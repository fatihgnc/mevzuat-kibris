/**
 * A worked example for each tool, rendered ON THE SERVER.
 *
 * The form computes in the browser, so a crawler sees an empty form and no
 * number — yet the number is exactly what someone searching "asgari ücretle
 * net maaş ne kadar" wants. So a fixed-input example, run through the SAME pure
 * functions the form uses, is written into the page's HTML. Nothing is typed
 * by hand: when a rate changes the example changes with it and can never drift
 * from the form.
 */

import { MINIMUM_WAGE } from './constants';
import { formatDate, parseDate } from './duration';
import { formatCurrency, formatDays, formatNumber } from './format';
import { calculateAnnualLeave } from './annual-leave';
import { calculateIncomeTax } from './income-tax';
import { calculateOvertime } from './overtime';
import { maternityTimeline } from './parental-leave';
import { calculatePayroll } from './payroll';
import { calculateProvidentFund } from './provident-fund';
import { calculateSeverance } from './severance';
import { calculateWorkPermitPenalty } from './work-permit-penalty';

export interface ToolExample {
  /** The example's inputs, e.g. "Aylık brüt ücret: 70.893 TL". */
  inputs: readonly string[];
  /** Sentences describing the result. */
  outcome: readonly string[];
}

/** Fixed dates, so an example does not shift with the day the page is rendered. */
function date(value: string): Date {
  const parsed = parseDate(value);
  if (!parsed) throw new Error(`Geçersiz örnek tarihi: ${value}`);
  return parsed;
}

const wage = MINIMUM_WAGE.grossMonthly;

const EXAMPLES: Record<string, () => ToolExample> = {
  'net-brut-maas-hesaplayici': () => {
    const local = calculatePayroll({ grossMonthlyWage: wage, scheme: 'sgk' });
    const foreign = calculatePayroll({ grossMonthlyWage: wage, scheme: 'sgk', nationality: 'other' });
    const higherGross = 150_000;
    const higher = calculatePayroll({ grossMonthlyWage: higherGross, scheme: 'sgk' });
    const higherTax = calculateIncomeTax({
      grossMonthlyWage: higherGross,
      socialContributions: higher.totalEmployeeDeduction,
      salariesPerYear: 12,
      spouse: false,
      childrenA: 0,
      childrenB: 0,
      childrenC: 0,
      disability: 'none',
      over65: false,
    });
    return {
      inputs: [
        `Aylık brüt ücret: ${formatCurrency(wage)} (${MINIMUM_WAGE.effectiveLabel} asgari ücreti)`,
        'İlk sigortalılık: 1 Ocak 2008 sonrası (73/2007)',
        'İş kazası prim oranı: %0,5',
      ],
      outcome: [
        `KKTC veya TC vatandaşı bir işçide sosyal sigorta kesintisi ${formatCurrency(local.socialSecurity.employeeAmount)}, İhtiyat Sandığı kesintisi ${formatCurrency(local.provident.employeeAmount)}. Asgari ücrette kişisel ve özel indirimler matrahı sıfıra yakın bıraktığı için gelir vergisi çıkmaz; net maaş ${formatCurrency(local.netBeforeTax)}. İşverene toplam maliyet ${formatCurrency(local.employerCost)}.`,
        `Aynı ücretle çalışan ve anlaşmalı ülke vatandaşı olmayan bir işçide YGK 83/2026 uyarınca sigortalı hissesi %13’e çıktığı için ele geçen ${formatCurrency(foreign.netBeforeTax)}, işverene maliyet ${formatCurrency(foreign.employerCost)}.`,
        `${formatCurrency(higherGross)} brüt ücret alan, eş ve çocuk indirimi olmayan bir işçide kesintiler ${formatCurrency(higher.totalEmployeeDeduction)}, gelir vergisi ${formatCurrency(higherTax.tax)} (en yüksek dilim %${higherTax.marginalRate}); net maaş ${formatCurrency(higher.netBeforeTax - higherTax.tax)}.`,
      ],
    };
  },

  'fazla-mesai-hesaplayici': () => {
    const result = calculateOvertime({
      grossMonthlyWage: wage,
      normalHoursInMonth: 176,
      weekdayOvertimeHours: 10,
      holidayOvertimeHours: 8,
    });
    return {
      inputs: [
        `Aylık brüt ücret: ${formatCurrency(wage)}`,
        'O ay normal mesaide çalışılan saat: 176 (22 iş günü × 8 saat)',
        'Hafta içi fazla mesai: 10 saat; hafta tatilinde çalışma: 8 saat',
      ],
      outcome: [
        `Saat başı ücret ${formatCurrency(result.hourlyRate)}. Hafta içi 10 saatin %10 zamlı karşılığı ${formatCurrency(result.weekday.amount)}, hafta tatilindeki 8 saatin %50 zamlı karşılığı ${formatCurrency(result.holiday.amount)}; toplam fazla mesai ücreti ${formatCurrency(result.overtimeTotal)}.`,
      ],
    };
  },

  'toplu-isten-cikarma-hesaplayici': () => {
    const monthly = 80000;
    const result = calculateSeverance({
      startDate: date('2021-03-01'),
      endDate: date('2026-09-01'),
      grossMonthlyWage: monthly,
    });
    return {
      inputs: [
        'İşe giriş: 1 Mart 2021; çıkış: 1 Eylül 2026 (5 yıl 6 ay)',
        `Aylık brüt ücret: ${formatCurrency(monthly)}`,
      ],
      outcome: [
        `Haftalık ücret ${formatCurrency(result.weeklyWage)}. Beş yıldan fazla hizmet için madde 19 tazminatı ${result.severance.weeks} haftalık ücret, ${formatCurrency(result.severance.amount)}. Buna ek olarak madde 12 bildirim süresi ${result.notice.weeks} hafta; bildirim yapılmadıysa ihbar tazminatı ${formatCurrency(result.notice.amount)}. İki kalemin toplamı ${formatCurrency(result.total)}.`,
      ],
    };
  },

  'yillik-izin-hesaplayici': () => {
    const result = calculateAnnualLeave({
      startDate: date('2019-01-15'),
      asOf: date('2026-09-10'),
    });
    return {
      inputs: ['İşe giriş: 15 Ocak 2019', 'Hesaplanan tarih: 10 Eylül 2026'],
      outcome: [
        `Hizmet süresi beş yılı geçtiği için madde 43(1)(B) basamağı uygulanır: yıllık ${formatDays(result.fullYearDays)} ücretli izin. Tam beş yılı dolduramamış bir işçi aynı tabloda ${formatDays(14)} hak ederdi.`,
      ],
    };
  },

  'dogum-ve-mazeret-izni-hesaplayici': () => {
    const birth = date('2026-11-16');
    const timeline = maternityTimeline(birth);
    return {
      inputs: [`Doğum tarihi (beklenen): ${formatDate(birth)}`],
      outcome: [
        `Çalıştırma yasağı ${formatDate(timeline.mandatoryStart)} tarihinde başlar ve ${formatDate(timeline.mandatoryEnd)} tarihinde biter. İsteğe bağlı ödeneksiz izinle birlikte süre ${formatDate(timeline.unpaidStart)} – ${formatDate(timeline.unpaidEnd)} aralığına uzar. Günde iki saatlik emzirme izni ${formatDate(timeline.nursingEnd)} tarihine kadar sürer.`,
      ],
    };
  },

  'yabanci-calisma-izni-cezasi-hesaplayici': () => {
    const result = calculateWorkPermitPenalty({
      kind: 'unlicensed-employment',
      count: 2,
      occurrenceInYear: 1,
    });
    return {
      inputs: [
        'İhlal: izinsiz yabancı çalıştırma (madde 7)',
        'İzinsiz çalıştırılan kişi: 2; yıl içindeki ilk tespit',
        `Aylık brüt asgari ücret: ${formatCurrency(result.minimumWage)}`,
      ],
      outcome: [
        `Kişi başı bir kat asgari ücret uygulandığından idari para cezası ${formatCurrency(result.administrativeFine)}. Dava mahkemeye giderse azami para cezası ${formatCurrency(result.court.maxFine)} (kişi başı ${formatNumber(result.court.maxMultiplier)} kat) ve iki yıla kadar hapis riski doğar.`,
      ],
    };
  },

  'ihtiyat-sandigi-hesaplayici': () => {
    const result = calculateProvidentFund({
      joinDate: date('2016-09-01'),
      asOf: date('2026-09-01'),
      grossMonthlyWage: wage,
      scheme: 'current',
    });
    return {
      inputs: [
        'Sandığa giriş: 1 Eylül 2016 (10 yıl, Sosyal Güvenlik Yasası sonrası — %4 + %4)',
        `Aylık brüt ücret: ${formatCurrency(wage)}, ücret artışı ve faiz girilmedi`,
      ],
      outcome: [
        `Aylık toplam yatırım ${formatCurrency(result.monthlyContribution)}; on yılda faiz hariç ${formatCurrency(result.contributionsTotal)} birikir. Bunun yarısı, ${formatCurrency(result.maxAdvance)}, avans olarak çekilebilir. On beş yıl dolmadığı için dörtte bir hakkına ${formatNumber(result.quarter.monthsRemaining)} ay kalmıştır.`,
      ],
    };
  },
};

export function toolExample(slug: string): ToolExample | null {
  return EXAMPLES[slug]?.() ?? null;
}

export const EXAMPLE_SLUGS = Object.keys(EXAMPLES);
