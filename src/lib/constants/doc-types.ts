/**
 * Document types — the enum from spec 3.4. The display names come from the artboard's
 * "Belge türü" filter and the meta bar: short, singular, close to everyday language.
 */
export const DOC_TYPES = [
  'yasa',
  'yasa_gucunde_kararname',
  'yasa_tasarisi',
  'yasa_onerisi',
  'tuzuk',
  'emirname',
  'bakanlar_kurulu_karari',
  'meclis_karari',
  'atama_kararnamesi',
  'gorevden_alma',
  'munhal_ilani',
  'sinav_sonucu',
  'rekabet_kurulu_karari',
  'eski_eserler_karari',
  'anayasa_mahkemesi_karari',
  'sirket_duyurusu',
  'marka_ilani',
  'kamulastirma',
  'merkez_bankasi_duyurusu',
  'mahkeme_duyurusu',
  'genelge',
  'duzeltme',
  'diger',
] as const;

export type DocType = (typeof DOC_TYPES)[number];

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  yasa: 'Yasa',
  yasa_gucunde_kararname: 'Yasa gücünde kararname',
  yasa_tasarisi: 'Yasa tasarısı',
  yasa_onerisi: 'Yasa önerisi',
  tuzuk: 'Tüzük',
  emirname: 'Emirname',
  bakanlar_kurulu_karari: 'Bakanlar Kurulu kararı',
  meclis_karari: 'Meclis kararı',
  atama_kararnamesi: 'Atama',
  gorevden_alma: 'Görevden alma',
  munhal_ilani: 'Münhal ilanı',
  sinav_sonucu: 'Sınav sonucu',
  rekabet_kurulu_karari: 'Rekabet Kurulu kararı',
  eski_eserler_karari: 'Eski Eserler Kurulu kararı',
  anayasa_mahkemesi_karari: 'Anayasa Mahkemesi kararı',
  sirket_duyurusu: 'Şirket işlemi',
  marka_ilani: 'Marka',
  kamulastirma: 'Kamulaştırma',
  merkez_bankasi_duyurusu: 'Merkez Bankası duyurusu',
  mahkeme_duyurusu: 'Mahkeme duyurusu',
  genelge: 'Genelge',
  duzeltme: 'Düzeltme',
  diger: 'Diğer',
};

export function isDocType(value: string): value is DocType {
  return (DOC_TYPES as readonly string[]).includes(value);
}

export function docTypeLabel(value: string): string {
  return isDocType(value) ? DOC_TYPE_LABELS[value] : 'Diğer';
}

/**
 * Reference number types — the anchors from spec 3.3. `mt` (trade mark
 * registration) was added from the design's "M.T. 8842" example; spec 3.3's list
 * had no reference pattern for trade mark notices, but every EK V BÖLÜM II record
 * is published with a number.
 *
 * `s` / `skii` / `kii` / `teki` came from the real archive: the prefix of a Council
 * of Ministers decision changed from period to period. Counting the 2006, 2012,
 * 2018 and 2025 archive pages, all four appear overwhelmingly in EK IV BÖLÜM I —
 * that is, they are the very series spec 3.3 calls Ü(K-I):
 *
 *   S-1642-2006 / S(K-II) 566-2006  ->  K(II)-2839-2012  ->  TE(K-I) 1555-2018
 *   ->  Ü(K-I) 2497-2025
 *
 * `eski` / `etki` / `fski` / `fskiii` close the 2020-2022 gap in that chain, counted
 * over every reference cell of 2020-2024 (17,514 records):
 *
 *   E.T(K-I) 1259-2020   1,210   2020
 *   E.S(K-I) 27-2020     1,584   2020-2021
 *   F.S(K-I) 152-2022      316   2021-2022   (also written "F.S.(K-I)")
 *   F.S(K-III) 11-2022       9   2022
 *
 * Without them 3,119 records — 17.8% of 2020-2024 — parse with no reference at all,
 * and EK IV BÖLÜM I's reference coverage reads 1% in 2020-2021 against 100% in 2024.
 * That is what made the gap visible.
 *
 * NAMING: `eski` is E.S(K-I), NOT a shortening of `eskieser` below it. The names
 * follow the same mechanical rule as `teki`/`skii`: the prefix's letters.
 *
 * MEASURED, so that the next reader does not expect more than this delivers: these
 * DO NOT recover bodies. `extractBody` anchors on the reference label inside the
 * PDF, and for these years the gazette does not print the decision's own number
 * beside it — of 127 such records across two real issues, 1 label was found in the
 * PDF text. What they do deliver is the faithful citation (the meta bar and the
 * slug), and that is why they must exist BEFORE these years are ingested: the slug
 * embeds the reference and never changes once written (spec 8.1).
 *
 * They stay as separate types because the citation in the meta bar must remain
 * faithful to the source: a lawyer looks up the 2006 decision as "S-1642-2006",
 * not "Ü(K-I) 1642-2006". Collapsing them into one type would break search and
 * alert matching.
 *
 * The series letter in parentheses is NOT RELIABLE across periods: `K(II)` reads
 * like a second series but sits in EK IV BÖLÜM I in 2012. Do not derive the section
 * from the reference prefix.
 */
export const REF_TYPES = [
  'ae',
  'uki',
  'ukii',
  's',
  'skii',
  'kii',
  'teki',
  'eski',
  'etki',
  'fski',
  'fskiii',
  'sm',
  'mt',
  'yt',
  'yo',
  'mia',
  'rekabet',
  'eskieser',
] as const;

export type RefType = (typeof REF_TYPES)[number];

/** The reference label shown in the meta bar and the slug: "A.E. 1071", "Ü(K-I) 2497-2025". */
export function formatRef(refType: string | null, refNumber: string | null): string | null {
  if (!refType || !refNumber) return null;
  switch (refType) {
    case 'ae':
      return `A.E. ${refNumber}`;
    case 'uki':
      return `Ü(K-I) ${refNumber}`;
    case 'ukii':
      return `Ü(K-II) ${refNumber}`;
    // Period-specific Council of Ministers prefixes — returned in the source's own spelling.
    case 's':
      return `S-${refNumber}`;
    case 'skii':
      return `S(K-II) ${refNumber}`;
    case 'kii':
      return `K(II)-${refNumber}`;
    case 'teki':
      return `TE(K-I) ${refNumber}`;
    case 'eski':
      return `E.S(K-I) ${refNumber}`;
    case 'etki':
      return `E.T(K-I) ${refNumber}`;
    // The source's contents cells write this one both ways — "F.S.(K-I)" 261 times
    // against "F.S(K-I)" 55 — so the label follows the majority spelling.
    case 'fski':
      return `F.S.(K-I) ${refNumber}`;
    case 'fskiii':
      return `F.S(K-III) ${refNumber}`;
    case 'sm':
      return `Ş.M. ${refNumber}`;
    case 'mt':
      return `M.T. ${refNumber}`;
    case 'yt':
      return `Y.T.NO:${refNumber}`;
    case 'yo':
      return `Y.Ö.NO:${refNumber}`;
    case 'mia':
      return `GENELGE MİA.${refNumber}`;
    case 'rekabet':
      return `Karar ${refNumber}`;
    case 'eskieser':
      return `Karar No ${refNumber}`;
    default:
      return refNumber;
  }
}
