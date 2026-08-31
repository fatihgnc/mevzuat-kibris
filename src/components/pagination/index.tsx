import Link from 'next/link';

import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Sayfa numarasını alıp o sayfanın URL'ini döndürür. */
  hrefFor: (page: number) => string;
  className?: string;
}

/**
 * Klasik sayfalama — sonsuz kaydırma bilerek yok (spec 9.3): her sayfa
 * paylaşılabilir bir URL ve Google'ın gezebileceği bir bağlantı.
 *
 * 2. sayfadan itibaren noindex, follow (spec 8.2 madde 4); bunu metadata
 * tarafı hallediyor, burada yalnızca bağlantılar var.
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
 * 1 … n-1 n n+1 … son biçiminde pencere. Tasarımda "1 2 3 … 64" var:
 * baştan üç, sondan bir, aradakiler üç nokta.
 */
function pageWindow(page: number, total: number): Array<number | null> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const items = new Set<number>([1, 2, 3, page - 1, page, page + 1, total]);
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
