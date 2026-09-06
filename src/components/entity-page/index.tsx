import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { FilterSheet } from '@/components/filter-sheet';
import { SearchFilters } from '@/components/search-filters';
import { FollowDialog } from '@/components/follow-dialog';
import { Pagination } from '@/components/pagination';
import { RecordList } from '@/components/record-list';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { coOccurring, getEntity } from '@/lib/db/queries/entities';
import { countRecords, listRecords, searchFacets } from '@/lib/db/queries/records';
import { archiveCoverage } from '@/lib/db/queries/coverage';
import { parseSearchParams } from '@/lib/search/build-query';
import { entityLede } from '@/lib/seo/lede';
import { PAGE_SIZE } from '@/lib/seo/config';
import { buildMetadata } from '@/lib/seo/metadata';
import { pageHref } from '@/lib/seo/pagination';
import { breadcrumbJsonLd, institutionJsonLd } from '@/lib/seo/json-ld';
import { ENTITY_LABEL, ENTITY_LABEL_PLURAL, ENTITY_PATH } from '@/types/entity';
import type { EntityKind } from '@/types/record';

/** Which /ara parameter pins this kind of entity — see searchParamsSchema. */
const PIN_PARAM: Record<EntityKind, 'kurum' | 'sirket' | 'yer'> = {
  institution: 'kurum',
  company: 'sirket',
  place: 'yer',
};

const INTRO: Record<EntityKind, (name: string) => string> = {
  institution: (name) =>
    name + ' tarafından ya da adına Resmî Gazete’de yayımlanan kayıtlar; en yeniden eskiye.',
  company: (name) =>
    name + ' ile ilgili şirket sicil hareketleri, ihale ve marka ilanları; en yeniden eskiye.',
  place: (name) =>
    name + ' adının geçtiği kamulaştırma, imar ve altyapı kararları; en yeniden eskiye.',
};

/**
 * The metadata for one entity page, shared by the base route and its /sayfa/[n]
 * sibling. It lives here so the two routes cannot describe the same entity
 * differently — `path` is the only thing that differs between them, and it is
 * passed in rather than rebuilt.
 */
export async function entityMetadata(
  kind: EntityKind,
  slug: string,
  page: number,
): Promise<Metadata> {
  const entity = await getEntity(kind, slug);
  if (!entity) return { title: ENTITY_LABEL[kind] + ' bulunamadı' };

  const basePath = ENTITY_PATH[kind] + '/' + slug;

  return buildMetadata({
    title: entity.name + ' — Resmî Gazete kayıtları',
    description:
      entity.name +
      ' adının geçtiği KKTC Resmî Gazete kayıtları, tarih sırasıyla. Her kayıt orijinal PDF sayfasına bağlı.',
    path: pageHref(basePath, page),
    feedPath: basePath + '/rss.xml',
    page,
  });
}

