import { z } from 'zod';

import { DOC_TYPES } from '@/lib/constants/doc-types';
import { TOPIC_SLUGS } from '@/lib/constants/topics';
import { PAGE_SIZE } from '@/lib/seo/config';
import { normalizeForSearch } from '@/lib/text/turkish-lower';

/**
 * Arama sorgusu hattı — spec 5.4.
 *
 *   1. normalize        trim, tr-lowercase, fazla boşluk
 *   2. tırnak tespiti   "hizmet alımı" -> phraseto_tsquery
 *   3. eşanlamlı        search_synonyms tablosu (mk_tsquery içinde)
 *   4. tsquery üret     mk_tsquery(q) — önek eşleşmesi dahil
 *   5. sırala           ts_rank_cd * recency_boost
 *   6. vurgula          ts_headline
 *   7. 0 sonuçta        trigram önerisi
 *
 * 1-2 burada, 3-7 SQL tarafında (0007-search-functions.sql).
 */

/**
 * Sıralama seçenekleri. İlki varsayılan.
 *
 * "En ilgili" (ts_rank_cd) ürün sahibinin kararıyla KALDIRILDI. Sonucu bilerek
 * kabul edilmiş bir ödünç: artık metin araması da tarihe göre sıralanıyor,
 * yani "ihale" araması en alakalıyı değil en yeniyi başa koyuyor. Resmî Gazete
 * için bu savunulabilir — kullanıcı çoğunlukla "en son ne oldu" diye bakıyor.
 * Geri istenirse `orderBy` içindeki rank dalı ve buradaki seçenek geri gelir.
 */
export const SORT_OPTIONS = ['yeni', 'eski'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export const DEFAULT_SORT: SortOption = 'yeni';

export const SORT_LABELS: Record<SortOption, string> = {
  yeni: 'En yeni',
  eski: 'En eski',
};

/**
 * URL query parametreleri. Hepsi paylaşılabilir olsun diye kısa ve Türkçe
 * (spec 5.5). Bilinmeyen değer sessizce düşer, hata vermez — paylaşılan bir
 * bağlantı eski bir filtre içeriyorsa sayfa yine de açılmalı.
 */
export const searchParamsSchema = z.object({
  q: z.string().trim().max(200).catch(''),
  konu: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(toArray)
    .pipe(z.array(z.enum(TOPIC_SLUGS)).max(8))
    .catch([]),
  tur: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform(toArray)
    .pipe(z.array(z.enum(DOC_TYPES)).max(23))
    .catch([]),
  kurum: z.string().trim().max(120).optional().catch(undefined),
  yer: z.string().trim().max(120).optional().catch(undefined),
  yil: z.coerce.number().int().min(1900).max(2200).optional().catch(undefined),
  baslangic: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  bitis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().catch(undefined),
  sirala: z.enum(SORT_OPTIONS).catch(DEFAULT_SORT),
  sayfa: z.coerce.number().int().min(1).max(500).catch(1),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const raw = Array.isArray(value) ? value : value.split(',');
  return raw.map((item) => item.trim()).filter(Boolean);
}

/**
 * Ham searchParams'ı şemaya vermeden önce düzleştirir.
 *
 * Next.js aynı anahtarın tekrarında dizi veriyor (`?q=a&q=b`). Şema tek dizge
 * beklediği için bu, paylaşılmış bozuk bir bağlantıda arama sayfasını 500'e
 * düşürüyordu. Çoklu değerde ilki alınıyor; dizi bekleyen alanlar (konu, tur)
 * kendi transform'unda zaten diziyi işliyor.
 */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchParams {
  const flattened: Record<string, string | string[] | undefined> = { ...raw };

  for (const key of ['q', 'kurum', 'yer', 'yil', 'baslangic', 'bitis', 'sirala', 'sayfa']) {
    const value = flattened[key];
    if (Array.isArray(value)) flattened[key] = value[0];
  }

  return searchParamsSchema.parse(flattened);
}

export interface BuiltQuery {
  /** Kullanıcının yazdığı hâli — arayüzde gösterilir. */
  raw: string;
  /** Normalize edilmiş hâli — trigram önerisi ve loglama için. */
  normalized: string;
  /**
   * Postgres'e gidecek tsquery ifadesi. Boşsa (sorgu yok) yalnızca filtreler
   * uygulanır ve sıralama tarihe düşer.
   */
  tsquery: string | null;
  /** Tırnak içinde tam ifade arandı mı — arayüzde "tam eşleşme" rozeti için. */
  hasPhrase: boolean;
  offset: number;
  limit: number;
}

const QUOTED = /"([^"]+)"/g;

/**
 * Ham sorgu doğrudan mk_tsquery() fonksiyonuna gidiyor; o da
 * websearch_to_tsquery ile kullanıcı sözdizimini (tırnak, OR, eksi) güvenle
 * ayrıştırıp önek ve eşanlamlı genişletmesini uyguluyor.
 */
