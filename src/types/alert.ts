import type { DocType } from '@/lib/constants/doc-types';
import type { TopicSlug } from '@/lib/constants/topics';

/** instant spec 10.3 madde 6 uyarınca v1'de kapalı. */
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
  /** 0 = pazar. Haftalık aboneler güne dağıtılır (spec 10.3 madde 2). */
  preferredWeekday: number;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
}

export type DeliveryStatus = 'sent' | 'failed' | 'skipped' | 'deferred';
