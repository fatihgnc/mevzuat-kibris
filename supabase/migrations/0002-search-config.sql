-- 0002 — Türkçe text search configuration
--
-- ÖNEMLİ SAPMA: spec 5.2 `unaccent + rg_syn + turkish_stem` zinciri öneriyor ve
-- 5.1'de "PostgreSQL Türkçe stemmer'ı hazır getiriyor" diyor. Bu varsayım bu
-- korpusta ölçüldü ve TUTMADI.
--
-- turkish_stem (snowball) ünlüyle biten gövdeleri aşırı kırpıyor ve iyelik ekini
-- yarım bırakıyor. Ölçülen örnekler:
--
--   yasa     -> 'yas'      yasanın -> 'yasa'     yasası -> 'yasas'   (üçü ayrı)
--   ihale    -> 'ihal'     ihaleye -> 'ihale'                        (ayrı)
--   arsa     -> 'ar'       arsası  -> 'arsas'                        (ayrı)
--   fon      -> 'fon'      fonu    -> 'fo'                           (ayrı)
--   tasfiye  -> 'tasfi'    tasfiyesi -> 'tasfiyes'                   (ayrı)
--   emirname -> 'emirna'   emirnamesi -> 'emirnames'                 (ayrı)
--
-- Ayrıca unaccent'i stemmer'dan ÖNCE koymak stemmer'ı bozuyor: snowball Türkçe
-- eki tanımak için ünlü uyumuna bakıyor, ı/i ve ü/u ayrımı silinince ek tanınmaz
-- oluyor (münhaller -> 'munhaller', tüzüğü -> 'tuzugu').
--
-- 18 gerçek sorgu/belge çifti üzerinde ölçülen isabet:
--   unaccent + turkish_stem (spec)      11/18
--   unaccent + simple, tam eşleşme       8/18
--   unaccent + simple, ÖNEK eşleşmesi   17/18   <- seçilen
--
-- Gerekçe: Türkçe eklemeli bir dil ve ekler SONA geliyor. Dolayısıyla önek
-- eşleşmesi, bu korpusta gövdelemenin yaptığı işi hem daha isabetli hem de
-- yıkıcı yan etkisiz yapıyor. Önek üretimi mk_tsquery() içinde (0007).
--
-- Kalan bilinen boşluk: ünsüz yumuşaması (tüzük -> tüzüğü). Bunu search_synonyms
-- tablosundaki köprü kayıtları kapatıyor (0007).
--
-- Spec 5.1'in kendi çıkış kapısı burada geçerli: arama kalitesi search_logs ile
-- ölçülüyor, boş-sonuç oranı %15'i geçerse Meilisearch'e geçilir (spec 16).

-- CASCADE YOK: tr_rg'yi düşürmek records.search_vector generated column'unu
-- ve GIN indeksini birlikte götürürdü. Config yoksa kuruluyor, varsa yalnızca
-- eşlemesi yeniden uygulanıyor (ALTER MAPPING idempotent).
do $$
begin
  if not exists (
    select 1 from pg_ts_config c join pg_namespace n on n.oid = c.cfgnamespace
     where c.cfgname = 'tr_rg'
  ) then
    execute 'create text search configuration tr_rg (copy = simple)';
  end if;
end
$$;

alter text search configuration tr_rg
  alter mapping for asciiword, asciihword, hword_asciipart,
                    word, hword, hword_part
  with unaccent, simple;

-- Zorunlu kabul testleri (spec 5.3 amacı korunuyor, iddialar ölçülene göre
-- güncellendi). Config yanlış kurulduysa migration burada patlar; arama
-- sessizce bozulmaz.
do $$
begin
  -- Büyük/küçük harf, Türkçe İ dahil
  if to_tsvector('tr_rg', 'İHALE') <> to_tsvector('tr_rg', 'ihale') then
    raise exception 'tr_rg: İHALE ve ihale aynı vektörü üretmiyor';
  end if;

  -- Aksan katlama
  if to_tsvector('tr_rg', 'kamulaştırma') <> to_tsvector('tr_rg', 'kamulastirma') then
    raise exception 'tr_rg: unaccent uygulanmıyor';
  end if;
  if to_tsvector('tr_rg', 'münhal') <> to_tsvector('tr_rg', 'munhal') then
    raise exception 'tr_rg: ü/u katlanmıyor';
  end if;
  if to_tsvector('tr_rg', 'Lefkoşa') <> to_tsvector('tr_rg', 'lefkosa') then
    raise exception 'tr_rg: ş/s katlanmıyor';
  end if;

  -- Gövde YIKILMIYOR: eski zincirde 'arsa' -> 'ar', 'fonu' -> 'fo' oluyordu.
  if to_tsvector('tr_rg', 'arsa')::text not like '%arsa%' then
    raise exception 'tr_rg: arsa sözcüğü kırpılıyor';
  end if;
  if to_tsvector('tr_rg', 'fonu')::text not like '%fonu%' then
    raise exception 'tr_rg: fonu sözcüğü kırpılıyor';
  end if;
end
$$;
