import * as cheerio from 'cheerio';

import { SECTION_HEADINGS, type Section } from '../../src/lib/constants/sections';
import type { RefType } from '../../src/lib/constants/doc-types';

/**
 * Arşiv İÇERİK hücresi ayrıştırıcısı — spec 3.3.
 *
 * KRİTİK KURAL: tek bir İÇERİK hücresinde onlarca kayıt olabilir ve bunlar
 * sırasız/tekrarlı olabilir. Ayrıştırıcı "bu metinde kaç ayrı kayıt var"
 * sorusunu sorar; ilk eşleşmeyi alıp durmaz.
 *
 * Aynı konu hem EK III'te A.E. numarasıyla hem EK IV BÖLÜM I'de Ü(K-I)
 * numarasıyla görünebilir. Bunlar ayrı kayıt olarak saklanır ve sonradan
 * related_record_id ile bağlanır (link-related.ts).
 */

export interface ParsedRecord {
  section: Section;
  refType: RefType | null;
  refNumber: string | null;
  title: string;
  /** KONU: sonrası, varsa */
  subject: string | null;
  /** Hücredeki sırası — aynı sayı içinde deterministik slug üretimi için */
  ordinal: number;
  /** DÜZELTME kaydı mı */
  isCorrection: boolean;
}

/**
 * Referans çapaları — spec 3.3 tablosu.
 *
 * Sıra önemli: Ü(K-I) ve Ü(K-II) birbirine benziyor, daha uzun olan önce
 * denenmeli. GENELGE MİA, KARAR SAYISI ve KARAR NO da genel desenlerden önce.
 */
const REF_PATTERNS: Array<{ type: RefType; pattern: RegExp }> = [
  { type: 'ukii', pattern: /Ü\(K-II\)\s?(\d+-\d{4}|\d+)/ },
  { type: 'uki', pattern: /Ü\(K-I\)\s?(\d+-\d{4}|\d+)/ },
  /*
   * Bakanlar Kurulu kararının dönemsel önekleri (bkz. REF_TYPES notu).
   * S(K-II) ve TE(K-I), K(II)'den ÖNCE denenmeli: üçü de parantezli seri harfi
   * taşıyor ve kısa olan uzun olanın içinde eşleşmesin diye sıra bu.
   *
   * `s` deseni bilerek dar — yalın "S-" fazlasıyla genel ve başlık içindeki
   * atıfları ("KARAR İPTALİ (S-1265-2005 ...)") kayıt sanırdı. Tam
   * NUMARA-YIL biçimini şart koşuyoruz.
   */
  { type: 'skii', pattern: /S\(K-II\)\s?(\d+-\d{4}|\d+)/ },
  { type: 'teki', pattern: /TE\(K-I\)\s?(\d+-\d{4}|\d+)/ },
  { type: 'kii', pattern: /K\(II\)[-\s]?(\d+-\d{4}|\d+)/ },
  { type: 's', pattern: /\bS-(\d{1,5}-\d{4})/ },
  { type: 'mia', pattern: /GENELGE\s+MİA\.(\d+\/\d{4})/i },
  { type: 'rekabet', pattern: /KARAR\s+SAYISI:\s?(\d+\/\d{4})/i },
  { type: 'eskieser', pattern: /KARAR\s+NO:\s?(\d+\/\d+)/i },
  { type: 'yt', pattern: /Y\.T\.NO:\s?(\d+\/\d+\/\d{4})/i },
  { type: 'yo', pattern: /Y\.Ö\.NO:\s?(\d+\/\d+\/\d{4})/i },
  // 2018 arşivi binlik ayracı kullanıyor: "A.E.1.093" = A.E. 1093.
  { type: 'ae', pattern: /A\.E\.\s?(\d+(?:\.\d{3})+|\d+)/ },
  { type: 'sm', pattern: /Ş\.M\.\s?(\d+)/ },
  { type: 'mt', pattern: /M\.T\.\s?(\d+)/ },
];

/**
 * Birincil referanslar gazetenin kendi yayım numaralarıdır ve bir kaydın
 * başlangıcını işaretler. İkincil olanlar (Rekabet Kurulu KARAR SAYISI,
 * Eski Eserler KARAR NO, GENELGE MİA) kararın kendi iç numarasıdır ve
 * çoğunlukla bir A.E. kaydının BAŞLIĞI içinde geçer.
 *
 * Bu ayrım olmadan "A.E. 1070 REKABET KURULU KARARI-KARAR SAYISI:318/2025 KONU:..."
 * satırı iki kayda bölünüyordu; oysa tek kayıt. Satırda hiç birincil referans
 * yoksa ikincil olan kaydın referansı olarak kullanılır.
 */
