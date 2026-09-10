import { describe, expect, it } from 'vitest';

import { parseNumberInput } from './format';
import {
  caretAfterDigits,
  countDigits,
  formatNumberInput,
  normalizeTypedSeparator,
  toCanonicalNumber,
} from './number-input';

/**
 * Alanın gerçek döngüsünü taklit eder: ekranda `previous` varken kullanıcı
 * `typed` metnini bırakıyor, imleç `caret` konumunda. Dönen değer, alanda
 * görünecek yeni metin ve imlecin yeni konumu.
 */
function edit(previous: string, typed: string, caret = typed.length) {
  const normalized = normalizeTypedSeparator(typed, previous, caret);
  const beforeCaret = normalized.slice(0, caret);
  const canonical = toCanonicalNumber(normalized);
  const display = formatNumberInput(canonical);
  return {
    canonical,
    display,
    caret: caretAfterDigits(display, countDigits(beforeCaret), beforeCaret.endsWith(',')),
  };
}

/** Sona bir karakter yazmak. */
const typeAtEnd = (previous: string, character: string) =>
  edit(previous, previous + character, previous.length + 1);

/** Sondan bir karakter silmek. */
const backspaceAtEnd = (previous: string) =>
  edit(previous, previous.slice(0, -1), previous.length - 1);

describe('formatNumberInput', () => {
  it('binlik ayracını noktayla, ondalığı virgülle yazıyor', () => {
    expect(formatNumberInput('1000')).toBe('1.000');
    expect(formatNumberInput('70893')).toBe('70.893');
    expect(formatNumberInput('1234567')).toBe('1.234.567');
    expect(formatNumberInput('70893.5')).toBe('70.893,5');
    expect(formatNumberInput('0.5')).toBe('0,5');
  });

  it('dört basamağın altında ayraç eklemiyor', () => {
    expect(formatNumberInput('100')).toBe('100');
    expect(formatNumberInput('999')).toBe('999');
  });

  it('boş değer boş kalıyor', () => {
    expect(formatNumberInput('')).toBe('');
  });
});

describe('toCanonicalNumber', () => {
  it('nokta binlik ayracı, virgül ondalık ayracı', () => {
    expect(toCanonicalNumber('70.893')).toBe('70893');
    expect(toCanonicalNumber('1.234.567')).toBe('1234567');
    expect(toCanonicalNumber('70.893,5')).toBe('70893.5');
    expect(toCanonicalNumber('0,5')).toBe('0.5');
  });

  it('ondalık ayracı yazılıp henüz rakam gelmediyse ayraç korunuyor', () => {
    expect(toCanonicalNumber('12,')).toBe('12.');
  });

  it('en fazla iki ondalık basamak alıyor', () => {
    expect(toCanonicalNumber('1,2345')).toBe('1.23');
  });

  it('rakam ve ayraç dışındaki her şeyi atıyor', () => {
    expect(toCanonicalNumber('70.893 TL')).toBe('70893');
    expect(toCanonicalNumber('abc')).toBe('');
    expect(toCanonicalNumber('-5')).toBe('5');
  });
});

describe('normalizeTypedSeparator', () => {
  it('yeni yazılan noktayı ondalık ayracı sayıp virgüle çeviriyor', () => {
    expect(normalizeTypedSeparator('0.', '0', 2)).toBe('0,');
    expect(normalizeTypedSeparator('15.000.', '15.000', 7)).toBe('15.000,');
  });

  /*
   * Bildirilen hata: "15.000" yazılıp bir kez geri silinince sayı 15'e
   * düşüyordu. Silme bir EKLEME olmadığı için buradaki normalleştirme devreye
   * girmiyor ve metindeki nokta binlik ayracı olarak kalıyor.
   */
  it('silme işleminde metne dokunmuyor', () => {
    expect(normalizeTypedSeparator('15.00', '15.000', 5)).toBe('15.00');
  });

  it('rakam eklemede metne dokunmuyor', () => {
    expect(normalizeTypedSeparator('15.0000', '15.000', 7)).toBe('15.0000');
  });
});

describe('yazma döngüsü', () => {
  it('rakam rakam yazarken ayraç kendiliğinden beliriyor', () => {
    expect(typeAtEnd('', '1').display).toBe('1');
    expect(typeAtEnd('1', '0').display).toBe('10');
    expect(typeAtEnd('10', '0').display).toBe('100');
    expect(typeAtEnd('100', '0').display).toBe('1.000');
    expect(typeAtEnd('1.000', '0').display).toBe('10.000');
    expect(typeAtEnd('10.000', '0').display).toBe('100.000');
    expect(typeAtEnd('100.000', '0').display).toBe('1.000.000');
  });

  it('geri silmek sayıyı bir basamak kısaltıyor, ondalığa çevirmiyor', () => {
    expect(backspaceAtEnd('15.000').display).toBe('1.500');
    expect(backspaceAtEnd('15.000').canonical).toBe('1500');
    expect(backspaceAtEnd('1.500').display).toBe('150');
    expect(backspaceAtEnd('70.893').canonical).toBe('7089');
  });

  it('virgül yazıldığında imleç virgülün SAĞINA geçiyor', () => {
    const withComma = typeAtEnd('15.000', ',');
    expect(withComma.display).toBe('15.000,');
    expect(withComma.caret).toBe(7);

    const withKurus = typeAtEnd('15.000,', '5');
    expect(withKurus.display).toBe('15.000,5');
    expect(withKurus.canonical).toBe('15000.5');
    expect(withKurus.caret).toBe(8);
  });

  it('nokta tuşu da ondalık ayracı olarak çalışıyor', () => {
    const withDot = typeAtEnd('15.000', '.');
    expect(withDot.display).toBe('15.000,');
    expect(withDot.caret).toBe(7);
  });

  it('sayının ortasına yazarken imleç yazılan rakamın sağında kalıyor', () => {
    // "70.893" içinde imleç 2. karakterde, araya 5 yazılıyor.
    const middle = edit('70.893', '705.893', 3);
    expect(middle.display).toBe('705.893');
    expect(middle.caret).toBe(3);
  });

  it('kanonik değer doğrudan sayıya çevrilebiliyor', () => {
    expect(parseNumberInput(toCanonicalNumber('70.893'))).toBe(70893);
    expect(parseNumberInput(toCanonicalNumber('70.893,50'))).toBe(70893.5);
    expect(parseNumberInput(toCanonicalNumber('12,'))).toBe(12);
    expect(parseNumberInput(toCanonicalNumber(''))).toBeNull();
  });
});

describe('imleç konumu', () => {
  it('rakam sayısı ayraçlardan etkilenmiyor', () => {
    expect(countDigits('70.893,5')).toBe(6);
    expect(countDigits('')).toBe(0);
  });

  it('imleç, geçilen rakam sayısına göre yeniden konumlanıyor', () => {
    expect(caretAfterDigits('1.000', 4)).toBe(5);
    expect(caretAfterDigits('1.000', 0)).toBe(0);
    expect(caretAfterDigits('1.000', 1)).toBe(1);
    expect(caretAfterDigits('1.000', 9)).toBe(5);
  });

  it('ondalık ayracının sağına geçme bayrağı', () => {
    expect(caretAfterDigits('15.000,', 5, true)).toBe(7);
    expect(caretAfterDigits('15.000,5', 6, false)).toBe(8);
  });
});
