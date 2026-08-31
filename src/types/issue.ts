import type { TextStatus } from './record';

export interface IssueRow {
  id: number;
  year: number;
  number: number;
  publishedAt: string;
  pdfUrl: string;
  pageCount: number | null;
  textStatus: TextStatus;
  textQuality: number | null;
  retryCount: number;
}

export interface IssueSummary extends IssueRow {
  recordCount: number;
}
