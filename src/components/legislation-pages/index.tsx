import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '@/components/breadcrumbs';
import { LegislationView } from '@/components/legislation-detail';
import { LegislationIndex } from '@/components/legislation-index';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getLegislation, listLegislation } from '@/lib/db/queries/legislation';
import { formatCount } from '@/lib/db/queries/shared';
import { groupByLetter } from '@/lib/legislation/letters';
import {
  KIND_META,
  lawRef,
  legislationHref,
  type LegislationKind,
} from '@/lib/legislation/labels';
import { breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';

/**
 * The pages of /yasa and /tuzuk are the same page with different words, so the
 * route files are thin and everything lives here. Each route still declares its own
 * `revalidate`: Next reads that export statically and will not follow it through an
 * import.
 */

const INDEX_DESCRIPTION: Record<LegislationKind, string> = {
  yasa: 'Kuzey Kıbrıs Türk Cumhuriyeti yasalarının birleştirilmiş güncel metinleri: numaralı yasalar ve Fasıl yasaları, kaynağı ve tarihi ile.',
  tuzuk: 'Kuzey Kıbrıs Türk Cumhuriyeti tüzüklerinin birleştirilmiş güncel metinleri, kaynağı ve tarihi ile.',
};

export function legislationIndexMetadata(kind: LegislationKind): Metadata {
  return buildMetadata({
    title: KIND_META[kind].indexHeading + ' — birleştirilmiş güncel metinler',
    description: INDEX_DESCRIPTION[kind],
    path: KIND_META[kind].path,
  });
}

export async function legislationDetailMetadata(kind: LegislationKind, slug: string): Promise<Metadata> {
  const law = await getLegislation(kind, slug);
  if (!law) return { title: KIND_META[kind].singular + ' bulunamadı' };

  const ref = lawRef(law.lawKey);

  return buildMetadata({
    title: law.title + (ref ? ' (' + ref + ')' : '') + ' — güncel metin',
    description:
      law.title +
      (ref ? ', ' + ref + ' sayılı' : ',') +
      ' KKTC ' +
      KIND_META[kind].genitive +
      ' birleştirilmiş güncel metni, kaynağı ve tarihi ile birlikte.',
    path: KIND_META[kind].path + '/' + law.slug,
  });
}

export async function LegislationIndexPage({ kind }: { kind: LegislationKind }) {
  const meta = KIND_META[kind];
  const items = await listLegislation(kind);

  // Only what the browser needs to draw a line: the client component gets no more than this.
  const groups = groupByLetter(items).map((group) => ({
    letter: group.letter,
    slug: group.slug,
    items: group.items.map((item) => ({
      href: legislationHref(item.kind, item.slug),
      title: item.title,
      ref: lawRef(item.lawKey),
    })),
  }));

  const crumbs = [{ name: 'Ana sayfa', href: '/' }, { name: meta.plural }];

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-9 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />

        <h1 className="m-0 mb-2.5 text-4xl font-semibold leading-[1.25] tracking-tightest text-ink sm:text-5xl">
          {meta.indexHeading}
        </h1>
        <p className="mb-6 max-w-lede text-xl leading-[1.55] text-ink-muted">
          {meta.pluralGenitive} birleştirilmiş güncel metinleri. Her sayfada metnin hangi kaynaktan
          ve hangi tarihli dosyadan alındığı yazıyor; bu metinler resmî metin yerine geçmez.
        </p>

        {items.length ? (
          <>
            <p className="mb-4 text-base text-ink-muted">
              {formatCount(items.length)} {meta.noun} · başlığın ilk harfine göre
            </p>
            <LegislationIndex groups={groups} noun={meta.noun} />
          </>
        ) : (
          <p className="text-lg text-ink-muted">Henüz yayımlanmış {meta.noun} yok.</p>
        )}
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
    </>
  );
}

export async function LegislationDetailPage({ kind, slug }: { kind: LegislationKind; slug: string }) {
  const law = await getLegislation(kind, slug);
  if (!law) notFound();

  const crumbs = [
    { name: 'Ana sayfa', href: '/' },
    { name: KIND_META[kind].plural, href: KIND_META[kind].path },
    { name: law.title },
  ];

  return (
    <>
      <SiteHeader />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-9 sm:px-8 lg:px-10">
        <Breadcrumbs items={crumbs} />
        <LegislationView law={law} />
      </main>

      <SiteFooter />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
    </>
  );
}
