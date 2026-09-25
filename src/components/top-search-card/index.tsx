'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { MaskedText } from '@/components/masked-text';
import { TOP_WINDOW_DAYS, type TopSearchItem } from '@/lib/gsc/shared';
import { cn } from '@/lib/utils';

/**
 * "En çok arananlar" — the karar pages people reached from Google
 * search most over the last month. Named for what the data is: search
 * clicks, not visits. Renders nothing when the list is empty (no Search
 * Console access yet, or nothing to show).
 *
 * The list comes with the prerendered page, but the build is where Search
 * Console most often fails, and an empty list then stays in the static HTML
 * until the page regenerates. So when it starts empty the card asks
 * /api/top-records once after mount — the same correction StatusBar makes.
 */
export function TopSearchCard({
  items: initialItems,
  className,
}: {
  items: TopSearchItem[];
  className?: string;
}) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    if (initialItems.length) return;
    let cancelled = false;

    fetch('/api/top-records')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: TopSearchItem[] | null) => {
        if (!cancelled && Array.isArray(data) && data.length) setItems(data);
      })
      .catch(() => {
        // No list, no card — the same as before the refetch.
      });

    return () => {
      cancelled = true;
    };
  }, [initialItems.length]);

  if (!items.length) return null;

  return (
    <div className={cn('rounded-md border border-line bg-surface-muted p-[18px]', className)}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold uppercase tracking-wide text-ink">
          En çok arananlar
        </span>
        <span className="text-sm text-ink-fainter">son {TOP_WINDOW_DAYS} gün</span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {items.map(({ id, href, summary, titleTokens, clicks }) => (
          <li key={id} className="flex flex-col gap-0.5">
            <Link href={href} className="text-base leading-[1.4] text-ink [overflow-wrap:anywhere]">
              {summary ? summary : <MaskedText tokens={titleTokens} />}
            </Link>
            <span className="text-sm text-ink-fainter">{clicks} tıklama</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
