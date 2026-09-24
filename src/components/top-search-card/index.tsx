import Link from 'next/link';

import { MaskedText } from '@/components/masked-text';
import { recordHref } from '@/lib/db/queries/shared';
import { TOP_WINDOW_DAYS, type TopRecord } from '@/lib/gsc/top-records';
import { cn } from '@/lib/utils';

/**
 * "Öne çıkanlar" — the karar pages people reached from Google
 * search most over the last month. Named for what the data is: search
 * clicks, not visits. Renders nothing when the list is empty (no Search
 * Console access yet, or nothing to show).
 */
export function TopSearchCard({ items, className }: { items: TopRecord[]; className?: string }) {
  if (!items.length) return null;

  return (
    <div className={cn('rounded-md border border-line bg-surface-muted p-[18px]', className)}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold uppercase tracking-wide text-ink">
          Öne çıkanlar
        </span>
        <span className="text-sm text-ink-fainter">son {TOP_WINDOW_DAYS} gün</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map(({ record, clicks }) => (
          <li key={record.id} className="flex flex-col gap-0.5">
            <Link href={recordHref(record)} className="text-base leading-[1.4] text-ink [overflow-wrap:anywhere]">
              {record.summary ? record.summary : <MaskedText tokens={record.titleTokens} />}
            </Link>
            <span className="text-sm text-ink-fainter">{clicks} tıklama</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
