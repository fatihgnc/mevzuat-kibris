import { describe, expect, it } from 'vitest';

import { classifyDocType, classifyTopics, detectPersonalData } from './rules';

/**
 * Doc-type classification — spec 3.4 and 7.1 step 5.
 *
 * Every title here is verbatim from the archive. The cases are the ones that
 * were measured wrong, plus the ones a fix for those nearly broke.
 */

const ae = (section: string, title: string) =>
  classifyDocType({ title, section, refType: 'ae' });

describe('classifyDocType — an EK III title opens with its enabling law', () => {
  /*
   * The rule this file exists for. EK III records are named
   * "<ENABLING LAW> - <actual document>", and a keyword rule that read the law
   * name claimed 1,149 records that were not laws — 1,142 in EK III and 7 in
   * MAIN, against 436 real ones in EK I BÖLÜM I.
   */
  it('yasa adıyla başlayan EK III kaydını yasa saymaz', () => {
    expect(ae('EK_III', 'İSTATİSTİK KURUMU YASASI-2024 ARALIK AYI SONUÇLARI')).toBe('diger');
  });

  it('gerçek yasa EK I BÖLÜM I\'de ve yasa kalır', () => {
    expect(
      classifyDocType({
        title: 'KUZEY KIBRIS TÜRK CUMHURİYETİ PASAPORT(DEĞİŞİKLİK)YASASI',
        section: 'EK_I_B_I',
        refType: null,
      }),
    ).toBe('yasa');
  });
});

describe('classifyDocType — Yüksek Seçim Kurulu', () => {
  it('kurul kararını tanır', () => {
    expect(ae('EK_III', 'SEÇİM VE HALKOYLAMASI YASASI-YÜKSEK SEÇİM KURULU KARAR NO:122/2025')).toBe(
      'secim_kurulu_karari',
    );
  });

  it('duyuru ve ilçe kurulu biçimlerini de tanır', () => {
    expect(
      ae('EK_III', "SEÇİM VE HALKOYLAMASI YASASI-YÜKSEK SEÇİM KURULUNUN 2 NO'LU DUYURUSU"),
    ).toBe('secim_kurulu_karari');
    expect(ae('EK_III', 'SEÇİM VE HALKOYLAMASI YASASI-GAZİMAĞUSA İLÇE SEÇİM KURULUNDAN İLAN')).toBe(
      'secim_kurulu_karari',
    );
  });

  /*
   * THE ONE THAT MATTERS MOST HERE. This record is an exam result that happens to
   * name the election board's secretariat as the posting. When the rule sat with
   * the other board rules it took this record — and sinav_sonucu is what marks a
   * record as carrying personal data, so the names would have started rendering.
   */
  it('seçim kurulunu ANAN sınav sonucunu çalmaz, ve kişisel veri damgası durur', () => {
    const title =
      'KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI,SÖZLÜ SINAV SONUÇLARI,YÜKSEK SEÇİM KURULU GENEL SEKRETERLİĞİ VE DAİMİ SEÇMEN KÜTÜKLERİ BÜROSU,MUKAYYİTLİK SINIFI, I. DERECE MÜDÜR MUAVİNİ MEVKİSİNE TERFİ ETTİRİLEN KİŞİLER';
    const docType = classifyDocType({ title, section: 'MAIN', refType: null });
    expect(docType).toBe('sinav_sonucu');
    expect(detectPersonalData({ title, docType })).toBe(true);
  });
});

