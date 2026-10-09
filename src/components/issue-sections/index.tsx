import Link from 'next/link';

import { MaskedText } from '@/components/masked-text';
import { SECTIONS, SECTION_DESCRIPTION, SECTION_SHORT, isSection } from '@/lib/constants/sections';
import { recordHref } from '@/lib/db/queries/shared';
import type { RecordListItem } from '@/types/record';

interface IssueSectionsProps {
  sections: Array<{ section: string; records: RecordListItem[] }>;
  /**
   * The section headings' level. h2 on an issue's own page; h3 on /bugun, where
   * each issue already has an h2 of its own above its sections.
   */
  headingLevel?: 'h2' | 'h3';
  /**
   * Whether thin records carry their `karar-…` anchor. Only one page may own
   * those ids — the issue page, which is where every record link points — so
   * /bugun, which repeats the same records, renders without them.
   */
  withAnchors?: boolean;
}

/** An issue's table of contents, section by section — shared by /sayilar/[yil]/[sayi] and /bugun. */
export function IssueSections({ sections, headingLevel = 'h2', withAnchors = true }: IssueSectionsProps) {
  const Heading = headingLevel;

  // Sections in the gazette's own order; an unknown section falls to the end.
  const ordered = [...sections].sort((a, b) => {
    const ai = SECTIONS.indexOf(a.section as never);
    const bi = SECTIONS.indexOf(b.section as never);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <>
      {ordered.map((group) => (
        <section key={group.section} className="mt-9">
          <Heading className={headingLevel === 'h2' ? 'text-3xl font-semibold text-ink' : 'text-2xl font-semibold text-ink'}>
            {isSection(group.section) ? SECTION_SHORT[group.section] : group.section}
          </Heading>
          {isSection(group.section) ? (
            <p className="mt-1 text-base text-ink-muted">{SECTION_DESCRIPTION[group.section]}</p>
          ) : null}

          <ul className="mt-3.5 flex flex-col">
            {group.records.map((record) => (
              <li
                key={record.id}
                // Thin records have no page of their own; the anchor points here (spec 8.2 rule 2).
                id={withAnchors && record.refLabel ? 'karar-' + record.refLabel : undefined}
                className="scroll-mt-24 border-b border-line-soft py-3.5"
              >
                <div className="flex flex-col gap-1.5">
                  {record.hasOwnPage ? (
                    <Link
                      href={recordHref(record)}
                      className="text-lg font-medium leading-[1.4] hover:text-link"
                    >
                      {record.summary ?? <MaskedText tokens={record.titleTokens} />}
                    </Link>
                  ) : (
                    /*
                     * A record with no page of its own appears here in full: it
                     * loses no information for lacking a page, it simply gets no
                     * separate URL.
                     */
                    <span className="text-lg font-medium leading-[1.4] text-ink">
                      {record.summary ?? <MaskedText tokens={record.titleTokens} />}
                    </span>
                  )}

                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                    {record.refLabel ? <span className="text-ink-fainter">{record.refLabel}</span> : null}
                    {record.primaryTopic ? (
                      <Link
                        href={'/konu/' + record.primaryTopic}
                        className="inline-flex items-center gap-1.5 text-ink-muted no-underline hover:text-accent hover:no-underline"
                      >
                        {record.docTypeLabel}
                      </Link>
                    ) : (
                      <span>{record.docTypeLabel}</span>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
