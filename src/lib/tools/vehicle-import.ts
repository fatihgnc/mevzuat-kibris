/**
 * Taxes on importing a passenger car (GTİP 87.03) into the KKTC.
 *
 * There is no excise duty by engine size on cars; the engine-size burden is
 * the Fiyat İstikrar Fonu (FİF). Every rate below was read from a primary
 * source, most of them from the printed Resmî Gazete page:
 *
 *  - Customs duty: Gümrük Vergi Oranları (Değişiklik) Tüzüğü, A.E. 464,
 *    RG 97, 25.05.2026, heading 87.03 (printed pages 2460–2462). The AB-EFTA column applies to
 *    goods of TC, EU or EFTA origin with origin and movement certificates
 *    (Gümrük Vergileri Tarife Yasası 44/1996, section 7); everything else,
 *    e.g. a car from Japan or the UK, pays the general column.
 *  - FİF: 2026 Fiyat İstikrar Fonu (...) (Değişiklik) Emirnamesi, A.E. 938,
 *    in force from 5 October 2026, amending the 2003 Esas Emirname (A.E. 393).
 *  - Wharf fee: 2005 Rıhtım Harçlarının Oranları (Değişiklik) Tüzüğü,
 *    A.E. 468, RG 139, 18.08.2005, category (vi) "Devlete kesin ithali yapılan
 *    motorlu araçlar": 4.4% of CIF. Later amendments (2017, 2019, 2021, 2022)
 *    only add exemptions.
 *  - Güçlendirme Kurumu share: 13/1981 Güvenlik Kuvvetlerini Güçlendirme
 *    Kurumu Yasası, section 6(3)(a)(i): 2.5% of the customs value.
 *  - VAT: 2025 Yılı KDV Oranları Tüzüğü (A.E. 1127/2024): Cetvel V item 7,
 *    saloon cars seating up to eight, 20%; Cetvel II item 36, cars running on
 *    electricity alone, 5%. KDV Yasası section 21: the import base is the
 *    customs value plus every tax, fee, share and fund paid on import, except
 *    the income tax withheld under Gelir Vergisi Yasası 31(4).
 *  - Registration fee: Motorlu Araçlar Kayıt ve Ruhsat Harçları (...) Tüzüğü,
 *    A.E. 388, RG 30.04.2026: on the amount customs duty was charged on, 6%,
 *    electric and hybrid 4%.
 *  - Income tax withholding on import: Gelir Vergisi Yasası 31(4) and the
 *    2026 rates (A.E. 409): Chapter 87, 4% of the customs value; not charged
 *    on goods imported purely for personal use.
 *
 * Two points could not be confirmed from a primary source and are applied as
 * stated assumptions: the FİF base (taken as the CIF value, like every other
 * percentage here; the 2003 Esas Emirname that defines it is not online) and
 * which FİF row a hybrid falls into (taken by engine size, as the table's
 * wording reads, since a hybrid has a cylinder volume and "Elektrikli motorlu
 * taşıtlar" is a separate row).
 */

export type Fuel = 'petrol' | 'diesel' | 'hybrid' | 'electric';

/** Which customs column applies. */
export type Origin =
  /** Turkish origin with certificates: AB-EFTA column, reduced FİF. */
  | 'tc'
  /** EU or EFTA origin with certificates: AB-EFTA column. */
  | 'eu'
  /** Anything else, or no certificates: general column. */
  | 'other';

