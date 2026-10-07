/**
 * Taxes on importing a passenger car (GTİP 87.03), a pickup (87.04, up to
 * five tonnes) or a motorcycle (87.11) into the KKTC.
 *
 * There is no excise duty by engine size on cars; the engine-size burden is
 * the Fiyat İstikrar Fonu (FİF). Every rate below was read from a primary
 * source, most of them from the printed Resmî Gazete page:
 *
 *  - Customs duty: Gümrük Vergi Oranları (Değişiklik) Tüzüğü, A.E. 464,
 *    RG 97, 25.05.2026, headings 87.03 and 87.04 (printed pages 2460–2463).
 *    The AB-EFTA column applies to goods of TC, EU or EFTA origin with origin
 *    and movement certificates (Gümrük Vergileri Tarife Yasası 44/1996,
 *    section 7); everything else, e.g. a car from Japan or the UK, pays the
 *    general column.
 *  - FİF: 2026 Fiyat İstikrar Fonu (...) (Değişiklik) Emirnamesi, A.E. 938,
 *    in force from 5 October 2026, amending the 2003 Esas Emirname (A.E. 393).
 *  - Wharf fee: 2005 Rıhtım Harçlarının Oranları (Değişiklik) Tüzüğü,
 *    A.E. 468, RG 139, 18.08.2005, category (vi) "Devlete kesin ithali yapılan
 *    motorlu araçlar": 4.4% of CIF. Later amendments (2017, 2019, 2021, 2022)
 *    only add exemptions; the one for new work vehicles excludes pickups
 *    (87.04.21 and 87.04.31).
 *  - Güçlendirme Kurumu share: 13/1981 Güvenlik Kuvvetlerini Güçlendirme
 *    Kurumu Yasası, section 6(3)(a)(i): 2.5% of the customs value.
 *  - VAT: 2025 Yılı KDV Oranları Tüzüğü (A.E. 1127/2024): Cetvel V item 7,
 *    saloon cars seating up to eight, 20%; Cetvel II item 36, land vehicles
 *    running on electricity alone, 5%; everything else, pickups included, the
 *    residual Cetvel IV rate of 16%. KDV Yasası section 21: the import base is
 *    the customs value plus every tax, fee, share and fund paid on import,
 *    except the income tax withheld under Gelir Vergisi Yasası 31(4).
 *  - Registration fee and road tax: Motorlu Araçlar Kayıt ve Ruhsat Harçları
 *    (...) Tüzüğü, A.E. 388, RG 30.04.2026, in force 1 May 2026.
 *  - Income tax withholding on import: Gelir Vergisi Yasası 31(4) and the
 *    2026 rates (A.E. 409): Chapter 87, 4% of the customs value; not charged
 *    on goods imported purely for personal use.
 *  - Motorcycle FİF: the newest 87.11 row found is in the 2010 Fiyat İstikrar
 *    Fonu (...) (Değişiklik) Emirnamesi, A.E. 624, RG 175, 14.10.2010; none of
 *    the 2020–2026 FİF orders touches 87.11, but nine 2013–2017 issues with
 *    FİF orders could not be downloaded, so a later change cannot be ruled out.
 *  - Disability exemptions: Gümrük Vergileri Tarife (Muafiyet) (Değişiklik)
 *    Tüzüğü, A.E. 861, 17.09.2026 (customs duty), FİF special rules (b)–(d),
 *    and the registration fee regulation, Kısım I (C).
 *
 * Points that could not be confirmed from a primary source are applied as
 * stated assumptions and surfaced on the page: the FİF base (taken as the CIF
 * value; the 2003 Esas Emirname that defines it is not online), the FİF row
 * of a hybrid car (by engine size), the double-cab pickup's specific FİF
 * (3,000 TL, printed in full only in A.E. 722/2017; the 2026 reprint is cut
 * off mid-sentence), and whether VAT is waived for disabled importers.
 */

import { MINIMUM_WAGE } from './constants';

export type VehicleType = 'car' | 'pickup' | 'motorcycle';

export type Fuel = 'petrol' | 'diesel' | 'hybrid' | 'electric';

/** Which customs and FİF column applies. */
export type Origin =
  /** Turkish origin with certificates: AB-EFTA column, reduced FİF. */
  | 'tc'
  /** EU or EFTA origin with certificates: AB-EFTA column. */
  | 'eu'
  /** Anything else, or no certificates: general column. */
  | 'other';

