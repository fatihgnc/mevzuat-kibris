import type { Token } from '@/types/record';

/*
 * What the top-search card needs, and nothing server-only: the card is a client
 * component that can refetch this list from /api/top-records.
 */

export const TOP_WINDOW_DAYS = 28;

export interface TopSearchItem {
  id: number;
  href: string;
  summary: string | null;
  titleTokens: Token[];
  clicks: number;
}
