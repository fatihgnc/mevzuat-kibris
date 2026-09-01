import Link from 'next/link';

import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Takes a page number and returns that page's URL. */
  hrefFor: (page: number) => string;
  className?: string;
}

/**
 * Classic pagination — infinite scroll is deliberately absent (spec 9.3): every
 * page is a shareable URL and a link Google can crawl.
 *
 * From page 2 onward it is noindex, follow (spec 8.2 rule 4); the metadata side
 * handles that, and there are only links here.
 */
export function Pagination({ page, totalPages, hrefFor, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav aria-label="Sayfalama" className={cn('flex items-center gap-1.5', className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={boxClass()} rel="prev">
          Önceki
        </Link>
      ) : (
        <span className={cn(boxClass(), 'text-ink-placeholder')} aria-hidden>
          Önceki
        </span>
      )}

      {pages.map((item, index) =>
        item === null ? (
          <span key={'gap' + index} aria-hidden className="px-1 py-[7px] text-base text-ink-fainter">
            …
          </span>
        ) : item === page ? (
          <span
            key={item}
            aria-current="page"
            className="rounded bg-ink px-3 py-[7px] text-base font-semibold text-surface"
          >
            {item}
          </span>
        ) : (
          <Link key={item} href={hrefFor(item)} className={boxClass()}>
            {item}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={boxClass()} rel="next">
          Sonraki
        </Link>
      ) : (
        <span className={cn(boxClass(), 'text-ink-placeholder')} aria-hidden>
          Sonraki
        </span>
      )}
    </nav>
  );
}

function boxClass() {
  return 'rounded border border-line bg-surface px-3 py-[7px] text-base text-ink-body no-underline hover:border-line-strong hover:no-underline';
}

/**
 * A window of the form "1 … 9 10 11 … 30": the first page, the two either side of
 * the current one, and the last page.
 *
 * The design artboard showed "1 2 3 … 64", i.e. the first three pages were fixed.
 * Changed by the product owner's decision: pinning the first three pages spent half
 * the row on links of no use to a user in the middle of the archive. Now only 1 and
 * the last page are fixed — one answers "back to the start", the other "how deep
 * does the archive go".
 *
 * The number of entries varies between 3 and 5 (it narrows at the edges because the
 * window does not overflow). A fixed width was possible by sliding the window at
 * the edges, but that produces an odd sequence like "1 2 3 4" on page 1; narrowing
 * is more honest.
 */
export function pageWindow(page: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const items = new Set<number>([1, page - 1, page, page + 1, total]);
  const sorted = [...items].filter((value) => value >= 1 && value <= total).sort((a, b) => a - b);

  const out: Array<number | null> = [];
  let previous = 0;
  for (const value of sorted) {
    if (previous && value - previous > 1) out.push(null);
    out.push(value);
    previous = value;
  }
  return out;
}
