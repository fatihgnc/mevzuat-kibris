import { describe, expect, it } from 'vitest';

import { extractBody } from './parser';

/**
 * Gövde sınırları — gerçek veride ölçülen hatanın regresyon bekçisi.
 *
 * `extractBody` gövdeyi kaydın referansından başlatıp bir sonraki referansta
 * bitiriyor. Bitiş eskiden YALNIZCA içindekiler sırasındaki bir sonraki kaydın
 * etiketine bakıyordu; o etiket PDF metninde bulunamazsa gövde dosyanın sonuna
 * kadar uzuyordu.
 *
 * 2025+2026 verisinde ölçüldü: 3.646 gövdeli kaydın 184'ü (%5) başka kayıtlara
 * taşıyordu, taşan kayıt başına ortalama 7,9 yabancı referans. Bu metin aramada
 * da indekslendiği için kayıt, kendisiyle ilgisi olmayan kelimelerle
 * bulunabiliyordu.
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
   * Asıl hata buydu. Eski kod bitişi yalnızca içindekiler sırasındaki BİR
   * SONRAKİ kaydın etiketiyle arıyordu. O sıra PDF sırasıyla aynı olmak
   * zorunda değil: burada içindekiler 2489'dan sonra 2477'yi listeliyor, ama
   * 2477 PDF'te DAHA ÖNCE geçiyor. Eski kod başlangıçtan sonra onu bulamayıp
   * gövdeyi dosyanın sonuna kadar uzatıyordu.
   *
   * Artık bitişi en yakın DİĞER referans belirliyor, verilme sırası önemsiz.
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
