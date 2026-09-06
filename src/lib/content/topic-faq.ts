import type { TopicSlug } from '@/lib/constants/topics';

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Three questions per topic, answered in full sentences.
 *
 * WHY THIS EXISTS. A topic page's description says what the topic covers; it does
 * not answer the question the visitor arrived with. Those questions are narrow and
 * repetitive — "does this ilan mean the trademark was registered", "can I read the
 * current VAT rate here" — and the honest answer is often "no, and here is what
 * this archive does hold". Written down, that answer stops a visitor bouncing, and
 * it is also the most quotable unit on the page: a self-contained question with a
 * self-contained answer, which is the shape both a search snippet and a generative
 * answer engine lift whole.
 *
 * TWO RULES, BOTH ABOUT NOT OVERREACHING.
 *
 * 1. These answer questions about THE ARCHIVE, not questions of law. What a
 *    trademark objection period is, when an appointment takes effect, whether a
 *    decision covers a particular parcel — none of that is ours to state, and
 *    stating it confidently inside a FAQPage is how a records archive turns into a
 *    source of bad legal advice. Where a question invites that, the answer says
 *    where the binding text is instead.
 *
 * 2. Every claim about the site has to be true of the site as it is. Each answer
 *    below describes behaviour that exists: the deadline on vacancy rows, the
 *    document-type filter, the entity pages, the body text withheld from records
 *    containing personal data. If a behaviour changes, the answer changes with it
 *    — a stale FAQ is worse than none, because this one is machine-readable.
 */
