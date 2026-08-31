import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { FollowCard } from '@/components/follow-card';
import { Pagination } from '@/components/pagination';
import { RecordList } from '@/components/record-list';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { coOccurring, getEntity } from '@/lib/db/queries/entities';
import { countRecords, listRecords } from '@/lib/db/queries/records';
import { formatCount } from '@/lib/db/queries/shared';
import { PAGE_SIZE } from '@/lib/seo/config';
import { breadcrumbJsonLd, institutionJsonLd } from '@/lib/seo/json-ld';
import { ENTITY_LABEL, ENTITY_PATH } from '@/types/entity';
import type { EntityKind } from '@/types/record';

const INTRO: Record<EntityKind, (name: string) => string> = {
  institution: (name) =>
    name + ' tarafından ya da adına Resmî Gazete’de yayımlanan kayıtlar; en yeniden eskiye.',
  company: (name) =>
    name + ' ile ilgili şirket sicil hareketleri, ihale ve marka ilanları; en yeniden eskiye.',
  place: (name) =>
    name + ' adının geçtiği kamulaştırma, imar ve altyapı kararları; en yeniden eskiye.',
};

/**
 * Kurum / şirket / yer sayfası — spec 9.6, üçü de aynı şablon.
 *
 * Boş varlık sayfası üretilmiyor: record_count < 2 olan varlıklar sorgudan
 * dönmüyor ve burada 404 alıyor (spec 8.2 madde 3). İnce içerik sayfası
 * üretmek 100 bin sayfalık bir sitede indekslenme riskini artırır.
 */
export async function EntityPage({
  kind,
  slug,
  page,
}: {
  kind: EntityKind;
  slug: string;
  page: number;
}) {
  const entity = await getEntity(kind, slug);
  if (!entity || entity.recordCount < 2) notFound();

  const [records, total, neighbours] = await Promise.all([
    listRecords({ entitySlug: slug, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countRecords({ entitySlug: slug }),
    coOccurring(entity.id, 8),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const basePath = ENTITY_PATH[kind] + '/' + slug;

  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    { name: ENTITY_LABEL[kind] },
    { name: entity.name },
  ];

  return (
    <>
      <SiteHeader variant="search" searchActive={false} />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <div className="grid items-start gap-10 lg:grid-cols-page">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-ink-faint">{ENTITY_LABEL[kind]}</p>
            <h1 className="m-0 mt-1 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
              {entity.name}
            </h1>
            {entity.district ? (
              <p className="mt-1 text-md text-ink-muted">{entity.district}</p>
            ) : null}

            <p className="mt-3 max-w-prose text-xl leading-[1.6] text-ink-body">
              {INTRO[kind](entity.name)}
            </p>

            <p className="mt-4 text-base text-ink-muted">
              <span className="font-semibold text-ink">{formatCount(total)} kayıt</span>
            </p>

            <div className="mt-6">
              <RecordList
                records={records}
                adSlotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED}
                emptyMessage="Bu sayfada kayıt yok."
              />
            </div>

            <Pagination
              className="mt-[22px]"
              page={page}
              totalPages={totalPages}
              hrefFor={(next) => (next > 1 ? basePath + '?sayfa=' + next : basePath)}
            />

            {neighbours.length ? (
              <section className="mt-9 border-t border-line pt-6">
                <h2 className="mb-3 text-md font-semibold text-ink">En çok birlikte geçenler</h2>
                <ul className="flex flex-wrap gap-2">
                  {neighbours.map((neighbour) => (
                    <li key={neighbour.id}>
                      <Link
                        href={ENTITY_PATH[neighbour.kind] + '/' + neighbour.slug}
                        className="inline-flex items-center gap-2 rounded border border-line bg-surface px-3 py-1.5 text-base text-ink no-underline hover:border-accent hover:text-accent hover:no-underline"
                      >
                        {neighbour.name}
                        <span className="text-sm text-ink-fainter">{neighbour.sharedRecords}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="flex flex-col gap-[18px]">
            <FollowCard
              title={entity.name + ' takibi'}
              description={
                kind === 'place'
                  ? 'Bu yerle ilgili yeni kayıt yayımlanırsa haber veririz.'
                  : 'Bu ' +
                    ENTITY_LABEL[kind].toLocaleLowerCase('tr') +
                    ' ile ilgili yeni kayıt yayımlanırsa haber veririz.'
              }
              subject={{ label: entity.name, entityId: entity.id }}
              rssHref={basePath + '/rss.xml'}
            />
          </aside>
        </div>
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      {kind === 'institution' ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              institutionJsonLd({ name: entity.name, slug, recordCount: total }),
            ),
          }}
        />
      ) : null}
    </>
  );
}
