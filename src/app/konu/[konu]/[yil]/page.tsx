import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { Pagination } from '@/components/pagination';
import { RecordList } from '@/components/record-list';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { YearNav } from '@/components/year-nav';
import { TOPICS, isTopicSlug } from '@/lib/constants/topics';
import { countRecords, listRecords } from '@/lib/db/queries/records';
import { formatCount } from '@/lib/db/queries/shared';
import { ARCHIVE_START_YEAR, PAGE_SIZE } from '@/lib/seo/config';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

export const revalidate = 3600;
export const dynamicParams = true;

type Props = {
  params: Promise<{ konu: string; yil: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseYear(value: string): number | null {
  const year = Number(value);
  if (!Number.isInteger(year)) return null;
  if (year < ARCHIVE_START_YEAR || year > new Date().getFullYear() + 1) return null;
  return year;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { konu, yil } = await params;
  const year = parseYear(yil);
  if (!isTopicSlug(konu) || year === null) return { title: 'Sayfa bulunamadı' };

  const topic = TOPICS[konu];
  const page = Number((await searchParams).sayfa ?? 1);

  return buildMetadata({
    title: year + ' yılı ' + topic.name.toLocaleLowerCase('tr') + ' kayıtları',
    description:
      year + ' yılında Resmî Gazete’de yayımlanan ' +
      topic.name.toLocaleLowerCase('tr') +
      ' kayıtları, tarih sırasıyla. ' +
      topic.blurb +
      '.',
    path: '/konu/' + konu + '/' + year,
    page,
  });
}

export default async function TopicYearPage({ params, searchParams }: Props) {
  const { konu, yil } = await params;
  const year = parseYear(yil);
  if (!isTopicSlug(konu) || year === null) notFound();

  const page = Math.max(1, Number((await searchParams).sayfa ?? 1) || 1);
  const topic = TOPICS[konu];

  const [records, total] = await Promise.all([
    listRecords({ topic: konu, year, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countRecords({ topic: konu, year }),
  ]);

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - ARCHIVE_START_YEAR + 1 },
    (_, index) => currentYear - index,
  );

  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    { name: topic.name, href: '/konu/' + konu },
    { name: String(year) },
  ];

  const basePath = '/konu/' + konu + '/' + year;

  return (
    <>
      <SiteHeader variant="search" searchActive={false} />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <div className="flex items-center gap-2.5">
          <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
            {year} yılı {topic.name.toLocaleLowerCase('tr')} kayıtları
          </h1>
        </div>

        <p className="mt-3 text-base text-ink-muted">
          <span className="font-semibold text-ink">{formatCount(total)} kayıt</span> ·{' '}
          <Link href={'/konu/' + konu}>tüm yıllar</Link>
        </p>

        <div className="mt-6">
          <RecordList
            records={records}
            hideTopic
            showDeadline={konu === 'munhal' || konu === 'ihale'}
            adSlotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED}
            emptyMessage={year + ' yılında bu konuda kayıt bulunamadı.'}
          />
        </div>

        <Pagination
          className="mt-[22px]"
          page={page}
          totalPages={Math.max(1, Math.ceil(total / PAGE_SIZE))}
          hrefFor={(next) => (next > 1 ? basePath + '?sayfa=' + next : basePath)}
        />

        <div className="mt-9 border-t border-line pt-5">
          <h2 className="mb-3 text-md font-semibold text-ink">Diğer yıllar</h2>
          <YearNav
            years={years}
            current={year}
            hrefFor={(value) => '/konu/' + konu + '/' + value}
            allHref={'/konu/' + konu}
          />
        </div>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
    </>
  );
}
