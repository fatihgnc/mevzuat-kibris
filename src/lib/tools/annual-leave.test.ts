import { describe, expect, it } from 'vitest';

import { calculateAnnualLeave, leaveTierForMonths } from './annual-leave';

const d = (value: string) => new Date(value + 'T00:00:00');

describe('leaveTierForMonths — madde 43(1) basamak sınırları', () => {
  it('altı ayı doldurmayan hizmet hiçbir basamağa girmiyor', () => {
    expect(leaveTierForMonths(5)).toBeNull();
    expect(leaveTierForMonths(6)?.days).toBe(14);
  });

  /*
   * Bu testin varlık sebebi: raporun "alt sınır dahil, üst sınır hariç" kuralı
   * beş yıllık işçiye 18 gün yazdırıyordu. Yasa (A) bendini "beş yıla KADAR",
   * (B) bendini "beş yıldan FAZLA" diye yazdığı için tam beş yıl (A)'da kalıyor.
   */
  it('tam beş yıl (A) bendinde, 14 gün', () => {
    expect(leaveTierForMonths(60)?.clause).toBe('A');
    expect(leaveTierForMonths(60)?.days).toBe(14);
    expect(leaveTierForMonths(61)?.days).toBe(18);
  });

  it('tam on yıl ve tam on beş yıl kendi basamaklarının ilk ayı', () => {
    expect(leaveTierForMonths(119)?.days).toBe(18);
    expect(leaveTierForMonths(120)?.days).toBe(22);
    expect(leaveTierForMonths(179)?.days).toBe(22);
    expect(leaveTierForMonths(180)?.days).toBe(25);
    expect(leaveTierForMonths(400)?.days).toBe(25);
  });
});

describe('calculateAnnualLeave', () => {
  it('altı ayı doldurmayan işçide hak doğmuyor', () => {
    const result = calculateAnnualLeave({
      startDate: d('2026-05-01'),
      asOf: d('2026-09-10'),
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('under-six-months');
  });

  it('madde 44(5): altı aydan az süren mevsimlik işte kurallar uygulanmıyor', () => {
    const result = calculateAnnualLeave({
      startDate: d('2015-01-01'),
      asOf: d('2026-09-10'),
      seasonal: true,
    });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe('seasonal');
  });

  it('madde 43(4): dokuz aylık hizmette orantılı izin, yuvarlanmadan', () => {
    const result = calculateAnnualLeave({
      startDate: d('2025-12-10'),
      asOf: d('2026-09-10'),
    });
    expect(result.duration.totalMonths).toBe(9);
    expect(result.fullYearDays).toBe(14);
    expect(result.proRatedDays).toBeCloseTo(10.5, 5);
    expect(result.usableDays).toBeCloseTo(10.5, 5);
  });

  it('madde 44(4): yıl dolduysa kullanılabilir hak, dolan yılın tam izni', () => {
    const result = calculateAnnualLeave({
      startDate: d('2020-03-01'),
      asOf: d('2026-09-10'),
      usedDays: 6,
    });
    expect(result.duration.years).toBe(6);
    // Altıncı yılını kapattığında 72 aylıktı → (B) bendi, 18 gün.
    expect(result.usableDays).toBe(18);
    expect(result.remainingDays).toBe(12);
  });

  it('dolan yılın izni, o yılın sonundaki basamaktan geliyor', () => {
    // 5 yıl 2 ay: beşinci yıl kapanırken 60 aylıktı → (A), 14 gün.
    const result = calculateAnnualLeave({
      startDate: d('2021-07-10'),
      asOf: d('2026-09-10'),
    });
    expect(result.duration.years).toBe(5);
    expect(result.tier?.days).toBe(18);
    expect(result.usableDays).toBe(14);
  });

  it('18 yaşında ve daha küçük işçide taban 18 iş günü', () => {
    const result = calculateAnnualLeave({
      startDate: d('2025-01-01'),
      asOf: d('2026-09-10'),
      birthDate: d('2009-01-01'),
    });
    expect(result.youngWorkerApplied).toBe(true);
    expect(result.fullYearDays).toBe(18);
    expect(result.usableDays).toBe(18);
  });

  it('19 yaşındaki işçide taban devreye girmiyor', () => {
    const result = calculateAnnualLeave({
      startDate: d('2025-01-01'),
      asOf: d('2026-09-10'),
      birthDate: d('2007-01-01'),
    });
    expect(result.youngWorkerApplied).toBe(false);
    expect(result.fullYearDays).toBe(14);
  });

  it('kullanılan izin hakkı aşarsa kalan sıfırda kalıyor', () => {
    const result = calculateAnnualLeave({
      startDate: d('2020-03-01'),
      asOf: d('2026-09-10'),
      usedDays: 40,
    });
    expect(result.remainingDays).toBe(0);
  });
});
