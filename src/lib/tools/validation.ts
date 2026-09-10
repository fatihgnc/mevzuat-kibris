import { z } from 'zod';

import { parseDate } from './duration';
import { parseNumberInput } from './format';

/**
 * Form doğrulaması.
 *
 * Alanlar ekranda METİN olarak duruyor — tarih `YYYY-MM-DD`, sayı ise kanonik
 * sayı metni. Şemalar bu metinleri hem denetliyor hem de hesap fonksiyonlarının
 * beklediği `Date` ve `number` tiplerine çeviriyor, yani doğrulama ile dönüşüm
 * tek yerde. Form tarafında ayrıca `parseDate` çağrılmıyor; şema başarılıysa
 * elde hazır tipli bir nesne oluyor.
 *
 * Hata mesajları ALANIN KENDİ ALTINDA gösteriliyor, formun üstünde toplu bir
 * kutuda değil: "İşe giriş tarihini girin" yazan bir bandın hangi alanı
 * kastettiğini okuyucunun tahmin etmesi gerekiyordu.
 */

const invalidDate = 'Geçerli bir tarih girin.';

/** Zorunlu tarih alanı — boş ve geçersiz için ayrı mesaj. */
export function requiredDate(emptyMessage: string) {
  return z
    .string()
    .superRefine((value, ctx) => {
      if (!value.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: emptyMessage });
        return;
      }
      if (!parseDate(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: invalidDate });
      }
    })
    .transform((value) => parseDate(value) as Date);
}

/** İsteğe bağlı tarih. Boşsa `null`, doluysa geçerli olmak zorunda. */
export function optionalDate() {
  return z
    .string()
    .superRefine((value, ctx) => {
      if (value.trim() && !parseDate(value)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: invalidDate });
      }
    })
    .transform((value) => (value.trim() ? (parseDate(value) as Date) : null));
}

/** Zorunlu, sıfırdan büyük tutar veya sayı. */
export function requiredAmount(emptyMessage: string) {
  return z
    .string()
    .superRefine((value, ctx) => {
      const parsed = parseNumberInput(value);
      if (parsed === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: emptyMessage });
        return;
      }
      if (parsed <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Sıfırdan büyük bir değer girin.' });
      }
    })
    .transform((value) => parseNumberInput(value) as number);
}

/** İsteğe bağlı, negatif olmayan sayı. Boşsa `null`. */
export function optionalAmount(label = 'değer') {
  return z
    .string()
    .superRefine((value, ctx) => {
      if (!value.trim()) return;
      const parsed = parseNumberInput(value);
      if (parsed === null) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Geçerli bir ${label} girin.` });
        return;
      }
      if (parsed < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Negatif olamaz.' });
      }
    })
    .transform((value) => (value.trim() ? parseNumberInput(value) : null));
}

/** İsteğe bağlı, en az 1 olan tam sayı — kişi ve gün sayıları için. */
export function optionalCount(label = 'sayı') {
  return z
    .string()
    .superRefine((value, ctx) => {
      if (!value.trim()) return;
      const parsed = parseNumberInput(value);
      if (parsed === null || !Number.isInteger(parsed)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Tam ${label} girin.` });
        return;
      }
      if (parsed < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'En az 1 olmalı.' });
      }
    })
    .transform((value) => (value.trim() ? (parseNumberInput(value) as number) : null));
}

/** Optional whole number that may be zero — child counts. Empty means 0. */
export function optionalWholeCount() {
  return z
    .string()
    .superRefine((value, ctx) => {
      if (!value.trim()) return;
      const parsed = parseNumberInput(value);
      if (parsed === null || !Number.isInteger(parsed) || parsed < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Sıfır veya pozitif bir tam sayı girin.' });
      }
    })
    .transform((value) => (value.trim() ? (parseNumberInput(value) as number) : 0));
}

/** Zod hatasını `{ alan: mesaj }` haritasına çevirir — ilk mesaj kazanır. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string' || key in map) continue;
    map[key] = issue.message;
  }

  return map;
}
