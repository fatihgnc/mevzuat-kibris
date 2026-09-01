import type { Token, TokenLevel } from '@/types/record';

/**
 * The masked gazette title (spec 3.8 + artboards 1a/1b/1e/1g).
 *
 * Raw gazette titles are unreadably bad, but they cannot be discarded: the
 * official term is in there and the user has to be able to copy it (spec 3.8
 * rule 5). The design's answer is to weight the title rather than throw it away
 * — boilerplate parts are faint, distinctive parts are bold. The eye skips the
 * "TESCİLLİ BİR YEREL LİMİTED ŞİRKETİN İSİM DEĞİŞTİRME MÜRACAATI" boilerplate and
 * goes straight to the company name.
 *
 * Levels:
 *   0  boilerplate            faint, light
 *   1  distinctive            dark, bold
 *   2  supporting (year, org) medium
 *   3  search match           yellow background (added by highlight.ts)
 */

interface MaskRule {
  /** A pattern with capture groups; text between groups takes the `fill` level. */
  pattern: RegExp;
  /** Levels, in the same order as the groups. */
  levels: TokenLevel[];
  fill?: TokenLevel;
}

/**
 * The rules derive from the anchors in spec 3.3 and the pattern table in 3.8.
 * Order matters: the first matching rule wins, specific before general.
 */
const RULES: MaskRule[] = [
  // 1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ
  {
    pattern: /^(\d{4}\s+ZORLA MAL İKTİSABI YASASI)\s*[-/]\s*(.+)$/i,
    levels: [0, 1],
  },
  // TESCİLLİ ... İSİM DEĞİŞTİRME MÜRACAATI/X İN Y OLARAK İSMİNİN DEĞİŞMESİ
  {
    pattern:
      /^(.*?İSİM DEĞİŞTİRME MÜRACAATI\s*\/\s*)(.+?)(\s+İ[NnȘ]\s+)(.+?)(\s+OLARAK İSMİNİN DEĞİŞMESİ.*)$/i,
    levels: [0, 1, 0, 1, 0],
  },
  // TESCİLLİ ... TASFİYE İŞLEMLERİNE BAŞLANMASI/HASPOLAT GIDA SANAYİ LTD
  {
    pattern: /^(.*?(?:TASFİYE İŞLEMLERİNE BAŞLANMASI|SİCİLDEN KAYIT SİLİNMESİ)\s*\/\s*)(.+)$/i,
    levels: [0, 1],
  },
  // SÖZLEŞMELİ PERSONEL / ALİ ÖZCANLI
  {
    pattern: /^(SÖZLEŞMELİ PERSONEL\s*\/\s*)(.+)$/i,
    levels: [0, 1],
  },
  // ÖDENEK AKTARMA/BAŞBAKANLIK 2025 MALİ YILI BÜTÇESİ
  {
    pattern: /^(ÖDENEK AKTARMA\s*\/\s*)(.+?)(\s+\d{4} MALİ YILI BÜTÇESİ)?$/i,
    levels: [0, 1, 2],
  },
  // KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI, X KADROSU MÜNHAL İLANI...
  {
    pattern:
      /^(KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI,\s*)(.+?)(\s*(?:İLK ATAMA )?KADROSU MÜNHAL İLANI.*|\s*İLK ATAMA KADROSU MÜNHAL İLANI.*)$/i,
    levels: [0, 1, 0],
  },
  // REKABET KURULU KARARI-KARAR SAYISI:318/2025 KONU:X TARAFINDAN Y İHALESİNE...
  {
    pattern:
      /^(REKABET KURULU KARARI\s*-\s*KARAR SAYISI:\s*)(\S+)(\s*KONU:\s*)(.+?)(\s+TARAFINDAN\s+)(.+?)(\s+(?:BİNASINA|BİNASI).*)$/i,
    levels: [0, 1, 0, 1, 0, 1, 0],
  },
  {
    pattern: /^(REKABET KURULU KARARI\s*-\s*KARAR SAYISI:\s*)(\S+)(\s*KONU:\s*)(.+)$/i,
    levels: [0, 1, 0, 1],
  },
  // MARKA TESCİL MÜRACAATI İLANI/ALTINKUM BAFRA TURİZM LTD
  {
    pattern: /^(MARKA TESCİL MÜRACAATI İLANI\s*\/\s*)(.+)$/i,
    levels: [0, 1],
  },
  // MALİYE BAKANLIĞI GENELGESİ-YIL SONU HARCAMA İŞLEMLERİNİN KAPATILMASI
  {
    pattern: /^(.+?GENELGESİ)\s*-\s*(.+)$/i,
    levels: [2, 1],
  },
  // SU KULLANIM BEDELLERİ (DEĞİŞİKLİK) EMİRNAMESİ-LEFKOŞA/ALAYKÖY
  {
    pattern:
      /^(.+?)(\s*\(DEĞİŞİKLİK\)\s*(?:EMİRNAMESİ|TÜZÜĞÜ|TEBLİĞİ))\s*-\s*(.+)$/i,
    levels: [1, 0, 1],
  },
  // KIBRIS TÜRK ELEKTRİK KURUMU (ELEKTRİK TARİFELERİ)(DEĞİŞİKLİK) TÜZÜĞÜ
  {
    pattern:
      /^(.+?)(\s*\([^)]+\)\s*\(DEĞİŞİKLİK\)\s*(?:TÜZÜĞÜ|EMİRNAMESİ|TEBLİĞİ|YASASI).*)$/i,
    levels: [2, 1],
  },
  // 1992 KATMA DEĞER VERGİSİ YASASI (DEĞİŞİKLİK) YASASI
  {
    pattern: /^(\d{4}\s+.+?YASASI)(\s*\(DEĞİŞİKLİK\)\s*YASASI.*)$/i,
    levels: [2, 1],
  },
  // 2025 FİYAT İSTİKRAR FONU,(AKARYAKIT...)(FONA YATIRILACAK...)(DEĞİŞİKLİK)EMİRNAMESİ
  {
    pattern:
      /^(\d{4}\s+)([^,(]+)(,?\s*\(\s*)([^)]+)(\)\s*\([^)]*\)\s*\(\s*)(DEĞİŞİKLİK)(\s*\).*)$/i,
    levels: [2, 1, 0, 1, 0, 1, 0],
  },
  // MİLLİ EĞİTİM BAKANLIĞI, X MÜNHAL İLANI-2025/2026 ÖĞRETİM YILI
  {
    pattern: /^(.+?BAKANLIĞI,\s*)(.+?)(\s*MÜNHAL İLANI.*)$/i,
    levels: [0, 1, 0],
  },
];

