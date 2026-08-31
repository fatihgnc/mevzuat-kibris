/**
 * Başvuru bitiş tarihi çıkarımı — spec 3.9.
 *
 * İki yerde kullanılıyor ve ikisi de önemli:
 *   1. Ürün: /konu/munhal akışında "başvurusu açık" filtresi ve her kayıtta
 *      vurgulanmış bitiş tarihi. Segmentin gerçek sorusu bu.
 *   2. SEO: JobPosting yapılandırılmış verisinin zorunlu validThrough alanı.
 *
 * BELİRSİZSE ALAN BOŞ BIRAKILIR, TAHMİN EDİLMEZ. Yanlış bir son başvuru
 * tarihi, tarih olmamasından çok daha zararlı: kullanıcı hakkını kaybediyor.
 */

const MONTHS: Record<string, number> = {
  ocak: 1,
  şubat: 2,
  subat: 2,
  mart: 3,
  nisan: 4,
  mayıs: 5,
  mayis: 5,
  haziran: 6,
  temmuz: 7,
  ağustos: 8,
  agustos: 8,
  eylül: 9,
  eylul: 9,
  ekim: 10,
  kasım: 11,
  kasim: 11,
  aralık: 12,
  aralik: 12,
};

/** Bitiş tarihini işaret eden ifadeler; tarih bunların yakınında aranıyor. */
const CUES = [
  'son başvuru',
  'başvuru süresi',
  'başvurular',
  'müracaatlar',
  'müracaat süresi',
  'başvuru tarihi',
  'son müracaat',
  'teklifler',
  'ihale tarihi',
];

const CUE_WINDOW = 160;

/** "26 Ocak 2026" ya da "26.01.2026" / "26/01/2026" */
const DATE_PATTERNS = [
  /(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]+)\s+(\d{4})/g,
  /(\d{1,2})[./](\d{1,2})[./](\d{4})/g,
];

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

interface Found {
  iso: string;
  index: number;
}

function findDates(text: string): Found[] {
  const found: Found[] = [];

  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const day = Number(match[1]);
      const rawMonth = match[2]!;
      const year = Number(match[3]);

      const month = /^\d+$/.test(rawMonth)
        ? Number(rawMonth)
        : MONTHS[rawMonth.toLocaleLowerCase('tr')];

      if (month === undefined) continue;

      const iso = toIso(year, month, day);
      if (iso) found.push({ iso, index: match.index });
    }
  }

  return found;
}

export interface DeadlineResult {
  deadlineAt: string | null;
  /** "Yazılı sınav 14 Şubat 2026, altı kadro" gibi ek bağlam */
  note: string | null;
}

/**
 * Gövde metninden son başvuru tarihini çıkarır.
 *
 * Yöntem: ipucu ifadesinin geçtiği yerin yakınındaki tarihi al. Birden çok
 * aday varsa ve hepsi aynı değilse alan boş bırakılır — hangisinin doğru
 * olduğunu bilmediğimiz bir durumda tahmin etmiyoruz.
 */
export function extractDeadline(bodyText: string | null): DeadlineResult {
  if (!bodyText) return { deadlineAt: null, note: null };

  const text = bodyText.replace(/\s+/g, ' ');
  const lower = text.toLocaleLowerCase('tr');
  const dates = findDates(text);
  if (!dates.length) return { deadlineAt: null, note: null };

  const candidates = new Set<string>();

  for (const cue of CUES) {
    let from = 0;
    for (;;) {
      const cueIndex = lower.indexOf(cue, from);
      if (cueIndex === -1) break;

      for (const date of dates) {
        if (Math.abs(date.index - cueIndex) <= CUE_WINDOW) candidates.add(date.iso);
      }

      from = cueIndex + cue.length;
    }
  }

  if (candidates.size !== 1) {
    // Sıfır aday: ipucu yok. Birden çok farklı aday: hangisi olduğu belirsiz.
    // İki durumda da boş bırakıyoruz (spec 3.9).
    return { deadlineAt: null, note: extractNote(text) };
  }

  return { deadlineAt: [...candidates][0]!, note: extractNote(text) };
}

/** Sınav tarihi ve kadro sayısı gibi ikincil bilgi — vurgulanmaz, yanına yazılır. */
function extractNote(text: string): string | null {
  const exam = /(?:yazılı\s+)?sınav[^.]{0,60}?(\d{1,2}\s+[A-Za-zÇĞİÖŞÜçğıöşü]+\s+\d{4})/i.exec(text);
  const positions = /(\b(?:bir|iki|üç|dört|beş|altı|yedi|sekiz|dokuz|on|on iki|on dört|yirmi bir)\b|\d+)\s+kadro/i.exec(
    text,
  );

  const parts: string[] = [];
  if (exam?.[1]) parts.push('Yazılı sınav ' + exam[1]);
  if (positions?.[0]) parts.push(positions[0].toLocaleLowerCase('tr'));

  return parts.length ? parts.join(', ') : null;
}
