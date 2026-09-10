/**
 * Yabancı çalışma izni ceza riski — 63/2006 Yabancıların Çalışma İzinleri Yasası
 * madde 24 ve 25.
 *
 * Madde 24, 42/2016 ve 25/2025 sayılı Değişiklik Yasalarıyla yeniden yazıldı;
 * buradaki oranlar Merkezi Mevzuat Dairesi'nin yayımladığı birleştirilmiş güncel
 * metinden alındı. Üç nokta, dolaşımdaki eski özetlerden farklı:
 *
 *  1. Tekrar sayacı YILLIK. Madde 24(2)(Ç), artırımı "aynı yıl içerisinde aynı
 *     suçun" ikinci ve üçüncü tekrarına bağlıyor — işverenin bütün geçmişine
 *     değil.
 *  2. Üçüncü tespitte ceza "üç katı artırılarak" uygulanıyor. Metnin lafzı
 *     ceza + 3 × ceza = dört kat; yaygın özetlerde bu üç kat diye geçiyor.
 *     Aşağıda lafza uyuldu ve ekranda hangi ifadeden geldiği yazılıyor.
 *  3. Madde 25(2)'deki mahkeme cezası on kat değil ON İKİ kat, hapis sınırı da
 *     altı ay değil İKİ yıl.
 */

import { MINIMUM_WAGE } from './constants';

/** Madde 24(2)(A), (B), (C): bildirim, denetim ve tüzük ihlalleri. */
export const HALF_WAGE_MULTIPLIER = 0.5;

/** Madde 25(1): 17, 20 ve tüzük ihlallerinde mahkemenin verebileceği azami ceza. */
export const COURT_MAX_MULTIPLIER_MINOR = 10;
/** Madde 25(2): izinsiz çalıştırmada kişi başı azami para cezası. */
export const COURT_MAX_MULTIPLIER_UNLICENSED = 12;
/** Madde 25(2): azami hapis cezası (yıl). */
export const COURT_MAX_PRISON_YEARS = 2;

export type PenaltyKind =
  /** Madde 7(1)(2) ihlali: çalışma izinsiz / iş kurma izinsiz çalıştırma. */
  | 'unlicensed-employment'
  /** Madde 17(1): iş ilişkisinin sona erdiğini 15 gün içinde bildirmemek. */
  | 'termination-not-reported'
  /** Madde 20(1): denetim yükümlülüğüne aykırılık. */
  | 'inspection'
  /** Madde 23 altında çıkarılan tüzüğe aykırılık. */
  | 'regulation';

export interface PenaltyKindInfo {
  kind: PenaltyKind;
  label: string;
  clause: string;
  /** Ceza uygulanmadan önce 15 günlük düzeltme uyarısı yapılıyor mu (madde 24(1)). */
  warningFirst: boolean;
}

const UNLICENSED: PenaltyKindInfo = {
  kind: 'unlicensed-employment',
  label: 'İzinsiz yabancı çalıştırma (madde 7)',
  clause: '24(2)(Ç)',
  warningFirst: false,
};

export const PENALTY_KINDS: readonly PenaltyKindInfo[] = [
  UNLICENSED,
  {
    kind: 'termination-not-reported',
    label: 'İşten ayrılışı 15 gün içinde bildirmemek (madde 17)',
    clause: '24(2)(C)',
    warningFirst: false,
  },
  {
    kind: 'inspection',
    label: 'Denetim yükümlülüğüne aykırılık (madde 20)',
    clause: '24(2)(A)',
    warningFirst: true,
  },
  {
    kind: 'regulation',
    label: 'Çalışma İzinleri Tüzüğü’ne aykırılık (madde 23)',
    clause: '24(2)(B)',
    warningFirst: true,
  },
];

