import Link from 'next/link';

import { formatDateLong } from '@/lib/text/dates';
import { cn } from '@/lib/utils';

interface IssueCardProps {
  year: number;
  number: number;
  publishedAt: string;
  recordCount: number;
  pdfUrl: string;
  className?: string;
}

/** The "latest published issue" card in the home page side column (artboard 1d). */
export function IssueCard({
  year,
  number,
  publishedAt,
  recordCount,
  pdfUrl,
  className,
}: IssueCardProps) {
  return (
    <div className={cn('rounded-md border border-line bg-surface-muted p-[18px]', className)}>
      <div className="mb-2 text-xs text-ink-faint">Son yayımlanan sayı</div>
      <div className="text-3xl font-semibold text-ink">Sayı {number}</div>
      <div className="mt-0.5 text-md text-ink-body">
        <time dateTime={publishedAt}>{formatDateLong(publishedAt)}</time>
      </div>
      <div className="mt-2.5 text-base text-ink-muted">{recordCount} kayıt işlendi</div>
      <div className="mt-3.5 flex flex-col gap-2">
        <Link href={'/sayilar/' + year + '/' + number} className="text-base font-semibold">
          Sayıdaki kayıtlar
        </Link>
        {/*
         * The PDF points at the original source, not at us — we do not store PDFs
         * (spec 3.6). rel="noopener" because it is an external link.
         */}
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-base">
          Resmî PDF
        </a>
      </div>
    </div>
  );
}