describe('classifyDocType — şirket sicili EK III altında', () => {
  it('sicilden silme ön duyurusunu şirket işlemi sayar', () => {
    expect(
      ae(
        'EK_III',
        'SERBEST LİMAN VE BÖLGE YASASI-KİMETSAN KİMYA MADEN VE METALURJİ ENDÜSTRİLERİ İÇ-DIŞ TİCARET MÜŞAVİRLİK MÜHENDİSLİK LTD.ŞİRKETİN SİLİNECEĞİNE İLİŞKİN ÖN DUYURU',
      ),
    ).toBe('sirket_duyurusu');
  });

  /* Same enabling law, but the document is a tüzük. The more specific rule wins. */
  it('şirketler yasası altındaki TÜZÜĞÜ tüzük kalır', () => {
    expect(ae('EK_III', 'ŞİRKETLER YASASI-ŞİRKETLER RESİM VE HARÇLAR(DEĞİŞİKLİK) TÜZÜĞÜ')).toBe(
      'tuzuk',
    );
  });

  /* "KOOPERATİF ŞİRKETLER YASASI" contains "ŞİRKETLER YASASI"; the emirname wins. */
  it('kooperatif emirnamesini şirket işlemine çevirmez', () => {
    expect(
      ae(
        'EK_III',
        'KOOPERATİF ŞİRKETLER YASASI-KARMA HAYVAN YEMİ HARUP ÜRÜNÜ VE LP GAZ ÜRETİM VE PAZARLAMA KOOPERATİFİ(BİNBOĞA YEM)LTD. NİZAMNAMEDE DEĞİŞİKLİK YAPMA EMİRNAMESİ',
      ),
    ).toBe('emirname');
  });

  it('EK IV BÖLÜM I\'deki şirket konulu kaydı Bakanlar Kurulu kararı bırakır', () => {
    expect(
      ae('EK_IV_B_I', 'ŞİRKETLER YASASI-KAPI İNŞAAT LİMİTED, VIRTUALMETA CONSULTANTS CYPRUS LİMİTED'),
    ).toBe('bakanlar_kurulu_karari');
  });
});

describe('classifyDocType — sınav neticelerinin ekli biçimi', () => {
  /* "SINAVI NETİCELERİ" does not contain "SINAV NETİCELERİ"; 15 records fell past. */
  it('SINAVI NETİCELERİ biçimini yakalar', () => {
    expect(ae('EK_III', 'AVUKATLAR YASASI- BARO SINAVI NETİCELERİ İLANI')).toBe('sinav_sonucu');
  });
});

describe('classifyTopics — münhal holds vacancies only', () => {
  /*
   * Exam results and appointment notices used to share 'munhal' with the
   * vacancies and outnumbered them eight to one. Titles are verbatim.
   */
  it('sınav sonucunu kendi konusuna koyar, münhale değil', () => {
    const topics = classifyTopics({
      title:
        'KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI SÖZLÜ SINAV SONUÇLARI,GENEL ORTA ÖĞRETİM DAİRESİ,BİLİŞİM TEKNOLOJİLERİ ÖĞRETMENİ MEVKİSİNE ATAMA',
      docType: 'sinav_sonucu',
    });
    expect(topics).toContain('sinav-sonuclari');
    expect(topics).not.toContain('munhal');
    expect(topics).not.toContain('atama');
  });

  it('harfi düşmüş "SINAV SONUÇLAR:" başlığını da tanır', () => {
    expect(
      classifyTopics({
        title:
          "KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI, SÖZLÜ SINAV SONUÇLAR: SELDA DEMR MULLAOĞLU'NUN GENEL ORTAÖĞRETİM DAİRESİ,ÖĞRETİM KADROSUNA",
        docType: 'diger',
      }),
    ).toContain('sinav-sonuclari');
  });

  it('KHK genelgesi olarak gelen ilanı münhalde tutar', () => {
    expect(
      classifyTopics({
        title:
          'KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI,GENELGE MİA.19/2026 ÇEVRE KORUMA DAİRESİ İLK ATAMA KADROSU MÜNHAL İLANI VE SINAVI DUYURUSU',
        docType: 'genelge',
      }),
    ).toEqual(['munhal']);
  });

  it('"ÖĞRETİM KADROSU … ATAMALAR" münhal değil atamadır', () => {
    expect(
      classifyTopics({
        title:
          'KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI,GENEL ORTA ÖĞRETİM DAİRESİ,ÖĞRETİM KADROSU TÜRKÇE ÖĞRETMENİ MEVKİSİNE ATAMALAR',
        docType: 'diger',
      }),
    ).toEqual(['atama']);
  });

  it('terfi münhalini atama saymaz', () => {
    expect(
      classifyTopics({
        title:
          'KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI, KAMU YÖNETİMİ VE İNSAN KAYNAKLARI BAŞKANLIĞI TERFİ KADROSU MÜNHAL İLANI',
        docType: 'munhal_ilani',
      }),
    ).toEqual(['munhal']);
  });

  it('terfi ettirilen kişiler atamadır', () => {
    expect(
      classifyTopics({
        title:
          'KAMU HİZMETİ KOMİSYONUNCA GÜMRÜK VE RÜSUMAT DAİRESİ I.DERECE MUHAFIZ MEVKİİNE TERFİ ETTİRİLEN KİŞİLER',
        docType: 'diger',
      }),
    ).toContain('atama');
  });
});
