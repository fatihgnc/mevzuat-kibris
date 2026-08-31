import Link from 'next/link';

import { TOPICS, TOPIC_LIST } from '@/lib/constants/topics';
import { formatCount } from '@/lib/db/queries/shared';
import {
  DEFAULT_SORT,
  buildSearchHref,
  hasActiveFilters,
  yearOptions,
  type SearchParams,
  type YearOption,
} from '@/lib/search/build-query';
import type { SearchResult } from '@/lib/db/queries/records';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  params: SearchParams;
  facets: SearchResult['facets'];
  /** Yıl seçenekleri veriden türetiliyor; takvimden değil (spec 8.4). */
  coverage?: { earliestYear: number | null; latestYear: number | null } | null;
}

/**
 * Filtre rayı — artboard 1b sol sütun.
 *
 * GERÇEK BİR FORM, ama hâlâ JS'siz çalışıyor. Eskiden her filtre bir bağlantıydı
 * ve tıklandığı anda sayfa yenileniyordu; ürün sahibinin kararıyla artık
 * seçimler biriktiriliyor ve "Filtrele" ile tek seferde uygulanıyor.
 *
 * `method="get"` seçilmesinin sebebi bu: onChange'de gezinen bir JS bileşeni
 * yerine düz HTML formu kullanınca değişiklik, tasarımın üç temel özelliğinin
 * hiçbirini bozmuyor —
 *
 *   1. her filtre kombinasyonu hâlâ paylaşılabilir bir URL (spec 5.5),
 *   2. JS olmadan da çalışıyor,
 *   3. sunucuda render ediliyor, istemci durumu yok.
 *
 * Tarayıcı form gönderirken adres çubuğunu kendisi kuruyor; `buildSearchHref`e
 * gerek kalmıyor. `sayfa` alanı forma BİLEREK konmadı: filtre değişince 1.
 * sayfaya dönmek gerekiyor ve alanı hiç göndermemek bunu kendiliğinden yapıyor.
 */