const PRIMARY_REF_TYPES = new Set<RefType>([
  'ae',
  'uki',
  'ukii',
  's',
  'skii',
  'kii',
  'teki',
  'sm',
  'mt',
  'yt',
  'yo',
]);

/** Bölüm başlığı satırı mı, öyleyse hangi bölüm. */
function matchSectionHeading(line: string): Section | null {
  const trimmed = line.trim().replace(/\s+/g, ' ').replace(/[:.]+$/, '');
  for (const [pattern, section] of SECTION_HEADINGS) {
    if (pattern.test(trimmed)) return section;
  }
  return null;
}

/**
 * Bir satırdaki tüm referansları bulur. Tek satırda birden çok referans
 * olabiliyor; hepsini döndürüyoruz ki kayıt sayısı doğru çıksın.
 */
function findRefs(text: string): Array<{ type: RefType; number: string; index: number }> {
  const found: Array<{ type: RefType; number: string; index: number }> = [];

  for (const { type, pattern } of REF_PATTERNS) {
    const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let match: RegExpExecArray | null;

    while ((match = global.exec(text)) !== null) {
      // Ü(K-I) deseni Ü(K-II) içinde de eşleşir; daha uzun eşleşme kazansın.
      const overlapping = found.some(
        (item) => match!.index >= item.index && match!.index < item.index + 12,
      );
      if (!overlapping) {
        /*
         * Binlik ayracı at: 2018'in "A.E.1.093"ü ile 2025'in "A.E.1071"i aynı
         * seriden. Nokta korunursa aynı referans iki ayrı numara gibi
         * saklanır ve alarm eşleşmesi yıllar arasında kopar.
         */
        const number = type === 'ae' ? match[1]!.replace(/\./g, '') : match[1]!;
        found.push({ type, number, index: match.index });
      }
    }
  }

  return found.sort((a, b) => a.index - b.index);
}

/**
 * Bir metindeki BİRİNCİL referansları döndürür — dışarıya açık yüz.
 *
 * Tadil/iptal kayıtlarının konusunu atıf yaptıkları karardan devralmak için
 * gerekiyor (scripts/reclassify/inherit.ts): "Ü(K-I) 1880-2024 SAYI VE ...
 * KARARIN TADİL EDİLMESİ" başlığındaki referansın çözülmesi lazım. İkincil
 * referanslar (Rekabet KARAR SAYISI vb.) bilerek dışarıda: onlar kararın iç
 * numarası, ayrı bir kayda işaret etmiyor.
 */
export function findPrimaryRefs(text: string): Array<{ type: RefType; number: string }> {
  return findRefs(text)
    .filter((ref) => PRIMARY_REF_TYPES.has(ref.type))
    .map((ref) => ({ type: ref.type, number: ref.number }));
}

/** KONU: sonrasını ayırır. */
function splitSubject(text: string): { title: string; subject: string | null } {
  const match = /\bKONU:\s*/i.exec(text);
  if (!match) return { title: text.trim(), subject: null };

  return {
    title: text.trim(),
    subject: text.slice(match.index + match[0].length).trim() || null,
  };
}

/**
 * Kayıt sınırlarını bulur.
 *
 * Gazete dökümünde her kayıt kendi satırında olmayabiliyor; referans numarası
 * kaydın başlangıcını işaretliyor. Referansı olmayan bloklar (örneğin mahkeme
 * duyuruları) da kayıt sayılıyor ama refType null kalıyor — bunları atmak
 * gazetenin bir kısmını görünmez yapardı.
 */
