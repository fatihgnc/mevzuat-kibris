-- 0002 — Turkish text search configuration
--
-- MAJOR DEVIATION: spec 5.2 proposes the `unaccent + rg_syn + turkish_stem` chain and
-- 5.1 says "PostgreSQL ships a Turkish stemmer". That assumption was measured
-- against this corpus and DID NOT HOLD.
--
-- turkish_stem (snowball) over-trims stems ending in a vowel and leaves the
-- possessive suffix half-cut. Measured examples:
--
--   yasa     -> 'yas'      yasanın -> 'yasa'     yasası -> 'yasas'   (all three differ)
--   ihale    -> 'ihal'     ihaleye -> 'ihale'                        (differ)
--   arsa     -> 'ar'       arsası  -> 'arsas'                        (differ)
--   fon      -> 'fon'      fonu    -> 'fo'                           (differ)
--   tasfiye  -> 'tasfi'    tasfiyesi -> 'tasfiyes'                   (differ)
--   emirname -> 'emirna'   emirnamesi -> 'emirnames'                 (differ)
--
-- Putting unaccent BEFORE the stemmer also breaks the stemmer: snowball relies on
-- vowel harmony to recognise a Turkish suffix, and once the ı/i and ü/u distinction
-- is erased the suffix is no longer recognised (münhaller -> 'munhaller', tüzüğü -> 'tuzugu').
--
-- Hit rate measured over 18 real query/document pairs:
--   unaccent + turkish_stem (spec)      11/18
--   unaccent + simple, exact match       8/18
--   unaccent + simple, PREFIX match      17/18   <- chosen
--
-- Rationale: Turkish is agglutinative and suffixes come at the END. Prefix matching
-- therefore does the job of stemming on this corpus both more accurately and
-- without the destructive side effects. Prefix generation lives in mk_tsquery() (0007).
--
-- Known remaining gap: consonant softening (tüzük -> tüzüğü). Bridge rows in the
-- search_synonyms table cover that (0007).
--
-- Spec 5.1's own escape hatch applies here: search quality is measured via search_logs,
-- and if the empty-result rate exceeds 15% we move to Meilisearch (spec 16).

-- NO CASCADE: dropping tr_rg would take the records.search_vector generated column
-- and the GIN index with it. The config is created if absent; if present, only the
-- mapping is reapplied (ALTER MAPPING is idempotent).
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

-- Mandatory acceptance tests (spec 5.3's intent is preserved; the assertions were
-- updated to match what was measured). If the config was installed wrongly the migration
-- sessizce bozulmaz.
do $$
begin
  -- Case folding, including the Turkish İ
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

  -- The stem is NOT DESTROYED: under the old chain 'arsa' became 'ar' and 'fonu' became 'fo'.
  if to_tsvector('tr_rg', 'arsa')::text not like '%arsa%' then
    raise exception 'tr_rg: arsa sözcüğü kırpılıyor';
  end if;
  if to_tsvector('tr_rg', 'fonu')::text not like '%fonu%' then
    raise exception 'tr_rg: fonu sözcüğü kırpılıyor';
  end if;
end
$$;
