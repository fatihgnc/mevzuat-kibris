import type { DocType } from '../../src/lib/constants/doc-types';
import type { TopicSlug } from '../../src/lib/constants/topics';
import { turkishUpper } from '../../src/lib/text/turkish-lower';

/**
 * Classification — spec 7.1 step 5 and the table in 3.5.
 *
 * Entirely rule based. The LLM is used only for summary generation, and even
 * there only when no rule matches (spec 3.8): handing classification to an LLM
 * would be both expensive and unauditable.
 */

interface DocTypeRule {
  type: DocType;
  /** Reference type match — the strongest signal */
  refTypes?: string[];
  /** Section match */
  sections?: string[];
  /** One of the phrases that must occur in the title */
  keywords?: string[];
}

/** Order matters: specific to general, first match wins. */
const DOC_TYPE_RULES: DocTypeRule[] = [
  { type: 'duzeltme', keywords: ['DÜZELTME:'] },
  { type: 'rekabet_kurulu_karari', refTypes: ['rekabet'] },
  /*
   * Competition Board and Antiquities decisions are mostly published under an
   * A.E. number, with the board's own number left inside the title (parser.ts,
   * the primary/secondary reference distinction). So in addition to the
   * reference type we also look at the title pattern.
   */
  // The source uses two forms: "REKABET KURULU KARARI" and "... KARAR FORMU".
  { type: 'rekabet_kurulu_karari', keywords: ['REKABET KURULU KARAR'] },
  { type: 'eski_eserler_karari', refTypes: ['eskieser'] },
  { type: 'eski_eserler_karari', keywords: ['ESKİ ESERLER YÜKSEK KURULU'] },
  { type: 'yasa_tasarisi', refTypes: ['yt'] },
  { type: 'yasa_onerisi', refTypes: ['yo'] },
  { type: 'genelge', refTypes: ['mia'] },
  { type: 'marka_ilani', refTypes: ['mt'], sections: ['EK_V_B_II'] },
  { type: 'marka_ilani', keywords: ['MARKA TESCİL MÜRACAATI'] },
  { type: 'sirket_duyurusu', refTypes: ['sm'] },
  {
    type: 'sirket_duyurusu',
    keywords: [
      'TESCİLLİ BİR YEREL LİMİTED',
      'İSİM DEĞİŞTİRME MÜRACAATI',
      'TASFİYE İŞLEMLERİNE BAŞLANMASI',
      'SİCİLDEN KAYIT SİLİNMESİ',
      'DENİZAŞIRI YABANCI ŞİRKET TESCİLİ',
    ],
  },
  /*
   * EK V BÖLÜM I is by definition company registry business (see
   * SECTION_DESCRIPTION), and EK V BÖLÜM II is trade marks. The keyword list
   * does not cover all of the source's patterns: in the 2012 archive records
   * begin directly with the company name ("ALPAR TEKSTİL ... LİMİTED ŞİRKETİ,
   * ..."), and in 2006 the EK V BÖLÜM II records have no M.T. number. Both fell
   * to 'diger'. The section already says what the document is; when the keyword
   * pattern does not match, we trust it.
   */
  { type: 'sirket_duyurusu', sections: ['EK_V_B_I'] },
  { type: 'marka_ilani', sections: ['EK_V_B_II'] },
  { type: 'kamulastirma', keywords: ['ZORLA MAL İKTİSABI', 'KAMULAŞTIRMA', 'İSTİMLAK'] },
  { type: 'munhal_ilani', keywords: ['MÜNHAL İLANI', 'MÜNHAL İLAN', 'İLK ATAMA KADROSU'] },
  /*
   * "NETİCELERİ" is dated usage but the source still uses it: without this word,
   * 2018's "AVUKATLAR YASASI - BARO SINAV NETİCELERİ" record fell through to the
   * final 'YASASI' rule and was taken for a law. Because EK III records are named
   * "<ENABLING LAW> - <actual document>", the leading law name makes it very easy
   * to miss the classification.
   */
  { type: 'sinav_sonucu', keywords: ['SINAV SONUÇLARI', 'SINAV SONUCU', 'SINAV NETİCELERİ'] },
  { type: 'anayasa_mahkemesi_karari', sections: ['EK_II_B_I'] },
  { type: 'yasa', sections: ['EK_I_B_I'] },
  { type: 'yasa_gucunde_kararname', sections: ['EK_I_B_II'] },
  { type: 'meclis_karari', sections: ['EK_IV_B_II'] },
  // The source writes "GÖREVDEN ALINMA KARARNAMESİ"; the "ALMA" form never occurs.
  {
    type: 'gorevden_alma',
    keywords: ['GÖREVDEN ALINMA', 'GÖREVDEN ALMA', 'GÖREVİNE SON VERİLMESİ'],
  },
  {
    type: 'atama_kararnamesi',
    keywords: ['SÖZLEŞMELİ PERSONEL', 'ATAMA', 'GÖREVLENDİRME', 'EMEKLİYE SEVK'],
  },
  { type: 'merkez_bankasi_duyurusu', keywords: ['MERKEZ BANKASI'] },
  { type: 'mahkeme_duyurusu', keywords: ['MAHKEME', 'DAVA', 'TEBLİGAT'] },
  { type: 'tuzuk', keywords: ['TÜZÜĞÜ', 'TÜZÜK'] },
  { type: 'emirname', keywords: ['EMİRNAMESİ', 'EMİRNAME', 'TEBLİĞİ'] },
  { type: 'bakanlar_kurulu_karari', refTypes: ['uki', 'ukii'] },
  { type: 'bakanlar_kurulu_karari', sections: ['EK_IV_B_I'] },
  { type: 'yasa', keywords: ['YASASI'] },
];