export function parseIndexCell(raw: string): ParsedRecord[] {
  const lines = raw
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);

  const records: ParsedRecord[] = [];
  let section: Section = 'MAIN';
  let ordinal = 0;

  for (const line of lines) {
    const heading = matchSectionHeading(line);
    if (heading) {
      section = heading;
      continue;
    }

    // Bölüm başlığı gibi görünen ama olmayan tek kelimelik satırları atla
    if (line.length < 6) continue;

    const allRefs = findRefs(line);
    const isCorrection = /^DÜZELTME\s*:/i.test(line);

    // Satırda birincil referans varsa kayıt sınırlarını yalnızca onlar belirler.
    const primary = allRefs.filter((ref) => PRIMARY_REF_TYPES.has(ref.type));
    const refs = primary.length ? primary : allRefs;

    if (refs.length === 0) {
      const { title, subject } = splitSubject(line);
      records.push({
        section,
        refType: null,
        refNumber: null,
        title,
        subject,
        ordinal: ordinal++,
        isCorrection,
      });
      continue;
    }

    /*
     * Satırda birden çok referans varsa her biri ayrı kayıt. Başlık, o
     * referanstan bir sonrakine kadar olan metin. Bu, "GLOBAL INVESTMENT ...,
     * NICOSIA LANGUAGE CENTRE LIMITED, ..." gibi tek satıra sıkıştırılmış
     * çoklu şirket kayıtlarını doğru bölüyor (spec 7.3 zor vakası).
     */
    for (let i = 0; i < refs.length; i += 1) {
      const ref = refs[i]!;
      const next = refs[i + 1];
      const segment = line.slice(ref.index, next ? next.index : undefined).trim();
      /*
       * DÜZELTME öneki referanstan önce geliyor ve dilimleme onu kesiyor.
       * Öneki geri ekliyoruz: hem başlık kaynağa sadık kalıyor hem de
       * sınıflandırıcı kaydın bir düzeltme olduğunu görebiliyor.
       */
      const withPrefix = isCorrection && i === 0 ? 'DÜZELTME: ' + segment : segment;
      const { title, subject } = splitSubject(withPrefix || line);

      records.push({
        section,
        refType: ref.type,
        refNumber: ref.number,
        title,
        subject,
        ordinal: ordinal++,
        isCorrection,
      });
    }
  }

  return records;
}

