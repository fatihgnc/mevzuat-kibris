import { Resend } from 'resend';

import { docTypeLabel, formatRef } from '../../src/lib/constants/doc-types';
import { SITE_NAME, SITE_URL } from '../../src/lib/seo/config';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

import {
  MAX_RECORDS_PER_EMAIL,
  renderDigestHtml,
  renderDigestSubject,
  renderDigestText,
  unsubscribeUrl,
  type DigestRecord,
} from './template';

/**
 * Aşama 9 — alarm gönderimi (spec 10).
 *
 * E-posta hacmi bu üründe bir maliyet kalemi, dolayısıyla tasarımın kısıtı.
 * Resend ücretsiz katmanı: aylık 3.000, GÜNLÜK 100. Bağlayıcı olan günlük
 * tavan.
 *
 * Uygulanan kurallar:
 *   1. Varsayılan haftalık (alerts.frequency default 'weekly')
 *   2. Haftanın gününe dağıtım — bugün hangi güne düşüyorsa o aboneler
 *   3. Eşleşme yoksa mail YOK ("bu hafta yeni kayıt yok" maili asla gitmez)
 *   4. Kota bekçisi — tavana yaklaşıldıysa kalanlar ertelenir ve
 *      status='deferred' olarak loglanır, SESSİZCE DÜŞÜRÜLMEZ
 *   5. Günlük abone 60'ı geçince yeni günlük talep kapalı (createAlert'te)
 *   6. instant frekansı yok
 */

const DAILY_CAP = 100;
/** Kota bekçisine pay: tavanın bu kadarını kullanıp duruyoruz. */
const SAFETY_MARGIN = 10;
const BATCH_SIZE = 100;

interface MatchRow {
  alert_id: string;
  label: string;
  email: string;
  frequency: string;
  matched: Array<string | number>;
}

interface RecordRow {
  id: string;
  slug: string;
  summary: string | null;
  title: string;
  published_at: string | Date;
  ref_type: string | null;
  ref_number: string | null;
  doc_type: string;
  issue_number: number;
  issue_year: number;
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

/**
 * Eşleştirme sorgusu — spec 10.2, birebir. Arama ile aynı search_vector ve
 * aynı tr_rg config'i: kullanıcının aramada gördüğü ile alarmda aldığı aynı.
 *
 * Pencere: son gönderimden bu yana yayımlanmış kayıtlar. last_sent_at boşsa
 * son 7 gün — yeni abone bir yıllık arşivi tek mailde almasın.
 */
async function findMatches(frequency: 'daily' | 'weekly', weekday: number): Promise<MatchRow[]> {
  return sql<MatchRow[]>`
    select a.id as alert_id,
           a.label,
           p.email,
           a.frequency,
           array_agg(distinct r.id) as matched
      from alerts a
      join profiles p on p.id = a.user_id
      join records r
        on r.created_at > coalesce(a.last_sent_at, now() - interval '7 days')
      left join record_topics rt   on rt.record_id = r.id
      left join record_entities re on re.record_id = r.id
     where a.is_active
       and a.frequency = ${frequency}
       ${frequency === 'weekly' ? sql`and a.preferred_weekday = ${weekday}` : sql``}
       and (
             (a.query is not null and r.search_vector @@ mk_tsquery(a.query))
          or (cardinality(a.topics)     > 0 and rt.topic     = any(a.topics))
          or (cardinality(a.doc_types)  > 0 and r.doc_type   = any(a.doc_types))
          or (cardinality(a.entity_ids) > 0 and re.entity_id = any(a.entity_ids))
       )
     group by a.id, a.label, p.email, a.frequency
  `;
}

async function loadRecords(ids: number[]): Promise<DigestRecord[]> {
  if (!ids.length) return [];

  const rows = await sql<RecordRow[]>`
    select r.id, r.slug, r.summary, r.title, r.published_at,
           r.ref_type, r.ref_number, r.doc_type,
           i.number as issue_number, i.year as issue_year
      from records r
      join issues i on i.id = r.issue_id
     where r.id = any(${ids}::bigint[])
     order by r.published_at desc
     limit ${MAX_RECORDS_PER_EMAIL}
  `;

  return rows.map((row) => ({
    slug: row.slug,
    summary: row.summary,
    title: row.title,
    publishedAt: toIso(row.published_at),
    issueNumber: row.issue_number,
    issueYear: row.issue_year,
    refLabel: formatRef(row.ref_type, row.ref_number),
    docTypeLabel: docTypeLabel(row.doc_type),
  }));
}

async function sentToday(): Promise<number> {
  const rows = await sql<Array<{ n: string }>>`
    select count(*)::int as n
      from alert_deliveries
     where status = 'sent' and sent_at::date = current_date
  `;
  return Number(rows[0]?.n ?? 0);
}

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? SITE_NAME + ' <bildirim@mevzuatkibris.com>';

