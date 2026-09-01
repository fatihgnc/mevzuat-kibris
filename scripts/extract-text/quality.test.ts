import { describe, expect, it } from 'vitest';

import { estimateQuality } from './index';

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
