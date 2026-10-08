import { describe, expect, it } from 'vitest';

import { buildTitle, circularPattern, parseCircular, parseTurkishDate } from './circular';

describe('parseCircular', () => {
  it('reads every spelling the listing uses', () => {
    expect(parseCircular('MT.41/2026')?.label).toBe('MT.41/2026');
    expect(parseCircular('MİA 19/2022')).toMatchObject({ series: 'MİA', refType: 'mia', refNumber: '19/2022' });
    expect(parseCircular('MIA.7/2022')?.series).toBe('MİA');
    expect(parseCircular('O.5/2023')).toMatchObject({ series: 'Ö', refType: 'khko' });
    expect(parseCircular('MT.25A/2023')?.number).toBe('25A');
  });

  it('maps the series to the record reference types', () => {
    expect(parseCircular('MT.1/2024')?.refType).toBe('khkmt');
    expect(parseCircular('Y.3/2025')?.refType).toBe('genelgey');
    // Language-exam announcements are not vacancies.
    expect(parseCircular('YD.1/2025')?.refType).toBeNull();
  });

  it('rejects the 2021 unprefixed numbers and noise', () => {
    expect(parseCircular('74/2021')).toBeNull();
    expect(parseCircular('---')).toBeNull();
    expect(parseCircular('Düzeltme')).toBeNull();
  });
});

describe('circularPattern', () => {
  const mia = parseCircular('MİA.29/2026')!;

  it('finds the number in titles and bodies', () => {
    expect(circularPattern(mia).test('GENELGE MİA.29/2026 DIŞİŞLERİ')).toBe(true);
    expect(circularPattern(mia).test('GENELGE MİA 29 / 2026')).toBe(true);
  });

  it('does not match a longer number or another series', () => {
    expect(circularPattern(mia).test('MİA.129/2026')).toBe(false);
    expect(circularPattern(mia).test('MT.29/2026')).toBe(false);
    expect(circularPattern(mia).test('MİA.29/20261')).toBe(false);
  });
});

describe('parseTurkishDate', () => {
  it('reads the date forms on the listing', () => {
    expect(parseTurkishDate('6 Ocak 2027')).toBe('2027-01-06');
    expect(parseTurkishDate('03.Eki.23')).toBe('2023-10-03');
    expect(parseTurkishDate('13 Ağustos 21')).toBe('2021-08-13');
    expect(parseTurkishDate('06.01.2027')).toBe('2027-01-06');
    expect(parseTurkishDate('30Temmuz 2026')).toBe('2026-07-30');
    expect(parseTurkishDate('Duyuru')).toBeNull();
  });
});

describe('buildTitle', () => {
  it('matches the shape of the gazette-sourced circulars', () => {
    const title = buildTitle(parseCircular('MT.41/2026')!, 'Resmi Kabz Memurluğu ve Mukayyitlik Dairesi', 'Yükselme-Münhalleri-2026');
    expect(title).toBe(
      'KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI GENELGE MT.41/2026 RESMİ KABZ MEMURLUĞU VE MUKAYYİTLİK DAİRESİ YÜKSELME YERİ KADROLARI MÜNHAL İLANI VE SINAVLARI DUYURUSU',
    );
  });
});
