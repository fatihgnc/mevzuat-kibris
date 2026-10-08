import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { closeDb } from '../shared/db';
import { politeFetch } from '../shared/http';
import { log } from '../shared/logger';

import { insertRecord, plan, syncAuto, type Candidate } from './sync';

/**
 * Vacancy circulars from khk.gov.ct.tr (see sync.ts).
 *
 *   plan   --out DIR [--years 2022-2026]   list what is missing, download its PDFs
 *   import --from DIR [--apply]            write hand-transcribed bodies from DIR
 *   auto   [--years 2025-2026] [--apply]   the unattended path (text layer)
 *
 * `import` expects, for every circular label (e.g. "MT.41/2026" -> "MT.41-2026"),
 * `<label>.md` (the transcription) and `<label>.json`
 * `{ "publishedAt": "2026-10-06", "deadlineAt": "2027-01-06", "deadlineNote": null }`.
 *
 * Dry run unless --apply.
 */

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function years(fallback: string): number[] {
  const [from, to] = (arg('--years') ?? fallback).split('-').map(Number) as [number, number?];
  const out: number[] = [];
  for (let year = from; year <= (to ?? from); year += 1) out.push(year);
  return out;
}

export function fileKey(label: string): string {
  return label.replace('/', '-');
}

async function planCommand() {
  const out = arg('--out');
  if (!out) throw new Error('--out DIR gerekli');

  const { candidates, known } = await plan(years('2022-2026'));
  mkdirSync(join(out, 'pdf'), { recursive: true });

  const byStatus: Record<string, number> = {};
  for (const candidate of candidates) byStatus[candidate.status] = (byStatus[candidate.status] ?? 0) + 1;
  log.info('khk plan', byStatus);

  // Cross-check: for circulars we already hold, does the listing agree on the deadline?
  const disagree = candidates.filter((candidate) => {
    if (candidate.status !== 'have' || !candidate.listingDeadline) return false;
    const record = known.find((item) => item.id === candidate.matchIds[0]);
    return record?.deadlineAt && record.deadlineAt !== candidate.listingDeadline;
  });
  log.info('deadline differs from listing', {
    count: disagree.length,
    items: disagree.map((candidate) => {
      const record = known.find((item) => item.id === candidate.matchIds[0]);
      return `${candidate.circular.label}: db ${record?.deadlineAt} / listing ${candidate.listingDeadline}`;
    }),
  });

  const missing = candidates.filter((candidate) => candidate.status === 'missing');
  for (const candidate of missing) {
    const file = join(out, 'pdf', fileKey(candidate.circular.label) + '.pdf');
    if (existsSync(file)) continue;

    const response = await politeFetch(encodeURI(candidate.sourceUrl), { timeoutMs: 120_000 });
    if (!response.ok) {
      log.warn('pdf indirilemedi', { label: candidate.circular.label, status: response.status });
      continue;
    }
    writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  }

  writeFileSync(
    join(out, 'manifest.json'),
    JSON.stringify(
      candidates.map((candidate) => ({
        label: candidate.circular.label,
        key: fileKey(candidate.circular.label),
        status: candidate.status,
        matchIds: candidate.matchIds,
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        listingDeadline: candidate.listingDeadline,
        department: candidate.row.department,
        category: candidate.row.category,
      })),
      null,
      1,
    ),
  );
  log.info('downloaded', { missing: missing.length, out });
}

async function importCommand() {
  const from = arg('--from');
  if (!from) throw new Error('--from DIR gerekli');
  const apply = process.argv.includes('--apply');

  const manifest = JSON.parse(readFileSync(join(from, 'manifest.json'), 'utf8')) as Array<{
    key: string;
    status: string;
    label: string;
  }>;
  const { candidates } = await plan(years('2022-2026'));
  const byLabel = new Map<string, Candidate>(candidates.map((candidate) => [candidate.circular.label, candidate]));

  let written = 0;
  let problems = 0;

  for (const item of manifest.filter((entry) => entry.status === 'missing')) {
    const md = join(from, 'out', item.key + '.md');
    const meta = join(from, 'out', item.key + '.json');
    const candidate = byLabel.get(item.label);

    if (!candidate || !existsSync(md) || !existsSync(meta)) {
      log.warn('not transcribed yet', { label: item.label });
      problems += 1;
      continue;
    }
    if (candidate.status !== 'missing') continue;

    const { publishedAt, deadlineAt, deadlineNote } = JSON.parse(readFileSync(meta, 'utf8')) as {
      publishedAt: string | null;
      deadlineAt: string | null;
      deadlineNote: string | null;
    };

    // No application window: a withdrawal letter, not a vacancy notice.
    if (!publishedAt || !deadlineAt) {
      log.warn('skipped: no date or no application window', { label: item.label });
      continue;
    }

    if (!apply) {
      written += 1;
      continue;
    }

    const slug = await insertRecord({
      candidate,
      publishedAt,
      deadlineAt,
      deadlineNote: candidate.cancelled ? [deadlineNote, 'KHK listesine göre iptal edildi'].filter(Boolean).join('. ') : deadlineNote,
      bodyMarkdown: readFileSync(md, 'utf8').trim(),
    });
    if (slug) written += 1;
  }

  log.info(apply ? 'imported' : 'dry run (nothing written)', { written, problems });
}

async function autoCommand() {
  if (!process.argv.includes('--apply')) {
    const { candidates } = await plan(years(`${new Date().getFullYear() - 1}-${new Date().getFullYear()}`));
    log.info(
      'dry run: would read',
      { labels: candidates.filter((candidate) => candidate.status === 'missing').map((candidate) => candidate.circular.label) },
    );
    return;
  }

  const result = await syncAuto(years(`${new Date().getFullYear() - 1}-${new Date().getFullYear()}`));
  log.info('khk auto sync', { ...result });
}

const commands: Record<string, () => Promise<void>> = {
  plan: planCommand,
  import: importCommand,
  auto: autoCommand,
};

async function main() {
  const command = commands[process.argv[2] ?? ''];
  if (!command) throw new Error('usage: khk-sync <plan|import|auto>');
  await command();
}

// Only when run directly, so the daily ingest can import sync.ts without side effects.
if (process.argv[1]?.includes('khk-sync')) {
  main()
    .catch((error) => {
      log.error('khk-sync failed', { error: String(error) });
      process.exitCode = 1;
    })
    .finally(closeDb);
}

