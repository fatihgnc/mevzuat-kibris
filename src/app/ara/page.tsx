import type { Metadata } from 'next';
import Link from 'next/link';

import { RecordList } from '@/components/record-list';
import { Pagination } from '@/components/pagination';
import { ActiveFilterChips, SearchFilters } from '@/components/search-filters';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { FollowCard } from '@/components/follow-card';
import { TOPIC_LIST } from '@/lib/constants/topics';
import {
  countForQuery,
  logSearch,
  searchRecords,
  suggestSimilar,
} from '@/lib/db/queries/records';
import { archiveCoverage } from '@/lib/db/queries/coverage';
import { formatCount } from '@/lib/db/queries/shared';
import {
  SORT_LABELS,
  SORT_OPTIONS,
  buildQuery,
  buildSearchHref,
  hasActiveFilters,
  parseSearchParams,
  searchParamsSchema,
} from '@/lib/search/build-query';
import { PAGE_SIZE } from '@/lib/seo/config';
import { cn } from '@/lib/utils';

/** Arama dinamik; ISR yok (spec 11.1). */
export const dynamic = 'force-dynamic';

/** Sonuç sayfası noindex, follow (spec 8.1). */
export const metadata: Metadata = {
  title: 'Arama',
  robots: { index: false, follow: true },
};

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const params = parseSearchParams(raw);
  const built = buildQuery(params);

  const [result, coverage] = await Promise.all([
    searchRecords(params, built),
    archiveCoverage(),
  ]);

  /*
   * Arama logu boş-sonuç oranını ölçmek için (spec 16 riski: Postgres arama
   * kalitesi yetersiz kalırsa %15 eşiğinde Meilisearch'e geçilir). Sonucu
   * beklemiyoruz; log yazımı sayfanın yanıt süresine girmemeli.
   */
  if (built.raw) void logSearch(built.raw, result.total);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const empty = built.raw.length > 0 && result.total === 0;

  return (
    <>
      <SiteHeader variant="search" query={built.raw} />

      <main id="icerik" className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-8 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-search">
          {/*
            `self-start` KULLANMA. Sezgi tersini söylüyor ama sticky için hücre
            GERİLMİŞ olmak zorunda: yapışan öğe yalnızca kendi kapsayıcısının
            kutusu içinde hareket edebiliyor. `self-start` hücreyi formun
            yüksekliğine indiriyor (632px), ikisi eşitlenince kayacak alan
            kalmıyor ve `position: sticky` hiçbir etki göstermiyor — öğe
            sayfayla birlikte akıp gidiyor.

            Ölçüldü: self-start ile hücre 632px, onsuz 3172px; ilkinde form
            kaydırmayı birebir takip ediyor, ikincisinde 72px'te sabitleniyor.
          */}
          <div className="min-w-0">
            {empty ? (
              <ActiveFilterChips params={params} />
            ) : (
              <SearchFilters
                params={params}
                facets={result.facets}
                coverage={coverage}
              />
            )}
          </div>

          <div className="min-w-0">
            {empty ? (
              <EmptyResults query={built.raw} normalized={built.normalized} params={params} />
            ) : (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3.5">
                  <p className="m-0 text-base text-ink-muted">
                    <span className="font-semibold text-ink">
                      {formatCount(result.total)}
                      {result.capped ? '+' : ''} kayıt
                    </span>{' '}
                    bulundu
                  </p>
                  <div className="flex items-center gap-4 text-base">
                    {SORT_OPTIONS.map((option) => (
                      <Link
                        key={option}
                        href={buildSearchHref(params, { sirala: option, sayfa: 1 })}
                        className={cn(
                          'no-underline hover:no-underline',
                          option === params.sirala
                            ? 'border-b-2 border-accent pb-0.5 font-semibold text-ink'
                            : 'text-ink-muted hover:text-ink',
                        )}
                      >
                        {SORT_LABELS[option]}
                      </Link>
                    ))}
                  </div>
                </div>

                <RecordList
                  records={result.items}
                  adSlotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED}
                  emptyMessage="Bu filtrelerle kayıt yok. Filtreleri gevşetmeyi deneyin."
                />

                <div className="mt-[22px] flex flex-col items-center gap-3.5">
                  <Pagination
                    className="justify-center"
                    page={params.sayfa}
                    totalPages={Math.min(totalPages, 500)}
                    hrefFor={(page) => buildSearchHref(params, { sayfa: page })}
                  />
                  {built.raw ? (
                    <Link href="/takip" className="text-base">
                      Bu aramayı takibe al
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * Boş sonuç — artboard 1f.
 *
 * Tasarımın kararı: "sonuç bulunamadı" deyip durmak yerine dört çıkış yolu
 * göstermek. Sırayla: yazım önerisi (trigram), filtre kaldırma, konudan giriş,
 * referans numarasıyla arama. En altta aramayı alarma çevirme.
 */
async function EmptyResults({
  query,
  normalized,
  params,
}: {
  query: string;
  normalized: string;
  params: Awaited<ReturnType<typeof searchParamsSchema.parse>>;
}) {
  const suggestion = await suggestSimilar(normalized);
  const suggestionCount = suggestion ? await countForQuery(suggestion.title) : 0;
  const filtersOpen = hasActiveFilters(params);

  return (
    <div>
      <p className="m-0 border-b border-line pb-[18px] text-md text-ink-muted">
        <span className="font-semibold text-ink">{query}</span> için kayıt yok.
      </p>

      {suggestion ? (
        <p className="mt-[22px] text-3xl leading-[1.4] text-ink">
          Bunu mu demek istediniz:{' '}
          <Link
            href={buildSearchHref({ q: suggestion.summary ?? suggestion.title })}
            className="font-semibold"
          >
            {suggestion.summary ?? suggestion.title}
          </Link>
          {suggestionCount > 0 ? (
            <span className="text-md text-ink-muted"> — {formatCount(suggestionCount)} kayıt</span>
          ) : null}
        </p>
      ) : null}

      <section className="mt-[26px]">
        <h2 className="mb-3 text-md font-semibold text-ink">Başka yollar</h2>
        <ul className="flex flex-col gap-2.5 text-md leading-[1.5] text-ink-body">
          {filtersOpen ? (
            <li>
              Filtreleri kaldırın:{' '}
              <Link href={buildSearchHref({ q: query })}>hepsini temizle</Link>
              <span className="text-ink-muted"> — açık filtreler aramayı daraltıyor.</span>
            </li>
          ) : null}
          <li>
            Konudan girin:{' '}
            {TOPIC_LIST.slice(0, 3).map((topic, index) => (
              <span key={topic.slug}>
                {index > 0 ? ', ' : ''}
                <Link href={'/konu/' + topic.slug}>{topic.name}</Link>
              </span>
            ))}
            <span className="text-ink-muted"> akışları kronolojik.</span>
          </li>
          <li>
            Referans numarası biliyorsanız doğrudan yazın, örnek{' '}
            <span className="font-semibold">A.E. 1064</span>.
          </li>
          <li>
            Yer ya da kurum adıyla deneyin — kayıtların çoğu bir köy, kurum ya da şirket adıyla
            yayımlanıyor.
          </li>
        </ul>
      </section>

      <FollowCard
        className="mt-[30px]"
        title="Bu aramayı takibe alın"
        description="Bugün kayıt yok, yarın olabilir. Bu arama için yeni kayıt yayımlandığında haber veririz."
        subject={{ label: query, query }}
        rssHref="/rss.xml"
      />
    </div>
  );
}
