import { describe, expect, it } from 'vitest';

import { ablativeYear, coverageSince, dativeYear, locativeYear } from './turkish-number';

/**
 * Kapsam yılı sabitten geliyor (spec 8.4) ve ek okunuşa bağlı. Yıl değiştiğinde
 * ekin de değişmesi gerekiyor; sabit "'dan" yazmak 2006 için doğru, 1975 için
 * yanlış oluyordu.
 */
describe('ablativeYear', () => {
  it.each([
    [2006, "2006'dan"], // iki bin altı
    [1975, "1975'ten"], // bin dokuz yüz yetmiş beş
    [1983, "1983'ten"], // ... seksen üç
    [2020, "2020'den"], // iki bin yirmi
    [2024, "2024'ten"], // ... yirmi dört
    [2025, "2025'ten"], // ... yirmi beş
    [2026, "2026'dan"], // ... yirmi altı
    [2000, "2000'den"], // iki bin
    [1990, "1990'dan"], // ... doksan
    [1940, "1940'tan"], // ... kırk
  ])('%i -> %s', (year, expected) => {
    expect(ablativeYear(year)).toBe(expected);
  });
});

describe('locativeYear', () => {
  it.each([
    [2006, "2006'da"],
    [1975, "1975'te"],
    [2025, "2025'te"],
  ])('%i -> %s', (year, expected) => {
    expect(locativeYear(year)).toBe(expected);
  });
});

describe('coverageSince', () => {
  it('kapsam ifadesini yıldan türetir', () => {
    expect(coverageSince(2006)).toBe("2006'dan bugüne");
    expect(coverageSince(1975)).toBe("1975'ten bugüne");
  });
});

describe('dativeYear', () => {
  it.each([
    [2006, "2006'ya"], // ...altı, ünlüyle biter -> y kaynaştırma
    [1975, "1975'e"], //  ...beş, ünsüzle biter
    [2020, "2020'ye"], // ...yirmi, ünlüyle biter
    [2000, "2000'e"], //  ...bin
    [1990, "1990'a"], //  ...doksan
  ])('%i -> %s', (year, expected) => {
    expect(dativeYear(year)).toBe(expected);
  });
});
