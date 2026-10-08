import { turkishUpper } from '../../src/lib/text/turkish-lower';
import { titleCase } from '../shared/turkish-suffix';

/**
 * The circular numbers on khk.gov.ct.tr and how they map onto our records.
 *
 * Series seen in 2022-2026: MİA (ilk atama), MT (yükselme), Ö (öğretmen), YD
 * (yabancı dil yeterlik), Y. 2021 numbers its circulars with no prefix at all
 * ("74/2021") and is not handled here.
 */

export type Series = 'MİA' | 'MT' | 'Ö' | 'YD' | 'Y';

export interface Circular {
  series: Series;
  /** "41", or "25A" for a lettered supplement. */
  number: string;
  year: number;
  /** "MT.41/2026" */
  label: string;
  /** records.ref_type */
  refType: 'mia' | 'khkmt' | 'khko' | 'genelgey' | null;
  /** records.ref_number: "41/2026" */
  refNumber: string;
}

const PATTERN = /^(M[İIi]A|MT|YD|Y|[ÖO])[.\s]*(\d+[A-Z]?)\s*\/\s*(\d{4})$/i;

const REF_TYPE: Record<Series, Circular['refType']> = {
  MİA: 'mia',
  MT: 'khkmt',
  Ö: 'khko',
  Y: 'genelgey',
  // Language-exam announcements are not vacancies and are not imported.
  YD: null,
};

export function parseCircular(text: string | null): Circular | null {
  const match = text?.trim().match(PATTERN);
  if (!match) return null;

  const raw = match[1]!.toUpperCase();
  const series: Series = raw === 'O' || raw === 'Ö' ? 'Ö' : raw.startsWith('M') && raw.endsWith('A') ? 'MİA' : (raw as Series);
  const number = match[2]!.toUpperCase();
  const year = Number(match[3]);

  return { series, number, year, label: `${series}.${number}/${year}`, refType: REF_TYPE[series], refNumber: `${number}/${year}` };
}

/** A pattern that finds this circular's number written any of the ways records print it. */
export function circularPattern(circular: Circular): RegExp {
  const series = { MİA: 'M[İIi]A', MT: 'MT', Ö: '[ÖO]', YD: 'YD', Y: 'Y' }[circular.series];
  return new RegExp(
    `(?<![A-Za-zÇĞİÖŞÜçğıöşü])${series}\\.?\\s*${circular.number}\\s*/\\s*${circular.year}(?!\\d)`,
    'i',
  );
}

const MONTHS: Record<string, number> = {
  oca: 1, şub: 2, mar: 3, nis: 4, may: 5, haz: 6, tem: 7, ağu: 8, eyl: 9, eki: 10, kas: 11, ara: 12,
};

/** "6 Ocak 2027", "03.Eki.23", "13 Ağustos 21", "06.01.2027" -> "2027-01-06"; null if unreadable. */
export function parseTurkishDate(text: string | null): string | null {
  if (!text) return null;

  const numeric = text.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (numeric) return iso(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));

  const named = text.match(/(\d{1,2})[.\s]*([A-Za-zÇĞİÖŞÜçğıöşü]+)\.?[\s.]*(\d{2,4})/);
  if (!named) return null;

  const month = MONTHS[named[2]!.slice(0, 3).toLocaleLowerCase('tr')];
  if (!month) return null;

  const year = Number(named[3]);
  return iso(year < 100 ? 2000 + year : year, month, Number(named[1]));
}

function iso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const TITLE_SUFFIX: Array<[RegExp, string]> = [
  [/[yY]ükselme/, 'YÜKSELME YERİ KADROLARI MÜNHAL İLANI VE SINAVLARI DUYURUSU'],
  [/[öÖ]ğretmenlik/, 'ÖĞRETMEN MÜNHALİ İLANI VE SINAVLARI DUYURUSU'],
  [/[iİ]lk-[aA]tama/, 'İLK ATAMA KADROLARI MÜNHAL İLANI VE SINAVLARI DUYURUSU'],
];

/**
 * The title, in the shape the gazette-sourced circulars already carry
 * ("KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI GENELGE MİA.29/2026 <DAİRE> ... DUYURUSU"),
 * so a record looks the same whichever source it came from. Built from the
 * listing's own fields, never from PDF text.
 */
export function buildTitle(circular: Circular, department: string, category: string): string | null {
  const suffix = TITLE_SUFFIX.find(([pattern]) => pattern.test(category))?.[1];
  if (!suffix) return null;

  const name = turkishUpper(department.replace(/\s+/g, ' ').trim());
  return `KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI GENELGE ${circular.label} ${name} ${suffix}`;
}

const SUMMARY_KIND: Array<[RegExp, string]> = [
  [/[yY]ükselme/, 'yükselme yeri kadroları'],
  [/[öÖ]ğretmenlik/, 'öğretmen'],
  [/[iİ]lk-[aA]tama/, 'ilk atama kadroları'],
];

/** "Limanlar Dairesi ilk atama kadroları münhal ilanı ve sınavları hakkında duyuru" -- same shape the gazette records carry. */
export function buildSummary(department: string, category: string): string | null {
  const kind = SUMMARY_KIND.find(([pattern]) => pattern.test(category))?.[1];
  if (!kind) return null;
  return `${titleCase(turkishUpper(department.replace(/\s+/g, ' ').trim()))} ${kind} münhal ilanı ve sınavları hakkında duyuru`;
}
