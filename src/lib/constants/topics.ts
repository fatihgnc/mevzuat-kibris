/**
 * Topics — the taxonomy from spec 3.5, with the display names and descriptions from
 * the artboard.
 *
 * The coloured topic dots were REMOVED (the product owner's decision), so the
 * `color` field went with them — the design's oklch values are in git history.
 * Rationale: components/topic-badge.
 * The description texts were written by hand and exist so that topic pages are not
 * thin content (spec 8.2 and 14.5).
 */
export const TOPIC_SLUGS = [
  'munhal',
  'sinav-sonuclari',
  'ihale',
  'sirket',
  'gayrimenkul',
  'marka',
  'vergi-mali',
  'mevzuat',
  'atama',
  'yurttaslik',
] as const;

export type TopicSlug = (typeof TOPIC_SLUGS)[number];

export interface Topic {
  slug: TopicSlug;
  /** The name shown in lists and badges */
  name: string;
  /** The two-to-three sentence original description on the topic page */
  description: string;
  /** The one-line definition in the home page topic grid */
  blurb: string;
  sortOrder: number;
}

/**
 * The application-status filter carried by the münhal and ihale feeds.
 *
 * It is a ROUTE SEGMENT, never a query parameter — `/konu/munhal/acik`,
 * `/konu/munhal/kapali` — for the same reason the page number is one: it
 * enumerates, and a value that enumerates belongs in the path where it keeps the
 * route statically cacheable and gives every view one canonical address. The
 * absence of a segment is the third state, "all records", and it is deliberately
 * not spelled `/tumu`: the unfiltered feed already has an address and giving it a
 * second one is the duplicate Google would have to be told to ignore.
 */
export type DeadlineState = 'acik' | 'kapali';

export function isDeadlineState(value: string): value is DeadlineState {
  return value === 'acik' || value === 'kapali';
}

