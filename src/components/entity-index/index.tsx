import type { Metadata } from 'next';
import Link from 'next/link';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { EmptyState } from '@/components/empty-state';
import { Pagination } from '@/components/pagination';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { countEntities, listEntities } from '@/lib/db/queries/entities';
import { formatCount } from '@/lib/db/queries/shared';
import { ENTITY_INDEX_PAGE_SIZE } from '@/lib/seo/config';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { pageHref } from '@/lib/seo/pagination';
import { ENTITY_LABEL_PLURAL, ENTITY_PATH } from '@/types/entity';
import type { EntityKind } from '@/types/record';

/**
 * The institution / company / place index — one template for all three, the same
 * arrangement `EntityPage` uses for the detail pages.
 *
 * WHY THESE PAGES EXIST. Every entity with two or more records is announced in the
 * sitemap, but until now the only way to reach one by navigating was the footer's
 * twenty most active institutions and the "co-occurring" chips on a record page.
 * Companies and places had no path at all: a crawler could only find them from the
 * sitemap or from whichever record happened to mention them. `/konu` closed exactly
 * this gap for topics; this closes it for entities.
 *
 * The breadcrumb on the detail page also had no destination for its middle step —
 * it was a bare label with no href because there was no page to point at. It links
 * here now.
 */

/**
 * The page's own copy. Exported because the route files need the same words for
 * `generateMetadata`, and a description that disagrees with the paragraph under the
 * h1 is a description written twice.
 *
 * `intro` is what keeps these pages off the thin-content pile (spec 8.2, 14.5): a
 * hub whose entire body is a list of links is a sitemap with styling. Each one says
 * what kind of document puts an entity in this list, which is genuinely the thing a
 * reader arriving from search needs to know.
 */
export const ENTITY_INDEX_COPY: Record<
  EntityKind,
  { title: string; description: string; intro: string; unit: string }
> = {
  institution: {
    title: 'Kurumlar — KKTC Resmî Gazete kayıtları',
    description:
      'Resmî Gazete’de adı geçen bakanlık, daire, kurul ve belediyeler. Her kurumun kayıtları tarih sırasıyla ve orijinal PDF bağlantılarıyla.',
    intro:
      'Resmî Gazete’de adı geçen bakanlıklar, daireler, kurullar ve belediyeler. Bir kurumun sayfasında, o kurum tarafından ya da onun adına yayımlanan münhal ilanları, ihaleler, tüzükler ve emirnameler en yeniden eskiye sıralanır.',
    unit: 'kurum',
  },
  company: {
    title: 'Şirketler — KKTC Resmî Gazete kayıtları',
    description:
      'Şirketler Mukayyitliği ilanlarında, ihale ve marka kayıtlarında adı geçen şirketler. Tescil, isim değişikliği ve tasfiye hareketleri bir arada.',
    intro:
      'Şirketler Mukayyitliği ilanlarında, marka tescil müracaatlarında ve ihale kararlarında adı geçen şirketler. Bir şirketin tescili, isim değişikliği, tasfiyesi ve sicilden silinmesi tek sayfada, olduğu sırayla toplanır.',
    unit: 'şirket',
  },
  place: {
    title: 'Yerler — KKTC Resmî Gazete kayıtları',
    description:
      'Kamulaştırma, imar ve altyapı kararlarında adı geçen bölge, köy ve mahalleler. Her yerin kayıtları tarih sırasıyla.',
    intro:
      'Kamulaştırma ihbarları ve emirleri, imar kararları ve altyapı düzenlemelerinde adı geçen bölgeler, köyler ve mahalleler. Bir yerin sayfası, o yerle ilgili kayıtları tarih sırasıyla gösterir.',
    unit: 'yer',
  },
};

/** Shared by the hub route and its /sayfa/[n] sibling; only `path` differs. */
export function entityIndexMetadata(kind: EntityKind, page: number): Metadata {
  const copy = ENTITY_INDEX_COPY[kind];

  return buildMetadata({
    title: copy.title,
    description: copy.description,
    path: pageHref(ENTITY_PATH[kind], page),
    page,
  });
}

export async function EntityIndex({ kind, page }: { kind: EntityKind; page: number }) {
  const copy = ENTITY_INDEX_COPY[kind];
  const basePath = ENTITY_PATH[kind];

  const [entities, total] = await Promise.all([
    listEntities(kind, {
      limit: ENTITY_INDEX_PAGE_SIZE,
      offset: (page - 1) * ENTITY_INDEX_PAGE_SIZE,
    }),
    countEntities(kind),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ENTITY_INDEX_PAGE_SIZE));

  const crumbs = [{ name: 'Ana sayfa', href: '/' }, { name: ENTITY_LABEL_PLURAL[kind] }];

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
          {ENTITY_LABEL_PLURAL[kind]}
        </h1>

        <p className="mt-3 max-w-prose text-xl leading-[1.6] text-ink-body">{copy.intro}</p>

        {total > 0 ? (
          <p className="mt-4 text-base text-ink-muted">
            <span className="font-semibold text-ink">
              {formatCount(total)} {copy.unit}
            </span>
            {/*
              Saying WHY the number is what it is, rather than leaving the reader to
              wonder where the rest went. The threshold is spec 8.2 rule 3 and it is
              the same one listEntities, the detail page and the sitemap apply — a
              single-record entity has no page to link to.
            */}
            , en az iki kayıtta geçenler
          </p>
        ) : null}

        {entities.length ? (
          /*
            A dense two-up / three-up index rather than the one-per-row cards the
            record lists use: a row here is a name and a number, and sixty of them
            down a single column is a page the reader has to scroll past rather than
            scan. The border sits on the <li>, so each column keeps its own rules
            and they line up across the grid.
          */
          <ul className="mt-7 grid list-none border-t border-line p-0 sm:grid-cols-2 sm:gap-x-10 lg:grid-cols-3">
            {entities.map((entity) => (
              <li key={entity.id} className="m-0 border-b border-line-soft">
                <Link
                  href={basePath + '/' + entity.slug}
                  className="flex items-baseline justify-between gap-3 py-3 text-ink-body no-underline hover:text-accent hover:no-underline"
                >
                  <span className="min-w-0 text-md leading-[1.45]">
                    {entity.name}
                    {/*
                      The district is only worth showing when it ADDS something. For
                      the six districts themselves it repeats the name — the row for
                      Lefkoşa reads "Lefkoşa, Lefkoşa" — because a district's own
                      district is itself. Villages and neighbourhoods are the case
                      this field exists for.
                    */}
                    {entity.district && entity.district !== entity.name ? (
                      <span className="text-ink-fainter">, {entity.district}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-ink-fainter">
                    {formatCount(entity.recordCount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            className="mt-7"
            title={
              page > 1
                ? 'Bu sayfada kayıt yok.'
                : 'Henüz listelenecek ' + copy.unit + ' yok. Arşiv işlendikçe burası dolacak.'
            }
          >
            <p className="mt-4 text-md">
              <Link href="/ara">Aramayı deneyin</Link> ya da{' '}
              <Link href="/konu">konudan girin</Link>.
            </p>
          </EmptyState>
        )}

        <Pagination
          className="mt-[22px]"
          page={page}
          totalPages={totalPages}
          hrefFor={(next) => pageHref(basePath, next)}
        />
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
    </>
  );
}
