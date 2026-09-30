import { describe, expect, it } from 'vitest';

import { titleCaseTr } from './title-case';

describe('titleCaseTr', () => {
  it('turns a shouted law title into the name people type', () => {
    expect(titleCaseTr('TAPU VE KADASTRO DAİRESİ (KURULUŞ, GÖREV VE ÇALIŞMA ESASLARI) YASASI')).toBe(
      'Tapu ve Kadastro Dairesi (Kuruluş, Görev ve Çalışma Esasları) Yasası',
    );
  });

  it('keeps the Turkish dotted and dotless i', () => {
    expect(titleCaseTr('IŞIK İLE İSTİKRAR FONU YASASI')).toBe('Işık ile İstikrar Fonu Yasası');
  });

  it('capitalises a small word when it opens the title', () => {
    expect(titleCaseTr('VE DİĞER HÜKÜMLER')).toBe('Ve Diğer Hükümler');
  });

  it('collapses runs of spaces', () => {
    expect(titleCaseTr('CEZA   YASASI')).toBe('Ceza Yasası');
  });
});
