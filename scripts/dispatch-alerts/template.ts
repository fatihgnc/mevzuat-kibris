import { createHmac } from 'node:crypto';

import { SITE_NAME, SITE_URL } from '../../src/lib/seo/config';
import { formatDateShort } from '../../src/lib/text/dates';

/**
 * Digest e-posta şablonu — spec 10.3.
 *
 * Sade HTML: kayıt başına başlık + künye + bağlantı. Maksimum 15 kayıt,
 * fazlası "ve N kayıt daha" bağlantısıyla. Reklam yok, takip görüntüsü yok.
 *
 * Gösterilen başlık records.summary — liste, detay, RSS ve og:title ile
 * birebir aynı metin (spec 3.8 kural 4). E-postaya özel yeniden üretim yok.
 */

export const MAX_RECORDS_PER_EMAIL = 15;

export interface DigestRecord {
  slug: string;
  summary: string | null;
  title: string;
  publishedAt: string;
  issueNumber: number;
  issueYear: number;
  refLabel: string | null;
  docTypeLabel: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Abonelikten çıkma jetonu. HMAC imzalı, veritabanı tablosu gerektirmiyor;
 * tek tıkla çıkma bağlantısı ve List-Unsubscribe header'ı ZORUNLU (spec 10.3).
 */
export function unsubscribeToken(alertId: number): string {
  const secret = process.env.ALERT_UNSUBSCRIBE_SECRET ?? process.env.REVALIDATE_SECRET ?? '';
  return createHmac('sha256', secret).update('alert:' + alertId).digest('base64url');
}

export function unsubscribeUrl(alertId: number): string {
  return SITE_URL + '/api/abonelik-iptal?id=' + alertId + '&t=' + unsubscribeToken(alertId);
}

export interface DigestInput {
  alertId: number;
  label: string;
  records: DigestRecord[];
  /** Eşleşen toplam kayıt; 15'ten fazlaysa "ve N kayıt daha" satırı için. */
  totalMatched: number;
}

export function renderDigestSubject(input: DigestInput): string {
  const count = input.totalMatched;
  return input.label + ': ' + count + ' yeni kayıt';
}

export function renderDigestHtml(input: DigestInput): string {
  const shown = input.records.slice(0, MAX_RECORDS_PER_EMAIL);
  const remaining = input.totalMatched - shown.length;
  const unsubscribe = unsubscribeUrl(input.alertId);

  const items = shown
    .map((record) => {
      const heading = escapeHtml(record.summary ?? record.title);
      const meta = [
        formatDateShort(record.publishedAt),
        'RG ' + record.issueNumber + '/' + record.issueYear,
        record.refLabel,
        record.docTypeLabel,
      ]
        .filter(Boolean)
        .map((part) => escapeHtml(String(part)))
        .join(' · ');

      return [
        '<tr><td style="padding:14px 0;border-bottom:1px solid #ECECEF;">',
        '<a href="' + SITE_URL + '/karar/' + encodeURIComponent(record.slug) + '"',
        ' style="font-size:16px;line-height:1.4;font-weight:500;color:#17181A;text-decoration:none;">',
        heading,
        '</a>',
        '<div style="margin-top:4px;font-size:13px;color:#6B6B75;">' + meta + '</div>',
        '</td></tr>',
      ].join('');
    })
    .join('');

  return [
    '<!doctype html><html lang="tr"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>' + escapeHtml(renderDigestSubject(input)) + '</title></head>',
    '<body style="margin:0;padding:24px 0;background:#F4F4F5;',
    'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0"',
    ' style="max-width:600px;background:#FFFFFF;border:1px solid #E4E4E7;border-radius:6px;">',

    '<tr><td style="padding:20px 24px;border-bottom:1px solid #E4E4E7;">',
    '<span style="font-size:17px;font-weight:700;color:#17181A;">' + SITE_NAME + '</span>',
    '<div style="margin-top:4px;font-size:14px;color:#6B6B75;">',
    escapeHtml(input.label) + ' takibinizde ' + input.totalMatched + ' yeni kayıt',
    '</div></td></tr>',

    '<tr><td style="padding:6px 24px 18px;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + items + '</table>',

    remaining > 0
      ? '<div style="margin-top:16px;font-size:14px;"><a href="' +
        SITE_URL +
        '/takip" style="color:#1F6E7C;">ve ' +
        remaining +
        ' kayıt daha</a></div>'
      : '',

    '</td></tr>',

    '<tr><td style="padding:16px 24px;border-top:1px solid #E4E4E7;background:#F4F4F5;',
    'font-size:12px;line-height:1.5;color:#6B6B75;border-radius:0 0 6px 6px;">',
    SITE_NAME + ' resmî bir kurum değildir. Bağlayıcı olan, gazetede yayımlanan resmî metindir.',
    '<div style="margin-top:8px;">',
    '<a href="' + unsubscribe + '" style="color:#6B6B75;">Bu takibi durdur</a>',
    ' · <a href="' + SITE_URL + '/takip" style="color:#6B6B75;">Takiplerimi yönet</a>',
    '</div></td></tr>',

    '</table></td></tr></table></body></html>',
  ].join('');
}

export function renderDigestText(input: DigestInput): string {
  const shown = input.records.slice(0, MAX_RECORDS_PER_EMAIL);
  const remaining = input.totalMatched - shown.length;

  const lines = [
    input.label + ' takibinizde ' + input.totalMatched + ' yeni kayıt',
    '',
    ...shown.flatMap((record) => [
      record.summary ?? record.title,
      '  ' + formatDateShort(record.publishedAt) + ' · RG ' + record.issueNumber + '/' + record.issueYear,
      '  ' + SITE_URL + '/karar/' + record.slug,
      '',
    ]),
  ];

  if (remaining > 0) lines.push('ve ' + remaining + ' kayıt daha: ' + SITE_URL + '/takip', '');

  lines.push(
    SITE_NAME + ' resmî bir kurum değildir. Bağlayıcı olan, gazetede yayımlanan resmî metindir.',
    'Takibi durdur: ' + unsubscribeUrl(input.alertId),
  );

  return lines.join('\n');
}
