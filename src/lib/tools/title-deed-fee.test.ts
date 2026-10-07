import { describe, expect, it } from 'vitest';

import { MINIMUM_WAGE } from './constants';
import {
  calculateTitleDeedFee,
  propertyVatRate,
  purchasePermitFee,
  saleRate,
  sellerTaxRate,
  stampDuty,
  TITLE_DEED_RATES,
} from './title-deed-fee';

const line = (result: ReturnType<typeof calculateTitleDeedFee>, key: string) =>
  result.lines.find((entry) => entry.key === key);

describe('title deed fee — sale rates (A.E. 540/2024, A.E. 385/2025)', () => {
  it('charges a KKTC citizen 6%, or 3% when using the one-off right', () => {
    expect(saleRate({ buyer: 'kktc' }).rate).toBe(6);
    expect(saleRate({ buyer: 'kktc', oneOff: true }).rate).toBe(3);
  });

  it('charges Turkish citizens 6/8/9% by property number', () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => saleRate({ buyer: 'tc', propertyNumber: n }).rate)).toEqual([
      6, 8, 9, 9, 9, 9,
    ]);
  });

  it('charges other foreigners 9% on each of their three properties', () => {
    expect([1, 2, 3].map((n) => saleRate({ buyer: 'foreign', propertyNumber: n }).rate)).toEqual([9, 9, 9]);
  });

  it('does not give the one-off 3% to Turkish citizens since A.E. 540/2024', () => {
    expect(saleRate({ buyer: 'tc', oneOff: true }).rate).toBe(6);
  });

  it('splits into contract and transfer stages that add up to the direct rate', () => {
    for (const buyer of ['tc', 'foreign'] as const) {
      const table = TITLE_DEED_RATES[buyer];
      table.direct.forEach((direct, index) => {
        expect((table.contract[index] ?? 0) + (table.transfer[index] ?? 0)).toBe(direct);
      });
    }
  });

  it('clamps an out-of-range property number to the table', () => {
    expect(saleRate({ buyer: 'foreign', propertyNumber: 7 }).rate).toBe(9);
    expect(saleRate({ buyer: 'tc', propertyNumber: 0 }).rate).toBe(6);
  });
});

describe('calculateTitleDeedFee — sale', () => {
  it('charges on the market value when it is higher than the price', () => {
    const result = calculateTitleDeedFee({
      transaction: 'sale',
      buyer: 'kktc',
      amount: 4_000_000,
      marketValue: 5_000_000,
    });
    expect(result.baseFromMarketValue).toBe(true);
    expect(line(result, 'fee')?.amount).toBe(300_000);
  });

  it('ignores a market value lower than the price', () => {
    const result = calculateTitleDeedFee({
      transaction: 'sale',
      buyer: 'kktc',
      amount: 4_000_000,
      marketValue: 3_000_000,
    });
    expect(result.baseFromMarketValue).toBe(false);
    expect(line(result, 'fee')?.amount).toBe(240_000);
  });

  it('shows the two stages for a foreign buyer registering a contract first', () => {
    const result = calculateTitleDeedFee({
      transaction: 'sale',
      buyer: 'foreign',
      amount: 10_000_000,
      propertyNumber: 1,
      route: 'contract',
    });
    expect(line(result, 'fee-contract')?.amount).toBe(600_000);
    expect(line(result, 'fee-transfer')?.amount).toBe(300_000);
    // Plus the 0.1% Güçlendirme Kurumu share on a foreign buyer's price.
    expect(result.landOfficeTotal).toBe(910_000);
  });

  it('exempts the part of the value up to £100,000 for a first home', () => {
    const result = calculateTitleDeedFee({
      transaction: 'sale',
      buyer: 'kktc',
      amount: 6_000_000,
      firstHomeGbpRate: 50,
      mortgageAmount: 4_000_000,
    });
    // £100,000 × 50 = 5,000,000 TL exempt; 1,000,000 TL charged at 6%.
    expect(line(result, 'fee')?.base).toBe(1_000_000);
    expect(line(result, 'fee')?.amount).toBe(60_000);
    // The whole 4,000,000 TL mortgage is under the cap.
    expect(line(result, 'mortgage')?.amount).toBe(0);
    expect(result.exemption).toEqual({ capTl: 5_000_000, saleSaving: 300_000, mortgageSaving: 40_000 });
  });

  it('never applies the first-home exemption to a foreign buyer', () => {
    const result = calculateTitleDeedFee({
      transaction: 'sale',
      buyer: 'foreign',
      amount: 6_000_000,
      firstHomeGbpRate: 50,
    });
    expect(result.exemption).toBeNull();
    expect(line(result, 'fee')?.amount).toBe(540_000);
  });

  it('adds the mortgage fee at 1% of the secured amount', () => {
    const result = calculateTitleDeedFee({
      transaction: 'sale',
      buyer: 'kktc',
      amount: 5_000_000,
      mortgageAmount: 3_000_000,
    });
    expect(line(result, 'mortgage')?.amount).toBe(30_000);
    expect(result.landOfficeTotal).toBe(332_500);
  });

  it('adds stamp duty and VAT on the contract price, outside the land office total', () => {
    const result = calculateTitleDeedFee({
      transaction: 'sale',
      buyer: 'kktc',
      amount: 5_000_000,
      marketValue: 6_000_000,
      stampDuty: true,
      vat: { kind: 'home', areaM2: 150 },
    });
    expect(line(result, 'stamp')?.amount).toBe(25_000);
    expect(line(result, 'vat')?.amount).toBe(250_000);
    expect(result.landOfficeTotal).toBe(362_500);
    expect(result.total).toBe(637_500);
  });
});