/**
 * Institution / company / place page — spec 9.6; all three share one template.
 *
 * Empty entity pages are not generated: entities with record_count < 2 are not
 * returned by the query and get a 404 here (spec 8.2 rule 3). Producing thin
 * content pages raises the indexing risk on a 100k-page site.
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

  /*
   * THE RAIL HANDS OFF TO /ara; IT DOES NOT FILTER THIS PAGE.
   *
   * Filtering in place would mean reading `searchParams` here, and in the App
   * Router a route that touches searchParams is dynamic — ALL of it, for every
   * request. These are the entity pages: thousands of them, and the ones search
   * engines actually land on. Every visit would become a database round trip to
   * save a redirect.
   *
   * So the rail is pinned to this entity and submits to /ara. The page stays
   * prerendered, and the filtered view is the search screen, which is already
   * built to show what is applied and let you take it off again. It also buys
   * more than filtering here could: the full set — words, topic, document type,
   * year, date range — rather than the dates a static page could have managed.
   */
  const pinned = parseSearchParams({ [PIN_PARAM[kind]]: slug });

  const [records, total, neighbours, facets, coverage] = await Promise.all([
    listRecords({ entitySlug: slug, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countRecords({ entitySlug: slug }),
    coOccurring(entity.id, 8),
    searchFacets(pinned),
    archiveCoverage(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const basePath = ENTITY_PATH[kind] + '/' + slug;

  /*
   * The middle step used to be a bare label with no href, because the page it
   * would have pointed at did not exist. It does now (/kurum, /sirket, /yer), so
   * the crumb both links and takes the plural name of its destination.
   */
  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    { name: ENTITY_LABEL_PLURAL[kind], href: ENTITY_PATH[kind] },
    { name: entity.name },
  ];

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <div className="grid items-start gap-10 lg:grid-cols-feed">
          {/*
           * Two presentations of one rail, the same pair as /ara: a column on a
           * wide screen, a button and a sheet on a narrow one. `scope` keeps the
           * two copies' input ids apart — both are in the DOM at once.
           *
           * `activeCount` is 0 on purpose. The entity pin is not something the
           * visitor applied and cannot be taken off here, so counting it would
           * put a "1" on a button whose sheet shows nothing ticked.
           */}
          {/*
            * `lg:h-full` — the sticky rail needs a container TALLER than itself,
            * and this grid has `items-start`, which shrinks the cell to the
            * rail's own height and leaves `position: sticky` nowhere to move.
            * Height resolves against the grid area, so it works whatever the
            * alignment is. See the longer note in /ara/page.tsx.
            */}
          <div className="hidden min-w-0 lg:block lg:h-full">
            <SearchFilters
              params={pinned}
              facets={facets}
              coverage={coverage}
              scope="rail"
              pinned
            />
          </div>

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

            {/*
              * The count as a SENTENCE, not a bare number. "12.803 kayıt" on its
              * own says nothing quotable: no subject, no period covered, no sense
              * of whether the archive is current. See lib/seo/lede.ts.
              *
              * `records[0]` is the newest because the list is ordered that way,
              * and it is absent only on a page past the last one.
              */}
            {/*
              * The count sentence and the follow link share a line — one row at
              * the top of the feed rather than a card at the bottom of it.
              */}
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-[18px] gap-y-2">
              <p className="m-0 text-base text-ink-muted">
                {entityLede(entity.name, total, records[0]?.publishedAt)}
              </p>
              <FollowDialog
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
            </div>

            {/*
              * The sheet's button belongs HERE on a narrow screen, not up in the
              * rail's grid cell. Put there it rendered above the breadcrumb's
              * page — a button to narrow a list, standing before the heading that
              * says what the list is. The name of the entity is what the page is
              * for; the filter comes once you have read it and want less.
              */}
            <div className="mt-6 lg:hidden">
              <FilterSheet activeCount={0}>
                <SearchFilters
                  params={pinned}
                  facets={facets}
                  coverage={coverage}
                  scope="sheet"
                  pinned
                />
              </FilterSheet>
            </div>

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
              hrefFor={(next) => pageHref(basePath, next)}
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

          {/*
            * The follow and RSS cards travel with the scroll, the way the home
            * page's side column does. They are the page's two actions and the
            * feed above them is hundreds of rows long; anchored at the top they
            * were only reachable by scrolling back.
            *
            * TWO ELEMENTS, DELIBERATELY. The <aside> is the tall one and the div
            * inside it is what sticks — a sticky element can only move inside its
            * own containing block, and this grid is `items-start`, which shrinks
            * the cell to its content and leaves nothing to move in. `lg:h-full`
            * resolves against the grid area, so the cell takes the row's height
            * whatever the alignment says. Same trap as the filter rail's, written
            * up in /ara/page.tsx.
            *
            * The height cap plus its own scroller is for short windows: the two
            * cards are around 500px and a pinned column taller than the viewport
            * would hide its own bottom with no way to reach it.
            */}
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
            __html: JSON.stringify(institutionJsonLd({ name: entity.name, slug })),
          }}
        />
      ) : null}
    </>
  );
}
