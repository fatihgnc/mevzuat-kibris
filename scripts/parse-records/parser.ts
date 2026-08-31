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
  { type: 'mia', pattern: /GENELGE\s+MİA\.(\d+\/\d{4})/i },
  { type: 'rekabet', pattern: /KARAR\s+SAYISI:\s?(\d+\/\d{4})/i },
  { type: 'eskieser', pattern: /KARAR\s+NO:\s?(\d+\/\d+)/i },
  { type: 'yt', pattern: /Y\.T\.NO:\s?(\d+\/\d+\/\d{4})/i },
  { type: 'yo', pattern: /Y\.Ö\.NO:\s?(\d+\/\d+\/\d{4})/i },
  { type: 'ae', pattern: /A\.E\.\s?(\d+)/ },
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
const PRIMARY_REF_TYPES = new Set<RefType>(['ae', 'uki', 'ukii', 'sm', 'mt', 'yt', 'yo']);

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
        found.push({ type, number: match[1]!, index: match.index });
      }
    }
  }

  return found.sort((a, b) => a.index - b.index);
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
