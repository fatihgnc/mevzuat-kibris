import { turkishLower } from '../../src/lib/text/turkish-lower';

/**
 * Türkçe ek uyumu — özet cümle üretimi için (spec 3.8).
 *
 * Özet cümleler "Toronto Rent A Car Ltd'in", "Vadili'de", "Girne'de" gibi
 * ekli özel adlar içeriyor. Ek yanlış olduğunda cümle makine üretimi gibi
 * okunuyor ve ürünün "okunabilir özet" vaadi zayıflıyor. Ünlü uyumunu ve
 * sert ünsüz benzeşmesini uyguluyoruz.
 *
 * Özel adlarda ek kesme işaretiyle ayrılır (TDK): Vadili'de, Ltd'in.
 */

const BACK_VOWELS = new Set(['a', 'ı', 'o', 'u']);
const FRONT_VOWELS = new Set(['e', 'i', 'ö', 'ü']);
const ROUNDED = new Set(['o', 'u', 'ö', 'ü']);
const VOWELS = new Set([...BACK_VOWELS, ...FRONT_VOWELS]);

/** Sert ünsüzler — locative ekinde d yerine t getirir (fıstıkçı şahap). */
const VOICELESS = new Set(['f', 's', 't', 'k', 'ç', 'ş', 'h', 'p']);

/**
 * Ünlü uyumu SON SÖZCÜĞE bakar, ifadenin tamamına değil.
 *
 * "Toronto Rent A Car Ltd" için tüm dizgede geriye doğru tarasaydık "Car"
 * içindeki a'yı bulup "Ltd'ın" üretirdik. Doğrusu "Ltd'in": ek son sözcüğe
 * geliyor ve o sözcük nasıl okunuyorsa ona uyuyor.
 */
function lastWord(name: string): string {
  const parts = name.trim().split(/[\s\-–—]+/).filter(Boolean);
  return parts[parts.length - 1] ?? name;
}

/**
 * Ünlüsü olmayan kısaltmalar okunuşlarına göre ek alır: "Ltd" limited diye
 * okunuyor, dolayısıyla ince sıradan ek geliyor. Listede olmayanlarda ince
 * sıra varsayılıyor — Türkçe kısaltmaların çoğu harf harf okunuyor ve harf
 * adlarının çoğu ince ("be", "ce", "de", "ef").
 */
const ABBREVIATION_VOWEL: Record<string, string> = {
  ltd: 'e',
  'a.ş.': 'e',
  as: 'e',
  kktc: 'e',
  kdv: 'e',
  tc: 'e',
};

function lastVowel(name: string): string | null {
  const word = turkishLower(lastWord(name));

  for (let i = word.length - 1; i >= 0; i -= 1) {
    const ch = word[i]!;
    if (VOWELS.has(ch)) return ch;
  }

  return ABBREVIATION_VOWEL[word.replace(/[^a-zçğıöşü.]/g, '')] ?? null;
}

function lastLetter(name: string): string {
  const lower = turkishLower(lastWord(name)).replace(/[^a-zçğıöşü]/g, '');
  return lower[lower.length - 1] ?? '';
}

/**
 * İlgi eki: -in / -ın / -un / -ün, ünlüyle bitiyorsa araya n.
 * "Toronto Rent A Car Ltd" -> "Toronto Rent A Car Ltd'in"
 */
export function genitive(name: string): string {
  const vowel = lastVowel(name);
  const endsWithVowel = VOWELS.has(lastLetter(name));

  let suffix: string;
  if (vowel === null) {
    // Okunuşu bilinmeyen kısaltma: ince sıra varsayılan (bkz. ABBREVIATION_VOWEL).
    suffix = 'in';
  } else if (BACK_VOWELS.has(vowel)) {
    suffix = ROUNDED.has(vowel) ? 'un' : 'ın';
  } else {
    suffix = ROUNDED.has(vowel) ? 'ün' : 'in';
  }

  return name + "'" + (endsWithVowel ? 'n' : '') + suffix;
}

/**
 * Bulunma eki: -de / -da / -te / -ta.
 * "Vadili" -> "Vadili'de", "Alayköy" -> "Alayköy'de", "Haspolat" -> "Haspolat'ta"
 */
export function locative(name: string): string {
  const vowel = lastVowel(name);
  const voiceless = VOICELESS.has(lastLetter(name));
  const consonant = voiceless ? 't' : 'd';
  const back = vowel === null ? false : BACK_VOWELS.has(vowel);

  return name + "'" + consonant + (back ? 'a' : 'e');
}

/**
 * Yönelme eki: -e / -a / -ye / -ya.
 * "Fiyat İstikrar Fonu" -> "Fiyat İstikrar Fonu'na"
 */
export function dative(name: string): string {
  const vowel = lastVowel(name);
  const endsWithVowel = VOWELS.has(lastLetter(name));
  const back = vowel === null ? false : BACK_VOWELS.has(vowel);

  return name + "'" + (endsWithVowel ? 'n' : '') + (back ? 'a' : 'e');
}

