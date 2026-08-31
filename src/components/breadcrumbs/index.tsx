import Link from 'next/link';
import { Fragment } from 'react';

export interface Crumb {
  name: string;
  href?: string;
}

/**
 * Breadcrumb — her sayfada var (spec 8.3) ve JSON-LD ile eşleşiyor.
 * Ayraç olarak tasarımdaki tek karakter kullanılıyor; aria-hidden çünkü
 * ekran okuyucu için liste yapısı zaten yeterli.
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
