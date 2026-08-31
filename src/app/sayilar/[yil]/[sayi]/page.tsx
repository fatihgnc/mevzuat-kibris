import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { MaskedText } from '@/components/masked-text';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TextQualityBadge } from '@/components/text-quality-badge';
import { TopicDot } from '@/components/topic-badge';
import { SECTIONS, SECTION_DESCRIPTION, SECTION_SHORT, isSection } from '@/lib/constants/sections';
import { adjacentIssues, getIssue, getIssueSections } from '@/lib/db/queries/issues';
import { recordHref } from '@/lib/db/queries/shared';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { formatDateLong } from '@/lib/text/dates';

/** ISR 30 gün — yayımlanmış bir sayı değişmiyor (spec 11.1). */
export const revalidate = 2592000;
export const dynamicParams = true;

type Props = { params: Promise<{ yil: string; sayi: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { yil, sayi } = await params;
  const issue = await getIssue(Number(yil), Number(sayi));
  if (!issue) return { title: 'Sayı bulunamadı' };

  return buildMetadata({
    title: 'Resmî Gazete sayı ' + issue.number + '/' + issue.year,
    description:
      formatDateLong(issue.publishedAt) +
      ' tarihli KKTC Resmî Gazete sayı ' +
      issue.number +
      ' içindekiler: ' +
      issue.recordCount +
      ' kayıt, bölüm bölüm okunabilir hâlde.',
    path: '/sayilar/' + issue.year + '/' + issue.number,
  });
}

export default async function IssuePage({ params }: Props) {
  const { yil, sayi } = await params;
  const year = Number(yil);
  const number = Number(sayi);
  if (!Number.isInteger(year) || !Number.isInteger(number)) notFound();

  const issue = await getIssue(year, number);
  if (!issue) notFound();

  const [sections, adjacent] = await Promise.all([
    getIssueSections(issue.id),
    adjacentIssues(year, number),
  ]);

  // Bölümler gazetenin kendi sırasında; bilinmeyen bölüm varsa sona düşüyor.
  const ordered = [...sections].sort((a, b) => {
    const ai = SECTIONS.indexOf(a.section as never);
    const bi = SECTIONS.indexOf(b.section as never);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    { name: 'Sayılar', href: '/sayilar' },
    { name: String(year), href: '/sayilar/' + year },
    { name: 'Sayı ' + number },
  ];

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          Resmî Gazete sayı {number}
        </h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-base text-ink-muted">
          <time dateTime={issue.publishedAt}>{formatDateLong(issue.publishedAt)}</time>
          <span aria-hidden className="h-3 w-px bg-line" />
          <span>{issue.recordCount} kayıt</span>
          {issue.pageCount ? (
            <>
              <span aria-hidden className="h-3 w-px bg-line" />
              <span>{issue.pageCount} sayfa</span>
            </>
          ) : null}
          <TextQualityBadge status={issue.textStatus} quality={issue.textQuality} />
        </div>

        <div className="mt-5">
          <a
            href={issue.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded border border-ink bg-surface px-[18px] py-2.5 text-md font-semibold text-ink no-underline transition-colors hover:bg-ink hover:text-surface hover:no-underline"
          >
            Resmî PDF&apos;i aç
          </a>
        </div>

        {ordered.map((group) => (
          <section key={group.section} className="mt-9">
            <h2 className="text-3xl font-semibold text-ink">
              {isSection(group.section) ? SECTION_SHORT[group.section] : group.section}
            </h2>
            {isSection(group.section) ? (
              <p className="mt-1 text-base text-ink-muted">
                {SECTION_DESCRIPTION[group.section]}
              </p>
            ) : null}

            <ul className="mt-3.5 flex flex-col">
              {group.records.map((record) => (
                <li
                  key={record.id}
                  // İnce kayıtların kendi sayfası yok; anchor buraya (spec 8.2 madde 2).
                  id={record.refLabel ? 'karar-' + record.refLabel : undefined}
                  className="scroll-mt-24 border-b border-line-soft py-3.5"
                >
                  <div className="flex flex-col gap-1.5">
                    {record.hasOwnPage ? (
                      <Link
                        href={recordHref(record)}
                        className="text-lg font-medium leading-[1.4] text-ink no-underline hover:text-accent hover:no-underline"
                      >
                        {record.summary ?? <MaskedText tokens={record.titleTokens} />}
                      </Link>
                    ) : (
                      /*
                       * Kendi sayfası olmayan kayıt burada tam hâliyle duruyor:
                       * sayfası yok diye bilgi kaybolmuyor, yalnızca ayrı bir URL
                       * almıyor.
                       */
                      <span className="text-lg font-medium leading-[1.4] text-ink">
                        {record.summary ?? <MaskedText tokens={record.titleTokens} />}
                      </span>
                    )}

                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
                      {record.refLabel ? (
                        <span className="text-ink-fainter">{record.refLabel}</span>
                      ) : null}
                      {record.primaryTopic ? (
                        <Link
                          href={'/konu/' + record.primaryTopic}
                          className="inline-flex items-center gap-1.5 text-ink-muted no-underline hover:text-accent hover:no-underline"
                        >
                          <TopicDot topic={record.primaryTopic} />
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

        <nav className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-5 text-base">
          {adjacent.prev ? (
            <Link href={'/sayilar/' + adjacent.prev.year + '/' + adjacent.prev.number} rel="prev">
              ← Sayı {adjacent.prev.number}
            </Link>
          ) : (
            <span />
          )}
          {adjacent.next ? (
            <Link href={'/sayilar/' + adjacent.next.year + '/' + adjacent.next.number} rel="next">
              Sayı {adjacent.next.number} →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
    </>
  );
}
