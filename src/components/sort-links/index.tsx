import Link from 'next/link';

import { SORT_LABELS, SORT_OPTIONS, type SortOption } from '@/lib/search/build-query';
import { cn } from '@/lib/utils';

/**
 * The "En yeni / En eski" strip above a result list.
 *
 * LINKS, NOT A FORM FIELD, and that is the whole point of it being here rather
 * than in the filter rail. Sorting is not a filter you assemble and then apply —
 * it is one click that should act at once, and as a link it is a shareable
 * address and works without JS. It also keeps the rail to the things you tick.
 *
 * Lifted out of the search page so the topic feed shows the same control in the
 * same place. It had a rail radio group of its own for a while, which put the
 * same choice in two different shapes on two screens.
 *
 * `hrefFor` belongs to the caller because the two pages spell their addresses
 * differently: search builds a query string, the topic feed keeps the page number
 * in its path.
 */
export function SortLinks({
  active,
  hrefFor,
  className,
}: {
  active: SortOption;
  hrefFor: (option: SortOption) => string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4 text-base', className)}>
      {SORT_OPTIONS.map((option) => (
        <Link
          key={option}
          href={hrefFor(option)}
          className={cn(
            'no-underline hover:no-underline',
            option === active
              ? 'border-b-2 border-accent pb-0.5 font-semibold text-ink'
              : 'text-ink-muted hover:text-ink',
          )}
        >
          {SORT_LABELS[option]}
        </Link>
      ))}
    </div>
  );
}
