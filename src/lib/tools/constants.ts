/**
 * Hesaplayıcıların paylaştığı sabitler.
 *
 * TEK KAYNAK. Asgari ücret üç ayrı araçta (yabancı çalışma izni cezası, bordro
 * prim tavanı, prim tabanı) kullanılıyor; üçünde ayrı ayrı yazılsaydı bir sonraki
 * zamda ikisi güncellenip biri unutulurdu. Zam geldiğinde DEĞİŞECEK TEK YER
 * burasıdır.
 */

/**
 * Yürürlükteki aylık brüt asgari ücret.
 *
 * Kaynak: KKTC Çalışma Dairesi, "Asgari Ücret" sayfası (22/1975 Asgari Ücretler
 * Yasası uyarınca Asgari Ücret Saptama Komisyonu saptar). Daire aynı sayfada net
 * karşılığını da yayımlıyor; ikisi arasındaki fark, aşağıdaki sosyal güvenlik
 * kesinti oranlarının doğruluğunu bağımsız olarak doğruluyor:
 * 70.893 × (%9 SSD + %4 İhtiyat Sandığı) = 9.216,09 → 61.676,91 ≈ 61.677 TL net.
 */
export const MINIMUM_WAGE = {
  /** Aylık brüt, TL. */
  grossMonthly: 70893,
  /** Dairenin ilan ettiği aylık net, TL. Yalnızca gösterim için. */
  netMonthly: 61677,
  /** Yürürlük tarihi — ekranda "hangi tarihli tutar" diye gösteriliyor. */
  effectiveFrom: '2026-07-01',
  effectiveLabel: '1 Temmuz 2026',
  source: 'http://calisma.gov.ct.tr/Asgari-Ücret',
} as const;

/**
 * İş Yasası'nın normal mesai tanımı: madde 33 uyarınca günde sekiz, haftada
 * kırk saat. Fazla mesai aracında "o ay normal mesaide çalışılan saat"
 * alanının varsayılanı buradan üretiliyor.
 */
export const NORMAL_WORK = {
  hoursPerDay: 8,
  hoursPerWeek: 40,
} as const;

/** Bir haftanın gün sayısı — haftalık ücretleri güne çevirirken. */
export const DAYS_PER_WEEK = 7;

/**
 * Aylık ücretin haftalığa çevrilmesinde kullanılan kat sayı.
 *
 * İş Yasası madde 27(3)(D) ve 40(2)(B) ters yönü tarif ediyor: haftalık ücret ×
 * 52 ÷ 12 = aylık brüt. Haftalık ücret bu yüzden aylık × 12 ÷ 52.
 */
export const WEEKS_PER_YEAR = 52;
export const MONTHS_PER_YEAR = 12;
