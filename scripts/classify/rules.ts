import type { DocType } from '../../src/lib/constants/doc-types';
import type { TopicSlug } from '../../src/lib/constants/topics';
import { turkishUpper } from '../../src/lib/text/turkish-lower';

/**
 * Sınıflandırma — spec 7.1 adım 5 ve 3.5 tablosu.
 *
 * Tamamen kural tabanlı. LLM yalnızca özet üretiminde ve orada da kural
 * tutmazsa devreye giriyor (spec 3.8): sınıflandırmayı LLM'e vermek hem
 * pahalı hem de denetlenemez olurdu.
 */

interface DocTypeRule {
  type: DocType;
  /** Referans tipi eşleşmesi — en güçlü sinyal */
  refTypes?: string[];
  /** Bölüm eşleşmesi */
  sections?: string[];
  /** Başlıkta geçmesi gereken ifadelerden biri */
  keywords?: string[];
}

/** Sıra önemli: özelden genele, ilk eşleşen kazanır. */
const DOC_TYPE_RULES: DocTypeRule[] = [
  { type: 'duzeltme', keywords: ['DÜZELTME:'] },
  { type: 'rekabet_kurulu_karari', refTypes: ['rekabet'] },
  /*
   * Rekabet ve Eski Eserler kararları çoğunlukla bir A.E. numarasıyla
   * yayımlanıyor ve kurul numarası başlığın içinde kalıyor (parser.ts,
   * birincil/ikincil referans ayrımı). O yüzden referans tipine ek olarak
   * başlık kalıbına da bakıyoruz.
   */
  { type: 'rekabet_kurulu_karari', keywords: ['REKABET KURULU KARARI'] },
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
  { type: 'kamulastirma', keywords: ['ZORLA MAL İKTİSABI', 'KAMULAŞTIRMA', 'İSTİMLAK'] },
  { type: 'munhal_ilani', keywords: ['MÜNHAL İLANI', 'MÜNHAL İLAN', 'İLK ATAMA KADROSU'] },
  { type: 'sinav_sonucu', keywords: ['SINAV SONUÇLARI', 'SINAV SONUCU'] },
  { type: 'anayasa_mahkemesi_karari', sections: ['EK_II_B_I'] },
  { type: 'yasa', sections: ['EK_I_B_I'] },
  { type: 'yasa_gucunde_kararname', sections: ['EK_I_B_II'] },
  { type: 'meclis_karari', sections: ['EK_IV_B_II'] },
  { type: 'gorevden_alma', keywords: ['GÖREVDEN ALMA', 'GÖREVİNE SON VERİLMESİ'] },
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

    // Kuralın en az bir koşulu olmalı; koşulsuz kural her şeyi yakalardı.
    if (rule.refTypes || rule.sections || rule.keywords) return rule.type;
  }

  return 'diger';
}

/**
 * Konu ataması — spec 3.5. Bir kayıt birden fazla konuya ait olabilir.
 *
 * Hem doc_type hem anahtar kelime bakılıyor: doc_type belgenin türünü,
 * anahtar kelime konusunu söylüyor. "Ödenek aktarma" bir Bakanlar Kurulu
 * kararı ama konusu vergi-mali.
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
    ],
  },
  {
    topic: 'gayrimenkul',
    keywords: [
      'TAŞINMAZ MAL SATIN ALMA',
      'PLANLAMA ONAYI',
      'HALİ ARAZİ',
      'KIRSAL KESİM ARSASI',
      'YOL AYRILMASI',
      'GEÇİT HAKKI',
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
    ],
  },
  {
    topic: 'mevzuat',
    keywords: ['YASASI', 'TÜZÜĞÜ', 'EMİRNAMESİ', 'KARARNAME'],
  },
  {
    topic: 'atama',
    keywords: ['SÖZLEŞMELİ PERSONEL', 'ATANMASI', 'GÖREVLENDİRME', 'EMEKLİYE SEVK', 'GÖREVDEN ALMA'],
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
 * Kişisel veri işareti — spec 3.7 madde 2.
 * Bu kayıtlarda gövde metni render edilmiyor, orijinal PDF'e yönlendiriliyor.
 */
export function detectPersonalData(input: { title: string; docType: DocType }): boolean {
  if (input.docType === 'sinav_sonucu') return true;
  const upper = turkishUpper(input.title);
  return upper.includes('YASAKLI GÖÇMEN') || upper.includes('SINAV SONUÇLARI');
}
