import { docTypeLabel } from '../../src/lib/constants/doc-types';
import { log } from '../shared/logger';

import { validateSummary, type RejectionReason } from './guard';
import { stripLeadingRef } from './rules';

/**
 * The MIDDLE tier of staged summary generation — spec 3.8.
 *
 *   1. Rule based    -> `rules.ts`, records with a recognisable pattern
 *   2. No pattern    -> THIS FILE, a single one-off LLM call
 *   3. Still nothing -> no summary; the masked title is shown
 *
 * A summary is generated ONCE and stored permanently in `records.summary`
 * (spec 3.8 rule 4). The list, the detail page, email, RSS and og:title all
 * read the same text; there is no per-page regeneration. That is why this is
 * not a "service" but a backfill step, invoked by `scripts/summarize/index.ts`.
 *
 * THE BODY TEXT IS NOT PASSED IN, deliberately. A summary may only state what
 * can be derived from the title (rule 1); if we hand the model the body, asking
 * it not to summarise the outcome means asking it to ignore information we put
 * in front of it. If we withhold it, the model CANNOT write the outcome.
 */

export interface LlmSummaryInput {
  title: string;
  section: string;
  refType: string | null;
  docType: string;
}

export interface LlmSummaryResult {
  summary: string;
  source: 'llm';
}

/**
 * Why a call produced no summary. Returned rather than only logged, so a run can
 * report the breakdown: a rejection reason that dominates is almost always a bug in
 * the vetting rather than a misbehaving model. Two were found exactly that way —
 * `baslikla-ayni` and `cok-cumle` were between them throwing away a quarter of a
 * real run.
 */
export type DeclineReason = RejectionReason | 'model-declined' | 'bos-cevap';

/** How the model says "no safe summary comes out of this title" — drops to tier 3. */
const DECLINE = 'YOK';

/**
 * The prompt carries spec 3.8's five rules directly. The examples are taken
 * from the rule layer's REAL output (rule 3: the same document type always gets
 * the same pattern) — the two layers must speak with one voice, and the user
 * should not be able to tell which one produced a given summary.
 */
const SYSTEM_PROMPT = `Sen KKTC Resmî Gazete kayıtları için tek cümlelik Türkçe özet yazıyorsun.

KESİN KURALLAR:
1. Yalnızca başlıkta YAZAN şeyi söyle. Başlıkta olmayan hiçbir bilgiyi ekleme.
2. Kararın, itirazın veya başvurunun SONUCUNU asla yazma. "reddetti", "kabul edildi",
   "onaylandı", "iptal edildi", "haklı bulundu" gibi ifadeler yasak. Sonuç bilgisi
   sana verilmiyor; tahmin etmek kabul edilemez.
3. Günlük dil kullan. Resmî terimin günlük karşılığı varsa onu seç
   ("zorla mal iktisabı" yerine "kamulaştırma").
4. Tek cümle, nokta koyma, 12-160 karakter. Başlığı olduğu gibi kopyalama.
5. Başlıkta geçmeyen hiçbir sayı yazma. Karar numarası, yıl, madde numarası ekleme.
6. Aynı belge türü hep aynı kalıbı alsın.
7. Güvenli bir özet çıkmıyorsa yalnızca ${DECLINE} yaz.

ÖRNEKLER:
Başlık: 1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ
Özet: Gazimağusa Vadili'de kamulaştırma kararı

Başlık: REKABET KURULU KARARI-KARAR SAYISI:319/2025 KONU:ÇELEBİOĞLU ÖZEL GÜVENLİK LTD. TARAFINDAN SOSYAL SİGORTALAR DAİRESİ MERKEZ MÜDÜRLÜK BİNASINA GÜVENLİK HİZMETİ ALIMI İHALESİNE YAPILAN İTİRAZ
Özet: Çelebioğlu Özel Güvenlik'in güvenlik hizmeti alımı ihalesine yaptığı itiraz hakkında Rekabet Kurulu kararı

Başlık: ATAMA KARARNAMESİ:MERKEZİ CEZAEVİ MÜDÜR MEVKİİNE SN. AHMET TOSUN'UN 01.08.2026 TARİHİNDEN İTİBAREN ATANMASI
Özet: Ahmet Tosun'un Merkezi Cezaevi müdürlüğüne atanması

Başlık: KKTC SAĞLIK BAKANLIĞI İLE ROMATEM SAĞLIK HİZMETLERİ LTD. TEŞHİS VE TEDAVİ HİZMETLERİ EK PROTOKOLÜ'NÜN İMZALANMASI
Özet: Sağlık Bakanlığı ile Romatem arasında teşhis ve tedavi hizmetleri ek protokolünün imzalanması

Başlık: YOLLAR VE BİNALAR DÜZENLEME YASASI-BİNALARIN YANGINDAN KORUNMASINA İLİŞKİN USUL VE ESASLAR TÜZÜĞÜ
Özet: Binaların yangından korunmasına ilişkin usul ve esaslar tüzüğü

Başlık: A-TİCARET MARKALARI TİCARET MARKALARI YASASI, FASIL 268 RESMİ İLANLAR
Özet: Ticaret markaları yasası kapsamında marka resmî ilanları

Yalnızca özeti yaz. Açıklama, tırnak, ön ek yok.`;

