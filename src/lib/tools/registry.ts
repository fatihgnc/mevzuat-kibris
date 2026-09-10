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
  label: 'Çalışma Dairesi — 22/1992 İş Yasası (birleştirilmiş güncel metin)',
  href: 'http://calisma.gov.ct.tr/Portals/39/22-1992_1.pdf',
  note: '30/1993, 25/2000, 51/2002, 15/2004, 50/2010 ve 23/2015 değişiklikleriyle',
};

const EMU_LAW_LIST: ToolSource = {
  label: 'DAÜ İnsan Kaynakları — çalışma ile ilgili KKTC yasaları',
  href: 'https://hr.emu.edu.tr/tr/ilgili-kktc-yasalari',
  note: 'İş Yasası metni burada 51/2002’de kalmış; fazla mesai oranları için kullanmayın',
};

export const TOOLS: readonly Tool[] = [
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
        label: 'DAÜ İnsan Kaynakları — 73/2007 Sosyal Güvenlik Yasası',
        href: 'https://hr.emu.edu.tr/tr/ilgili-kktc-yasalari/sosyal-guvenlik-yasasi',
      },
      {
        label: 'DAÜ İnsan Kaynakları — Kıbrıs Türk Sosyal Sigortalar Yasası',
        href: 'https://hr.emu.edu.tr/tr/ilgili-kktc-yasalari/kibris-turk-sosyal-sigortalar-yasasi',
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
        label: 'KKTC Vergi Dairesi — 24/1982 Gelir Vergisi Yasası (birleştirilmiş metin)',
        href: 'https://www.vergi.gov.ct.tr/?q=content%2Fyasa-ve-t%C3%BCz%C3%BCkler',
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
    sources: [LABOUR_LAW_SOURCE, EMU_LAW_LIST],
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
    sources: [LABOUR_LAW_SOURCE, EMU_LAW_LIST],
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
    sources: [LABOUR_LAW_SOURCE, EMU_LAW_LIST],
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
    sources: [LABOUR_LAW_SOURCE, EMU_LAW_LIST],
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
        label: 'Yabancıların Çalışma İzinleri Tüzüğü — A.E. 41 (2026)',
        href: '/karar/2026-ae-41-yabancilarin-calisma-izinleri-yasasi-yabancilarin-calisma-izinleri',
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
        label: 'Merkezi Mevzuat Dairesi — 63/2006 Yabancıların Çalışma İzinleri Yasası',
        href: 'https://mevzuat.gov.ct.tr/Portals/48/63-2006%20Yabanclarn%20Calsms%20Izinleri%20Yasas%20(1).pdf',
        note: '42/2016 ve 25/2025 değişiklikleriyle birleştirilmiş metin',
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
        label: 'DAÜ İnsan Kaynakları — İhtiyat Sandığı Yasası',
        href: 'https://hr.emu.edu.tr/tr/ilgili-kktc-yasalari/ihtiyat-sandi%C4%9F%C4%B1-yasasi',
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
];

export function findTool(slug: string): Tool | undefined {
  return TOOLS.find((tool) => tool.slug === slug);
}

export const TOOLS_PATH = '/arac';

export function toolPath(slug: string): string {
  return `${TOOLS_PATH}/${slug}`;
}
