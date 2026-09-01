import { describe, expect, it } from 'vitest';

import { validateSummary } from './guard';
import { buildUserPrompt, llmSummarize, type ChatClient } from './llm';

/** A fake client with a fixed reply — tests never hit the network or need a key. */
function fakeClient(reply: string): ChatClient {
  return async () => reply;
}

const COMPETITION_BOARD_TITLE =
  'REKABET KURULU KARARI-KARAR SAYISI:319/2025 KONU:ÇELEBİOĞLU ÖZEL GÜVENLİK LTD. ' +
  'TARAFINDAN SOSYAL SİGORTALAR DAİRESİ MERKEZ MÜDÜRLÜK BİNASINA GÜVENLİK HİZMETİ ' +
  'ALIMI İHALESİNE YAPILAN İTİRAZ.';

describe('validateSummary — spec 3.8 rule 1', () => {
  it('rejects a summary that states an outcome', () => {
    const result = validateSummary(COMPETITION_BOARD_TITLE, 'Rekabet Kurulu Çelebioğlu\'nun itirazını reddetti');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('sonuc-bildiriyor');
  });

  it('accepts a summary on the same subject that states no outcome', () => {
    const result = validateSummary(
      COMPETITION_BOARD_TITLE,
      'Çelebioğlu Özel Güvenlik\'in güvenlik hizmeti alımı ihalesine yaptığı itiraz hakkında Rekabet Kurulu kararı',
    );
    expect(result.ok).toBe(true);
  });

  it('also catches accepted / approved / annulled patterns', () => {
    for (const bad of [
      'Başvuru kabul edildi',
      'Atama onaylandı',
      'İhale kararı iptal edildi',
      'Başvuru sahibi haklı bulundu',
      'Teklif geçersiz sayıldı',
    ]) {
      expect(validateSummary('BİR BAŞLIK', bad).ok, bad).toBe(false);
    }
  });

  it('does not reject when the forbidden phrase is IN THE TITLE — that is a quotation', () => {
    // "iptal edilmesi" is in the title itself; carrying it into the summary is not invention.
    const title = 'Ü(K-I)65-2026 SAYI VE 22.1.2026 TARİHLİ KARARIN İPTAL EDİLMESİNE İLİŞKİN KARAR';
    const result = validateSummary(title, 'Önceki tarihli kararın iptal edilmesine ilişkin karar');
    expect(result.ok).toBe(true);
  });

  it('treats a number absent from the title as invented', () => {
    const result = validateSummary('KAMULAŞTIRMA EMRİ (ULUKIŞLA)', 'Ulukışla\'da 2019 yılına ait kamulaştırma kararı');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('uydurma-sayi');
    expect(result.evidence).toBe('2019');
  });

  it('allows a number that appears in the title', () => {
    const result = validateSummary(
      '2025 FİYAT İSTİKRAR FONU EMİRNAMESİ',
      '2025 fiyat istikrar fonu emirnamesi hakkında düzenleme',
    );
    expect(result.ok).toBe(true);
  });

  it('rejects two sentences', () => {
    const result = validateSummary('BİR BAŞLIK', 'Kamulaştırma kararı alındı. Karar bugün yürürlüğe girdi');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('cok-cumle');
  });

  it('rejects the model talking about itself', () => {
    expect(validateSummary('BİR BAŞLIK', 'Bu başlıktan özet çıkarılamadı').ok).toBe(false);
    expect(validateSummary('BİR BAŞLIK', 'Üzgünüm, yeterli bilgi yok').ok).toBe(false);
  });

  it('enforces the length bounds', () => {
    expect(validateSummary('BİR BAŞLIK', 'Kısa').reason).toBe('cok-kisa');
    expect(validateSummary('BİR BAŞLIK', 'a'.repeat(200)).reason).toBe('cok-uzun');
  });

  it('rejects a verbatim copy of the title', () => {
    const title = 'Binaların yangından korunmasına ilişkin usul ve esaslar tüzüğü';
    expect(validateSummary(title, title).reason).toBe('baslikla-ayni');
  });

  it('ACCEPTS the all-caps title recased — that is the improvement we pay for', () => {
    /*
     * Regression guard. The check compared case-folded forms, so it rejected the
     * one thing the model reliably adds on these records: readable Turkish casing,
     * with proper nouns kept capitalised. 26% of a real run was thrown away here.
     */
    const title = 'YABANCI UYRUKLU 16 KİŞİYE AİT TAŞINMAZ MAL İZNİNİN TADİL EDİLMESİ';
    const result = validateSummary(title, 'Yabancı uyruklu 16 kişiye ait taşınmaz mal izninin tadil edilmesi');
    expect(result.ok).toBe(true);
  });

  it('accepts a proper noun kept capitalised', () => {
    const title = 'KIBRIS TÜRK ELEKTRİK KURUMU YÖNETİM KURULUNA ATAMA YAPILMASI';
    expect(validateSummary(title, 'Kıbrıs Türk Elektrik Kurumu yönetim kuruluna atama yapılması').ok).toBe(true);
  });

  it('does not mistake an ordinal or an abbreviation for a sentence end', () => {
    /*
     * All of these were rejected as `cok-cumle` in a real run. Turkish writes
     * ordinals and abbreviations with a period; none of them ends a sentence.
     */
    for (const [title, summary] of [
      ['34. DEVLET FOTOĞRAF YARIŞMASI VE SERGİSİNİN DÜZENLENMESİ',
       "34. Devlet Fotoğraf Yarışması ve Sergisi'nin düzenlenmesi"],
      ['T.C. SAĞLIK BAKANLIĞI KONTROL HEYETİNİN MASRAFLARININ KARŞILANMASI',
       'T.C. Sağlık Bakanlığı kontrol heyetinin masraflarının karşılanması'],
      ['ŞİRKETLER YASASI-DENİZBANK LTD.',
       'Denizbank Ltd. hakkında şirketler yasası kapsamında belge'],
      ['KAMU HİZMETİ KOMİSYONU, DIŞİŞLERİ DAİRESİ II. DERECE SEKRETER YAZILI SINAV SONUÇLARI',
       'Dışişleri Dairesi II. Derece Sekreter yazılı sınav sonuçları'],
      // Caught in a live run after the first fix: capitalised abbreviations.
      ["12564/2022 SAYILI DAVASI İÇİN KKTC'YE GELEN PROF. DR. SÜLEYMAN GÜRPINAR'IN MASRAFLARI",
       "Prof. Dr. Süleyman Gürpınar'ın masraflarının karşılanması"],
      ["ALUDEN TİCARET ŞTİ.LTD.'E AİT PARSELİN ÖZEL SANAYİ BÖLGESİ İLAN EDİLMESİ",
       "Aluden Ticaret Şti. Ltd.'e ait parselin özel sanayi bölgesi ilan edilmesi"],
    ] as Array<[string, string]>) {
      expect(validateSummary(title, summary).reason, summary).not.toBe('cok-cumle');
    }
  });

  it('still rejects two genuine sentences', () => {
    const result = validateSummary('BİR BAŞLIK', 'Kamulaştırma kararı alındı. Karar bugün yürürlüğe girdi');
    expect(result.reason).toBe('cok-cumle');
  });

  it('strips quotes, a trailing period and extra whitespace', () => {
    const result = validateSummary('KAMULAŞTIRMA EMRİ (ULUKIŞLA)', '  "ulukışla\'da  kamulaştırma kararı."  ');
    expect(result.ok).toBe(true);
    expect(result.summary).toBe('Ulukışla\'da kamulaştırma kararı');
  });
});

