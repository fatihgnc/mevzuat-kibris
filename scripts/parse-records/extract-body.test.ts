import { describe, expect, it } from 'vitest';

import { extractBody } from './parser';

/**
 * Body boundaries — a regression guard for a bug measured on real data.
 *
 * `extractBody` starts a body at the record's reference and ends it at the next
 * reference. The end used to be found by looking ONLY at the label of the next
 * record in contents order; if that label was not present in the PDF text, the
 * body ran to the end of the file.
 *
 * Measured on 2025+2026 data: of 3,646 records with a body, 184 (5%) spilled into
 * other records, with an average of 7.9 foreign references per overflowing
 * record. Since that text is also indexed for search, a record could be found by
 * words that had nothing to do with it.
 */

const PDF = [
  'RESMÎ GAZETE Sayı 262',
  'Ü(K-I) 2477-2025',
  'GÜZELYURT BELEDİYESİNİN KULLANIMINA ARAZİ VERİLMESİ hakkında karar metni burada.',
  'Ü(K-I) 2489-2025',
  'PARK YERİ KİRALANMASI hakkında karar metni burada.',
  'Ü(K-I) 2497-2025',
  'FİYAT İSTİKRAR FONU değişikliği hakkında karar metni burada.',
].join('\n');

describe('extractBody', () => {
  it('gövdeyi kendi referansından başlatır', () => {
    const { body } = extractBody(PDF, 'Ü(K-I) 2489-2025', ['Ü(K-I) 2477-2025', 'Ü(K-I) 2497-2025']);
    expect(body).toMatch(/^Ü\(K-I\) 2489-2025/);
    expect(body).toContain('PARK YERİ KİRALANMASI');
  });

  it('SONRAKİ referansta durur, sonrasına taşmaz', () => {
    const { body } = extractBody(PDF, 'Ü(K-I) 2489-2025', ['Ü(K-I) 2477-2025', 'Ü(K-I) 2497-2025']);
    expect(body).not.toContain('FİYAT İSTİKRAR FONU');
    expect(body).not.toContain('2497-2025');
  });

  /*
   * This was the actual bug. The old code looked for the end using only the label
   * of the NEXT record in contents order. That order need not match the PDF
   * order: here the contents list 2477 after 2489, but 2477 occurs EARLIER in the
   * PDF. The old code could not find it after the start and stretched the body to
   * the end of the file.
   *
   * The end is now the nearest OTHER reference, regardless of the order they are
   * given in.
   */
  it('etiketlerin sırası karışık verilse de en yakınında durur', () => {
    const karisik = ['Ü(K-I) 2497-2025', 'Ü(K-I) 2477-2025'];
    const { body } = extractBody(PDF, 'Ü(K-I) 2489-2025', karisik);
    expect(body).toContain('PARK YERİ KİRALANMASI');
    expect(body).not.toContain('FİYAT İSTİKRAR FONU');
  });

  it('son kayıtta metnin sonuna kadar gider', () => {
    const { body } = extractBody(PDF, 'Ü(K-I) 2497-2025', ['Ü(K-I) 2477-2025', 'Ü(K-I) 2489-2025']);
    expect(body).toContain('FİYAT İSTİKRAR FONU');
  });

  it('PDF metninde geçmeyen referans için gövde üretmez', () => {
    expect(extractBody(PDF, 'Ü(K-I) 9999-2025', []).body).toBeNull();
    expect(extractBody(PDF, null, []).body).toBeNull();
  });

  it('boşluk farkını tolere eder — PDF etiketi bitişik yazabiliyor', () => {
    const bitisik = PDF.replace('Ü(K-I) 2489-2025', 'Ü(K-I)2489-2025');
    const { body } = extractBody(bitisik, 'Ü(K-I) 2489-2025', ['Ü(K-I) 2497-2025']);
    expect(body).toContain('PARK YERİ KİRALANMASI');
    expect(body).not.toContain('FİYAT İSTİKRAR FONU');
  });

  it('çok kısa dilimi gövde saymaz', () => {
    const yanyana = 'Ü(K-I) 2477-2025 Ü(K-I) 2489-2025 devam';
    expect(extractBody(yanyana, 'Ü(K-I) 2477-2025', ['Ü(K-I) 2489-2025']).body).toBeNull();
  });
});
