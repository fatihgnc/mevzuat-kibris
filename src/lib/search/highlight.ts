import type { Token, TokenLevel } from '@/types/record';
import { normalizeForSearch } from '@/lib/text/turkish-lower';

/**
 * Vurgulama — spec 5.4 adım 6 ve artboard 1b.
 *
 * ts_headline'a HTML yerine kendi ayraçlarımızı veriyoruz. Gazete metni içinde
 * <b> gibi bir dizgeye rastlama ihtimali sıfır değil ve HTML ayrıştırmak
 * dangerouslySetInnerHTML gerektirirdi; kontrol karakteri + split ile jeton
 * üretmek hem güvenli hem de tasarımın jeton modeline birebir oturuyor.
 */
export const HEADLINE_START = '\u0001';
export const HEADLINE_STOP = '\u0002';

export const HEADLINE_OPTIONS = [
  'StartSel=' + HEADLINE_START,
  'StopSel=' + HEADLINE_STOP,
  'MaxWords=40',
  'MinWords=20',
  'ShortWord=3',
  'MaxFragments=1',
].join(', ');

/**
 * ts_headline çıktısını jetonlara böler. Eşleşen parçalar seviye 3 (sarı zemin),
 * gerisi alıntı seviyesi. Alıntıda maskeleme yok: gövde metni okunur kalmalı,
 * yalnızca eşleşme öne çıkmalı.
 */
export function parseHeadline(headline: string | null | undefined): Token[] | null {
  if (!headline) return null;

  const tokens: Token[] = [];
  let cursor = 0;

  while (cursor < headline.length) {
    const start = headline.indexOf(HEADLINE_START, cursor);
    if (start === -1) {
      tokens.push({ t: headline.slice(cursor), lvl: 0 });
      break;
    }

    if (start > cursor) tokens.push({ t: headline.slice(cursor, start), lvl: 0 });

    const stop = headline.indexOf(HEADLINE_STOP, start);
    if (stop === -1) {
      tokens.push({ t: headline.slice(start + 1), lvl: 3 });
      break;
    }

    tokens.push({ t: headline.slice(start + 1, stop), lvl: 3 });
    cursor = stop + 1;
  }

  const cleaned = tokens.filter((token) => token.t.length > 0);
  return cleaned.length ? cleaned : null;
}

/**
 * Maskelenmiş başlık üzerine arama eşleşmesini bindirir.
 *
 * Maske seviyesi korunmaz, eşleşen parça seviye 3 olur: tasarımda sarı zemin
 * her zaman en üstte, çünkü kullanıcının aradığı şeyin nerede geçtiğini görmesi
 * kalıp/ayırt edici ayrımından daha önemli.
 */
export function overlayMatches(tokens: Token[], query: string): Token[] {
  const terms = matchTerms(query);
  if (!terms.length) return tokens;

  const out: Token[] = [];

  for (const token of tokens) {
    const ranges = findRanges(token.t, terms);
    if (!ranges.length) {
      out.push(token);
      continue;
    }

    let cursor = 0;
    for (const [start, end] of ranges) {
      if (start > cursor) out.push({ t: token.t.slice(cursor, start), lvl: token.lvl });
      out.push({ t: token.t.slice(start, end), lvl: 3 });
      cursor = end;
    }
    if (cursor < token.t.length) out.push({ t: token.t.slice(cursor), lvl: token.lvl });
  }

  return out;
}

/**
 * Aranabilir terimler. Tırnaklı ifadeler bütün olarak, gerisi sözcük sözcük.
 * Üç harften kısa sözcükler atılıyor: "ve", "bir" gibi bağlaçları vurgulamak
 * satırı okunmaz hale getiriyor.
 */
function matchTerms(query: string): string[] {
  const terms: string[] = [];
  const quoted = query.match(/"([^"]+)"/g) ?? [];

  for (const phrase of quoted) {
    const value = normalizeForSearch(phrase.slice(1, -1));
    if (value.length >= 2) terms.push(value);
  }

  const rest = normalizeForSearch(query.replace(/"[^"]+"/g, ' '));
  for (const word of rest.split(' ')) {
    if (word.length >= 3 && !word.startsWith('-')) terms.push(word);
  }

  return terms.sort((a, b) => b.length - a.length);
}

