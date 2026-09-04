import { describe, expect, it } from 'vitest';

import { bodyAnchor, extractBody } from './parser';

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

  /*
   * NOKTA FARKI — 2020-2022'de ölçüldü ve gövdeleri tek başına yok ediyordu.
   * İçindekiler hücresi "E.S(K-I) 27-2020" yazıyor, PDF gövdesi
   * "E.S.(K-I)27-2020" — parantezden önce fazladan bir nokta var. Nokta literal
   * kaldığı sürece etiket bulunamıyor ve kayıt gövdesiz kalıyor.
   * İki gerçek sayıda 127 kaydın 1'i bulunuyordu, düzeltmeden sonra 111'i.
   */
  const NOKTALI = [
    'RESMÎ GAZETE Sayı 239',
    'KARAR SAYISI: E.S.(K-I)27-2020',
    "ALİ ÖZCANLI'NIN SÖZLEŞMESİNİN YENİLENMESİ hakkında karar metni burada.",
    'KARAR SAYISI: E.S.(K-I)28-2020',
    'MEHMET GÖKYİĞİT SÖZLEŞMESİ hakkında karar metni burada.',
  ].join('\n');

  it('PDF fazladan nokta koyduğunda da etiketi bulur', () => {
    const { body } = extractBody(NOKTALI, 'E.S(K-I) 27-2020', ['E.S(K-I) 28-2020']);
    expect(body).toContain('ALİ ÖZCANLI');
  });

  it('nokta toleransı gövdenin BİTİŞİNİ de bulur, taşma olmaz', () => {
    const { body } = extractBody(NOKTALI, 'E.S(K-I) 27-2020', ['E.S(K-I) 28-2020']);
    expect(body).not.toContain('MEHMET GÖKYİĞİT');
  });

  it('nokta toleransı farklı bir referansı eşleştirmez', () => {
    expect(extractBody(NOKTALI, 'E.T(K-I) 27-2020', []).body).toBeNull();
    expect(extractBody(NOKTALI, 'E.S(K-I) 99-2020', []).body).toBeNull();
  });
});

/*
 * EK III — the anchor the CONTENTS uses is not the anchor the PAGE uses.
 *
 * The contents cell lists "A.E. 380"; the printed item is headed "Sayı :  380"
 * and the A.E. series never appears in the body at all. What DOES appear is the
 * margin citation block — "A.E.275", "A.E.488" — pointing at the older decisions
 * the item amends. Anchoring on A.E. therefore landed on a citation and ran on
 * from there: measured over 42 issues, the old anchor produced 9 bodies against
 * 218, and their median length was 66.959 characters against 2.869.
 *
 * The fixture is shaped like the real thing: item 380's body carries citations
 * of A.E. 275 and A.E. 488, and A.E. 380 appears nowhere.
 */
const EK_III = [
  'KUZEY KIBRIS TÜRK CUMHURİYETİ RESMÎ GAZETE EK III',
  'Sayı : 81',
  'Sayı :  380',
  '(1381)',
  'A.E.275 18.08.2006 R.G.138 EK III A.E.488',
  'TURİZM GELİŞTİRME VE TANITMA FONU emirnamesinin 2. maddesi değiştirilir.',
  'Sayı :  381',
  '1383',
  'PETROL ÜRÜNLERİ FİYATLANDIRMA ESASLARI tüzüğü hakkında metin burada.',
].join('\n');

describe('bodyAnchor — EK III kendi numarasını "Sayı :" diye basıyor', () => {
  it('A.E. kaydı için gazetedeki etiketi veriyor', () => {
    expect(bodyAnchor('ae', '380')).toBe('Sayı : 380');
  });

  it('diğer türlerde referansın kendisi kalıyor', () => {
    expect(bodyAnchor('uki', '830-2026')).toBe('Ü(K-I) 830-2026');
    expect(bodyAnchor('eski', '27-2020')).toBe('E.S(K-I) 27-2020');
    expect(bodyAnchor(null, '380')).toBeNull();
    expect(bodyAnchor('ae', null)).toBeNull();
  });

  it('A.E. çapasıyla gövde BULUNAMIYOR — numara gövdede hiç geçmiyor', () => {
    expect(extractBody(EK_III, 'A.E. 380', ['A.E. 381']).body).toBeNull();
  });

  it('"Sayı :" çapasıyla kaydın KENDİ metni geliyor', () => {
    const { body } = extractBody(EK_III, bodyAnchor('ae', '380'), [bodyAnchor('ae', '381')!]);
    expect(body).toContain('TURİZM GELİŞTİRME');
    expect(body).not.toContain('PETROL ÜRÜNLERİ');
  });

  /*
   * The failure this replaces. "A.E. 275" is a citation inside item 380, not a
   * record of this issue — but with the old anchor a record numbered 275 would
   * have taken it as the start of its own body and stored item 380's text.
   */
  it('kenar boşluğundaki atıf, o numaralı kayda gövde diye verilmiyor', () => {
    expect(extractBody(EK_III, bodyAnchor('ae', '275'), []).body).toBeNull();
  });

  /*
   * A bare number has no year to end it, so the label must not run into a longer
   * one. Measured in the archive: 41 pairs of A.E. records share an issue where
   * one number is a digit-prefix of the other.
   */
  it('kısa numara, uzun numaranın başına yapışmıyor', () => {
    expect(extractBody(EK_III, bodyAnchor('ae', '38'), []).body).toBeNull();
    expect(extractBody(EK_III, bodyAnchor('ae', '8'), []).body).toBeNull();
  });
});
