import { createHmac } from 'node:crypto';

import { SITE_NAME, SITE_URL } from '../../src/lib/seo/config';
import { formatDateShort } from '../../src/lib/text/dates';

/**
 * Digest email template — spec 10.3.
 *
 * Plain HTML: title, meta line and link per record. At most 15 records, with the
 * rest behind an "and N more records" link. No ads, no tracking pixel.
 *
 * The headline shown is records.summary — the exact same text as the list, the
 * detail page, RSS and og:title (spec 3.8 rule 4). There is no email-specific
 * regeneration.
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
  // `||`, NOT `??`. An env var set to an empty string is not nullish, so `??`
  // would hand HMAC an EMPTY KEY instead of falling back — silently, and only
  // on the side that has the empty value, so the two sides stop agreeing and
  // every unsubscribe link reads as invalid. `.env.example` ships this name
  // with an empty value, which is exactly how someone ends up there.
  const secret = process.env.ALERT_UNSUBSCRIBE_SECRET || process.env.REVALIDATE_SECRET || '';
  return createHmac('sha256', secret).update('alert:' + alertId).digest('base64url');
}

export function unsubscribeUrl(alertId: number): string {
  return SITE_URL + '/api/abonelik-iptal?id=' + alertId + '&t=' + unsubscribeToken(alertId);
}

/**
 * The USER-level token, for the List-Unsubscribe header.
 *
 * One digest now covers several follows, and RFC 8058 gives the header exactly one
 * URL which must act with no further interaction. "Stop this stream" is the only
 * honest reading of one click on a mail that carries three follows, so the header
 * stops all of them. Picking one is still possible — every follow has its own link
 * in the body.
 *
 * A separate prefix from the per-alert token on purpose: the two must not be
 * interchangeable, or an alert id would unsubscribe a user and vice versa.
 */
export function userUnsubscribeToken(userId: string): string {
  // `||`, NOT `??`. An env var set to an empty string is not nullish, so `??`
  // would hand HMAC an EMPTY KEY instead of falling back — silently, and only
  // on the side that has the empty value, so the two sides stop agreeing and
  // every unsubscribe link reads as invalid. `.env.example` ships this name
  // with an empty value, which is exactly how someone ends up there.
  const secret = process.env.ALERT_UNSUBSCRIBE_SECRET || process.env.REVALIDATE_SECRET || '';
  return createHmac('sha256', secret).update('user:' + userId).digest('base64url');
}

export function userUnsubscribeUrl(userId: string): string {
  return SITE_URL + '/api/abonelik-iptal?u=' + encodeURIComponent(userId) +
    '&t=' + userUnsubscribeToken(userId);
}

export interface DigestFollow {
  alertId: number;
  label: string;
  /** Already allocated by the caller — the 15-record budget is shared by the email. */
  records: DigestRecord[];
  /** This follow's full match count, for its own heading line. */
  totalMatched: number;
}

export interface DigestInput {
  userId: string;
  follows: DigestFollow[];
  /** Distinct records matched across every follow, minus those actually shown. */
  remaining: number;
}

function totalMatched(input: DigestInput): number {
  return input.follows.reduce((sum, follow) => sum + follow.totalMatched, 0);
}

export function renderDigestSubject(input: DigestInput): string {
  const first = input.follows[0]!;
  // One follow keeps the old, more specific subject; several name themselves so the
  // reader can tell at a glance which follows fired.
  if (input.follows.length === 1) return first.label + ': ' + first.totalMatched + ' yeni kayıt';
  return (
    totalMatched(input) + ' yeni kayıt · ' + input.follows.map((f) => f.label).join(', ')
  );
}

function recordRowsHtml(records: DigestRecord[]): string {
  return records
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
}

export function renderDigestHtml(input: DigestInput): string {
  const many = input.follows.length > 1;

  const sections = input.follows
    .map((follow) => {
      const heading = many
        ? [
            '<tr><td style="padding:18px 24px 0;">',
            '<div style="font-size:14px;font-weight:600;color:#17181A;">',
            escapeHtml(follow.label),
            '</div>',
            '<div style="margin-top:2px;font-size:13px;color:#6B6B75;">',
            follow.totalMatched + ' yeni kayıt',
            ' · <a href="' + unsubscribeUrl(follow.alertId) + '" style="color:#6B6B75;">durdur</a>',
            '</div></td></tr>',
          ].join('')
        : '';

      return (
        heading +
        '<tr><td style="padding:' + (many ? '2px' : '6px') + ' 24px 6px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
        recordRowsHtml(follow.records) +
        '</table></td></tr>'
      );
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
    many
      ? input.follows.length + ' takibinizde toplam ' + totalMatched(input) + ' yeni kayıt'
      : escapeHtml(input.follows[0]!.label) + ' takibinizde ' + input.follows[0]!.totalMatched +
        ' yeni kayıt',
    '</div></td></tr>',

    sections,

    input.remaining > 0
      ? '<tr><td style="padding:0 24px 18px;"><div style="font-size:14px;"><a href="' +
        SITE_URL +
        '/takip" style="color:#1F6E7C;">ve ' +
        input.remaining +
        ' kayıt daha</a></div></td></tr>'
      : '',

    '<tr><td style="padding:16px 24px;border-top:1px solid #E4E4E7;background:#F4F4F5;',
    'font-size:12px;line-height:1.5;color:#6B6B75;border-radius:0 0 6px 6px;">',
    SITE_NAME + ' resmî bir kurum değildir. Bağlayıcı olan, gazetede yayımlanan resmî metindir.',
    '<div style="margin-top:8px;">',
    many
      ? '<a href="' + userUnsubscribeUrl(input.userId) +
        '" style="color:#6B6B75;">Tüm takipleri durdur</a>'
      : '<a href="' + unsubscribeUrl(input.follows[0]!.alertId) +
        '" style="color:#6B6B75;">Bu takibi durdur</a>',
    ' · <a href="' + SITE_URL + '/takip" style="color:#6B6B75;">Takiplerimi yönet</a>',
    '</div></td></tr>',

    '</table></td></tr></table></body></html>',
  ].join('');
}

export function renderDigestText(input: DigestInput): string {
  const many = input.follows.length > 1;

  const lines: string[] = [
    many
      ? input.follows.length + ' takibinizde toplam ' + totalMatched(input) + ' yeni kayıt'
      : input.follows[0]!.label + ' takibinizde ' + input.follows[0]!.totalMatched + ' yeni kayıt',
    '',
  ];

  for (const follow of input.follows) {
    if (many) lines.push('— ' + follow.label + ' (' + follow.totalMatched + ' yeni kayıt)', '');
    for (const record of follow.records) {
      lines.push(
        record.summary ?? record.title,
        '  ' + formatDateShort(record.publishedAt) + ' · RG ' + record.issueNumber + '/' + record.issueYear,
        '  ' + SITE_URL + '/karar/' + record.slug,
        '',
      );
    }
    if (many) lines.push('  Bu takibi durdur: ' + unsubscribeUrl(follow.alertId), '');
  }

  if (input.remaining > 0) {
    lines.push('ve ' + input.remaining + ' kayıt daha: ' + SITE_URL + '/takip', '');
  }

  lines.push(
    SITE_NAME + ' resmî bir kurum değildir. Bağlayıcı olan, gazetede yayımlanan resmî metindir.',
    many
      ? 'Tüm takipleri durdur: ' + userUnsubscribeUrl(input.userId)
      : 'Takibi durdur: ' + unsubscribeUrl(input.follows[0]!.alertId),
  );

  return lines.join('\n');
}
