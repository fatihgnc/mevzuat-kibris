import { describe, expect, it } from 'vitest';

import type { LegislationItem } from '@/types/legislation';

import { DIGITS_SLUG, groupByLetter, groupLetter, letterSlug } from './letters';

const item = (title: string): LegislationItem => ({
  slug: title,
  kind: 'yasa',
  lawKey: null,
  title,
  lawNumber: null,
  lawYear: null,
  bodyModifiedAt: null,
  bodySource: null,
});

describe('groupLetter', () => {
  it('files a title under its first letter, in Turkish case', () => {
    expect(groupLetter('Dernekler Yasası')).toBe('D');
    expect(groupLetter('çocuklar Yasası')).toBe('Ç');
    expect(groupLetter('ışık Yasası')).toBe('I');
    expect(groupLetter('İhale Yasası')).toBe('İ');
    expect(groupLetter('Şirketler Yasası')).toBe('Ş');
  });

  it('folds a circumflexed capital onto its plain letter', () => {
    expect(groupLetter('Âdi Suçlar Yasası')).toBe('A');
    expect(groupLetter('Îmar Yasası')).toBe('İ');
  });

  it('puts titles that start with a digit or a quote under #', () => {
    expect(groupLetter('2020 Mali Yılı Bütçe Yasası')).toBe('#');
    expect(groupLetter('"Özel Klinik Yasası')).toBe('#');
    expect(groupLetter('  1966 Gemilerin Yükleme')).toBe('#');
  });
});

describe('letterSlug', () => {
  it('keeps Turkish letters and tells I from İ', () => {
    expect(letterSlug('Ş')).toBe('ş');
    expect(letterSlug('İ')).toBe('i');
    expect(letterSlug('I')).toBe('ı');
    expect(letterSlug('#')).toBe(DIGITS_SLUG);
  });
});

describe('groupByLetter', () => {
  it('orders # first and then the Turkish alphabet', () => {
    const groups = groupByLetter([
      item('Şirketler Yasası'),
      item('Sağlık Yasası'),
      item('Çocuklar Yasası'),
      item('Cezaevi Yasası'),
      item('2020 Bütçe Yasası'),
      item('Ağaç Yasası'),
    ]);

    expect(groups.map((g) => g.letter)).toEqual(['#', 'A', 'C', 'Ç', 'S', 'Ş']);
  });

  it('keeps each letter\'s laws together, in the order given', () => {
    const groups = groupByLetter([item('Akıl Yasası'), item('Ambalaj Yasası'), item('Bütçe Yasası')]);

    expect(groups[0]!.items.map((i) => i.title)).toEqual(['Akıl Yasası', 'Ambalaj Yasası']);
    expect(groups[1]!.slug).toBe('b');
  });
});