const COMBINING_DOT_ABOVE = /\u0307/g;

const FOLD: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

/**
 * Uzunluğu bozmadan küçült + aksan düşür.
 *
 * normalizeForSearch boşlukları da sıkıştırdığı için indeksleri kaydırır ve
 * burada kullanılamaz — vurgulama aralıkları orijinal metnin indekslerine
 * karşılık gelmek zorunda. Birleşen nokta boşlukla değiştiriliyor (silinmiyor)
 * ki karakter sayısı sabit kalsın.
 */
function foldPreservingLength(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(COMBINING_DOT_ABOVE, ' ')
    .replace(/[çğıöşüâîû]/g, (ch) => FOLD[ch] ?? ch);
}

/** Eşleşme aralıklarını bulur; indeksler orijinal metne aittir. */
function findRanges(text: string, terms: string[]): Array<[number, number]> {
  const haystack = foldPreservingLength(text);
  const ranges: Array<[number, number]> = [];

  for (const term of terms) {
    let from = 0;
    for (;;) {
      const index = haystack.indexOf(term, from);
      if (index === -1) break;

      // Sözcük başında mı — "ihale" araması "muhalefet" içinde vurgulanmasın.
      const before = index === 0 ? ' ' : (haystack[index - 1] ?? ' ');
      if (/[a-z0-9]/.test(before)) {
        from = index + 1;
        continue;
      }

      ranges.push([index, index + term.length]);
      from = index + term.length;
    }
  }

  if (!ranges.length) return ranges;

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [ranges[0]!];
  for (const range of ranges.slice(1)) {
    const last = merged[merged.length - 1]!;
    if (range[0] <= last[1]) {
      last[1] = Math.max(last[1], range[1]);
    } else {
      merged.push(range);
    }
  }
  return merged;
}

/**
 * Jeton seviyesini sınıf adına çevirir.
 *
 * Sınıflar TAM METİN olarak yazılı; 'tok-' + level gibi birleştirilmiyor.
 * Tailwind içerik taraması kaynak dosyalarda sınıf adını birebir arıyor,
 * dinamik birleştirilen adları göremiyor ve kuralları eleyip atıyor. Maskeleme
 * bu yüzden sayfada hiç görünmüyordu: bütün jetonlar aynı ağırlıkta basılıyordu.
 */
/*
 * Seviye 0 eskiden `text-ink-placeholder` idi: beyaz üstünde 2.2:1, yani
 * okunmuyordu. Kalıp sözcükler geri plana düşmeli ama METİN, ve bütün metin
 * okunabilir olmak zorunda. Tamamı kalıp sayılan bir başlık ("SÖZLEŞMELİ
 * PERSONEL") tümüyle o renge düşünce satır tamamen kayboluyordu.
 *
 * Ayrım artık renkten çok AĞIRLIKLA kuruluyor: 0 ile 1 arasında font-light ile
 * font-semibold farkı var ve ikisi de okunabilir tonda.
 */
const MASK_CLASS: Record<TokenLevel, string> = {
  0: 'font-light text-ink-fainter', // kalıp — 4.9:1
  1: 'font-semibold text-ink', //          ayırt edici
  2: 'font-normal text-ink-muted', //      ara bilgi
  3: 'rounded-sm bg-mark font-semibold text-ink', // arama eşleşmesi
};

/** Alıntıda maskeleme yok; yalnızca eşleşme vurgulanıyor. */
const QUOTE_CLASS: Record<TokenLevel, string> = {
  0: 'font-normal text-ink-muted',
  1: 'font-normal text-ink-muted',
  2: 'font-normal text-ink-muted',
  3: 'rounded-sm bg-mark font-semibold text-ink',
};

export function tokenClass(level: TokenLevel, variant: 'mask' | 'quote' = 'mask'): string {
  return variant === 'quote' ? QUOTE_CLASS[level] : MASK_CLASS[level];
}
