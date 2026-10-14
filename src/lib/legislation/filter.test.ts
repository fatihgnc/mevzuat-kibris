import { describe, expect, it } from 'vitest';

import { filterLegislation, searchText, type Searchable } from './filter';

const laws: Searchable[] = [
  { title: 'Belediyeler Yasası', ref: '51/1995' },
  { title: 'İş Yasası', ref: '22/1992' },
  { title: 'Kamu İhale Yasası', ref: '27/2016' },
  { title: 'Muhalefet Şerhi Yasası', ref: '15/2015' },
  { title: 'Sözleşmeler Yasası', ref: 'Fasıl 149' },
  { title: 'Vergi Usul Yasası', ref: '5/2015' },
  { title: 'Gelir ve Vergi Yasası', ref: '41/1992' },
];

const prepared = laws.map((item) => ({ item, text: searchText(item) }));
const titles = (query: string) => filterLegislation(prepared, query).map((law) => law.title);

describe('filterLegislation', () => {
  it('folds Turkish case and accents on both sides', () => {
    expect(titles('İŞ YASASI')).toEqual(['İş Yasası']);
    expect(titles('is yasasi')).toEqual(['İş Yasası']);
    expect(titles('sozles')).toEqual(['Sözleşmeler Yasası']);
  });

  it('needs every word, each at a word start', () => {
    expect(titles('kamu ihale')).toEqual(['Kamu İhale Yasası']);
    // "ihale" sits inside "muhalefet" but does not start a word there.
    expect(titles('ihale')).toEqual(['Kamu İhale Yasası']);
  });

  it('finds a law by its number', () => {
    expect(titles('5/2015')).toEqual(['Vergi Usul Yasası']);
    expect(titles('fasıl 149')).toEqual(['Sözleşmeler Yasası']);
  });

  it('puts titles that begin with the query first', () => {
    expect(titles('vergi')).toEqual(['Vergi Usul Yasası', 'Gelir ve Vergi Yasası']);
  });

  it('returns nothing for an empty query', () => {
    expect(titles('   ')).toEqual([]);
  });
});
