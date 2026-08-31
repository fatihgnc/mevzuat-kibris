import { recordHref } from '@/lib/db/queries/shared';
import { SITE_NAME, SITE_URL, absoluteUrl } from '@/lib/seo/config';
import type { RecordListItem } from '@/types/record';

/**
 * RSS — spec 10.4.
 *
 * E-posta kotasından bağımsız, sınırsız ve sıfır maliyetli bildirim kanalı.
 * Ücretsiz ürün modelinde bu onu ikincil bir özellik olmaktan çıkarıyor;
 * tasarımda da e-postayla eşit ağırlıkta sunuluyor.
 *
 * Başlıkta özet cümle kullanılıyor — liste, detay, e-posta ve RSS aynı metni
 * gösteriyor (spec 3.8 kural 4).
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface FeedOptions {
  title: string;
  description: string;
  /** Bu akışın kendi yolu, örn. /konu/munhal/rss.xml */
  path: string;
  /** Akışın karşılık geldiği HTML sayfası */
  htmlPath: string;
  records: RecordListItem[];
}

export function buildRssFeed({
  title,
  description,
  path,
  htmlPath,
  records,
}: FeedOptions): string {
  const now = new Date().toUTCString();

  const items = records
    .map((record) => {
      const url = absoluteUrl(recordHref(record));
      const heading = record.summary ?? record.title;
      const pubDate = new Date(record.publishedAt + 'T00:00:00Z').toUTCString();

      const meta = [
        record.refLabel,
        'RG sayı ' + record.issueNumber + '/' + record.issueYear,
        record.docTypeLabel,
        record.institution,
      ]
        .filter(Boolean)
        .join(' · ');

      return [
        '    <item>',
        '      <title>' + escapeXml(heading) + '</title>',
        '      <link>' + escapeXml(url) + '</link>',
        '      <guid isPermaLink="true">' + escapeXml(url) + '</guid>',
        '      <pubDate>' + pubDate + '</pubDate>',
        '      <description>' + escapeXml(meta) + '</description>',
        ...record.topics.map((topic) => '      <category>' + escapeXml(topic) + '</category>'),
        '    </item>',
      ].join('\n');
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>' + escapeXml(title + ' — ' + SITE_NAME) + '</title>',
    '    <link>' + escapeXml(SITE_URL + htmlPath) + '</link>',
    '    <description>' + escapeXml(description) + '</description>',
    '    <language>tr</language>',
    '    <lastBuildDate>' + now + '</lastBuildDate>',
    '    <atom:link href="' + escapeXml(SITE_URL + path) + '" rel="self" type="application/rss+xml"/>',
    items,
    '  </channel>',
    '</rss>',
  ].join('\n');
}

export function rssResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // Akış okuyucular sık çekiyor; bir saat cache yeterli ve kaynak tasarrufu.
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
