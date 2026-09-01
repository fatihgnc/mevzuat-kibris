import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

import { createOpenAiClient, llmSummarize, type ChatClient, type DeclineReason } from './llm';
import { summarize } from './rules';

/**
 * Fills in records that have no summary, using staged generation — spec 3.8.
 *
 * Why a separate script rather than living inside `processIssue`: summary
 * generation goes over the network, costs money, and has to be RE-RUNNABLE.
 * Buried inside ingest, (a) the thousands of existing records would never get a
 * summary, because they have already been processed and `ON CONFLICT` preserves
 * the existing one; (b) a single OpenAI outage would also stop PDF downloads.
 * Same reasoning as `reclassify`: the input is already in the database and the
 * source site is never touched.
 *
 * INTERRUPTIBLE. It only selects rows where `summary is null` and moves to the
 * next group after writing each one; if it is cut off, re-running picks up where
 * it left off. A call that has been paid for is never paid for twice.
 *
 * THE SAME TITLE IS ASKED ONCE. Identical titles repeat across the gazette
 * ("A-TİCARET MARKALARI ... FASIL 268 RESMİ İLANLAR" appears in dozens of
 * issues); measured, 5,497 of the 6,118 summary-less records are unique. One
 * call per group, and the result is written to every record in that group.
 *
 * Usage:
 *   tsx scripts/summarize/index.ts --dry            counts, makes no calls
 *   tsx scripts/summarize/index.ts --limit 25       first 25 groups (trial run)
 *   tsx scripts/summarize/index.ts --year 2026      a single year
 *   tsx scripts/summarize/index.ts --retry          also retry earlier rejections
 *   tsx scripts/summarize/index.ts                  everything
 */

/** Concurrent requests — a sensible floor that stays clear of rate limits. */
const CONCURRENCY = 4;

interface Group {
  title: string;
  doc_type: string;
  section: string;
  ref_type: string | null;
  n: number;
}

interface Stats {
  groups: number;
  records: number;
  rule: number;
  llm: number;
  declined: number;
  failed: number;
  /** Rejections by reason — a dominant one points at the vetting, not the model. */
  declinedBy: Partial<Record<DeclineReason, number>>;
}

function parseArgs() {
  const argv = process.argv.slice(2);
  const valueOf = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const limit = Number(valueOf('--limit'));
  const year = Number(valueOf('--year'));

  return {
    dry: argv.includes('--dry'),
    retry: argv.includes('--retry'),
    limit: Number.isInteger(limit) && limit > 0 ? limit : null,
    year: Number.isInteger(year) ? year : null,
  };
}

/**
 * Copies an existing summary onto records that would produce an IDENTICAL prompt.
 *
 * Within one run the group query already asks each distinct prompt once. Across
 * runs it did not: a title summarised in 2025 that appears again in 2026 arrives as
 * a fresh row with `summary is null` and was asked — and paid for — a second time.
 * Measured on the real archive, 12.8% of records share a title with another record,
 * so this is the steady-state cost of the daily ingest almost in full.
 *
 * It also enforces spec 3.8 rule 3 more strictly than the model can: an identical
 * title now gets a byte-identical summary by construction, instead of whatever the
 * model happened to produce that day.
 *
 * The key is the whole prompt (title, doc type, section, ref type) — the same four
 * columns `loadGroups` groups by. Anything less would copy a summary onto a record
 * the model would have answered differently.
 *
 * `summary_attempted_at` is stamped too: the row is settled and must not enter a
 * later run's queue.
 */
async function reuseExistingSummaries(dry: boolean): Promise<number> {
  const source = sql`
    select distinct on (title, doc_type, section, ref_type)
           title, doc_type, section, ref_type, summary, summary_source
      from records
     where summary is not null
     order by title, doc_type, section, ref_type, id
  `;

  if (dry) {
    const rows = await sql<Array<{ n: number }>>`
      select count(*)::int as n
        from records r
        join (${source}) src
          on r.title = src.title
         and r.doc_type = src.doc_type
         and r.section = src.section
         and r.ref_type is not distinct from src.ref_type
       where r.summary is null
    `;
    return rows[0]?.n ?? 0;
  }

  const rows = await sql<Array<{ id: string }>>`
    update records r
       set summary = src.summary,
           summary_source = src.summary_source,
           summary_attempted_at = now()
      from (${source}) src
     where r.summary is null
       and r.title = src.title
       and r.doc_type = src.doc_type
       and r.section = src.section
       and r.ref_type is not distinct from src.ref_type
    returning r.id
  `;
  return rows.length;
}

async function loadGroups(
  year: number | null,
  limit: number | null,
  retry: boolean,
): Promise<Group[]> {
  /*
   * The grouping key is the WHOLE prompt: if two records produce the same
   * prompt they get the same answer, so there is no point asking twice.
   * `section` and `ref_type` go into the prompt too, hence into the key.
   *
   * Without `summary_attempted_at is null`, every run would re-ask records that
   * were already REJECTED. On an ingest that runs twice a day that means paying
   * indefinitely for titles that will never yield a summary. `--retry` lifts
   * that filter deliberately: when the prompt or the vetting changes, old
   * rejections should be retried — but that must be a DECISION, not the default.
   */
  const rows = await sql<Group[]>`
    select title, doc_type, section, ref_type, count(*)::int as n
      from records
     where summary is null
       ${retry ? sql`` : sql`and summary_attempted_at is null`}
       ${year === null ? sql`` : sql`and extract(year from published_at) = ${year}`}
     group by title, doc_type, section, ref_type
     order by n desc, title
     ${limit === null ? sql`` : sql`limit ${limit}`}
  `;
  return rows;
}