describe('calculateTitleDeedFee — gift and mortgage (A.E. 217/2024)', () => {
  it('uses 0.2% parent to child, 0.4% spouse or grandchild, 6% otherwise', () => {
    const fee = (giftRelation: 'child' | 'spouse' | 'grandchild' | 'other') =>
      line(calculateTitleDeedFee({ transaction: 'gift', buyer: 'kktc', amount: 1_000_000, giftRelation }), 'fee')
        ?.amount;
    expect(fee('child')).toBe(2_000);
    expect(fee('spouse')).toBe(4_000);
    expect(fee('grandchild')).toBe(4_000);
    expect(fee('other')).toBe(60_000);
  });

  it('lets a KKTC citizen use the one-off 3% on a gift from outside the family', () => {
    const result = calculateTitleDeedFee({
      transaction: 'gift',
      buyer: 'kktc',
      amount: 1_000_000,
      giftRelation: 'other',
      oneOff: true,
    });
    expect(result.rate).toBe(3);
  });

  it('charges a stand-alone mortgage 1%', () => {
    const result = calculateTitleDeedFee({ transaction: 'mortgage', buyer: 'kktc', amount: 2_500_000 });
    expect(result.rate).toBe(1);
    expect(result.total).toBe(25_000);
  });
});

describe('stamp duty (Pul Yasası, 2/2026) and VAT (2025 KDV Oranları Tüzüğü)', () => {
  it('charges five per thousand up to 89m TL and one per thousand above', () => {
    expect(stampDuty(10_000_000)).toBe(50_000);
    expect(stampDuty(89_000_000)).toBe(445_000);
    expect(stampDuty(100_000_000)).toBe(445_000 + 11_000);
  });

  it('puts homes of 300 m² and more at 10%, everything else at 5%', () => {
    expect(propertyVatRate('home', 299)).toBe(5);
    expect(propertyVatRate('home', 300)).toBe(10);
    expect(propertyVatRate('home', null)).toBe(5);
    expect(propertyVatRate('other', 500)).toBe(5);
  });
});