  if (!apiKey) throw new Error('RESEND_API_KEY tanımlı değil.');

  const resend = new Resend(apiKey);
  const weekday = new Date().getUTCDay();

  const [daily, weekly] = await Promise.all([
    findMatches('daily', weekday),
    findMatches('weekly', weekday),
  ]);

  // Günlük aboneler önce: haftalık olan bir gün ertelenebilir, günlük olan
  // ertelenirse "her gün" sözü tutulmamış olur.
  const queue = [...daily, ...weekly].filter((row) => row.matched.length > 0);

  log.info('gönderim kuyruğu', { daily: daily.length, weekly: weekly.length, queue: queue.length });

  let budget = DAILY_CAP - SAFETY_MARGIN - (await sentToday());
  const payloads: Array<{
    alertId: number;
    recordIds: number[];
    message: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text: string;
      headers: Record<string, string>;
    };
  }> = [];

  for (const row of queue) {
    const alertId = Number(row.alert_id);
    const recordIds = row.matched.map(Number);

    if (budget <= 0) {
      /*
       * Kota bekçisi (spec 10.3 madde 4). Sessizce düşürmüyoruz: ertelenen
       * gönderim loglanıyor ve yarınki çalışmada last_sent_at değişmediği
       * için aynı kayıtlar tekrar eşleşiyor.
       */
      await sql`
        insert into alert_deliveries (alert_id, record_ids, status)
        values (${alertId}, ${recordIds}, 'deferred')
      `;
      log.warn('günlük kota doldu, gönderim ertelendi', { alertId });
      continue;
    }

    const records = await loadRecords(recordIds);
    if (!records.length) continue;

    const digest = {
      alertId,
      label: row.label,
      records,
      totalMatched: recordIds.length,
    };

    payloads.push({
      alertId,
      recordIds,
      message: {
        from,
        to: [row.email],
        subject: renderDigestSubject(digest),
        html: renderDigestHtml(digest),
        text: renderDigestText(digest),
        headers: {
          // ZORUNLU (spec 10.3): tek tıkla çıkma.
          'List-Unsubscribe': '<' + unsubscribeUrl(alertId) + '>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'List-Id': SITE_NAME + ' takip <takip.' + new URL(SITE_URL).hostname + '>',
        },
      },
    });

    budget -= 1;
  }

  // Batch API, istek başına 100 alıcı (spec 10.3).
  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const chunk = payloads.slice(i, i + BATCH_SIZE);

    try {
      const result = await resend.batch.send(chunk.map((item) => item.message));

      if (result.error) throw new Error(result.error.message);

      const sentIds = result.data?.data ?? [];

      for (let j = 0; j < chunk.length; j += 1) {
        const item = chunk[j]!;
        await sql`
          insert into alert_deliveries (alert_id, record_ids, status, provider_id)
          values (${item.alertId}, ${item.recordIds}, 'sent', ${sentIds[j]?.id ?? null})
        `;
        await sql`update alerts set last_sent_at = now() where id = ${item.alertId}`;
      }

      log.info('batch gönderildi', { size: chunk.length });
    } catch (error) {
      log.error('batch gönderilemedi', { message: String(error) });
      for (const item of chunk) {
        await sql`
          insert into alert_deliveries (alert_id, record_ids, status)
          values (${item.alertId}, ${item.recordIds}, 'failed')
        `;
      }
    }
  }

  log.info('alarm gönderimi bitti', { sent: payloads.length });
}

main()
  .catch((error) => {
    log.error('dispatch-alerts başarısız', { message: String(error) });
    process.exitCode = 1;
  })
  .finally(() => closeDb());
