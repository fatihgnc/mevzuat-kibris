import { Resend } from 'resend';

import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from '../../src/lib/seo/config';
import { sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * Emails the operator when this run discovered brand-new issues.
 *
 * "New" means the crawl INSERTED the row this run, so an issue triggers exactly
 * one email even though the cron fires every 3 hours. A failed send is logged
 * and swallowed: a notification must never turn a healthy ingest red.
 */
export async function notifyNewIssues(year: number, numbers: number[]): Promise<void> {
  if (numbers.length === 0) return;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log.warn('RESEND_API_KEY yok, yeni sayı bildirimi atlandı', { year, numbers });
    return;
  }

  try {
    const rows = await sql<
      Array<{ number: number; published_at: string | Date; records: number; with_body: number }>
    >`
      select i.number, i.published_at,
             count(r.id)::int as records,
             count(r.id) filter (
               where coalesce(nullif(r.body_markdown, ''), nullif(r.body_text, '')) is not null
             )::int as with_body
        from issues i
        left join records r on r.issue_id = i.id
       where i.year = ${year} and i.number = any(${numbers}::int[])
       group by i.id
       order by i.number
    `;

    const lines = rows.map((row) => {
      const date =
        row.published_at instanceof Date
          ? row.published_at.toISOString().slice(0, 10)
          : String(row.published_at).slice(0, 10);
      return (
        `Sayı ${row.number} (${date})\n` +
        `${row.records} kayıt — ${row.with_body} gövde dolu, ${row.records - row.with_body} gövde boş\n` +
        `${SITE_URL}/sayilar/${year}/${row.number}`
      );
    });

    const subject =
      numbers.length === 1
        ? `Yeni Resmi Gazete sayısı: ${year}/${numbers[0]}`
        : `${numbers.length} yeni Resmi Gazete sayısı (${year})`;

    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM ?? SITE_NAME + ' <bildirim@mevzuatkibris.com>',
      to: process.env.INGEST_NOTIFY_EMAIL || CONTACT_EMAIL,
      subject,
      text: lines.join('\n\n'),
    });
    if (error) throw new Error(error.message);

    log.info('yeni sayı bildirimi gönderildi', { year, numbers });
  } catch (error) {
    log.warn('yeni sayı bildirimi gönderilemedi', { year, numbers, message: String(error) });
  }
}