describe('buildUserPrompt', () => {
  it('does NOT send the body text — only the title and meta fields', () => {
    const prompt = buildUserPrompt({
      title: 'A.E. 1064 1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ',
      section: 'EK_III',
      refType: 'ae',
      docType: 'kamulastirma',
    });
    expect(prompt).toContain('ZORLA MAL İKTİSABI');
    expect(prompt).toContain('Kamulaştırma');
    // The leading reference number is not sent to the model; the meta bar shows it separately.
    expect(prompt).not.toContain('A.E. 1064');
  });
});

describe('llmSummarize', () => {
  it('returns a valid reply with source llm', async () => {
    const result = await llmSummarize(
      { title: COMPETITION_BOARD_TITLE, section: 'EK_VI', refType: 'rekabet', docType: 'rekabet_kurulu_karari' },
      fakeClient('Çelebioğlu Özel Güvenlik\'in güvenlik hizmeti alımı ihalesine yaptığı itiraz hakkında karar'),
    );
    expect('declined' in result).toBe(false);
    expect((result as { source: string }).source).toBe('llm');
  });

  it('discards an outcome-stating reply and falls to tier 3, naming the reason', async () => {
    const result = await llmSummarize(
      { title: COMPETITION_BOARD_TITLE, section: 'EK_VI', refType: 'rekabet', docType: 'rekabet_kurulu_karari' },
      fakeClient('Rekabet Kurulu itirazı reddetti'),
    );
    expect(result).toEqual({ declined: 'sonuc-bildiriyor' });
  });

  it('turns the model declining into tier 3', async () => {
    const result = await llmSummarize(
      { title: 'BİLDİRİ', section: 'MAIN', refType: null, docType: 'diger' },
      fakeClient('YOK'),
    );
    expect(result).toEqual({ declined: 'model-declined' });
  });

  it('strips a leading "Özet:" prefix from the reply', async () => {
    const result = await llmSummarize(
      { title: 'KAMULAŞTIRMA EMRİ (ULUKIŞLA)', section: 'EK_III', refType: 'ae', docType: 'kamulastirma' },
      fakeClient('Özet: Ulukışla\'da kamulaştırma kararı'),
    );
    expect((result as { summary: string }).summary).toBe('Ulukışla\'da kamulaştırma kararı');
  });
});
