import { describe, expect, it } from 'vitest';

import { KIND_META, lawRef } from './labels';

describe('lawRef', () => {
  it('names numbered, chapter and English laws', () => {
    expect(lawRef('23/2016')).toBe('23/2016');
    expect(lawRef('F154')).toBe('Fasıl 154');
    expect(lawRef('F175A')).toBe('Fasıl 175A');
    expect(lawRef('C12')).toBe('Cap. 12');
  });

  it('has no reference for a tüzük, whose key is only an identity', () => {
    expect(lawRef('T:1974-avukatlar-staj-tuzugu')).toBeNull();
    expect(lawRef(null)).toBeNull();
  });
});

describe('KIND_META', () => {
  it('spells the compound genitive the way "KKTC yasasının metni" needs it', () => {
    expect(KIND_META.yasa.compoundGenitive).toBe('yasasının');
    expect(KIND_META.tuzuk.compoundGenitive).toBe('tüzüğünün');
  });
});