export function classifyDocType(input: {
  title: string;
  section: string;
  refType: string | null;
}): DocType {
  const upper = turkishUpper(input.title);

  for (const rule of DOC_TYPE_RULES) {
    if (rule.refTypes && (!input.refType || !rule.refTypes.includes(input.refType))) continue;
    if (rule.sections && !rule.sections.includes(input.section)) continue;
    if (rule.keywords && !rule.keywords.some((keyword) => upper.includes(keyword))) continue;

    // A rule must have at least one condition; a condition-less rule would catch everything.
    if (rule.refTypes || rule.sections || rule.keywords) return rule.type;
  }

  return 'diger';
}

/**
 * Topic assignment — spec 3.5. A record may belong to more than one topic.
 *
 * Both doc_type and keywords are considered: doc_type says what kind of document
 * it is, the keywords say what it is about. An appropriation transfer is a
 * Council of Ministers decision, but its topic is tax and finance.
 */
const TOPIC_BY_DOC_TYPE: Partial<Record<DocType, TopicSlug[]>> = {
  munhal_ilani: ['munhal'],
  sinav_sonucu: ['munhal'],
  rekabet_kurulu_karari: ['ihale'],
  sirket_duyurusu: ['sirket'],
  marka_ilani: ['marka'],
  kamulastirma: ['gayrimenkul'],
  yasa: ['mevzuat'],
  yasa_gucunde_kararname: ['mevzuat'],
  tuzuk: ['mevzuat'],
  yasa_tasarisi: ['mevzuat'],
  yasa_onerisi: ['mevzuat'],
  emirname: ['mevzuat'],
  atama_kararnamesi: ['atama'],
  gorevden_alma: ['atama'],
};