export interface PenaltyInput {
  kind: PenaltyKind;
  /** Yürürlükteki aylık brüt asgari ücret. */
  minimumWage?: number;
  /** İzinsiz çalıştırıldığı tespit edilen kişi sayısı (veya aykırı husus sayısı). */
  count: number;
  /** Aynı yıl içindeki kaçıncı tespit — yalnızca izinsiz çalıştırmada anlamlı. */
  occurrenceInYear: 1 | 2 | 3;
  /**
   * Madde 24(2)(D): işçi daha önce aynı işveren tarafından madde 17 uyarınca
   * "işten durdurulmuş" olarak bildirilmiş miydi.
   */
  previouslyReportedStopped?: boolean;
}

export interface PenaltyResult {
  minimumWage: number;
  /** Bir kişi/husus için uygulanan kat sayısı. */
  multiplierPerUnit: number;
  /** Kat sayısının nereden geldiğini anlatan satırlar. */
  breakdown: string[];
  count: number;
  /** İdari para cezası toplamı, TL. */
  administrativeFine: number;
  /** Ceza öncesi 15 günlük düzeltme uyarısı yapılıyor mu. */
  warningFirst: boolean;
  court: {
    /** Mahkûmiyet halinde azami para cezası, TL. */
    maxFine: number;
    maxMultiplier: number;
    /** Yalnızca izinsiz çalıştırmada hapis riski var. */
    maxPrisonYears: number | null;
  };
}

export function calculateWorkPermitPenalty(input: PenaltyInput): PenaltyResult {
  const minimumWage = input.minimumWage && input.minimumWage > 0 ? input.minimumWage : MINIMUM_WAGE.grossMonthly;
  const count = Math.max(1, Math.floor(input.count || 1));
  /*
   * Yedek olarak dizinin ilk elemanı değil, adlandırılmış sabit: `PENALTY_KINDS[0]`
   * `noUncheckedIndexedAccess` altında `undefined` olabilir ve fallback'in kendisi
   * de fallback'e muhtaç hale gelirdi.
   */
  const info = PENALTY_KINDS.find((entry) => entry.kind === input.kind) ?? UNLICENSED;

  const breakdown: string[] = [];
  let multiplier: number;

  if (input.kind === 'unlicensed-employment') {
    multiplier = 1;
    breakdown.push('Madde 24(2)(Ç): kişi başı 1 kat aylık brüt asgari ücret.');

    if (input.occurrenceInYear === 2) {
      multiplier = 2;
      breakdown.push('Aynı yıl içindeki 2. tekrar: ceza “bir kat artırılarak” → 2 kat.');
    } else if (input.occurrenceInYear === 3) {
      multiplier = 4;
      breakdown.push('Aynı yıl içindeki 3. tekrar: ceza “üç katı artırılarak” → 4 kat.');
    }

    if (input.previouslyReportedStopped) {
      multiplier *= 2;
      breakdown.push(
        `Madde 24(2)(D): işçi daha önce “işten durdurulmuş” bildirildiği için ceza bir kat daha artırılıyor → ${multiplier} kat.`,
      );
    }
  } else {
    multiplier = HALF_WAGE_MULTIPLIER;
    breakdown.push(`Madde ${info.clause}: aylık brüt asgari ücretin yarısı.`);
    if (input.kind === 'regulation') {
      breakdown.push('Aykırı olarak tespit edilen HER husus için ayrı ayrı uygulanıyor.');
    }
  }

  const maxMultiplier =
    input.kind === 'unlicensed-employment' ? COURT_MAX_MULTIPLIER_UNLICENSED : COURT_MAX_MULTIPLIER_MINOR;

  return {
    minimumWage,
    multiplierPerUnit: multiplier,
    breakdown,
    count,
    administrativeFine: multiplier * minimumWage * count,
    warningFirst: info.warningFirst,
    court: {
      maxMultiplier,
      maxFine: maxMultiplier * minimumWage * (input.kind === 'unlicensed-employment' ? count : 1),
      maxPrisonYears: input.kind === 'unlicensed-employment' ? COURT_MAX_PRISON_YEARS : null,
    },
  };
}
