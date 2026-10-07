/**
 * Title deed fees (tapu harcı) and the other costs of a property transfer.
 *
 * The rates are NOT in Fasıl 219 itself. Section 3 of the law lets the Council
 * of Ministers set them, and they live in the Cetvel attached to the
 * "Tapu ve Kadastro Dairesi (Harçlar ve Ücretler) Tüzüğü", amended several
 * times a year. The consolidated law text on the site is from 2014 and shows
 * none of the rates below. Every figure here is taken from a Resmî Gazete
 * record, checked against the printed PDF:
 *
 *  - A.E. 217/2024 (RG 44, 29.02.2024): the whole Cetvel was replaced. Gift,
 *    exchange, prescription, expropriation, points, mortgage and fixed fees
 *    still come from this text.
 *  - A.E. 540/2024 (RG 128, 14.06.2024): KKTC citizens 6%; the one-off 3% for
 *    one home and one plot is limited to KKTC citizens.
 *  - A.E. 385/2025 (RG 101, 15.05.2025): rates for Turkish citizens by how
 *    many properties they own, 9% for other foreigners, and the attached table
 *    splitting the fee between contract registration and transfer.
 *  - A.E. 186/2026 (RG 36, 19.02.2026): first-home exemption up to the TL
 *    equivalent of £100,000, until 31.12.2026.
 *
 * The other costs are separate taxes, included because they are paid in the
 * same transaction:
 *
 *  - Pul (Değişiklik) Yasası 2/2026 (RG 23, 06.02.2026): contracts pay five
 *    per thousand up to 89,000,000 TL and one per thousand above.
 *  - 2025 Yılı KDV Oranları Tüzüğü (A.E. 1127, RG 271, 31.12.2024): property
 *    sold by a VAT registered seller pays 5%, homes of 300 m² and more 10%.
 *  - 24/1982 Gelir Vergisi Yasası, sections 4(1)(f), 4(5), 6(12) and
 *    31(1)(i)-(j): the land office withholds income tax from the seller.
 *  - 52/2008 Taşınmaz Mal Edinme ve Uzun Vadeli Kiralama (Yabancılar) Yasası,
 *    section 8(4): a foreign buyer's purchase permit application pays a
 *    service fee of half the monthly gross minimum wage.
 *
 * Not covered: a transfer to a company the transferor holds 25% or more of
 * (Cetvel section 3(1)(E)). A.E. 217/2024 prints no rate for it, and no later
 * amendment adds one.
 */

import { MINIMUM_WAGE } from './constants';

/** The buyer's nationality as the Cetvel groups it. */
export type Buyer =
  /** KKTC citizens, section 3(1)(B)(a). */
  | 'kktc'
  /** Citizens of a country recognising the KKTC, section 3(1)(B)(b) — in practice Turkey. */
  | 'tc'
  /** Every other foreign national. */
  | 'foreign';

export type Transaction =
  | 'sale'
  | 'gift'
  | 'mortgage'
  /** Section 3(1)(C): two owners swap properties. */
  | 'exchange'
  /** Section 3(1)(A): a right acquired by prescription (zamanaşımı). */
  | 'prescription'
  /** Section 3(1)(Ç): expropriation or a compulsory right of way. */
  | 'expropriation'
  /** Section 3(2): points registered with a Mal Değer Belgesi. */
  | 'points';

/** Section 3(1)(D): the gift rate depends on who gives to whom. */
export type GiftRelation =
  /** (D)(a): from a parent to a child. */
  | 'child'
  /**
   * (D)(b): between spouses, or from a grandparent to a grandchild. Kept apart
   * although the Cetvel charges both 0.4%, because income tax does not treat
   * them alike (see `calculateTitleDeedFee`).
   */
  | 'spouse'
  | 'grandchild'
  /** (D)(c): every other gift. */
  | 'other';

/** Section 3(2): points change hands by sale or by one of the three gift kinds. */
export type PointsTransfer = 'sale' | GiftRelation;