export function buildQuery(params: SearchParams): BuiltQuery {
  const raw = params.q.trim();
  const normalized = normalizeForSearch(raw);
  const page = Math.max(1, params.sayfa);

  const base: BuiltQuery = {
    raw,
    normalized,
    tsquery: null,
    hasPhrase: false,
    offset: (page - 1) * PAGE_SIZE,
    limit: PAGE_SIZE,
  };

  if (!raw) return base;

  QUOTED.lastIndex = 0;
  const hasPhrase = QUOTED.test(raw);

  /*
   * Eşanlamlı genişletme ve önek eşleşmesi veritabanındaki mk_tsquery()
   * fonksiyonunda (supabase/migrations/0007). Burada yapılmıyor: alarm
   * eşleştirmesi de aynı fonksiyondan geçiyor ve ikisinin birebir aynı
   * sorguyu görmesi gerekiyor (spec 10.2).
   */
  const tsquery = raw;

  return { ...base, tsquery, hasPhrase };
}

/** Aktif filtre var mı — "filtreleri kaldır" bağlantısını göstermek için. */
export function hasActiveFilters(params: SearchParams): boolean {
  return Boolean(
    params.konu.length ||
      params.tur.length ||
      params.kurum ||
      params.yer ||
      params.yil ||
      params.baslangic ||
      params.bitis,
  );
}

/** Açık filtrelerin insan okunur listesi — artboard 1f'deki çipler. */
export interface ActiveFilterChip {
  key: string;
  label: string;
  /** Bu filtreyi kaldıran URL */
  href: string;
}

export function buildSearchHref(
  params: Partial<SearchParams> & { q?: string },
  overrides: Partial<Record<keyof SearchParams, unknown>> = {},
  basePath = '/ara',
): string {
  const merged = { ...params, ...overrides } as Record<string, unknown>;
  const search = new URLSearchParams();

  const push = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value)) {
      if (value.length) search.set(key, value.join(','));
      return;
    }
    search.set(key, String(value));
  };

  push('q', merged.q);
  push('konu', merged.konu);
  push('tur', merged.tur);
  push('kurum', merged.kurum);
  push('yer', merged.yer);
  push('yil', merged.yil);
  push('baslangic', merged.baslangic);
  push('bitis', merged.bitis);
  if (merged.sirala && merged.sirala !== DEFAULT_SORT) push('sirala', merged.sirala);
  if (typeof merged.sayfa === 'number' && merged.sayfa > 1) push('sayfa', merged.sayfa);

  const qs = search.toString();
  return qs ? basePath + '?' + qs : basePath;
}

export interface YearOption {
  key: string;
  label: string;
  /** undefined = "Tümü", yani yıl filtresi yok. */
  yil?: number;
}

/**
 * Tarih filtresi seçenekleri — artboard 1b'deki sol raydaki liste.
 *
 * Ürün sahibinin kararıyla yıllar TEKİL listeleniyor; aralık yok. Eskiden
 * "Son 12 ay / 2025 / 2020 – 2024 / Tümü" vardı. İki sonucu var:
 *
 * 1. "Son 12 ay" kaldırıldı. Tek başına aralık olduğu için tekil yıl listesine
 *    girmiyordu; ayrıca `baslangic`/`bitis` gerektirdiğinden filtreyi tek
 *    parametreye (`yil`) indirgemeyi engelliyordu. Tek parametre olması
 *    "Filtrele" butonlu formu radyo grubuyla çözülebilir kıldı.
 * 2. Yıllar VERİDEN geliyor, takvimden değil. Bugün 2026 ama arşivde yalnızca
 *    2025 var; takvimden üretilseydi 2026 seçeneği çıkar ve tıklayan boş sonuç
 *    alırdı. Spec 8.4'ün kapsam kuralı: arkasında veri olmayan yıl iddiası
 *    yapma.
 *
 * `baslangic`/`bitis` parametreleri şemada DURUYOR — paylaşılmış eski
 * bağlantılar çalışmaya devam etsin diye. Sadece arayüz onları üretmiyor.
 */
export function yearOptions(
  coverage?: { earliestYear: number | null; latestYear: number | null } | null,
): YearOption[] {
  const options: YearOption[] = [];

  const latest = coverage?.latestYear ?? null;
  const earliest = coverage?.earliestYear ?? null;

  if (latest !== null && earliest !== null) {
    for (let year = latest; year >= earliest; year -= 1) {
      options.push({ key: String(year), label: String(year), yil: year });
    }
  }

  /*
   * Sade "Tümü". Eskiden kapsam aralığı da yazıyordu ("Tümü, 2025") ama
   * yıllar zaten hemen üstünde tek tek listelendiği için tekrar oluyordu;
   * kapsam iddiası sayfanın kendi kapsam cümlesinde duruyor (spec 8.4).
   */
  options.push({ key: 'tumu', label: 'Tümü' });

  return options;
}