/** The groups the customs exemption (Tarife Yasası III. Cetvel, 1/10) lists. */
export type DisabilityGroup =
  /** (A) Orthopaedically disabled persons, at least 50%. */
  | 'orthopaedic'
  /** (C) Families of persons with cerebral palsy or Down syndrome. */
  | 'cerebral-palsy-down'
  /** (Ç) Visually impaired persons and families of visually or mentally impaired persons. */
  | 'visual-mental'
  /** (D) Physically disabled through a neurological disease, and their families. */
  | 'neurological';

export const VEHICLE_IMPORT_RATES = {
  /** Customs duty, general column, passenger cars. */
  customsGeneral: 10,
  /**
   * AB-EFTA column, passenger cars. Petrol up to 2000 cm³ and diesel up to
   * 2500 cm³ are exempt, above that 10%; hybrids (8703.40–70) and electric
   * cars (8703.80) are exempt whatever the size.
   */
  customsPreferential: {
    petrolExemptUpToCc: 2000,
    dieselExemptUpToCc: 2500,
    rateAbove: 10,
  },
  /**
   * Pickups up to 5 t: exempt in the AB-EFTA column; general column 10% up to
   * 2500 cm³ diesel or 2800 cm³ petrol (hybrids follow their engine's
   * threshold), 22% above; electric (8704.60) 10%.
   */
  pickupCustoms: {
    dieselUpToCc: 2500,
    petrolUpToCc: 2800,
    rateUpTo: 10,
    rateAbove: 22,
    electric: 10,
  },
  /** FİF on passenger cars, A.E. 938/2026, 87.03 (A). Both columns are equal. */
  fif: {
    bands: [
      { upToCc: 1500, rate: 3 },
      { upToCc: 2000, rate: 3 },
      { upToCc: 3000, rate: 8 },
      { upToCc: Infinity, rate: 12 },
    ],
    electric: 5,
    /**
     * Special rule (a): TC-origin cars pay 50% of row (A)(i) — up to 1500 cm³ —
     * and 70% of rows (A)(ii)–(iv). Electric cars, row (v), are not reduced.
     */
    tcFactorFirstBand: 0.5,
    tcFactorOtherBands: 0.7,
  },
  /**
   * FİF on pickups up to 5 t, A.E. 938/2026, 87.04. First number: AB-EFTA-TC
   * column; second: third countries. Exception 3): new TC-origin pickups pay
   * an ad valorem 7%. Exception 2): double cabs up to 2032 kg pay a specific
   * 3,000 TL on top (wording from A.E. 722/2017).
   */
  pickupFif: {
    newVehicle: { preferential: 5, general: 2 },
    usedUnderEight: { preferential: 16, general: 6 },
    usedEightOrOlder: { preferential: 31, general: 21 },
    tcNew: 7,
    doubleCabMaxKg: 2032,
    doubleCabSpecificTl: 3000,
  },
  /**
   * Motorcycles: exempt in the AB-EFTA column; general column 14.5% up to
   * 250 cm³ (8711.10–20), 6% above and for electric ones (8711.60).
   */
  motorcycleCustoms: { smallUpToCc: 250, small: 14.5, large: 6, electric: 6 },
  /**
   * Motorcycle FİF, A.E. 624/2010, 87.11 (A): a specific TL amount plus a
   * percentage. First column AB-EFTA-TC, second third countries.
   */
  motorcycleFif: [
    { upToCc: 80, specificTl: 0, preferential: 8.5, general: 6 },
    { upToCc: 125, specificTl: 375, preferential: 18.5, general: 14.5 },
    { upToCc: Infinity, specificTl: 750, preferential: 23.5, general: 35 },
  ],
  wharf: 4.4,
  gkkShare: 2.5,
  /** Cetvel V item 7 covers motorcycles over 200 cm³; smaller ones fall to Cetvel IV. */
  vat: { car: 20, other: 16, electric: 5, motorcycleOver200: 20 },
  registration: { standard: 6, electricOrHybrid: 4 },
  importWithholding: 4,
} as const;

/**
 * Annual road tax (seyrüsefer ruhsatı) for a private vehicle, A.E. 388/2026,
 * Kısım I II(2)(A). Cars: TL per kg of the whole weight, by weight band;
 * double-cab pickups and single-cab goods vehicles: a fixed amount.
 */
