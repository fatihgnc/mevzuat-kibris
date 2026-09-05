import Link from 'next/link';

import { SITE_URL } from '@/lib/seo/config';
import { cn } from '@/lib/utils';

/**
 * The RSS offer — spec 10.4 wants the feed carried with the same weight as
 * email, and a bare "E-posta yerine RSS" link inside the follow card did not do
 * that: it read as a footnote to the email form rather than as the other way in.
 *
 * The address is SHOWN rather than only linked. A feed is pasted into a reader,
 * not clicked, so the thing the user actually needs is the text — the link
 * beside it is for the reader who wants to look at the XML first.
 */
export function RssCard({ href, className }: { href: string; className?: string }) {
  return (
    <div className={cn('rounded-md border border-line bg-surface-muted p-[18px]', className)}>
      <div className="mb-1.5 text-md font-semibold text-ink">RSS</div>
      <p className="mb-3 text-sm leading-[1.5] text-ink-muted">
        E-posta vermek istemiyorsanız akışı okuyucunuza ekleyin. Aynı kayıtlar, aynı sırada.
      </p>
      <div className="overflow-hidden text-ellipsis whitespace-nowrap rounded border border-line-strong bg-surface px-[11px] py-2.5 text-sm text-ink-body">
        {SITE_URL.replace(/^https?:\/\//, '')}
        {href}
      </div>
      <div className="mt-2 text-sm">
        <Link href={href}>Akışı aç</Link>
      </div>
    </div>
  );
}
