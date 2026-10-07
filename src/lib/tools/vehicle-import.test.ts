import { describe, expect, it } from 'vitest';

import {
  ageCheck,
  calculateVehicleImport,
  customsRate,
  disabilityExemptions,
  fifRate,
  motorcycleFif,
  pickupFifRate,
  roadTaxAmount,
  roadTaxGkkShare,
} from './vehicle-import';

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

describe('pickups up to 5 t (87.04.21 / 87.04.31)', () => {
  it('exempts the AB-EFTA column and charges 10% or 22% by engine size otherwise', () => {
    expect(customsRate('diesel', 2400, 'tc', 'pickup')).toBe(0);
    expect(customsRate('diesel', 2400, 'other', 'pickup')).toBe(10);
    expect(customsRate('diesel', 2800, 'other', 'pickup')).toBe(22);
    expect(customsRate('petrol', 2800, 'other', 'pickup')).toBe(10);
    expect(customsRate('petrol', 2801, 'other', 'pickup')).toBe(22);
    expect(customsRate('electric', null, 'other', 'pickup')).toBe(10);
  });

  it('uses the FİF rows for new, under-eight and older used pickups', () => {
    expect(pickupFifRate('other', null).rate).toBe(2);
    expect(pickupFifRate('eu', null).rate).toBe(5);
    expect(pickupFifRate('tc', null).rate).toBe(7);
    expect(pickupFifRate('other', 7).rate).toBe(6);
    expect(pickupFifRate('eu', 7).rate).toBe(16);
    expect(pickupFifRate('other', 8).rate).toBe(21);
    expect(pickupFifRate('tc', 9).rate).toBe(31);
  });

  it('adds the 3,000 TL specific fund to double cabs up to 2032 kg and charges 16% VAT', () => {
    const result = calculateVehicleImport({
      vehicleType: 'pickup',
      cifTl: 1_000_000,
      fuel: 'diesel',
      engineCc: 2400,
      origin: 'other',
      ageYears: 3,
      doubleCab: true,
      weightKg: 2000,
    });
    const amount = (key: string) => result.lines.find((line) => line.key === key)?.amount;
    expect(amount('customs')).toBe(100_000);
    expect(amount('fif')).toBe(60_000);
    expect(amount('fif-specific')).toBe(3_000);
    expect(result.vatBase).toBe(1_000_000 + 100_000 + 60_000 + 3_000 + 44_000 + 25_000);
    expect(amount('vat')).toBe(197_120);
    expect(amount('registration')).toBe(60_000);
  });
});

describe('road tax (A.E. 388/2026)', () => {
  it('multiplies the whole weight by its band rate for cars', () => {
    expect(roadTaxAmount('car', 'petrol', false, 1200)).toEqual({ amount: 4_320, note: '1200 kg × 3.6 TL.' });
    expect(roadTaxAmount('car', 'electric', false, 1800)).toMatchObject({ amount: 7_524 });
  });

  it('uses fixed amounts for pickups and has no line for a petrol single cab', () => {
    expect(roadTaxAmount('pickup', 'diesel', true, null)).toMatchObject({ amount: 15_950 });
    expect(roadTaxAmount('pickup', 'diesel', false, null)).toMatchObject({ amount: 12_655 });
    expect(roadTaxAmount('pickup', 'petrol', false, null).amount).toBeNull();
  });

  it('adds the Güçlendirme Kurumu share of half per thousand of the minimum wage', () => {
    expect(roadTaxGkkShare(70_893)).toBe(35.45);
  });
});

