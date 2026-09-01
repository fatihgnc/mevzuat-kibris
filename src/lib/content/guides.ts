/**
 * Guide content — spec 9.7.
 *
 * These are hand-written, original texts. They do two jobs: teach the user, and
 * show the site is not "just scraped content" (spec 14.5 rule 2). The AdSense
 * application is not submitted before all eight guides are published.
 */

export interface GuideSection {
  heading?: string;
  paragraphs: string[];
  list?: string[];
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
      },
      {
        heading: 'Ek II — Anayasa Mahkemesi',
        paragraphs: [
          'Anayasa Mahkemesi kararları burada yayımlanır. Bir yasa maddesinin iptal edildiğini öğrenmenin resmî yolu bu bölümdür.',
        ],
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
      },
      {
        heading: 'Ek V — şirketler ve markalar',
        paragraphs: [
          'Bölüm I şirket sicil silme işlemlerini, Bölüm II ticaret markası resmî ilanlarını içerir. Bir şirketin tasfiyeye girdiğini ya da bir markanın tescil için ilan edildiğini buradan öğrenirsiniz.',
        ],
      },
      {
        heading: 'Ek VI — yasa tasarıları ve önerileri',
        paragraphs: [
          'Henüz yasalaşmamış metinler. Y.T.NO ile numaralananlar hükümetin sunduğu tasarılar, Y.Ö.NO ile numaralananlar milletvekili önerileridir. Burada yayımlanmış olmak yürürlükte olmak anlamına gelmez.',
        ],
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
      },
      {
        heading: 'Ü(K-I) ve Ü(K-II)',
        paragraphs: [
          'Bakanlar Kurulu kararlarıdır. İki ayrı seri hâlinde numaralanır ve numara yılla birlikte yazılır: Ü(K-I) 2497-2025. Birinci seri genel kararları, ikinci seri personel ve istihdam kararlarını taşır.',
        ],
      },
      {
        heading: 'Ş.M.',
        paragraphs: [
          'Şirketler Mukayyitliği işlemleridir: tescil, isim değişikliği, tasfiye, sicilden silinme. Bir şirket adını arattığınızda bu numaralı kayıtları görürsünüz.',
        ],
      },
      {
        heading: 'Y.T.NO ve Y.Ö.NO',
        paragraphs: [
          'Y.T.NO yasa tasarısı, Y.Ö.NO yasa önerisidir. Üç parçalı yazılır: Y.T.NO:332/5/2025. Bunlar Meclis’e sunulmuş ama henüz yasalaşmamış metinlerdir.',
        ],
      },
      {
        heading: 'GENELGE MİA',
        paragraphs: [
          'Maliye Bakanlığı genelgeleri bu önekle yayımlanır: GENELGE MİA.32/2025. Kamu kurumlarının bütçe ve harcama işlemlerini düzenler.',
        ],
      },
      {
        heading: 'DÜZELTME',
        paragraphs: [
          'Önceki bir kaydın hatasını düzelten ilanlardır. Kendi numarası yoktur; düzelttiği kayda atıf yapar. Biz bu kayıtları kaynak kayda bağlıyoruz, böylece bir kararı okurken sonradan düzeltildiğini görebiliyorsunuz.',
        ],
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
      },
      {
        heading: 'Emirname',
        paragraphs: [
          'Genellikle sayısal değerleri belirler: fiyat, oran, bedel, tarife. Tüzükten daha dar ve daha sık değişir. Fiyat İstikrar Fonu’na yatırılacak miktarlar ya da su kullanım bedelleri emirnameyle düzenlenir.',
        ],
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
      },
      {
        heading: 'İhale ilanı',
        paragraphs: [
          'İhalenin konusu, işi yaptıracak kurum, şartname bedeli ve teklif verme süresi bulunur. Hizmet alımı, yapım işi ve mal alımı ayrı kategorilerdir.',
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
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((guide) => guide.slug === slug);
}