/**
 * Belirtme eki: -i / -ı / -u / -ü, ünlüyle bitiyorsa araya y.
 * "Vadili" -> "Vadili'yi"
 */
export function accusative(name: string): string {
  const vowel = lastVowel(name);
  const endsWithVowel = VOWELS.has(lastLetter(name));

  let suffix: string;
  if (vowel === null) suffix = 'i';
  else if (BACK_VOWELS.has(vowel)) suffix = ROUNDED.has(vowel) ? 'u' : 'ı';
  else suffix = ROUNDED.has(vowel) ? 'ü' : 'i';

  return name + "'" + (endsWithVowel ? 'y' : '') + suffix;
}

/**
 * İyelik ekli addan ayrılma hâli: -nden / -ndan.
 * "tüketim maddeleri" -> "tüketim maddelerinden"
 */
export function ablativeFromPossessive(name: string): string {
  const vowel = lastVowel(name);
  const back = vowel === null ? false : BACK_VOWELS.has(vowel);
  return name + (back ? 'ndan' : 'nden');
}

/**
 * BÜYÜK HARFLE yazılmış kaynak metni okunabilir hâle getirir.
 *
 * Gazete başlıkları tamamen büyük harf. Her sözcüğün ilk harfini büyütmek
 * "Ve", "İle" gibi bağlaçları da büyütüyor ve özel ad gibi gösteriyor;
 * bağlaçları küçük bırakıyoruz. Zaten karışık yazılmış metne dokunmuyoruz.
 */
const LOWERCASE_WORDS = new Set([
  've',
  'ile',
  'veya',
  'ya',
  'da',
  'de',
  'ki',
  'ise',
  'için',
  'olarak',
  'bir',
]);

/**
 * Şirket türü kısaltmaları kısaltma gibi değil, sözcük gibi yazılır:
 * "Toronto Rent A Car Ltd", "TORONTO RENT A CAR LTD" değil.
 */
const COMPANY_SUFFIXES: Record<string, string> = {
  ltd: 'Ltd',
  'ltd.': 'Ltd.',
  limited: 'Limited',
  'limited.': 'Limited.',
  co: 'Co',
  'co.': 'Co.',
  inc: 'Inc',
  'inc.': 'Inc.',
};

/** Ünlüsü olmayan sözcük = kısaltma (KKTC, KDV, TC). Büyük kalır. */
function isAcronym(word: string): boolean {
  const letters = turkishLower(word).replace(/[^a-zçğıöşü]/g, '');
  if (!letters) return false;
  return ![...letters].some((ch) => VOWELS.has(ch));
}

/**
 * Türkçe mi yabancı mı — küçük harfe çevirmede TEK belirsizlik büyük I harfi.
 *
 * Türkçede I -> ı, İ -> i. Yabancı sözcüklerde I -> i olmalı. Kaynak metin
 * tamamen büyük harf olduğu için sözcüğe bakarak ayırt edilemiyor:
 * "ASLIHAN" Türkçe (Aslıhan), "NICOSIA" yabancı (Nicosia), ikisi de yalnızca
 * düz I içeriyor.
 *
 * Karar SÖZCÜK BAZINDA DEĞİL İFADE BAZINDA veriliyor: ifadenin herhangi bir
 * yerinde Türkçeye özgü bir harf (ç ğ İ ö ş ü) varsa ifadenin tamamı Türkçe
 * sayılıyor. Şirket sicilinde bu ayrım net çalışıyor:
 *
 *   "KIBRIS TÜRK ELEKTRİK KURUMU"      -> Ü, İ var  -> Kıbrıs Türk Elektrik Kurumu
 *   "NICOSIA LANGUAGE CENTRE LIMITED"  -> yok       -> Nicosia Language Centre Limited
 *   "HASPOLAT GIDA SANAYİ LTD"         -> İ var     -> Haspolat Gıda Sanayi Ltd
 *
 * Sözcük bazında yapılsaydı "KIBRIS" tek başına yabancı sayılıp "Kibris"
 * olurdu; ifade bazında doğru çıkıyor.
 */
const TURKISH_MARKERS = /[ÇĞİÖŞÜçğiöşü]/;

function looksTurkish(phrase: string): boolean {
  return TURKISH_MARKERS.test(phrase);
}

export function titleCase(input: string): string {
  const text = input.trim().replace(/\s+/g, ' ');

  // Zaten karışık yazılmışsa dokunma.
  if (text !== text.toLocaleUpperCase('tr')) return text;

  const turkish = looksTurkish(text);
  const toLower = (value: string) => (turkish ? turkishLower(value) : value.toLowerCase());
  const toUpperFirst = (value: string) =>
    turkish ? value.toLocaleUpperCase('tr') : value.toUpperCase();

  return text
    .split(' ')
    .map((word, index) => {
      const lower = toLower(word);

      if (index > 0 && LOWERCASE_WORDS.has(turkishLower(word))) return lower;

      const companySuffix = COMPANY_SUFFIXES[turkishLower(word)];
      if (companySuffix) return companySuffix;

      if (isAcronym(word)) return word;

      return toUpperFirst(lower.charAt(0)) + lower.slice(1);
    })
    .join(' ');
}
