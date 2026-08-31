import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { FollowCard } from '@/components/follow-card';
import { Pagination } from '@/components/pagination';
import { RecordList } from '@/components/record-list';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { YearNav } from '@/components/year-nav';
import { TOPICS, TOPIC_SLUGS, isTopicSlug } from '@/lib/constants/topics';
import { archiveCoverage, coverageRange } from '@/lib/db/queries/coverage';
import { countRecords, listRecords } from '@/lib/db/queries/records';
import { formatCount } from '@/lib/db/queries/shared';
import { ARCHIVE_START_YEAR, PAGE_SIZE, SITE_URL } from '@/lib/seo/config';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { formatDateLong } from '@/lib/text/dates';
import { cn } from '@/lib/utils';

// ISR + tag: revalidateTag('topic:{slug}') ingest sonrası tazeler (spec 11.1).
export const revalidate = 3600;

export function generateStaticParams() {
  return TOPIC_SLUGS.map((konu) => ({ konu }));
}

type Props = {
  params: Promise<{ konu: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { konu } = await params;
  if (!isTopicSlug(konu)) return { title: 'Konu bulunamadı' };

  const topic = TOPICS[konu];
  const page = Number((await searchParams).sayfa ?? 1);

  return buildMetadata({
    title: topic.name + ' — KKTC Resmî Gazete kayıtları',
    description: topic.description,
    path: '/konu/' + konu,
    page,
  });
}

export default async function TopicPage({ params, searchParams }: Props) {
  const { konu } = await params;
  if (!isTopicSlug(konu)) notFound();

  const query = await searchParams;
  const page = Math.max(1, Number(query.sayfa ?? 1) || 1);
  const openOnly = query.filtre === 'acik';
  const topic = TOPICS[konu];

  /*
   * "Başvurusu açık" filtresi yalnızca son başvuru tarihi taşıyan konularda
   * anlamlı (spec 3.9): münhal ve ihale. Diğer konularda hiç gösterilmiyor,
   * çünkü her zaman sıfır sonuç verecek bir filtre kullanıcıyı yanıltır.
   */
  const supportsDeadline = konu === 'munhal' || konu === 'ihale';

  const [records, total, openCount, coverage] = await Promise.all([
    listRecords({
      topic: konu,
      openDeadlineOnly: supportsDeadline && openOnly,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countRecords({ topic: konu, openDeadlineOnly: supportsDeadline && openOnly }),
    supportsDeadline ? countRecords({ topic: konu, openDeadlineOnly: true }) : Promise.resolve(0),
    archiveCoverage(konu),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const latest = records[0];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, index) => currentYear - index).filter(
    (year) => year >= ARCHIVE_START_YEAR,
  );

  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    { name: 'Konular', href: '/' },
    { name: topic.name },
  ];

  const hrefFor = (nextPage: number) => {
    const search = new URLSearchParams();
    if (openOnly) search.set('filtre', 'acik');
    if (nextPage > 1) search.set('sayfa', String(nextPage));
    const qs = search.toString();
    return '/konu/' + konu + (qs ? '?' + qs : '');
  };

  return (
    <>
      <SiteHeader variant="search" searchActive={false} />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <div className="grid items-start gap-10 lg:grid-cols-page">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
                {topic.name}
              </h1>
            </div>

            {/* Özgün konu açıklaması — ince içerik olmaması için (spec 8.2, 14.5). */}
            <p className="mt-3 max-w-prose text-xl leading-[1.6] text-ink-body">
              {topic.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-[18px] gap-y-2 text-base text-ink-muted">
              <span>
                <span className="font-semibold text-ink">{formatCount(total)} kayıt</span>
                {coverageRange(coverage) ? ', ' + coverageRange(coverage) : null}
              </span>
              {latest ? (
                <>
                  <span aria-hidden className="h-3 w-px bg-line" />
                  <span>Son kayıt {formatDateLong(latest.publishedAt)}</span>
                </>
              ) : null}
            </div>

            {/*
              Sıfır sayılı bir filtre düğmesi göstermek anlamsız: tıklayan boş
              liste alıyor. Son başvuru tarihi ancak münhal/ihale kayıtlarının
              GÖVDESİNDEN çıkarılabiliyor (extractDeadline); gövdesi olmayan
              kayıtta çıkarılamıyor ve şu an arşivde tarihi olan tek bir kayıt
              var, yani düğme neredeyse her zaman "0" diyordu.

              openOnly şartı, filtre AÇIKKEN düğmenin kaybolmamasını sağlıyor —
              yoksa kullanıcı boş listede kalır ve geri dönecek düğme olmaz.
            */}
            {supportsDeadline && (openCount > 0 || openOnly) ? (
              <div className="mb-1 mt-[26px] flex flex-wrap items-center gap-2 border-b border-line pb-3.5">
                <Link
                  href={'/konu/' + konu + '?filtre=acik'}
                  className={cn(
                    'rounded-pill px-3.5 py-1.5 text-base no-underline hover:no-underline',
                    openOnly
                      ? 'bg-ink font-semibold text-surface hover:text-surface'
                      : 'border border-line text-ink-body hover:border-accent hover:text-accent',
                  )}
                >
                  Başvurusu açık, {openCount}
                </Link>
                <Link
                  href={'/konu/' + konu}
                  className={cn(
                    'rounded-pill px-3.5 py-1.5 text-base no-underline hover:no-underline',
                    !openOnly
                      ? 'bg-ink font-semibold text-surface hover:text-surface'
                      : 'border border-line text-ink-body hover:border-accent hover:text-accent',
                  )}
                >
                  Tüm kayıtlar
                </Link>
              </div>
            ) : null}

            <RecordList
              records={records}
              hideTopic
              showDeadline={supportsDeadline}
              adSlotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED}
              emptyMessage={
                openOnly
                  ? 'Şu anda başvurusu açık kayıt yok. Tüm kayıtlara bakın.'
                  : 'Bu konuda henüz kayıt yok.'
              }
            />

            <Pagination className="mt-[22px]" page={page} totalPages={totalPages} hrefFor={hrefFor} />

            <div className="mt-8 border-t border-line pt-5">
              <h2 className="mb-3 text-md font-semibold text-ink">Yıla göre</h2>
              <YearNav
                years={years}
                hrefFor={(year) => '/konu/' + konu + '/' + year}
                allHref={'/konu/' + konu}
              />
            </div>
          </div>

          <aside className="flex flex-col gap-[18px]">
            <FollowCard
              title="Bu konuyu takip et"
              description={'Yeni ' + topic.name.toLocaleLowerCase('tr') + ' kaydı yayımlandığı gün haber veririz.'}
              subject={{ label: topic.name, topic: konu }}
            />

            <div className="rounded-md border border-line bg-surface-muted p-[18px]">
              <div className="mb-1.5 text-md font-semibold text-ink">RSS</div>
              <p className="mb-3 text-sm leading-[1.5] text-ink-muted">
                E-posta vermek istemiyorsanız akışı okuyucunuza ekleyin. Aynı kayıtlar, aynı sırada.
              </p>
              <div className="overflow-hidden text-ellipsis whitespace-nowrap rounded border border-line-strong bg-surface px-[11px] py-2.5 text-sm text-ink-body">
                {SITE_URL.replace(/^https?:\/\//, '')}/konu/{konu}/rss.xml
              </div>
              <div className="mt-2 text-sm">
                <Link href={'/konu/' + konu + '/rss.xml'}>Akışı aç</Link>
              </div>
            </div>

            {supportsDeadline && openCount > 0 ? (
              <p className="border-t border-line pt-4 text-sm leading-[1.55] text-ink-muted">
                Başvuru tarihleri kayıt metninden çıkarılmıştır. Kesin tarih için resmî PDF&apos;e
                bakın.
              </p>
            ) : null}
          </aside>
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