/** Section 3(1)(Ç): who expropriates. */
export type Expropriator =
  /** (a) A public body other than the State. */
  | 'public'
  /** (b) A private person or company. */
  | 'private';

/**
 * How a sale to a foreign or Turkish buyer is registered.
 *
 * A.E. 385/2025's table: a direct transfer pays the whole fee at once
 * (table A); a sale contract registered at the land office first pays part of
 * it at registration (table B) and the rest at transfer (table C). The total
 * is the same either way.
 */
export type SaleRoute = 'direct' | 'contract';

/**
 * Who disposes of the property, for the income tax withheld at the land office.
 */
export type Seller =
  /** Not calculated. */
  | 'none'
  /** An individual who does not trade in property: 2.8% of the value. */
  | 'individual'
  /** An individual using the once-in-a-lifetime home and plot exemption: no tax. */
  | 'individual-exempt'
  /** A company, or an individual trading in property: 4% of the value. */
  | 'professional';

export const TITLE_DEED_RATES = {
  /** A.E. 540/2024, section 3(1)(B)(a). */
  kktcSale: 6,
  /**
   * A.E. 540/2024, section 3(1)(D)(c): once in a lifetime, for one house (with
   * up to one dönüm of land) and one plot — or one dönüm of field or up to
   * 300 m² of business premises instead of the plot — bought or received as a
   * gift.
   */
  kktcOneOff: 3,
  /**
   * A.E. 385/2025, attached table, in percent of the base. Index 0 is the
   * first property. A Turkish buyer's fourth to sixth property is allowed only
   * when the first three were also apartments (section 3(1)(B)(b)(iv)).
   */
  tc: {
    direct: [6, 8, 9, 9, 9, 9],
    contract: [3, 2, 3, 3, 3, 3],
    transfer: [3, 6, 6, 6, 6, 6],
  },
  foreign: {
    direct: [9, 9, 9],
    contract: [6, 3, 3],
    transfer: [3, 6, 6],
  },
  /** A.E. 217/2024, section 3(1)(D). */
  gift: {
    child: 0.2,
    spouse: 0.4,
    grandchild: 0.4,
    other: 6,
  } satisfies Record<GiftRelation, number>,
  /** A.E. 217/2024, section 3(1)(C)(a): on the property each party receives. */
  exchange: 3,
  /** A.E. 217/2024, section 3(1)(C)(b): additionally on the difference in value. */
  exchangeDifference: 4,
  /** A.E. 217/2024, section 3(1)(A). */
  prescription: 5,
  /** A.E. 217/2024, section 3(1)(Ç), on the compensation. */
  expropriation: { public: 4, private: 6 } satisfies Record<Expropriator, number>,
  /** A.E. 217/2024, section 3(2). */
  points: {
    sale: 6,
    child: 0.2,
    spouse: 0.4,
    grandchild: 0.4,
    other: 6,
  } satisfies Record<PointsTransfer, number>,
  /** A.E. 217/2024, section 4(1): paid by the borrower, on the secured amount. */
  mortgage: 1,
} as const;

/**
 * A.E. 217/2024, items 2 and 11: the petition for a registration that needs
 * no site inspection, and each new title deed or mortgage certificate.
 */
export const FIXED_FEES = {
  petition: 71,
  certificate: 149,
} as const;

/**
 * 13/1981 Güvenlik Kuvvetlerini Güçlendirme Kurumu Yasası, section 6(3)(ğ),
 * added by 21/2025 (RG 97, 09.05.2025): on every property transfer the buyer
 * pays one per thousand of the sale price if foreign, half that if a citizen.
 * Collected by the land office. Turkish citizens are foreign under KKTC law.
 */
export const GKK_SHARE = {
  citizen: 0.05,
  foreign: 0.1,
} as const;

export const MAX_PROPERTIES: Record<Exclude<Buyer, 'kktc'>, number> = {
  tc: TITLE_DEED_RATES.tc.direct.length,
  foreign: TITLE_DEED_RATES.foreign.direct.length,
};

