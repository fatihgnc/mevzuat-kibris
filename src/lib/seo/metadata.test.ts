import { describe, expect, it } from 'vitest';

import { bodyForDescription } from './metadata';

describe('bodyForDescription', () => {
  it('drops the Sayı opener, heading marks, page numbers and table scaffolding', () => {
    const md = [
      'Sayı : 16',
      '',
      '## TAPU VE KADASTRO DAİRESİ',
      '## (HARÇ VE ÜCRETLER) YASASI',
      '',
      '25',
      '',
      '| --- | --- |',
      '|  Kısa İsim | 1. Bu Tüzük, Değişiklik Tüzüğü olarak isimlendirilir.  |',
    ].join('\n');

    expect(bodyForDescription(md)).toBe(
      'TAPU VE KADASTRO DAİRESİ (HARÇ VE ÜCRETLER) YASASI Kısa İsim 1. Bu Tüzük, Değişiklik Tüzüğü olarak isimlendirilir.',
    );
  });

  it('strips bold marks and returns an empty string for an empty body', () => {
    expect(bodyForDescription('**Karar Tarihi:** 9.1.2024')).toBe('Karar Tarihi: 9.1.2024');
    expect(bodyForDescription('')).toBe('');
  });
});
