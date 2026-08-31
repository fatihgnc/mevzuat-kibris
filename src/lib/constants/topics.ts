/**
 * Konular — spec 3.5 taksonomisi, artboard'daki görünen adlar, renkler ve açıklamalar.
 *
 * Renkler tasarımdaki oklch değerleri: tek L/C, yalnızca hue değişiyor. Bu, sekiz konunun
 * listede eşit ağırlıkta okunmasını sağlıyor; hiçbiri diğerinden daha "önemli" görünmüyor.
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
  /** Konu noktasının rengi — tasarımdan birebir */
  color: string;
  sortOrder: number;
}

export const TOPICS: Record<TopicSlug, Topic> = {
  munhal: {
    slug: 'munhal',
    name: 'Münhal',
    blurb: 'Kamu kadrolarına ilk atama, terfi ve sözleşmeli personel ilanları',
    description:
      'Kamu kadrolarına ilk atama, terfi ve sözleşmeli personel ilanları. Kamu Hizmeti Komisyonu ile kurumların kendi ilanları, gazetede yayımlandığı gün buraya düşer. Başvuru bitiş tarihini her kaydın satırında görürsünüz.',
    color: 'oklch(0.58 0.11 145)',
    sortOrder: 1,
  },
  ihale: {
    slug: 'ihale',
    name: 'İhale',
    blurb: 'İhale ilanları, sonuçları ve Rekabet Kurulu itiraz kararları',
    description:
      'İhale ilanları, ihale sonuçları ve Rekabet Kurulu itiraz kararları. Bir ihaleye itiraz edildiğinde karar bu akışa düşer; kararın kendisi değil, karara bağlandığı bilgisi burada durur. Kesin sonuç için resmî metne bakın.',
    color: 'oklch(0.58 0.11 250)',
    sortOrder: 2,
  },
  sirket: {
    slug: 'sirket',
    name: 'Şirket',
    blurb: 'Şirket tescili, isim değişikliği, tasfiye ve mukayyitlik ilanları',
    description:
      'Şirketler Mukayyitliği ilanları: yeni tescil, isim değişikliği, tasfiye ve sicilden kayıt silinmesi. Bir şirketin adını arattığınızda o şirketle ilgili tüm sicil hareketlerini tarih sırasıyla görürsünüz.',
    color: 'oklch(0.58 0.11 300)',
    sortOrder: 3,
  },
  gayrimenkul: {
    slug: 'gayrimenkul',
    name: 'Gayrimenkul',
    blurb: 'Kamulaştırma, zorla mal iktisabı ve imar kararları',
    description:
      'Kamulaştırma, zorla mal iktisabı, planlama onayı, hali arazi tahsisi ve yol ayrılması kararları. Kararlar çoğunlukla bir köy ya da mahalle adıyla yayımlanır; yer adından girmek en hızlı yol.',
    color: 'oklch(0.58 0.11 60)',
    sortOrder: 4,
  },
  marka: {
    slug: 'marka',
    name: 'Marka',
    blurb: 'Marka ve patent tescil müracaatı ilanları',
    description:
      'Ticaret markası tescil müracaatlarının resmî ilanları. İlan, itiraz süresini başlatan belgedir; müracaatın kabul edildiği anlamına gelmez.',
    color: 'oklch(0.58 0.11 340)',
    sortOrder: 5,
  },
  'vergi-mali': {
    slug: 'vergi-mali',
    name: 'Vergi ve mali',
    blurb: 'Vergi oranları, ödenek aktarma, fon ve bütçe kararları',
    description:
      'Katma değer vergisi, harç, fiyat istikrar fonu, azami satış fiyatları, sosyal sigorta primleri ve faiz oranları. Bütçe içi ödenek aktarma kararları da bu akışta yer alır.',
    color: 'oklch(0.58 0.11 25)',
    sortOrder: 6,
  },
  mevzuat: {
    slug: 'mevzuat',
    name: 'Mevzuat',
    blurb: 'Yasa, tüzük ve emirname değişiklikleri',
    description:
      'Yasalar, yasa gücünde kararnameler, tüzükler, emirnameler ve Meclis\u2019e sunulan yasa tasarısı ile önerileri. Bir yasanın değiştirilmiş güncel hâli değil, değişikliğin yayımlandığı hâli gösterilir.',
    color: 'oklch(0.58 0.11 210)',
    sortOrder: 7,
  },
  atama: {
    slug: 'atama',
    name: 'Atama',
    blurb: 'Kamu görevlisi atama, görevlendirme ve emeklilik kararları',
    description:
      'Kamu görevlisi atama, görevden alma, görevlendirme ve emeklilik kararnameleri. Kişi adı geçen kayıtlarda kişiye özel sayfa üretilmez; tam liste için resmî metne yönlendirilirsiniz.',
    color: 'oklch(0.58 0.11 175)',
    sortOrder: 8,
  },
  /*
   * Dokuzuncu konu, gerçek veriden geldi. 2025 arşivi işlendiğinde konusuz
   * kalan 1.595 kaydın 537'si (üçte biri) "X'in KKTC YURTTAŞLIĞINA ALINMASI"
   * biçimindeydi ve mevcut sekiz konunun hiçbirine girmiyordu — münhal değil,
   * atama değil, mevzuat değil. Kelime eklemek çözmüyordu; kategori eksikti.
   *
   * Hue 100, mevcut sekiz hue'nun (25/60/145/175/210/250/300/340) en geniş
   * boşluğuna denk geliyor; L ve C aynı kalıyor ki listede eşit ağırlıkta
   * okunsun.
   */
  yurttaslik: {
    slug: 'yurttaslik',
    name: 'Yurttaşlık',
    blurb: 'KKTC yurttaşlığına alınma kararları',
    description:
      'Bakanlar Kurulunun KKTC yurttaşlığına alınma kararları. Kayıtlar kişi adı taşıdığı için kişiye özel sayfa üretilmez; tam metin için resmî PDF sayfasına yönlendirilirsiniz.',
    color: 'oklch(0.58 0.11 100)',
    sortOrder: 9,
  },
};

export const TOPIC_LIST: Topic[] = TOPIC_SLUGS.map((slug) => TOPICS[slug]);

export function isTopicSlug(value: string): value is TopicSlug {
  return (TOPIC_SLUGS as readonly string[]).includes(value);
}

export function topicColor(slug: string): string {
  return isTopicSlug(slug) ? TOPICS[slug].color : 'hsl(var(--ink-fainter))';
}

export function topicName(slug: string): string {
  return isTopicSlug(slug) ? TOPICS[slug].name : slug;
}
