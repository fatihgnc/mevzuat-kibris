import { normalizeForSearch, turkishLower } from '../../src/lib/text/turkish-lower';

/**
 * Vetting of the LLM summary — spec 3.8 enforced in code.
 *
 * The rule layer (`rules.ts`) is safe because WE wrote the sentences; when no
 * pattern matches it produces no summary at all. The LLM offers no such
 * guarantee: telling a model "do not state the outcome" is not the same as it
 * not stating one. So the prompt alone is not enough, and the output is
 * filtered here as well.
 *
 * A rejected summary is DISCARDED and the record falls to the third tier of
 * staged generation (no summary; the masked title is shown). A wrong summary is
 * worse than no summary: the user would read an outcome that does not exist for
 * a legal text, with no way to check it.
 */

export type RejectionReason =
  | 'bos'
  | 'cok-kisa'
  | 'cok-uzun'
  | 'sonuc-bildiriyor'
  | 'uydurma-sayi'
  | 'baslikla-ayni'
  | 'meta-metin'
  | 'cok-cumle';

export interface GuardResult {
  ok: boolean;
  summary: string;
  reason?: RejectionReason;
  /** The fragment that triggered the rejection — logging it makes calibration possible. */
  evidence?: string;
}

/** Length range of the rule layer's summaries; the LLM must stay in the same band. */
const MIN_LENGTH = 12;
const MAX_LENGTH = 180;

/**
 * Turkish-aware word boundary.
 *
 * JavaScript's `\b` is ASCII: its word characters are a-z, A-Z, 0-9 and _. In
 * the phrase "gecersiz sayildi" BOTH `\bgecersiz` and `sayildi\b` fail to
 * match, because "c-cedilla" and "dotless i" are not word characters as far as
 * `\b` is concerned — the transition it expects at a string end or next to a
 * space never happens. Half the forbidden patterns therefore caught nothing at
 * all, silently; in testing, both "Teklif gecersiz sayildi" and "ozet
 * cikarilamadi" sailed through the check.
 *
 * The input has already been through `turkishLower`, so lowercase letters are
 * enough here.
 */
const TR_WORD_CHARS = 'a-zçğıöşü0-9';

function trWord(pattern: string): RegExp {
  return new RegExp(`(?<![${TR_WORD_CHARS}])(?:${pattern})(?![${TR_WORD_CHARS}])`);
}

/**
 * Outcome-stating phrases — a violation of spec 3.8 rule 1.
 *
 * Every one of these is information that CANNOT be derived from the title:
 * whether the objection was rejected, whether the appointment was approved, is
 * written in the body. Seeing "OBJECTION" in a title, a model tends to finish
 * the sentence with "rejected the objection", because that is how the pattern
 * ends in its training data.
 *
 * If the matched phrase also appears IN THE TITLE we do not reject —
 * `titleAllows` pardons it. Seeing a word from the title in the summary is a
 * quotation, not an invention.
 */
const VERDICT_PATTERNS: RegExp[] = [
  trWord('redd?(etti|edildi|edilmiştir|ederek|ine karar|edilmesine|edilmesin[ei])'),
  trWord('kabul (etti|edildi|edilmiştir|edilmesine|ederek)'),
  trWord('onay(ladı|landı|lanmıştır|lanmasına)'),
  trWord('ipta?l (etti|edildi|edilmiştir|edilmesine)'),
  trWord('haklı (bulundu|bulunmuştur|görüldü)'),
  trWord('haksız (bulundu|bulunmuştur|görüldü)'),
  trWord('uygun (bulundu|bulunmuştur|görüldü|görülmüştür)'),
  trWord('mahk[uû]m (etti|edildi|edilmiştir)'),
  trWord('ceza (verildi|verilmiştir|kesildi)'),
  trWord('para cezasına (çarptırıldı|hükmedildi)'),
  trWord('geçersiz (sayıldı|kılındı|bulundu)'),
  trWord('yürürlükten kaldırıldı'),
  trWord('(lehine|aleyhine) (karar|hüküm|hükmedildi)'),
  trWord('suçlu bulundu'),
  trWord('beraat'),
];

/**
 * The model talking about itself instead of writing a summary. Rare, but when
 * it happens it is precisely what must not reach the user.
 */
const META_PATTERNS: RegExp[] = [
  trWord('özet (üretilemedi|yok|çıkarılamadı|çıkmıyor)'),
  trWord('bilgi (yetersiz|bulunmuyor|yok)'),
  trWord('yeterli bilgi'),
  trWord('belirtilmemiş'),
  trWord('anlaşılamadı'),
  /başlıktan çıkar/,
  /^(üzgünüm|maalesef|bir dil modeli)/,
];

