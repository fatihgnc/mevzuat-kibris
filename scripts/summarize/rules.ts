import {
  ablativeFromPossessive,
  dative,
  genitive,
  locative,
  titleCase,
} from '../shared/turkish-suffix';
import { turkishLower } from '../../src/lib/text/turkish-lower';

/**
 * Summary sentence generation — spec 3.8.
 *
 * The hard rules, with their counterparts in code:
 *
 *  1. A summary states what can DEFINITELY be derived from the title. It does
 *     not report the outcome of a decision. None of the patterns below produce
 *     "rejected", "accepted" or "approved" — the Competition Board pattern
 *     deliberately ends with "hakkında karar" ("a decision concerning").
 *  2. A summary uses everyday language: "kamulaştırma kararı", not "zorla mal
 *     iktisabı". The official term is already in the raw title, and search
 *     catches both (synonym expansion, supabase/migrations/0007).
 *  3. The same document type always gets the same pattern.
 *  4. It is generated once and stored permanently in records.summary; the list,
 *     the detail page, email, RSS and og:title all use that same text.
 *
 * When no rule matches we return null. The caller then falls to the LLM, and if
 * that fails too there is no summary and the masked title is shown.
 */

export interface SummaryInput {
  title: string;
  section: string;
  refType: string | null;
}

interface Rule {
  name: string;
  pattern: RegExp;
  build: (match: RegExpMatchArray) => string | null;
}

/** Clean up extra whitespace and trailing punctuation. */
function clean(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[.,;:/\-]+$/, '').trim();
}

/**
 * Drops the leading reference number.
 *
 * In the gazette's table of contents a record line starts with its reference
 * ("A.E. 1064 1962 ZORLA MAL İKTİSABI YASASI-..."). That number STAYS in the raw
 * title — we have to stay faithful to the source, and the user sees it in the
 * masked title. But it has no place in the summary sentence: the meta bar
 * already shows it as a separate field.
 *
 * Skipping this produces summaries like "A.e. 1063 Su Kullanım Bedelleri
 * emirnamesinde değişiklik", and most of the patterns then never match at all.
 */
const LEADING_REF =
  /^(?:A\.E\.\s?\d+|Ü\(K-I{1,2}\)\s?[\d-]+|Ş\.M\.\s?\d+|M\.T\.\s?\d+|GENELGE\s+MİA\.[\d/]+|Y\.[TÖ]\.NO:\s?[\d/]+)\s*/i;

export function stripLeadingRef(title: string): string {
  return title.replace(LEADING_REF, '').trim();
}

