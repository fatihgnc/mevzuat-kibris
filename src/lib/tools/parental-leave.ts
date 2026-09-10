/**
 * Doğum, emzirme ve mazeret izinleri — 22/1992 İş Yasası madde 53 ve 56.
 *
 * Bu bir "hesaplayıcı" değil, tarih üreticisi: yasadaki süreler sabit, kişiye
 * göre değişen tek şey doğum tarihi. Araç o tarihi alıp hangi günün hangi hakkın
 * son günü olduğunu söylüyor.
 */

import { addMonths, addWeeks } from './duration';

/** Madde 56(1)(A): doğumdan önce altı, sonra altı hafta — çalıştırma YASAĞI. */
export const MANDATORY_WEEKS_BEFORE = 6;
export const MANDATORY_WEEKS_AFTER = 6;

/** Madde 56(1)(B): öncesi ve sonrası altışar hafta ödeneksiz, isteğe bağlı. */
export const UNPAID_WEEKS_BEFORE = 6;
export const UNPAID_WEEKS_AFTER = 6;

/** Madde 56(2)(A): doğumdan itibaren dokuz ay, günde iki saat. */
export const NURSING_MONTHS = 9;
export const NURSING_HOURS_PER_DAY = 2;

export interface MaternityTimeline {
  birthDate: Date;
  /** Çalıştırma yasağının başladığı gün. */
  mandatoryStart: Date;
  /** Çalıştırma yasağının son günü. */
  mandatoryEnd: Date;
  /** İsteğe bağlı ödeneksiz iznin doğum öncesi en erken başlangıcı. */
  unpaidStart: Date;
  /** İsteğe bağlı ödeneksiz izin de kullanılırsa işe dönüş öncesi son gün. */
  unpaidEnd: Date;
  /** Emzirme izninin son günü. */
  nursingEnd: Date;
}

/**
 * Süreler doğum gününün kendisinden sayılıyor ve "son gün" olarak bir gün geri
 * alınıyor: doğumdan sonraki altı haftanın son günü, doğum + 42 gün değil,
 * doğum + 41 gündür. Bir gün fazla göstermek, işe dönüş tarihini yanlış
 * planlatan türden bir hata.
 */
function lastDayOf(date: Date): Date {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return previous;
}

export function maternityTimeline(birthDate: Date): MaternityTimeline {
  const mandatoryStart = addWeeks(birthDate, -MANDATORY_WEEKS_BEFORE);
  const mandatoryEnd = lastDayOf(addWeeks(birthDate, MANDATORY_WEEKS_AFTER));

  return {
    birthDate,
    mandatoryStart,
    mandatoryEnd,
    unpaidStart: addWeeks(mandatoryStart, -UNPAID_WEEKS_BEFORE),
    unpaidEnd: lastDayOf(addWeeks(birthDate, MANDATORY_WEEKS_AFTER + UNPAID_WEEKS_AFTER)),
    nursingEnd: lastDayOf(addMonths(birthDate, NURSING_MONTHS)),
  };
}

export interface ExcuseLeaveEntry {
  /** Madde 53'teki hâl. */
  event: string;
  days: number;
  note?: string;
}

/**
 * Madde 53 — ödenekli mazeret izinleri. Yasa bu süreleri ASGARİ sayıyor; hizmet
 * akdi veya toplu iş sözleşmesi artırabilir.
 */
export const EXCUSE_LEAVE: readonly ExcuseLeaveEntry[] = [
  { event: 'İşçinin evlenmesi', days: 3 },
  {
    event: 'Ana, baba, eş, kardeş veya çocuğun ölümü',
    days: 2,
    note: 'Yasada sayılan yakınlıklar bunlarla sınırlı.',
  },
  { event: 'Eşin doğum yapması', days: 2 },
];
