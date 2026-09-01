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
  className?: string;
}

/**
 * The list row — the single form used in artboards 1b/1d/1e.
 *
 * The left column is a fixed 92px: date and reference number. The fixed width
 * creates a vertical alignment between rows, so the eye scans a single column even
 * when the dates differ in length.
 *
 * The summary is the main text, not the raw title. The raw title appears only when
 * no body text could be extracted, and even then in its masked form (spec 3.8).
 */
export function RecordCard({
  record,
  hideTopic,
  showDeadline,
  variant = 'full',
  className,
}: RecordCardProps) {
  const heading = record.summary ?? null;
  const deadlinePassed = isDeadlinePassed(record.deadlineAt);
  const compact = variant === 'compact';

  return (
    <Link
      href={recordHref(record)}
      className={cn(
        'grid grid-cols-row items-start gap-[18px] border-b border-line-soft py-4 pl-3 pr-[10px]',
        'no-underline transition-colors hover:bg-surface-hover hover:no-underline',
        className,
      )}
    >
      <div className="flex flex-col gap-[3px] pt-0.5">
        <time dateTime={record.publishedAt} className="text-base font-semibold text-ink-body">
          {formatDateShort(record.publishedAt)}
        </time>
        {!compact && record.refLabel ? (
          <span className="text-xs text-ink-fainter">{record.refLabel}</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
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
        ) : !record.hasBody && heading ? (
          /*
           * There REALLY is no body text. The design's decision: rather than leave
           * the row empty, show the gazette's raw title in its masked form and say
           * so plainly.
           *
           * The condition looks at record.hasBody, not at the snippet: on list
           * pages ts_headline never runs, the snippet is null, and looking only at
           * the snippet would print "could not be extracted" on records that do
           * have a body.
           */
          <span className="flex flex-col gap-1 border-l-2 border-line-dashed pl-2.5">
            <span className="text-2xs text-ink-fainter">
              Gövde metni çıkarılamadı, gazetedeki başlık:
            </span>
            <MaskedText tokens={record.titleTokens} className="text-base leading-[1.5]" />
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

        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          {!hideTopic && record.primaryTopic ? (
            <span className="inline-flex items-center gap-1.5">
              {TOPICS[record.primaryTopic].name}
            </span>
          ) : null}
          {/*
           * If the document type starts with the topic name we do not print it
           * twice: a line like "Münhal · Münhal ilanı" carries no information. This
           * is the design's showTur rule.
           */}
          {shouldShowDocType(record) ? <span>{record.docTypeLabel}</span> : null}
          {record.institution ? (
            <span className="text-ink-fainter">{record.institution}</span>
          ) : null}
        </span>
      </div>
    </Link>
  );
}

function shouldShowDocType(record: RecordListItem): boolean {
  if (!record.primaryTopic) return true;
  const topicName = TOPICS[record.primaryTopic].name;
  return !record.docTypeLabel.toLocaleLowerCase('tr').startsWith(topicName.toLocaleLowerCase('tr'));
}
