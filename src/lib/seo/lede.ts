import { formatCount } from '@/lib/db/queries/shared';
import { formatDateLong } from '@/lib/text/dates';

/**
 * The same idea for an entity page: what this page is, in numbers, in prose.
 *
 * "Bakanlar Kurulu adına 2020'den bugüne 12.803 kayıt yayımlandı; en yenisi 4
 * Eylül 2026." The count and the latest date were both on the page already, as a
 * bare number and as the first row's timestamp.
 */
export function entityLede(name: string, total: number, latestPublishedAt?: string): string {
  const head = name + ' ile ilgili arşivde ' + formatCount(total) + ' kayıt var';
  if (!latestPublishedAt) return head + '.';
  return head + '; en yenisi ' + formatDateLong(latestPublishedAt) + ' tarihinde yayımlandı.';
}
