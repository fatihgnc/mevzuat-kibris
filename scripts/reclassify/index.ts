import { classifyDocType, classifyTopics } from '../classify/rules';
import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

import { inheritReferencedTopics } from './inherit';

/**
 * Saklanan başlıklardan belge türünü ve konuları YENİDEN hesaplar.
 *
 * Neden ayrı bir betik: sınıflandırma kuralları gerçek veri görüldükçe
 * değişiyor ve her değişiklik ancak yeni kayıtlara uygulanıyordu. Mevcut
 * kayıtları güncellemenin tek yolu bütün arşivi yeniden çekmekti — 262 PDF
 * indirmesi, kaynak siteye gereksiz yük ve saatler. Oysa sınıflandırma
 * yalnızca `title`, `section` ve `ref_type` sütunlarına bakıyor; üçü de
 * veritabanında duruyor. Ağa hiç çıkmıyoruz.
 *
 * DEĞİŞTİRMEDİKLERİ, bilerek: `body_text`, `summary`, `has_own_page`, `slug`.
 * Bunlar PDF metnine ya da üretim anındaki karara bağlı; slug ise spec 8.1
 * gereği bir kez üretildikten sonra hiç değişmiyor.
 *
 * Kullanım: tsx scripts/reclassify/index.ts [--dry]
 */

interface RecordRow {
  id: string;
  title: string;
  section: string;
  doc_type: string;
  ref_type: string | null;
}

async function main() {
  const dry = process.argv.includes('--dry');

  const rows = await sql<RecordRow[]>`
    select id, title, section, doc_type, ref_type from records order by id
  `;

  log.info('yeniden sınıflandırma başlıyor', { records: rows.length, dry });

  let docTypeChanged = 0;
  let topicsChanged = 0;

  for (const row of rows) {
    const docType = classifyDocType({
      title: row.title,
      section: row.section,
      refType: row.ref_type,
    });
    const topics = classifyTopics({ title: row.title, docType });

    const current = await sql<Array<{ topic: string }>>`
      select topic from record_topics where record_id = ${Number(row.id)} order by topic
    `;
    const before = current.map((item) => item.topic).sort();
    const after = [...topics].sort();
    const sameTopics = before.length === after.length && before.every((t, i) => t === after[i]);

    if (docType !== row.doc_type) docTypeChanged += 1;
    if (!sameTopics) topicsChanged += 1;

    if (dry) continue;

    if (docType !== row.doc_type) {
      await sql`update records set doc_type = ${docType}, updated_at = now() where id = ${Number(row.id)}`;
    }

    if (!sameTopics) {
      /*
       * Kaldırılanları da silmek ŞART. Yalnızca ekleme yapılsaydı, bir kayıt
       * daha önce yanlışlıkla aldığı konuyu sonsuza kadar taşırdı ve kural
       * daraltmaları hiç etki etmezdi.
       */
      await sql`delete from record_topics where record_id = ${Number(row.id)}`;
      for (const topic of topics) {
        await sql`
          insert into record_topics (record_id, topic) values (${Number(row.id)}, ${topic})
          on conflict do nothing
        `;
      }
    }
  }

  log.info('kural tabanlı sınıflandırma bitti', { docTypeChanged, topicsChanged });

  /*
   * Devralma kural katmanından SONRA çalışmak zorunda: tadil kaydı konusunu
   * atıf yaptığı karardan alıyor ve o kaynağın konusu ancak bu adımda
   * belirleniyor. Sıra ters olsaydı kaynakların çoğu hâlâ konusuz olurdu.
   */
  const inherited = dry ? 0 : await inheritReferencedTopics();
  log.info('yeniden sınıflandırma tamam', { docTypeChanged, topicsChanged, inherited });

  await closeDb();
}

main().catch((error) => {
  log.error('yeniden sınıflandırma başarısız', { message: String(error) });
  process.exit(1);
});