export const ROAD_TAX = {
  car: {
    petrol: { limits: [1016, 1270, 1524], perKg: [2.09, 3.6, 8.75, 12.5] },
    diesel: { limits: [1016, 1270, 1524], perKg: [3.02, 5.34, 13.42, 18.69] },
    hybrid: { limits: [1016, 1270, 1524], perKg: [1.8, 2.92, 6.4, 8.75] },
    electric: { limits: [1366, 1670, 1974], perKg: [1.12, 1.96, 4.18, 6.15] },
  },
  doubleCab: { petrol: 15_950, diesel: 15_950, hybrid: 6_540, electric: 5_215 },
  /** Item (c) names goods vehicles running on fuels other than petrol; a petrol single cab has no line. */
  singleCab: { petrol: null, diesel: 12_655, hybrid: 7_969, electric: 5_195 },
  /** Item (G): by engine size, electric ones by motor power in kW. */
  motorcycle: { ccLimits: [100, 300, 500], byCc: [558, 976, 1_394, 2_789] },
  electricMotorcycle: { kwLimits: [3, 18, 50], byKw: [418, 697, 1_115, 2_091] },
} as const satisfies {
  car: Record<Fuel, { limits: readonly number[]; perKg: readonly number[] }>;
  doubleCab: Record<Fuel, number>;
  singleCab: Record<Fuel, number | null>;
  motorcycle: { ccLimits: readonly number[]; byCc: readonly number[] };
  electricMotorcycle: { kwLimits: readonly number[]; byKw: readonly number[] };
};

/**
 * 13/1981 section 6(3)(b), as replaced by 21/2025: one half per thousand of
 * the monthly gross minimum wage on each road tax licence.
 */
export function roadTaxGkkShare(minimumWage: number = MINIMUM_WAGE.grossMonthly): number {
  return Math.round(minimumWage * 0.05) / 100;
}

/** Tarife Yasası III. Cetvel 1/10 as amended by A.E. 861/2026. */
export const DISABILITY_LIMITS = {
  customsMaxCc: 3000,
  customsMaxCifGbp: 30_000,
  /** FİF special rules (b)–(d) and the registration fee: up to 1600 cm³. */
  smallCarMaxCc: 1600,
  /** Registration fee: 1600–2500 cm³ with a ramp or lift. */
  adaptedMaxCc: 2500,
  /** Tarife Yasası 13(3), as amended by 15/2024. */
  resaleYears: 7,
  /** The right may be used again three years after registration. */
  renewYears: 3,
} as const;

export const FIF_EFFECTIVE = { from: '2026-10-05', label: '5 Ekim 2026' } as const;

/** Motorlu Taşıt Araçları Yaş Sınırlandırılması Tüzüğü, sections 5(1) and 7(1). */
export const AGE_LIMITS = {
  /** Passenger cars and vehicles not used solely for goods, e.g. double cabs. */
  passenger: 5,
  /** Work vehicles, e.g. single-cab pickups used for goods. */
  work: 12,
} as const;

export interface DisabilityInput {
  group: DisabilityGroup;
  /**
   * The car is specially built or adapted (special controls, ramp or lift)
   * for the disabled person and cleared in their name.
   */
  adapted: boolean;
  /** The CIF value in pounds sterling, when known, to check the £30,000 cap. */
  cifGbp: number | null;
}

export interface VehicleImportInput {
  vehicleType?: VehicleType;
  /** CIF value in TL: invoice price plus freight and insurance, converted. */
  cifTl: number;
  fuel: Fuel;
  /** Engine size in cm³; ignored for electric vehicles. */
  engineCc: number | null;
  origin: Origin;
  /** A dealer importing for sale: 4% income tax withheld at customs. */
  commercial?: boolean;
  /** Whole years since first registration on arrival; `null` for a new vehicle. */
  ageYears?: number | null;
  /** Pickups: double cab (carries passengers too). */
  doubleCab?: boolean;
  /** Unladen weight in kg: double-cab FİF limit and the car road tax. */
  weightKg?: number | null;
  /** Add the first year's road tax. */
  roadTax?: boolean;
  /** Electric motorcycles: motor power in kW, for the road tax band. */
  motorKw?: number | null;
  disability?: DisabilityInput | null;
}