/** Hücre metnini karşılaştırılabilir hâle getirir: &nbsp; ve katlanmış boşluklar. */
function cellText(raw: string): string {
  return raw.replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Bir referans hücresi ne kadar uzun olabilir. Referanslar kısa ("S(K-II)
 * 566-2006" 16 karakter); başlıklar uzun. Eşik, uzun bir başlığın içindeki
 * atıfın referans hücresi sanılmasını engelliyor.
 */
const REF_CELL_MAX = 40;

/**
 * İÇERİK hücresinin İÇ TABLOSUNU ayrıştırır — gerçek arşivin biçimi bu.
 *
 * Neden ayrı bir yol: parseIndexCell düz metin dökümü varsayıyor ve referansın
 * başlıkla AYNI satırda olmasına dayanıyor. Gerçek arşivde İÇERİK hücresi
 *
 *     BÖLÜM | REFERANS | BAŞLIK | (artık sütun)
 *
 * sütunlu bir <table>. Metne düzleştirilince her hücre kendi satırına düşüyor
 * ve her kayıt ikiye bölünüyordu: biri referansı taşıyıp başlığı "A.E.1071"
 * olan, diğeri başlığı taşıyıp referansı olmayan. 2025 için 3.977 gerçek
 * satırdan 7.170 sahte kayıt çıkıyordu, %48'i referanssız.
 *
 * Yapıdan okumanın metne düzleştirmeye üstünlüğü yalnızca doğruluk değil:
 * referans HÜCREDEN geldiği için başlık içindeki atıflar ("KARAR İPTALİ
 * (S-1265-2005 ...)") artık hayalet kayıt üretemiyor. Metin yolunda bu ancak
 * sınır bulma sezgisiyle çözülebiliyordu.
 *
 * Tablo yoksa null döner; çağıran metin yoluna düşer (2025'te 262 sayının
 * 2'si, 2018'de 194'ün 1'i böyle).
 *
 * Ölçülen biçim çeşitliliği (2006, 2012, 2018, 2025 — 13.750 satır):
 * - Sütun sayısı yıla göre değişiyor: 2018 çoğunlukla 3, diğerleri 4, kimi
 *   satır 5. Bu yüzden sütunlar sabit indeksle değil İÇERİĞE göre bulunuyor.
 * - BÖLÜM sütunu satırların ancak ~%15'inde dolu; blok başlığı ve aşağı
 *   taşınıyor.
 * - Referansı olmayan kayıt normal (yasalar: EK I BÖLÜM I, numarasız).
 */
export function parseIndexTable(html: string): ParsedRecord[] | null {
  const $ = cheerio.load(html);
  if ($('table').length === 0) return null;

  const records: ParsedRecord[] = [];
  let section: Section = 'MAIN';
  let ordinal = 0;

  for (const row of $('tr').toArray()) {
    // Sarmalayıcı satırlar (içinde tablo olanlar) veri değil, yalnızca kap.
    if ($(row).find('table').length > 0) continue;

    const cells = $(row)
      .find('td')
      .toArray()
      .map((cell) => cellText($(cell).text()));

    if (cells.every((cell) => !cell)) continue;

    /*
     * Sütun 1 bölüm başlığı. Tanınmayan değer (tek başına "EK V", ya da
     * klavye kazası) bilerek yok sayılıyor: taşınan bölüm korunuyor.
     * Tahmin etmek yanlış bölüme yazmaktan iyi değil.
     */
    if (cells[0]) {
      const heading = matchSectionHeading(cells[0]);
      if (heading) section = heading;
    }

    const rest = cells.slice(1);

    // Referans hücresi: kısa VE içinde birincil referans olan ilk hücre.
    let refIndex = -1;
    let ref: { type: RefType; number: string } | null = null;

    for (let i = 0; i < rest.length; i += 1) {
      const candidate = rest[i]!;
      if (!candidate || candidate.length > REF_CELL_MAX) continue;

      const primary = findRefs(candidate).filter((item) => PRIMARY_REF_TYPES.has(item.type));
      if (primary.length) {
        refIndex = i;
        ref = { type: primary[0]!.type, number: primary[0]!.number };
        break;
      }
    }

    /*
     * Başlık: kalan hücrelerin en uzunu. Sabit indeks kullanılamıyor çünkü
     * başlık 2018'de 3., 2025'in bazı satırlarında 4. sütunda. "En uzun"
     * ikisini de doğru buluyor ve artık boş sütunları eliyor.
     */
    let title = '';
    for (let i = 0; i < rest.length; i += 1) {
      if (i === refIndex) continue;
      const candidate = rest[i]!;
      if (candidate.length > title.length) title = candidate;
    }

    /*
     * Referansı olup başlığı olmayan satır kaydı hak ediyor — gazete o
     * numarayı yayımlamış. Başlık yerine referans etiketi konuyor ki kayıt
     * künyesiz kalmasın.
     */
    if (!title && ref) title = cells[refIndex + 1] ?? '';
    if (!title && !ref) continue;

    /*
     * Referans sütunu boşsa başlığın içine bak. Yasa tasarısı ve önerilerinin
     * numarası tasarım gereği başlığın içinde yazılı ("... YASA TASARISI
     * (Y.T.NO:2/2006)"), ayrı sütunda değil; EK VI'nın neredeyse tamamı böyle.
     *
     * Yalnızca referans hücresi BULUNAMADIĞINDA çalışıyor. Hücresi olan
     * satırda başlıktaki atıflar ("KARAR İPTALİ (S-1265-2005 ...)") kaydın
     * referansını gasbedemesin diye.
     */
    if (!ref) {
      const inTitle = findRefs(title).filter((item) => PRIMARY_REF_TYPES.has(item.type));
      if (inTitle.length) ref = { type: inTitle[0]!.type, number: inTitle[0]!.number };
    }

    const isCorrection = /^DÜZELTME\b/i.test(title);
    const { title: cleanTitle, subject } = splitSubject(title);

    records.push({
      section,
      refType: ref?.type ?? null,
      refNumber: ref?.number ?? null,
      title: cleanTitle,
      subject,
      ordinal: ordinal++,
      isCorrection,
    });
  }

  return records;
}

/**
 * PDF metninden bir kaydın gövdesini çıkarır.
 *
 * Referans numarasının PDF metninde geçtiği yeri bulup bir sonraki referansa
 * kadar olan kısmı alıyoruz. Bulunamazsa null — uydurulmuş bir gövde,
 * gövdesizlikten kötü.
 */
export function extractBody(
  pdfText: string,
  refLabel: string | null,
  nextRefLabel: string | null,
): { body: string | null; pageFrom: number | null } {
  if (!refLabel) return { body: null, pageFrom: null };

  const escaped = refLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
  const start = new RegExp(escaped, 'i').exec(pdfText);
  if (!start) return { body: null, pageFrom: null };

  let end = pdfText.length;
  if (nextRefLabel) {
    const nextEscaped = nextRefLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
    const nextMatch = new RegExp(nextEscaped, 'i').exec(pdfText.slice(start.index + refLabel.length));
    if (nextMatch) end = start.index + refLabel.length + nextMatch.index;
  }

  const body = pdfText.slice(start.index, end).trim();

  // pdftotext sayfa ayracı olarak form feed basıyor; kaçıncı sayfada olduğunu
  // buradan sayıyoruz.
  const pageFrom = pdfText.slice(0, start.index).split('\f').length;

  return { body: body.length > 40 ? body : null, pageFrom };
}
