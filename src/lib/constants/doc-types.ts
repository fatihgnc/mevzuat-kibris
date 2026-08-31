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
 *
 * `s` / `skii` / `kii` / `teki` gerçek arşivden geldi: Bakanlar Kurulu kararının
 * öneki dönemlere göre değişmiş. 2006/2012/2018/2025 arşiv sayfaları sayıldığında
 * dördü de ezici çoğunlukla EK IV BÖLÜM I'de çıkıyor, yani spec 3.3'ün Ü(K-I)
 * dediği serinin ta kendisi:
 *
 *   S-1642-2006 / S(K-II) 566-2006  →  K(II)-2839-2012  →  TE(K-I) 1555-2018
 *   →  Ü(K-I) 2497-2025
 *
 * Ayrı tip olarak duruyorlar çünkü künyedeki atıf kaynağa sadık kalmalı: bir
 * hukukçu 2006 kararını "Ü(K-I) 1642-2006" diye değil "S-1642-2006" diye arar.
 * Tek tipe indirgemek arama ve alarm eşleşmesini bozardı.
 *
 * Parantez içindeki seri harfi dönemler arası GÜVENİLİR DEĞİL: `K(II)` ikinci
 * seri gibi okunuyor ama 2012'de EK IV BÖLÜM I'de. Bölümü referans önekinden
 * türetme.
 */
export const REF_TYPES = [
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
    // Dönemsel Bakanlar Kurulu önekleri — kaynaktaki yazımıyla geri veriliyor.
    case 's':
      return `S-${refNumber}`;
    case 'skii':
      return `S(K-II) ${refNumber}`;
    case 'kii':
      return `K(II)-${refNumber}`;
    case 'teki':
      return `TE(K-I) ${refNumber}`;
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
