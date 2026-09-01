import Link from 'next/link';

import { cn } from '@/lib/utils';

interface YearNavProps {
  years: number[];
  current?: number;
  hrefFor: (year: number) => string;
  allHref?: string;
  className?: string;
}

/** Year navigation on topic pages (spec 8.5) and the /sayilar year list. */
export function YearNav({ years, current, hrefFor, allHref, className }: YearNavProps) {
  return (
    <nav aria-label="Yıla göre" className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {allHref ? (
        <Link
          href={allHref}
          className={cn(
            'rounded-pill border px-3.5 py-1.5 text-base no-underline hover:no-underline',
            current === undefined
              ? 'border-ink bg-ink font-semibold text-surface hover:text-surface'
              : 'border-line bg-surface text-ink-body hover:border-accent hover:text-accent',
          )}
        >
          Tümü
        </Link>
      ) : null}
      {years.map((year) => (
        <Link
          key={year}
          href={hrefFor(year)}
          aria-current={year === current ? 'page' : undefined}
          className={cn(
            'rounded-pill border px-3.5 py-1.5 text-base no-underline hover:no-underline',
            year === current
              ? 'border-ink bg-ink font-semibold text-surface hover:text-surface'
              : 'border-line bg-surface text-ink-body hover:border-accent hover:text-accent',
          )}
        >
          {year}
        </Link>
      ))}
    </nav>
  );
}