describe('calculateTitleDeedFee — other transactions (A.E. 217/2024)', () => {
  it('charges 3% on what you receive in an exchange, plus 4% on the difference', () => {
    const richer = calculateTitleDeedFee({
      transaction: 'exchange',
      buyer: 'kktc',
      amount: 3_000_000,
      givenValue: 2_000_000,
    });
    expect(line(richer, 'fee')?.amount).toBe(90_000);
    expect(line(richer, 'exchange-difference')?.amount).toBe(40_000);
    expect(richer.total).toBe(130_000);

    const poorer = calculateTitleDeedFee({
      transaction: 'exchange',
      buyer: 'kktc',
      amount: 2_000_000,
      givenValue: 3_000_000,
    });
    expect(line(poorer, 'exchange-difference')).toBeUndefined();
    expect(poorer.total).toBe(60_000);
  });

  it('charges 5% for prescription and 4% or 6% for expropriation', () => {
    expect(calculateTitleDeedFee({ transaction: 'prescription', buyer: 'kktc', amount: 1_000_000 }).total).toBe(50_000);
    expect(
      calculateTitleDeedFee({ transaction: 'expropriation', buyer: 'kktc', amount: 1_000_000, expropriator: 'public' }).total,
    ).toBe(40_000);
    expect(
      calculateTitleDeedFee({ transaction: 'expropriation', buyer: 'kktc', amount: 1_000_000, expropriator: 'private' }).total,
    ).toBe(60_000);
  });

  it('uses the points rates of section 3(2)', () => {
    const fee = (pointsTransfer: 'sale' | 'child' | 'grandchild' | 'other') =>
      calculateTitleDeedFee({ transaction: 'points', buyer: 'kktc', amount: 1_000_000, pointsTransfer }).total;
    expect(fee('sale')).toBe(60_000);
    expect(fee('child')).toBe(2_000);
    expect(fee('grandchild')).toBe(4_000);
    expect(fee('other')).toBe(60_000);
  });

  it('adds the fixed petition and certificate fees to the land office total', () => {
    const result = calculateTitleDeedFee({ transaction: 'sale', buyer: 'kktc', amount: 1_000_000, fixedFees: true });
    expect(line(result, 'fixed')?.amount).toBe(220);
    expect(result.landOfficeTotal).toBe(60_720);
  });
});

describe('seller income tax (24/1982 sections 4(5), 6(12), 31(1)(i)-(j))', () => {
  it('works out to 2.8% for individuals and 4% for traders and companies', () => {
    expect(sellerTaxRate('individual')).toBe(2.8);
    expect(sellerTaxRate('professional')).toBe(4);
    expect(sellerTaxRate('individual-exempt')).toBe(0);
  });

  it('is charged on the higher of price and market value and kept out of the buyer total', () => {
    const result = calculateTitleDeedFee({
      transaction: 'sale',
      buyer: 'kktc',
      amount: 4_000_000,
      marketValue: 5_000_000,
      seller: 'individual',
    });
    expect(line(result, 'seller-tax')?.amount).toBe(140_000);
    expect(result.sellerTotal).toBe(140_000);
    expect(result.total).toBe(302_000);
  });

  it('is not charged on a gift to a spouse or child, but is on a gift to a grandchild', () => {
    const gift = (giftRelation: 'child' | 'spouse' | 'grandchild') =>
      calculateTitleDeedFee({ transaction: 'gift', buyer: 'kktc', amount: 1_000_000, giftRelation, seller: 'individual' })
        .sellerTotal;
    expect(gift('child')).toBe(0);
    expect(gift('spouse')).toBe(0);
    expect(gift('grandchild')).toBe(28_000);
  });
});

describe('purchase permit service fee (52/2008 section 8(4))', () => {
  it('adds half the minimum wage for a foreign or Turkish buyer, not a KKTC citizen', () => {
    const fee = (buyer: 'kktc' | 'tc' | 'foreign') =>
      line(calculateTitleDeedFee({ transaction: 'sale', buyer, amount: 1_000_000 }), 'permit')?.amount;
    expect(fee('foreign')).toBe(purchasePermitFee());
    expect(fee('tc')).toBe(MINIMUM_WAGE.grossMonthly / 2);
    expect(fee('kktc')).toBeUndefined();
  });

  it('is not part of the land office total', () => {
    const result = calculateTitleDeedFee({ transaction: 'sale', buyer: 'foreign', amount: 1_000_000 });
    expect(result.landOfficeTotal).toBe(91_000);
    expect(result.total).toBe(91_000 + purchasePermitFee());
  });
});

describe('Güçlendirme Kurumu share (13/1981 section 6(3)(ğ), 21/2025)', () => {
  it('takes 0.05% of the price from citizens and 0.1% from foreign buyers', () => {
    const share = (buyer: 'kktc' | 'tc' | 'foreign') =>
      line(calculateTitleDeedFee({ transaction: 'sale', buyer, amount: 4_000_000, marketValue: 5_000_000 }), 'gkk')
        ?.amount;
    expect(share('kktc')).toBe(2_000);
    expect(share('tc')).toBe(4_000);
    expect(share('foreign')).toBe(4_000);
  });

  it('is charged only on sales', () => {
    const gift = calculateTitleDeedFee({ transaction: 'gift', buyer: 'kktc', amount: 1_000_000, giftRelation: 'child' });
    expect(line(gift, 'gkk')).toBeUndefined();
  });
});
