import type { DocType, RefType } from '@/lib/constants/doc-types';
import type { Section } from '@/lib/constants/sections';
import type { TopicSlug } from '@/lib/constants/topics';

export type TextStatus = 'pending' | 'extracted' | 'ocr' | 'failed' | 'needs_review';
export type SummarySource = 'rule' | 'llm';

/** A masked title token (spec 3.8, artboard 1a).
 *  0 boilerplate · 1 distinctive · 2 supporting · 3 search match */
export type TokenLevel = 0 | 1 | 2 | 3;

export interface Token {
  t: string;
  lvl: TokenLevel;
}

export interface RecordRow {
  id: number;
  issueId: number;
  slug: string;
  section: Section;
  docType: DocType;
  refType: RefType | null;
  refNumber: string | null;
  /** The gazette's raw title — always on the page and copyable (spec 3.8 rule 5). */
  title: string;
  titleNormalized: string;
  subject: string | null;
  bodyText: string | null;
  /** The generated summary sentence; list, detail, email, RSS and og:title all use the same text. */
  summary: string | null;
  summarySource: SummarySource | null;
  deadlineAt: string | null;
  deadlineNote: string | null;
  pageFrom: number | null;
  pageTo: number | null;
  publishedAt: string;
  relatedRecordId: number | null;
  correctsId: number | null;
  hasPersonalData: boolean;
  /** Spec 8.2 rule 2: a thin record gets no page of its own, only an anchor on the issue page. */
  hasOwnPage: boolean;
}

/** The light shape used in list rows — the artboard 1b/1d/1e row. */
export interface RecordListItem {
  id: number;
  slug: string;
  hasOwnPage: boolean;
  issueYear: number;
  issueNumber: number;
  publishedAt: string;
  refLabel: string | null;
  title: string;
  titleTokens: Token[];
  summary: string | null;
  docType: DocType;
  docTypeLabel: string;
  topics: TopicSlug[];
  primaryTopic: TopicSlug | null;
  institution: string | null;
  /**
   * Whether the record has body text. A null snippet does NOT mean there is no
   * body: list queries never run ts_headline. Without separating the two, the home
   * page writes "body text could not be extracted" on every row.
   */
  hasBody: boolean;
  /** The ts_headline output split into tokens; filled only on search results. */
  snippet: Token[] | null;
  deadlineAt: string | null;
}

export interface RecordDetail extends RecordRow {
  issue: {
    id: number;
    year: number;
    number: number;
    publishedAt: string;
    pdfUrl: string;
    textStatus: TextStatus;
    textQuality: number | null;
  };
  topics: TopicSlug[];
  entities: Array<{ id: number; kind: EntityKind; slug: string; name: string }>;
  related: RecordListItem[];
  corrections: RecordListItem[];
  sameIssue: RecordListItem[];
}

export type EntityKind = 'institution' | 'company' | 'place';