/** A.E. 186/2026, temporary section 1. */
export const FIRST_HOME_EXEMPTION = {
  capGbp: 100_000,
  until: '2026-12-31',
  /** With the dative suffix, which depends on how the year is read aloud. */
  untilLabel: '31 Aralık 2026’ya',
} as const;

/** Pul Yasası, First Schedule, item 3(1), as replaced by 2/2026. */
export const STAMP_DUTY = {
  threshold: 89_000_000,
  /** Five per thousand up to the threshold. */
  lowerRate: 0.5,
  /** One per thousand on the part above it. */
  upperRate: 0.1,
} as const;

/** 2025 Yılı KDV Oranları Tüzüğü: Cetvel II item 17 and Cetvel III item 23. */
export const PROPERTY_VAT = {
  standard: 5,
  largeHome: 10,
  /** "300 metrekare ve üzeri kapalı alana sahip konut" — 300 itself is the higher rate. */
  largeHomeFromM2: 300,
} as const;

/**
 * 24/1982 Gelir Vergisi Yasası. Section 4(5): the gain is 20% of the higher of
 * price and market value. Section 6(12): 30% of that gain is exempt, except
 * for those trading in property; the Council of Ministers may raise the 30%
 * up to 60% each January and has not done so in 2020–2026. Section 31(1)(i)
 * and (j): the land office withholds 20% of what remains.
 */
export const SELLER_TAX = {
  profitRate: 20,
  exemption: 30,
  withholding: 20,
} as const;

/** The seller's tax as a percentage of the value: 2.8% and 4%. */
export function sellerTaxRate(seller: Seller): number {
  if (seller === 'none' || seller === 'individual-exempt') return 0;
  const exempt = seller === 'individual' ? SELLER_TAX.exemption : 0;
  const rate =
    (SELLER_TAX.profitRate / 100) * (1 - exempt / 100) * (SELLER_TAX.withholding / 100) * 100;
  return Math.round(rate * 1000) / 1000;
}

/** 52/2008 section 8(4): half the monthly gross minimum wage. */
export function purchasePermitFee(minimumWage: number = MINIMUM_WAGE.grossMonthly): number {
  return Math.round((minimumWage / 2) * 100) / 100;
}

export interface TitleDeedInput {
  transaction: Transaction;
  buyer: Buyer;
  /**
   * Sale: the price in the contract. Gift, prescription and points: the
   * market value. Exchange: the value of the property you receive.
   * Expropriation: the compensation. Mortgage: the amount it secures. In TL.
   */
  amount: number;
  /**
   * Sale only: the market value (rayiç) set by the district land office. The
   * fee is charged on whichever of price and market value is higher.
   */
  marketValue?: number | null;
  /** Exchange only: the value of the property you give. */
  givenValue?: number | null;
  /** Which property this is for a Turkish or foreign buyer, 1-based. */
  propertyNumber?: number;
  route?: SaleRoute;
  giftRelation?: GiftRelation;
  pointsTransfer?: PointsTransfer;
  expropriator?: Expropriator;
  /** KKTC buyer using the once-in-a-lifetime 3% rate on this sale or gift. */
  oneOff?: boolean;
  /**
   * KKTC buyer with a Central Bank backed TL housing loan buying a first home:
   * the TL price of one pound sterling on the transfer day. `null` when the
   * exemption does not apply.
   */
  firstHomeGbpRate?: number | null;
  /** Sale only: a mortgage registered on the property in the same transaction. */
  mortgageAmount?: number | null;
  /** Sale only: a written contract is made and pays stamp duty. */
  stampDuty?: boolean;
  /** Sale only: the seller is VAT registered (typically a developer selling new). */
  vat?: { kind: 'home' | 'other'; areaM2: number | null } | null;
  /** Sale and gift: who disposes of the property, for the withheld income tax. */
  seller?: Seller;
  /** Add the petition and title deed certificate fees. */
  fixedFees?: boolean;
  /** Sale to a foreign buyer: the minimum wage the permit fee is half of. */
  minimumWage?: number;
}

