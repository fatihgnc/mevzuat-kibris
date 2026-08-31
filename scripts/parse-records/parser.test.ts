import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { classifyDocType, classifyTopics } from '../classify/rules';
import { titleCase } from '../shared/turkish-suffix';
import { summarize } from '../summarize/rules';

import { parseIndexCell } from './parser';

/**
 * Ayrıştırma testi — spec 7.3, ZORUNLU.
 *
 * fixtures/ altında gerçek RG sayıları ve elle hazırlanmış beklenen kayıt
 * listesi tutuluyor. Her parse değişikliğinde CI'da çalışıyor.
 * Ölçülen: kayıt sayısı doğruluğu, ref_number doğruluğu, doc_type doğruluğu.
 */

const FIXTURE_DIR = join(process.cwd(), 'fixtures');

interface Expected {
  note?: string;
  recordCount: number;
  records: Array<{
    section: string;
    refType: string | null;
    refNumber: string | null;
    docType: string;
  }>;
}

const cases = readdirSync(join(FIXTURE_DIR, 'expected'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.replace(/\.json$/, ''));

describe('parseIndexCell — fixture uyumu', () => {
  for (const id of cases) {
    it(id + ' beklenen kayıtları üretiyor', () => {
      const raw = readFileSync(join(FIXTURE_DIR, 'issues', id + '.txt'), 'utf8');
      const expected: Expected = JSON.parse(
        readFileSync(join(FIXTURE_DIR, 'expected', id + '.json'), 'utf8'),
      );

      const parsed = parseIndexCell(raw);

      expect(parsed).toHaveLength(expected.recordCount);

      parsed.forEach((record, index) => {
        const want = expected.records[index]!;
        expect({
          section: record.section,
          refType: record.refType,
          refNumber: record.refNumber,
        }).toEqual({
          section: want.section,
          refType: want.refType,
          refNumber: want.refNumber,
        });

        const docType = classifyDocType({
          title: record.title,
          section: record.section,
          refType: record.refType,
        });
        expect(docType, record.title).toBe(want.docType);
      });
    });
  }
});

describe('spec 7.3 bilinen zor vakalar', () => {
  it('aynı konu hem A.E. hem Ü(K-I) olarak iki AYRI kayıt üretir', () => {
    const raw = readFileSync(join(FIXTURE_DIR, 'issues', '2025-262.txt'), 'utf8');
    const parsed = parseIndexCell(raw);

    const fund = parsed.filter((record) => /FİYAT İSTİKRAR FONU/.test(record.title));
    expect(fund).toHaveLength(2);
    expect(fund.map((record) => record.refType).sort()).toEqual(['ae', 'uki']);
    expect(fund.map((record) => record.section).sort()).toEqual(['EK_III', 'EK_IV_B_I']);
  });

  it('tek satırdaki üç şirket üç ayrı kayıt olur', () => {
    const raw = readFileSync(join(FIXTURE_DIR, 'issues', '2025-261.txt'), 'utf8');
    const parsed = parseIndexCell(raw);

    const companies = parsed.filter((record) => record.refType === 'sm');
    expect(companies).toHaveLength(3);
    expect(companies.map((record) => record.refNumber)).toEqual(['4401', '4402', '4403']);
    expect(companies[1]!.title).toContain('NICOSIA LANGUAGE CENTRE LIMITED');
  });

  it('DÜZELTME kaydı işaretlenir ve kaynak referansını taşır', () => {
    const raw = readFileSync(join(FIXTURE_DIR, 'issues', '2025-261.txt'), 'utf8');
    const parsed = parseIndexCell(raw);

    const correction = parsed.find((record) => record.isCorrection);
    expect(correction).toBeDefined();
    expect(correction!.refNumber).toBe('1052');
  });

  it('yazım hatalı kaynak metin normalize edilmez, olduğu gibi korunur', () => {
    const raw = readFileSync(join(FIXTURE_DIR, 'issues', '2025-261.txt'), 'utf8');
    const parsed = parseIndexCell(raw);

    const typo = parsed.find((record) => record.refNumber === '1062');
    expect(typo!.title).toContain('METEROLOJİ');
    expect(typo!.title).toContain('PORJESİ');
  });

  it('KONU: sonrası subject alanına ayrılır', () => {
    const parsed = parseIndexCell(
      'EK III\nA.E. 1070 REKABET KURULU KARARI-KARAR SAYISI:318/2025 KONU:İHALEYE YAPILAN İTİRAZ.',
    );
    expect(parsed[0]!.subject).toBe('İHALEYE YAPILAN İTİRAZ.');
  });
});

describe('konu ataması', () => {
  it('kamulaştırma kaydı gayrimenkul konusuna girer', () => {
    const topics = classifyTopics({
      title: '1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ',
      docType: 'kamulastirma',
    });
    expect(topics).toContain('gayrimenkul');
  });

  it('bir kayıt birden fazla konuya ait olabilir', () => {
    const topics = classifyTopics({
      title: '2025 KATMA DEĞER VERGİSİ YASASI (DEĞİŞİKLİK) YASASI',
      docType: 'yasa',
    });
    expect(topics).toContain('mevzuat');
    expect(topics).toContain('vergi-mali');
  });
});

describe('özet üretimi — spec 3.8', () => {
  it('kamulaştırmayı günlük dille yazar, resmî terimi kullanmaz', () => {
    const result = summarize({
      title: '1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ',
      section: 'EK_III',
      refType: 'ae',
    });
    expect(result?.summary).toBe("Gazimağusa Vadili'de kamulaştırma kararı");
    expect(result?.summary).not.toMatch(/zorla mal iktisabı/i);
  });

  it('Rekabet Kurulu kararında SONUÇ bildirmez', () => {
    const result = summarize({
      title:
        'REKABET KURULU KARARI-KARAR SAYISI:318/2025 KONU:ÇELEBİOĞLU ÖZEL GÜVENLİK LTD. TARAFINDAN SOSYAL SİGORTALAR DAİRESİ LEFKOŞA BÖLGE AMİRLİĞİ BİNASINA GÜVENLİK HİZMETİ ALIMI İHALESİNE YAPILAN İTİRAZ.',
      section: 'EK_III',
      refType: 'ae',
    });
    expect(result?.summary).toMatch(/itiraz/i);
    expect(result?.summary).not.toMatch(/redd|kabul|onayla/i);
  });

  it('şirket isim değişikliğinde Türkçe eki doğru getirir', () => {
    const result = summarize({
      title:
        'TESCİLLİ BİR YEREL LİMİTED ŞİRKETİN İSİM DEĞİŞTİRME MÜRACAATI/TORONTO RENT A CAR LTD İN ASLIHAN RENT A CAR LTD OLARAK İSMİNİN DEĞİŞMESİ',
      section: 'EK_V_B_I',
      refType: 'sm',
    });
    expect(result?.summary).toContain("Ltd'in");
    expect(result?.summary).toContain('Toronto Rent A Car Ltd');
    /*
     * Kabul edilen sınır: "ASLIHAN" içinde Türkçeye özgü harf yok, o yüzden
     * ifade yabancı sayılıyor ve I -> i oluyor ("Aslihan"). Tasarımın elle
     * yazılmış örneğinde "Aslıhan" geçiyor ama bunu algoritmayla ayırt etmenin
     * yolu yok: "ASLIHAN" ile "NICOSIA" büyük harfle birbirinden ayrılamıyor.
     *
     * Alternatif (ifadeyi kapsayan başlığın Türkçeliğine bakmak) daha kötü:
     * kalıp metin hep Türkçe olduğu için "NICOSIA" da Türkçe sayılır ve
     * "Nıcosıa" çıkar. Yanlış yazılmış bir ad, bozuk görünen bir addan iyidir.
     */
    expect(result?.summary).toMatch(/Asl[ıi]han Rent A Car Ltd/);
  });

  it('kalıp tutmazsa null döner, uydurmaz', () => {
    const result = summarize({
      title: 'TAMAMEN TANINMAYAN BİR BAŞLIK BİÇİMİ 12345',
      section: 'MAIN',
      refType: null,
    });
    expect(result).toBeNull();
  });
});

describe('özet üretimi — kaynak metin tuzakları', () => {
  it('baştaki referans numarası özete sızmaz', () => {
    const result = summarize({
      title: 'A.E. 1064 1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ',
      section: 'EK_III',
      refType: 'ae',
    });
    expect(result?.summary).toBe("Gazimağusa Vadili'de kamulaştırma kararı");
    expect(result?.summary).not.toMatch(/A\.?e\.?\s?1064/i);
  });

  it('Ü(K-I) öneki de atılır', () => {
    const result = summarize({
      title: 'Ü(K-I) 2496-2025 ÖDENEK AKTARMA/BAŞBAKANLIK 2025 MALİ YILI BÜTÇESİ',
      section: 'EK_IV_B_I',
      refType: 'uki',
    });
    expect(result?.summary).toBe('Başbakanlık 2025 mali yılı bütçesinde ödenek aktarma');
  });

  it('yabancı şirket adında I harfi ı olmaz', () => {
    const result = summarize({
      title: 'TESCİLLİ BİR YEREL LİMİTED ŞİRKETİN TASFİYE İŞLEMLERİNE BAŞLANMASI/NICOSIA LANGUAGE CENTRE LIMITED',
      section: 'EK_V_B_I',
      refType: 'sm',
    });
    expect(result?.summary).toContain('Nicosia Language Centre Limited');
    expect(result?.summary).not.toContain('Nıcosıa');
  });

  it('Türkçe ifadede I harfi ı olur', () => {
    const result = summarize({
      title: 'TESCİLLİ BİR YEREL LİMİTED ŞİRKETİN TASFİYE İŞLEMLERİNE BAŞLANMASI/HASPOLAT GIDA SANAYİ LTD',
      section: 'EK_V_B_I',
      refType: 'sm',
    });
    expect(result?.summary).toContain('Gıda');
    expect(result?.summary).not.toContain('Gida');
  });

  it('kurum adındaki KIBRIS doğru yazılır', () => {
    expect(titleCase('KIBRIS TÜRK ELEKTRİK KURUMU')).toBe('Kıbrıs Türk Elektrik Kurumu');
  });
});
