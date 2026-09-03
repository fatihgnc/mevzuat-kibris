import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { TOPIC_LIST } from '@/lib/constants/topics';
import { archiveCoverage, coverageSentence } from '@/lib/db/queries/coverage';
import { topicCounts } from '@/lib/db/queries/records';
import { formatCount } from '@/lib/db/queries/shared';
import { buildMetadata } from '@/lib/seo/metadata';

// The same ISR window as the topic pages (spec 11.1).
export const revalidate = 3600;

/**
 * BOTH THE COUNT AND THE LIST COME FROM TOPIC_LIST — neither is typed out.
 *
 * The description used to name eight topics by hand. `yurttaslik` arrived with
 * migration 0008 and nobody came back here, so the page describing the topics was
 * the one page on the site that did not know about all of them. Hardcoding a count
 * next to a list that grows is the same mistake ARCHIVE_START_YEAR is centralised
 * to avoid.
 */
const TOPIC_NAMES = TOPIC_LIST.map((topic) => topic.name.toLocaleLowerCase('tr')).join(', ');

export const metadata: Metadata = buildMetadata({
  title: 'Konular',
  description:
    'Resmî Gazete kayıtları ' +
    TOPIC_LIST.length +
    ' konuya ayrılıyor: ' +
    TOPIC_NAMES +
    '. Her akış kronolojik.',
  path: '/konu',
});

/**
 * The topic index.
 *
 * The "Konular" link in the header used to go straight to `/konu/munhal`: a plural
 * label opened a single topic, the other seven were unreachable from there, and a
 * user with no interest in vacancies started on the wrong page. This page fills that
 * gap.
 *
 * The numbers come FROM THE DATA (spec 8.4): if there are no records, no number is
 * written — writing nothing is preferred to writing zero, because a claim with no
 * data behind it is worse than making no claim.
 */
export default async function TopicsPage() {
  const [counts, coverage] = await Promise.all([topicCounts(), archiveCoverage()]);

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={[{ name: 'Ana sayfa', href: '/' }, { name: 'Konular' }]} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          Konular
        </h1>
        <p className="mt-3 text-xl leading-[1.6] text-ink-body">
          Her kayıt yayımlandığı bölüme ve başlığına göre sınıflandırılıyor. Bir kayıt birden fazla
          konuya girebilir. {coverageSentence(coverage)}
        </p>

        <ul className="mt-8 flex flex-col">
          {TOPIC_LIST.map((topic) => {
            const count = counts[topic.slug] ?? 0;

            return (
              <li key={topic.slug}>
                <Link
                  href={'/konu/' + topic.slug}
                  className="flex flex-col gap-1 border-b border-line-soft py-4 no-underline hover:bg-surface-hover hover:no-underline"
                >
                  <span className="flex items-baseline gap-2.5">
                    <span className="text-xl font-medium leading-[1.38] text-ink">{topic.name}</span>
                    {count > 0 ? (
                      <span className="text-base text-ink-fainter">{formatCount(count)} kayıt</span>
                    ) : null}
                  </span>
                  <span className="text-base leading-[1.5] text-ink-muted">{topic.blurb}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>

      <SiteFooter />
    </>
  );
}