/**
 * The leading gazette reference ("A.E. 1070 ", "Ü(K-I) 2497-2025 ").
 *
 * The rules are anchored with ^, so with a reference prefix none of them matched
 * and every title fell through to the general fallback — the result being that
 * nearly every token was marked "distinctive" and the mask did nothing at all.
 *
 * The reference STAYS in the text (the user must be able to copy the raw title)
 * but at boilerplate level: the meta bar already shows it as a separate field.
 */
const LEADING_REF =
  /^(?:A\.E\.\s?\d+|Ü\(K-I{1,2}\)\s?[\d-]+|Ş\.M\.\s?\d+|M\.T\.\s?\d+|GENELGE\s+MİA\.[\d/]+|Y\.[TÖ]\.NO:\s?[\d/]+)\s*/i;

/** Boilerplate lexicon — stock phrases to leave faint in fallback parsing. */
const BOILERPLATE = [
  'REKABET KURULU KARARI',
  'KARAR SAYISI',
  'KARAR NO',
  'ESKİ ESERLER YÜKSEK KURULU',
  'MARKA TESCİL MÜRACAATI İLANI',
  'İSİM DEĞİŞTİRME MÜRACAATI',
  'TASFİYE İŞLEMLERİNE BAŞLANMASI',
  'SİCİLDEN KAYIT SİLİNMESİ',
  'TESCİLLİ BİR YEREL LİMİTED ŞİRKETİN',
  'DENİZAŞIRI YABANCI ŞİRKET TESCİLİ',
  'KADROSU MÜNHAL İLANI VE SINAVI DUYURUSU',
  'İLK ATAMA KADROSU MÜNHAL İLANI',
  'KADROSU MÜNHAL İLANI',
  'MÜNHAL İLANI VE SINAV DUYURUSU',
  'MÜNHAL İLANI',
  'SINAV SONUÇLARI',
  'KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI',
  'MARKA TESCİL MÜRACAATI İLANI',
  'ŞİRKETLER MUKAYYİTLİĞİ',
  'ZORLA MAL İKTİSABI YASASI',
  'İHALESİNE YAPILAN İTİRAZ',
  'SÖZLEŞMELİ PERSONEL',
  'ÖDENEK AKTARMA',
  'KONU:',
  'DÜZELTME:',
];