export type ImportLineKey =
  | 'customs'
  | 'fif'
  | 'fif-specific'
  | 'wharf'
  | 'gkk'
  | 'withholding'
  | 'vat'
  | 'registration'
  | 'road-tax';

export interface ImportLine {
  key: ImportLineKey;
  label: string;
  amount: number;
  /** Absent for fixed amounts. */
  base?: number;
  /** Percent. */
  rate?: number;
  note?: string;
  /** Waived by a disability exemption. */
  exempt?: boolean;
}

export interface VehicleImportResult {
  cifTl: number;
  lines: ImportLine[];
  vatBase: number;
  /** Everything paid at customs. */
  customsTotal: number;
  /** Customs total plus registration and, if asked, the first year's road tax. */
  total: number;
  /** CIF plus every tax. */
  landedCost: number;
  /** The tax burden as a share of the CIF value, in percent. */
  burdenPercent: number;
  /** Disability conditions not met, in plain sentences; empty when none apply. */
  disabilityNotes: string[];
  /** Road tax could not be worked out (missing weight, or no line for the vehicle). */
  roadTaxUnavailable: string | null;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentOf(base: number, rate: number): number {
  return round((base * rate) / 100);
}

export function customsRate(
  fuel: Fuel,
  engineCc: number | null,
  origin: Origin,
  vehicleType: VehicleType = 'car',
): number {
  const cc = engineCc ?? 0;
  if (vehicleType === 'motorcycle') {
    if (origin !== 'other') return 0;
    const moto = VEHICLE_IMPORT_RATES.motorcycleCustoms;
    if (fuel === 'electric') return moto.electric;
    return cc > moto.smallUpToCc ? moto.large : moto.small;
  }
  if (vehicleType === 'pickup') {
    if (origin !== 'other') return 0;
    const pickup = VEHICLE_IMPORT_RATES.pickupCustoms;
    if (fuel === 'electric') return pickup.electric;
    const limit = fuel === 'diesel' ? pickup.dieselUpToCc : pickup.petrolUpToCc;
    return cc > limit ? pickup.rateAbove : pickup.rateUpTo;
  }

  if (origin === 'other') return VEHICLE_IMPORT_RATES.customsGeneral;
  const preferential = VEHICLE_IMPORT_RATES.customsPreferential;
  if (fuel === 'petrol') return cc > preferential.petrolExemptUpToCc ? preferential.rateAbove : 0;
  if (fuel === 'diesel') return cc > preferential.dieselExemptUpToCc ? preferential.rateAbove : 0;
  return 0;
}

/** The FİF rate for a passenger car, and which row of the table it came from. */
export function fifRate(fuel: Fuel, engineCc: number | null, origin: Origin): { rate: number; row: string } {
  const fif = VEHICLE_IMPORT_RATES.fif;
  if (fuel === 'electric') return { rate: fif.electric, row: '(A)(v) elektrikli' };

  const cc = engineCc ?? 0;
  const index = fif.bands.findIndex((band) => cc <= band.upToCc);
  const bandRate = fif.bands[index]?.rate ?? fif.bands[fif.bands.length - 1]?.rate ?? 0;
  const rows = ['(A)(i)', '(A)(ii)', '(A)(iii)', '(A)(iv)'];
  const row = rows[index] ?? '(A)(iv)';

  if (origin !== 'tc') return { rate: bandRate, row };
  const factor = index === 0 ? fif.tcFactorFirstBand : fif.tcFactorOtherBands;
  return { rate: Math.round(bandRate * factor * 1000) / 1000, row: `${row}, TC menşeli` };
}

/** The FİF rate for a pickup up to 5 t. */
export function pickupFifRate(origin: Origin, ageYears: number | null): { rate: number; row: string } {
  const fif = VEHICLE_IMPORT_RATES.pickupFif;
  const column = origin === 'other' ? 'general' : 'preferential';
  if (ageYears === null) {
    if (origin === 'tc') return { rate: fif.tcNew, row: '(A)(a), TC menşeli yeni: istisna 3)' };
    return { rate: fif.newVehicle[column], row: '(A)(a) yeni' };
  }
  if (ageYears < 8) return { rate: fif.usedUnderEight[column], row: '(B)(a) sekiz yaşını doldurmamış' };
  return { rate: fif.usedEightOrOlder[column], row: '(B)(b) sekiz yaşını doldurmuş' };
}

/**
 * The motorcycle FİF: a specific TL amount plus a percentage. An electric
 * motorcycle has no cylinder volume; it is placed in the last row, the one
 * the table leaves for "the others".
 */
export function motorcycleFif(
  fuel: Fuel,
  engineCc: number | null,
  origin: Origin,
): { rate: number; specificTl: number; row: string } {
  const rows = VEHICLE_IMPORT_RATES.motorcycleFif;
  const names = ['(A)(a) 80 cm³’e kadar', '(A)(b) 80–125 cm³', '(A)(c) diğerleri'];
  const found = fuel === 'electric' ? -1 : rows.findIndex((row) => (engineCc ?? 0) <= row.upToCc);
  const index = found === -1 ? rows.length - 1 : found;
  const row = rows[index];
  if (!row) return { rate: 0, specificTl: 0, row: '' };
  return {
    rate: origin === 'other' ? row.general : row.preferential,
    specificTl: row.specificTl,
    row: names[index] ?? '',
  };
}

function band(limits: readonly number[], values: readonly number[], value: number): number {
  const index = limits.findIndex((limit) => value <= limit);
  return values[index === -1 ? values.length - 1 : index] ?? 0;
}

/** First year's road tax, or the reason it cannot be given. */
export function roadTaxAmount(
  vehicleType: VehicleType,
  fuel: Fuel,
  doubleCab: boolean,
  weightKg: number | null,
  engineCc: number | null = null,
  motorKw: number | null = null,
): { amount: number; note: string } | { amount: null; reason: string } {
  if (vehicleType === 'motorcycle') {
    if (fuel === 'electric') {
      if (!motorKw) {
        return { amount: null, reason: 'Elektrikli motosikletin seyrüseferi motor gücüne göre; gücü (kW) girin.' };
      }
      const table = ROAD_TAX.electricMotorcycle;
      return { amount: band(table.kwLimits, table.byKw, motorKw), note: `${motorKw} kW.` };
    }
    const table = ROAD_TAX.motorcycle;
    return { amount: band(table.ccLimits, table.byCc, engineCc ?? 0), note: `${engineCc ?? 0} cm³.` };
  }
  if (vehicleType === 'pickup') {
    const amount = doubleCab ? ROAD_TAX.doubleCab[fuel] : ROAD_TAX.singleCab[fuel];
    if (amount === null) {
      return { amount: null, reason: 'Tüzükte benzinli tek kabin yük aracı için ayrı bir seyrüsefer kalemi yok.' };
    }
    return { amount, note: doubleCab ? 'Çift kabin, yıllık sabit tutar.' : 'Yük aracı, yıllık sabit tutar.' };
  }
  if (!weightKg || weightKg <= 0) {
    return { amount: null, reason: 'Seyrüsefer ağırlığa göre hesaplanıyor; aracın boş ağırlığını girin.' };
  }
  const table = ROAD_TAX.car[fuel];
  const perKg = band(table.limits, table.perKg, weightKg);
  return { amount: round(weightKg * perKg), note: `${weightKg} kg × ${perKg} TL.` };
}

interface Exemptions {
  customs: boolean;
  fif: boolean;
  gkk: boolean;
  registration: boolean;
  notes: string[];
}

/** Which taxes a disability exemption waives for this car. */
export function disabilityExemptions(input: VehicleImportInput): Exemptions {
  const none: Exemptions = { customs: false, fif: false, gkk: false, registration: false, notes: [] };
  const disability = input.disability;
  if (!disability) return none;

  const limits = DISABILITY_LIMITS;
  const notes: string[] = [];
  if ((input.vehicleType ?? 'car') !== 'car') {
    return { ...none, notes: ['Engelli muafiyetleri binek otomobil için hesaplanıyor.'] };
  }

  const electric = input.fuel === 'electric';
  const cc = electric ? null : input.engineCc ?? 0;

  let customs = electric || (cc !== null && cc <= limits.customsMaxCc);
  if (!customs) notes.push(`Gümrük vergisi muafiyeti ${limits.customsMaxCc} cm³’ü geçmeyen veya elektrikli araçlar için.`);
  if (customs && disability.cifGbp !== null && disability.cifGbp > limits.customsMaxCifGbp) {
    customs = false;
    notes.push(`CİF değeri ${limits.customsMaxCifGbp.toLocaleString('tr-TR')} £’u geçtiği için gümrük vergisi muafiyeti yok.`);
  }

  const small = cc !== null && cc <= limits.smallCarMaxCc;
  const fif = small && disability.group !== 'neurological';
  if (!fif) {
    notes.push(
      disability.group === 'neurological'
        ? 'Fon emirnamesinde nörolojik kaynaklı engelliler için muafiyet satırı yok; fon tam alınır.'
        : `Fon muafiyeti ${limits.smallCarMaxCc} cm³’ü geçmeyen araçlar için.`,
    );
  }

  const midSize = cc !== null && cc > limits.smallCarMaxCc && cc < limits.adaptedMaxCc;
  let registration: boolean;
  if (disability.group === 'orthopaedic') {
    registration = disability.adapted && (small || midSize);
  } else if (disability.group === 'visual-mental') {
    registration = small;
  } else {
    registration = small || (midSize && disability.adapted);
  }
  if (!registration) {
    notes.push('Kayıt ve ruhsat harcı muafiyetinin motor hacmi veya özel donanım koşulu karşılanmıyor.');
  }

  const gkk = disability.adapted && disability.group !== 'cerebral-palsy-down';

  return { customs, fif, gkk, registration, notes };
}

export function calculateVehicleImport(input: VehicleImportInput): VehicleImportResult {
  const cif = Math.max(input.cifTl, 0);
  const vehicleType = input.vehicleType ?? 'car';
  const electric = input.fuel === 'electric';
  const rates = VEHICLE_IMPORT_RATES;
  const exemptions = disabilityExemptions(input);
  const lines: ImportLine[] = [];

  const push = (line: ImportLine, waived: boolean) => {
    lines.push(waived ? { ...line, amount: 0, exempt: true, note: 'Engelli muafiyeti.' } : line);
  };

  const customs = customsRate(input.fuel, input.engineCc, input.origin, vehicleType);
  push(
    {
      key: 'customs',
      label: 'Gümrük vergisi',
      base: cif,
      rate: customs,
      amount: percentOf(cif, customs),
      note: input.origin === 'other' ? 'Genel sütun.' : 'AB-EFTA sütunu: menşe ve dolaşım belgesiyle.',
    },
    exemptions.customs,
  );

  const moto = vehicleType === 'motorcycle' ? motorcycleFif(input.fuel, input.engineCc, input.origin) : null;
  const fif =
    vehicleType === 'pickup'
      ? pickupFifRate(input.origin, input.ageYears ?? null)
      : moto ?? fifRate(input.fuel, input.engineCc, input.origin);
  push(
    {
      key: 'fif',
      label: 'Fiyat İstikrar Fonu',
      base: cif,
      rate: fif.rate,
      amount: percentOf(cif, fif.rate),
      note: `Emirname satırı ${fif.row}.`,
    },
    exemptions.fif,
  );

  if (moto && moto.specificTl > 0) {
    lines.push({
      key: 'fif-specific',
      label: 'Fiyat İstikrar Fonu (spesifik)',
      amount: moto.specificTl,
      note: 'Araç başına sabit tutar, orana ek olarak.',
    });
  }

  if (
    vehicleType === 'pickup' &&
    input.doubleCab &&
    input.weightKg &&
    input.weightKg <= rates.pickupFif.doubleCabMaxKg
  ) {
    lines.push({
      key: 'fif-specific',
      label: 'Fiyat İstikrar Fonu (çift kabin, spesifik)',
      amount: rates.pickupFif.doubleCabSpecificTl,
      note: `${rates.pickupFif.doubleCabMaxKg} kg’a kadar çift kabin: mevcut oranlara ilaveten.`,
    });
  }

  lines.push({ key: 'wharf', label: 'Rıhtım harcı', base: cif, rate: rates.wharf, amount: percentOf(cif, rates.wharf) });

  push(
    {
      key: 'gkk',
      label: 'Güvenlik Kuvvetlerini Güçlendirme Kurumu payı',
      base: cif,
      rate: rates.gkkShare,
      amount: percentOf(cif, rates.gkkShare),
    },
    exemptions.gkk,
  );

  /* KDV section 21(2): everything paid on import except the 31(4) withholding. */
  const vatBase = round(cif + lines.reduce((sum, line) => sum + line.amount, 0));

  if (input.commercial) {
    lines.push({
      key: 'withholding',
      label: 'Gelir vergisi stopajı',
      base: cif,
      rate: rates.importWithholding,
      amount: percentOf(cif, rates.importWithholding),
      note: 'Ticari ithalatta; yıllık gelir veya kurumlar vergisine mahsup edilir.',
    });
  }

  const vatRate = electric
    ? rates.vat.electric
    : vehicleType === 'car'
      ? rates.vat.car
      : vehicleType === 'motorcycle' && (input.engineCc ?? 0) > 200
        ? rates.vat.motorcycleOver200
        : rates.vat.other;
  lines.push({
    key: 'vat',
    label: 'KDV',
    base: vatBase,
    rate: vatRate,
    amount: percentOf(vatBase, vatRate),
    note: 'Matrah: CİF ile ithalatta ödenen vergi, harç, pay ve fonların toplamı.',
  });

  const customsTotal = round(lines.reduce((sum, line) => sum + line.amount, 0));

  const registrationRate =
    electric || input.fuel === 'hybrid' ? rates.registration.electricOrHybrid : rates.registration.standard;
  push(
    {
      key: 'registration',
      label: 'Araç kayıt harcı',
      base: cif,
      rate: registrationRate,
      amount: percentOf(cif, registrationRate),
      note: 'Gümrük vergisinin alındığı matrah üzerinden, ilk kayıtta ödenir.',
    },
    exemptions.registration,
  );

  let roadTaxUnavailable: string | null = null;
  if (input.roadTax) {
    const road = roadTaxAmount(
      vehicleType,
      input.fuel,
      Boolean(input.doubleCab),
      input.weightKg ?? null,
      input.engineCc,
      input.motorKw ?? null,
    );
    if (road.amount === null) {
      roadTaxUnavailable = road.reason;
    } else {
      const share = roadTaxGkkShare();
      const shareNote = `Güçlendirme Kurumu payı ${share.toLocaleString('tr-TR')} TL dahil.`;
      /*
       * The disability exemption covers the fees of Kısım I, road tax
       * included, but not the Güçlendirme Kurumu share set by its own law.
       */
      lines.push(
        exemptions.registration
          ? {
              key: 'road-tax',
              label: 'Seyrüsefer (ilk yıl)',
              amount: share,
              exempt: true,
              note: `Engelli muafiyeti; yalnızca ${shareNote.charAt(0).toLocaleLowerCase('tr')}${shareNote.slice(1)}`,
            }
          : {
              key: 'road-tax',
              label: 'Seyrüsefer (ilk yıl)',
              amount: round(road.amount + share),
              note: `${road.note} ${shareNote} Yaş indirimi KKTC’de ilk kayıttan itibaren sayılır.`,
            },
      );
    }
  }

  const total = round(lines.reduce((sum, line) => sum + line.amount, 0));

  return {
    cifTl: cif,
    lines,
    vatBase,
    customsTotal,
    total,
    landedCost: round(cif + total),
    burdenPercent: cif > 0 ? Math.round((total / cif) * 10000) / 100 : 0,
    disabilityNotes: exemptions.notes,
    roadTaxUnavailable,
  };
}

/**
 * Whether a vehicle may be imported under the age limit: one that has reached
 * the limit from its first registration when it arrives at a KKTC port gets
 * no import permit.
 */
export function ageCheck(
  firstRegistration: Date,
  arrival: Date,
  limitYears: number = AGE_LIMITS.passenger,
): { allowed: boolean; limitDate: Date; ageYears: number } {
  const limitDate = new Date(firstRegistration);
  limitDate.setFullYear(limitDate.getFullYear() + limitYears);

  let ageYears = arrival.getFullYear() - firstRegistration.getFullYear();
  const anniversary = new Date(firstRegistration);
  anniversary.setFullYear(arrival.getFullYear());
  if (arrival < anniversary) ageYears -= 1;

  return { allowed: arrival < limitDate, limitDate, ageYears: Math.max(ageYears, 0) };
}

/** Kept for callers of the first version: the passenger car age limit. */
export const MAX_AGE_YEARS = AGE_LIMITS.passenger;
