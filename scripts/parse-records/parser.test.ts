import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { formatRef } from '../../src/lib/constants/doc-types';
import { CRAWLER_USER_AGENT } from '../../src/lib/seo/config';
import { classifyDocType, classifyTopics } from '../classify/rules';
import { parseIssueNumber, parseTurkishDate } from '../crawl-archive';
import { titleCase } from '../shared/turkish-suffix';
import { summarize } from '../summarize/rules';

import { parseIndexCell, parseIndexTable } from './parser';

/**
 * Parsing test — spec 7.3, MANDATORY.
 *
 * fixtures/ holds real gazette issues together with a hand-written list of the
 * expected records. It runs in CI on every parsing change. What is measured:
 * record count accuracy, ref_number accuracy, doc_type accuracy.
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
     * An accepted limitation: "ASLIHAN" contains no distinctively Turkish
     * letter, so the phrase counts as foreign and I becomes i ("Aslihan"). The
     * design's hand-written example says "Aslıhan", but there is no algorithmic
     * way to tell them apart: in uppercase, "ASLIHAN" and "NICOSIA" are
     * indistinguishable.
     *
     * The alternative — judging Turkishness from the enclosing title — is worse:
     * since the boilerplate text is always Turkish, "NICOSIA" would count as
     * Turkish too and come out as "Nıcosıa". A misspelled name beats a name that
     * looks corrupted.
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

/**
 * REAL archive data — spec 7.3.
 *
 * The .txt fixtures above were written by hand and assumed the İÇERİK cell was a
 * flat text dump. When real pages were fetched from basimevi.gov.ct.tr the cell
 * turned out to be a columnar INNER TABLE, and the text path was splitting every
 * record in two (7,170 bogus records out of 3,977 lines for 2025).
 *
 * The .html files here are İÇERİK cells taken verbatim from the archive, and the
 * expected outputs were verified by hand, line by line, against the raw cell. All
 * four periods are represented, because the format varies from year to year.
 */
const REAL_DIR = join(FIXTURE_DIR, 'real');

const realCases = readdirSync(REAL_DIR)
  .filter((name) => name.endsWith('.expected.json'))
  .map((name) => name.replace(/\.expected\.json$/, ''));

function parseReal(id: string) {
  return parseIndexTable(readFileSync(join(REAL_DIR, id + '.html'), 'utf8'));
}