export const TOPIC_FAQ: Record<TopicSlug, FaqItem[]> = {
  munhal: [
    {
      question: 'Münhal ilanı nedir?',
      answer:
        'Kamu kadrolarına ilk atama, terfi ya da sözleşmeli personel alımı için Resmî Gazete’de yayımlanan duyurudur. İlanların çoğunu Kamu Hizmeti Komisyonu yayımlar; kurumlar da kendi ilanlarını verebilir.',
    },
    {
      question: 'Başvurusu hâlâ açık olan ilanları nasıl görürüm?',
      answer:
        'Münhal akışındaki “Başvurusu açık” bağlantısı yalnızca başvuru bitiş tarihi geçmemiş kayıtları listeler. Bitiş tarihi her kaydın satırında yazar; geçmişse “Başvuru süresi doldu” diye görünür. Bağlayıcı tarih için kaydın orijinal PDF sayfasına bakın.',
    },
    {
      question: 'Sınav sonuçları neden münhal akışında?',
      answer:
        'Kamu Hizmeti Komisyonu’nun sınav sonucu duyuruları da bu konuya düşer ve sayıca ilanların kendisinden fazladır. Filtre sütunundaki belge türünden “Münhal ilanı” ile “Sınav sonucu”nu ayırabilirsiniz.',
    },
  ],
  ihale: [
    {
      question: 'Bu sayfadan ihaleye başvurabilir miyim?',
      answer:
        'Hayır. Burası Resmî Gazete’de yayımlanmış ihale ilanlarının, sonuçlarının ve itiraz kararlarının arşividir; başvuru ilanı veren kuruma yapılır. Her kayıt gazetenin orijinal PDF sayfasına bağlıdır.',
    },
    {
      question: 'İhale kayıtlarındaki Rekabet Kurulu kararı ne anlama geliyor?',
      answer:
        'Bir ihale sürecine itiraz edildiğinde Rekabet Kurulu’nun verdiği karar Resmî Gazete’de yayımlanır ve bu akışa düşer. Sayfada kararın yayımlandığı bilgisi ve çıkarılabildiyse metni bulunur; bağlayıcı olan gazetenin kendi metnidir.',
    },
    {
      question: 'Belirli bir şirketin ihale kayıtlarını nasıl bulurum?',
      answer:
        'Şirket adını aratıp o şirketin sayfasına gidin; oradaki filtre sütunundan konuyu “İhale” seçerek yalnızca ihaleyle ilgili kayıtlarını listeleyebilirsiniz.',
    },
  ],
  sirket: [
    {
      question: 'Şirket akışında hangi kayıtlar var?',
      answer:
        'Şirketler Mukayyitliği’nin Resmî Gazete’de yayımlanan ilanları: yeni tescil, isim değişikliği, tasfiye ve sicilden kayıt silinmesi.',
    },
    {
      question: 'Bu arşiv resmî şirket sicili mi?',
      answer:
        'Hayır. Burası bağımsız bir arşivdir ve yalnızca gazetede yayımlanmış ilanları içerir. Bir şirketin güncel sicil durumu için Şirketler Mukayyitliği’ne başvurun.',
    },
    {
      question: 'Bir şirketin bütün sicil hareketlerini nasıl görürüm?',
      answer:
        'Şirket adını arattığınızda o şirkete ait sayfa açılır ve adı geçen tüm kayıtlar tarih sırasıyla listelenir. Şirketler dizininden de gezinebilirsiniz.',
    },
  ],
  gayrimenkul: [
    {
      question: 'Kamulaştırma kararını nasıl ararım?',
      answer:
        'Bu kararlar çoğunlukla bir köy ya da mahalle adıyla yayımlanır, dolayısıyla yer adından girmek en hızlı yoldur. Yerler dizininden ilgili yerin sayfasına gidip oradan tarihe göre daraltabilirsiniz.',
    },
    {
      question: 'Parsel ya da koçan numarasıyla arayabilir miyim?',
      answer:
        'Arama, başlığın yanı sıra kaydın çıkarılmış gövde metninde de çalışır; numara metinde geçiyorsa bulunur. Metni çıkarılamamış kayıtlarda bu mümkün değildir ve o kayıtlarda bunu açıkça belirtiriz.',
    },
    {
      question: 'Karar benim taşınmazımı kapsıyor mu?',
      answer:
        'Bunu bu arşive bakarak kesin olarak söyleyemezsiniz. Kararın kapsamı için gazetenin orijinal PDF sayfasına ve ilgili daireye başvurun; her kayıt sayfasında PDF bağlantısı vardır.',
    },
  ],
  marka: [
    {
      question: 'Marka ilanı, markanın tescil edildiği anlamına mı gelir?',
      answer:
        'Hayır. İlan, tescil müracaatının duyurulmasıdır ve itiraz süresini başlatır; müracaatın kabul edildiğini göstermez. Sonucun ne olduğu bu ilandan anlaşılmaz.',
    },
    {
      question: 'İtiraz süresi ne kadar?',
      answer:
        'Süre ilanın kendi metninde yazar; bu arşiv süreyi hesaplamaz ve yorumlamaz. Kaydın orijinal PDF sayfasına bakın.',
    },
    {
      question: 'Bir marka müracaatını nasıl ararım?',
      answer:
        'Marka adını arama kutusuna yazın. Müracaat sahibi bir şirketse o şirketin sayfasından da girebilirsiniz.',
    },
  ],
  'vergi-mali': [
    {
      question: 'Güncel KDV oranını buradan öğrenebilir miyim?',
      answer:
        'Hayır. Arşiv, oranı değiştiren kararın yayımlandığı hâlini gösterir; oranların birleştirilmiş güncel listesi değildir. En son değişikliği görmek için bu akışın en yeni kayıtlarına bakabilirsiniz.',
    },
    {
      question: 'Bir oranın ne zaman değiştiğini nasıl bulurum?',
      answer:
        'Filtre sütunundaki tarih aralığını kullanın; kayıtlar yayım tarihine göre sıralanır ve sıralamayı eskiden yeniye çevirerek değişiklikleri sırayla izleyebilirsiniz.',
    },
    {
      question: 'Bu akışta başka neler var?',
      answer:
        'Harçlar, Fiyat İstikrar Fonu kararları, azami satış fiyatları, sosyal sigorta primleri, faiz oranları ve bütçe içi ödenek aktarma kararları.',
    },
  ],
  mevzuat: [
    {
      question: 'Bir yasanın güncel hâlini buradan görebilir miyim?',
      answer:
        'Hayır. Burada yasanın değiştirilmiş güncel metni değil, değişikliğin Resmî Gazete’de yayımlandığı hâli bulunur. Yürürlükteki birleştirilmiş metin için resmî kaynağa başvurun.',
    },
    {
      question: 'Yasa, tüzük ve emirnameyi nasıl ayırırım?',
      answer:
        'Filtre sütunundaki belge türünden seçin. Bu akışta yasalar, yasa gücünde kararnameler, tüzükler, emirnameler ve Meclis’e sunulan yasa tasarısı ile önerileri ayrı türler olarak durur.',
    },
    {
      question: 'Bir konudaki yeni düzenlemeleri nasıl takip ederim?',
      answer:
        'Konu sayfasındaki takip kutusundan e-posta bildirimi kurabilir ya da sayfanın RSS akışını okuyucunuza ekleyebilirsiniz; ikisi de aynı kayıtları aynı sırada verir.',
    },
  ],
  atama: [
    {
      question: 'Atama akışında hangi kayıtlar var?',
      answer:
        'Kamu görevlisi atama, görevden alma, görevlendirme ve emeklilik kararnameleri.',
    },
    {
      question: 'Kişi adıyla arama yapabilir miyim?',
      answer:
        'Arama kişi adını bulabilir, ancak kişisel veri içeren kayıtlarda gövde metnini sayfada yayımlamayız; sizi gazetenin orijinal PDF sayfasına yönlendiririz. Amaç, bu belgeleri kişilerin aranabilir bir dizinine dönüştürmemektir.',
    },
    {
      question: 'Bir kurumun atama kararlarını toplu olarak nasıl görürüm?',
      answer:
        'Kurumlar dizininden ilgili kurumun sayfasına gidin ve oradaki filtre sütunundan konuyu “Atama” seçin.',
    },
  ],
  yurttaslik: [
    {
      question: 'Yurttaşlık akışındaki kayıtlar ne?',
      answer: 'Bakanlar Kurulunun KKTC yurttaşlığına alınma kararlarıdır.',
    },
    {
      question: 'Kararların metni neden sayfada görünmüyor?',
      answer:
        'Bu kayıtlar kişi adı taşır. Kişisel veri içeren kayıtlarda gövde metnini yayımlamıyoruz; kaydın sayfasından gazetenin orijinal PDF sayfasına geçebilirsiniz.',
    },
    {
      question: 'Kendi kararımı nasıl bulurum?',
      answer:
        'Kararın yayımlandığı tarihi ya da gazete sayısını biliyorsanız o sayının sayfasından gidebilirsiniz. Kesin ve bağlayıcı metin her zaman gazetenin kendi PDF sayfasıdır.',
    },
  ],
};
