import { describe, expect, it } from 'vitest';

import { maskTitle, tokensToText } from './mask-title';
import { overlayMatches, tokenClass } from './highlight';

/**
 * Maskeleme testleri — spec 3.8 ve artboard 1a.
 *
 * Bu maske tasarımın ayırt edici parçası: ham gazete başlığı atılmıyor,
 * ağırlıklandırılıyor. Sessizce bozulduğunda sayfa "çalışıyor" görünüyor ama
 * başlık okunmaz kalıyor — o yüzden hem seviyeler hem sınıflar test ediliyor.
 */

const levelsOf = (title: string) => maskTitle(title).map((token) => token.lvl);

describe('maskTitle', () => {
  it('metnin tamamını korur, hiçbir karakter kaybolmaz', () => {
    const title = 'A.E. 1064 1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ';
    expect(tokensToText(maskTitle(title))).toBe(title);
  });

  it('baştaki referansı kalıp seviyesinde bırakır', () => {
    const tokens = maskTitle('A.E. 1064 1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ');
    expect(tokens[0]!.t).toContain('A.E. 1064');
    expect(tokens[0]!.lvl).toBe(0);
  });

  it('kamulaştırmada yer adını ayırt edici işaretler', () => {
    const tokens = maskTitle('A.E. 1064 1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ');
    const distinctive = tokens.filter((token) => token.lvl === 1).map((token) => token.t);
    expect(distinctive.join(' ')).toContain('GAZİMAĞUSA/VADİLİ');
  });

  it('şirket adını ayırt edici, kalıbı sönük işaretler', () => {
    const tokens = maskTitle(
      'Ş.M. 4412 TESCİLLİ BİR YEREL LİMİTED ŞİRKETİN İSİM DEĞİŞTİRME MÜRACAATI/TORONTO RENT A CAR LTD İN ASLIHAN RENT A CAR LTD OLARAK İSMİNİN DEĞİŞMESİ',
    );
    const distinctive = tokens.filter((token) => token.lvl === 1).map((token) => token.t.trim());
    expect(distinctive).toContain('TORONTO RENT A CAR LTD');
    expect(distinctive).toContain('ASLIHAN RENT A CAR LTD');

    const dim = tokens.filter((token) => token.lvl === 0).map((token) => token.t).join(' ');
    expect(dim).toContain('TESCİLLİ BİR YEREL LİMİTED');
  });

  it('Rekabet Kurulu başlığında kalıp ile itiraz edeni ayırır', () => {
    const tokens = maskTitle(
      'A.E. 1070 REKABET KURULU KARARI-KARAR SAYISI:318/2025 KONU:ÇELEBİOĞLU ÖZEL GÜVENLİK LTD. TARAFINDAN SOSYAL SİGORTALAR DAİRESİ LEFKOŞA BÖLGE AMİRLİĞİ BİNASINA GÜVENLİK HİZMETİ ALIMI İHALESİNE YAPILAN İTİRAZ.',
    );

    const dim = tokens.filter((t) => t.lvl === 0).map((t) => t.t).join(' ');
    const distinctive = tokens.filter((t) => t.lvl === 1).map((t) => t.t).join(' ');

    expect(dim).toContain('REKABET KURULU KARARI');
    expect(distinctive).toContain('318/2025');
    expect(distinctive).toContain('ÇELEBİOĞLU ÖZEL GÜVENLİK LTD.');
  });

  it('maske her şeyi tek seviyeye düşürmez', () => {
    // Fallback bile en az bir ayırt edici ve bir kalıp jetonu üretmeli;
    // hepsi aynı seviyeyse maske görsel olarak hiçbir iş yapmıyor demektir.
    const levels = new Set(
      levelsOf('Ü(K-II) 618-2025 SÖZLEŞMELİ PERSONEL / ALİ ÖZCANLI'),
    );
    expect(levels.size).toBeGreaterThan(1);
  });

  it('boş başlıkta patlamaz', () => {
    expect(maskTitle('')).toEqual([]);
    expect(maskTitle('   ')).toEqual([]);
  });
});

describe('overlayMatches', () => {
  it('arama eşleşmesini seviye 3 yapar', () => {
    const tokens = overlayMatches(maskTitle('A.E. 1064 KAMULAŞTIRMA LEFKOŞA BÖLGESİ'), 'lefkosa');
    const marked = tokens.filter((token) => token.lvl === 3).map((token) => token.t);
    expect(marked).toEqual(['LEFKOŞA']);
  });

  it('sözcük ortasında eşleşmeyi vurgulamaz', () => {
    const tokens = overlayMatches(maskTitle('MUHALEFET ŞERHİ'), 'ihale');
    expect(tokens.some((token) => token.lvl === 3)).toBe(false);
  });
});

describe('tokenClass', () => {
  /*
   * Sınıf adları TAM METİN olmalı. Dinamik birleştirilirse ('tok-' + level)
   * Tailwind içerik taraması göremez, kuralları eler ve maske sayfada
   * görünmez olur. Bu test o regresyonu yakalar.
   */
  it('gerçek Tailwind utility sınıfları döndürür', () => {
    expect(tokenClass(0)).toContain('font-light');
    expect(tokenClass(1)).toContain('font-semibold');
    expect(tokenClass(3)).toContain('bg-mark');
    expect(tokenClass(0)).not.toMatch(/^tok-/);
  });

  it('alıntı varyantında yalnızca eşleşme vurgulanır', () => {
    expect(tokenClass(1, 'quote')).toBe(tokenClass(0, 'quote'));
    expect(tokenClass(3, 'quote')).toContain('bg-mark');
  });
});