export function buildUserPrompt(input: LlmSummaryInput): string {
  const lines = [
    'Başlık: ' + stripLeadingRef(input.title.replace(/\s+/g, ' ').trim()),
    'Belge türü: ' + docTypeLabel(input.docType),
  ];
  // The section says which appendix of the gazette carried it; it backs up the doc type.
  if (input.section) lines.push('Gazete bölümü: ' + input.section);
  return lines.join('\n');
}

/** Provider-agnostic interface — tests run against a fake client and never hit the network. */
export type ChatClient = (system: string, user: string) => Promise<string>;

/**
 * Output budget. A summary is capped at 160 characters (~75 Turkish tokens), so 90
 * leaves headroom without reserving more of the TPM window than the answer can use.
 * It was 120, and every one of those unused tokens was still charged against the
 * rate limit.
 */
const MAX_OUTPUT_TOKENS = 90;

const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
}

/**
 * OpenAI Chat Completions client.
 *
 * Plain `fetch` rather than the SDK: no code in this repo called an LLM before,
 * and adding a dependency for a single endpoint puts maintenance weight on
 * `package.json`. Node 20+ ships `fetch` built in.
 *
 * The model is overridable via `OPENAI_MODEL` — this is a one-off backfill and
 * which model runs directly determines the cost, so it must not be hardcoded.
 */
/**
 * Token-per-minute pacing.
 *
 * OpenAI's TPM ceiling counts the prompt AND the reserved `max_tokens`, not just
 * what comes back. Measured on this workload: the system prompt alone is ~850
 * tokens and it is resent on EVERY call, so one summary costs roughly 1,000 tokens
 * against the limit. At the default 200,000 TPM that is a hard ceiling of ~200
 * requests a minute; four unpaced workers were issuing ~480 and the run spent
 * itself retrying 429s.
 *
 * So we budget rather than react. Every request reserves its estimated cost in a
 * sliding 60-second window and waits when the window is full. Retrying after the
 * fact is still there as a backstop, but it should now be rare.
 *
 * `OPENAI_TPM` overrides the limit — tiers differ, and a wrong guess here is the
 * difference between a run that finishes and one that thrashes.
 */
const TPM_LIMIT = Number(process.env.OPENAI_TPM) || 200_000;

/** Stay under the ceiling: the estimate is approximate and other jobs may share the key. */
const TPM_SAFETY = 0.85;

/**
 * Characters per token for Turkish, read from `usage.prompt_tokens` on REAL calls.
 *
 * THE PREVIOUS VALUE HERE WAS WRONG, AND IT WAS WRONG IN THE DANGEROUS DIRECTION.
 * It was 3.5, justified by "~4.2 measured" — but that 4.2 was not measured, it was
 * inferred from a 429 message ("Requested 590") by solving for the ratio. The
 * response body reports the real number, and 12 calls across the actual 2006-2024
 * prompts say:
 *
 *   prompt 2,057-2,158 chars  ->  807-863 tokens   =  2.53 chars/token
 *   output                    ->  21 tokens average
 *
 * The ratio is dominated by this file's own SYSTEM_PROMPT (1,945 chars ~ 800
 * tokens), which is resent on every call, so it barely moves with the title.
 *
 * Why the direction matters: under-estimating shrinks every reservation, so the
 * pacer lets more calls through than the limit allows. At 3.5 it planned 247 calls
 * a minute costing 914 tokens each — 226,000 TPM against a 200,000 ceiling, i.e.
 * the exact 429 storm the budget exists to prevent. At 2.4 it plans 177 a minute,
 * 162,000 TPM, which fits.
 *
 * 2.4 keeps a small margin below the measured 2.53. Over-estimating only costs
 * throughput; under-estimating costs the run.
 *
 * NOT eligible for prompt caching, checked rather than assumed: `cached_tokens`
 * came back 0 on every call, including repeats of the identical system prompt.
 * The prompt is ~824 tokens and OpenAI's automatic caching starts at 1,024.
 */
