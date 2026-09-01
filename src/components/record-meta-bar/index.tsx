import Link from 'next/link';

import { sectionShort } from '@/lib/constants/sections';
import { formatDateLong } from '@/lib/text/dates';
import { cn } from '@/lib/utils';

interface MetaField {
  label: string;
  value: React.ReactNode;
}

/**
 * The meta bar — the four-column grid in artboards 1a/1g.
 *
 * Four columns on desktop, two on mobile (as in the design's mobile artboard). A
 * hairline above and below: the bar separates from the body text without being
 * boxed in, because the meta line is part of the content rather than an aside.
 */
export function RecordMetaBar({ fields, className }: { fields: MetaField[]; className?: string }) {
  return (
    <dl
      className={cn(
        'grid grid-cols-2 gap-x-5 gap-y-4 border-y border-line py-[22px] sm:grid-cols-4',
        className,
      )}
    >
      {fields.map((field) => (
        <div key={field.label} className="flex flex-col gap-1">
          <dt className="text-xs text-ink-faint">{field.label}</dt>
          <dd className="text-md font-semibold text-ink">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function buildRecordMetaFields(input: {
  refLabel: string | null;
  publishedAt: string;
  issueNumber: number;
  section: string;
  institution?: { slug: string; name: string } | null;
  primaryTopic?: { slug: string; name: string } | null;
}): MetaField[] {
  const fields: MetaField[] = [];

  if (input.refLabel) fields.push({ label: 'Referans', value: input.refLabel });

  fields.push({
    label: 'Yayım',
    value: <time dateTime={input.publishedAt}>{formatDateLong(input.publishedAt)}</time>,
  });

  fields.push({
    label: 'Gazete',
    value: 'Sayı ' + input.issueNumber + ', ' + sectionShort(input.section),
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

  return fields;
}