describe('parseIndexTable — gerçek arşiv fixture uyumu', () => {
  it('dört dönemin dördü de temsil ediliyor', () => {
    expect(realCases.sort()).toEqual(['2006-193', '2012-190', '2018-130', '2025-175']);
  });

  for (const id of realCases) {
    it(id + ' beklenen kayıtları üretiyor', () => {
      const expected: Expected = JSON.parse(
        readFileSync(join(REAL_DIR, id + '.expected.json'), 'utf8'),
      );

      const parsed = parseReal(id);
      expect(parsed).not.toBeNull();
      expect(parsed!).toHaveLength(expected.recordCount);

      parsed!.forEach((record, index) => {
        const want = expected.records[index]!;
        expect(
          {
            section: record.section,
            refType: record.refType,
            refNumber: record.refNumber,
          },
          record.title,
        ).toEqual({
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

describe('gerçek veride yakalanan hatalar', () => {
  /*
   * All of these surfaced when the real archive was crawled; the hand-written
   * fixtures could not show any of them. Each one is a regression guard.
   */

  it('bölüm başlığı blok boyunca aşağı taşınır', () => {
    // 2006-193: the section cell is filled on only 4 of 7 rows.
    const parsed = parseReal('2006-193')!;
    expect(parsed.map((record) => record.section)).toEqual([
      'MAIN',
      'MAIN',
      'EK_III',
      'EK_IV_B_I',
      'EK_IV_B_I',
      'EK_IV_B_I',
      'EK_VI',
    ]);
  });

  it('başlıktaki atıf kaydın kendi referansını gasbetmez', () => {
    // 2012-190: the title is "K(II) 2476-2012 SAYI VE ... KARARIN TADİLİ", the record is 2487-2012.
    const record = parseReal('2012-190')!.find((item) => item.title.startsWith('K(II) 2476'));
    expect(record?.refNumber).toBe('2487-2012');
  });

  it('sütun sayısı yıla göre değişse de başlık bulunur', () => {
    // 2018 has three columns, 2025 four; the title must come out filled in both.
    for (const id of ['2018-130', '2025-175']) {
      for (const record of parseReal(id)!) {
        expect(record.title.length, id + ' / ' + record.title).toBeGreaterThan(10);
      }
    }
  });

  it('yasa tasarısı numarası başlığın içinden okunur', () => {
    // EK VI records have no separate reference column.
    const bills = parseReal('2018-130')!.filter((record) => record.section === 'EK_VI');
    expect(bills).toHaveLength(4);
    expect(bills.map((record) => record.refNumber)).toEqual([
      '17/1/2018',
      '56/1/2018',
      '55/1/2018',
      '18/1/2018',
    ]);
  });

  it('tablo yoksa null döner ve çağıran metin yoluna düşebilir', () => {
    expect(parseIndexTable('<p>düz metin, tablo yok</p>')).toBeNull();
  });
});

describe('dönemsel Bakanlar Kurulu referansları', () => {
  /*
   * S- / S(K-II) / K(II)- / TE(K-I) / Ü(K-I) are period-specific spellings of the
   * same series (see the REF_TYPES note). All four were counted in EK IV BÖLÜM I
   * in the real archive. They stay as separate types so that the citation in the
   * meta bar remains faithful to the source.
   */
  const eras: Array<[string, string, string]> = [
    ['2006-193', 'skii', 'S(K-II) 314-2006'],
    ['2012-190', 'kii', 'K(II)-2487-2012'],
    ['2018-130', 'teki', 'TE(K-I) 1024-2018'],
    ['2025-175', 'uki', 'Ü(K-I) 1905-2025'],
  ];

  for (const [id, refType, label] of eras) {
    it(id + ' → ' + refType + ' ve künyede "' + label + '"', () => {
      const record = parseReal(id)!.find((item) => item.refType === refType);
      expect(record, id + ' için ' + refType + ' kaydı yok').toBeDefined();
      expect(record!.section).toBe('EK_IV_B_I');
      expect(formatRef(record!.refType, record!.refNumber)).toBe(label);
    });
  }

  /*
   * 2020-2022, the gap in that chain. The rows below are copied verbatim out of
   * the source's own İÇERİK cells; leaving these unmatched left 3,119 records of
   * 2020-2024 with no reference at all, and the slug — which embeds the reference
   * and never changes — would have been permanent.
   */
  const gap: Array<[string, string, string, string]> = [
    ['E.S(K-I) 27-2020', 'eski', '27-2020', 'E.S(K-I) 27-2020'],
    ['E.S(K-I)940-2021', 'eski', '940-2021', 'E.S(K-I) 940-2021'],
    ['E.T(K-I) 1259-2020', 'etki', '1259-2020', 'E.T(K-I) 1259-2020'],
    ['E.T(K-I)19-2020', 'etki', '19-2020', 'E.T(K-I) 19-2020'],
    ['F.S.(K-I) 240-2021', 'fski', '240-2021', 'F.S.(K-I) 240-2021'],
    ['F.S(K-I) 152-2022', 'fski', '152-2022', 'F.S.(K-I) 152-2022'],
    ['F.S(K-III) 11-2022', 'fskiii', '11-2022', 'F.S(K-III) 11-2022'],
  ];

  for (const [cell, refType, refNumber, label] of gap) {
    it(cell + ' → ' + refType, () => {
      const html =
        '<table><tr><td>EK IV BÖLÜM I</td><td>' +
        cell +
        "</td><td>ALİ ÖZCANLI'NIN SÖZLEŞMESİNİN YENİLENMESİ</td></tr></table>";
      const record = parseIndexTable(html)![0]!;

      expect(record.refType).toBe(refType);
      expect(record.refNumber).toBe(refNumber);
      expect(record.section).toBe('EK_IV_B_I');
      // The title must stay the title — the reference cell must not become it.
      expect(record.title).toBe("ALİ ÖZCANLI'NIN SÖZLEŞMESİNİN YENİLENMESİ");
      expect(formatRef(record.refType, record.refNumber)).toBe(label);
    });
  }

  /*
   * F.S(K-III) starts with "F.S(K-I", so pattern order decides this one. If `fski`
   * were tried first the third series would silently become the first.
   */
  it('F.S(K-III) kısa kalıba yakalanmıyor', () => {
    const html = '<table><tr><td>EK IV BÖLÜM I</td><td>F.S(K-III) 11-2022</td><td>ASGARİ ÜCRETİN YENİDEN SAPTANMASI</td></tr></table>';
    expect(parseIndexTable(html)![0]!.refType).toBe('fskiii');
  });
});

describe('parseTurkishDate — TARİH hücresi', () => {
  it('sayısal ve adlandırılmış ayları okur', () => {
    expect(parseTurkishDate('31.12.2025')).toBe('2025-12-31');
    expect(parseTurkishDate('31/12/2025')).toBe('2025-12-31');
    expect(parseTurkishDate('26 Ağustos 2025')).toBe('2025-08-26');
  });

  /*
   * This really does occur in the source: the date of 2026 issue 78 is
   * "22..04.2026". Requiring a single separator left the date unparsed, the
   * record was dropped, and a gazette issue vanished silently.
   */
  it('tekrarlanan ayraçlı yazım hatasını tolere eder', () => {
    expect(parseTurkishDate('22..04.2026')).toBe('2026-04-22');
    expect(parseTurkishDate('1//2/2026')).toBe('2026-02-01');
  });

  it('geçersiz tarihi reddeder', () => {
    expect(parseTurkishDate('31.02.2026')).toBeNull();
    expect(parseTurkishDate('tarih yok')).toBeNull();
  });
});

describe('kaynak siteye giden istek', () => {
  /*
   * This single line once locked up the whole ingest: HTTP header values are
   * ByteStrings and the 'ı' (305) in the brand name does not fit. fetch throws a
   * TypeError before the request is even constructed, so the pipeline cannot send
   * a single request. A cheap guard against an expensive failure.
   */
  it('User-Agent yalnızca ASCII içerir', () => {
    for (const char of CRAWLER_USER_AGENT) {
      expect(char.codePointAt(0), 'başlığa sığmayan karakter: ' + char).toBeLessThan(256);
    }
  });

  it('User-Agent kendini tanıtır ve iletişim adresi verir', () => {
    expect(CRAWLER_USER_AGENT).toContain('bot');
    expect(CRAWLER_USER_AGENT).toContain('@');
  });
});

describe('parseIssueNumber — SAYI hücresi', () => {
  it('yalın numarayı okur', () => {
    expect(parseIssueNumber('262')).toBe(262);
    expect(parseIssueNumber('\n  1 \n')).toBe(1);
  });

  /*
   * Two rows in the real 2018 archive look like this. The old code concatenated
   * all the digits and produced 1.95e+23, and that value PASSED the
   * Number.isInteger check — garbage would have been written to a bigint column
   * with the guard never firing.
   */
  it('birleşik sayıda ilk numarayı alır', () => {
    expect(parseIssueNumber('195/1\n 195/2\n 195/3\n 195/4\n')).toBe(195);
    expect(parseIssueNumber('146/1\n 146/2\n 146/3')).toBe(146);
  });

  it('numara olmayan ya da makul aralık dışı hücreyi reddeder', () => {
    expect(parseIssueNumber('SAYI')).toBeNull();
    expect(parseIssueNumber('')).toBeNull();
    expect(parseIssueNumber('0')).toBeNull();
    expect(parseIssueNumber('19511952195319542')).toBeNull();
  });
});
