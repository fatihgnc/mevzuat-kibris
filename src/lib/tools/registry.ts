/**
 * Hesaplayıcıların kaydı — spec 9.7'deki rehberlerin yaptığı işi araçlar için yapar.
 *
 * TEK LİSTE. Başlık, meta açıklama, header açılır menüsü, footer sütunu, hub
 * sayfasındaki kartlar ve sitemap girdileri hep buradan okuyor. Ayrı ayrı
 * yazılsalardı yeni bir araç eklemek altı dosyaya dokunmak olurdu ve biri
 * unutulduğunda hata sessiz kalırdı: sayfa yayında olur ama hiçbir yerden
 * linklenmezdi.
 */

export interface LegalReference {
  /** "22/1992 İş Yasası" */
  law: string;
  /** "Madde 43" */
  article: string;
  /** Maddenin ne dediğinin bir cümlelik özeti. */
  summary: string;
}

export interface ToolSource {
  label: string;
  href: string;
  /** Kaynağın ne olduğu — "resmî metin", "ikincil derleme" ayrımı okunabilsin. */
  note?: string;
}

export interface ToolFaq {
  question: string;
  answer: string;
}

/** An internal link to a Resmî Gazete record in the archive. */
export interface ToolRecordLink {
  label: string;
  /** A site path such as `/karar/...`. */
  href: string;
  note?: string;
}

export interface RelatedTool {
  slug: string;
  /** Why someone using this tool should look there too — one sentence. */
  reason: string;
}

export interface Tool {
  slug: string;
  /**
   * The day the rates, articles or text last ACTUALLY changed (`YYYY-MM-DD`).
   * Shown as "Son güncelleme" on the page and used as the sitemap's
   * `lastModified`; do not bump it for a typo fix, or both lose their meaning.
   */
  updatedAt: string;
  /** Tools used alongside this one, each with its reason. */
  related: readonly RelatedTool[];
  /** Archive records that set the rates or amounts the tool relies on. */
  records?: readonly ToolRecordLink[];
  /** Menüde ve kartta görünen kısa ad. */
  name: string;
  /** Sayfanın h1'i. */
  heading: string;
  /** `<title>` — hedef arama terimi burada geçiyor. */
  title: string;
  /** Kart altındaki tek satır. */
  summary: string;
  /** Meta açıklama. */
  description: string;
  /** h1 altındaki giriş paragrafı. */
  intro: string;
  legal: readonly LegalReference[];
  sources: readonly ToolSource[];
  /**
   * Who to ask in a concrete case, in the dative ("Çalışma Dairesi’ne"). The
   * disclaimer used to name the Labour Department for every tool, which was
   * wrong advice for a land registry fee.
   */
  authority?: string;
  /**
   * The share card's bottom line, when listing every article of the first law
   * would not fit — the title deed tool cites six parts of one Cetvel.
   */
  ogFooter?: string;
  /** Araca özel varsayımlar — ortak feragatnamenin içine giriyor. */
  assumptions: readonly string[];
  limitations: readonly string[];
  /**
   * Sık sorulanlar.
   *
   * Hesaplayıcının cevaplamadığı ama arama kutusuna yazılan soruları
   * karşılıyor: "fazla mesai zammı yüzde kaç", "altı ayı doldurmadan izin
   * hakkım var mı". Her cevap, sayfanın geri kalanı gibi bir madde numarasına
   * bağlanıyor — dayanağı yazılmayan bir cevap, bu sitede kayıt özetlerinden
   * ayırt edilemez hale gelirdi.
   */
  faq: readonly ToolFaq[];
}

const LABOUR_LAW_SOURCE: ToolSource = {
  label: '22/1992 İş Yasası (birleştirilmiş güncel metin)',
  href: '/yasa/22-1992-is-yasasi',
  note: '30/1993, 25/2000, 51/2002, 15/2004, 50/2010 ve 23/2015 değişiklikleriyle',
};

