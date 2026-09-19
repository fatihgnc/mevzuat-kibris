import type { LegislationKind, LegislationSource } from '@/lib/legislation/labels';

/** One line of a list page. */
export interface LegislationItem {
  slug: string;
  kind: LegislationKind;
  lawKey: string | null;
  title: string;
  lawNumber: number | null;
  lawYear: number | null;
  /** Date of the file the shown text came from (YYYY-MM-DD), not the law's own date. */
  bodyModifiedAt: string | null;
  bodySource: LegislationSource | null;
}

export interface LegislationDetail extends LegislationItem {
  bodyText: string | null;
  extractStatus: 'pending' | 'ok' | 'failed' | 'unsupported';
  /** Typed out by hand from page scans, not extracted by a program. */
  transcribed: boolean;
  portalUrl: string | null;
  portalModifiedAt: string | null;
  officialUrl: string | null;
  officialModifiedAt: string | null;
}