const RULES: Rule[] = [
  {
    name: 'kamulastirma',
    // 1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ
    pattern: /^\d{4}\s+ZORLA MAL İKTİSABI YASASI\s*[-/]\s*(.+)$/i,
    build: (match) => {
      const place = clean(match[1]!);
      if (!place) return null;
      // "GAZİMAĞUSA/VADİLİ" -> district + village; the village name is more distinctive.
      const parts = place.split('/').map((part) => titleCase(clean(part)));
      const village = parts[parts.length - 1]!;
      const district = parts.length > 1 ? parts[0]! : null;
      const where = district ? district + ' ' + village : village;
      return locative(where) + ' kamulaştırma kararı';
    },
  },
  {
    name: 'sirket-isim-degisikligi',
    pattern:
      /İSİM DEĞİŞTİRME MÜRACAATI\s*\/\s*(.+?)\s+İ[Nn]\s+(.+?)\s+OLARAK İSMİNİN DEĞİŞMESİ/i,
    build: (match) => {
      const from = titleCase(clean(match[1]!));
      const to = titleCase(clean(match[2]!));
      if (!from || !to) return null;
      return genitive(from) + ' isminin ' + to + ' olarak değişmesi';
    },
  },
  {
    name: 'sirket-tasfiye',
    pattern: /TASFİYE İŞLEMLERİNE BAŞLANMASI\s*\/\s*(.+)$/i,
    build: (match) => {
      const company = titleCase(clean(match[1]!));
      return company ? genitive(company) + ' tasfiye işlemlerine başlanması' : null;
    },
  },
  {
    name: 'sirket-silme',
    pattern: /SİCİLDEN KAYIT SİLİNMESİ\s*\/\s*(.+)$/i,
    build: (match) => {
      const company = titleCase(clean(match[1]!));
      return company ? genitive(company) + ' sicilden kaydının silinmesi' : null;
    },
  },
  {
    name: 'sozlesmeli-personel',
    pattern: /^SÖZLEŞMELİ PERSONEL\s*\/\s*(.+)$/i,
    build: (match) => {
      const who = titleCase(clean(match[1]!));
      if (!who) return null;
      /*
       * The source gives either a person's name or an institution's. For an
       * institution the sentence has to read "istihdamı" rather than "istihdam
       * edildi"; instead of guessing whether it looks like a personal name, we
       * use a pattern that stays neutral in both cases. We do not speculate.
       */
      return genitive(who) + ' sözleşmeli personel olarak istihdamı';
    },
  },
  {
    name: 'odenek-aktarma',
    pattern: /^ÖDENEK AKTARMA\s*\/\s*(.+?)(?:\s+(\d{4})\s+MALİ YILI BÜTÇESİ)?$/i,
    build: (match) => {
      const institution = titleCase(clean(match[1]!));
      if (!institution) return null;
      const year = match[2];
      return year
        ? institution + ' ' + year + ' mali yılı bütçesinde ödenek aktarma'
        : institution + ' bütçesinde ödenek aktarma';
    },
  },
  {
    name: 'munhal-ilk-atama',
    pattern:
      /^KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI,\s*(.+?)\s+İLK ATAMA KADROSU MÜNHAL İLANI(?:\s+VE\s+SINAVI?\s+DUYURUSU)?/i,
    build: (match) => {
      const unit = titleCase(clean(match[1]!));
      if (!unit) return null;
      return unit + ' ilk atama kadrosu münhal ilanı ve sınav duyurusu';
    },
  },
  {
    name: 'munhal-kadro',
    pattern: /^(?:KAMU HİZMETİ KOMİSYONU BAŞKANLIĞI,\s*)?(.+?)\s+KADROSU MÜNHAL İLANI/i,
    build: (match) => {
      const unit = titleCase(clean(match[1]!));
      return unit ? unit + ' kadrosu münhal ilanı' : null;
    },
  },
  {
    name: 'munhal-genel',
    pattern: /^(.+?)\s+MÜNHAL İLANI(?:-(.+))?$/i,
    build: (match) => {
      const unit = titleCase(clean(match[1]!));
      return unit ? unit + ' münhal ilanı' : null;
    },
  },
  {
    name: 'rekabet-itiraz',
    // KARAR SAYISI:318/2025 KONU:X TARAFINDAN Y BİNASINA ... İHALESİNE YAPILAN İTİRAZ
    pattern: /KONU:\s*(.+?)\s+TARAFINDAN\s+(.+?)\s+İHALESİNE YAPILAN İTİRAZ/i,
    build: (match) => {
      const objector = titleCase(clean(match[1]!));
      const subject = titleCase(clean(match[2]!));
      if (!objector || !subject) return null;
      /*
       * NO outcome. We say "a decision concerning the objection"; whether it was
       * rejected or upheld is in the body, and guessing inside a legal text is
       * unacceptable (spec 3.8 rule 1).
       */
      return genitive(objector) + ' ' + subject + ' ihalesine yaptığı itiraz hakkında Rekabet Kurulu kararı';
    },
  },
  {
    name: 'rekabet-genel',
    pattern: /^REKABET KURULU KARARI.*?KONU:\s*(.+)$/i,
    build: (match) => {
      const subject = titleCase(clean(match[1]!));
      return subject ? subject + ' hakkında Rekabet Kurulu kararı' : null;
    },
  },
  {
    name: 'marka',
    pattern: /^MARKA TESCİL MÜRACAATI İLANI\s*\/\s*(.+)$/i,
    build: (match) => {
      const owner = titleCase(clean(match[1]!));
      return owner ? genitive(owner) + ' marka tescil müracaatı ilanı' : null;
    },
  },
  {
    name: 'genelge',
    pattern: /^(.+?GENELGESİ)\s*[-/]\s*(.+)$/i,
    build: (match) => {
      const issuer = titleCase(clean(match[1]!));
      const subject = titleCase(clean(match[2]!));
      if (!issuer || !subject) return null;
      return subject + ' hakkında ' + issuer.replace(/\s+Genelgesi$/i, '') + ' genelgesi';
    },
  },
  {
    name: 'degisiklik-yerli',
    // SU KULLANIM BEDELLERİ (DEĞİŞİKLİK) EMİRNAMESİ-LEFKOŞA/ALAYKÖY
    pattern: /^(.+?)\s*\(DEĞİŞİKLİK\)\s*(EMİRNAMESİ|TÜZÜĞÜ|TEBLİĞİ)\s*[-/]\s*(.+)$/i,
    build: (match) => {
      const subject = titleCase(clean(match[1]!));
      const kind = clean(match[2]!).toLocaleLowerCase('tr');
      const place = titleCase(clean(match[3]!).split('/').pop() ?? '');
      if (!subject) return null;
      const prefix = place ? locative(place) + ' ' : '';
      return prefix + subject + ' ' + kind.replace(/si$/, 'sinde') + ' değişiklik';
    },
  },
  {
    name: 'fon-degisiklik',
    // 2025 FİYAT İSTİKRAR FONU,(AKARYAKIT,TARIMSAL ÜRÜN VE TÜKETİM MADDELERİ)
    //   (FONA YATIRILACAK MİKTARLAR)(DEĞİŞİKLİK)EMİRNAMESİ
    // Must be tried BEFORE the general (DEĞİŞİKLİK) rule, otherwise that rule
    // collapses the whole title into one name and makes the summary unreadable.
    pattern:
      /^\d{4}\s+(FİYAT İSTİKRAR FONU)\s*,?\s*\(([^)]+)\)\s*\(([^)]*YATIRILACAK[^)]*)\)\s*\(DEĞİŞİKLİK\)/i,
    build: (match) => {
      const fund = titleCase(clean(match[1]!));
      const scope = turkishLower(clean(match[2]!)).replace(/\s*,\s*/g, ', ');
      if (!fund || !scope) return null;
      return (
        dative(fund) +
        ' ' +
        ablativeFromPossessive(scope) +
        ' yatırılacak miktarlarda değişiklik'
      );
    },
  },
  {
    name: 'degisiklik',
    // KIBRIS TÜRK ELEKTRİK KURUMU (ELEKTRİK TARİFELERİ)(DEĞİŞİKLİK) TÜZÜĞÜ
    pattern: /^(.+?)\s*\(([^)]+)\)\s*\(DEĞİŞİKLİK\)\s*(TÜZÜĞÜ|EMİRNAMESİ|TEBLİĞİ|YASASI)/i,
    build: (match) => {
      const owner = titleCase(clean(match[1]!));
      const subject = titleCase(clean(match[2]!));
      const kind = clean(match[3]!).toLocaleLowerCase('tr');
      if (!owner || !subject) return null;
      return owner + ' ' + subject + ' ' + kindLocative(kind) + ' değişiklik';
    },
  },
  {
    name: 'yasa-degisiklik',
    pattern: /^(\d{4}\s+.+?YASASI)\s*\(DEĞİŞİKLİK\)\s*YASASI/i,
    build: (match) => {
      const law = titleCase(clean(match[1]!));
      return law ? genitive(law) + 'nda değişiklik' : null;
    },
  },
];

/** "tüzüğü" -> "tüzüğünde", "emirnamesi" -> "emirnamesinde" */
function kindLocative(kind: string): string {
  if (kind.endsWith('ğü')) return kind + 'nde';
  if (kind.endsWith('si')) return kind + 'nde';
  return kind + 'nde';
}

export interface SummaryResult {
  summary: string;
  source: 'rule';
  ruleName: string;
}

/**
 * Rule-based summary. Returns null when no pattern matches, and the caller falls
 * to the LLM (spec 3.8 staged generation). If the LLM fails too there is no
 * summary and the masked title is shown.
 */
export function summarize(input: SummaryInput): SummaryResult | null {
  const title = stripLeadingRef(input.title.replace(/\s+/g, ' ').trim());
  if (!title) return null;

  for (const rule of RULES) {
    const match = title.match(rule.pattern);
    if (!match) continue;

    try {
      const summary = rule.build(match);
      // The pattern matched but produced no meaningful sentence; move to the next.
      if (summary && summary.length > 8) {
        return { summary: summary.charAt(0).toLocaleUpperCase('tr') + summary.slice(1), source: 'rule', ruleName: rule.name };
      }
    } catch {
      // One rule blowing up must not stop the whole ingest.
    }
  }

  return null;
}