export type FeeKey =
  | 'fee'
  | 'fee-contract'
  | 'fee-transfer'
  | 'exchange-difference'
  | 'gkk'
  | 'mortgage'
  | 'fixed'
  | 'stamp'
  | 'vat'
  | 'permit'
  | 'seller-tax';

export interface FeeLine {
  key: FeeKey;
  label: string;
  amount: number;
  /** The amount the rate applies to, after any exemption. Absent for fixed amounts. */
  base?: number;
  /** Percent. */
  rate?: number;
  note?: string;
  /** Who pays. The seller's lines are kept out of the buyer's total. */
  payer: 'buyer' | 'seller';
}

export interface TitleDeedResult {
  /** The amount the title deed fee is charged on, before any exemption. */
  base: number;
  /** Whether the market value, not the price, set the base. */
  baseFromMarketValue: boolean;
  /** The percentage applied for the title deed fee itself. */
  rate: number;
  lines: FeeLine[];
  /** Fees the land office collects from the buyer. */
  landOfficeTotal: number;
  /** Everything the buyer (or recipient, or borrower) pays. */
  total: number;
  /** Everything the seller (or giver) pays. */
  sellerTotal: number;
  exemption: {
    /** The TL equivalent of £100,000 on the day. */
    capTl: number;
    /** Fee not paid on the sale thanks to the exemption. */
    saleSaving: number;
    /** Fee not paid on the mortgage thanks to the exemption. */
    mortgageSaving: number;
  } | null;
  /** A gift to a spouse or child: no income tax for the giver (section 4(1)(f)(i)). */
  sellerTaxExemptByRelation: boolean;
}

function clampPropertyNumber(value: number | undefined, max: number): number {
  const whole = Math.floor(value ?? 1);
  return Math.min(Math.max(whole, 1), max);
}

/** Rounds to kuruş so the lines add up to the total shown. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentOf(base: number, rate: number): number {
  return round((base * rate) / 100);
}

function sum(lines: FeeLine[]): number {
  return round(lines.reduce((total, line) => total + line.amount, 0));
}

/** Five per thousand up to 89m TL, one per thousand above. */
export function stampDuty(contractAmount: number): number {
  const lower = Math.min(contractAmount, STAMP_DUTY.threshold);
  const upper = Math.max(contractAmount - STAMP_DUTY.threshold, 0);
  return round((lower * STAMP_DUTY.lowerRate) / 100 + (upper * STAMP_DUTY.upperRate) / 100);
}

export function propertyVatRate(kind: 'home' | 'other', areaM2: number | null): number {
  if (kind === 'home' && areaM2 !== null && areaM2 >= PROPERTY_VAT.largeHomeFromM2) {
    return PROPERTY_VAT.largeHome;
  }
  return PROPERTY_VAT.standard;
}

/** The title deed fee rate for a sale, and the contract/transfer split when there is one. */
export function saleRate(input: Pick<TitleDeedInput, 'buyer' | 'propertyNumber' | 'oneOff'>): {
  rate: number;
  contract: number | null;
  transfer: number | null;
} {
  if (input.buyer === 'kktc') {
    return {
      rate: input.oneOff ? TITLE_DEED_RATES.kktcOneOff : TITLE_DEED_RATES.kktcSale,
      contract: null,
      transfer: null,
    };
  }

  const table = TITLE_DEED_RATES[input.buyer];
  const index = clampPropertyNumber(input.propertyNumber, MAX_PROPERTIES[input.buyer]) - 1;
  return {
    rate: table.direct[index] ?? table.direct[table.direct.length - 1] ?? 0,
    contract: table.contract[index] ?? null,
    transfer: table.transfer[index] ?? null,
  };
}

