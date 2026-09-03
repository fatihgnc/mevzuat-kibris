import type { Metadata } from 'next';
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
import { buildMetadata } from '@/lib/seo/metadata';
import { pageHref } from '@/lib/seo/pagination';
import { breadcrumbJsonLd, institutionJsonLd } from '@/lib/seo/json-ld';
import { ENTITY_LABEL, ENTITY_LABEL_PLURAL, ENTITY_PATH } from '@/types/entity';
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

  const [records, total, neighbours] = await Promise.all([
    listRecords({ entitySlug: slug, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
    countRecords({ entitySlug: slug }),
    coOccurring(entity.id, 8),
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
            __html: JSON.stringify(institutionJsonLd({ name: entity.name, slug })),
          }}
        />
      ) : null}
    </>
  );
}
