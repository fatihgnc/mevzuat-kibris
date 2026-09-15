import { Mistral } from '@mistralai/mistralai';

import { closeDb, sql } from '../shared/db';
import { log } from '../shared/logger';

import { REF_TYPES, type RefType } from '../../src/lib/constants/doc-types';
import { bodyAnchor, extractBody } from '../parse-records/parser';
import { ocrIssueMistral } from './mistral-engine';

/**
 * PILOT ONLY -- not wired into any production runner yet. Tests whether a cheap
 * LLM (mistral-small-latest, $0.10/$0.30 per 1M tokens) can reliably recover
 * bodies for records that have no anchor to search for (§ conversation: ~2,607
 * of ~17,000 records have a BLANK reference cell at the source, so extractBody
 * has nothing to find).
 *
 * KEY IDEA: don't hand the LLM the whole issue. ~82% of an issue's records
 * already extract correctly via the existing anchor method -- their start/end
 * offsets in the OCR text are known and trustworthy. The unanchored records
 * only ever live in the GAPS between two known-good records (or before the
 * first / after the last). Handing the LLM just that gap, plus the ordered
 * titles of the records known to fall inside it, is a much smaller and more
 * constrained task than "segment this whole 76-page issue" -- less room for
 * the model to drift, and far cheaper in tokens.
 *
 * This prints its per-gap output for manual inspection (accuracy is judged by
 * eye in this pilot, not automatically) plus real token counts, so a decision
 * to build the production version rests on measured numbers, not a guess.
 *
 * Usage: tsx scripts/extract-text/mistral-segment-pilot.ts <issueId> [issueId...]
 */

function asRefType(value: string | null): RefType | null {
  return value !== null && (REF_TYPES as readonly string[]).includes(value)
    ? (value as RefType)
    : null;
}

interface RecordRow {
  id: number;
  title: string;
  ref_type: string | null;
  ref_number: string | null;
  has_own_page: boolean;
}

interface Gap {
  start: number;
  end: number;
  problemRecords: Array<{ id: number; title: string; sortOrder: number }>;
  contextRecords: Array<{ title: string; sortOrder: number }>; // has_own_page=false records inside the gap, for context only
}

