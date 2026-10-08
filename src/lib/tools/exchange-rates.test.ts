import { describe, expect, it } from 'vitest';

import { parseCentralBankRates } from './exchange-rates';

const row = (name: string, forexSelling: string, banknoteSelling: string) => `
  <tr class="odd">
    <td style="text-align:left"><left>${name}</left></td>
    <td style="text-align:right"><right>1</right></td>
    <td style="text-align:right"><right>${forexSelling}</right></td>
    <td style="text-align:right"><right>1</right></td>
    <td style="text-align:right"><right>${banknoteSelling}</right></td>
  </tr>`;

/* Trimmed from the bank's rate query page on 8 October 2026. */
const PAGE = `
<center><strong>08/10/2026 - Tarihinde Geçerli Olan Resmi Kurlar</strong></center>
<table class="cbdoviz responsive-enabled" id="edit-resmi-kur-table">
  <thead><tr><th>Döviz Cinsi (TRY)</th></tr></thead>
  <tbody>
  ${row('1&nbsp;AMERİKAN DOLARI&nbsp;(USD)', '49.19760', '49.29000')}
  ${row('1&nbsp;EURO&nbsp;(EUR)', '55.08980', '55.17240')}
  ${row('1&nbsp;İNGİLİZ STERLİNİ&nbsp;(GBP)', '65.21080', '65.30870')}
  ${row('100&nbsp;JAPON YENİ&nbsp;(JPY)', '31.16450', '31.20000')}
  ${row('1&nbsp;İSVİÇRE FRANGI&nbsp;(CHF)', '58.90000', '59.00000')}
  </tbody>
</table>
<table class="cbdoviz">
  ${row('1&nbsp;AMERİKAN DOLARI&nbsp;(USD)', '1.4357', '1.4357')}
</table>`;

describe('parseCentralBankRates', () => {
  it('reads forex and banknote selling from the official table, per one unit', () => {
    expect(parseCentralBankRates(PAGE)).toEqual({
      date: '08/10/2026',
      rates: { USD: 49.1976, EUR: 55.0898, GBP: 65.2108, JPY: 0.311645 },
      banknoteRates: { USD: 49.29, EUR: 55.1724, GBP: 65.3087, JPY: 0.312 },
    });
  });

  it('returns null when the page layout is not recognised', () => {
    expect(parseCentralBankRates('<html><body>Bakım çalışması</body></html>')).toBeNull();
  });
});