const SEPARATORS = /([/\-–—,:()]+)/;

/**
 * When no rule matches: split on separators, leave lexicon entries faint, treat
 * years as supporting information and everything else as distinctive.
 *
 * Deliberately generous: marking a fragment bold by mistake does less harm than
 * dimming distinctive information and letting the user miss it.
 */
function fallbackMask(title: string): Token[] {
  const parts = title.split(SEPARATORS).filter((part) => part.length > 0);
  const tokens: Token[] = [];

  for (const part of parts) {
    if (/^[/\-–—,:()\s]+$/.test(part)) {
      tokens.push({ t: part, lvl: 0 });
      continue;
    }

    const upper = part.toLocaleUpperCase('tr');
    const isBoilerplate = BOILERPLATE.some((phrase) => upper.includes(phrase));
    const isYearish = /^\s*\d{4}\s*$/.test(part) || /MALİ YILI|ÖĞRETİM YILI/i.test(part);

    tokens.push({ t: part, lvl: isBoilerplate ? 0 : isYearish ? 2 : 1 });
  }

  /*
   * If the WHOLE title is boilerplate, masking loses its meaning: there is no
   * background to push things into, because everything is background. Titles like
   * "SÖZLEŞMELİ PERSONEL" dropped the entire line to the faint tone and became
   * unreadable.
   *
   * In that case we promote the boilerplate tokens — for that title, they are the
   * information. Masking exists to distinguish; with nothing to distinguish, it
   * should dim nothing.
   */
  if (!tokens.some((token) => token.lvl === 1)) {
    for (const token of tokens) {
      if (token.lvl === 0 && !/^[/\-–—,:()\s]+$/.test(token.t)) token.lvl = 1;
    }
  }

  return mergeAdjacent(tokens);
}

/** Merges neighbouring tokens at the same level — no point emitting extra spans. */
function mergeAdjacent(tokens: Token[]): Token[] {
  const out: Token[] = [];
  for (const token of tokens) {
    if (!token.t) continue;
    const last = out[out.length - 1];
    if (last && last.lvl === token.lvl) {
      last.t += token.t;
    } else {
      out.push({ ...token });
    }
  }
  return out;
}

/**
 * Splits a raw title into tokens. The result is deterministic: the same title
 * gets the same mask everywhere (list, detail page, email).
 */
export function maskTitle(title: string): Token[] {
  const full = title.replace(/\s+/g, ' ').trim();
  if (!full) return [];

  // The reference prefix is split off; the rules apply to the remaining body.
  const refMatch = LEADING_REF.exec(full);
  const prefix: Token[] = refMatch ? [{ t: refMatch[0], lvl: 0 }] : [];
  const text = refMatch ? full.slice(refMatch[0].length) : full;

  if (!text) return prefix;

  for (const rule of RULES) {
    const match = rule.pattern.exec(text);
    if (!match) continue;

    const tokens: Token[] = [];
    let cursor = 0;
    const fill = rule.fill ?? 0;

    for (let i = 1; i < match.length; i += 1) {
      const value = match[i];
      if (value === undefined) continue;

      const start = text.indexOf(value, cursor);
      if (start === -1) continue;

      if (start > cursor) tokens.push({ t: text.slice(cursor, start), lvl: fill });
      tokens.push({ t: value, lvl: rule.levels[i - 1] ?? fill });
      cursor = start + value.length;
    }

    if (cursor < text.length) tokens.push({ t: text.slice(cursor), lvl: fill });

    const merged = mergeAdjacent(tokens);
    // If a rule collapsed everything to one level, the mask is doing no work.
    if (merged.some((token) => token.lvl === 1)) return mergeAdjacent([...prefix, ...merged]);
  }

  return mergeAdjacent([...prefix, ...fallbackMask(text)]);
}

/** Turns the mask back into plain text — for the copy button and email. */
export function tokensToText(tokens: Token[]): string {
  return tokens.map((token) => token.t).join('');
}