const CHARS_PER_TOKEN = 2.4;

const spend: Array<{ at: number; tokens: number }> = [];

function estimateTokens(system: string, user: string, maxTokens: number): number {
  return Math.ceil((system.length + user.length) / CHARS_PER_TOKEN) + maxTokens;
}

async function reserve(tokens: number): Promise<void> {
  const budget = TPM_LIMIT * TPM_SAFETY;

  for (;;) {
    const cutoff = Date.now() - 60_000;
    while (spend.length && spend[0]!.at < cutoff) spend.shift();

    const used = spend.reduce((sum, entry) => sum + entry.tokens, 0);
    if (used + tokens <= budget || spend.length === 0) {
      spend.push({ at: Date.now(), tokens });
      return;
    }

    // Wait until the oldest reservation leaves the window, then re-check.
    const wait = Math.max(50, spend[0]!.at + 60_000 - Date.now());
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

/** `Retry-After` is the server telling us exactly how long to wait; prefer it to guessing. */
function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after');
  if (!header) return null;
  const seconds = Number(header);
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : null;
}

export function createOpenAiClient(): ChatClient {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY tanımlı değil. .env.example dosyasına bakın.');
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const baseUrl = (process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  return async (system, user) => {
    let lastError: unknown;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await reserve(estimateTokens(system, user, MAX_OUTPUT_TOKENS));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000);

      try {
        const response = await fetch(baseUrl + '/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + apiKey,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            // We want pattern consistency (rules 3 and 6), not creativity.
            temperature: 0,
            max_tokens: MAX_OUTPUT_TOKENS,
          }),
          signal: controller.signal,
        });

        if (response.status === 429 || response.status >= 500) {
          const after = retryAfterMs(response);
          if (after !== null) await new Promise((resolve) => setTimeout(resolve, after));
          throw new Error('HTTP ' + response.status + ' ' + (await response.text()).slice(0, 200));
        }

        const payload = (await response.json()) as ChatCompletionResponse;

        if (!response.ok) {
          /*
           * A 4xx is not worth retrying: an invalid key, an unknown model or a
           * malformed request. Retrying only produces the same error four times
           * and disguises the real cause as a transient network problem.
           */
          throw new Error('OpenAI isteği reddetti: ' + (payload.error?.message ?? response.status));
        }

        return payload.choices?.[0]?.message?.content?.trim() ?? '';
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('OpenAI isteği reddetti')) throw error;
        lastError = error;
        const backoff = Math.min(20_000, 1000 * 2 ** attempt);
        log.warn('LLM isteği başarısız, yeniden denenecek', { attempt, backoff, message: String(error) });
        await new Promise((resolve) => setTimeout(resolve, backoff));
      } finally {
        clearTimeout(timer);
      }
    }

    throw new Error('LLM isteği 4 denemede başarısız: ' + String(lastError));
  };
}

/**
 * The LLM summary for one record. Returns `null` if it fails vetting, and the
 * record falls to the third tier — a wrong summary is worse than none.
 *
 * THE CALLER MUST TRY `summarize()` FIRST. This function also produces an
 * answer for records the rule layer already handles; breaking the order wastes
 * both money and spec 3.8's staging guarantee.
 */
export async function llmSummarize(
  input: LlmSummaryInput,
  client: ChatClient,
): Promise<LlmSummaryResult | { declined: DeclineReason }> {
  const raw = await client(SYSTEM_PROMPT, buildUserPrompt(input));
  const candidate = raw.replace(/^Özet:\s*/i, '').trim();

  if (!candidate) return { declined: 'bos-cevap' };
  if (candidate.toLocaleUpperCase('tr') === DECLINE) return { declined: 'model-declined' };

  const verdict = validateSummary(input.title, candidate);

  if (!verdict.ok) {
    log.warn('LLM özeti denetimden geçemedi', {
      reason: verdict.reason,
      evidence: verdict.evidence,
      title: input.title.slice(0, 120),
      candidate: candidate.slice(0, 160),
    });
    return { declined: verdict.reason! };
  }

  return { summary: verdict.summary, source: 'llm' };
}

export { SYSTEM_PROMPT };
