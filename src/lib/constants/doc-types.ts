/**
 * Belge tipleri — spec 3.4 enum'u. Görünen adlar artboard'daki "Belge türü"
 * filtresinden ve künye şeridinden alındı: kısa, tekil, günlük dile yakın.
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
 * Referans numarası tipleri — spec 3.3 çapaları. `mt` (marka tescil) tasarımdaki
 * "M.T. 8842" örneğinden eklendi; spec 3.3 listesinde marka ilanlarının referans
 * deseni yoktu ama EK V BÖLÜM II kayıtlarının tamamı numaralı yayımlanıyor.
 */
export const REF_TYPES = [
  'ae',
  'uki',
  'ukii',
  'sm',
  'mt',
  'yt',
  'yo',
  'mia',
  'rekabet',
  'eskieser',
] as const;

export type RefType = (typeof REF_TYPES)[number];

/** Künyede ve slug'da görünen referans etiketi: "A.E. 1071", "Ü(K-I) 2497-2025". */
export function formatRef(refType: string | null, refNumber: string | null): string | null {
  if (!refType || !refNumber) return null;
  switch (refType) {
    case 'ae':
      return `A.E. ${refNumber}`;
    case 'uki':
      return `Ü(K-I) ${refNumber}`;
    case 'ukii':
      return `Ü(K-II) ${refNumber}`;
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