const TOPIC_KEYWORDS: Array<{ topic: TopicSlug; keywords: string[] }> = [
  {
    topic: 'munhal',
    keywords: ['MÜNHAL', 'SINAV SONUÇLARI', 'İLK ATAMA KADROSU', 'KADROSU'],
  },
  {
    topic: 'ihale',
    keywords: ['İHALE', 'HİZMET ALIMI', 'YAPIM İŞİ', 'MAL ALIMI', 'EKSİLTME'],
  },
  {
    topic: 'sirket',
    keywords: [
      'İSİM DEĞİŞTİRME',
      'TASFİYE',
      'SİCİLDEN KAYIT SİLİNMESİ',
      'DENİZAŞIRI YABANCI ŞİRKET TESCİLİ',
      'LİMİTED',
      // A free-zone operating permit — company business, not real estate.
      'İŞLETME İZNİ',
    ],
  },
  {
    topic: 'gayrimenkul',
    /*
     * The word list was widened by measuring the real archive. The old list was
     * far too narrow: it looked for "TAŞINMAZ MAL SATIN ALMA" while the source
     * mostly says a bare "TAŞINMAZ", and for "YOL AYRILMASI" while it writes
     * "KAMU YOLU İLAN EDİLMESİ". That left more than 240 real-estate records in
     * 2025 with no topic at all.
     */
    keywords: [
      'TAŞINMAZ',
      'ARAZİ',
      'PARSEL',
      'KOÇAN',
      'PLANLAMA ONAYI',
      'KIRSAL KESİM ARSASI',
      'KAMU YOLU',
      'YOL AYRILMASI',
      'YOL GENİŞLET',
      'GEÇİT HAKKI',
      'MENDİREK',
      'ZORLA MAL İKTİSABI',
      'İMAR',
      'KAMULAŞTIRMA',
    ],
  },
  { topic: 'marka', keywords: ['MARKA'] },
  {
    topic: 'vergi-mali',
    keywords: [
      'KATMA DEĞER VERGİSİ',
      'HARÇ',
      'FİYAT İSTİKRAR FONU',
      'AZAMİ SATIŞ FİYATLARI',
      'PRİM',
      'FAİZ ORANLARI',
      'ÖDENEK AKTARMA',
      'BÜTÇE',
      'ZORUNLU KARŞILIK',
      'GÜMRÜK',
      /*
       * Most Council of Ministers decisions are public spending: covering costs
       * and expenses, contributions, exemptions, state guarantees. All are
       * financial decisions, and none of them fitted the old list.
       *
       * "GİDERLER" is plural deliberately: a bare "GİDER" prefix would also catch
       * unrelated words such as "GİDERİLMESİ".
       */
      'MASRAF',
      'GİDERLER',
      'KATKI',
      'MUAFİYET',
      'KEFALET',
      'FİNANSMAN',
    ],
  },
  {
    topic: 'mevzuat',
    keywords: ['YASASI', 'TÜZÜĞÜ', 'EMİRNAMESİ', 'KARARNAME'],
  },
  {
    topic: 'atama',
    /*
     * The 'GÖREVLENDİR' prefix is deliberate: the source writes
     * 'GÖREVLENDİRİLECEK' / 'GÖREVLENDİRİLMESİ' as often as 'GÖREVLENDİRME', and
     * a whole-word search was missing those.
     */
    keywords: [
      'SÖZLEŞMELİ PERSONEL',
      'ATANMASI',
      'GÖREVLENDİR',
      'EMEKLİYE SEVK',
      'GÖREVDEN ALMA',
      'GÖREVDEN ALINMA',
    ],
  },
  {
    topic: 'yurttaslik',
    /*
     * The 'YURTTAŞL' prefix is ESSENTIAL. The source has three spellings and two
     * of them are wrong:
     *   YURTTAŞLIĞINA ALINMASI   525
     *   YURTTAŞLAĞINA ALINMASI    29   (a typo in the source)
     *   YURTTAŞLIĞNA ALINMASI      1
     * Searching for 'YURTTAŞLIĞINA' would have missed 30 records.
     */
    keywords: ['YURTTAŞL'],
  },
];

export function classifyTopics(input: { title: string; docType: DocType }): TopicSlug[] {
  const topics = new Set<TopicSlug>(TOPIC_BY_DOC_TYPE[input.docType] ?? []);
  const upper = turkishUpper(input.title);

  for (const { topic, keywords } of TOPIC_KEYWORDS) {
    if (keywords.some((keyword) => upper.includes(keyword))) topics.add(topic);
  }

  return [...topics];
}

/**
 * Personal-data flag — spec 3.7 rule 2.
 * The body text of these records is not rendered; the user is sent to the
 * original PDF instead.
 */
export function detectPersonalData(input: { title: string; docType: DocType }): boolean {
  if (input.docType === 'sinav_sonucu') return true;
  const upper = turkishUpper(input.title);
  return upper.includes('YASAKLI GÖÇMEN') || upper.includes('SINAV SONUÇLARI');
}