describe('disability exemptions', () => {
  const car = (engineCc: number, group: 'orthopaedic' | 'cerebral-palsy-down' | 'visual-mental' | 'neurological', adapted = false) =>
    disabilityExemptions({
      cifTl: 1_000_000,
      fuel: 'petrol',
      engineCc,
      origin: 'other',
      disability: { group, adapted, cifGbp: null },
    });

  it('waives customs, FİF and registration for a small car of a family with a CP or Down child', () => {
    expect(car(1500, 'cerebral-palsy-down')).toMatchObject({ customs: true, fif: true, registration: true, gkk: false });
  });

  it('keeps FİF for the neurological group, which has no FİF row', () => {
    expect(car(1500, 'neurological')).toMatchObject({ customs: true, fif: false, registration: true });
  });

  it('waives only customs duty between 1600 and 3000 cm³ without adaptation', () => {
    expect(car(2000, 'visual-mental')).toMatchObject({ customs: true, fif: false, registration: false });
  });

  it('needs special adaptation for an orthopaedically disabled importer’s registration fee and share', () => {
    expect(car(1500, 'orthopaedic')).toMatchObject({ registration: false, gkk: false });
    expect(car(1500, 'orthopaedic', true)).toMatchObject({ registration: true, gkk: true });
  });

  it('drops the customs exemption above £30,000 CIF', () => {
    const result = disabilityExemptions({
      cifTl: 2_000_000,
      fuel: 'petrol',
      engineCc: 1500,
      origin: 'other',
      disability: { group: 'orthopaedic', adapted: true, cifGbp: 31_000 },
    });
    expect(result.customs).toBe(false);
  });

  it('applies to the totals', () => {
    const result = calculateVehicleImport({
      cifTl: 1_000_000,
      fuel: 'petrol',
      engineCc: 1500,
      origin: 'other',
      disability: { group: 'cerebral-palsy-down', adapted: false, cifGbp: null },
    });
    // Only wharf 44,000 + share 25,000 + VAT 20% on 1,069,000.
    expect(result.total).toBe(44_000 + 25_000 + 213_800);
  });
});

describe('age at arrival', () => {
  it('counts whole years and uses the 12-year work vehicle limit when asked', () => {
    expect(ageCheck(d('2018-10-08'), d('2026-10-07')).ageYears).toBe(7);
    expect(ageCheck(d('2018-10-07'), d('2026-10-07')).ageYears).toBe(8);
    expect(ageCheck(d('2016-01-01'), d('2026-10-07'), 12).allowed).toBe(true);
  });
});

describe('motorcycles (87.11)', () => {
  it('charges 14.5% up to 250 cm³ and 6% above in the general column, nothing in AB-EFTA', () => {
    expect(customsRate('petrol', 250, 'other', 'motorcycle')).toBe(14.5);
    expect(customsRate('petrol', 251, 'other', 'motorcycle')).toBe(6);
    expect(customsRate('electric', null, 'other', 'motorcycle')).toBe(6);
    expect(customsRate('petrol', 125, 'eu', 'motorcycle')).toBe(0);
  });

  it('uses the 2010 FİF rows with their specific amounts', () => {
    expect(motorcycleFif('petrol', 80, 'other')).toMatchObject({ rate: 6, specificTl: 0 });
    expect(motorcycleFif('petrol', 125, 'eu')).toMatchObject({ rate: 18.5, specificTl: 375 });
    expect(motorcycleFif('petrol', 650, 'other')).toMatchObject({ rate: 35, specificTl: 750 });
    expect(motorcycleFif('electric', null, 'tc')).toMatchObject({ rate: 23.5, specificTl: 750 });
  });

  it('adds up a 650 cm³ motorcycle from a third country', () => {
    const result = calculateVehicleImport({
      vehicleType: 'motorcycle',
      cifTl: 300_000,
      fuel: 'petrol',
      engineCc: 650,
      origin: 'other',
    });
    expect(result.vatBase).toBe(444_450);
    expect(result.lines.find((line) => line.key === 'vat')?.amount).toBe(88_890);
    expect(result.total).toBe(251_340);
  });

  it('charges 16% VAT up to 200 cm³', () => {
    const result = calculateVehicleImport({
      vehicleType: 'motorcycle',
      cifTl: 100_000,
      fuel: 'petrol',
      engineCc: 125,
      origin: 'eu',
    });
    expect(result.lines.find((line) => line.key === 'vat')?.rate).toBe(16);
  });

  it('bands the road tax by engine size, or by kW for electric ones', () => {
    expect(roadTaxAmount('motorcycle', 'petrol', false, null, 125)).toMatchObject({ amount: 976 });
    expect(roadTaxAmount('motorcycle', 'petrol', false, null, 650)).toMatchObject({ amount: 2_789 });
    expect(roadTaxAmount('motorcycle', 'electric', false, null, null, 11)).toMatchObject({ amount: 697 });
    expect(roadTaxAmount('motorcycle', 'electric', false, null, null, null).amount).toBeNull();
  });
});
