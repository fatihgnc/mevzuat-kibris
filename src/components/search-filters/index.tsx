import Link from 'next/link';

import { TopicDot } from '@/components/topic-badge';
import { TOPICS } from '@/lib/constants/topics';
import { formatCount } from '@/lib/db/queries/shared';
import { buildSearchHref, dateRangePresets, type SearchParams } from '@/lib/search/build-query';
import type { SearchResult } from '@/lib/db/queries/records';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  params: SearchParams;
  facets: SearchResult['facets'];
  /** Gerçek arşiv aralığı; yoksa "Tümü" etiketi yıl iddiası yapmaz. */
  coverageLabel?: string | null;
}

/**
 * Filtre rayı — artboard 1b sol sütun.
 *
 * Tamamı bağlantı, form değil: her filtre kombinasyonu paylaşılabilir bir URL
 * (spec 5.5) ve JS olmadan da çalışıyor. Sayılar sonuç kümesinden geliyor,
 * arşiv toplamından değil — "bu sonuçlarda" etiketi bunu söylüyor.
 */
export function SearchFilters({ params, facets, coverageLabel }: SearchFiltersProps) {
  return (
    <aside className="flex flex-col gap-6" aria-label="Arama filtreleri">
      <section>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-xs text-ink-faint">Konu</h2>
          <span className="text-2xs text-ink-placeholder">bu sonuçlarda</span>
        </div>
        <ul className="flex flex-col gap-[7px]">
          {facets.topics.map((facet) => {
            const checked = params.konu.includes(facet.key);
            return (
              <li key={facet.key}>
                <FilterLink
                  href={buildSearchHref(params, {
                    konu: toggle(params.konu, facet.key),
                    sayfa: 1,
                  })}
                  checked={checked}
                  count={facet.n}
                >
                  <TopicDot topic={facet.key} />
                  {TOPICS[facet.key].name}
                </FilterLink>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Belge türü</h2>
        <ul className="flex flex-col gap-[7px]">
          {facets.docTypes.slice(0, 8).map((facet) => (
            <li key={facet.key}>
              <FilterLink
                href={buildSearchHref(params, { tur: toggle(params.tur, facet.key), sayfa: 1 })}
                checked={params.tur.includes(facet.key as never)}
                count={facet.n}
              >
                {facet.label}
              </FilterLink>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Tarih aralığı</h2>
        <ul className="flex flex-col gap-[7px] text-base text-ink-body">
          {dateRangePresets(coverageLabel).map((preset) => {
            const active = isRangeActive(params, preset);
            return (
              <li key={preset.key}>
                <Link
                  href={buildSearchHref(params, {
                    baslangic: 'baslangic' in preset ? preset.baslangic : undefined,
                    bitis: 'bitis' in preset ? preset.bitis : undefined,
                    yil: 'yil' in preset ? preset.yil : undefined,
                    sayfa: 1,
                  })}
                  className={cn(
                    'no-underline hover:no-underline',
                    active ? 'font-semibold text-accent' : 'text-ink-body hover:text-accent',
                  )}
                >
                  {preset.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}

function FilterLink({
  href,
  checked,
  count,
  children,
}: {
  href: string;
  checked: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-pressed={checked}
      className="flex items-center justify-between gap-2 text-base text-ink-body no-underline hover:text-accent hover:no-underline"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={cn(
            'inline-block h-3 w-3 shrink-0 rounded-sm border',
            checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface',
          )}
        />
        <span className="truncate">{children}</span>
      </span>
      <span className="shrink-0 text-sm text-ink-fainter">{formatCount(count)}</span>
    </Link>
  );
}

function toggle<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function isRangeActive(
  params: SearchParams,
  preset: { baslangic?: string; bitis?: string; yil?: number; key: string },
): boolean {
  if (preset.key === 'tumu') {
    return !params.baslangic && !params.bitis && !params.yil;
  }
  if (preset.yil) return params.yil === preset.yil;
  return params.baslangic === preset.baslangic && params.bitis === preset.bitis;
}

/** Açık filtre çipleri — artboard 1f'deki "Son 12 ay ×" rozetleri. */
export function ActiveFilterChips({ params }: { params: SearchParams }) {
  const chips: Array<{ key: string; label: string; href: string }> = [];

  for (const topic of params.konu) {
    chips.push({
      key: 'konu-' + topic,
      label: TOPICS[topic].name,
      href: buildSearchHref(params, { konu: toggle(params.konu, topic), sayfa: 1 }),
    });
  }

  for (const preset of dateRangePresets()) {
    if (preset.key !== 'tumu' && isRangeActive(params, preset)) {
      chips.push({
        key: 'tarih',
        label: preset.label,
        href: buildSearchHref(params, {
          baslangic: undefined,
          bitis: undefined,
          yil: undefined,
          sayfa: 1,
        }),
      });
    }
  }

  if (!chips.length) return null;

  return (
    <div className="flex flex-col gap-3.5">
      <h2 className="text-xs text-ink-faint">Açık filtreler</h2>
      <ul className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <li key={chip.key}>
            <Link
              href={chip.href}
              className="inline-flex items-center gap-1.5 rounded-pill bg-mark px-2.5 py-1 text-sm font-semibold text-ink no-underline hover:no-underline"
            >
              {chip.label}
              <span aria-hidden className="text-ink-faint">
                ×
              </span>
              <span className="sr-only">filtresini kaldır</span>
            </Link>
          </li>
        ))}
      </ul>
      {chips.length > 1 ? (
        <Link
          href={buildSearchHref(
            { q: params.q },
            { konu: [], tur: [], baslangic: undefined, bitis: undefined, yil: undefined },
          )}
          className="text-base"
        >
          Hepsini kaldır
        </Link>
      ) : null}
    </div>
  );
}
