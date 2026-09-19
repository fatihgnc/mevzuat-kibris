/**
 * Consolidated legislation (yasalar, later tüzükler): names, paths and the one
 * switch that keeps these pages out of search engines while they are a draft.
 */

export type LegislationKind = 'yasa' | 'tuzuk';

/**
 * Everything a page has to say differently for a yasa and for a tüzük. Turkish
 * suffixes change the word ("yasanın", "tüzüğün"), so they are spelled out here
 * rather than built by concatenation.
 */
export interface KindMeta {
  path: string;
  singular: string;
  plural: string;
  /** lower-case singular, e.g. for a count: "820 yasa" */
  noun: string;
  /** "yasanın" / "tüzüğün" */
  genitive: string;
  /** "Yasaların" / "Tüzüklerin" */
  pluralGenitive: string;
  /** what to check for changes, in the dative: "değişiklik yasalarına" / "değişiklik tüzüklerine" */
  amendmentsDative: string;
  /** the H1 of the index page */
  indexHeading: string;
}

export const KIND_META: Record<LegislationKind, KindMeta> = {
  yasa: {
    path: '/yasa',
    singular: 'Yasa',
    plural: 'Yasalar',
    noun: 'yasa',
    genitive: 'yasanın',
    pluralGenitive: 'Yasaların',
    amendmentsDative: 'değişiklik yasalarına',
    indexHeading: 'KKTC yasaları',
  },
  tuzuk: {
    path: '/tuzuk',
    singular: 'Tüzük',
    plural: 'Tüzükler',
    noun: 'tüzük',
    genitive: 'tüzüğün',
    pluralGenitive: 'Tüzüklerin',
    amendmentsDative: 'değişiklik tüzüklerine',
    indexHeading: 'KKTC tüzükleri',
  },
};

export function legislationHref(kind: LegislationKind, slug: string): string {
  return KIND_META[kind].path + '/' + slug;
}

/**
 * How a law is referred to, from its `law_key`.
 *   '23/2016' -> '23/2016'      (numbered law)
 *   'F154'    -> 'Fasıl 154'    (chapter law)
 *   'F175A'   -> 'Fasıl 175A'
 *   'C12'     -> 'Cap. 12'      (English collection)
 */
export function lawRef(key: string | null): string | null {
  if (!key) return null;
  if (key.includes('/')) return key;

  const m = /^([FC])(\d+)([A-Z]?)$/.exec(key);
  if (!m) return key;

  return (m[1] === 'F' ? 'Fasıl ' : 'Cap. ') + m[2] + m[3];
}

export type LegislationSource = 'portal' | 'official';

/** Who publishes each copy, as the page names them. */
export const SOURCE_META: Record<LegislationSource, { name: string; host: string }> = {
  official: { name: 'Merkezi Mevzuat Dairesi', host: 'mevzuat.gov.ct.tr' },
  portal: { name: 'Yüksek Mahkeme Mevzuat Bilgi Sistemi', host: 'mevzuat.mahkemeler.net' },
};
