/**
 * Konular — spec 3.5 taksonomisi, artboard'daki görünen adlar ve açıklamalar.
 *
 * Renkli konu noktaları KALDIRILDI (ürün sahibinin kararı), bu yüzden `color` alanı da
 * silindi — tasarımdaki oklch değerleri git geçmişinde duruyor. Gerekçe:
 * components/topic-badge.
 * Açıklama metinleri elle yazıldı ve konu sayfasında ince içerik olmamak için kullanılıyor
 * (spec 8.2 ve 14.5).
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
  /** Listelerde ve rozetlerde görünen ad */
  name: string;
  /** Konu sayfasındaki iki-üç cümlelik özgün açıklama */
  description: string;
  /** Ana sayfa konu ızgarasındaki tek satırlık tanım */
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
   * Dokuzuncu konu, gerçek veriden geldi. 2025 arşivi işlendiğinde konusuz
   * kalan 1.595 kaydın 537'si (üçte biri) "X'in KKTC YURTTAŞLIĞINA ALINMASI"
   * biçimindeydi ve mevcut sekiz konunun hiçbirine girmiyordu — münhal değil,
   * atama değil, mevzuat değil. Kelime eklemek çözmüyordu; kategori eksikti.
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
