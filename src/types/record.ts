import type { DocType, RefType } from '@/lib/constants/doc-types';
import type { Section } from '@/lib/constants/sections';
import type { TopicSlug } from '@/lib/constants/topics';

export type TextStatus = 'pending' | 'extracted' | 'ocr' | 'failed' | 'needs_review';
export type SummarySource = 'rule' | 'llm';

/** Maskelenmiş başlık jetonu (spec 3.8, artboard 1a).
 *  0 kalıp · 1 ayırt edici · 2 ara bilgi · 3 arama eşleşmesi */
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
  /** Gazetedeki ham başlık — her zaman sayfada ve kopyalanabilir (spec 3.8 kural 5). */
  title: string;
  titleNormalized: string;
  subject: string | null;
  bodyText: string | null;
  /** Üretilmiş özet cümle; liste, detay, e-posta, RSS ve og:title aynı metni kullanır. */
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
  /** Spec 8.2 madde 2: ince kayıt kendi sayfasını almaz, sayı sayfasında anchor alır. */
  hasOwnPage: boolean;
}

/** Liste satırlarında kullanılan hafif biçim — artboard 1b/1d/1e satırı. */
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
   * Kaydın gövde metni var mı. snippet null olması gövde YOK demek değil:
   * liste sorgularında ts_headline hiç çalıştırılmıyor. İkisini ayırmazsak
   * ana sayfa her satıra "gövde metni çıkarılamadı" yazıyor.
   */
  hasBody: boolean;
  /** ts_headline çıktısı jetonlara ayrılmış hâli; yalnızca arama sonuçlarında dolu. */
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
