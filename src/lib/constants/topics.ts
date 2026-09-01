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

export const TOPICS: Record<TopicSlug, Topic> = {
  munhal: {
    slug: 'munhal',
    name: 'Münhal',
    blurb: 'Kamu kadrolarına ilk atama, terfi ve sözleşmeli personel ilanları',
    description:
      'Kamu kadrolarına ilk atama, terfi ve sözleşmeli personel ilanları. Kamu Hizmeti Komisyonu ile kurumların kendi ilanları, gazetede yayımlandığı gün buraya düşer. Başvuru bitiş tarihini her kaydın satırında görürsünüz.',
    sortOrder: 1,
  },
  ihale: {
    slug: 'ihale',
    name: 'İhale',
    blurb: 'İhale ilanları, sonuçları ve Rekabet Kurulu itiraz kararları',
    description:
      'İhale ilanları, ihale sonuçları ve Rekabet Kurulu itiraz kararları. Bir ihaleye itiraz edildiğinde karar bu akışa düşer; kararın kendisi değil, karara bağlandığı bilgisi burada durur. Kesin sonuç için resmî metne bakın.',
    sortOrder: 2,
  },
  sirket: {
    slug: 'sirket',
    name: 'Şirket',
    blurb: 'Şirket tescili, isim değişikliği, tasfiye ve mukayyitlik ilanları',
    description:
      'Şirketler Mukayyitliği ilanları: yeni tescil, isim değişikliği, tasfiye ve sicilden kayıt silinmesi. Bir şirketin adını arattığınızda o şirketle ilgili tüm sicil hareketlerini tarih sırasıyla görürsünüz.',
    sortOrder: 3,
  },
  gayrimenkul: {
    slug: 'gayrimenkul',
    name: 'Gayrimenkul',
    blurb: 'Kamulaştırma, zorla mal iktisabı ve imar kararları',
    description:
      'Kamulaştırma, zorla mal iktisabı, planlama onayı, hali arazi tahsisi ve yol ayrılması kararları. Kararlar çoğunlukla bir köy ya da mahalle adıyla yayımlanır; yer adından girmek en hızlı yol.',
    sortOrder: 4,
  },
  marka: {
    slug: 'marka',
    name: 'Marka',
    blurb: 'Marka ve patent tescil müracaatı ilanları',
    description:
      'Ticaret markası tescil müracaatlarının resmî ilanları. İlan, itiraz süresini başlatan belgedir; müracaatın kabul edildiği anlamına gelmez.',
    sortOrder: 5,
  },
  'vergi-mali': {
    slug: 'vergi-mali',
    name: 'Vergi ve mali',
    blurb: 'Vergi oranları, ödenek aktarma, fon ve bütçe kararları',
    description:
      'Katma değer vergisi, harç, fiyat istikrar fonu, azami satış fiyatları, sosyal sigorta primleri ve faiz oranları. Bütçe içi ödenek aktarma kararları da bu akışta yer alır.',
    sortOrder: 6,
  },
  mevzuat: {
    slug: 'mevzuat',
    name: 'Mevzuat',
    blurb: 'Yasa, tüzük ve emirname değişiklikleri',
    description:
      'Yasalar, yasa gücünde kararnameler, tüzükler, emirnameler ve Meclis\u2019e sunulan yasa tasarısı ile önerileri. Bir yasanın değiştirilmiş güncel hâli değil, değişikliğin yayımlandığı hâli gösterilir.',
    sortOrder: 7,
  },
  atama: {
    slug: 'atama',
    name: 'Atama',
    blurb: 'Kamu görevlisi atama, görevlendirme ve emeklilik kararları',
    description:
      'Kamu görevlisi atama, görevden alma, görevlendirme ve emeklilik kararnameleri. Kişi adı geçen kayıtlarda kişiye özel sayfa üretilmez; tam liste için resmî metne yönlendirilirsiniz.',
    sortOrder: 8,
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
    sortOrder: 9,
  },
};

export const TOPIC_LIST: Topic[] = TOPIC_SLUGS.map((slug) => TOPICS[slug]);

export function isTopicSlug(value: string): value is TopicSlug {
  return (TOPIC_SLUGS as readonly string[]).includes(value);
}

export function topicName(slug: string): string {
  return isTopicSlug(slug) ? TOPICS[slug].name : slug;
}
