import { findPrimaryRefs } from '../parse-records/parser';
import { sql } from '../shared/db';
import { log } from '../shared/logger';

/**
 * Makes amendment/annulment decisions inherit their topic from the decision they
 * cite.
 *
 * Some Council of Ministers decisions carry no topic signal of their own:
 *
 *   "Ü(K-I) 1880-2024 SAYI VE 21.10.2024 TARİHLİ KARARIN TADİL EDİLMESİ"
 *
 * This record's topic is the topic of the decision it amends. No keyword rule can
 * solve it — the title contains not one word about the subject. In 2025, 169
 * records look like this.
 *
 * Inheritance does NOT CHAIN: only the topics of the directly cited record are
 * taken, and if that record itself amends another decision we do not follow it.
 * The reason is that the decision at the end of the chain is usually not in the
 * archive, and the topic drifts further from relevance at every step.
 *
 * The coverage limit should be stated honestly: citations often reach back into
 * earlier years (2024, 2016, 2013). Until those years are crawled, the source
 * record cannot be found and the record stays without a topic — left empty rather
 * than invented.
 */

/** Only run on records that really are amendments or annulments. */
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
     * A title may contain several citations ("the annulment of decisions A and
     * B"). We take the UNION of all their topics: the record genuinely concerns
     * all of them, and picking one would be arbitrary.
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
