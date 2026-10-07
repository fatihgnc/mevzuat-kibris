import { describe, expect, it } from 'vitest';

import { ageCheck, calculateVehicleImport, customsRate, fifRate } from './vehicle-import';

const line = (result: ReturnType<typeof calculateVehicleImport>, key: string) =>
  result.lines.find((entry) => entry.key === key)?.amount;

const d = (value: string) => new Date(value + 'T00:00:00');

describe('customs duty (A.E. 464/2026, heading 87.03)', () => {
  it('charges the general column 10% whatever the car', () => {
    expect(customsRate('petrol', 1200, 'other')).toBe(10);
    expect(customsRate('electric', null, 'other')).toBe(10);
  });

  it('exempts AB-EFTA petrol cars up to 2000 cm³ and diesel up to 2500 cm³', () => {
    expect(customsRate('petrol', 2000, 'eu')).toBe(0);
    expect(customsRate('petrol', 2001, 'eu')).toBe(10);
    expect(customsRate('diesel', 2200, 'tc')).toBe(0);
    expect(customsRate('diesel', 2501, 'tc')).toBe(10);
  });

  it('exempts AB-EFTA hybrids and electric cars of any size', () => {
    expect(customsRate('hybrid', 3500, 'eu')).toBe(0);
    expect(customsRate('electric', null, 'tc')).toBe(0);
  });
});

describe('Fiyat İstikrar Fonu (A.E. 938/2026)', () => {
  it('uses 3/3/8/12% by engine size and 5% for electric cars', () => {
    expect(fifRate('petrol', 1500, 'other').rate).toBe(3);
    expect(fifRate('petrol', 2000, 'other').rate).toBe(3);
    expect(fifRate('diesel', 3000, 'eu').rate).toBe(8);
    expect(fifRate('petrol', 3001, 'other').rate).toBe(12);
    expect(fifRate('electric', null, 'other').rate).toBe(5);
  });

  it('charges TC-origin cars 50% of the first row and 70% of the others, not electric ones', () => {
    expect(fifRate('petrol', 1400, 'tc').rate).toBe(1.5);
    expect(fifRate('petrol', 1800, 'tc').rate).toBe(2.1);
    expect(fifRate('petrol', 2500, 'tc').rate).toBe(5.6);
    expect(fifRate('electric', null, 'tc').rate).toBe(5);
  });

  it('puts a hybrid in the engine-size row', () => {
    expect(fifRate('hybrid', 1800, 'other')).toEqual({ rate: 3, row: '(A)(ii)' });
  });
});

describe('calculateVehicleImport', () => {
  it('adds up a 1500 cm³ petrol car from a third country', () => {
    const result = calculateVehicleImport({ cifTl: 1_000_000, fuel: 'petrol', engineCc: 1500, origin: 'other' });
    expect(line(result, 'customs')).toBe(100_000);
    expect(line(result, 'fif')).toBe(30_000);
    expect(line(result, 'wharf')).toBe(44_000);
    expect(line(result, 'gkk')).toBe(25_000);
    expect(result.vatBase).toBe(1_199_000);
    expect(line(result, 'vat')).toBe(239_800);
    expect(result.customsTotal).toBe(438_800);
    expect(line(result, 'registration')).toBe(60_000);
    expect(result.total).toBe(498_800);
    expect(result.landedCost).toBe(1_498_800);
    expect(result.burdenPercent).toBe(49.88);
  });

  it('charges an electric car 5% FİF, 5% VAT and 4% registration', () => {
    const result = calculateVehicleImport({ cifTl: 1_000_000, fuel: 'electric', engineCc: null, origin: 'eu' });
    expect(line(result, 'customs')).toBe(0);
    expect(line(result, 'fif')).toBe(50_000);
    expect(line(result, 'vat')).toBe(55_950);
    expect(line(result, 'registration')).toBe(40_000);
    expect(result.total).toBe(214_950);
  });

  it('charges a hybrid 20% VAT but 4% registration', () => {
    const result = calculateVehicleImport({ cifTl: 1_000_000, fuel: 'hybrid', engineCc: 1800, origin: 'other' });
    expect(line(result, 'vat')).toBe(239_800);
    expect(line(result, 'registration')).toBe(40_000);
  });

  it('keeps the commercial withholding out of the VAT base', () => {
    const personal = calculateVehicleImport({ cifTl: 1_000_000, fuel: 'petrol', engineCc: 1500, origin: 'other' });
    const dealer = calculateVehicleImport({
      cifTl: 1_000_000,
      fuel: 'petrol',
      engineCc: 1500,
      origin: 'other',
      commercial: true,
    });
    expect(line(personal, 'withholding')).toBeUndefined();
    expect(line(dealer, 'withholding')).toBe(40_000);
    expect(dealer.vatBase).toBe(personal.vatBase);
    expect(dealer.total).toBe(personal.total + 40_000);
  });
});

describe('age limit (Yaş Sınırlandırılması Tüzüğü, section 5(1))', () => {
  it('refuses a car that has reached five years by the day it arrives', () => {
    expect(ageCheck(d('2021-10-08'), d('2026-10-07')).allowed).toBe(true);
    expect(ageCheck(d('2021-10-07'), d('2026-10-07')).allowed).toBe(false);
  });
});
