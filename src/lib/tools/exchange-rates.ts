/**
 * Daily exchange rates for the calculators' currency fields.
 *
 * Customs converts an invoice at the "döviz satış" (forex selling) rate valid
 * on the day the declaration is registered (İthalatta Kur Uygulanması Tüzüğü,
 * section 3), so that is the column used here, taken from the KKTC Merkez
 * Bankası's official rates table. The forms only prefill with it; the reader
 * can still type the rate of the day they will actually clear.
 */

export const RATE_CURRENCIES = ['GBP', 'EUR', 'USD', 'JPY'] as const;

export type RateCurrency = (typeof RATE_CURRENCIES)[number];

export interface ExchangeRates {
  /** The date the bank gives the table, `DD/MM/YYYY`. */
  date: string;
  /** TL for one unit of each currency, forex selling. */
  rates: Partial<Record<RateCurrency, number>>;
  /**
   * Banknote selling ("efektif satış"), which the first-home title deed
   * exemption names for its £100,000 cap.
   */
  banknoteRates: Partial<Record<RateCurrency, number>>;
}

/** Which column a field needs. */
export type RateKind = 'forex' | 'banknote';

export const EXCHANGE_RATE_SOURCE = {
  name: 'KKTC Merkez Bankası',
  url: 'https://www.kktcmerkezbankasi.org/tr/veriler/doviz_kurlari/kur_sorgulama',
} as const;

function cellText(cell: string): string {
  return cell
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Reads the official rates table out of the bank's rate query page. Only the
 * first table counts: the page also lists cross rates against the dollar.
 * Returns `null` when the page does not look as expected, so a layout change
 * leaves the fields empty rather than filled with a wrong number.
 */
export function parseCentralBankRates(html: string): ExchangeRates | null {
  const date = /(\d{2}\/\d{2}\/\d{4})\s*-\s*Tarihinde Geçerli Olan Resmi Kurlar/.exec(html)?.[1];
  const tableStart = html.indexOf('edit-resmi-kur-table');
  if (!date || tableStart === -1) return null;
  const tableEnd = html.indexOf('</table>', tableStart);
  const table = html.slice(tableStart, tableEnd === -1 ? undefined : tableEnd);

  const rates: ExchangeRates['rates'] = {};
  const banknoteRates: ExchangeRates['banknoteRates'] = {};
  const perUnit = (text: string | undefined, unit: number) => {
    const value = Number(text);
    return Number.isFinite(value) && value > 0 ? Math.round((value / unit) * 1e6) / 1e6 : undefined;
  };
  for (const row of table.split(/<tr[\s>]/).slice(1)) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => cellText(match[1] ?? ''));
    /* Columns: currency, forex buying, forex selling, banknote buying, banknote selling. */
    const name = /^(\d+)\s.*\((\w{3})\)$/.exec(cells[0] ?? '');
    if (!name) continue;
    const code = name[2] as RateCurrency;
    if (!RATE_CURRENCIES.includes(code)) continue;
    const unit = Number(name[1]);
    const forex = perUnit(cells[2], unit);
    const banknote = perUnit(cells[4], unit);
    if (forex !== undefined) rates[code] = forex;
    if (banknote !== undefined) banknoteRates[code] = banknote;
  }

  return Object.keys(rates).length ? { date, rates, banknoteRates } : null;
}