async function processIssue(client: Mistral, issueId: number) {
  const [issue] = await sql<Array<{ pdf_url: string; year: number; number: number }>>`
    select pdf_url, year, number from issues where id = ${issueId}
  `;
  if (!issue) {
    log.warn('sayı bulunamadı', { issueId });
    return { inputChars: 0, outputChars: 0, attempted: 0 };
  }

  const { text } = await ocrIssueMistral(issue.pdf_url);

  const allRecords = await sql<RecordRow[]>`
    select id, title, ref_type, ref_number, has_own_page
    from records where issue_id = ${issueId} order by id
  `;

  const withLabel = allRecords.map((r) => ({ ...r, label: bodyAnchor(asRefType(r.ref_type), r.ref_number) }));
  const known = withLabel.filter((r): r is (typeof withLabel)[number] & { label: string } => r.label !== null && r.has_own_page);

  // Locate each known record's actual start/end offset in `text` by finding
  // its already-correct extracted body as a literal substring -- reuses
  // extractBody instead of reimplementing findLabel's regex tolerance.
  const knownWithOffsets: Array<{ start: number; end: number; sortOrder: number }> = [];
  for (const record of known) {
    const otherLabels = known.filter((r) => r.id !== record.id).map((r) => r.label);
    const { body } = extractBody(text, record.label, otherLabels);
    if (!body) continue;
    const start = text.indexOf(body);
    if (start === -1) continue;
    knownWithOffsets.push({ start, end: start + body.length, sortOrder: record.id });
  }
  knownWithOffsets.sort((a, b) => a.start - b.start);

  const problemCandidates = withLabel.filter((r) => r.label === null && r.has_own_page);
  if (problemCandidates.length === 0 || knownWithOffsets.length === 0) {
    log.info('bu sayıda boşluk analizi için yeterli veri yok', { issueId });
    return { inputChars: 0, outputChars: 0, attempted: 0 };
  }

  // Build gaps: before the first known record, between consecutive known
  // records, and after the last one. A gap only matters if a problem record's
  // id falls inside its [prevSortOrder, nextSortOrder) range.
  const gaps: Gap[] = [];
  const bounds = [
    { start: 0, end: knownWithOffsets[0]!.start, loSortOrder: -Infinity, hiSortOrder: knownWithOffsets[0]!.sortOrder },
    ...knownWithOffsets.slice(0, -1).map((k, i) => ({
      start: k.end,
      end: knownWithOffsets[i + 1]!.start,
      loSortOrder: k.sortOrder,
      hiSortOrder: knownWithOffsets[i + 1]!.sortOrder,
    })),
    {
      start: knownWithOffsets[knownWithOffsets.length - 1]!.end,
      end: text.length,
      loSortOrder: knownWithOffsets[knownWithOffsets.length - 1]!.sortOrder,
      hiSortOrder: Infinity,
    },
  ];

  for (const b of bounds) {
    const inGap = withLabel.filter((r) => r.id > b.loSortOrder && r.id < b.hiSortOrder);
    const problemsInGap = inGap.filter((r) => r.label === null && r.has_own_page);
    if (problemsInGap.length === 0) continue;
    gaps.push({
      start: b.start,
      end: b.end,
      problemRecords: problemsInGap.map((r) => ({ id: r.id, title: r.title, sortOrder: r.id })),
      contextRecords: inGap
        .filter((r) => r.label === null && !r.has_own_page)
        .map((r) => ({ title: r.title, sortOrder: r.id })),
    });
  }

  log.info('boşluklar bulundu', { issueId, gapCount: gaps.length, totalProblemRecords: problemCandidates.length });

  let inputChars = 0;
  let outputChars = 0;
  let attempted = 0;

  for (const gap of gaps) {
    const gapText = text.slice(gap.start, gap.end).trim();
    if (gapText.length < 20) continue; // nothing to segment

    const titleList = gap.problemRecords.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
    const prompt = `Aşağıda bir KKTC Resmî Gazete sayısının OCR ile çıkarılmış bir bölümü var. Bu bölüm, TAM OLARAK aşağıdaki sırayla listelenen ${gap.problemRecords.length} kaydın gövde metnini içeriyor (başka hiçbir kayıt yok, sıra kesin, atlama yapılamaz):

${titleList}

METİN:
"""
${gapText}
"""

Bu metni yukarıdaki ${gap.problemRecords.length} kayda, verilen sırayla, eksiksiz ve çakışmasız böl. Metnin HİÇBİR KISMINI atlama veya değiştirme -- sadece nereden nereye kadar hangi kayda ait olduğuna karar ver. Yanıtı SADECE şu JSON formatında ver, başka hiçbir açıklama ekleme:
[{"title": "...", "body": "..."}, ...]`;

    inputChars += prompt.length;
    attempted += gap.problemRecords.length;

    const response = await client.chat.complete({
      model: 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.choices?.[0]?.message?.content;
    const raw = typeof content === 'string' ? content : '';
    outputChars += raw.length;

    console.log(`\n=== SAYI ${issue.year}/${issue.number}, BOŞLUK (${gap.problemRecords.length} kayıt) ===`);
    console.log('İSTENEN:', gap.problemRecords.map((r) => r.title).join(' | '));
    console.log('YANIT (ham):');
    console.log(raw.slice(0, 2000));
  }

  return { inputChars, outputChars, attempted };
}

async function main() {
  const issueIds = process.argv.slice(2).map(Number);
  if (issueIds.length === 0) {
    console.error('kullanım: tsx scripts/extract-text/mistral-segment-pilot.ts <issueId> [issueId...]');
    process.exit(2);
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error('MISTRAL_API_KEY tanımlı değil');
  const client = new Mistral({ apiKey });

  let totalInput = 0;
  let totalOutput = 0;
  let totalAttempted = 0;

  for (const issueId of issueIds) {
    const { inputChars, outputChars, attempted } = await processIssue(client, issueId);
    totalInput += inputChars;
    totalOutput += outputChars;
    totalAttempted += attempted;
  }

  log.info('pilot tamam', {
    denenenKayit: totalAttempted,
    girdiKarakter: totalInput,
    ciktiKarakter: totalOutput,
    tahminiGirdiToken: Math.round(totalInput / 3.5),
    tahminiCiktiToken: Math.round(totalOutput / 3.5),
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
