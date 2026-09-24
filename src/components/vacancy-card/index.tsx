import Link from 'next/link';

import { MaskedText } from '@/components/masked-text';
import { recordHref } from '@/lib/db/queries/shared';
import { formatDateShort } from '@/lib/text/dates';
import { cn } from '@/lib/utils';
import type { RecordListItem } from '@/types/record';

interface RecentVacanciesCardProps {
  records: RecordListItem[];
  className?: string;
}

/**
 * "Son eklenen münhal ilanları" — the home page side column, next to
 * `IssueCard`. The caller already filtered to the last 7 days, so an empty
 * list here means nothing to show, not zero results to explain — the card
 * renders nothing rather than an empty box with just a heading.
 */
export function RecentVacanciesCard({ records, className }: RecentVacanciesCardProps) {
  if (!records.length) return null;

  return (
    <div className={cn('rounded-md border border-line bg-surface-muted p-[18px]', className)}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold uppercase tracking-wide text-ink">
          Son eklenen münhal ilanları
        </span>
        <Link href="/ara?konu=munhal&sirala=yeni" className="text-sm">
          Tümü
        </Link>
      </div>
      <ul className="flex flex-col gap-2.5">
        {records.map((record) => (
          <li key={record.id} className="flex flex-col gap-0.5">
            {/*
             * The date sits OUTSIDE the link: the global `a:hover` rule
             * (globals.css) draws its underline across every inline descendant
             * of the anchor, not only the ones that asked for it — the only
             * sure way to keep it off the date is to keep the date out of the
             * anchor entirely.
             */}
            <span className="text-sm text-ink-fainter">{formatDateShort(record.publishedAt)}</span>
            <Link href={recordHref(record)} className="text-base leading-[1.4] text-ink [overflow-wrap:anywhere]">
              {record.summary ? (
                record.summary
              ) : (
                <MaskedText tokens={record.titleTokens} />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
