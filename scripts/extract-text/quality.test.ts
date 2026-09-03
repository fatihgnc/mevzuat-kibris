import { describe, expect, it } from 'vitest';

import { corruptionCount, corruptionRate, countWords, estimateQuality } from './index';

/**
 * The `estimateQuality` threshold drives spec 7.2's `needs_review` decision, so
 * a wrong answer either throws a sound issue into the retry queue or passes
 * broken text off as sound and shows it to the user. The measured boundaries
 * are pinned down here.
 */

/** An excerpt from the OCR output of the real 2025 issue 12. */
const CLEAN_OCR = `
Bakanlar Kurulu, Bolu Kartalkaya'da çıkan yangın sonucunda çok sayıda kişinin
hayatını kaybetmesi ve yaralanması nedeniyle, yirmi iki Ocak iki bin yirmi beş
tarihinden başlayarak güneşin batışına kadar ulusal yas ilan edilmesine ve bu
süre içerisinde bütün resmi dairelerde bayrakların yarıya indirilmesine karar
verdi. Kararın yürütülmesi Başbakanlık tarafından yerine getirilir.
`;

/**
 * OCR corruption — consonant pile-ups. This is the signal `estimateQuality`
 * actually looks for: Turkish does not put four consonants side by side, a
 * garbled read does.
 *
 * CAUTION — this measure does not catch every kind of corruption. In a real
 * case (2026 issue 17) the dotless "i" never comes out of the source PDF's
 * text layer ("yayimlamak" -> "yaymlamak", "halkin" -> "halkn"); that text is
 * obviously broken to the eye but scores 0.93 because it produces no consonant
 * pile-ups. So low quality is PROOF of corruption; high quality is NOT proof
 * of soundness.
 */
const GARBLED_TEXT = `
Bknlr Krlu Blu Krtlkyd çkn yngn snuunda çk syd kşnn hytn kybtms v yrlnms
ndnyl yrm k Ock k bn yrm bş trhndn bşlyrk gnşn btşn kdr ulsl ys ln dlmsn v
b sr çrsnd btn rsm drlrd byrklrn yry ndrlmsn krr vrd. Krrn yrtlms Bşbknlk
trfndn yrn gtrlr v Rsm Gztd yynlnr.
`;

describe('estimateQuality', () => {
  it('scores clean Turkish OCR output highly', () => {
    const quality = estimateQuality(CLEAN_OCR);
    expect(quality).not.toBeNull();
    // Measured range: real OCR output scores 0.887-0.999.
    expect(quality!).toBeGreaterThan(0.85);
  });

  it('scores consonant-piled OCR corruption BELOW the threshold', () => {
    const quality = estimateQuality(GARBLED_TEXT);
    expect(quality).not.toBeNull();
    expect(quality!).toBeLessThan(0.55);
  });

  it('returns null, NOT 0, when there are too few words to measure', () => {
    /*
     * This distinction closes a bug: a short but sound issue (a single-decision
     * body) scored 0, got stamped `needs_review` and sat in the retry queue
     * forever. "I could not measure" and "bad" are not the same thing.
     */
    expect(estimateQuality('Cumhurbaşkanına vekillik etmenin sona ermesi')).toBeNull();
    expect(estimateQuality('')).toBeNull();
  });

  it('does not count words containing q, w or x as Turkish', () => {
    const latin = Array.from({ length: 30 }, () => 'quux').join(' ');
    expect(estimateQuality(latin)).toBe(0);
  });
});

/**
 * The damage `estimateQuality` cannot see: a dropped dotted capital İ. Measured
 * on real bodies -- 184 of 1,012 issues carry it heavily while scoring
 * 0.985-0.997 on quality, which is why it needs its own detector.
 */
