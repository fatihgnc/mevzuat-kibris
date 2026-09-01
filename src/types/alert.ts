import type { DocType } from '@/lib/constants/doc-types';
import type { TopicSlug } from '@/lib/constants/topics';

/** instant is disabled in v1 per spec 10.3 rule 6. */
export type AlertFrequency = 'daily' | 'weekly';

export interface AlertRow {
  id: number;
  userId: string;
  label: string;
  query: string | null;
  topics: TopicSlug[];
  docTypes: DocType[];
  entityIds: number[];
  frequency: AlertFrequency;
  /** 0 = Sunday. Weekly subscribers are spread across the days (spec 10.3 rule 2). */
  preferredWeekday: number;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

export type DeliveryStatus = 'sent' | 'failed' | 'skipped' | 'deferred';
