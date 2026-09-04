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
  /*
   * "SINAVI NETİCELERİ" is here because the source writes both forms and the
   * suffixed one was missed: "AVUKATLAR YASASI- BARO SINAVI NETİCELERİ İLANI"
   * does not contain "SINAV NETİCELERİ". 15 records fell past this rule to the
   * law catch-all that used to sit at the end.
   */
  {
    type: 'sinav_sonucu',
    keywords: ['SINAV SONUÇLARI', 'SINAV SONUCU', 'SINAV NETİCELERİ', 'SINAVI NETİCELERİ'],
  },
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
  /*
   * THE LAST TWO RULES SIT HERE ON PURPOSE, NOT WITH THE RULES THEY RESEMBLE.
   *
   * Both read the ENABLING LAW's name out of the title, which is the weakest
   * signal in this file — an EK III title is "<ENABLING LAW> - <actual
   * document>", so the law name says what a record was issued under, never what
   * it is. Placed among the board and company rules above, they stole from
   * classifications that were already right: measured over the archive, 12
   * tüzüks, 6 emirnames and 10 Council of Ministers decisions became company
   * notices, and two exam-result records became election decisions — that last
   * one silently, because sinav_sonucu is what marks a record as carrying
   * personal data (detectPersonalData), so the exam results would have started
   * rendering.
   *
   * Down here they can only claim what no other rule recognised, which is
   * exactly the set the old 'YASASI' catch-all was swallowing.
   */
  /*
   * Election board decisions and announcements — A.E. records in EK III, like the
   * Competition Board and Antiquities Board above. One keyword covers every form
   * the source uses: "YÜKSEK SEÇİM KURULUNUN", "…KURULUNDAN" and "GAZİMAĞUSA İLÇE
   * SEÇİM KURULU" all contain it. 376 records, clustered in election years (150
   * in 2022, 88 in 2025).
   */
  { type: 'secim_kurulu_karari', keywords: ['SEÇİM KURULU'] },
  /*
   * Company registry business published in EK III rather than EK V BÖLÜM I:
   * strike-offs, pre-notices of strike-off, registrations. 332 records; 14 sampled
   * at random were 14 of those.
   */
  { type: 'sirket_duyurusu', keywords: ['ŞİRKETLER YASASI', 'SERBEST LİMAN VE BÖLGE YASASI'] },
  /*
   * THERE IS NO 'YASASI' KEYWORD RULE, AND THAT IS THE POINT.
   *
   * A law is published in EK I BÖLÜM I, and the section rule above already says
   * so. The keyword rule that used to close this list said instead "any title
   * containing YASASI is a law", and because EK III records are named
   * "<ENABLING LAW> - <actual document>", it took 1,149 records that were not
   * laws: 1,142 in EK III and 7 in MAIN. Measured against the archive, 1,585
   * records carried doc_type 'yasa' and only 436 of them were in EK I BÖLÜM I.
   *
   * It also poisoned the topic, since TOPIC_BY_DOC_TYPE maps yasa to 'mevzuat'.
   *
   * The rules above were widened to catch what those records actually are —
   * election board (376), company registry (332), exam results (15). The
   * remaining 426 are genuinely mixed (statistics releases, public-health
   * notices, telecoms decisions, foreign-exchange announcements) and now fall to
   * 'diger'. 'diger' is a weaker answer than 'yasa' only if 'yasa' were true.
   *
   * If a new pattern shows up here, add a rule for THAT pattern. Do not bring
   * back a keyword that claims everything it does not recognise.
   */
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
