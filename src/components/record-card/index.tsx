import Link from 'next/link';

import { MaskedText } from '@/components/masked-text';
import { recordHref } from '@/lib/db/queries/shared';
import { formatDateShort, isDeadlinePassed } from '@/lib/text/dates';
import { TOPICS } from '@/lib/constants/topics';
import { cn } from '@/lib/utils';
import type { RecordListItem } from '@/types/record';

interface RecordCardProps {
  record: RecordListItem;
  /** In a topic feed the topic is already known; we do not repeat the dot. */
  hideTopic?: boolean;
  /** In the vacancy feed the application deadline is brought forward (spec 3.9). */
  showDeadline?: boolean;
  /**
   * `full`    — search and topic feeds (artboards 1b/1e): reference, excerpt, meta line
   * `compact` — the home page (artboard 1d): date, summary and topic only
   *
   * The home page row is deliberately plainer in the design: there the point is to
   * scan, not to compare.
   */
  variant?: 'full' | 'compact';
  /** The search that produced this row; the record page opens with it highlighted. */
  highlightQuery?: string;
  className?: string;
}

/**
 * The list row — the single form used in artboards 1b/1d/1e.
 *
 * From `sm` up, the left column is a fixed 92px: date and reference number. The
 * fixed width creates a vertical alignment between rows, so the eye scans a
 * single column even when the dates differ in length.
 *
 * On a phone that column cost the title a third of the row: 92px of a 343px
 * line went to a date, leaving the title 218px and wrapping every summary onto
 * three or four lines. There the date and reference move onto a small line
 * above the title, and the title gets the full width. The badges are capped at
 * two for the same reason — the third is almost always the institution, which
 * the document type beside it already implies ("Bakanlar Kurulu kararı",
 * "Bakanlar Kurulu").
 *
 * The summary is the main text, not the raw title. The raw title appears only when
 * no body text could be extracted, and even then in its masked form (spec 3.8).
 */
export function RecordCard({
  record,
  hideTopic,
  showDeadline,
  variant = 'full',
  highlightQuery,
  className,
}: RecordCardProps) {
  const heading = record.summary ?? null;
  const deadlinePassed = isDeadlinePassed(record.deadlineAt);
  const compact = variant === 'compact';
  const query = highlightQuery?.trim();
  /* Only records with their own page can carry it; the rest link to an issue page. */
  const href =
    query && record.hasOwnPage
      ? recordHref(record) + '?q=' + encodeURIComponent(query)
      : recordHref(record);

  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col gap-1.5 border-b border-line-soft py-4 pl-3 pr-[10px] sm:grid sm:grid-cols-row sm:items-start sm:gap-[18px]',
        'no-underline transition-colors hover:bg-surface-hover hover:no-underline',
        className,
      )}
    >
      <div className="flex flex-row flex-wrap items-baseline gap-x-2 sm:flex-col sm:gap-[3px] sm:pt-0.5">
        <time
          dateTime={record.publishedAt}
          className="text-sm font-semibold text-ink-muted sm:text-base sm:text-ink-body"
        >
          {formatDateShort(record.publishedAt)}
        </time>
        {!compact && record.refLabel ? (
          <>
            <span aria-hidden className="text-sm text-ink-placeholder sm:hidden">
              ·
            </span>
            <span className="text-sm text-ink-fainter sm:text-xs">{record.refLabel}</span>
          </>
        ) : null}
      </div>

      {/*
        * `overflow-wrap: anywhere` — gazette titles glue words together with bare
        * commas ("SONUÇLARI,MESLEKİ TEKNİK ÖĞRETİM DAİRESİ,ÖĞRETİM KADROSU,…"),
        * and to the browser each run is one unbreakable word. Wider than the
        * screen, it pushed the page to 424px on a 375px phone, and the browser
        * zoomed the whole page out to fit. This only ever breaks a word that
        * cannot fit on a line at all; ordinary titles wrap at spaces as before.
        */}
      <div className="flex min-w-0 flex-col gap-1.5 [overflow-wrap:anywhere]">
        {heading ? (
          <span className="text-xl font-medium leading-[1.38] tracking-tight text-ink">
            {heading}
          </span>
        ) : (
          <MaskedText tokens={record.titleTokens} className="text-xl leading-[1.38]" />
        )}

        {compact ? null : record.snippet ? (
          <span className="text-base leading-[1.55] text-ink-muted">
            <MaskedText tokens={record.snippet} variant="quote" />
          </span>
        ) : null}

        {showDeadline && record.deadlineAt ? (
          <span
            className={cn(
              'text-sm font-semibold',
              deadlinePassed ? 'text-ink-muted' : 'rounded-sm bg-mark px-1 text-ink',
            )}
          >
            {deadlinePassed
              ? 'Başvuru süresi doldu, ' + formatDateShort(record.deadlineAt)
              : 'Başvuru bitişi ' + formatDateShort(record.deadlineAt)}
          </span>
        ) : null}

        <span className="flex flex-wrap items-center gap-1.5 text-sm text-ink-muted">
          {badges(record, hideTopic).map((label, index) => (
            // Phone: two badges at most (see the note on the component).
            <Badge key={label} className={index >= 2 ? 'hidden sm:inline' : undefined}>
              {label}
            </Badge>
          ))}
        </span>
      </div>
    </Link>
  );
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'rounded-[6px] border border-line bg-surface-muted px-2 py-0.5 text-sm text-ink-muted',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Topic, document type and institution, in that order, without repeats. */
function badges(record: RecordListItem, hideTopic?: boolean): string[] {
  const labels: string[] = [];
  if (!hideTopic && record.primaryTopic) labels.push(TOPICS[record.primaryTopic].name);
  /*
   * If the document type starts with the topic name we do not print it twice: a
   * line like "Münhal · Münhal ilanı" carries no information. This is the
   * design's showTur rule.
   */
  if (shouldShowDocType(record)) labels.push(record.docTypeLabel);
  if (record.institution) labels.push(record.institution);
  return [...new Set(labels)];
}

function shouldShowDocType(record: RecordListItem): boolean {
  if (!record.primaryTopic) return true;
  const topicName = TOPICS[record.primaryTopic].name;
  return !record.docTypeLabel.toLocaleLowerCase('tr').startsWith(topicName.toLocaleLowerCase('tr'));
}