export function SearchFilters({ params, facets, coverage }: SearchFiltersProps) {
  const years = yearOptions(coverage);
  const activeYear = params.yil;
  const filtersOpen = hasActiveFilters(params);

  /*
   * Konular HER ZAMAN tam liste. Yalnızca facet satırlarını basmak, filtre
   * uygulandığında listeyi kendi sonucuna daraltıyordu: "Atama" seçince geriye
   * tek seçenek kalıyor ve kullanıcı başka konu ekleyemiyordu. Sayı 0 olsa da
   * seçenek duruyor; kutunun yeri sabit kalsın diye sıra da sabit.
   */
  const topicCounts = new Map(facets.topics.map((facet) => [facet.key, facet.n]));

  /*
   * Belge türünde 23 seçeneğin hepsini basmak rayı boğardı; en çok sonuç veren
   * sekiz tanesi gösteriliyor. Ama SEÇİLİ olan bir tür listeden düşerse
   * kullanıcı onu geri alamaz — o yüzden seçililer her hâlükârda ekleniyor.
   */
  const docTypeShortlist = facets.docTypes.slice(0, 8);
  const missingChecked = facets.docTypes
    .slice(8)
    .filter((facet) => params.tur.includes(facet.key as never));
  const docTypes = [...docTypeShortlist, ...missingChecked];

  /*
   * UYGULANMIŞ filtrelerin imzası — formu yeniden mount etmek için.
   *
   * Girdiler `defaultChecked` kullanıyor ve bu değer DOM'a YALNIZCA ilk
   * mount'ta yazılıyor. Next.js yumuşak gezinmesinde ("Filtreleri kaldır" bir
   * Link) React aynı <input> elemanlarını yeniden kullanıyor, `defaultChecked`
   * değişimini yok sayıyor ve kutular işaretli kalıyordu: sonuçlar sıfırlanmış
   * ama filtreler seçili görünen bir ekran çıkıyordu.
   *
   * key değişince React eski ağacı söküp yenisini kuruyor, böylece sunucunun
   * ürettiği doğru işaretli durum DOM'a uygulanıyor. Sunucu bileşeni olduğu
   * için girdileri kontrollü hâle getirmek (useState) seçenek değil.
   */
  const appliedKey = [
    params.konu.join(','),
    params.tur.join(','),
    params.yil ?? '',
    params.q,
  ].join('|');

  return (
    <form
      key={appliedKey}
      method="get"
      action="/ara"
      /*
       * Tarayıcının kendi form durumu geri yüklemesi de aynı hatayı üretiyor:
       * geri/ileri ve yenilemede işaretleri sunucunun gönderdiği HTML'e değil,
       * kullanıcının son dokunduğu hâle geri getiriyor. Filtre durumunun tek
       * kaynağı URL olmalı.
       */
      autoComplete="off"
      aria-label="Arama filtreleri"
      /*
       * Sticky: kullanıcı uzun sonuç listesinde aşağı inerken filtreler solda
       * kalıyor. top değeri header'ın altına denk geliyor (header sticky top-0).
       * Yükseklik sınırı + kendi kaydırması şart: yıl listesi arşiv büyüdükçe
       * uzuyor ve ekrandan taşarsa "Filtrele" butonu erişilemez hâle gelir.
       * Yalnızca lg'de — altında ızgara tek sütuna düşüyor ve orada sticky bir
       * ray içeriği iterdi.
       */
      className="flex flex-col gap-6 lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto lg:pb-1"
    >
      {/* Form gönderilirken kaybolmaması gereken, rayda göstermediğimiz alanlar. */}
      <input type="hidden" name="q" value={params.q} />
      {params.sirala !== DEFAULT_SORT ? (
        <input type="hidden" name="sirala" value={params.sirala} />
      ) : null}
      {params.kurum ? <input type="hidden" name="kurum" value={params.kurum} /> : null}
      {params.yer ? <input type="hidden" name="yer" value={params.yer} /> : null}

      <section>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="text-xs text-ink-faint">Konu</h2>
          <span className="text-2xs text-ink-placeholder">bu sonuçlarda</span>
        </div>
        <ul className="flex flex-col gap-[7px]">
          {TOPIC_LIST.map((topic) => (
            <li key={topic.slug}>
              <FilterCheckbox
                name="konu"
                value={topic.slug}
                defaultChecked={params.konu.includes(topic.slug)}
                count={topicCounts.get(topic.slug) ?? 0}
              >
                {TOPICS[topic.slug].name}
              </FilterCheckbox>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Belge türü</h2>
        <ul className="flex flex-col gap-[7px]">
          {docTypes.map((facet) => (
            <li key={facet.key}>
              <FilterCheckbox
                name="tur"
                value={facet.key}
                defaultChecked={params.tur.includes(facet.key as never)}
                count={facet.n}
              >
                {facet.label}
              </FilterCheckbox>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2.5 text-xs text-ink-faint">Yıl</h2>
        <ul className="flex flex-col gap-[7px]">
          {years.map((option) => (
            <li key={option.key}>
              <YearRadio option={option} activeYear={activeYear} />
            </li>
          ))}
        </ul>
      </section>

      {/*
        Butonun rayın SONUNDA olması bilinçli: seçimler yukarıdan aşağı yapılıyor
        ve eylem okumanın bittiği yerde.

        "Filtreleri kaldır" bir BAĞLANTI, buton değil: form gönderimi değil,
        filtresiz adrese gidiş. Sorgu metni korunuyor — kullanıcı filtreleri
        sıfırlarken aramasını kaybetmemeli. Yalnızca uygulanmış filtre varken
        görünüyor; boşken kalabalık yapardı.
      */}
      <div className="sticky bottom-0 flex flex-col gap-2 bg-surface pt-1">
        <button
          type="submit"
          className="rounded bg-accent py-2.5 text-base font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Filtrele
        </button>
        {filtersOpen ? (
          <Link
            href={buildSearchHref({ q: params.q })}
            className="rounded border border-line-strong py-2 text-center text-base text-ink-body no-underline transition-colors hover:border-ink hover:text-ink hover:no-underline"
          >
            Filtreleri kaldır
          </Link>
        ) : null}
      </div>
    </form>
  );
}

function FilterCheckbox({
  name,
  value,
  defaultChecked,
  count,
  children,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2 text-base text-ink-body hover:text-accent">
      <span className="flex min-w-0 items-center gap-2">
        <input
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={defaultChecked}
          className="h-3.5 w-3.5 shrink-0 accent-accent"
        />
        <span className="truncate">{children}</span>
      </span>
      <span className="shrink-0 text-sm text-ink-fainter">{formatCount(count)}</span>
    </label>
  );
}

/**
 * Yıl seçimi radyo grubu. "Tümü" değeri boş dizge: form gönderilirken boş
 * değerler URL'e yazılmıyor, yani yıl filtresi kendiliğinden düşüyor.
 */
function YearRadio({ option, activeYear }: { option: YearOption; activeYear?: number }) {
  const checked = option.yil === undefined ? activeYear === undefined : activeYear === option.yil;

  return (
    <label className="flex cursor-pointer items-center gap-2 text-base text-ink-body hover:text-accent">
      <input
        type="radio"
        name="yil"
        value={option.yil ?? ''}
        defaultChecked={checked}
        className="h-3.5 w-3.5 shrink-0 accent-accent"
      />
      <span className={cn('truncate', checked && 'font-semibold text-accent')}>{option.label}</span>
    </label>
  );
}

function toggle<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
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

  if (params.yil) {
    chips.push({
      key: 'yil',
      label: String(params.yil),
      href: buildSearchHref(params, { yil: undefined, sayfa: 1 }),
    });
  }

  /*
   * baslangic/bitis artık arayüzden üretilmiyor ama paylaşılmış eski
   * bağlantılarda gelebiliyor; çipini gösterip kaldırılabilir tutuyoruz.
   */
  if (params.baslangic || params.bitis) {
    chips.push({
      key: 'tarih',
      label: [params.baslangic, params.bitis].filter(Boolean).join(' – '),
      href: buildSearchHref(params, { baslangic: undefined, bitis: undefined, sayfa: 1 }),
    });
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
