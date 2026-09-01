import { describe, expect, it } from 'vitest';

import { ablativeYear, coverageSince, dativeYear, locativeYear } from './turkish-number';

/**
 * The coverage year comes from a constant (spec 8.4) and the suffix depends on how
 * it is read aloud. When the year changes the suffix has to change too; hardcoding
 * "'dan" is right for 2006 but wrong for 1975.
 */
describe('ablativeYear', () => {
  it.each([
    [2006, "2006'dan"], // iki bin altı (two thousand and six)
    [1975, "1975'ten"], // bin dokuz yüz yetmiş beş (nineteen seventy-five)
    [1983, "1983'ten"], // ... seksen üç (eighty-three)
    [2020, "2020'den"], // iki bin yirmi
    [2024, "2024'ten"], // ... yirmi dört (twenty-four)
    [2025, "2025'ten"], // ... yirmi beş (twenty-five)
    [2026, "2026'dan"], // ... yirmi altı (twenty-six)
    [2000, "2000'den"], // iki bin
    [1990, "1990'dan"], // ... doksan
    [1940, "1940'tan"], // ... kırk (forty)
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
    [2006, "2006'ya"], // ...altı, ends in a vowel -> y is inserted
    [1975, "1975'e"], //  ...beş, ends in a consonant
    [2020, "2020'ye"], // ...yirmi, ends in a vowel
    [2000, "2000'e"], //  ...bin
    [1990, "1990'a"], //  ...doksan
  ])('%i -> %s', (year, expected) => {
    expect(dativeYear(year)).toBe(expected);
  });
});