/** The single rate of every transaction other than a sale or mortgage. */
function flatRate(input: TitleDeedInput): { rate: number; label: string } {
  switch (input.transaction) {
    case 'gift': {
      const relation = input.giftRelation ?? 'other';
      const oneOff = relation === 'other' && input.buyer === 'kktc' && input.oneOff;
      return {
        rate: oneOff ? TITLE_DEED_RATES.kktcOneOff : TITLE_DEED_RATES.gift[relation],
        label: 'Tapu harcı (bağış)',
      };
    }
    case 'exchange':
      return { rate: TITLE_DEED_RATES.exchange, label: 'Tapu harcı (aldığınız taşınmaz)' };
    case 'prescription':
      return { rate: TITLE_DEED_RATES.prescription, label: 'Tapu harcı (zamanaşımı)' };
    case 'expropriation':
      return {
        rate: TITLE_DEED_RATES.expropriation[input.expropriator ?? 'private'],
        label: 'Tapu harcı (kamulaştırma)',
      };
    case 'points':
      return {
        rate: TITLE_DEED_RATES.points[input.pointsTransfer ?? 'sale'],
        label: 'Tapu harcı (puan devri)',
      };
    default:
      return { rate: 0, label: 'Tapu harcı' };
  }
}

export function calculateTitleDeedFee(input: TitleDeedInput): TitleDeedResult {
  const amount = Math.max(input.amount, 0);
  const lines: FeeLine[] = [];
  const sale = input.transaction === 'sale';
  const gift = input.transaction === 'gift';

  /*
   * The exemption covers the part of the value up to £100,000 and only for a
   * KKTC citizen buying or mortgaging a home; it is applied to the sale and
   * the mortgage separately.
   */
  const gbpRate =
    input.buyer === 'kktc' &&
    (sale || input.transaction === 'mortgage') &&
    input.firstHomeGbpRate
      ? input.firstHomeGbpRate
      : null;
  const capTl = gbpRate ? round(FIRST_HOME_EXEMPTION.capGbp * gbpRate) : 0;
  const exempt = (base: number) => (gbpRate ? Math.min(base, capTl) : 0);

  let base = amount;
  let baseFromMarketValue = false;
  let rate = 0;
  let saleSaving = 0;
  let mortgageSaving = 0;

  if (sale) {
    const market = input.marketValue ?? null;
    if (market !== null && market > amount) {
      base = market;
      baseFromMarketValue = true;
    }

    const split = saleRate(input);
    rate = split.rate;
    const exemptPart = exempt(base);
    const chargeable = base - exemptPart;
    saleSaving = percentOf(exemptPart, rate);

    if (input.route === 'contract' && split.contract !== null && split.transfer !== null) {
      lines.push(
        {
          key: 'fee-contract',
          label: 'Tapu harcı — sözleşme kaydında',
          base: chargeable,
          rate: split.contract,
          amount: percentOf(chargeable, split.contract),
          payer: 'buyer',
        },
        {
          key: 'fee-transfer',
          label: 'Tapu harcı — devirde',
          base: chargeable,
          rate: split.transfer,
          amount: percentOf(chargeable, split.transfer),
          payer: 'buyer',
        },
      );
    } else {
      lines.push({
        key: 'fee',
        label: 'Tapu harcı',
        base: chargeable,
        rate,
        amount: percentOf(chargeable, rate),
        payer: 'buyer',
      });
    }
  } else if (input.transaction !== 'mortgage') {
    const flat = flatRate(input);
    rate = flat.rate;
    lines.push({ key: 'fee', label: flat.label, base, rate, amount: percentOf(base, rate), payer: 'buyer' });

    if (input.transaction === 'exchange') {
      const difference = Math.max(amount - Math.max(input.givenValue ?? 0, 0), 0);
      if (difference > 0) {
        lines.push({
          key: 'exchange-difference',
          label: 'Değer farkı harcı',
          base: difference,
          rate: TITLE_DEED_RATES.exchangeDifference,
          amount: percentOf(difference, TITLE_DEED_RATES.exchangeDifference),
          note: 'Aldığınız taşınmaz verdiğinizden değerli olduğu için.',
          payer: 'buyer',
        });
      }
    }
  }

  const mortgageAmount =
    input.transaction === 'mortgage' ? amount : sale ? input.mortgageAmount ?? 0 : 0;
  if (mortgageAmount > 0) {
    if (input.transaction === 'mortgage') rate = TITLE_DEED_RATES.mortgage;
    const exemptPart = exempt(mortgageAmount);
    const chargeable = mortgageAmount - exemptPart;
    mortgageSaving = percentOf(exemptPart, TITLE_DEED_RATES.mortgage);
    lines.push({
      key: 'mortgage',
      label: 'İpotek harcı',
      base: chargeable,
      rate: TITLE_DEED_RATES.mortgage,
      amount: percentOf(chargeable, TITLE_DEED_RATES.mortgage),
      note: 'İpotekli borçlu öder.',
      payer: 'buyer',
    });
  }

  if (sale && amount > 0) {
    const shareRate = input.buyer === 'kktc' ? GKK_SHARE.citizen : GKK_SHARE.foreign;
    lines.push({
      key: 'gkk',
      label: 'Güvenlik Kuvvetlerini Güçlendirme Kurumu payı',
      base: amount,
      rate: shareRate,
      amount: percentOf(amount, shareRate),
      note: 'Satış bedeli üzerinden, alıcı öder.',
      payer: 'buyer',
    });
  }

  if (input.fixedFees) {
    lines.push({
      key: 'fixed',
      label: 'Sabit harçlar (dilekçe ve koçan)',
      amount: FIXED_FEES.petition + FIXED_FEES.certificate,
      note: `Kayıt dilekçesi ${FIXED_FEES.petition} TL, koçan veya ipotek sertifikası ${FIXED_FEES.certificate} TL.`,
      payer: 'buyer',
    });
  }

  const landOfficeTotal = sum(lines);

  if (sale && input.stampDuty && amount > 0) {
    lines.push({
      key: 'stamp',
      label: 'Sözleşme pul vergisi',
      base: amount,
      rate: STAMP_DUTY.lowerRate,
      amount: stampDuty(amount),
      note: amount > STAMP_DUTY.threshold ? '89.000.000 TL’yi aşan kısım binde bir.' : undefined,
      payer: 'buyer',
    });
  }

  if (sale && input.vat && amount > 0) {
    const vatRate = propertyVatRate(input.vat.kind, input.vat.areaM2);
    lines.push({
      key: 'vat',
      label: 'KDV',
      base: amount,
      rate: vatRate,
      amount: percentOf(amount, vatRate),
      payer: 'buyer',
    });
  }

  if (sale && input.buyer !== 'kktc') {
    lines.push({
      key: 'permit',
      label: 'Satın alma izni hizmet harcı',
      amount: purchasePermitFee(input.minimumWage),
      note: 'Bakanlığa izin başvurusunda ödenir: aylık brüt asgari ücretin yarısı.',
      payer: 'buyer',
    });
  }

  /*
   * Section 4(1)(f)(i): a gift to one's spouse or children is not a taxable
   * disposal. A grandparent's gift to a grandchild is — the Cetvel's 0.4%
   * group and the income tax exemption do not line up.
   */
  const sellerTaxExemptByRelation =
    gift && (input.giftRelation === 'child' || input.giftRelation === 'spouse');
  const seller = input.seller ?? 'none';
  if ((sale || gift) && seller !== 'none') {
    const taxRate = sellerTaxExemptByRelation ? 0 : sellerTaxRate(seller);
    lines.push({
      key: 'seller-tax',
      label: sale ? 'Satıcının gelir vergisi stopajı' : 'Bağışlayanın gelir vergisi stopajı',
      base,
      rate: taxRate,
      amount: percentOf(base, taxRate),
      note: sellerTaxExemptByRelation
        ? 'Eşe veya çocuğa bağışta kazanç aranmaz.'
        : seller === 'individual-exempt'
          ? 'Bir defalık ev ve arsa istisnası: kazanç aranmaz.'
          : undefined,
      payer: 'seller',
    });
  }

  return {
    base,
    baseFromMarketValue,
    rate,
    lines,
    landOfficeTotal,
    total: sum(lines.filter((line) => line.payer === 'buyer')),
    sellerTotal: sum(lines.filter((line) => line.payer === 'seller')),
    exemption: gbpRate ? { capTl, saleSaving, mortgageSaving } : null,
    sellerTaxExemptByRelation,
  };
}
