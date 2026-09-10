import { Fragment } from 'react';

import type { Tool } from '@/lib/tools/registry';

/**
 * Metin içindeki madde atıflarını sayfanın kendi "Hangi yasaya göre" kartına
 * bağlar.
 *
 * Giriş paragrafı "Madde 19 tazminatı, madde 12'deki bildirim kurallarına EK
 * olarak ödeniyor" gibi cümlelerle başlıyor ve okuyucunun ilk sorusu "o madde ne
 * diyor" oluyor. Cevap zaten aynı sayfada, üç ekran aşağıda duruyor; bağlantı
 * yalnızca oraya götürüyor. DIŞARI bir yere değil: yasa metinleri PDF olarak
 * yayımlanıyor ve PDF'in içinde bir maddeye çapa atılamıyor.
 */

/** "Madde 43" + yasa adından, sayfada eşsiz bir çapa üretir. */
export function articleAnchorId(law: string, article: string): string {
  const slug = (value: string) =>
    value
      .toLocaleLowerCase('tr')
      .replace(/[^a-z0-9çğıöşü]+/g, '-')
      .replace(/^-|-$/g, '');

  return `dayanak-${slug(article)}-${slug(law)}`;
}

/**
 * `madde 19`, `Madde 12'deki`, `madde 56(1)(A)` — hepsi yakalanıyor.
 *
 * Yalnızca sayı ve ondan önceki "madde" kelimesi eşleşiyor; parantezli fıkra
 * ekleri ve `'deki` gibi çekim ekleri metinde olduğu gibi kalıyor. Numarayı
 * yakalamak yeterli, çünkü çapa maddenin tamamına gidiyor.
 */
const ARTICLE_PATTERN = /\bmadde\s+(\d+)/gi;

export function linkifyArticles(text: string, tool: Tool) {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(ARTICLE_PATTERN)) {
    const index = match.index ?? 0;
    const number = match[1];

    const matching = tool.legal.filter(
      (reference) => reference.article.replace(/\D/g, '') === number,
    );

    /*
     * Kartta karşılığı olmayan bir madde numarası DÜZ METİN kalıyor: okuyucuyu
     * sayfada var olmayan bir çapaya göndermek, bağlantıyı hiç koymamaktan
     * kötü.
     */
    if (!matching.length) continue;

    /*
     * Aynı numara birden fazla yasada geçiyorsa (bordro aracında 73/2007 ve
     * 16/1976'nın ikisinde de madde 83 var) hangisinin kastedildiği metinden
     * anlaşılmıyor; bağlantı o zaman kartın tamamına gidiyor.
     */
    const href =
      matching.length === 1 && matching[0]
        ? `#${articleAnchorId(matching[0].law, matching[0].article)}`
        : '#yasal-dayanak';

    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));
    nodes.push(
      <a key={`${index}-${number}`} href={href}>
        {match[0]}
      </a>,
    );
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));

  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>);
}
