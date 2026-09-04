import { describe, expect, it } from 'vitest';

import { countCid, decodeCid, decodeCidText } from './cid';

/**
 * Every string here is verbatim from the archive: 2024 issue 2, whose text layer
 * pdftotext returned as "<8577$ù/,.'(öøùø./ø.<$6$7$6$5,6,".
 */

describe('decodeCid', () => {
  it('kaydırmayı büyük harfe uygular', () => {
    expect(decodeCid(0x3c)).toBe('Y');
    expect(decodeCid(0x24)).toBe('A');
    expect(decodeCid(0x36)).toBe('S');
  });

  it('küçük harfe de aynı kaydırma', () => {
    // 'a' = 0x61, yani ham kod 0x44.
    expect(decodeCid(0x44)).toBe('a');
    expect(decodeCid(0x5d)).toBe('z');
  });

  /* Kolay kacirilan: bosluk da kaydirilmis. cid 3 -> 0x20. */
  it('boşluğu çözer', () => {
    expect(decodeCid(3)).toBe(' ');
  });

  it('rakam ve noktalamayı çözer', () => {
    expect(decodeCid(0x0f)).toBe(',');
    expect(decodeCid(0x11)).toBe('.');
    expect(decodeCid(0x13)).toBe('0');
  });

  /*
   * Turkce tablosu hizalamayla turetildi ve ilk tahmin Ğ ile Ö'yu ters
   * yazmisti; bu iki satir tam o hatayi sabitliyor.
   */
  it('Türkçe harfleri tablodan çözer', () => {
    expect(decodeCid(0x67)).toBe('Ö');
    expect(decodeCid(0xf6)).toBe('Ğ');
    expect(decodeCid(0xf8)).toBe('İ');
    expect(decodeCid(0xd5)).toBe('ı');
    expect(decodeCid(0xfa)).toBe('ş');
    expect(decodeCid(0x6f)).toBe('ç');
  });

  /* Cozulemeyen kod, "(cid:212)" olarak metne sizmaktansa dusurulur. */
  it('bilinmeyen kodu düşürür', () => {
    expect(decodeCid(212)).toBe('');
    expect(decodeCid(9999)).toBe('');
  });
});

describe('decodeCidText', () => {
  it('gerçek bir başlığı çözer', () => {
    const raw =
      '(cid:60)(cid:36)(cid:54)(cid:36)(cid:3)(cid:55)(cid:36)(cid:54)(cid:36)(cid:53)(cid:44)(cid:54)(cid:44)';
    expect(decodeCidText(raw)).toBe('YASA TASARISI');
  });

  it('Türkçe harf taşıyan kelimeyi çözer', () => {
    // GEREKÇESİ
    const raw =
      '(cid:42)(cid:40)(cid:53)(cid:40)(cid:46)(cid:100)(cid:40)(cid:54)(cid:248)';
    expect(decodeCidText(raw)).toBe('GEREKÇESİ');
  });

  /* İşaretsiz metne DOKUNULMAZ: hattın çoğu belgesi zaten temiz geliyor. */
  it('işaretsiz metni olduğu gibi bırakır', () => {
    const clean = 'Bakanlar Kurulu, 25/1993 sayılı Yurttaşlık Yasası çerçevesinde (bkz. 1983)';
    expect(decodeCidText(clean)).toBe(clean);
  });

  it('karışık metinde yalnızca işaretleri çözer', () => {
    expect(decodeCidText('GENEL (cid:42)(cid:40)(cid:53)(cid:40)(cid:46) 1983')).toBe(
      'GENEL GEREK 1983',
    );
  });
});

describe('countCid', () => {
  it('işaret sayar', () => {
    expect(countCid('(cid:60)(cid:36)x(cid:54)')).toBe(3);
    expect(countCid('temiz metin')).toBe(0);
  });
});