/**
 * A sentence boundary — a period on its own is not one.
 *
 * The naive `/[.!?]\s+\S/` rejected correct single-sentence summaries wholesale,
 * because Turkish writes ordinals and abbreviations with a period:
 *
 *   "34. Devlet Fotoğraf Yarışması'nın düzenlenmesi"      ordinal
 *   "T.C. Sağlık Bakanlığı heyetinin masraflarının karşılanması"   abbreviation
 *   "Denizbank Ltd. hakkında şirketler yasası kapsamında belge"    abbreviation
 *
 * All three are a single sentence and all three were thrown away in a real run.
 *
 * "Follow two lowercase letters" was the first fix and it was still too loose —
 * a live run caught two more:
 *
 *   "Prof. Dr. Süleyman Gürpınar'ın masraflarının karşılanması"    "of" + ". D"
 *   "Aluden Ticaret Şti. Ltd.'e ait parselin ilan edilmesi"        "ti" + ". L"
 *
 * What actually separates a sentence end from an abbreviation is that a Turkish
 * abbreviation is a short CAPITALISED token (Prof., Şti., Ltd., Dr., Sn., No.),
 * while a word ending a sentence mid-text is lowercase throughout. So we require a
 * run of at least three lowercase letters that is not preceded by another letter —
 * "Prof" fails because its lowercase run "rof" sits behind a capital P, and "Şti"
 * fails on length.
 */
const SENTENCE_BREAK = /(?<![A-Za-zÇĞİÖŞÜçğıöşü])[a-zçğıöşü]{3,}[.!?]\s+[A-ZÇĞİÖŞÜ]/;

/** Digit runs inside the summary — a number absent from the title is invented. */
function digitRuns(value: string): string[] {
  return value.match(/\d+/g) ?? [];
}

/**
 * If a forbidden phrase in the summary also appears in the title, it is a
 * quotation rather than an invention. Example: with a title ending in
 * "...CEZASININ AFFEDILMESI", "af" may carry over into the summary.
 */
function titleAllows(titleNormalized: string, evidence: string): boolean {
  return titleNormalized.includes(normalizeForSearch(evidence));
}

export function validateSummary(title: string, candidate: string): GuardResult {
  const summary = candidate.replace(/\s+/g, ' ').trim().replace(/^["'“”«»]|["'“”«»]$/g, '').trim();

  if (!summary) return { ok: false, summary, reason: 'bos' };
  if (summary.length < MIN_LENGTH) return { ok: false, summary, reason: 'cok-kisa' };
  if (summary.length > MAX_LENGTH) return { ok: false, summary, reason: 'cok-uzun' };

  const lower = turkishLower(summary);
  const titleNormalized = normalizeForSearch(title);

  for (const pattern of META_PATTERNS) {
    const match = pattern.exec(lower);
    if (match) return { ok: false, summary, reason: 'meta-metin', evidence: match[0] };
  }

  for (const pattern of VERDICT_PATTERNS) {
    const match = pattern.exec(lower);
    if (match && !titleAllows(titleNormalized, match[0])) {
      return { ok: false, summary, reason: 'sonuc-bildiriyor', evidence: match[0] };
    }
  }

  /*
   * An invented number. The model can misremember a decision number, a year or an
   * article number; any number absent from the title is the sign of it. The meta
   * bar already shows the reference separately, so the summary has no need to
   * produce numbers at all — nothing is lost, and invention becomes impossible.
   */
  const titleDigits = new Set(digitRuns(title));
  for (const run of digitRuns(summary)) {
    if (!titleDigits.has(run)) {
      return { ok: false, summary, reason: 'uydurma-sayi', evidence: run };
    }
  }

  /*
   * One sentence. The rule layer's output is one sentence too; a two-sentence
   * summary does not fit a list row and gets cut in og:title. A trailing period is
   * trimmed anyway, so only a break in the MIDDLE counts — see SENTENCE_BREAK for
   * why a bare period is not one.
   */
  const withoutTrailing = summary.replace(/[.!?]+$/, '');
  if (SENTENCE_BREAK.test(withoutTrailing)) {
    return { ok: false, summary, reason: 'cok-cumle' };
  }

  /*
   * A VERBATIM copy of the title, compared case-sensitively.
   *
   * This used to compare `normalizeForSearch(summary) === titleNormalized`, and
   * that folds case — so it threw away exactly what we are paying the model for.
   * Gazette titles are ALL CAPS; turning "YABANCI UYRUKLU 16 KİŞİYE AİT TAŞINMAZ
   * MAL İZNİNİN TADİL EDİLMESİ" into "Yabancı uyruklu 16 kişiye ait taşınmaz mal
   * izninin tadil edilmesi" IS the improvement, and 26% of a real run was rejected
   * for it. Recasing cannot be moved to the rule layer either: it needs to know
   * that "Kıbrıs Türk Elektrik Kurumu" keeps its capitals while "yönetim kurulu"
   * does not, and in an all-caps source that is undecidable (see `isTurkishPhrase`
   * in shared/turkish-suffix.ts for the same problem).
   *
   * What stays worth rejecting is a true echo: the model handing back the raw
   * title unchanged, caps and all, having added nothing.
   */
  if (summary === title.replace(/\s+/g, ' ').trim()) {
    return { ok: false, summary, reason: 'baslikla-ayni' };
  }

  // No trailing period: the rule layer produces none either, so both sources match.
  const cleaned = withoutTrailing.trim();
  return { ok: true, summary: cleaned.charAt(0).toLocaleUpperCase('tr') + cleaned.slice(1) };
}