export const TOOLS: readonly Tool[] = [
  {
    slug: 'tapu-harci-hesaplayici',
    updatedAt: '2026-10-07',
    related: [],
    authority: 'İlçe Tapu Amirliği’ne',
    ogFooter: 'Tapu ve Kadastro Dairesi (Harçlar ve Ücretler) Tüzüğü  ·  Pul Yasası  ·  Gelir Vergisi Yasası',
    records: [
      {
        label: 'Tapu harç cetvelinin tamamı — A.E. 217 (2024)',
        href: '/karar/2024-ae-217-tapu-ve-kadastro-dairesi-harc-ve-ucretler-yasasi-tapu-ve-kadastro',
        note: 'Bağış, ipotek ve diğer işlemlerin oranları',
      },
      {
        label: 'KKTC vatandaşları %6 ve bir defalık %3 — A.E. 540 (2024)',
        href: '/karar/2024-ae-540-tapu-ve-kadastro-dairesi-harc-ve-ucretler-yasasi-tapu-ve-kadastro',
      },
      {
        label: 'TC vatandaşları ve yabancılar için oranlar — A.E. 385 (2025)',
        href: '/karar/2025-ae-385-tapu-ve-kadastro-dairesi-harc-ve-ucretler-yasasi-tapu-ve-kadastro',
        note: 'Sözleşme kaydı ve devir aşamalarının tablosu',
      },
      {
        label: 'İlk konut muafiyetinin 2026 sonuna uzatılması — A.E. 186 (2026)',
        href: '/karar/2026-ae-186-tapu-ve-kadastro-dairesi-harc-ve-ucretler-yasasi-tapu-ve-kadastro',
      },
      {
        label: 'Güvenlik Kuvvetlerini Güçlendirme Kurumu (Değişiklik) Yasası — 21/2025',
        href: '/karar/2025-x-97-2-kktc-guvenlik-kuvvetlerini-guclendirme-kurumu-degisiklik-yasasi',
        note: 'Taşınmaz devrinde binde 0,5 / binde 1 pay',
      },
      {
        label: 'Pul (Değişiklik) Yasası — 2/2026',
        href: '/karar/2026-x-23-13-pul-degisiklik-yasasi',
        note: 'Sözleşme pul vergisi eşiği 89.000.000 TL',
      },
      {
        label: '2025 Yılı Katma Değer Vergisi Oranları Tüzüğü — A.E. 1127 (2024)',
        href: '/karar/2024-ae-1127-katma-deger-vergisi-yasasi-2025-yili-katma-deger-vergisi-oranlar',
      },
    ],
    name: 'Tapu harcı hesaplayıcı',
    heading: 'Tapu harcı hesaplayıcı',
    title: 'KKTC Tapu Harcı Hesaplama 2026',
    summary:
      'Satış, bağış, ipotek ve takasta tapu harcını; pul vergisi, KDV ve satıcı stopajıyla birlikte hesaplar.',
    description:
      'KKTC’de tapu harcı: KKTC vatandaşı, TC vatandaşı ve yabancı alıcılar için satış harcını, bir defalık %3 hakkını, ilk konut muafiyetini, bağış, ipotek, takas, zamanaşımı ve kamulaştırma harcını, sözleşme pul vergisini, yeni konutta KDV’yi ve satıcının gelir vergisi stopajını Resmî Gazete’deki güncel oranlarla hesaplayın.',
    intro:
      'Tapu harcı oranları yasada değil, Bakanlar Kurulu’nun sık sık değiştirdiği harç cetvelinde. Bu yüzden internetteki tabloların çoğu eski oranları gösteriyor. Bu araç oranları doğrudan Resmî Gazete’deki son değişikliklerden alıyor; alıcının uyruğu ve kaçıncı taşınmazı olduğu oranı değiştiriyor.',
    legal: [
      {
        law: 'Tapu ve Kadastro Dairesi (Harçlar ve Ücretler) Tüzüğü',
        article: 'Cetvel madde 3(1)(B)',
        summary:
          'Satışta harcı alıcı öder; satış bedeli ile İlçe Tapu Amirliği’nin belirlediği rayiç değerden yüksek olanı üzerinden alınır. KKTC vatandaşları %6 (A.E. 540/2024). TC vatandaşları ilk taşınmazda %6, ikincide %8, üçüncüde %9; ilk üçü apartman dairesiyse dördüncü–altıncı daire %9. Diğer yabancılar ilk üç taşınmazda %9 (A.E. 385/2025).',
      },
      {
        law: 'Tapu ve Kadastro Dairesi (Harçlar ve Ücretler) Tüzüğü',
        article: 'A.E. 385/2025 ek cetvel',
        summary:
          'TC vatandaşı ve yabancı alıcıda satış sözleşmesi önce Tapu’ya kaydedilirse harcın bir kısmı kayıtta, kalanı devirde alınır: yabancılarda 6+3, 3+6, 3+6; TC vatandaşlarında 3+3, 2+6, 3+6. Harç ödenmeden kaydedilmiş sözleşmenin devrinde toplamın tamamı alınır.',
      },
      {
        law: 'Tapu ve Kadastro Dairesi (Harçlar ve Ücretler) Tüzüğü',
        article: 'Cetvel madde 3(1)(D)',
        summary:
          'Bağışta anne veya babadan çocuğa %0,2; eşler arasında ve büyükanne/büyükbabadan toruna %0,4; diğer bağışlarda %6. Harç, devralanın işlem günü bildirdiği rayiç değer üzerinden alınır. KKTC vatandaşları bir defaya mahsus bir ev (bir dönüm alanıyla) ve bir arsa — ya da arsa yerine bir dönüm tarla veya 300 m²’ye kadar işyeri — için satışta veya bağışta %3 öder (A.E. 540/2024).',
      },
      {
        law: 'Tapu ve Kadastro Dairesi (Harçlar ve Ücretler) Tüzüğü',
        article: 'Cetvel madde 3(1)(A), (C), (Ç) ve 3(2)',
        summary:
          'Zamanaşımı yoluyla kazanılan hakkın kaydı %5. Değiştirmede (takas) her kişinin aldığı mal üzerinden %3, eşit değerli olmayan mallarda ek olarak fark üzerinden %4. Kamulaştırma ve geçit istimlakında tazminat üzerinden Devlet dışındaki kamu kuruluşlarında %4, özel kişi ve kuruluşlarda %6. Mal Değer Belgeli puanlarda satış %6, çocuğa bağış %0,2, eşe ve toruna %0,4, diğer bağış %6 (A.E. 217/2024).',
      },
      {
        law: 'Tapu ve Kadastro Dairesi (Harçlar ve Ücretler) Tüzüğü',
        article: 'Cetvel madde 4',
        summary:
          'İpotek kaydında borçlu, ipotekle güvence altına alınan miktarın %1’ini öder. İpotek devrinde harç %0; ipoteğin kaldırılması 149 TL (A.E. 217/2024).',
      },
      {
        law: 'Tapu ve Kadastro Dairesi (Harçlar ve Ücretler) Tüzüğü',
        article: 'Geçici madde 1',
        summary:
          'Adına kayıtlı evi olmayan ve Merkez Bankası koşullarındaki düşük faizli TL konut kredisi başvurusu bankaca uygun görülen KKTC vatandaşı, satış ve ipotek harcının 100.000 £ karşılığı TL’ye kadar olan kısmından 31.12.2026’ya kadar muaftır. Devir günündeki Merkez Bankası efektif satış kuru esas alınır; aşan kısım için harç ödenir (A.E. 186/2026).',
      },
      {
        law: 'Tapu ve Kadastro Dairesi (Harçlar ve Ücretler) Tüzüğü',
        article: 'Cetvel madde 2 ve 11',
        summary:
          'Yerel araştırma istemeyen ve kayıt gerektiren dilekçe 71 TL; her koçan, ipotek sertifikası ve haciz belgesi 149 TL (A.E. 217/2024).',
      },
      {
        law: '24/1982 Gelir Vergisi Yasası',
        article: 'Madde 4(5), 6(12) ve 31(1)(i)-(j)',
        summary:
          'Taşınmaz satış kazancı, Tapu’nun saptadığı rayiç değer ile satış bedelinden yüksek olanın %20’si sayılır. Kişilerde bu kazancın %30’u vergiden muaftır (Bakanlar Kurulu her Ocak’ta %60’a kadar artırabilir); alım-satımla uğraşanlarda ve şirketlerde indirim yoktur. Tapu, devir anında kalan kazancın %20’sini keser: bedelin %2,8’i veya %4’ü. Eşe veya çocuklara bağışta ve yabancılar ile alım-satımla uğraşanlar hariç bir defaya mahsus bir ev ve bir arsanın elden çıkarılmasında kazanç aranmaz (madde 4(1)(f)(i), 31/2025 ile değişik).',
      },
      {
        law: '13/1981 Güvenlik Kuvvetlerini Güçlendirme Kurumu Yasası',
        article: 'Madde 6(3)(ğ)',
        summary:
          'Tüm taşınmaz mal devir işlemlerinde alıcı, yabancı uyruklu ise satış bedelinin binde biri, yurttaş ise binde 0,5’i oranında Güçlendirme Kurumu payı öder; Tapu tahsil eder (21/2025 ile eklendi, 9 Mayıs 2025).',
      },
      {
        law: '52/2008 Taşınmaz Mal Edinme ve Uzun Vadeli Kiralama (Yabancılar) Yasası',
        article: 'Madde 8(1) ve 8(4)',
        summary:
          'Yabancılar Bakanlar Kurulu izniyle kural olarak 1 taşınmaz alabilir; KKTC’yi tanıyan ve aynı hakkı KKTC yurttaşlarına veren ülkelerin vatandaşlarına 3 apartman dairesine kadar izin verilebilir. İzin başvurusunda yürürlükteki aylık brüt asgari ücretin yarısı tutarında hizmet harcı ödenir (39/2024 ile değişik).',
      },
      {
        law: '19/1963 Pul Yasası',
        article: 'Birinci Cetvel madde 3(1)',
        summary:
          'Belli bir para tutarını koşula bağlayan anlaşmalarda tutarın ilk 89.000.000 TL’si binde beş, aşan kısmı binde bir pul vergisine tabidir (2/2026 ile değişik).',
      },
      {
        law: '2025 Yılı Katma Değer Vergisi Oranları Tüzüğü',
        article: 'Cetvel II madde 17, Cetvel III madde 23',
        summary:
          'Her türlü taşınmaz ve kapalı alanı 300 m²’ye kadar olan konut %5; 300 m² ve üzeri kapalı alanlı konut %10 KDV’ye tabidir.',
      },
    ],
    sources: [
      {
        label: 'Fasıl 219 Tapu ve Kadastro Dairesi (Harç ve Ücretler) Yasası',
        href: '/yasa/fasil-219-tapu-ve-kadastro-dairesi-harc-ve-ucretler-yasasi',
        note: 'Esas yasa; oranlar bu metinde değil, yukarıdaki tüzük kayıtlarında',
      },
      {
        label: '19/1963 Pul Yasası (birleştirilmiş metin)',
        href: '/yasa/19-1963-pul-yasasi',
        note: '2/2026 değişikliğiyle',
      },
      {
        label: '47/1992 Katma Değer Vergisi Yasası',
        href: '/yasa/47-1992-katma-deger-vergisi-yasasi',
      },
      {
        label: '24/1982 Gelir Vergisi Yasası (birleştirilmiş metin)',
        href: '/yasa/24-1982-gelir-vergisi-yasasi',
        note: '31/2025 ve 25/2026 değişiklikleriyle',
      },
      {
        label: '52/2008 Taşınmaz Mal Edinme ve Uzun Vadeli Kiralama (Yabancılar) Yasası',
        href: '/yasa/52-2008-tasinmaz-mal-edinme-ve-uzun-vadeli-kiralama-yabancilar',
        note: '39/2024 değişikliğiyle',
      },
    ],
    assumptions: [
      'Rayiç değeri girmezseniz harç satış bedeli üzerinden hesaplanır. Tapu’nun saptayacağı rayiç değer daha yüksekse harç da yükselir.',
      'Yabancı para cinsinden tutarlar girdiğiniz kurla TL’ye çevrilir; Tapu işlem günündeki kuru esas alır.',
      'İlk konut muafiyeti satış harcına ve aynı işlemde konan ipoteğin harcına ayrı ayrı uygulanır; her birinde tutarın 100.000 £ karşılığına kadar olan kısmı muaf sayılır.',
      'Pul vergisi ve KDV sözleşmedeki satış bedeli üzerinden hesaplanır.',
      'Takasta değer farkı harcını, daha değerli taşınmazı alan tarafın ödediği varsayılır.',
      'Sabit harçlar olarak yalnızca bir kayıt dilekçesi ve bir koçan (ya da ipotek sertifikası) eklenir.',
      'Satın alma izni hizmet harcı, yürürlükteki aylık brüt asgari ücret üzerinden hesaplanır.',
    ],
    limitations: [
      'Ortağı olduğu şirkete taşınmaz devri (Cetvel madde 3(1)(E)) hesaplanmaz: A.E. 217/2024 bu bendin oranını basmamış, sonraki değişiklikler de eklememiş. Oranı İlçe Tapu Amirliği’nden öğrenin.',
      'Takas ve kamulaştırma yoluyla elden çıkarmada da satıcı stopajı doğabilir; araç stopajı yalnızca satış ve bağış için hesaplar.',
      'Avukat ve emlakçı ücretleri gibi resmî olmayan masraflar dahil değildir.',
    ],
    faq: [
      {
        question: 'KKTC’de tapu harcı yüzde kaç?',
        answer:
          'Alıcının uyruğuna göre değişiyor. KKTC vatandaşları %6 öder; ömürde bir kez bir ev ve bir arsa için %3. TC vatandaşları ilk taşınmazda %6, ikincide %8, üçüncüde %9 öder. Diğer yabancılar her üç taşınmazda %9 öder. Oranlar A.E. 540/2024 ve A.E. 385/2025 sayılı tüzük değişikliklerinden. Satışta buna ek olarak, 21/2025 ile getirilen Güçlendirme Kurumu payı alınıyor: yurttaşlardan satış bedelinin binde 0,5’i, yabancılardan binde biri.',
      },
      {
        question: 'Tapu harcını alıcı mı satıcı mı öder?',
        answer:
          'Alıcı. Harç cetvelinin 3’üncü maddesi, kayıt harçlarının “adına kayıt yaptıracak kişi tarafından” ödeneceğini söylüyor. İpotek harcını ise madde 4 uyarınca ipotekli borçlu öder.',
      },
      {
        question: 'Tapu harcı satış bedeli üzerinden mi alınır?',
        answer:
          'Satış bedeli ile İlçe Tapu Amirliği’nin belirlediği rayiç değerden hangisi yüksekse onun üzerinden. Sözleşmeye düşük bedel yazmak harcı düşürmez; Tapu rayiç değeri esas alır.',
      },
      {
        question: 'Bir defalık %3 indiriminden kimler yararlanabilir?',
        answer:
          'Yalnızca KKTC vatandaşları. A.E. 540/2024, indirimi bir ev (bir dönüm alanıyla birlikte) ve bir arsa — ya da arsa yerine bir dönüm tarla veya 300 m²’ye kadar işyeri — için, satışta veya bağışla alındığında bir defaya mahsus tanıyor. Önceki metin TC vatandaşlarını da kapsıyordu; 14 Haziran 2024’ten beri kapsamıyor.',
      },
      {
        question: 'İlk evini alanlar tapu harcı öder mi?',
        answer:
          'Merkez Bankası koşullarındaki düşük faizli TL konut kredisini kullanan ve adına kayıtlı evi olmayan KKTC vatandaşları, satış ve ipotek harcının 100.000 £ karşılığı TL’ye kadar olan kısmından muaf. Muafiyet A.E. 186/2026 ile 31 Aralık 2026’ya kadar uzatıldı. Değerin 100.000 £’u aşan kısmı için harç ödenir.',
      },
      {
        question: 'Yabancılar için tapu harcı ne kadar?',
        answer:
          'A.E. 385/2025’ten beri %9; önceden %12’ydi. Satış sözleşmesi önce Tapu’ya kaydedilirse ilk taşınmazda %6 kayıtta, %3 devirde ödenir; doğrudan devirde %9 bir seferde alınır.',
      },
      {
        question: 'Çocuğuma ev bağışlarsam ne kadar harç öderim?',
        answer:
          'Anne veya babadan çocuğa bağışta rayiç değerin binde ikisi (%0,2). Eşler arasında ve büyükanne/büyükbabadan toruna binde dört (%0,4), diğer bağışlarda %6. Harç, devralanın işlem günü bildirdiği rayiç değer üzerinden alınır.',
      },
      {
        question: 'Yeni konut alırken KDV ödenir mi?',
        answer:
          'Satıcı KDV mükellefiyse, örneğin müteahhitten alınan yeni konutta, evet. 2025 Yılı KDV Oranları Tüzüğü’ne göre kapalı alanı 300 m²’ye kadar olan konut ve diğer taşınmazlar %5, 300 m² ve üzeri konut %10. İki kişi arasındaki ikinci el satışta KDV yoktur.',
      },
      {
        question: 'Ev satan kişi ne kadar vergi öder?',
        answer:
          'Tapu, devir sırasında satıcıdan gelir vergisi stopajı keser. Gelir Vergisi Yasası’na göre kazanç, rayiç değer ile satış bedelinden yüksek olanın %20’si sayılıyor; alım-satımla uğraşmayan kişilerde bunun %30’u indiriliyor ve kalan üzerinden %20 kesiliyor. Sonuç bedelin %2,8’i. Şirketlerde ve alım-satımla uğraşanlarda indirim olmadığı için %4. Yabancılar dışındaki kişiler bir defaya mahsus bir ev ve bir arsayı stopajsız satabilir.',
      },
      {
        question: 'Takasta tapu harcı nasıl hesaplanır?',
        answer:
          'Harç cetvelinin 3(1)(C) bendine göre her taraf, aldığı taşınmazın değeri üzerinden %3 öder. Değerler eşit değilse fark üzerinden ayrıca %4 alınır.',
      },
      {
        question: 'Yabancılar KKTC’de kaç taşınmaz alabilir?',
        answer:
          '52/2008 sayılı Yasa’nın 39/2024 ile değişik 8’inci maddesine göre Bakanlar Kurulu izniyle kural olarak bir taşınmaz: en çok 1.338 m² arsa, arazisi 3.300 m²’yi geçmeyen bir müstakil ev ya da bir apartman dairesi. KKTC’yi tanıyan ve aynı hakkı KKTC yurttaşlarına veren ülkelerin vatandaşlarına üç apartman dairesine kadar izin verilebilir. İzin başvurusunda aylık brüt asgari ücretin yarısı kadar hizmet harcı ödenir.',
      },
    ],
  },
  {
    slug: 'ithal-arac-vergisi-hesaplayici',
    updatedAt: '2026-10-07',
    related: [],
    authority: 'Gümrük ve Rüsumat Dairesi’ne',
    ogFooter: 'Gümrük vergisi  ·  Fiyat İstikrar Fonu  ·  rıhtım harcı  ·  KDV  ·  kayıt harcı',
    records: [
      {
        label: 'Fiyat İstikrar Fonu oranları (5 Ekim 2026) — A.E. 938',
        href: '/karar/2026-ae-938-fiyat-istikrar-fonu-yasasi-2026-fiyat-istikrar-fonu-akaryakit',
        note: 'Binek otomobilde motor hacmine göre %3–12, elektrikli %5',
      },
      {
        label: 'Gümrük Vergi Oranları (Değişiklik) Tüzüğü — A.E. 464 (2026)',
        href: '/karar/2026-ae-464-gumruk-vergileri-tarife-yasasi-gumruk-vergi-oranlari-degisiklik-tuzugu',
        note: '87.03 pozisyonu, AB-EFTA ve genel sütunlar',
      },
      {
        label: '2025 Yılı Katma Değer Vergisi Oranları Tüzüğü — A.E. 1127 (2024)',
        href: '/karar/2024-ae-1127-katma-deger-vergisi-yasasi-2025-yili-katma-deger-vergisi-oranlar',
      },
      {
        label: 'KDV Oranları (Değişiklik) Tüzüğü — A.E. 920 (2026)',
        href: '/karar/2026-ae-920-katma-deger-vergisi-yasasi-2025-yili-katma-deger-vergisi-oranlari',
        note: 'Yeni iş araçlarına %0 KDV (Cetvel I madde 23)',
      },
      {
        label: 'Yaş Sınırlandırılması (Değişiklik) Tüzüğü — A.E. 416 (2026)',
        href: '/karar/2026-ae-416-dis-ticaret-duzenleme-ve-denetim-yasasi-motorlu-tasit-araclari-yas',
        note: 'Klasik iş araçlarında yaş sınırı istisnası',
      },
      {
        label: 'Motorlu araç kayıt ve ruhsat harçları — A.E. 388 (2026)',
        href: '/karar/2026-ae-388-motorlu-araclar-ve-yol-trafik-yasasi-motorlu-araclar-kayit-ve-ruhsat',
      },
      {
        label: '2026 gelir vergisi stopaj oranları (ithalat) — A.E. 409',
        href: '/karar/2026-ae-409-gelir-vergisi-yasasi-gelir-vergisi-stopaj-oranlari',
      },
      {
        label: '2021 Rıhtım Harçlarının Oranları (Değişiklik) Tüzüğü — A.E. 479',
        href: '/karar/2021-ae-479-rihtim-harclari-yasasi-2021-rihtim-harclarinin-oranlari-degisiklik',
        note: 'Değişiklik zincirinin son halkası; oranlara dokunmuyor',
      },
    ],
    name: 'İthal araç vergisi hesaplayıcı',
    heading: 'İthal araç vergisi hesaplayıcı',
    title: 'KKTC Araç İthalatı Vergi Hesaplama 2026',
    summary:
      'Yurt dışından getirilen otomobil, klasik araç, pikap, kamyon veya motosikletin gümrük vergisini, fonunu, rıhtım harcını, KDV’sini ve kayıt harcını hesaplar.',
    description:
      'KKTC’ye araç ithalatında ödenecek vergiler: otomobil, klasik araç, pikap, kamyon ve motosiklette menşe ve motor hacmine göre gümrük vergisi, Fiyat İstikrar Fonu, %4,4 rıhtım harcı, %2,5 Güvenlik Kuvvetleri payı, KDV, kayıt harcı ve ilk yıl seyrüseferi Resmî Gazete’deki güncel oranlarla hesaplayın; engelli muafiyetlerini ve yaş sınırını kontrol edin.',
    intro:
      'KKTC’de otomobilde motor hacmine göre alınan ayrı bir tüketim vergisi yok; o yükü Fiyat İstikrar Fonu taşıyor ve oranları yılda birkaç kez değişiyor. Bu araç bütün kalemleri CİF değeri üzerinden, her birinin dayandığı Resmî Gazete kaydıyla hesaplıyor; pikap, kamyon ve motosikletin kendi oranları, klasik araç kuralları, yabancılar için geçici “ZZ” kaydı, yeni iş aracı muafiyetleri, engelli muafiyetleri ve yerleşmeye gelenlerin yaş istisnası da dahil.',
    legal: [
      {
        law: 'Gümrük Vergi Oranları (Değişiklik) Tüzüğü',
        article: '87.03 pozisyonu',
        summary:
          'Binek otomobilde genel oran %10. AB-EFTA sütununda benzinli 2000 cm³’e, dizel 2500 cm³’e kadar muaf, üzeri %10; hibrit ve tamamen elektrikli araçlar muaf. Pikapta (87.04.21/31) AB-EFTA muaf, genel sütunda dizel 2500, benzinli 2800 cm³’e kadar %10, üzeri %22. Brüt ağırlığı 5 tonu aşan kamyonda AB-EFTA muaf, genel sütunda %22, elektrikli %10. Motosiklette AB-EFTA muaf, genel sütunda 250 cm³’e kadar %14,5, üzeri ve elektrikliler %6. Yeni ve kullanılmış aynı oranda (A.E. 464, 25.05.2026).',
      },
      {
        law: '44/1996 Gümrük Vergileri Tarife Yasası',
        article: 'Madde 7',
        summary:
          'AB ve EFTA sütunundaki oranlar, menşei TC, AB veya EFTA olan ve menşe ve dolaşım belgeleri ibraz edilen mallara uygulanır. Belge sunulmazsa genel oran alınır; belge üç ay içinde sunulursa fazla ödenen vergi iade edilir.',
      },
      {
        law: '2026 Fiyat İstikrar Fonu (Fona Yatırılacak Miktarlar) (Değişiklik) Emirnamesi',
        article: '87.03 (A)',
        summary:
          'Binek otomobilde silindir hacmi 1500 cm³’e kadar %3, 1500–2000 cm³ %3, 2000–3000 cm³ %8, 3000 cm³ üzeri %12; elektrikli motorlu taşıtlar %5. TC menşeli araçlara ilk dilimin %50’si, diğer dilimlerin %70’i uygulanır (A.E. 938, 5 Ekim 2026’dan itibaren).',
      },
      {
        law: '2026 Fiyat İstikrar Fonu (Fona Yatırılacak Miktarlar) (Değişiklik) Emirnamesi',
        article: '87.03 istisna (a)',
        summary:
          'Eski Eserler ve Müzeler Dairesi onayıyla klasik araba kapsamına giren, 25 yaşını doldurmuş araçlardan mevcut oranlar dikkate alınmaksızın araç başına 750 TL spesifik ve %6 ad valorem fon alınır.',
      },
      {
        law: '2026 Fiyat İstikrar Fonu (Fona Yatırılacak Miktarlar) (Değişiklik) Emirnamesi',
        article: '87.03 özel kural (f)',
        summary:
          'KKTC’ye geçici süreyle giren ve “ZZ” geçici kaydı yapılacak araçlara ithalde uygulanan fon oranlarının %50’si uygulanır. Koşullar: 396/96 Geçici İthaller (Özel Taşıt Araçları) Tüzüğü uygulanır; kişi yabancı uyruklu olmalı, çift uyruklular yararlanamaz; Muhaceret Dairesi’nin ikamet ve çalışma izinleri ibraz edilir; araç ihraç ülkesinde kendi adına kayıtlı değilse fona %6 eklenir. ZZ kayıtlı araç başka bir hak sahibine fon alınmadan devredilebilir.',
      },
      {
        law: '37/1983 Gümrük ve İstihsal Yasası',
        article: 'Madde 34',
        summary:
          'Bakanlar Kurulu’nun tüzükle belirlediği hallerde, tekrar ihraç edilmek üzere ithal edilen mallar Müdürün koyacağı koşullarla gümrük vergisi alınmadan girebilir. Geçici İthaller (Özel Taşıt Araçları) Tüzüğü bu madde altında yapılmıştır; KDV Yasası 16(1)(Ç) bu tüzükler kapsamındaki geçici ithalatı KDV’den istisna eder.',
      },
      {
        law: '2026 Fiyat İstikrar Fonu (Fona Yatırılacak Miktarlar) (Değişiklik) Emirnamesi',
        article: '87.04 ve özel kurallar',
        summary:
          'Pikap ve kamyonet (azami 5 ton): yeni olanlarda AB-EFTA-TC sütunu %5, III. ülke %2; 5 tonu aşan yeni araçlar muaf; kullanılmışta (tonajdan bağımsız) sekiz yaşını doldurmamışsa %16 / %6, doldurmuşsa %31 / %21. TC menşeli yeni araçlara ad valorem %7. 2032 kg’a kadar çift kabinlerde ek spesifik fon (A.E. 722/2017 metnine göre 3.000 TL). Binek otomobilde engelli grupları için 1600 cm³’e kadar muafiyet.',
      },
      {
        law: '2010 Fiyat İstikrar Fonu (Değişiklik) Emirnamesi',
        article: '87.11 (A)',
        summary:
          'Motosiklette 80 cm³’e kadar AB-EFTA-TC %8,5 / III. ülke %6; 80–125 cm³ 375 TL + %18,5 / 375 TL + %14,5; diğerleri 750 TL + %23,5 / 750 TL + %35 (A.E. 624, RG 175, 14.10.2010; bulunabilen en son değişiklik).',
      },
      {
        law: '2005 Rıhtım Harçlarının Oranları (Değişiklik) Tüzüğü',
        article: 'I’inci Cetvel, kategori (vi)',
        summary:
          'Devlete kesin ithali yapılan motorlu araçlarda rıhtım harcı CİF kıymet üzerinden %4,4 (A.E. 468, RG 139, 18.08.2005). Sonraki değişiklikler yalnızca muafiyet ekliyor: yeni (kullanılmamış) 87.04 motorlu iş araçları, dizel ve benzinli 5 tona kadar olanlar (87.04.21 ve 87.04.31) hariç, muaf (A.E. 176/2019, Cetvel I madde 24).',
      },
      {
        law: '13/1981 Güvenlik Kuvvetlerini Güçlendirme Kurumu Yasası',
        article: 'Madde 6(3)(a)(i)',
        summary:
          'İthal edilen motorlu araçlardan, gümrük vergisine matrah olan kıymet üzerinden %2,5 katılma payı alınır. Tarım araçları, resmî hizmet araçları ve engelliler için özel imal edilip onlar adına gümrüklenen araçlar muaf.',
      },
      {
        law: '47/1992 Katma Değer Vergisi Yasası',
        article: 'Madde 21',
        summary:
          'İthalatta KDV matrahı: gümrük vergisine esas değer ile ithalat sırasında ödenen her türlü vergi, resim, harç, pay ve fonların toplamı (Gelir Vergisi Yasası 31(4) kesintileri hariç). Oran salon tipi araçta ve 200 cc’nin üzerindeki motosiklette %20 (Cetvel V madde 7), sade elektrikle çalışan kara taşıtlarında %5 (Cetvel II madde 36), pikap ve küçük motosiklet gibi diğerlerinde %16 (Cetvel IV). Yeni 87.04 motorlu iş araçları (87.04.21 ve 87.04.31 hariç) %0 (Cetvel I madde 23, A.E. 920/2026).',
      },
      {
        law: 'Motorlu Araçlar Kayıt ve Ruhsat Harçları Tüzüğü',
        article: 'Kısım I, II(1)(A)(a)',
        summary:
          'Özel motorlu aracın kayıt harcı, ithalde gümrük vergisinin alındığı matrah üzerinden benzinli ve dizelde %6, elektrikli ve hibritte %4 (A.E. 388, 30.04.2026).',
      },
      {
        law: 'Motorlu Araçlar Kayıt ve Ruhsat Harçları Tüzüğü',
        article: 'Kısım I, II(2) ve (C)',
        summary:
          'Yıllık seyrüsefer: özel otomobilde ağırlık dilimine göre kg başına (benzinli 2,09–12,50 TL, dizel 3,02–18,69 TL, hibrit 1,80–8,75 TL, elektrikli 1,12–6,15 TL); çift kabin 15.950 TL, dizel yük aracı 12.655 TL; motosiklet 100 cm³’e kadar 558 TL’den 500 cm³ üzeri 2.789 TL’ye. Yaş indirimi KKTC’de ilk kayıttan itibaren beş, on ve on beş yılda %15, %40, %60. 31.12.1983’e kadar imal edilip kulüp veya dernekçe klasik sayılan ve Eski Eserler ve Müzeler Dairesi’nce onaylanan araçta %65 indirim (D). Engelli muafiyeti (C): koşulları taşıyan araçlar Kısım I harçlarından muaf.',
      },
      {
        law: 'Gümrük Vergileri Tarife (Muafiyet) (Değişiklik) Tüzüğü',
        article: 'III. Cetvel, Başlık 1, Yan Başlık 10',
        summary:
          'Ortopedik (%50 ve üzeri), görme (%50 ve üzeri), nörolojik kaynaklı (%45 ve üzeri) engelliler ile spastik, Down sendromlu, görme ve zihinsel engellilerin aileleri; silindir hacmi 3000 cm³’ü ve CİF değeri 30.000 £’u geçmeyen veya elektrikli bir binek araç için gümrük vergisinden muaf. Gümrüksüz başka aracı olan yararlanamaz; hak kayıttan üç yıl sonra yenilenir (A.E. 861, 17.09.2026). Yedi yıl dolmadan satışta vergiler alınır (Tarife Yasası 13(3)).',
      },
      {
        law: '28/1983 Diplomatik Hak, Dokunulmazlık ve Ayrıcalıklar Yasası',
        article: 'Madde 16(3)',
        summary:
          'Diplomatik ajanın veya ailesinin özel kullanımı için, mütekabiliyetin gerektirdiği sayıda, mütekabiliyet yoksa yalnızca bir binek araba gümrük vergi, resim ve harçlarından muaf ithal edilebilir; KDV Yasası 16(1)(B) diplomatik ithalatı KDV’den istisna eder. Yaş sınırı, diplomatik kimlik kartlı görevlilerin geçici ithal izniyle getirdiği araçlara uygulanmaz (Yaş Sınırlandırılması Tüzüğü 5(2)(C)).',
      },
      {
        law: '24/1982 Gelir Vergisi Yasası',
        article: 'Madde 31(4)',
        summary:
          'İthalatçıdan gümrük vergisi matrahı üzerinden gelir veya kurumlar vergisine mahsuben stopaj kesilir; Fasıl 87 için %4 (A.E. 409/2026). Tamamen ve münhasıran kişisel eşya için kesinti yapılmaz.',
      },
      {
        law: 'Motorlu Taşıt Araçları Yaş Sınırlandırılması Tüzüğü',
        article: 'Madde 5(1)',
        summary:
          'Binek otomobil, yalnızca eşya taşımayan pikap ve kamyonet ile motosiklet, limana geldiğinde ilk kayıttan itibaren beş yaşını doldurmuşsa ithal izni verilmez; iş araçlarında sınır on iki yaş (madde 7). Sol direksiyon araçlara izin verilmez. Yerleşmeye gelen kişi, gümrüğe gelmeden önce kendi adına kayıtlı aracını bir defaya mahsus yaş sınırı olmadan getirebilir (madde 6, A.E. 152/2023). İmal tarihinden itibaren 25 yaşını tamamlamış, Kıbrıs Türk Klasik Otomobil Derneği veya Klasik ve Spor Otomobil Kulübü’nce klasik kabul edilen ve Eski Eserler ve Müzeler Dairesi’nce onaylanan araca yaş sınırı uygulanmaz (madde 5(2)(A)).',
      },
    ],
    sources: [
      {
        label: '2005 Rıhtım Harçlarının Oranları (Değişiklik) Tüzüğü (PDF)',
        href: 'https://mevzuat.mahkemeler.net/Enstrumanlar/st468-2005.pdf',
        note: 'KKTC Mahkemeleri Mevzuat Bilgi Sistemi; Resmî Gazete arşivinde 2006 öncesi yok',
      },
      {
        label: '2019 Rıhtım Harçlarının Oranları (Değişiklik) Tüzüğü (PDF)',
        href: 'https://mevzuat.mahkemeler.net/Enstrumanlar/176-2019.pdf',
        note: 'Yeni iş araçlarına rıhtım harcı muafiyeti',
      },
      {
        label: '22/1978 Rıhtım Harçları Yasası',
        href: '/yasa/22-1978-rlihtimharclari-yasasi',
        note: 'Yasadaki cetvel %2,2 gösteriyor; oran 2005 tüzüğüyle %4,4',
      },
      {
        label: '26/1978 Fiyat İstikrar Fonu Yasası',
        href: '/yasa/26-1978-fiyat-istikrar-fonu-yasasi',
      },
      {
        label: '44/1996 Gümrük Vergileri Tarife Yasası',
        href: '/yasa/44-1996-gumruk-vergileri-tarife-yasasi',
      },
      {
        label: '47/1992 Katma Değer Vergisi Yasası',
        href: '/yasa/47-1992-katma-deger-vergisi-yasasi',
      },
      {
        label: 'İthalatta Kur Uygulanması Tüzüğü',
        href: '/tuzuk/ithalatta-kur-uygulanmasi-tuzugu',
      },
      {
        label: 'Motorlu Taşıt Araçları Yaş Sınırlandırılması Tüzüğü',
        href: '/tuzuk/motorlu-tasit-araclari-yas-sinirlandirilmasi-tuzugu',
      },
    ],
    assumptions: [
      'Fiyat İstikrar Fonu CİF değeri üzerinden hesaplanır. Matrahı tanımlayan 2003 Esas Emirnamesi (A.E. 393) internette yayımlanmadığı için bu, birincil kaynaktan doğrulanamadı.',
      'Hibrit araçlar fon tablosunda silindir hacmi dilimine girer; “elektrikli motorlu taşıtlar” satırı yalnızca tamamen elektrikli araçlar için sayılır. Tablonun lafzı böyle; uygulama doğrulanamadı.',
      'Gümrük kıymeti olarak fatura bedeli, navlun ve sigorta toplamı alınır ve girdiğiniz kurla TL’ye çevrilir. Gümrük, beyanın tescil günündeki döviz satış kurunu kullanır.',
      'Araç özel kullanım içindir; kayıt harcı ve seyrüsefer özel motorlu araç oranlarıyla hesaplanır.',
      'Motosiklet fonu bulunabilen en son değişiklikten (2010) alınır; 2013–2017 arasındaki bazı fon sayıları indirilemediği için sonraki bir değişiklik dışlanamıyor. Elektrikli motosiklet fon tablosunda “diğerleri” satırına konur.',
      'Pikapta çift kabin ek fonu (3.000 TL) 2017 metnine dayanıyor; 2026 baskısında cümle yarıda kesik. TC menşeli yeni pikapta tablodaki %5 yerine istisna sütunundaki %7 uygulanır.',
      'Engelli muafiyetinde KDV’nin alınıp alınmadığı belirsiz (KDV Yasası 16(1)(I)); hesap KDV’yi tam alır. Güçlendirme Kurumu payı yalnızca engelliye özel imal edilip onun adına gümrüklenen araçta muaf sayılır.',
      'Yerleşmeye gelen kişinin aracı için vergi indirimi bulunamadı; tek kolaylık yaş sınırı istisnası. Kişisel Muafiyetler Tüzüğü’nün 1983 tarihli esas metni internette olmadığı için bu doğrulanamadı.',
      'Benzinli tek kabin pikabın ve kamyonun seyrüseferi için tüzükte ayrı kalem yok.',
      'Yeni iş aracı muafiyetleri (rıhtım harcı ve %0 KDV) yalnızca 87.04.21 ve 87.04.31’i, yani dizel ve benzinli 5 tona kadar araçları hariç tutuyor. Metne göre yeni hibrit ve elektrikli pikaplar da muaf sayıldı; uygulama doğrulanamadı.',
      'Klasik araçta gümrük vergisi ve KDV binek otomobil (87.03) oranlarıyla hesaplanır, çünkü fon emirnamesi klasikleri 87.03 altında sayıyor. Gümrük aracı tarihi koleksiyon eşyası (97.05) olarak sınıflandırırsa gümrük vergisi alınmaz.',
      'Kamyon özel kullanımlıdır (kendi yükünü taşıyan); “T” izinli ticari araçların farklı kayıt ve ruhsat harçları hesaplanmaz.',
      'Geçici “ZZ” kaydında kayıt harcı olarak tüzükteki “geçici kayıt yapılacak motorlu araçlar” kalemi (18.725 TL) alınır. Rıhtım harcı ve Güçlendirme Kurumu payı toplama katılmaz: rıhtım cetvelindeki geçici ithal kategorisinin güncel tutarı internette yok, payın bu araçlardan alınıp alınmadığı da doğrulanamadı. Esas Tüzük (1996) internette yayımlanmadığı için kalış süresi ve teminat gibi koşullar hesaba girmez.',
    ],
    limitations: [
      'Otobüs ve minibüsler (87.02), TIR çekicileri (87.01), iş makineleri ve özel amaçlı taşıtlar (87.05) hesaplanmaz.',
      'Diplomatlara tanınan muafiyet hesaplanmaz: binek araç gümrük vergi, resim ve harçlarından ve KDV’den muaf (28/1983 madde 16(3)); fonun bu muafiyete girip girmediği metinden anlaşılmıyor.',
      'Muayene, plaka, gümrük müşaviri ve liman hizmet ücretleri dahil değildir.',
      'Gümrük, faturadaki değeri yeterli görmezse kıymeti kendisi saptar; özellikle kullanılmış araçlarda vergiler buna göre değişir.',
    ],
    faq: [
      {
        question: 'KKTC’ye araç getirirken hangi vergiler ödenir?',
        answer:
          'Gümrükte: gümrük vergisi (menşeye göre %0 veya %10), Fiyat İstikrar Fonu (motor hacmine göre %3–12, elektrikli %5), %4,4 rıhtım harcı, %2,5 Güvenlik Kuvvetleri payı ve bunların hepsinin üzerine KDV (%20, tamamen elektrikli araçta %5). İlk kayıtta ayrıca CİF değerinin %6’sı (elektrikli ve hibritte %4) kayıt harcı ödenir.',
      },
      {
        question: 'KKTC’de araç ithalatında ÖTV var mı?',
        answer:
          'Türkiye’deki gibi bir özel tüketim vergisi yok. Motor hacmine göre artan yükü Fiyat İstikrar Fonu taşıyor: 5 Ekim 2026’dan itibaren 2000 cm³’e kadar %3, 2000–3000 cm³ %8, 3000 cm³ üzeri %12, elektrikli araçlarda %5.',
      },
      {
        question: 'Japonya veya İngiltere’den getirilen araçta gümrük vergisi ne kadar?',
        answer:
          'Bu ülkeler AB-EFTA sütununa girmediği için binek otomobilde genel oran olan %10 uygulanır. Türkiye, AB veya EFTA menşeli araçlar menşe ve dolaşım belgesiyle benzinlide 2000 cm³’e, dizelde 2500 cm³’e kadar muaftır.',
      },
      {
        question: 'Kaç yaşındaki araç ithal edilebilir?',
        answer:
          'Binek otomobil, KKTC limanına vardığında ilk kayıt tarihinden itibaren beş yaşını doldurmamış olmalı; sol direksiyon araçlara ithal izni verilmez. Yerleşmeye gelen kişilerin kendi adına kayıtlı aracı gibi istisnalar Yaş Sınırlandırılması Tüzüğü’nde düzenleniyor.',
      },
      {
        question: 'Elektrikli araç ithalatında vergiler daha mı düşük?',
        answer:
          'Evet. Tamamen elektrikli araçta Fiyat İstikrar Fonu %5, KDV %5 ve kayıt harcı %4; Türkiye, AB veya EFTA menşeli ise gümrük vergisi de yok. Rıhtım harcı (%4,4) ve Güvenlik Kuvvetleri payı (%2,5) ise aynı.',
      },
      {
        question: 'Pikap ithalatında vergiler nasıl?',
        answer:
          'Türkiye, AB veya EFTA menşeli pikapta gümrük vergisi yok; diğer ülkelerden gelende dizel 2500, benzinli 2800 cm³’e kadar %10, üzeri %22. Fon yeni pikapta %2 (AB-EFTA-TC %5), kullanılmışta sekiz yaşından küçükse %6 (%16), büyükse %21 (%31). KDV %16, kayıt harcı %6; rıhtım harcı ve Güvenlik Kuvvetleri payı otomobildeki gibi. Yeni hibrit ve elektrikli pikaplar metne göre rıhtım harcından muaf ve %0 KDV’ye tabi. Çift kabinler beş yaş, yalnızca yük taşıyan tek kabinler on iki yaş sınırına tabi.',
      },
      {
        question: 'Kamyon ithalatında hangi vergiler ödenir?',
        answer:
          'Brüt ağırlığı 5 tonu aşan kamyonda Türkiye, AB veya EFTA menşeliyse gümrük vergisi yok, diğer ülkelerden gelende %22. Yeni kamyon fondan ve rıhtım harcından muaf, KDV’si %0; kullanılmış kamyonda fon sekiz yaşından küçükse %6 (AB-EFTA-TC %16), büyükse %21 (%31), rıhtım harcı %4,4 ve KDV %16. Güvenlik Kuvvetleri payı %2,5, kayıt harcı %6. İş araçları on iki yaş sınırına tabi.',
      },
      {
        question: 'Klasik araç ithalatında vergiler nasıl?',
        answer:
          'Eski Eserler ve Müzeler Dairesi onaylı, 25 yaşını doldurmuş klasik otomobilde fon, motor hacmi dilimleri yerine araç başına 750 TL artı %6 alınır. Klasik Otomobil Derneği veya Klasik ve Spor Otomobil Kulübü’nün klasik kabulüyle beş yaş sınırı uygulanmaz. 1983 sonuna kadar imal edilenlerde yıllık seyrüsefer %65 indirimli.',
      },
      {
        question: 'Motosiklet ithalatında vergiler ne kadar?',
        answer:
          'Diğer ülkelerden gelen motosiklette gümrük vergisi 250 cm³’e kadar %14,5, üzeri %6; Türkiye, AB veya EFTA menşelilerde yok. Fon, bulunabilen en son değişikliğe (2010) göre 125 cm³’ün üzerinde araç başına 750 TL artı %35 (AB-EFTA-TC %23,5). KDV 200 cm³’ün üzerinde %20, altında %16, elektrikli motosiklette %5. Motosiklet de beş yaş sınırına tabi.',
      },
      {
        question: 'KKTC’de çalışan yabancılar araç getirince ne öder (ZZ plaka)?',
        answer:
          'İkamet ve çalışma izni olan yabancı uyruklu kişi aracını geçici ithal ederek “ZZ” geçici kaydı yaptırabilir; çift uyruklular yararlanamaz. Gümrük vergisi ve KDV alınmaz, Fiyat İstikrar Fonu normal oranın yarısıdır; araç ihraç ülkesinde kişinin adına kayıtlı değilse fona %6 eklenir. Geçici kayıt harcı 18.725 TL. Rıhtım harcı ve Güçlendirme Kurumu payının uygulanışını Gümrük’e sorun.',
      },
      {
        question: 'Engelliler araç ithalatında hangi vergilerden muaf?',
        answer:
          'Koşulları taşıyan kişi veya aile, 3000 cm³’ü ve 30.000 £ CİF’i geçmeyen veya elektrikli bir binek araçta gümrük vergisinden muaf. 1600 cm³’e kadar araçta fon (nörolojik grup hariç) ve kayıt-ruhsat harçları da alınmıyor. Rıhtım harcı alınıyor; Güvenlik Kuvvetleri payı yalnızca engelliye özel imal edilip onun adına gümrüklenen araçta alınmıyor. Muaf araç yedi yıl dolmadan satılırsa vergiler ödenir.',
      },
      {
        question: 'Yerleşmeye gelenler aracını vergisiz getirebilir mi?',
        answer:
          'Resmî Gazete’de bunu sağlayan bir hüküm bulamadık. Yaş Sınırlandırılması Tüzüğü’nün 6. maddesi, yerleşmeye gelen kişinin gümrüğe gelmeden önce kendi adına kayıtlı aracını bir defaya mahsus yaş sınırı olmadan getirmesine izin veriyor; vergiler ise normal oranlarla alınıyor. Kimin yerleşmeye gelen sayıldığı (yurt dışında en az on yıl ve benzeri koşullar) A.E. 15/2025 ile tanımlandı.',
      },
      {
        question: 'Rıhtım harcı ne kadar?',
        answer:
          'Motorlu araçlarda CİF değerinin %4,4’ü. Rıhtım Harçları Yasası’nın cetvelinde %2,2 yazıyor, ama Bakanlar Kurulu 2005 Rıhtım Harçlarının Oranları (Değişiklik) Tüzüğü ile oranları baştan belirledi ve motorlu araçlar için %4,4 oldu; sonraki değişiklikler yalnızca muafiyet ekledi.',
      },
    ],
  },
  {
    slug: 'ihtiyat-sandigi-hesaplayici',
    updatedAt: '2026-09-10',
    related: [
      {
        slug: 'net-brut-maas-hesaplayici',
        reason: 'Aylık İhtiyat Sandığı kesintisinin maaş bordronuzdaki yerini görün.',
      },
      {
        slug: 'toplu-isten-cikarma-hesaplayici',
        reason: 'İşten çıkarılıyorsanız tazminat ve ihbar sürenizi hesaplayın.',
      },
    ],
    records: [
      {
        label: 'İhtiyat Sandığı faiz oranları (1 Nisan 2026) — Ü(K-I) 597-2026',
        href: '/karar/2026-uki-597-2026-1-nisan-2026-tarihi-itibariyla-ihtiyat-sandigi-dairesi-istirakci',
        note: 'Yıllık faiz %37, cari faiz %30',
      },
    ],
    name: 'İhtiyat Sandığı hesaplayıcı',
    heading: 'İhtiyat Sandığı birikim ve avans hesaplayıcı',
    title: 'KKTC İhtiyat Sandığı Birikim ve Avans Hesaplama',
    summary: 'Tahmini birikimi, çekilebilecek azami avansı ve 15 yıl dörtte bir hakkını gösterir.',
    description:
      'KKTC İhtiyat Sandığı: 34/1993 sayılı Yasa’nın 74/2007 ile değişik madde 8, 9 ve 10 kurallarına göre tahmini birikiminizi, avans üst sınırınızı ve on beş yıllık dörtte bir hakkınızı hesaplayın.',
    intro:
      'Sandıktaki gerçek bakiye, her ay yatırılan primlerin yıldan yıla değişen faiz oranlarıyla işletilmesinden çıkıyor. Bu araç tek bir oranı bütün geçmişe uyguladığı için sonucu bir tahmindir, hesap dökümü değil.',
    legal: [
      {
        law: 'İhtiyat Sandığı Yasası (34/1993, 74/2007 ile değişik)',
        article: 'Madde 8',
        summary:
          'İştirak sahibinin primi brüt ücretin %5’inden, işveren depoziti de %5’inden az olamaz. Sosyal Güvenlik Yasası’nın yürürlüğe girdiği tarihten sonra ilk defa kapsama girenlerde prim ve depozit %4’tür; oranlar iki katını aşmamak ve eşit olmak koşuluyla hizmet akdi veya toplu iş sözleşmesiyle artırılabilir.',
      },
      {
        law: 'İhtiyat Sandığı Yasası (34/1993, 74/2007 ile değişik)',
        article: 'Madde 10',
        summary:
          '(1) İştirak sahibi, Yönetim Kurulu onayıyla prim ve depozitlerin toplamının en fazla yarısını avans olarak çekebilir. (3) Sandığa en az on beş yıl yatırım yapmış iştirakçiye, talebi halinde bir defaya mahsus birikiminin dörtte biri ödenir; bu hakkı kullanan iki yıl avans alamaz.',
      },
      {
        law: 'İhtiyat Sandığı Yasası (34/1993, 74/2007 ile değişik)',
        article: 'Madde 9',
        summary:
          '(9) Sosyal Güvenlik Yasası kapsamında 60, diğer sosyal güvenlik kurumlarına tabi olanlardan 55 yaşını aşanlar ile emeklilik veya yaşlılık aylığı almaya başlayanların başvurusu halinde prim ve depozitlerin tümü faizleriyle ödenir.',
      },
    ],
    sources: [
      {
        label: '34/1993 İhtiyat Sandığı Yasası',
        href: '/yasa/34-1993-ihtiyat-sandigi-yasasi',
        note: '74/2007 değişikliğiyle',
      },
    ],
    assumptions: [
      'Faiz, girdiğiniz yıllık oranın aylık bileşiği olarak bütün döneme uygulanır.',
      'Ücret artışı girilirse geçmiş aylardaki ücret bugünkü ücretten geriye doğru indirgenerek bulunur.',
    ],
    limitations: [
      'Faiz oranı Bakanlar Kurulu kararıyla ve yıldan yıla değişir; tek bir oranla yapılan projeksiyon gerçek bakiyeyi tutturmaz.',
      'Kesin bakiye için İhtiyat Sandığı Dairesi’nden hesap dökümü isteyin.',
      'Ücretsiz izin, işsiz geçen dönem ve eksik yatırılan aylar hesaba katılmaz.',
    ],
    faq: [
      {
        question: 'İhtiyat Sandığı primi yüzde kaç?',
        answer:
          'İki oran var. 74/2007 ile değişik madde 8(1) ve (3): iştirak sahibinin primi brüt ücretin %5’inden, işveren depoziti de %5’inden az olamaz. Madde 8(6) ise Sosyal Güvenlik Yasası’nın yürürlüğe girdiği tarihten sonra ilk defa kapsama girenler için prim ve depoziti %4 olarak belirliyor. Oranlar iki katını aşmamak ve eşit olmak koşuluyla sözleşmeyle artırılabiliyor.',
      },
      {
        question: 'Birikimimin ne kadarını avans olarak çekebilirim?',
        answer:
          'Madde 10(1)(A): iştirak sahibi, başvurusu üzerine ve Yönetim Kurulunun onayıyla prim ve depozitlerin toplamının en fazla yarısını avans olarak çekebilir. Yönetim Kurulu bu yetkisini kısmen veya tamamen Müdüre devredebiliyor.',
      },
      {
        question: 'On beş yıl dolunca ne oluyor?',
        answer:
          'Madde 10(3): Sandığa en az on beş yıl yatırım yapmış iştirakçilere, talepleri halinde bir defaya mahsus olmak üzere birikimlerinin dörtte biri ödenir. Bu hakkı kullanan iştirakçi, o tarihten başlayarak iki yıl süreyle avans alamıyor.',
      },
      {
        question: 'Birikimin tamamını ne zaman çekebilirim?',
        answer:
          'Madde 9(9): Sosyal Güvenlik Yasası kapsamında bulunup 60 yaşını aşanlar, diğer sosyal güvenlik kurumlarına tabi olanlardan 55 yaşını aşanlar ve emeklilik veya yaşlılık aylığı almaya başlayanlar başvurdukları takdirde hesaplarına yatırılan prim ve depozitlerin tümü faizleriyle birlikte ödenir.',
      },
      {
        question: 'Faiz oranı ne kadar?',
        answer:
          'Sabit değil, Bakanlar Kurulu kararıyla belirleniyor. Ü(K-I) 597-2026 sayılı karara göre 1 Nisan 2026’dan itibaren iştirakçi hesaplarına yıllık %37 faiz, cari hesaplara %30 faiz uygulanıyor. Oran yıldan yıla değiştiği için araçta sabit kodlanmadı; projeksiyon için oranı kendiniz giriyorsunuz. Tek bir oranla yapılan projeksiyon geçmiş yılların farklı oranlarını tutturmaz; kesin tutar için Daire’den hesap dökümü isteyin.',
      },
    ],
  },
  {
    slug: 'net-brut-maas-hesaplayici',
    updatedAt: '2026-09-10',
    related: [
      {
        slug: 'fazla-mesai-hesaplayici',
        reason: 'Saat başı ücretinizi ve fazla mesai alacağınızı hesaplayın.',
      },
      {
        slug: 'ihtiyat-sandigi-hesaplayici',
        reason: 'Her ay kesilen İhtiyat Sandığı priminin yıllar içinde ne kadar biriktiğini görün.',
      },
      {
        slug: 'yabanci-calisma-izni-cezasi-hesaplayici',
        reason: 'Yabancı işçi çalıştırıyorsanız çalışma izni yükümlülüklerini ve ceza riskini görün.',
      },
    ],
    records: [
      {
        label: 'Sosyal Güvenlik Yasası kapsamındaki prim oranları — Ü(K-I) 1609-2026',
        href: '/karar/2026-uki-1609-2026-sosyal-guvenlik-yasasi-kapsaminda-sigortali-olanlara-uygulanacak-prim',
        note: 'YGK 83/2026, yabancı sigortalılar için oranlar',
      },
      {
        label: 'Temmuz–Eylül 2026 prim desteği — Ü(K-I) 1608-2026',
        href: '/karar/2026-uki-1608-2026-temmuz-2026-eylul-2026-donemi-sosyal-guvenlik-yasasi-kapsaminda',
        note: 'YGK 82/2026',
      },
      {
        label: 'Kesinleşen asgari ücret — Ü(K-I) 1588-2026',
        href: '/karar/2026-uki-1588-2026-kesinlesen-asgari-ucret',
        note: 'Prim taban ve tavanının dayanağı',
      },
      {
        label: '2026 kişisel indirim miktarları — Ü(K-I) 132-2026',
        href: '/karar/2026-uki-132-2026-2026-vergilendirme-donemi-icin-kisisel-indirim-miktarlarinin',
        note: 'Kişisel indirim 655.000 TL',
      },
    ],
    name: 'Net–brüt maaş hesaplayıcı',
    heading: 'Net–brüt maaş ve işveren maliyeti hesaplayıcı',
    title: 'KKTC Net Maaş ve İşveren Maliyeti Hesaplama',
    summary:
      'Sosyal sigorta ve İhtiyat Sandığı kesintilerini, ele geçen tutarı ve işveren maliyetini hesaplar.',
    description:
      'KKTC’de brütten nete maaş: sosyal sigorta ve İhtiyat Sandığı kesintilerini, 2026 gelir vergisi dilimleri ile kişisel, eş ve çocuk indirimlerine göre gelir vergisini, net maaşı ve işverene toplam maliyeti hesaplayın.',
    intro:
      'Hangi prim oranlarına tabi olduğunuzu ilk sigortalılık tarihiniz belirliyor: 1 Ocak 2008’den sonra ilk kez sigortalı olanlar 73/2007’ye, daha önce sigortalı olanlar 16/1976’ya tabi. 73/2007 kapsamında vatandaşlık da oranı değiştiriyor. Gelir vergisi ise 24/1982 Gelir Vergisi Yasası’nın 2026 dilimleri ve medeni hal ile çocuklara göre değişen indirimlerle hesaplanıyor.',
    legal: [
      {
        law: '73/2007 Sosyal Güvenlik Yasası',
        article: 'Madde 78',
        summary:
          'Sigortalı hissesi: hastalık %2,25, analık %0,5, malullük-yaşlılık-ölüm %5,5, işsizlik %0,75 — toplam %9. İşveren hissesi: iş kazası tarifeye göre %0,5–%6, hastalık %2,25, analık %0,5, malullük-yaşlılık-ölüm %7, işsizlik %0,75.',
      },
      {
        law: '73/2007 Sosyal Güvenlik Yasası',
        article: 'Madde 83',
        summary:
          'Prime esas günlük kazancın alt sınırı yürürlükteki brüt asgari ücretin otuzda biri, üst sınırı bu alt sınırın yedi katıdır. Kazancı sınırların dışında kalanların primi sınır üzerinden hesaplanır.',
      },
      {
        law: 'Bakanlar Kurulu Kararı (YGK 83/2026)',
        article: 'Prim oranları',
        summary:
          '29 Temmuz 2026’dan itibaren KKTC vatandaşı veya işlem eşitliği sağlayan sosyal güvenlik anlaşması bulunan ülke vatandaşı olmayan sigortalılarda sigortalı hissesi hastalık %4,25, malullük-yaşlılık-ölüm %8,25; işsizlik primi uygulanmaz. Sigortalı hissesi toplam %13, işveren hissesi %9,75 + iş kazası.',
      },
      {
        law: '16/1976 Kıbrıs Türk Sosyal Sigortalar Yasası',
        article: 'Madde 83',
        summary:
          '2/2012 ile değişik: hastalık %6 (üçte biri sigortalı), analık %1 (yarısı işveren, yarısı Devlet), malullük-yaşlılık-ölüm %16 (%6 sigortalı, %7 işveren, %3 Devlet), işsizlik %3 (üçte biri sigortalı). İş kazası priminin tamamı işverene ait ve %6’yı geçemez.',
      },
      {
        law: 'İhtiyat Sandığı Yasası (34/1993, 74/2007 ile değişik)',
        article: 'Madde 8',
        summary:
          'Sosyal Güvenlik Yasası’ndan sonra ilk defa kapsama girenlerde prim ve depozit brüt ücretin %4’ü; daha önce girenlerde her ikisi de en az %5.',
      },
      {
        law: '24/1982 Gelir Vergisi Yasası',
        article: 'Madde 52',
        summary:
          '25/2026 ile değişik: yıllık matrahın ilk 45.000 TL’si %10, sonraki 45.000 TL %20, sonraki 120.000 TL %25, sonraki 190.000 TL %30, 400.000 TL’yi aşan kısmı %37. Ücretlerde aylık kesinti, dilimlerin yıllık maaş sayısına bölümüyle yapılır.',
      },
      {
        law: '24/1982 Gelir Vergisi Yasası',
        article: 'Madde 12',
        summary:
          'Kişisel indirim Bakanlar Kurulunca her yıl saptanır; 2026 için 655.000 TL (Ü(K-I) 132-2026). Birlikte yaşanan eş için bu tutarın %8’i. Kişisel ve özel indirim toplamı yıllık asgari ücretten az olamaz.',
      },
      {
        law: '24/1982 Gelir Vergisi Yasası',
        article: 'Madde 13',
        summary:
          'Çocuk başına kişisel indirimin %6’sı (16 yaş altı veya ilkokul), %8’i (ortaöğretim, askerlik, sürekli sakatlık) veya en çok %11’i (yükseköğretim, eğitim gideri kadar). Üç ve daha fazla çocukta vergiden üçüncü çocuk için %15, sonraki her çocuk için %5 ek indirim.',
      },
      {
        law: '24/1982 Gelir Vergisi Yasası',
        article: 'Madde 14',
        summary:
          'Ücretlilerin matrahının saptanmasında ücretin brüt miktarı üzerinden %10 özel indirim yapılır.',
      },
      {
        law: '24/1982 Gelir Vergisi Yasası',
        article: 'Madde 15',
        summary:
          'En az %50 çalışma gücü kaybında kişisel indirimin %15’i, %100’de %30’u; sakatlık indirimi almayan 65 yaş üstü yükümlülerde %5’i.',
      },
    ],
    sources: [
      {
        label: '73/2007 Sosyal Güvenlik Yasası',
        href: '/yasa/73-2007-sosyal-guvenlik-yasasi',
      },
      {
        label: '16/1976 Kıbrıs Türk Sosyal Sigortalar Yasası',
        href: '/yasa/16-1976-kibris-turk-sosyal-sigortalar-yasasi',
      },
      {
        label: 'KKTC Çalışma Dairesi — asgari ücret',
        href: 'http://calisma.gov.ct.tr/Asgari-Ücret',
        note: 'Prim taban ve tavanının dayandığı tutar',
      },
      {
        label: 'KKTC Vergi Dairesi — 2026 matrah dilimleri ve kişisel indirimler',
        href: 'https://vergi.gov.ct.tr/?q=content%2F2026-y%C4%B1l%C4%B1-gelir-vergisi-matrah-dilimleri-ile-ki%C5%9Fisel-indirim-miktarlar%C4%B1-yay%C4%B1mland%C4%B1',
      },
      {
        label: '24/1982 Gelir Vergisi Yasası (birleştirilmiş metin)',
        href: '/yasa/24-1982-gelir-vergisi-yasasi',
        note: '25/2026 değişikliğiyle',
      },
    ],
    assumptions: [
      'Gelir vergisi aylık stopaj olarak, tek işverenden ücret alındığı ve yıl boyu KKTC’de yerleşik olunduğu varsayımıyla hesaplanır.',
      'Özel indirim, madde 14(1)’in lafzına uygun olarak brüt ücret üzerinden uygulanır. Vergi Dairesi’nin tablosu sosyal güvence kesintilerinden sonraki tutarı esas alıyor; bu okuma asgari ücrette Çalışma Dairesi’nin ilan ettiği neti tutturmuyor.',
      'Yükseköğretimdeki çocuk indirimi eğitim gideri kadar olduğundan üst sınırı (%11) varsayılır.',
      'Ortaokuldaki çocuk, madde 13(1)’in lafzına uygun olarak ortaöğretim (%8) sayılır: (A) bendi yalnızca okula gitmeyen veya ilkokuldaki çocuğu kapsıyor. Vergi Dairesi’nin tablosu (A) için “ilköğretim” ifadesini kullanıyor; o okumayla ortaokuldaki çocuk %6’ya girerdi.',
      'İş kazası prim oranı işyerinin tehlike sınıfına göre değişir; varsayılan en düşük orandır (%0,5).',
      'İhtiyat Sandığı primi brüt ücretin tamamı üzerinden hesaplanır; sosyal sigorta prim tavanı bu prime uygulanmaz.',
    ],
    limitations: [
      'Yıl sonu beyannamesi, birden fazla işverenden ücret (madde 18: indirimler yalnızca en yüksek ücrete uygulanır), KKTC’de yerleşik sayılmayanlar (kişisel indirimler uygulanmaz), çalışan emekliler (kişisel indirim %100 artırılır) ve yıl ortasında işe başlayan yabancı işçilerde indirimlerin aylara orantılanması (madde 19) hesaplanmaz.',
      'Eşlerin ikisinin de geliri varsa çocuk indirimleri eşler arasında eşit bölüştürülür (madde 13(4)); araç indirimin tamamını size uygular.',
      '16/1976 rejiminde prime esas kazancın üst sınırı yasada formülle değil Bakanlar Kurulu kararıyla saptanır; bu rejimde tavan uygulanmaz.',
      'Hayat pahalılığı ödeneği, aile yardımı ve servis ücreti gibi ödemeler 73/2007 madde 82 uyarınca prime esas kazanca dahildir; brüt ücret alanına bunlar dahil edilmelidir.',
    ],
    faq: [
      {
        question: 'Maaşımdan hangi kesintiler yapılıyor?',
        answer:
          'KKTC ve TC vatandaşları için sosyal sigorta priminin sigortalı hissesi %9 ve İhtiyat Sandığı işçi primi %4 (eski sistemde %5) — toplam %13. Bu oran Çalışma Dairesi’nin ilan ettiği asgari ücret rakamlarıyla doğrulanabiliyor: 70.893 TL brütün %13’ü 9.216,09 TL, kalan 61.676,91 TL de Dairenin açıkladığı net asgari ücret. Anlaşmalı ülke vatandaşı olmayan yabancı işçilerde sigortalı hissesi %13’tür.',
      },
      {
        question: 'Yabancı işçinin sigorta kesintisi farklı mı?',
        answer:
          'Evet, 29 Temmuz 2026’dan itibaren. YGK 83/2026 sayılı Bakanlar Kurulu kararıyla, KKTC vatandaşı veya KKTC ile işlem eşitliği içeren sosyal güvenlik anlaşması bulunan ülke (ör. Türkiye) vatandaşı olmayan sigortalılarda sigortalı hissesi hastalık kolunda %4,25’e, malullük-yaşlılık-ölüm kolunda %8,25’e çıktı ve işsizlik primi uygulanmıyor. Sigortalı hissesi toplamı %13, işveren hissesi %9,75 artı iş kazası primi. Asgari ücretle çalışan böyle bir işçinin vergi öncesi ele geçeni yaklaşık 58.841 TL.',
      },
      {
        question: 'Temmuz–Eylül 2026 prim desteği maaşımı etkiler mi?',
        answer:
          'Hayır, işçinin kesintisini değiştirmiyor. YGK 82/2026 ile Temmuz–Eylül 2026 döneminde işveren hissesinin bir bölümü Devlet tarafından karşılanıyor; oran sigortalının cinsiyetine, vatandaşlığına ve sektöre göre değişiyor ve koşullara bağlı. Bu yüzden araç işveren maliyetini desteksiz gösteriyor; ayrıntılar sayfadaki ilgili Resmî Gazete kaydında.',
      },
      {
        question: 'Hangi sosyal güvenlik yasasına tabiyim?',
        answer:
          'İlk sigortalılık tarihiniz belirliyor. 73/2007 Sosyal Güvenlik Yasası 1 Ocak 2008’de yürürlüğe girdi ve geçici kurallar, o tarihte hâlihazırda bir sosyal güvenlik sistemine bağlı olanların eski sistemlerine bağlı kalmaya devam edeceğini söylüyor. 2008 öncesi sigortalılar 16/1976 Kıbrıs Türk Sosyal Sigortalar Yasası’na, sonrakiler 73/2007’ye tabi.',
      },
      {
        question: 'Prim kesintisinin bir üst sınırı var mı?',
        answer:
          '73/2007 kapsamındakiler için var. Madde 83(1): prime esas günlük kazancın alt sınırı yürürlükteki brüt asgari ücretin otuzda biri, üst sınırı ise bu alt sınırın yedi katı. Aylığa çevrilince tavan, brüt asgari ücretin yedi katı oluyor. İhtiyat Sandığı primine bu tavan uygulanmıyor; o brüt ücretin tamamı üzerinden kesiliyor.',
      },
      {
        question: 'KKTC’de 2026 gelir vergisi dilimleri nedir?',
        answer:
          '25/2026 sayılı Değişiklik Yasası ile madde 52’ye göre yıllık matrahın ilk 45.000 TL’si %10, sonraki 45.000 TL %20, sonraki 120.000 TL %25, sonraki 190.000 TL %30, 400.000 TL’yi aşan kısmı %37 oranında vergilendiriliyor. 12 maaş alan bir ücretlide aylık dilimler bunların on ikide biri: 3.750, 7.500, 17.500 ve 33.333,33 TL.',
      },
      {
        question: 'Kişisel indirim 2026’da ne kadar?',
        answer:
          'Ü(K-I) 132-2026 sayılı Bakanlar Kurulu kararıyla 2026 vergilendirme dönemi için 655.000 TL; 12 maaşta aylık 54.583,33 TL. Birlikte yaşanan eş için 52.400 TL, çocuk başına eğitim durumuna göre 39.300, 52.400 veya en çok 72.050 TL ek indirim yapılıyor.',
      },
      {
        question: 'Asgari ücretten gelir vergisi kesilir mi?',
        answer:
          'Pratikte hayır. Brüt 70.893 TL’den %13 sosyal güvence kesintisi, %10 özel indirim ve aylık 54.583,33 TL kişisel indirim düşülünce matrah birkaç liraya iniyor. Madde 12(1) de kişisel ve özel indirimin toplamının yıllık asgari ücretten az olamayacağını söylüyor. Çalışma Dairesi’nin ilan ettiği 61.677 TL net de vergisiz hesaba karşılık geliyor.',
      },
      {
        question: 'Bir çalışanın işverene maliyeti ne kadar?',
        answer:
          'Brüt ücrete ek olarak sosyal sigorta işveren hissesi ve İhtiyat Sandığı işveren depoziti biniyor. 73/2007 madde 78(1)’e göre işveren hissesi hastalık %2,25, analık %0,5, malullük-yaşlılık-ölüm %7, işsizlik %0,75 ve tehlike sınıfına göre %0,5 ile %6 arasında değişen iş kazası primi. İhtiyat Sandığı depoziti ise %4 (eski sistemde %5).',
      },
    ],
  },
  {
    slug: 'yillik-izin-hesaplayici',
    updatedAt: '2026-09-10',
    related: [
      {
        slug: 'toplu-isten-cikarma-hesaplayici',
        reason: 'İş akdi sona eriyorsa: kullanılmayan iznin ücreti tazminat ve ihbar süresinden ayrı ödenir.',
      },
      {
        slug: 'dogum-ve-mazeret-izni-hesaplayici',
        reason: 'Doğum ve mazeret izinleri yıllık izin hesabında çalışılmış süre sayılır.',
      },
    ],
    name: 'Yıllık izin hesaplayıcı',
    heading: 'Yıllık izin hesaplayıcı',
    title: 'KKTC Yıllık İzin Hesaplama',
    summary: 'İşe giriş tarihine göre kaç iş günü yıllık ücretli izin hakkın olduğunu hesaplar.',
    description:
      'KKTC’de yıllık ücretli izin hakkı: 22/1992 İş Yasası madde 43’teki hizmet süresi basamaklarına göre kaç iş günü izin hak ettiğinizi, 12 aydan kısa süre için orantılı izni ve kalan izin bakiyenizi hesaplayın.',
    intro:
      'İş Yasası yıllık izni hizmet süresine bağlıyor ve basamaklar arasındaki fark dört iş gününe kadar çıkabiliyor. Bu araç işe giriş tarihinizden bugüne kadarki süreyi takvim üzerinden hesaplayıp hangi basamağa düştüğünüzü gösteriyor.',
    legal: [
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 43',
        summary:
          'Altı ay çalışma koşuluyla hizmet süresine göre 14, 18, 22 veya 25 iş günü; 18 yaşında ve daha küçük işçide en az 18 iş günü. 12 aydan kısa hizmette orantılı izin, kesirler bir sonraki hesaba aktarılır.',
      },
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 44',
        summary:
          'Aynı işverendeki süreler birleştirilir; madde 45 dışındaki devamsızlık kadar süre hizmet yılının bitişine eklenir. Altı aydan az süren mevsimlik ve kampanya işlerinde yıllık izin kuralları uygulanmaz.',
      },
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 46',
        summary:
          'İzin bölünemez (tarafların rızasıyla sekiz günden az olmamak üzere bölünebilir); izne rastlayan resmî tatil ve hafta tatili izinden sayılmaz; hak edilen iznin en az 14 iş günü o yıl kullanılır, biriken izin 50 iş gününü geçemez.',
      },
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 50',
        summary:
          'Hizmet akdi ne şekilde sona ererse ersin, hak kazanılıp kullanılmayan iznin ücreti akdin sona erdiği tarihteki ücret üzerinden ödenir.',
      },
    ],
    sources: [LABOUR_LAW_SOURCE],
    assumptions: [
      'Hizmet süresi tek bir işverende kesintisiz geçmiş kabul edilir.',
      'Madde 44(2)’deki devamsızlık ertelemesi hesaba katılmaz.',
    ],
    limitations: [
      'Geçmiş yıllardan devreden izin bakiyesini bilen tek kayıt, işverenin madde 52 uyarınca tutmak zorunda olduğu izin kaydıdır.',
      'Toplu iş sözleşmesi veya hizmet akdi izin sürelerini artırmış olabilir (madde 43(2)); araç yalnızca yasal tabanı hesaplar.',
    ],
    faq: [
      {
        question: 'Altı ayı doldurmadan yıllık izin hakkım var mı?',
        answer:
          'Hayır. Madde 43(1) izin hakkını, deneme süresi de dahil olmak üzere işe girdiği tarihten başlayarak en az altı ay çalışmış olma koşuluna bağlıyor. Altı ay dolduğunda hak doğar; 12 aydan kısa hizmet süresi için madde 43(4) uyarınca süreye orantılı izin verilir ve kesirli çıkan günler bir sonraki izin hesaplamasına aktarılır.',
      },
      {
        question: 'Tam beş yıllık işçi kaç gün izin hak eder?',
        answer:
          '14 iş günü. Madde 43(1)(A) “altı aydan beş yıla kadar”, (B) ise “beş yıldan fazla” diyor; tam beş yıl (A) bendinde kalıyor ve 18 güne ancak beşinci yıl dolduktan sonra geçiliyor. Buna karşılık (C) ve (D) “on yıl ve daha fazla”, “on beş yıl ve daha fazla” yazdığı için tam 10 yıl 22, tam 15 yıl 25 iş günü hak ettiriyor.',
      },
      {
        question: 'İzne rastlayan hafta tatili ve resmî tatil izinden düşülür mü?',
        answer:
          'Hayır. Madde 46(2) uyarınca yıllık ücretli izin günlerinin hesaplanmasında izin sürelerine rastlayan resmî tatil ve hafta tatili günleri izin süresinden sayılmaz. Yasadaki süreler zaten iş günü olarak yazılmış. Madde 48(4) ayrıca izin süresine rastlayan resmî tatil ücretlerinin ayrıca ödeneceğini söylüyor.',
      },
      {
        question: 'Kullanmadığım izinler bir sonraki yıla devreder mi?',
        answer:
          'Kısmen. Madde 46(4) hak edilen iznin en az 14 iş gününün o yıl içinde kullanılmasını zorunlu tutuyor; işçi isterse artan izinler bir sonraki yıla aktarılabiliyor. Madde 46(5) ise aktarılarak biriktirilen izin gününün toplamının 50 iş gününü geçemeyeceğini söylüyor.',
      },
      {
        question: 'İşten ayrılırken kullanmadığım iznin ücretini alabilir miyim?',
        answer:
          'Evet. Madde 50(1): hizmet akdi her ne şekilde sona ererse ersin, hak kazanılıp kullanılmayan yıllık izin süresinin ücreti akdin sona erdiği tarihteki ücret üzerinden ödenir. Madde 50(2) uyarınca ihbar süreleri ile yıllık izin süreleri iç içe giremez.',
      },
      {
        question: 'Yıllık izin bölünerek kullanılabilir mi?',
        answer:
          'Kural olarak hayır. Madde 46(1) yıllık ücretli iznin bölünemeyeceğini söylüyor; ancak tarafların rızasıyla, bir bölümü sekiz günden az olmamak üzere bölünerek kullanılabiliyor.',
      },
      {
        question: 'İznimi yurt dışında geçireceksem yol izni var mı?',
        answer:
          'Madde 46(3): yıllık iznini işyerinin bulunduğu yerden başka bir yerde, yurt dışında geçirecek işçiye, talep etmesi ve bunu belgelemesi koşuluyla gidiş ve dönüşte yolda geçecek süreler için toplam yedi güne kadar ücretsiz izin verilir.',
      },
    ],
  },
  {
    slug: 'fazla-mesai-hesaplayici',
    updatedAt: '2026-09-10',
    related: [
      {
        slug: 'net-brut-maas-hesaplayici',
        reason: 'Brüt ücretinizden hangi kesintilerin yapıldığını ve ele geçen tutarı görün.',
      },
      {
        slug: 'yillik-izin-hesaplayici',
        reason: 'İzne rastlayan resmî tatiller izinden sayılmaz; yıllık izin hakkınızı hesaplayın.',
      },
    ],
    name: 'Fazla mesai hesaplayıcı',
    heading: 'Fazla mesai ve resmî tatil ücreti hesaplayıcı',
    title: 'KKTC Fazla Mesai ve Resmî Tatil Ücreti Hesaplama',
    summary:
      'Saat başı ücretinizi bulup hafta içi ve tatil fazla mesaisi ile resmî tatil ek ödemesini hesaplar.',
    description:
      'KKTC’de fazla mesai ücreti: 22/1992 İş Yasası madde 27’nin 50/2010 ile değişik zam oranlarına (%10 ve %50) ve madde 40’taki resmî tatil ücretine göre alacağınızı hesaplayın.',
    intro:
      'Fazla mesai zammı 2010’da değişti ve internette dolaşan özetlerin çoğu hâlâ eski oranları yazıyor. Bu araç, Çalışma Dairesi’nin yayımladığı güncel birleştirilmiş metindeki oranları kullanıyor.',
    legal: [
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 27',
        summary:
          '50/2010 ile değişik (3)(A): normal çalışma gününde her fazla saat için saat başı ücretin %10 fazlası. (3)(B): hafta tatili ve resmî tatil günlerinde %50 fazlası. (3)(Ç): saat başı ücret, aylık brüt ücretin o ay normal mesaide çalışılan saatler toplamına bölünmesiyle bulunur. (2): günde en çok 4 saat, yılda en çok 90 iş günü.',
      },
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 40',
        summary:
          'Resmî tatilde çalışılmazsa o günün ücreti bir iş karşılığı olmaksızın tam ödenir; çalışılırsa ücret bir kat fazlasıyla ödenir ve (2)(A) uyarınca esas alınacak resmî tatil ücreti saat başı ücretin sekiz katıdır.',
      },
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 41',
        summary:
          'Fazla çalışma karşılığı ücretler, primler ve sosyal yardımlar resmî tatil ücretinin saptanmasında hesaba katılmaz.',
      },
    ],
    sources: [LABOUR_LAW_SOURCE],
    assumptions: [
      'Ücretin aylık ödendiği varsayılır; haftalık ödemede madde 27(3)(D) uyarınca haftalık ücret × 52 ÷ 12 ile aylığa çevrilir.',
      'Zam oranları yasal asgari oranlardır; toplu iş sözleşmesi veya hizmet akdi artırmış olabilir (madde 27(3)(C)).',
    ],
    limitations: [
      'Parça başı, götürü ve yüzde usulü çalışanların saat başı ücreti madde 27(3) ve 40(2)(C)’ye göre farklı hesaplanır; araç bu usulleri kapsamaz.',
      'Madde 29A’daki %15 düzensiz mesai ödeneği hesaba dahil değildir.',
    ],
    faq: [
      {
        question: 'KKTC’de fazla mesai zammı yüzde kaç?',
        answer:
          'Normal çalışma günlerinde saat başı ücretin %10 fazlası, hafta tatili ve resmî tatil günlerinde %50 fazlası. Bu oranlar madde 27(3)(A) ve (B)’ye 50/2010 sayılı Değişiklik Yasası ile getirildi. İnternette sık rastlanan %50 ve “bir kat fazlası” oranları 2010 öncesi metne ait; bazı kurum siteleri hâlâ o metni yayımlıyor.',
      },
      {
        question: 'Saat başı ücretim nasıl hesaplanır?',
        answer:
          'Madde 27(3)(Ç): aylık brüt ücret, o ay içerisinde işyerindeki normal mesai sistemine göre çalışılan iş günlerinde çalışılan saatler toplamına bölünür. Payda “ayda 30 gün” değil, yalnızca o ay fiilen normal mesaide geçen saattir. Haftalık ödemede madde 27(3)(D) uyarınca haftalık ücret 52 ile çarpılıp 12’ye bölünerek aylık brüte çevrilir.',
      },
      {
        question: 'Günde ve yılda en fazla ne kadar fazla mesai yaptırılabilir?',
        answer:
          'Madde 27(2): fazla çalışma normal çalışma günlerinde günde dört saati geçemez ve fazla çalışma yapılan günlerin toplamı bir yılda doksan iş gününden fazla olamaz. Sınırın aşılmış olması işçinin o saatlerin ücretini kaybetmesi anlamına gelmez; işveren açısından ayrı bir sorumluluk doğurur.',
      },
      {
        question: 'Resmî tatilde çalışırsam ne kadar alırım?',
        answer:
          'Madde 40(1) uyarınca resmî tatil günlerinde çalışılmasa da o günün ücreti bir iş karşılığı olmaksızın tam ödenir. Çalışılması halinde madde 40(2) ücretin bir kat fazlasıyla ödenmesini istiyor; (2)(A) bendine göre esas alınacak resmî tatil ücreti, saat başı ücretin sekiz katıdır.',
      },
      {
        question: 'İşveren rızam olmadan fazla mesai yaptırabilir mi?',
        answer:
          'Madde 27(5) fazla çalışma için işçinin olurunun alınmasını şart koşuyor; bu olur toplu iş sözleşmesi veya hizmet akdiyle önceden de alınabiliyor. Madde 27(6) ise sağlık, ölüm ve doğum gibi nedenlerle, önceden oluru alınmış olsa bile işçiye istemediği hallerde fazla çalışma yaptırılamayacağını söylüyor.',
      },
      {
        question: 'Düzensiz mesai ödeneği nedir?',
        answer:
          'Madde 29A, işin niteliği gereği düzensiz saatlerde çalışan işçiye ücretinin %15’i oranında düzensiz mesai ödeneği öngörüyor; oran toplu iş sözleşmesi veya hizmet akdiyle artırılabiliyor. Bu ödenek fazla mesai zammından ayrı bir kalem ve bu araç onu hesaplamıyor.',
      },
    ],
  },
  {
    slug: 'toplu-isten-cikarma-hesaplayici',
    updatedAt: '2026-09-10',
    related: [
      {
        slug: 'yillik-izin-hesaplayici',
        reason: 'Madde 50: kullanılmayan yıllık iznin ücreti ayrıca ödenir — kaç gün hak ettiğinizi hesaplayın.',
      },
      {
        slug: 'ihtiyat-sandigi-hesaplayici',
        reason: 'İhtiyat Sandığı birikiminizi ve çekebileceğiniz avansı görün.',
      },
    ],
    name: 'Toplu işten çıkarma tazminatı hesaplayıcı',
    heading: 'Toplu işten çıkarma tazminatı ve ihbar hesaplayıcı',
    title: 'KKTC Toplu İşten Çıkarma Tazminatı Hesaplama',
    summary:
      'Madde 19 tazminatını ve onunla birlikte doğan madde 12 ihbar süresini birlikte hesaplar.',
    description:
      'KKTC’de toplu işten çıkarma tazminatı: 22/1992 İş Yasası madde 19’un hizmet süresi basamaklarına göre kaç haftalık ücret alacağınızı ve madde 12’deki ihbar süresini hesaplayın.',
    intro:
      'Madde 19 tazminatı, madde 12’deki bildirim kurallarına EK olarak ödeniyor. Bu yüzden araç iki kalemi birlikte gösteriyor; yalnızca birini hesaplamak alacağın yarısını görmek olur.',
    legal: [
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 19',
        summary:
          'Ekonomik, teknolojik veya yapısal nedenlerle beşten az olmamak üzere çalışanların en az %20’si işten çıkarılıyorsa uygulanır. Tazminat hizmet süresine göre 1, 2, 3, 4 veya 5 haftalık ücret tutarındadır ve madde 12’deki bildirim kuralları saklıdır. Altı aydan az süren mevsimlik ve kampanya işlerinde uygulanmaz.',
      },
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 12',
        summary:
          'Süresi belirsiz hizmet akdinin feshinden önce yazılı bildirim zorunludur; süre hizmet süresine göre 1, 3, 4, 5 veya 6 haftadır. Bildirim zorunluluğuna uymayan taraf bu sürelere ilişkin ücret tutarında tazminat öder.',
      },
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 50',
        summary:
          'Fesihte kullanılmayan yıllık iznin ücreti ayrıca ödenir; ihbar süreleri ile yıllık izin süreleri iç içe giremez.',
      },
    ],
    sources: [LABOUR_LAW_SOURCE],
    assumptions: [
      'Haftalık ücret, aylık brüt ücretin madde 27(3)(D) çevrimiyle bulunur: aylık × 12 ÷ 52.',
      'İhbar tazminatı, bildirim hiç yapılmadığı varsayımıyla gösterilir (madde 12(1)(C)).',
    ],
    limitations: [
      'Madde 19(5): toplu işten çıkarma nedenlerinin yeterli olmadığını ileri sürüp mahkemeye başvurma ve ayrıca tazminat isteme hakkı saklıdır; araç bu ihtimali fiyatlamaz.',
      'Bireysel fesihte madde 19 uygulanmaz; yalnızca madde 12 ihbar süresi doğar.',
    ],
    faq: [
      {
        question: 'Hangi durumda toplu işten çıkarma sayılır?',
        answer:
          'Madde 19(1): işverenin ekonomik, teknolojik, yapısal ve benzeri nedenlerle, kısa aralıklarla veya aynı anda beşten az olmamak üzere işyerinde çalışanların en az %20’sini işten çıkarması. İki eşiğin birlikte aşılması gerekiyor — 100 kişilik bir işyerinde 10 kişinin çıkarılması bu maddeyi devreye sokmaz.',
      },
      {
        question: 'Toplu işten çıkarma tazminatı ihbar tazminatına ek midir?',
        answer:
          'Evet. Madde 19(2), tazminatı “bu Yasanın 12’nci maddesindeki bildirime ilişkin kurallar saklı kalmak koşuluyla” veriyor. Yani madde 12’deki bildirim süresi ayrıca işler; bildirim yapılmazsa madde 12(1)(C) uyarınca o sürenin ücreti tutarında tazminat da ödenir.',
      },
      {
        question: 'Kaç haftalık ücret tazminat alırım?',
        answer:
          'Madde 19(2): hizmet süresi üç aydan altı aya kadar olana bir hafta, altı aydan bir yıla kadar iki hafta, bir yıldan iki yıla kadar üç hafta, iki yıldan beş yıla kadar dört hafta, beş yıldan fazla olana beş haftalık ücreti tutarında. Üç ayı doldurmamış işçi için bu madde uyarınca tazminat doğmaz.',
      },
      {
        question: 'İşveren ne kadar önce haber vermek zorunda?',
        answer:
          'Madde 19(1)(A) ve (B): işveren, işten çıkarma nedenlerini, çıkarılacak işçilerin isim ve görevlerini ve uygulamanın hangi sürede yer alacağını en az bir ay önce Çalışma Dairesi’ne bildirmek ve ayrıca çıkarmayı tasarladığı işçilere en az bir ay önce yazılı bildirimde bulunmak zorunda.',
      },
      {
        question: 'Çıkarıldıktan sonra işe geri alınma hakkım var mı?',
        answer:
          'Madde 19(3): işveren, çıkardığı işçilerin yerine üç ay içinde başka işçi alamaz. Bu süre içinde aynı işkolunda faaliyete başlaması veya yeniden işçi istihdamı gerekmesi halinde Daire aracılığıyla çıkardığı işçilere duyuruda bulunur; duyurudan başlayarak on beş gün içinde Daire’ye başvurmayanların yeniden istihdam edilme hakkı düşer.',
      },
      {
        question: 'İhbar süresi ne kadar?',
        answer:
          'Madde 12: hizmet süresi altı aya kadar olan işçi için bir hafta, altı aydan bir yıla kadar üç hafta, bir yıldan iki yıla kadar dört hafta, iki yıldan beş yıla kadar beş hafta, beş yıldan fazla olan için altı hafta. Bildirim yapmayan taraf bu sürelerin ücreti tutarında tazminat öder.',
      },
      {
        question: 'Deneme süresinde işten çıkarılırsam tazminat alır mıyım?',
        answer:
          'Hayır. Madde 11: deneme süresi en çok üç ay olabilir ve bu süre içinde taraflar hizmet akdini bildirim süresine gerek olmadan ve tazminatsız feshedebilir. İşçinin çalıştığı günlerin ücreti ve diğer hakları saklıdır.',
      },
      {
        question: 'Toplu işten çıkarmada önce kim çıkarılır?',
        answer:
          'Madde 19(6), toplu işten çıkarmada “ilk giren son çıkar” ilkesini öngörüyor: işe en son giren işçi ilk çıkarılır.',
      },
    ],
  },
  {
    slug: 'dogum-ve-mazeret-izni-hesaplayici',
    updatedAt: '2026-09-10',
    related: [
      {
        slug: 'yillik-izin-hesaplayici',
        reason: 'Doğum izni yıllık izin hakkınızı azaltmaz; yıllık izninizi ayrıca hesaplayın.',
      },
    ],
    name: 'Doğum ve mazeret izni hesaplayıcı',
    heading: 'Doğum, emzirme ve mazeret izni hesaplayıcı',
    title: 'KKTC Doğum İzni ve Mazeret İzni Hesaplama',
    summary: 'Doğum tarihinden yasak, ödeneksiz izin ve emzirme izni tarihlerini çıkarır.',
    description:
      'KKTC’de doğum izni: 22/1992 İş Yasası madde 56’ya göre 6+6 haftalık çalıştırma yasağının, isteğe bağlı ödeneksiz iznin ve dokuz aylık emzirme izninin tarihlerini hesaplayın. Madde 53 mazeret izinleri de listede.',
    intro:
      'Madde 56’daki süreler sabit; kişiye göre değişen tek şey doğum tarihi. Araç o tarihi alıp hangi günün hangi hakkın son günü olduğunu söylüyor.',
    legal: [
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 56',
        summary:
          '(1)(A) Kadın işçilerin doğumdan önce altı ve sonra altı hafta, toplam on iki hafta çalıştırılmaları yasaktır. (1)(B) Bunun dışında doğum öncesi ve sonrası altışar hafta ödeneksiz doğum izni hakkı vardır; Sağlık Kurulu raporuyla süreler artırılabilir. (2) Doğumdan itibaren dokuz ay boyunca günde iki saat emzirme izni, ücret kesintisi yapılmadan verilir.',
      },
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 53',
        summary:
          'Evlenmede üç gün; ana, baba, eş, kardeş veya çocuğun ölümünde ya da eşin doğum yapmasında iki gün ödenekli mazeret izni. Bu süreler asgaridir.',
      },
      {
        law: '22/1992 İş Yasası',
        article: 'Madde 45',
        summary:
          'Madde 56 uyarınca çalıştırılmayan günler ile madde 53 mazeret izinleri, yıllık ücretli izin hakkının hesabında çalışılmış süre sayılır.',
      },
    ],
    sources: [LABOUR_LAW_SOURCE],
    assumptions: [
      'Süreler doğum tarihinden itibaren takvim üzerinden sayılır; ekranda gösterilen tarihler ilgili hakkın son günüdür.',
    ],
    limitations: [
      'Sağlık Kurulu raporuyla sürelerin artırılması araçta hesaplanmaz (madde 56(1)(B)).',
      'Doğum izni süresince ödenecek analık ödeneği sosyal sigorta mevzuatına tabidir; bu araç ödenek tutarı hesaplamaz.',
    ],
    faq: [
      {
        question: 'KKTC’de doğum izni kaç hafta?',
        answer:
          'Madde 56(1)(A): kadın işçilerin doğumdan önce altı ve doğumdan sonra altı hafta olmak üzere toplam on iki haftalık süre içinde çalıştırılmaları yasak. Bunun dışında madde 56(1)(B) doğum öncesi ve sonrası altışar hafta ödeneksiz doğum izni kullanma hakkı veriyor; bu hakkı kullananlar sürelerin bitiminde aynı iş ve görevlerine devam ediyor.',
      },
      {
        question: 'Emzirme izni ne kadar sürüyor?',
        answer:
          'Madde 56(2)(A): doğum yapan kadın işçiye, doğum tarihinden itibaren dokuz ay süreyle bir saat sabah ve bir saat öğleden sonra olmak üzere günde iki saat emzirme izni verilir. (B) bendi bu izinlerin iş saatleri içinde ve herhangi bir ücret kesintisi yapılmadan verilmesini işverene yüklüyor.',
      },
      {
        question: 'Eşi doğum yapan işçinin izni var mı?',
        answer:
          'Var. Madde 53, eşin doğum yapması halinde iki gün ödenekli mazeret izni veriyor. Aynı madde evlenmede üç gün, ana veya babanın, eşin, kardeşlerin ya da çocukların ölümünde iki gün ödenekli izin öngörüyor. Bu süreler asgari; hizmet akitleri veya toplu iş sözleşmeleriyle artırılabiliyor.',
      },
      {
        question: 'Doğum ve mazeret izinleri yıllık izin hakkımı azaltır mı?',
        answer:
          'Hayır. Madde 45, yıllık ücretli izin hakkının hesabında çalışılmış sayılan süreleri sayarken (2) bendinde kadın işçilerin madde 56 uyarınca doğumdan önce ve sonra çalıştırılmadıkları günleri, (8) bendinde de madde 53 mazeret izinlerini açıkça listeliyor.',
      },
      {
        question: 'Doğum izni süreleri uzatılabilir mi?',
        answer:
          'Madde 56(1)(B) son cümlesi: bu süreler, işçinin sağlık durumuna ve işin özelliğine göre Sağlık Kurulu raporuyla belgelenmesi koşuluyla, doğumdan önce ve sonra gerekirse artırılabilir.',
      },
    ],
  },
  {
    slug: 'yabanci-calisma-izni-cezasi-hesaplayici',
    updatedAt: '2026-09-10',
    related: [
      {
        slug: 'net-brut-maas-hesaplayici',
        reason: 'Anlaşmalı ülke vatandaşı olmayan yabancı işçinin sigorta kesintisi %13 — maaş hesabı bu oranı uyguluyor.',
      },
    ],
    records: [
      {
        label: 'Yabancıların Çalışma İzinleri (Değişiklik) Tüzüğü — Ü(K-I) 1243-2025',
        href: '/karar/2025-uki-1243-2025-yabancilarin-calisma-izinleri-degisiklik-tuzugu',
      },
      {
        label: 'Yabancıların Çalışma İzinleri (Değişiklik) Tüzüğü — A.E. 41 (2026)',
        href: '/karar/2026-ae-41-yabancilarin-calisma-izinleri-yasasi-yabancilarin-calisma-izinleri',
      },
      {
        label: 'Yabancıların Çalışma İzinleri (Değişiklik) Tüzüğü — A.E. 860 (2026)',
        href: '/karar/2026-ae-860-yabancilarin-calisma-izinleri-yasasi-yabancilarin-calisma-izinleri',
      },
      {
        label: 'Kesinleşen asgari ücret — Ü(K-I) 1588-2026',
        href: '/karar/2026-uki-1588-2026-kesinlesen-asgari-ucret',
        note: 'Cezanın katı alındığı tutar',
      },
    ],
    name: 'Çalışma izni cezası hesaplayıcı',
    heading: 'Yabancı çalışma izni ceza riski hesaplayıcı',
    title: 'KKTC İzinsiz Yabancı Çalıştırma Cezası Hesaplama',
    summary: 'İdari para cezasını ve mahkemeye gitmesi halindeki azami riski hesaplar.',
    description:
      'KKTC’de izinsiz yabancı çalıştırma cezası: 63/2006 Yabancıların Çalışma İzinleri Yasası madde 24 ve 25’e göre kişi başı idari para cezasını, aynı yıl içindeki tekrar artırımlarını ve mahkeme riskini hesaplayın.',
    intro:
      'Ceza, kişi başı ve yürürlükteki aylık brüt asgari ücretin katı olarak hesaplanıyor. Artırım sayacı işverenin bütün geçmişini değil, AYNI YIL içindeki tekrarları sayıyor.',
    legal: [
      {
        law: '63/2006 Yabancıların Çalışma İzinleri Yasası',
        article: 'Madde 24',
        summary:
          '(1) Aykırılık tespitinde önce on beş günlük düzeltme uyarısı yapılır. (2)(Ç) Madde 7 yasaklarına aykırı çalıştırmada kişi başı bir kat aylık brüt asgari ücret; aynı yıl içinde ikinci tekrarda ceza bir kat, üçüncü tekrarda üç katı artırılarak uygulanır. (2)(D) İşçi daha önce madde 17 uyarınca işten durdurulmuş bildirilmişse ceza bir kat daha artırılır. (2)(A)(B)(C) Madde 20, tüzük ve madde 17 bildirim ihlallerinde asgari ücretin yarısı.',
      },
      {
        law: '63/2006 Yabancıların Çalışma İzinleri Yasası',
        article: 'Madde 25',
        summary:
          '(1) Madde 17, 20 ve tüzük ihlallerinde mahkûmiyet halinde aylık brüt asgari ücretin on katına kadar para cezası. (2) Madde 7 ihlalinde, izinsiz çalıştırılan her kişi için on iki katına kadar para cezası veya iki yıla kadar hapis veya her ikisi; tüzel kişide direktör de aynı suçu işlemiş sayılır.',
      },
    ],
    sources: [
      {
        label: '63/2006 Yabancıların Çalışma İzinleri Yasası',
        href: '/yasa/63-2006-yabancilarin-calisma-izinleri-yasasi',
        note: '42/2016 ve 25/2025 değişiklikleriyle birleştirilmiş metin',
      },
      {
        label: 'Yabancıların Çalışma İzinleri Tüzüğü (birleştirilmiş metin)',
        href: '/tuzuk/yabancilarin-calisma-izinleri-tuzugu',
        note: 'A.E. 473/2025, A.E. 41/2026 ve A.E. 860/2026 değişiklikleriyle',
      },
      {
        label: 'KKTC Çalışma Dairesi — asgari ücret',
        href: 'http://calisma.gov.ct.tr/Asgari-Ücret',
      },
    ],
    assumptions: [
      'Ceza, hesaplama anındaki yürürlükteki aylık brüt asgari ücret üzerinden hesaplanır.',
      'Madde 24(2)(Ç)’deki “üç katı artırılarak” ifadesi lafzına uygun olarak dört kat sayılır.',
    ],
    limitations: [
      'İdari para cezasının süresinde ödenmemesi halinde gecikme zammı işler; araç yalnızca ana tutarı hesaplar.',
      'Mahkeme cezaları azami sınırdır; hükmü veren mahkeme takdir yetkisini kullanır.',
    ],
    faq: [
      {
        question: 'İzinsiz yabancı çalıştırmanın cezası ne kadar?',
        answer:
          '63/2006 sayılı Yasa’nın madde 24(2)(Ç) bendi uyarınca, çalışma izinsiz çalıştırıldığı tespit edilen yabancı uyruklu her kişi için kişi başı bir kat yürürlükteki aylık brüt asgari ücret. Ceza kişi başı uygulandığı için üç kişi çalıştıran işveren üç katıyla karşılaşır.',
      },
      {
        question: 'Ceza tekrarında artıyor mu?',
        answer:
          'Evet, ama sayaç yıllık. Madde 24(2)(Ç): aynı yıl içerisinde aynı suçun ikinci kez tekrarı halinde ceza bir kat artırılarak, üçüncü kez tekrarı halinde üç katı artırılarak uygulanıyor. Ayrıca madde 24(2)(D), işçinin daha önce aynı işveren tarafından madde 17 uyarınca işten durdurulmuş bildirilmiş olması halinde cezanın bir kat daha artırılmasını öngörüyor.',
      },
      {
        question: 'Ceza kesilmeden önce uyarı yapılıyor mu?',
        answer:
          'Bazı ihlallerde evet. Madde 24(1): aykırılık tespit edildiğinde işverene, aykırı hususların on beş gün içinde düzeltilmesi için yazılı uyarı yapılır ve ceza ancak süre sonunda düzeltilmemişse uygulanır. Ancak madde 17(1) uyarınca işten ayrılışın on beş gün içinde bildirilmemesinde bu uyarı yapılmıyor.',
      },
      {
        question: 'Bildirim ve tüzük ihlallerinin cezası ne kadar?',
        answer:
          'Madde 24(2)(A), (B) ve (C): madde 20(1) denetim kurallarına aykırılıkta, madde 23 altında çıkarılan tüzüğe aykırı tespit edilen her husus için ve işten ayrılışın on beş gün içinde bildirilmemesinde, yürürlükteki aylık brüt asgari ücretin yarısı kadar idari para cezası uygulanıyor.',
      },
      {
        question: 'Hapis cezası riski var mı?',
        answer:
          'Madde 25(2): madde 7’nin (1)’inci ve (2)’nci fıkralarına aykırı hareket edenler bir suç işlemiş olur ve mahkûmiyetleri halinde, izinsiz çalıştırılan her kişi için aylık brüt asgari ücretin on iki katına kadar para cezasına veya iki yıla kadar hapis cezasına veya her ikisine birden çarptırılabilir. Suçu işleyen tüzel kişiyse direktörü de aynı suçu işlemiş sayılır.',
      },
      {
        question: 'Çalışma izinli yabancı işçinin sigorta primi ne kadar?',
        answer:
          '29 Temmuz 2026’dan itibaren YGK 83/2026 uyarınca, KKTC ile işlem eşitliği sağlayan sosyal güvenlik anlaşması bulunan ülke vatandaşı olmayan sigortalıların sigortalı hissesi %13, işveren hissesi %9,75 artı iş kazası primi; işsizlik primi uygulanmıyor. TC vatandaşları KKTC vatandaşlarıyla aynı oranlara (%9) tabi. Net–brüt maaş aracı bu ayrımı hesaba katıyor.',
      },
    ],
  },
];

export function findTool(slug: string): Tool | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

export const TOOLS_PATH = '/arac';

export function toolPath(slug: string): string {
  return `${TOOLS_PATH}/${slug}`;
}
