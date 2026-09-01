import Link from 'next/link';
import { Fragment } from 'react';

export interface Crumb {
  name: string;
  href?: string;
}

/**
 * Breadcrumbs — present on every page (spec 8.3) and matching the JSON-LD.
 * The separator is the single character from the design; it is aria-hidden because
 * the list structure is already enough for a screen reader.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Sayfa yolu" className="mb-5">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-ink-fainter">
        {items.map((item, index) => (
          <Fragment key={item.name + index}>
            {index > 0 ? <li aria-hidden className="select-none">›</li> : null}
            <li>
              {item.href ? (
                <Link href={item.href}>{item.name}</Link>
              ) : (
                <span className="text-ink-muted">{item.name}</span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