export const TOPICS: Record<TopicSlug, Topic> = {
  munhal: {
    slug: 'munhal',
    name: 'Münhal',
    blurb: 'Kamu kadrolarına ilk atama, terfi ve sözleşmeli personel ilanları',
    description:
      'Kamu kadrolarına ilk atama, terfi ve sözleşmeli personel ilanları. Kamu Hizmeti Komisyonu ile kurumların kendi ilanları, gazetede yayımlandığı gün buraya düşer. Başvuru bitiş tarihi, ilanın metni okunabildiğinde kaydın satırında görünür.',
    sortOrder: 1,
  },
  /*
   * Split out of 'munhal' on 2026-09-25. KHK exam results outnumbered the
   * vacancies they follow by roughly eight to one (1,286 against ~170), so the
   * münhal feed read as a feed of results and the vacancies — what people open
   * it for — were hard to find. Second in order so that a result which also
   * carries 'atama' still shows as a result.
   */
  'sinav-sonuclari': {
    slug: 'sinav-sonuclari',
    name: 'Sınav sonuçları',
    blurb: 'Kamu Hizmeti Komisyonu ve kurumların sınav sonucu duyuruları',
    description:
      'Kamu Hizmeti Komisyonu ile kurumların yazılı ve sözlü sınav sonucu duyuruları, baro ve meslek sınavı sonuçları. Bir kadronun ilanı Münhal konusunda, sınavın sonucu burada, atama kararnamesi ise Atama konusunda yer alır.',
    sortOrder: 2,
  },
  ihale: {
    slug: 'ihale',
    name: 'İhale',
    blurb: 'İhale ilanları, sonuçları ve Rekabet Kurulu itiraz kararları',
    description:
      'İhale ilanları, ihale sonuçları ve Rekabet Kurulu itiraz kararları. Bir ihaleye itiraz edildiğinde karar bu akışa düşer; kararın kendisi değil, karara bağlandığı bilgisi burada durur. Kesin sonuç için resmî metne bakın.',
    sortOrder: 3,
  },
  sirket: {
    slug: 'sirket',
    name: 'Şirket',
    blurb: 'Şirket tescili, isim değişikliği, tasfiye ve mukayyitlik ilanları',
    description:
      'Şirketler Mukayyitliği ilanları: yeni tescil, isim değişikliği, tasfiye ve sicilden kayıt silinmesi. Bir şirketin adını arattığınızda o şirketle ilgili tüm sicil hareketlerini tarih sırasıyla görürsünüz.',
    sortOrder: 4,
  },
  gayrimenkul: {
    slug: 'gayrimenkul',
    name: 'Gayrimenkul',
    blurb: 'Kamulaştırma, zorla mal iktisabı ve imar kararları',
    description:
      'Kamulaştırma, zorla mal iktisabı, planlama onayı, hali arazi tahsisi ve yol ayrılması kararları. Kararlar çoğunlukla bir köy ya da mahalle adıyla yayımlanır; yer adından girmek en hızlı yol.',
    sortOrder: 5,
  },
  marka: {
    slug: 'marka',
    name: 'Marka',
    blurb: 'Marka ve patent tescil müracaatı ilanları',
    description:
      'Ticaret markası tescil müracaatlarının resmî ilanları. İlan, itiraz süresini başlatan belgedir; müracaatın kabul edildiği anlamına gelmez.',
    sortOrder: 6,
  },
  'vergi-mali': {
    slug: 'vergi-mali',
    name: 'Vergi ve mali',
    blurb: 'Vergi oranları, ödenek aktarma, fon ve bütçe kararları',
    description:
      'Katma değer vergisi, harç, fiyat istikrar fonu, azami satış fiyatları, sosyal sigorta primleri ve faiz oranları. Bütçe içi ödenek aktarma kararları da bu akışta yer alır.',
    sortOrder: 7,
  },
  mevzuat: {
    slug: 'mevzuat',
    name: 'Mevzuat',
    blurb: 'Yasa, tüzük ve emirname değişiklikleri',
    description:
      'Yasalar, yasa gücünde kararnameler, tüzükler, emirnameler ve Meclis\u2019e sunulan yasa tasarısı ile önerileri. Bir yasanın değiştirilmiş güncel hâli değil, değişikliğin yayımlandığı hâli gösterilir.',
    sortOrder: 8,
  },
  atama: {
    slug: 'atama',
    name: 'Atama',
    blurb: 'Kamu görevlisi atama, görevlendirme ve emeklilik kararları',
    description:
      'Kamu görevlisi atama, görevden alma, görevlendirme ve emeklilik kararnameleri. Kişi adı geçen kayıtlarda kişiye özel sayfa üretilmez; tam liste için resmî metne yönlendirilirsiniz.',
    sortOrder: 9,
  },
  /*
   * The ninth topic came from real data. When the 2025 archive was processed, of
   * the 1,595 records left without a topic, 537 (a third) had the form "X'in KKTC
   * YURTTAŞLIĞINA ALINMASI" and fitted none of the existing eight — not a vacancy,
   * not an appointment, not legislation. Adding keywords did not solve it; the
   * category was missing.
   */
  yurttaslik: {
    slug: 'yurttaslik',
    name: 'Yurttaşlık',
    blurb: 'KKTC yurttaşlığına alınma kararları',
    description:
      'Bakanlar Kurulunun KKTC yurttaşlığına alınma kararları. Kayıtlar kişi adı taşıdığı için kişiye özel sayfa üretilmez; tam metin için resmî PDF sayfasına yönlendirilirsiniz.',
    sortOrder: 10,
  },
};

export const TOPIC_LIST: Topic[] = TOPIC_SLUGS.map((slug) => TOPICS[slug]);

export function isTopicSlug(value: string): value is TopicSlug {
  return (TOPIC_SLUGS as readonly string[]).includes(value);
}

export function topicName(slug: string): string {
  return isTopicSlug(slug) ? TOPICS[slug].name : slug;
}
