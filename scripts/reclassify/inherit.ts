import { findPrimaryRefs } from '../parse-records/parser';
import { sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * Tadil/iptal kararlarının konusunu, atıf yaptıkları karardan devralır.
 *
 * Bakanlar Kurulu kararlarının bir bölümü kendi başına konu sinyali taşımıyor:
 *
 *   "Ü(K-I) 1880-2024 SAYI VE 21.10.2024 TARİHLİ KARARIN TADİL EDİLMESİ"
 *
 * Bu kaydın konusu, tadil ettiği kararın konusu. Kelime kuralıyla çözülemez —
 * başlıkta konuya dair hiçbir sözcük yok. 2025'te 169 kayıt böyle.
 *
 * Devralma ZİNCİRLENMİYOR: yalnızca doğrudan atıf yapılan kaydın konuları
 * alınıyor, o kayıt da başka bir kararı tadil ediyorsa peşine düşülmüyor.
 * Sebep, zincirin ucundaki kararın çoğunlukla arşivde olmaması ve her adımda
 * konunun biraz daha alakasızlaşması.
 *
 * Kapsam sınırı dürüstçe söylenmeli: atıflar sık sık geçmiş yıllara gidiyor
 * (2024, 2016, 2013). O yıllar çekilmediği sürece kaynak kayıt bulunamıyor ve
 * kayıt konusuz kalıyor — uydurmaktansa boş bırakılıyor.
 */

/** Yalnızca gerçekten tadil/iptal olan kayıtlarda çalışsın. */
const AMENDMENT = /(TADİL|İPTAL)\s+ED/i;

export async function inheritReferencedTopics(): Promise<number> {
  const rows = await sql<Array<{ id: string; title: string }>>`
    select r.id, r.title
      from records r
     where not exists (select 1 from record_topics rt where rt.record_id = r.id)
       and r.title ~* '(TADİL|İPTAL)\\s+ED'
  `;

  log.info('devralma adayı', { count: rows.length });

  let inherited = 0;

  for (const row of rows) {
    if (!AMENDMENT.test(row.title)) continue;

    const refs = findPrimaryRefs(row.title);
    if (!refs.length) continue;

    /*
     * Başlıkta birden çok atıf olabiliyor ("A ve B sayılı kararların iptali").
     * Hepsinin konularının BİRLEŞİMİ alınıyor: kayıt gerçekten hepsini
     * ilgilendiriyor ve birini seçmek keyfi olurdu.
     */
    const topics = new Set<string>();

    for (const ref of refs) {
      const found = await sql<Array<{ topic: string }>>`
        select distinct rt.topic
          from records s
          join record_topics rt on rt.record_id = s.id
         where s.ref_type = ${ref.type} and s.ref_number = ${ref.number}
           and s.id <> ${Number(row.id)}
      `;
      for (const item of found) topics.add(item.topic);
    }

    if (!topics.size) continue;

    for (const topic of topics) {
      await sql`
        insert into record_topics (record_id, topic) values (${Number(row.id)}, ${topic})
        on conflict do nothing
      `;
    }
    inherited += 1;
  }

  return inherited;
}