async function writeSummary(group: Group, summary: string, source: 'rule' | 'llm'): Promise<number> {
  /*
   * The `summary is null` condition is essential: if the script runs twice, or a
   * record picked up a summary by another route in the meantime, we do not
   * overwrite it. A summary is generated once (spec 3.8 rule 4) and
   * `processIssue`'s ON CONFLICT makes the same promise; breaking it here would
   * unilaterally cancel that guarantee.
   */
  const rows = await sql<Array<{ id: string }>>`
    update records
       set summary = ${summary}, summary_source = ${source}, summary_attempted_at = now()
     where summary is null
       and title = ${group.title}
       and doc_type = ${group.doc_type}
       and section = ${group.section}
       and ref_type is not distinct from ${group.ref_type}
    returning id
  `;
  return rows.length;
}

/** The attempted stamp — written even when no summary was produced (tier 3). */
async function markAttempted(group: Group): Promise<void> {
  await sql`
    update records
       set summary_attempted_at = now()
     where summary is null
       and title = ${group.title}
       and doc_type = ${group.doc_type}
       and section = ${group.section}
       and ref_type is not distinct from ${group.ref_type}
  `;
}

async function processGroup(group: Group, client: ChatClient, stats: Stats): Promise<void> {
  /*
   * The rule layer FIRST, before the LLM (spec 3.8 staging order). These records
   * failed the rules during ingest, but the rule set may have changed since;
   * trying is free, and when it hits it buys both money and consistency.
   */
  const ruled = summarize({ title: group.title, section: group.section, refType: group.ref_type });

  if (ruled) {
    /*
     * DO NOT WRITE `stats.records += await ...`. In a compound assignment
     * JavaScript reads the left-hand side BEFORE the await, so with four
     * concurrent workers the increments in between are lost. Measured against
     * the fake provider: 120 rows written, the counter said 37. Await first,
     * then add.
     */
    const written = await writeSummary(group, ruled.summary, 'rule');
    stats.rule += 1;
    stats.records += written;
    return;
  }

  try {
    const result = await llmSummarize(
      { title: group.title, section: group.section, refType: group.ref_type, docType: group.doc_type },
      client,
    );

    if ('declined' in result) {
      /*
       * The model declined, or vetting threw the output away -> tier 3: no
       * summary. WRITING THE STAMP IS ESSENTIAL, otherwise the next run asks the
       * same title again and gets the same result. `summary` stays null — the
       * record keeps showing its masked title; the only change is that it is not
       * asked again.
       */
      await markAttempted(group);
      stats.declined += 1;
      stats.declinedBy[result.declined] = (stats.declinedBy[result.declined] ?? 0) + 1;
      return;
    }

    const written = await writeSummary(group, result.summary, 'llm');
    stats.llm += 1;
    stats.records += written;
  } catch (error) {
    /*
     * One group blowing up does not stop the job; in a 5,500-group backfill,
     * starting over because of a single rate-limit error is unacceptable. The
     * record stays without a summary and is retried on the next run.
     */
    stats.failed += 1;
    log.error('grup işlenemedi', { title: group.title.slice(0, 100), message: String(error) });
  }
}

async function runPool(groups: Group[], client: ChatClient, stats: Stats): Promise<void> {
  let cursor = 0;
  let done = 0;

  const worker = async () => {
    while (cursor < groups.length) {
      const group = groups[cursor]!;
      cursor += 1;
      await processGroup(group, client, stats);

      done += 1;
      if (done % 50 === 0 || done === groups.length) {
        const { declinedBy: _skip, ...counts } = stats;
        log.info('ilerleme', { done, total: groups.length, ...counts });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, groups.length) }, worker));
}

async function main() {
  const { dry, limit, year, retry } = parseArgs();

  /*
   * Before spending anything: fill in whatever an earlier run already answered.
   * Free, deterministic, and it shrinks the set `loadGroups` then has to ask.
   */
  const reused = await reuseExistingSummaries(dry);
  if (reused) log.info('mevcut özetten dolduruldu', { records: reused, dry });

  const groups = await loadGroups(year, limit, retry);
  const records = groups.reduce((sum, group) => sum + group.n, 0);

  log.info('özetleme başlıyor', { groups: groups.length, records, dry, limit, year, retry });

  if (dry) {
    /*
     * A dry run makes NO calls at all: its purpose is to show the cost up front.
     * It still tries the rule layer, because how many groups are solved for free
     * directly determines how many calls will be paid for.
     */
    let ruleHits = 0;
    for (const group of groups) {
      if (summarize({ title: group.title, section: group.section, refType: group.ref_type })) ruleHits += 1;
    }
    log.info('kuru çalıştırma', {
      groups: groups.length,
      solvedByRule: ruleHits,
      llmCalls: groups.length - ruleHits,
      recordsAffected: records,
    });
    await closeDb();
    return;
  }

  const client = createOpenAiClient();
  const stats: Stats = {
    groups: groups.length, records: 0, rule: 0, llm: 0, declined: 0, failed: 0, declinedBy: {},
  };

  try {
    await runPool(groups, client, stats);
    log.info('özetleme bitti', { ...stats, declinedBy: JSON.stringify(stats.declinedBy) });
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  log.error('özetleme başarısız', { message: String(error) });
  process.exit(1);
});
