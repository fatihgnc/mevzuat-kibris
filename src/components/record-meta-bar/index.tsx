import Link from 'next/link';

import { sectionShort } from '@/lib/constants/sections';
import { formatDateLong } from '@/lib/text/dates';
import { cn } from '@/lib/utils';

interface MetaField {
  label: string;
  value: React.ReactNode;
  /** Already on the meta line above the title, so a phone does not need it twice. */
  hideOnPhone?: boolean;
}

/**
 * The meta bar — the four-column grid in artboards 1a/1g.
 *
 * Four columns from `sm` up. A hairline above and below: the bar separates from
 * the body text without being boxed in, because the meta line is part of the
 * content rather than an aside.
 *
 * On a phone it is a compact list instead — label and value on one line. As a
 * two-column grid of stacked label/value pairs it took about 200px, and with the
 * meta line and the title above it the record's own text did not start until
 * 778px, below the first screen.
 */
export function RecordMetaBar({ fields, className }: { fields: MetaField[]; className?: string }) {
  return (
    <dl
      className={cn(
        'flex flex-col gap-1.5 border-y border-line py-3.5 sm:grid sm:grid-cols-4 sm:gap-x-5 sm:gap-y-4 sm:py-[22px]',
        className,
      )}
    >
      {fields.map((field) => (
        <div
          key={field.label}
          className={cn(
            'flex items-baseline gap-3 sm:flex-col sm:gap-1',
            field.hideOnPhone && 'max-sm:hidden',
          )}
        >
          <dt className="w-[92px] shrink-0 text-sm text-ink-faint sm:w-auto sm:text-xs">
            {field.label}
          </dt>
          <dd className="min-w-0 text-base font-semibold text-ink sm:text-md">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function buildRecordMetaFields(input: {
  refLabel: string | null;
  publishedAt: string;
  issueYear: number;
  issueNumber: number;
  section: string;
  institution?: { slug: string; name: string } | null;
  primaryTopic?: { slug: string; name: string } | null;
  pdfUrl: string;
  pageFrom?: number | null;
}): MetaField[] {
  const fields: MetaField[] = [];

  if (input.refLabel) fields.push({ label: 'Referans', value: input.refLabel });

  fields.push({
    label: 'Yayım',
    value: <time dateTime={input.publishedAt}>{formatDateLong(input.publishedAt)}</time>,
    hideOnPhone: true,
  });

  fields.push({
    label: 'Gazete',
    value: (
      <>
        <Link href={'/sayilar/' + input.issueYear + '/' + input.issueNumber}>
          Sayı {input.issueNumber}
        </Link>
        {', ' + sectionShort(input.section)}
      </>
    ),
  });

  if (input.institution) {
    fields.push({
      label: 'Kurum',
      value: <Link href={'/kurum/' + input.institution.slug}>{input.institution.name}</Link>,
    });
  } else if (input.primaryTopic) {
    fields.push({
      label: 'Konu',
      value: <Link href={'/konu/' + input.primaryTopic.slug}>{input.primaryTopic.name}</Link>,
    });
  }

  fields.push({
    label: 'Resmî Kaynak',
    value: (
      <a href={input.pdfUrl} target="_blank" rel="noopener noreferrer">
        {input.pageFrom ? 'Sayfa ' + input.pageFrom : 'Kaynağa git'}
      </a>
    ),
  });

  return fields;
}