export const VEHICLE_IMPORT_RATES = {
  /** Customs duty, general column: 10% for every passenger car. */
  customsGeneral: 10,
  /**
   * AB-EFTA column. Petrol cars up to 2000 cm³ and diesel cars up to 2500 cm³
   * are exempt, above that 10%; hybrids (8703.40–70) and electric cars
   * (8703.80) are exempt whatever the size.
   */
  customsPreferential: {
    petrolExemptUpToCc: 2000,
    dieselExemptUpToCc: 2500,
    rateAbove: 10,
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
  wharf: 4.4,
  gkkShare: 2.5,
  vat: { standard: 20, electric: 5 },
  registration: { standard: 6, electricOrHybrid: 4 },
  importWithholding: 4,
} as const;

export const FIF_EFFECTIVE = { from: '2026-10-05', label: '5 Ekim 2026' } as const;

/** Motorlu Taşıt Araçları Yaş Sınırlandırılması Tüzüğü, section 5(1). */
export const MAX_AGE_YEARS = 5;

export interface VehicleImportInput {
  /** CIF value in TL: invoice price plus freight and insurance, converted. */
  cifTl: number;
  fuel: Fuel;
  /** Engine size in cm³; ignored for electric cars. */
  engineCc: number | null;
  origin: Origin;
  /** A dealer importing for sale: 4% income tax withheld at customs. */
  commercial?: boolean;
}

export type ImportLineKey = 'customs' | 'fif' | 'wharf' | 'gkk' | 'withholding' | 'vat' | 'registration';

export interface ImportLine {
  key: ImportLineKey;
  label: string;
  base: number;
  /** Percent. */
  rate: number;
  amount: number;
  note?: string;
}

export interface VehicleImportResult {
  cifTl: number;
  lines: ImportLine[];
  vatBase: number;
  /** Everything paid at customs. */
  customsTotal: number;
  /** Customs total plus the registration fee. */
  total: number;
  /** CIF plus every tax: what the car costs on the road, before the annual road tax. */
  landedCost: number;
  /** The tax burden as a share of the CIF value, in percent. */
  burdenPercent: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentOf(base: number, rate: number): number {
  return round((base * rate) / 100);
}

export function customsRate(fuel: Fuel, engineCc: number | null, origin: Origin): number {
  if (origin === 'other') return VEHICLE_IMPORT_RATES.customsGeneral;
  const preferential = VEHICLE_IMPORT_RATES.customsPreferential;
  const cc = engineCc ?? 0;
  if (fuel === 'petrol') return cc > preferential.petrolExemptUpToCc ? preferential.rateAbove : 0;
  if (fuel === 'diesel') return cc > preferential.dieselExemptUpToCc ? preferential.rateAbove : 0;
  return 0;
}

/** The FİF rate, and which row of the table it came from. */
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

export function calculateVehicleImport(input: VehicleImportInput): VehicleImportResult {
  const cif = Math.max(input.cifTl, 0);
  const electric = input.fuel === 'electric';
  const rates = VEHICLE_IMPORT_RATES;
  const lines: ImportLine[] = [];

  const customs = customsRate(input.fuel, input.engineCc, input.origin);
  lines.push({
    key: 'customs',
    label: 'Gümrük vergisi',
    base: cif,
    rate: customs,
    amount: percentOf(cif, customs),
    note: input.origin === 'other' ? 'Genel sütun.' : 'AB-EFTA sütunu: menşe ve dolaşım belgesiyle.',
  });

  const fif = fifRate(input.fuel, input.engineCc, input.origin);
  lines.push({
    key: 'fif',
    label: 'Fiyat İstikrar Fonu',
    base: cif,
    rate: fif.rate,
    amount: percentOf(cif, fif.rate),
    note: `Emirname satırı ${fif.row}.`,
  });

  lines.push({
    key: 'wharf',
    label: 'Rıhtım harcı',
    base: cif,
    rate: rates.wharf,
    amount: percentOf(cif, rates.wharf),
  });

  lines.push({
    key: 'gkk',
    label: 'Güvenlik Kuvvetlerini Güçlendirme Kurumu payı',
    base: cif,
    rate: rates.gkkShare,
    amount: percentOf(cif, rates.gkkShare),
  });

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

  const vatRate = electric ? rates.vat.electric : rates.vat.standard;
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
  lines.push({
    key: 'registration',
    label: 'Araç kayıt harcı',
    base: cif,
    rate: registrationRate,
    amount: percentOf(cif, registrationRate),
    note: 'Gümrük vergisinin alındığı matrah üzerinden, ilk kayıtta ödenir.',
  });

  const total = round(lines.reduce((sum, line) => sum + line.amount, 0));

  return {
    cifTl: cif,
    lines,
    vatBase,
    customsTotal,
    total,
    landedCost: round(cif + total),
    burdenPercent: cif > 0 ? Math.round((total / cif) * 10000) / 100 : 0,
  };
}

/**
 * Whether a car may be imported under the age limit: a passenger car that
 * has reached five years from its first registration when it arrives at a
 * KKTC port gets no import permit.
 */
export function ageCheck(firstRegistration: Date, arrival: Date): { allowed: boolean; limitDate: Date } {
  const limitDate = new Date(firstRegistration);
  limitDate.setFullYear(limitDate.getFullYear() + MAX_AGE_YEARS);
  return { allowed: arrival < limitDate, limitDate };
}
