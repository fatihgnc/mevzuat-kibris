/**
 * Guide content — spec 9.7.
 *
 * These are hand-written, original texts. They do two jobs: teach the user, and
 * show the site is not "just scraped content" (spec 14.5 rule 2). The AdSense
 * application is not submitted before all eight guides are published.
 */

/**
 * A link out of the guide and INTO the archive.
 *
 * The guides were written as closed texts: 424 lines explaining what an A.E.
 * number is, with no way to go and look at one. On a site sitting on 24,000
 * records that is a dead end for the reader and a wasted path for a crawler —
 * measured before this was added, `guides.ts` held exactly zero links.
 *
 * The href is written by hand rather than generated, so a guide can point at the
 * precise slice it is talking about: a topic, a filtered search, an issue index.
 */
export interface GuideLink {
  label: string;
  href: string;
}

export interface GuideSection {
  heading?: string;
  paragraphs: string[];
  list?: string[];
  /** Shown under the section as "look at the real thing" links. */
  links?: GuideLink[];
}

export interface Guide {
  slug: string;
  title: string;
  /** The one-line definition on the list page */
  summary: string;
  /** Meta description */
  description: string;
  sections: GuideSection[];
  faq?: Array<{ question: string; answer: string }>;
}

export const GUIDES: Guide[] = [
  {
    slug: 'resmi-gazete-nasil-okunur',
    title: 'Resmî Gazete nasıl okunur, bölümler ne anlama gelir',
    summary: 'Gazetenin ana bölümü ve ekleri neyi içerir, aradığınız şey hangi bölümde.',
    description:
      'KKTC Resmî Gazete’nin ana bölümü ve Ek I–Ek VI ekleri neyi içerir, hangi karar hangi bölümde yayımlanır.',
    sections: [
      {
        paragraphs: [
          'KKTC Resmî Gazete tek bir metin değil; bir ana bölüm ve numaralı eklerden oluşuyor. Bir kararın hangi bölümde yayımlandığı, o kararın hukuki niteliğini söylüyor. Aradığınız şeyi bulmanın en hızlı yolu, önce hangi bölüme bakacağınızı bilmek.',
        ],
      },
      {
        heading: 'Ana bölüm',
        paragraphs: [
          'Atama ve görevden alma kararnameleri, Kamu Hizmeti Komisyonu münhal ilanları, sınav sonuçları ve mahkeme duyuruları burada. Kamu işi arayan biri için gazetenin en önemli kısmı bu bölüm.',
        ],
      },
      {
        heading: 'Ek I — yasalar',
        paragraphs: [
          'Bölüm I yasaları ve bütçe yasalarını, Bölüm II yasa gücünde kararnameleri taşır. Bir yasanın burada yayımlanması yürürlüğe girmesinin şartıdır.',
        ],
        links: [{ label: 'Yasalar', href: '/ara?tur=yasa' }],
      },
      {
        heading: 'Ek II — Anayasa Mahkemesi',
        paragraphs: [
          'Anayasa Mahkemesi kararları burada yayımlanır. Bir yasa maddesinin iptal edildiğini öğrenmenin resmî yolu bu bölümdür.',
        ],
        links: [{ label: 'Anayasa Mahkemesi kararları', href: '/ara?tur=anayasa_mahkemesi_karari' }],
      },
      {
        heading: 'Ek III — tüzükler, emirnameler, kurul kararları',
        paragraphs: [
          'Sayfa hacmi olarak en kalabalık bölüm. Tüzükler, emirnameler, Rekabet Kurulu ve Eski Eserler Kurulu kararları, Merkez Bankası vaziyetleri ve Şirketler Mukayyitliği ön duyuruları burada. Vergi oranı, harç ya da fiyat değişikliği arıyorsanız büyük ihtimalle Ek III’tesiniz.',
        ],
      },
      {
        heading: 'Ek IV — Bakanlar Kurulu ve Meclis kararları',
        paragraphs: [
          'Bölüm I Bakanlar Kurulu kararlarını taşır ve bu kararlar Ü(K-I) ya da Ü(K-II) numarasıyla yayımlanır. Bölüm II Meclis kararlarıdır.',
          'Dikkat edilmesi gereken bir nokta var: aynı konu hem Ek III’te bir A.E. numarasıyla hem Ek IV’te bir Ü(K-I) numarasıyla görünebilir. Biri düzenlemenin kendisi, diğeri onu yayımlayan Bakanlar Kurulu kararıdır. İkisi ayrı kayıttır ve biz bunları birbirine bağlıyoruz.',
        ],
        links: [{ label: 'Bakanlar Kurulu kararları', href: '/ara?tur=bakanlar_kurulu_karari' }],
      },
      {
        heading: 'Ek V — şirketler ve markalar',
        paragraphs: [
          'Bölüm I şirket sicil silme işlemlerini, Bölüm II ticaret markası resmî ilanlarını içerir. Bir şirketin tasfiyeye girdiğini ya da bir markanın tescil için ilan edildiğini buradan öğrenirsiniz.',
        ],
        links: [
          { label: 'Şirket kayıtları', href: '/konu/sirket' },
          { label: 'Marka ilanları', href: '/konu/marka' },
        ],
      },
      {
        heading: 'Ek VI — yasa tasarıları ve önerileri',
        paragraphs: [
          'Henüz yasalaşmamış metinler. Y.T.NO ile numaralananlar hükümetin sunduğu tasarılar, Y.Ö.NO ile numaralananlar milletvekili önerileridir. Burada yayımlanmış olmak yürürlükte olmak anlamına gelmez.',
        ],
        links: [{ label: 'Yasa tasarıları', href: '/ara?tur=yasa_tasarisi' }],
      },
    ],
    faq: [
      {
        question: 'Bir kararın hangi bölümde yayımlandığını nereden görürüm?',
        answer:
          'Her kayıt sayfasının künye şeridinde gazete sayısı ve bölüm yazılıdır, örneğin “Sayı 262, Ek III”.',
      },
    ],
  },
  {
    slug: 'ae-uk-yt-numaralari-ne-demek',
    title: 'A.E., Ü(K-I), Y.T. numaraları ne demek',
    summary: 'Resmî Gazete’deki referans numaralarının hangisi ne anlama geliyor.',
    description:
      'A.E., Ü(K-I), Ü(K-II), Ş.M., Y.T.NO ve Y.Ö.NO numaralarının ne anlama geldiği ve nasıl aranacağı.',
    sections: [
      {
        paragraphs: [
          'Resmî Gazete’deki her kaydın bir referans numarası var ve bu numara belgenin türünü söylüyor. Numarayı biliyorsanız arama kutusuna doğrudan yazmak en hızlı yol.',
        ],
      },
      {
        heading: 'A.E.',
        paragraphs: [
          '“Adalet Emri” kısaltmasından gelir ve pratikte tüzük, emirname ve kurul kararları için kullanılır. Yıl içinde birden başlayarak artar: A.E. 1071 gibi. En sık karşılaşacağınız numara türü budur.',
        ],
        links: [{ label: 'A.E. kayıtlarını ara', href: '/ara?q=A.E.' }],
      },
      {
        heading: 'Ü(K-I) ve Ü(K-II)',
        paragraphs: [
          'Bakanlar Kurulu kararlarıdır. İki ayrı seri hâlinde numaralanır ve numara yılla birlikte yazılır: Ü(K-I) 2497-2025. Birinci seri genel kararları, ikinci seri personel ve istihdam kararlarını taşır.',
        ],
        links: [{ label: 'Bakanlar Kurulu kararları', href: '/ara?tur=bakanlar_kurulu_karari' }],
      },
      {
        heading: 'Ş.M.',
        paragraphs: [
          'Şirketler Mukayyitliği işlemleridir: tescil, isim değişikliği, tasfiye, sicilden silinme. Bir şirket adını arattığınızda bu numaralı kayıtları görürsünüz.',
        ],
        links: [
          { label: 'Şirket kayıtları', href: '/konu/sirket' },
          { label: 'Şirketler dizini', href: '/sirket' },
        ],
      },
      {
        heading: 'Y.T.NO ve Y.Ö.NO',
        paragraphs: [
          'Y.T.NO yasa tasarısı, Y.Ö.NO yasa önerisidir. Üç parçalı yazılır: Y.T.NO:332/5/2025. Bunlar Meclis’e sunulmuş ama henüz yasalaşmamış metinlerdir.',
        ],
        links: [
          { label: 'Yasa tasarıları', href: '/ara?tur=yasa_tasarisi' },
          { label: 'Yasa önerileri', href: '/ara?tur=yasa_onerisi' },
        ],
      },
      {
        heading: 'GENELGE MİA',
        paragraphs: [
          'Maliye Bakanlığı genelgeleri bu önekle yayımlanır: GENELGE MİA.32/2025. Kamu kurumlarının bütçe ve harcama işlemlerini düzenler.',
        ],
        links: [{ label: 'Genelge kayıtları', href: '/ara?q=genelge' }],
      },
      {
        heading: 'DÜZELTME',
        paragraphs: [
          'Önceki bir kaydın hatasını düzelten ilanlardır. Kendi numarası yoktur; düzelttiği kayda atıf yapar. Biz bu kayıtları kaynak kayda bağlıyoruz, böylece bir kararı okurken sonradan düzeltildiğini görebiliyorsunuz.',
        ],
        links: [{ label: 'Düzeltme kayıtları', href: '/ara?tur=duzeltme' }],
      },
    ],
  },
  {
    slug: 'yasa-tuzuk-emirname-kararname-farki',
    title: 'Yasa, tüzük, emirname ve kararname farkı',
    summary: 'Dördü de bağlayıcı ama aynı şey değil. Hangisi neyi düzenleyebilir.',
    description:
      'Yasa, tüzük, emirname ve kararname arasındaki hukuki fark; hangisi hangi konuyu düzenleyebilir.',
    sections: [
      {
        paragraphs: [
          'Bu dört terim gazetede sık geçiyor ve birbirinin yerine kullanılmıyor. Aralarındaki fark, kimin çıkardığı ve neyi düzenleyebildiğiyle ilgili.',
        ],
      },
      {
        heading: 'Yasa',
        paragraphs: [
          'Cumhuriyet Meclisi çıkarır. En üst düzenleme türüdür; bir konuda yasa varsa alt düzenlemeler ona aykırı olamaz. Ek I Bölüm I’de yayımlanır.',
        ],
        links: [{ label: 'Yasa kayıtları', href: '/ara?tur=yasa' }],
      },
      {
        heading: 'Yasa gücünde kararname',
        paragraphs: [
          'Meclis’in verdiği yetkiye dayanarak Bakanlar Kurulu çıkarır ve yasa hükmündedir. Ek I Bölüm II’de yayımlanır. Yetki yasasının çizdiği sınırın dışına çıkamaz.',
        ],
      },
      {
        heading: 'Tüzük',
        paragraphs: [
          'Bir yasanın nasıl uygulanacağını ayrıntılandırır. Kendi başına yeni bir yükümlülük getiremez; dayandığı yasayı aşarsa iptal edilebilir. Ek III’te A.E. numarasıyla yayımlanır.',
        ],
        links: [{ label: 'Tüzükler', href: '/ara?tur=tuzuk' }],
      },
      {
        heading: 'Emirname',
        paragraphs: [
          'Genellikle sayısal değerleri belirler: fiyat, oran, bedel, tarife. Tüzükten daha dar ve daha sık değişir. Fiyat İstikrar Fonu’na yatırılacak miktarlar ya da su kullanım bedelleri emirnameyle düzenlenir.',
        ],
        links: [{ label: 'Emirnameler', href: '/ara?tur=emirname' }],
      },
      {
        heading: 'Kararname',
        paragraphs: [
          'Bakanlar Kurulu’nun tekil işlemleridir: atama, görevden alma, ödenek aktarma, kamulaştırma. Genel bir kural koymaz, belirli bir olayı sonuçlandırır.',
        ],
      },
      {
        paragraphs: [
          'Pratik sonuç: bir konuda “kural ne” diye soruyorsanız yasa ve tüzüğe, “bu yıl rakam kaç” diye soruyorsanız emirnameye, “bu kişi ya da bu arsa hakkında ne karar verildi” diye soruyorsanız kararnameye bakın.',
        ],
      },
    ],
  },
  {
    slug: 'kamu-isine-nasil-basvurulur',
    title: 'KKTC’de kamu işine nasıl başvurulur',
    summary: 'Münhal ilanından atamaya kadar sürecin adımları ve nelere dikkat etmek gerektiği.',
    description:
      'KKTC’de kamu kadrosuna başvuru süreci: münhal ilanı, başvuru, sınav, sonuç ve atama kararnamesi.',
    sections: [
      {
        paragraphs: [
          'Kamu kadrosuna alım Resmî Gazete’de yayımlanan münhal ilanıyla başlar. İlanın gazetede yayımlanması hukuken zorunludur; başka bir yerde duyurulmuş ama gazetede yayımlanmamış bir kadro yoktur.',
        ],
      },
      {
        heading: 'Adım 1 — münhal ilanı',
        paragraphs: [
          'İlanı çoğunlukla Kamu Hizmeti Komisyonu yayımlar, bazı kurumlar kendi ilanlarını verir. İlanda kadro sayısı, aranan nitelikler, başvuru yeri ve son başvuru tarihi bulunur.',
          'Son başvuru tarihi kritik. Biz bu tarihi ilan metninden çıkarıp her kaydın satırında gösteriyoruz; “başvurusu açık” filtresiyle yalnızca süresi dolmamış ilanları listeleyebilirsiniz. Yine de kesin tarih için resmî PDF’e bakın — çıkarım otomatik ve belirsiz durumlarda alanı boş bırakıyoruz.',
        ],
        links: [
          { label: 'Münhal ilanları', href: '/konu/munhal' },
        ],
      },
      {
        heading: 'Adım 2 — başvuru',
        paragraphs: [
          'Başvurular ilanda yazılı adrese elden ya da posta yoluyla yapılır. İlanda istenen belgelerin tam listesi verilir; eksik belge başvuruyu geçersiz kılar.',
        ],
      },
      {
        heading: 'Adım 3 — sınav',
        paragraphs: [
          'İlk atama kadrolarında yazılı sınav yapılır. Sınav tarihi çoğunlukla ilanla birlikte duyurulur, bazen ayrı bir duyuruyla gelir.',
        ],
      },
      {
        heading: 'Adım 4 — sonuç ve atama',
        paragraphs: [
          'Sınav sonuçları gazetede yayımlanır. Ardından atama kararnamesi çıkar; kararname yayımlanmadan göreve başlama olmaz.',
          'Sınav sonuç listeleri kişi adı içerdiği için biz bu listeleri sayfada yayımlamıyoruz. Kayıt sayfasında künye ve gazete yeri duruyor, tam liste için orijinal PDF’e yönlendiriyoruz.',
        ],
        links: [
          { label: 'Sınav sonuçları', href: '/ara?tur=sinav_sonucu' },
          { label: 'Atama kararnameleri', href: '/konu/atama' },
        ],
      },
      {
        heading: 'Kaçırmamak için',
        paragraphs: [
          'Münhal akışını takibe alırsanız yeni ilan yayımlandığında e-posta göndeririz. E-posta vermek istemiyorsanız aynı akışın RSS bağlantısı var ve kayıt gerektirmiyor.',
        ],
      },
    ],
    faq: [
      {
        question: 'Başvuru süresi dolmuş ilanlar neden hâlâ listede?',
        answer:
          'Sonuç listesini bekleyenler için arşiv değeri taşıyor. Bu ilanlar silinmez, “başvuru süresi doldu” olarak işaretlenir.',
      },
    ],
  },
  {
    slug: 'ihale-ilani-ve-rekabet-kurulu-itirazi',
    title: 'Bir ihale ilanı nasıl okunur, Rekabet Kurulu itirazı nedir',
    summary: 'İhale sürecinin gazetedeki izi ve itiraz mekanizmasının nasıl işlediği.',
    description:
      'KKTC’de ihale ilanlarının okunması ve Rekabet Kurulu’na yapılan itirazların Resmî Gazete’deki karşılığı.',
    sections: [
      {
        paragraphs: [
          'Bir ihalenin gazetede üç ayrı izi olabilir: ilan, sonuç ve varsa itiraz kararı. Üçü ayrı kayıt olarak yayımlanır ve aynı ihaleye ait olduklarını anlamak için konu metnini okumak gerekir.',
        ],
        links: [{ label: 'Rekabet Kurulu kararları', href: '/ara?tur=rekabet_kurulu_karari' }],
      },
      {
        heading: 'İhale ilanı',
        paragraphs: [
          'İhalenin konusu, işi yaptıracak kurum, şartname bedeli ve teklif verme süresi bulunur. Hizmet alımı, yapım işi ve mal alımı ayrı kategorilerdir.',
        ],
        links: [
          { label: 'İhale kayıtları', href: '/konu/ihale' },
        ],
      },
      {
        heading: 'Rekabet Kurulu itirazı',
        paragraphs: [
          'İhale sürecinde hak kaybına uğradığını düşünen istekli Rekabet Kurulu’na itiraz edebilir. Kurul itirazı görüşür ve bir karara bağlar; karar gazetede “KARAR SAYISI” önekiyle yayımlanır.',
          'Burada dikkatli olmak gerekiyor: kararın başlığı itirazın konusunu söyler, sonucunu söylemez. Biz de özet cümlede sonucu bildirmiyoruz — “itirazı karara bağladı” yazıyoruz, “itirazı reddetti” yazmıyoruz. Sonuç bilgisi kararın gövdesinde ve hukuki metinde tahmin yürütmek kabul edilebilir değil. Kararın nasıl sonuçlandığını öğrenmek için resmî PDF’i açın.',
        ],
      },
      {
        heading: 'Süreç nasıl devam eder',
        paragraphs: [
          'İtiraz reddedilirse ihale kaldığı yerden devam eder. Kabul edilirse süreç geriye alınabilir ya da ihale iptal edilebilir. Kurul kararları taraflara tebliğ tarihinden itibaren yürürlüğe girer.',
        ],
      },
    ],
  },
  {
    slug: 'kamulastirma-ihbari-ile-emri-farki',
    title: 'Kamulaştırma ihbarı ile kamulaştırma emri farkı',
    summary: 'İki ayrı ilan, iki ayrı hukuki sonuç. Arsanız için hangisi ne demek.',
    description:
      'Zorla mal iktisabı sürecinde kamulaştırma ihbarı ile kamulaştırma emri arasındaki fark ve süreler.',
    sections: [
      {
        paragraphs: [
          'Gazetede kamulaştırmayla ilgili iki ayrı ilan türü görürsünüz ve ikisi aynı şey değil. Aradaki fark, taşınmazınız üzerindeki hakkınızın ne durumda olduğunu belirliyor.',
        ],
      },
      {
        heading: 'Kamulaştırma ihbarı',
        paragraphs: [
          'İdarenin bir taşınmazı kamu yararına almayı düşündüğünü duyurmasıdır. Henüz mülkiyet değişmez. İhbar, itiraz süresini başlatır; taşınmaz sahibi bu süre içinde itiraz edebilir.',
        ],
      },
      {
        heading: 'Kamulaştırma emri',
        paragraphs: [
          'İtiraz süreci tamamlandıktan sonra çıkar ve kamulaştırmayı kesinleştirir. Bu aşamadan sonra tartışma konusu genellikle kamulaştırmanın kendisi değil, bedelidir.',
        ],
        links: [
          { label: 'Kamulaştırma kayıtları', href: '/ara?tur=kamulastirma' },
          { label: 'Gayrimenkul konusu', href: '/konu/gayrimenkul' },
        ],
      },
      {
        heading: 'Nasıl takip edilir',
        paragraphs: [
          'Kamulaştırma kararları çoğunlukla “1962 Zorla Mal İktisabı Yasası” başlığı altında, bir ilçe ve köy adıyla yayımlanır: örneğin “Gazimağusa/Vadili”. Bu yüzden yer adıyla aramak en verimli yol.',
          'Bir köy ya da mahalleyi takibe alırsanız o yerle ilgili yeni kayıt yayımlandığında haber veririz. Arsası olan biri için bu, gazeteyi her gün taramanın tek alternatifi.',
        ],
      },
      {
        paragraphs: [
          'Bu sayfadaki bilgi genel niteliktedir ve hukuki tavsiye değildir. Somut bir kamulaştırma işlemi için avukata danışın; süreler kaçırıldığında geri alınamıyor.',
        ],
      },
    ],
  },
  {
    slug: 'sirket-sicilden-silinmesi-ne-demek',
    title: 'Şirketin sicilden silinmesi ne anlama gelir',
    summary: 'Tasfiye, sicilden silinme ve isim değişikliği ilanlarının pratik sonuçları.',
    description:
      'Şirketler Mukayyitliği ilanları: tasfiye, sicilden kayıt silinmesi ve isim değişikliği ne anlama gelir.',
    sections: [
      {
        paragraphs: [
          'Şirketler Mukayyitliği işlemleri Resmî Gazete’de ilan edilir. Bir şirketle iş yapıyorsanız ya da alacağınız varsa bu ilanlar sizi doğrudan ilgilendirir.',
        ],
      },
      {
        heading: 'Tasfiye işlemlerine başlanması',
        paragraphs: [
          'Şirket kapanma sürecine girmiştir ama tüzel kişiliği henüz sona ermemiştir. İlanda çoğunlukla alacaklıların tasfiye memuruna başvurması için bir süre verilir. Bu süreyi kaçırırsanız alacağınızı tasfiyeden tahsil etmeniz zorlaşır.',
        ],
      },
      {
        heading: 'Sicilden kayıt silinmesi',
        paragraphs: [
          'Şirketin tüzel kişiliğinin sona erdiği andır. Silinmiş bir şirkete karşı dava açmak ya da icra takibi başlatmak mümkün değildir; önce sicilin ihyası gerekir.',
        ],
        links: [
          { label: 'Şirket duyuruları', href: '/ara?tur=sirket_duyurusu' },
          { label: 'Şirketler dizini', href: '/sirket' },
        ],
      },
      {
        heading: 'İsim değiştirme müracaatı',
        paragraphs: [
          'Şirket aynı tüzel kişilik olarak devam eder, yalnızca unvanı değişir. Sözleşmeleriniz geçerliliğini korur. Eski adla arama yaptığınızda yeni adı da bulabilmeniz için bu kayıtları birbirine bağlıyoruz.',
        ],
      },
      {
        heading: 'Denizaşırı yabancı şirket tescili',
        paragraphs: [
          'Yurt dışında kurulmuş bir şirketin KKTC’de şube açması için yapılan tescildir. Şirketin kendisi yabancı hukuka tabidir, şubesi burada kayıtlıdır.',
        ],
      },
    ],
  },
  {
    slug: 'veriyi-nasil-topluyoruz',
    title: 'Bu site veriyi nasıl topluyor ve doğruluyor',
    summary: 'Kaynaktan sayfaya kadar izlediğimiz yol, hata payı ve yapmadığımız şeyler.',
    description:
      'Mevzuat Kıbrıs’ın Resmî Gazete verisini nasıl indirdiği, metne çevirdiği, sınıflandırdığı ve hangi durumlarda hata yapabildiği.',
    sections: [
      {
        paragraphs: [
          'Bu sitedeki hiçbir kayıt elle yazılmadı. Hepsi KKTC Resmî Gazete’nin kendi yayımladığı PDF’lerden otomatik çıkarıldı. Süreci açık açık anlatmak, hangi bilgiye ne kadar güveneceğinizi bilmeniz için gerekli.',
        ],
      },
      {
        heading: 'Nereden alıyoruz',
        paragraphs: [
          'Kaynak, Devlet Basımevi’nin yıl bazlı arşiv sayfaları. Her sayının numarası, tarihi ve içindekiler dökümü orada yayımlanıyor; PDF’in kendisi de oradan indiriliyor.',
          'Kaynak siteye saniyede birden fazla istek göndermiyoruz ve kendini tanıtan, iletişim adresi içeren bir User-Agent kullanıyoruz.',
        ],
      },
      {
        heading: 'PDF’i saklamıyoruz',
        paragraphs: [
          'PDF geçici olarak indiriliyor, metni çıkarılıyor ve iş bitince siliniyor. Sitedeki her indirme bağlantısı doğrudan orijinal kaynağa gider. Kamuya açık bir belgenin kopyasını tutmanın kimseye faydası yok.',
        ],
      },
      {
        heading: 'Metne çevirme ve hata payı',
        paragraphs: [
          '2018 sonrası sayıların çoğunda PDF’in kendi metin katmanı var ve doğrudan okunabiliyor. Daha eski sayılar taranmış görüntü; bunlarda optik karakter tanıma kullanıyoruz ve hata payı belirgin biçimde yükseliyor.',
          'Her sayı için bir okunabilirlik oranı hesaplıyoruz. Oran düşükse kaydı yine saklıyoruz ama sayfada bunu söylüyoruz. Metni hiç çıkaramadığımız kayıtlarda gövde yerine “metni çıkarılamadı” kutusu görürsünüz; künye ve gazete yeri yine doğrudur.',
          'Okunamayan kayıtları ayda bir yeniden deniyoruz. Başarılı olursa sayfa güncelleniyor ama takipçilere bildirim gitmiyor — bu yeni bir kayıt değil, mevcut kaydın tamamlanması.',
        ],
      },
      {
        heading: 'Özet cümleler',
        paragraphs: [
          'Gazetedeki başlıklar okunması zor kalıplar. Her kayıt için başlıktan kesin olarak çıkarılabilen bir özet cümle üretiyoruz ve bunu kalıcı olarak saklıyoruz; liste, detay, e-posta ve RSS aynı cümleyi gösteriyor.',
          'Özet asla kararın sonucunu bildirmez. “İtirazı karara bağladı” yazarız, “itirazı reddetti” yazmayız — o bilgi gövdededir ve hukuki metinde tahmin yürütmek kabul edilemez.',
          'Gazetenin kendi başlığı her kayıt sayfasında olduğu gibi durur ve kopyalanabilir. Kalıp kısımları soluk, ayırt edici kısımları koyu gösteriyoruz; metin değişmiyor, yalnızca okunması kolaylaşıyor.',
        ],
      },
      {
        heading: 'Kişisel veri',
        paragraphs: [
          'Gazete, atama kararnameleri ve sınav sonuç listeleri gibi kişi adı içeren kayıtlar barındırıyor. Bunlar kamuya açık belgeler olsa da bir arama motoru hâline getirmek farklı bir sorumluluk doğuruyor.',
          'Kişi adına özel sayfa üretmiyoruz. Sınav sonucu ve benzeri listelerde kişi adlarını sayfada göstermiyor, tam liste için orijinal PDF’e yönlendiriyoruz. Kaldırma talebiniz varsa iletişim sayfasından yazın; yedi gün içinde yanıtlıyoruz.',
        ],
      },
      {
        heading: 'Bağlayıcı olan ne',
        paragraphs: [
          'Bu sitedeki hiçbir metin resmî değildir. Hukuken bağlayıcı olan, Resmî Gazete’de yayımlanan orijinal metindir. Her kayıt sayfasında o metnin bulunduğu PDF’e ve sayfa numarasına bağlantı veriyoruz.',
        ],
      },
    ],
    faq: [
      {
        question: 'Bir kayıtta hata gördüm, ne yapmalıyım?',
        answer:
          'İletişim sayfasından kaydın bağlantısıyla birlikte yazın. Ayrıştırma hatalarını düzeltip test setimize ekliyoruz, böylece aynı hata tekrarlanmıyor.',
      },
      {
        question: 'Site ücretli mi olacak?',
        answer:
          'Hayır. Ücretli abonelik, paywall ve kullanım limiti kalıcı olarak kapsam dışı. Tek gelir kaynağı reklam.',
      },
    ],
  },
  {
    slug: 'bakanlar-kurulu-karari-nasil-okunur',
    title: 'Bakanlar Kurulu kararı nasıl okunur',
    summary: 'Arşivdeki en kalabalık belge türü. Bir kararın parçaları ve ne anlama geldikleri.',
    description:
      'KKTC Resmî Gazete’deki Bakanlar Kurulu kararlarının yapısı: karar sayısı, önerge numarası, öneren bakanlık ve karar tarihi.',
    sections: [
      {
        paragraphs: [
          'Bakanlar Kurulu kararları arşivin en kalabalık belge türü: 10.765 kayıt. Gazetede EK IV Bölüm I altında yayımlanırlar ve hepsi aynı iskeleti taşır. İskeleti bir kez öğrenince kararın hangi kısmına bakacağınızı bilirsiniz.',
        ],
        links: [{ label: 'Bakanlar Kurulu kararları', href: '/ara?tur=bakanlar_kurulu_karari' }],
      },
      {
        heading: 'Karar sayısı',
        paragraphs: [
          'İlk satır her zaman “KARAR SAYISI” ile başlar ve kararın numarasını verir: Ü(K-I) 830-2026 gibi. Numaranın önündeki seri harfi kararın hangi seride olduğunu, sonundaki yıl da hangi yıla ait olduğunu söyler. Bir kararı başkasına tarif ederken kullanacağınız numara budur.',
        ],
      },
      {
        heading: 'Başlık',
        paragraphs: [
          'Karar sayısının altındaki büyük harfli satır kararın konusudur. Gazetenin kendi yazdığı hâliyle durur; biz onu değiştirmiyoruz, yalnızca okunabilir bir özet ekliyoruz. Kayıt sayfasında “Gazetedeki başlık, olduğu gibi” kutusunda ham hâlini görebilir ve kopyalayabilirsiniz.',
        ],
      },
      {
        heading: 'Önerge numarası ve öneren makam',
        paragraphs: [
          'Başlığın altında parantez içinde iki satır bulunur: önerge numarası (Önerge No:866/2026 gibi) ve kararı öneren makamın kısaltması. Kısaltmalar bakanlıkları gösterir — M.B. Maliye Bakanlığı, E.E.B. Ekonomi ve Enerji Bakanlığı gibi. Bir konunun hangi bakanlıktan çıktığını merak ediyorsanız bakılacak yer burasıdır.',
        ],
        links: [{ label: 'Kurumlar dizini', href: '/kurum' }],
      },
      {
        heading: 'Karar metni ve tarih',
        paragraphs: [
          'Gövde neredeyse her zaman “Bakanlar Kurulu, …. karar verdi.” kalıbıyla biter ve hemen altında kararın alındığı tarih durur. Bu tarih, kararın Resmî Gazete’de yayımlandığı tarihten farklı olabilir; yayım tarihi kayıt sayfasının künyesinde ayrıca yazar.',
        ],
      },
      {
        heading: 'Aynı konunun iki kaydı',
        paragraphs: [
          'Bir tüzük ya da emirname çoğu zaman iki kez görünür: EK III’te kendi A.E. numarasıyla metin olarak, EK IV’te Bakanlar Kurulu’nun onay kararı olarak. İkisi ayrı kayıt olarak saklanır ama birbirine bağlanır, böylece birinden diğerine geçebilirsiniz.',
        ],
      },
    ],
    faq: [
      {
        question: 'Ü(K-I) ile Ü(K-II) arasındaki fark ne?',
        answer:
          'İki ayrı seri. Birinci seri genel kararları, ikinci seri personel ve istihdam kararlarını taşır. Numaralar her seride ayrı ayrı ilerler.',
      },
      {
        question: 'Karar tarihi ile yayım tarihi neden farklı?',
        answer:
          'Bakanlar Kurulu kararı aldığı gün gazetede yayımlanmaz; yayım birkaç gün sonra olur. Kayıt sayfasındaki tarih yayım tarihidir, metnin sonundaki tarih karar tarihidir.',
      },
    ],
  },
  {
    slug: 'bakanlar-kurulu-donemsel-onekler',
    title: 'E.S(K-I), F.S(K-I), TE(K-I) — dönemsel karar önekleri',
    summary: 'Bakanlar Kurulu kararlarının öneki neden yıldan yıla değişiyor.',
    description:
      'KKTC Bakanlar Kurulu kararlarında kullanılan E.S(K-I), F.S(K-I), F.S(K-III), TE(K-I), S(K-II) ve K(II) öneklerinin hangi dönemlere ait olduğu.',
    sections: [
      {
        paragraphs: [
          'Bakanlar Kurulu kararlarının çoğu Ü(K-I) ve Ü(K-II) önekiyle yayımlanır. Ama arşivi geriye doğru tararsanız başka öneklerle karşılaşırsınız: E.S(K-I), F.S(K-I), F.S(K-III), TE(K-I), S(K-II), K(II). Bunlar farklı belge türleri değil — aynı işin farklı dönemlerdeki yazımıdır.',
        ],
      },
      {
        heading: 'Önek neden değişiyor',
        paragraphs: [
          'Kurulun bileşimi ya da numaralandırma düzeni değiştiğinde önek de değişiyor. Uygulamada bir önekin hangi yıllarda kullanıldığı, o önekli kayıtları tarayarak görülebiliyor: bir önek belli bir dönemde yoğunlaşıyor, sonra yerini başkasına bırakıyor.',
        ],
      },
      {
        heading: 'Aramada ne yapmalı',
        paragraphs: [
          'Bir kararı numarasıyla arıyorsanız öneki de yazın; önek olmadan numara başka serilerdeki kararlarla karışır. Öneki bilmiyorsanız konu veya kurum üzerinden gitmek daha güvenli.',
        ],
        links: [
          { label: 'Bakanlar Kurulu kararları', href: '/ara?tur=bakanlar_kurulu_karari' },
          { label: 'Yıllara göre sayılar', href: '/sayilar' },
        ],
      },
      {
        heading: 'Yazım farkları',
        paragraphs: [
          'Aynı önek gazetenin içindekiler tablosunda ve karar metninde farklı yazılabiliyor: içindekilerde E.S(K-I), metinde E.S.(K-I) gibi, parantezden önce fazladan bir nokta ile. Arama bu farkı yok sayar, yani noktayı doğru koyup koymadığınıza takılmanız gerekmez.',
        ],
      },
    ],
  },
  {
    slug: 'yurttaslik-kararlari',
    title: 'Yurttaşlık kararları Resmî Gazete’de nasıl görünür',
    summary: 'Yurttaşlığa alınma, muhaceret ve pasaport kararları hangi biçimde yayımlanır.',
    description:
      'KKTC Resmî Gazete’de yayımlanan yurttaşlık, muhaceret ve pasaport kararlarının biçimi ve nasıl aranacağı.',
    sections: [
      {
        paragraphs: [
          'Yurttaşlık konusu arşivde 2.956 kayıtla dördüncü sırada. Kayıtların büyük kısmı Bakanlar Kurulu kararı biçimindedir: yurttaşlığa alınma, yurttaşlıktan çıkma, muhaceret işlemleri ve pasaport kararları.',
        ],
        links: [{ label: 'Yurttaşlık kayıtları', href: '/konu/yurttaslik' }],
      },
      {
        heading: 'Kişi adları',
        paragraphs: [
          'Bu kararların bir kısmı kişi adı taşır. Biz kişi adına ayrı sayfa üretmiyoruz — sitede /sirket ve /yer dizinleri var ama /kisi diye bir dizin yok. Bir ad arama sonuçlarında geçebilir, ancak arama sonuç sayfaları arama motorlarına kapalıdır.',
        ],
      },
      {
        heading: 'Toplu listeler',
        paragraphs: [
          'Bazı kararlar tek kişiyi değil, ekli bir cetveldeki onlarca kişiyi kapsar. Gazete bu cetveli kararın ekinde yayımlar. Kaydın gövdesinde cetvelin tamamı bulunmayabilir; tam liste için kaydın orijinal PDF bağlantısını kullanın.',
        ],
        links: [{ label: 'Resmî Gazete sayıları', href: '/sayilar' }],
      },
      {
        heading: 'Kaldırma talebi',
        paragraphs: [
          'Adınızın geçtiği bir kaydın kaldırılmasını isterseniz iletişim sayfasındaki adrese yazabilirsiniz. Kaynak belge resmî ve kamuya açık olduğu için gazetedeki kaydı değiştiremeyiz, ama sitedeki görünürlüğü konuşulabilir.',
        ],
        links: [{ label: 'İletişim', href: '/iletisim' }],
      },
    ],
  },
  {
    slug: 'atama-ve-gorevden-alma-kararnameleri',
    title: 'Atama kararnameleri ve görevden alma',
    summary: 'Kamu görevlerine atama ve görevden alma kararları nasıl yayımlanır, nasıl takip edilir.',
    description:
      'KKTC Resmî Gazete’deki atama kararnameleri ve görevden alma kararlarının biçimi, hangi bölümde yayımlandığı ve nasıl aranacağı.',
    sections: [
      {
        paragraphs: [
          'Arşivde 1.180 atama kararnamesi ve 331 görevden alma kararı var. İkisi de çoğunlukla Bakanlar Kurulu kararı biçiminde çıkar ve kamu görevlerindeki değişiklikleri duyurur.',
        ],
        links: [{ label: 'Atama kayıtları', href: '/konu/atama' }],
      },
      {
        heading: 'Atama kararnamesi',
        paragraphs: [
          'Bir kişinin belirli bir kadroya atanmasını duyurur. Metin genellikle atanan kişinin adını, atandığı görevi ve göreve başlama tarihini içerir. Müsteşar, daire müdürü, elçi ve kurul üyeliği atamaları bu biçimde yayımlanır.',
        ],
        links: [{ label: 'Atama kararnameleri', href: '/ara?tur=atama_kararnamesi' }],
      },
      {
        heading: 'Görevden alma',
        paragraphs: [
          'Görevden alma kararları ayrı bir tür olarak sınıflanır. Bir görevden alma çoğu zaman bir atama kararıyla birlikte yayımlanır — biri boşalan yeri, diğeri yeni geleni duyurur. İkisini birlikte okumak, değişikliğin tamamını görmenizi sağlar.',
        ],
        links: [{ label: 'Görevden alma kararları', href: '/ara?tur=gorevden_alma' }],
      },
      {
        heading: 'Bir kurumu takip etmek',
        paragraphs: [
          'Belirli bir kurumun atamalarını izlemek istiyorsanız kurum sayfasından takip kurabilirsiniz. Yeni bir kayıt yayımlandığında e-posta gelir; e-posta vermek istemiyorsanız aynı akışın RSS’i var.',
        ],
        links: [
          { label: 'Kurumlar dizini', href: '/kurum' },
          { label: 'Takip kurmak', href: '/takip' },
        ],
      },
    ],
  },
  {
    slug: 'sinav-sonuclari-ve-kisisel-veri',
    title: 'Sınav sonuçları ve kişisel veri',
    summary: 'Sonuç listeleri gazetede yayımlanıyor; biz adları neden göstermiyoruz.',
    description:
      'KKTC Resmî Gazete’de yayımlanan sınav sonuç listelerinin nasıl ele alındığı ve kişi adlarının neden sayfada gösterilmediği.',
    sections: [
      {
        paragraphs: [
          'Kamu Hizmeti Komisyonu’nun sınav sonuçları Resmî Gazete’de yayımlanır ve arşivde 1.267 kayıt tutar. Bu listeler kazananların adlarını içerir.',
        ],
        links: [{ label: 'Sınav sonucu kayıtları', href: '/ara?tur=sinav_sonucu' }],
      },
      {
        heading: 'Adları neden göstermiyoruz',
        paragraphs: [
          'Belge kamuya açık olsa da, bir sonuç listesini aranabilir hâle getirmek ayrı bir sorumluluk doğurur: gazetede bir kez yayımlanan ad, arama motorunda kalıcı hâle gelir. Bu yüzden sınav sonucu kayıtlarında ve “yasaklı göçmen” kararlarında kişi adlarını sayfada render etmiyoruz; kaydın var olduğunu ve nerede yayımlandığını gösteriyor, tam liste için orijinal PDF’e yönlendiriyoruz.',
        ],
      },
      {
        heading: 'Sonucu nasıl bulursunuz',
        paragraphs: [
          'Kaydı bulup PDF bağlantısına gidin; gazetenin ilgili sayfası orada. Kayıt sayfası size sayfa numarasını da verir, böylece uzun bir PDF’te aramanız gerekmez.',
        ],
      },
      {
        heading: 'Münhal ile ilişkisi',
        paragraphs: [
          'Bir sınav sonucunun öncesinde çoğu zaman bir münhal ilanı vardır: aynı kadro için açılan başvuru duyurusu. Münhal ilanını aratmak, sürecin başını görmenizi sağlar.',
        ],
        links: [{ label: 'Münhal ilanları', href: '/konu/munhal' }],
      },
    ],
  },
  {
    slug: 'vergi-ve-mali-kayitlar',
    title: 'Vergi ve mali kayıtlar nerede yayımlanır',
    summary: 'Katma değer vergisi oranları, fiyat istikrar fonu ve akaryakıt fiyatlandırması.',
    description:
      'KKTC Resmî Gazete’deki vergi oranları, fon katkı payları ve fiyatlandırma emirnamelerinin nerede yayımlandığı ve nasıl takip edileceği.',
    sections: [
      {
        paragraphs: [
          'Vergi ve mali konu arşivde 3.586 kayıtla ikinci sırada. Buradaki kayıtların çoğu tüzük ve emirname biçimindedir — yani bir yasanın verdiği yetkiye dayanarak çıkarılan, oran ve miktar belirleyen metinler.',
        ],
        links: [{ label: 'Vergi ve mali kayıtlar', href: '/konu/vergi-mali' }],
      },
      {
        heading: 'Sık değişen oranlar',
        paragraphs: [
          'Katma Değer Vergisi oranları, Fiyat İstikrar Fonu katkı payları ve akaryakıt fiyatlandırma esasları düzenli olarak değiştirilir. Bu değişiklikler “(Değişiklik) Tüzüğü” ya da “(Değişiklik) Emirnamesi” adıyla, bazen haftalık sıklıkta yayımlanır.',
        ],
        links: [
          { label: 'Tüzükler', href: '/ara?tur=tuzuk' },
          { label: 'Emirnameler', href: '/ara?tur=emirname' },
        ],
      },
      {
        heading: 'Değişiklik zincirini okumak',
        paragraphs: [
          'Bir değişiklik metni tek başına anlamlı değildir: “Esas Emirnamenin 2’nci maddesi kaldırılmak ve yerine aşağıdaki konmak suretiyle değiştirilir” der. Hangi metni değiştirdiğini kenar boşluğundaki atıf listesinden anlarsınız — orada değiştirilen kararın numarası, tarihi ve hangi Resmî Gazete’de yayımlandığı yazar.',
        ],
      },
      {
        heading: 'Yürürlük tarihleri',
        paragraphs: [
          'Bu metinlerin sonunda çoğu zaman iki tarih bulunur: yürürlüğe giriş ve yürürlükten kalkma. Özellikle akaryakıt ve fon kararlarında yürürlük bir haftalıktır. Bir oranın bugün geçerli olup olmadığını anlamak için o iki tarihe bakın.',
        ],
      },
    ],
  },
  {
    slug: 'gayrimenkul-ve-tasinmaz-kayitlari',
    title: 'Gayrimenkul ve taşınmaz mal kayıtları',
    summary: 'Kamulaştırma, tahsis ve taşınmaz mal kararları hangi biçimde yayımlanır.',
    description:
      'KKTC Resmî Gazete’deki kamulaştırma, arazi tahsisi ve taşınmaz mal kararlarının biçimi ve yer üzerinden nasıl aranacağı.',
    sections: [
      {
        paragraphs: [
          'Gayrimenkul konusu 3.254 kayıt tutuyor. İçinde kamulaştırma ihbar ve emirleri, arazi tahsisleri, kira ve kullanım izinleri var. Çoğu Bakanlar Kurulu kararı, bir kısmı da Zorla Mal İktisabı Yasası altında çıkan emirler.',
        ],
        links: [{ label: 'Gayrimenkul kayıtları', href: '/konu/gayrimenkul' }],
      },
      {
        heading: 'Yer üzerinden aramak',
        paragraphs: [
          'Bu kayıtlar neredeyse her zaman bir köy ya da kasaba adı taşır. Biz bu adları ayıklayıp yer sayfalarına bağlıyoruz, yani bir yerdeki taşınmaz kararlarını tek sayfada görebilirsiniz. Aradığınız yer listede yoksa arama kutusuna yazmak da işe yarar.',
        ],
        links: [{ label: 'Yerler dizini', href: '/yer' }],
      },
      {
        heading: 'Kamulaştırma kayıtları',
        paragraphs: [
          'Kamulaştırma iki aşamalıdır ve her aşama ayrı yayımlanır: önce ihbar, sonra emir. İkisinin farkını ve nasıl takip edileceğini ayrı bir rehberde anlattık.',
        ],
        links: [
          { label: 'Kamulaştırma kayıtları', href: '/ara?tur=kamulastirma' },
          { label: 'Kamulaştırma ihbarı ile emri farkı', href: '/rehber/kamulastirma-ihbari-ile-emri-farki' },
        ],
      },
    ],
  },
  {
    slug: 'arsivde-arama-yapmak',
    title: 'Arşivde arama yapmak — tırnak, eksi, filtreler',
    summary: 'Arama kutusunun anladığı yazım kuralları ve filtrelerin nasıl birleştiği.',
    description:
      'Mevzuat Kıbrıs aramasında tam ifade, dışlama ve alternatif arama nasıl yapılır; konu, belge türü, yıl ve tarih filtreleri nasıl birleşir.',
    sections: [
      {
        paragraphs: [
          'Arama, 24.450 kaydın başlığında ve çıkarılmış gövde metninde çalışır. Basit bir kelime çoğu zaman yeter, ama üç işaret aramayı belirgin şekilde keskinleştirir.',
        ],
        links: [{ label: 'Aramaya git', href: '/ara' }],
      },
      {
        heading: 'Tırnak — tam ifade',
        paragraphs: [
          'Tırnak içine aldığınız sözcükler tam o sırayla aranır. “hizmet alımı” yazarsanız, ikisi ayrı ayrı geçen kayıtlar değil, yan yana geçenler döner. Kalıplaşmış terimlerde ciddi fark yaratır.',
        ],
      },
      {
        heading: 'Eksi — dışlama',
        paragraphs: [
          'Bir kelimenin önüne eksi koyarsanız o kelimeyi içeren kayıtlar elenir. “ihale -iptal” araması, iptal kararlarını sonuçtan çıkarır.',
        ],
      },
      {
        heading: 'Eşanlamlılar ve kök eşleşmesi',
        paragraphs: [
          'Arama Türkçe köklere göre çalışır, yani “atama” yazınca “atanması” geçen kayıtlar da gelir. Ayrıca bir eşanlamlı sözlüğü var: gazetenin resmî terimiyle günlük kullanım farklıysa ikisi birbirine bağlanmıştır. Terimi tam bilmeseniz de sonuç alırsınız.',
        ],
      },
      {
        heading: 'Filtreler birlikte çalışır',
        paragraphs: [
          'Sol raydaki konu, belge türü ve yıl seçimleri arama metniyle birlikte uygulanır ve hepsi adres çubuğuna yazılır — yani bir arama sonucunu olduğu gibi paylaşabilirsiniz. Tarih aralığı verirseniz yıl seçimi uygulanmaz; aralık daha belirgin olduğu için o kazanır.',
        ],
      },
    ],
    faq: [
      {
        question: 'Numarayla arayabilir miyim?',
        answer:
          'Evet. A.E. 1071 ya da Ü(K-I) 830-2026 gibi bir referansı doğrudan yazmak en hızlı yoldur. Noktalama farkları göz ardı edilir.',
      },
      {
        question: 'Arama sonuçları Google’da çıkar mı?',
        answer:
          'Hayır. Arama sonuç sayfaları arama motorlarına kapalıdır; yalnızca kayıtların kendi sayfaları indekslenir.',
      },
    ],
  },
  {
    slug: 'takip-kurmak-eposta-ve-rss',
    title: 'Takip kurmak — e-posta ve RSS',
    summary: 'Bir konuda ya da kelimede yeni kayıt çıktığında nasıl haber alırsınız.',
    description:
      'Mevzuat Kıbrıs’ta konu, kurum ve arama takibi nasıl kurulur; e-posta sıklığı ve RSS akışları nasıl çalışır.',
    sections: [
      {
        paragraphs: [
          'Yeni bir kayıt yayımlandığında haber almanın iki yolu var: e-posta ya da RSS. İkisi de aynı kayıtları aynı sırada verir; fark, adresinizi verip vermemenizde.',
        ],
        links: [{ label: 'Takiplerim', href: '/takip' }],
      },
      {
        heading: 'Neyi takip edebilirsiniz',
        paragraphs: [
          'Bir konuyu (münhal, ihale, şirket gibi), bir kurumu, bir yeri ya da kendi arama kelimenizi takibe alabilirsiniz. Arama takibi, konu listesinde olmayan dar bir ilgi için en kullanışlısı — örneğin belirli bir köyün adı ya da bir şirket unvanı.',
        ],
        links: [
          { label: 'Konular', href: '/konu' },
          { label: 'Kurumlar', href: '/kurum' },
        ],
      },
      {
        heading: 'Sıklık',
        paragraphs: [
          'Haftalık ya da her gün seçebilirsiniz. Haftalık seçerseniz size sabit bir gün atanır ve özet o sabah gelir; hangi gün olduğunu takip kurulurken görürsünüz. Günlük seçenek sınırlıdır, kota dolduğunda talebiniz haftalığa çevrilir ve bu size söylenir.',
        ],
      },
      {
        heading: 'Doğrulama bağlantısı',
        paragraphs: [
          'Takip, e-postadaki bağlantıya tıklayana kadar başlamaz. Önemli bir ayrıntı: bağlantıyı formu doldurduğunuz tarayıcıda açmanız gerekir. E-postayı telefonunuzda açarsanız doğrulama başarısız olur — bu bir hata değil, doğrulamanın güvenlik biçiminden kaynaklanıyor.',
        ],
      },
      {
        heading: 'RSS',
        paragraphs: [
          'E-posta vermek istemiyorsanız her konunun kendi RSS akışı var, sitenin tamamı için de bir akış. Akış adresini okuyucunuza eklemeniz yeterli; adres kaydı ya da doğrulama gerekmez.',
        ],
        links: [{ label: 'Tüm kayıtlar akışı', href: '/rss.xml' }],
      },
    ],
  },
  {
    slug: 'kaydin-orijinal-pdfini-bulmak',
    title: 'Bir kaydın orijinal PDF’ini bulmak',
    summary: 'Bağlayıcı olan gazetenin kendisi. Kaydın PDF’teki yerine nasıl gidersiniz.',
    description:
      'Mevzuat Kıbrıs’taki bir kaydın Resmî Gazete PDF’indeki karşılığına nasıl ulaşılır ve sayfa numarası ne işe yarar.',
    sections: [
      {
        paragraphs: [
          'Bu sitedeki metin, gazetenin PDF’inden otomatik çıkarılmış bir kopyadır. Bağlayıcı olan bizim gösterdiğimiz değil, gazetede yayımlanan resmî metindir. Bu yüzden her kayıt orijinaline bağlanır.',
        ],
      },
      {
        heading: 'PDF bağlantısı',
        paragraphs: [
          'Kayıt sayfasında “Resmî PDF” düğmesi doğrudan Devlet Basımevi’ndeki dosyaya gider. Dosyayı biz barındırmıyoruz; bağlantı her zaman kaynağa çıkar, böylece indirdiğiniz belge gazetenin kendi yayımladığı dosyadır.',
        ],
      },
      {
        heading: 'Sayfa numarası',
        paragraphs: [
          'Düğmenin yanında bir sayfa numarası yazar: “Resmî PDF, sayfa 17” gibi. Bu, kaydın PDF’in kaçıncı sayfasında başladığını söyler. Bazı sayılar yüzlerce sayfa olduğu için bu numara aramanızı kısaltır.',
        ],
      },
      {
        heading: 'Sayının tamamı',
        paragraphs: [
          'Tek bir kaydı değil o günkü gazetenin tamamını görmek istiyorsanız sayı sayfasına gidin: aynı sayıda yayımlanan bütün kayıtlar orada listelenir, bölüm bölüm.',
        ],
        links: [{ label: 'Resmî Gazete sayıları', href: '/sayilar' }],
      },
    ],
  },
  {
    slug: 'metni-olmayan-kayitlar',
    title: 'Neden bazı kayıtların metni yok',
    summary: 'Her kaydın gövde metni çıkarılamıyor. Sebepleri ve ne yapabileceğiniz.',
    description:
      'Mevzuat Kıbrıs’ta bazı kayıtların gövde metninin neden bulunmadığı: basılmamış sayfalar, taranmış sayılar ve bozuk metin katmanları.',
    sections: [
      {
        paragraphs: [
          'Arşivdeki 24.450 kaydın 17.748’inde gövde metni var — yaklaşık dörtte üçü. Kalanında kaydın başlığı, referansı, tarihi ve gazete bağlantısı var ama metin yok. Bunu gizlemiyoruz; kayıt sayfasında “gövde metni çıkarılamadı” diye yazıyor.',
        ],
      },
      {
        heading: 'Gazete o sayfayı basmamış',
        paragraphs: [
          'En sık sebep bu. İçindekiler tablosu bir kaydı listeliyor ama o kaydın metni PDF’te yok — gazete onu başka bir sayıda yayımlamış ya da yalnızca cetvelde anmış. Bizde çıkarılacak bir şey yok demektir.',
        ],
      },
      {
        heading: 'Sayı taranmış',
        paragraphs: [
          'Bazı sayılar metin katmanı olmayan, sayfa görüntülerinden ibaret PDF’lerdir. Bunları optik karakter tanımayla okuyoruz; okuma çoğu zaman başarılı olur ama hata payı taşır. Böyle bir sayıdan gelen kayıtlarda sayfada bir uyarı görürsünüz.',
        ],
      },
      {
        heading: 'Metin katmanı bozuk',
        paragraphs: [
          'Bazı PDF’lerin gömülü yazı tipi bozuktur ve harfler kaydırılmış hâlde çıkar. Bunları çözebiliyoruz, ama çözülemeyen birkaç sayı kalıyor; onları “metin kalitesi düşük” diye işaretliyor ve öyle sunuyoruz.',
        ],
      },
      {
        heading: 'Ne yapabilirsiniz',
        paragraphs: [
          'Metin yoksa da kaydın gazetedeki yeri bellidir. PDF bağlantısını ve sayfa numarasını kullanarak orijinaline gidebilirsiniz. Metnin sonradan çıkarılması da mümkün: okunamayan sayılar yeniden denenmek üzere bir kuyrukta tutulur.',
        ],
        links: [{ label: 'Bu site veriyi nasıl topluyor', href: '/rehber/veriyi-nasil-topluyoruz' }],
      },
    ],
  },
  {
    slug: 'mahkeme-ve-secim-kurulu-duyurulari',
    title: 'Mahkeme duyuruları ve Seçim Kurulu kararları',
    summary: 'Gazetede yayımlanan yargı ve seçim kaynaklı duyurular.',
    description:
      'KKTC Resmî Gazete’de yayımlanan mahkeme duyuruları, Anayasa Mahkemesi kararları ve Yüksek Seçim Kurulu kararlarının biçimi.',
    sections: [
      {
        paragraphs: [
          'Gazete yalnızca yürütmenin kararlarını taşımaz. Yargı ve seçim organlarının duyuruları da burada yayımlanır ve arşivde ayrı türler olarak sınıflanır.',
        ],
      },
      {
        heading: 'Mahkeme duyuruları',
        paragraphs: [
          'Tebligat yapılamayan taraflara ilanen duyuru, iflas ve tasfiye ilanları, tereke duyuruları bu başlıkta çıkar. Bir tarafa ulaşılamadığında gazetede ilan etmek yasal bir tebligat yolu olduğu için bu duyurular hukuken sonuç doğurur.',
        ],
        links: [{ label: 'Mahkeme duyuruları', href: '/ara?tur=mahkeme_duyurusu' }],
      },
      {
        heading: 'Anayasa Mahkemesi kararları',
        paragraphs: [
          'Gazetenin EK II bölümü Anayasa Mahkemesi kararlarına ayrılmıştır. Sayıca az ama etkisi geniş kararlardır: bir yasa kuralının iptali buradan duyurulur.',
        ],
        links: [{ label: 'Anayasa Mahkemesi kararları', href: '/ara?tur=anayasa_mahkemesi_karari' }],
      },
      {
        heading: 'Seçim Kurulu kararları',
        paragraphs: [
          'Yüksek Seçim Kurulu kararları seçim takvimi, aday listeleri ve sandık düzeni gibi konuları duyurur. Seçim dönemlerinde yoğunlaşır, arada seyrekleşir; arşivde 464 kayıt tutuyor.',
        ],
        links: [{ label: 'Seçim Kurulu kararları', href: '/ara?tur=secim_kurulu_karari' }],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