describe('corruptionRate', () => {
  /* Verbatim from 2021 issue 211's text layer, before the re-read. */
  const BOZUK =
    '2020-2021 TAHIL ÜRETiM YILINDA KURAKLIKTAN ZARAR GÖREN KÖY VENEYA BÖLGELERiN iLAN EDiLMESi';

  /* The same lines after --force-ocr. */
  const TEMIZ =
    '2020-2021 TAHİL ÜRETİM YILINDA KURAKLIKTAN ZARAR GÖREN KÖY VE/VEYA BÖLGELERİN İLAN EDİLMESİ';

  it('düşmüş noktalı büyük İ harfini yakalar', () => {
    expect(corruptionRate(BOZUK)).toBeGreaterThan(0);
  });

  it('düzeltilmiş metinde sıfır döner', () => {
    expect(corruptionRate(TEMIZ)).toBe(0);
  });

  it('sağlam metni bozuk saymaz', () => {
    expect(corruptionRate(CLEAN_OCR)).toBe(0);
  });

  /*
   * The score is per 10,000 characters, so length must not change the verdict.
   * Compared as a ratio, not an absolute difference: on a sample this short and
   * this dense the joining space alone moves the rate by ~2 points.
   */
  it('uzunluğa göre normalize eder', () => {
    const kisa = corruptionRate(BOZUK);
    const uzun = corruptionRate(BOZUK + ' ' + BOZUK);
    expect(uzun / kisa).toBeGreaterThan(0.98);
    expect(uzun / kisa).toBeLessThan(1.02);
  });

  it('boş metinde patlamaz', () => {
    expect(corruptionRate('')).toBe(0);
  });

  /* Ordinary mixed-case Turkish must not trip it. */
  it('normal büyük/küçük harf karışımını bozuk saymaz', () => {
    expect(corruptionRate('Bakanlar Kurulu, İskele Belediyesi tüzüğünü onayladı')).toBe(0);
  });
});

/**
 * The rate alone missed the archive's worst issues: a long issue dilutes its own
 * damage. 2025 issue 173 carries 102 damaged words and still scores 3.1 per 10k.
 * The count exists so length cannot hide the damage.
 */
describe('corruptionCount', () => {
  const BOZUK_KELIME = 'ÜRETiM';

  it('bozuk kelimeleri sayar', () => {
    expect(corruptionCount([BOZUK_KELIME, BOZUK_KELIME, BOZUK_KELIME].join(' '))).toBe(3);
  });

  it('temiz metinde sıfır', () => {
    expect(corruptionCount(CLEAN_OCR)).toBe(0);
  });

  /*
   * The point of having both measures. Padding with clean text drives the rate
   * towards zero while the count stays put -- which is exactly the case the rate
   * on its own let through.
   */
  it('uzun temiz metin oranı düşürür ama sayıyı düşürmez', () => {
    const uzun = BOZUK_KELIME + ' ' + 'temiz metin '.repeat(4000);
    expect(corruptionRate(uzun)).toBeLessThan(2);
    expect(corruptionCount(uzun)).toBe(1);
  });
});

/**
 * The guard that decides whether a re-read may replace the text. It exists
 * because --force-ocr can drop whole pages: on 2023 issue 113 the original has
 * 193 pages and the re-read 189, and words fell from 53,230 to 47,690.
 */
describe('countWords', () => {
  it('harf ve rakam gruplarını sayar', () => {
    expect(countWords('A.E. 275 sayılı emirname')).toBe(5);
  });

  it('Türkçe harfleri tek kelimede tutar', () => {
    expect(countWords('ÜRETİM YILINDA')).toBe(2);
  });

  /* Whitespace reflow is exactly what the character count could not tell apart. */
  it('boşluk yeniden akıtılınca değişmez', () => {
    expect(countWords('KÖY   VE/VEYA\n\n BÖLGELER')).toBe(countWords('KÖY VE/VEYA BÖLGELER'));
  });

  /* Table figures are the content that went missing; they must be counted. */
  it('rakamları sayar', () => {
    expect(countWords('13 90 ARPA BUĞDAY')).toBe(4);
  });

  it('boş metinde sıfır', () => {
    expect(countWords('')).toBe(0);
  });
});
