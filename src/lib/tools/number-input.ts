/**
 * Sayı girdilerinin yazılırken biçimlendirilmesi.
 *
 * İKİ AYRI GÖSTERİM VAR ve karıştırılmamaları gerekiyor:
 *
 *  - EKRANDAKİ metin Türkçe yazılıyor: binlik ayracı nokta, ondalık ayracı
 *    virgül (70.893,5). Sonuç panellerindeki `Intl` çıktısıyla aynı dil.
 *  - FORMUN STATE'İ kanonik kalıyor: yalnızca rakamlar ve ondalık ayracı olarak
 *    nokta (70893.5), yani doğrudan `Number()`'a verilebilir hâlde.
 *
 * Hesaplar her tuş vuruşunda state'ten okunuyor; state'te biçimlendirilmiş
 * metin tutulsaydı "70.893" `Number` için 70,893 olurdu ve maaş hesabı sessizce
 * bin kat küçülürdü.
 */

/** En fazla iki ondalık basamak — ücret kuruşu ve %0,5 gibi oranlar için yeter. */
const MAX_DECIMALS = 2;

/**
 * Kullanıcının az önce ondalık ayracı yazıp yazmadığını belirler ve yazdıysa onu
 * virgüle çevirir.
 *
 * BU ADIM OLMADAN NOKTA BELİRSİZ. Alandaki metin hem kullanıcının yazdığını hem
 * bizim eklediğimiz binlik ayraçlarını taşıyor, ve "15.000" ile "0.5" aynı
 * kurala sokulamıyor. Metne bakıp tahmin etmeye çalışmak iki yerde birden
 * patlıyordu:
 *
 *  - "15.000"un sonunda bir silme yapılınca metin "15.00" oluyor ve noktadan
 *    sonra iki rakam kaldığı için nokta ondalık sanılıyordu: 15.000 iken tek
 *    tuşla 15'e düşüyordu.
 *  - Kural ters çevrilip "nokta hep binliktir" denseydi bu sefer nokta tuşuyla
 *    ondalık yazmak imkânsız hale geliyordu.
 *
 * Tahmin yerine OLAY kullanılıyor: bir düzenlemede metin tam bir karakter
 * uzadıysa ve o karakter nokta ya da virgülse, kullanıcı ondalık ayracı yazmış
 * demektir. Başka her durumda metindeki noktalar bizim koyduğumuz binlik
 * ayraçlarıdır ve ondalık ayracı yalnızca virgüldür — çünkü ekrana yazdığımız
 * biçimi de biz üretiyoruz.
 */
export function normalizeTypedSeparator(typed: string, previous: string, caret: number): string {
  if (typed.length !== previous.length + 1) return typed;

  const inserted = typed[caret - 1];
  if (inserted !== '.' && inserted !== ',') return typed;

  return typed.slice(0, caret - 1) + ',' + typed.slice(caret);
}

/**
 * Kullanıcının yazdığı metni kanonik sayı metnine çevirir.
 *
 * Girdi, `normalizeTypedSeparator`'dan geçtikten sonra tek bir kurala uyuyor:
 * ONDALIK AYRACI VİRGÜL, nokta her zaman binlik ayracı. Noktalar atılıyor,
 * son virgülden sonrası ondalık kısım sayılıyor.
 */
export function toCanonicalNumber(input: string): string {
  const cleaned = input.replace(/[^\d,]/g, '');
  if (!cleaned) return '';

  const decimalIndex = cleaned.lastIndexOf(',');
  const intDigits = (decimalIndex === -1 ? cleaned : cleaned.slice(0, decimalIndex)).replace(
    /\D/g,
    '',
  );
  const decDigits =
    decimalIndex === -1
      ? null
      : cleaned
          .slice(decimalIndex + 1)
          .replace(/\D/g, '')
          .slice(0, MAX_DECIMALS);

  /*
   * Ondalık ayracı yazılmış ama henüz rakam gelmemişse ayraç KORUNUYOR
   * ("12,"). Silinseydi virgül basan kullanıcının tuşu hiç işlememiş gibi
   * görünürdü ve ondalık yazmak imkânsız olurdu.
   */
  if (decDigits === null) return intDigits;
  return `${intDigits}.${decDigits}`;
}

/** Kanonik metni ekranda görünecek Türkçe biçime çevirir. */
export function formatNumberInput(canonical: string): string {
  if (!canonical) return '';

  const separatorIndex = canonical.indexOf('.');
  const intPart = separatorIndex === -1 ? canonical : canonical.slice(0, separatorIndex);
  const decPart = separatorIndex === -1 ? null : canonical.slice(separatorIndex + 1);

  /*
   * `\B(?=(\d{3})+(?!\d))` — sağdan sola üçer rakamlık grupların önüne ayraç
   * koyar. `\B` başa ayraç konmasını, `(?!\d)` de gruplamanın ondalık kısma
   * taşmasını engelliyor.
   */
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return grouped + (decPart === null ? '' : ',' + decPart);
}

/** Metindeki rakam sayısı — imleci biçimlendirmeden sonra yerine koymak için. */
export function countDigits(value: string): number {
  let count = 0;
  for (const character of value) {
    if (character >= '0' && character <= '9') count += 1;
  }
  return count;
}

/**
 * Biçimlendirilmiş metinde, soldan `digits` kadar rakam geçildikten sonraki
 * konum.
 *
 * Ayraç eklendiğinde metin uzuyor; imleç düzeltilmezse tarayıcı onu sona atıyor
 * ve sayının ortasında düzeltme yapmak imkânsız hale geliyor. Konumu karakter
 * sayısıyla değil RAKAM sayısıyla takip etmek, araya kaç ayraç girdiğinden
 * bağımsız olarak doğru yeri buluyor.
 */
export function caretAfterDigits(
  formatted: string,
  digits: number,
  /**
   * İmlecin bıraktığı yerde son karakter ondalık ayracıysa doğru.
   *
   * "15.000" yazıp virgül basıldığında rakam sayısı değişmiyor (hâlâ beş), o
   * yüzden yalnızca rakam sayan bir hesap imleci virgülün SOLUNA koyuyordu ve
   * kuruş yazmak mümkün olmuyordu. Bu bayrak, imleci ayracın sağına taşıyor.
   */
  afterSeparator = false,
): number {
  let position = 0;

  if (digits > 0) {
    position = formatted.length;
    let seen = 0;
    for (let index = 0; index < formatted.length; index += 1) {
      const character = formatted[index] as string;
      if (character >= '0' && character <= '9') {
        seen += 1;
        if (seen === digits) {
          position = index + 1;
          break;
        }
      }
    }
  }

  if (afterSeparator) {
    const separator = formatted.indexOf(',');
    if (separator >= position) return separator + 1;
  }

  return position;
}
