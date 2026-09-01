-- 0007 — search functions (spec 5.4)

/*
 * The synonym and bridge dictionary.
 *
 * Spec 5.2 describes this as a file-based synonym dictionary and, because
 * $SHAREDIR cannot be written on Supabase, settles for "query expansion in the
 * application layer". We do it as a TABLE instead: done in the application layer,
 * alert matching (spec 10.2) would not get the same expansion, and the promise
 * that "what the user saw in search is exactly what they get in the alert" would
 * break. In a table, both sides go through the same function.
 */
create table if not exists search_synonyms (
  term        text not null,
  alternative text not null,
  primary key (term, alternative)
);

create index if not exists search_synonyms_term_idx on search_synonyms (term);

-- Domain terms (the example list in spec 5.2). Written in both directions.
insert into search_synonyms (term, alternative) values
  ('kamulastirma', 'istimlak'),
  ('istimlak', 'kamulastirma'),
  ('kamulastirma', 'zorla mal iktisabi'),
  ('munhal', 'kadro'),
  ('kadro', 'munhal'),
  ('tuzuk', 'yonetmelik'),
  ('yonetmelik', 'tuzuk'),
  ('kocan', 'tapu'),
  ('tapu', 'kocan'),
  ('emirname', 'karar'),
  ('kdv', 'katma deger vergisi'),
  ('sgk', 'sosyal sigortalar'),
  ('khk', 'yasa gucunde kararname'),
  ('bkk', 'bakanlar kurulu karari'),
  ('imar', 'planlama onayi'),
  -- Consonant-softening bridges: the one gap prefix matching cannot close.
  -- Searching "tüzük" must find a record containing "tüzüğünde" (k -> ğ, g after unaccent).
  ('tuzuk', 'tuzug'),
  ('toprak', 'toprag'),
  ('kaynak', 'kaynag'),
  ('ocak', 'ocag'),
  ('yaprak', 'yaprag'),
  ('sozlesme', 'sozlesmes')
on conflict do nothing;

/*
 * Query construction — spec 5.4 steps 2-4.
 *
 * websearch_to_tsquery safely parses the user's syntax (quoted phrases, OR, minus)
 * on its own; we take its output and add two things:
 *
 *   1. A :* prefix on every word. Turkish is agglutinative and its suffixes come
 *      at the end, so prefix matching does the job of stemming (see the
 *      measurement in 0002).
 *   2. The counterparts from search_synonyms, OR'ed in.
 *
 * A two-stage replacement is used (placeholders first, expansions second); done in
 * one stage, the generated alternatives would match again and expand without end.
 */
create or replace function mk_tsquery(q text) returns tsquery
language plpgsql
stable
as $$
declare
  base_text text;
  lexeme    text;
  variants  text[];
  alt       text;
  idx       int := 0;
  marker    text;
  markers   text[] := '{}';
  expansions text[] := '{}';
begin
  if q is null or btrim(q) = '' then
    return null;
  end if;

  base_text := websearch_to_tsquery('tr_rg', q)::text;

  if base_text is null or base_text = '' then
    return null;
  end if;

  -- Stage 1: turn every unique lexeme into a placeholder
  for lexeme in
    select distinct m[1] from regexp_matches(base_text, '''([^'']+)''', 'g') m
  loop
    idx := idx + 1;
    marker := '@@' || idx || '@@';

    variants := array[quote_literal(lexeme) || ':*'];

    for alt in
      select s.alternative from search_synonyms s where s.term = lexeme
    loop
      if position(' ' in alt) > 0 then
        /*
         * Çok sözcüklü karşılık ("zorla mal iktisabi") tek bir lexeme olamaz;
         * ifade sorgusuna çevriliyor. Önek eklenmiyor: ifadenin tamamı zaten
         * belirleyici, ayrıca <-> ile önek karışımı yanlış eşleşme üretiyor.
         */
        variants := variants || ('( ' || phraseto_tsquery('tr_rg', alt)::text || ' )');
      else
        variants := variants || (quote_literal(alt) || ':*');
      end if;
    end loop;

    markers := markers || marker;
    expansions := expansions || (
      case when array_length(variants, 1) > 1
        then '( ' || array_to_string(variants, ' | ') || ' )'
        else variants[1]
      end
    );

    base_text := replace(base_text, quote_literal(lexeme), marker);
  end loop;

  -- Stage 2: replace the placeholders with their expansions
  for idx in 1 .. coalesce(array_length(markers, 1), 0) loop
    base_text := replace(base_text, markers[idx], expansions[idx]);
  end loop;

  return base_text::tsquery;
exception
  when others then
    -- A malformed query must not take down the search page; we fall back to the raw form.
    return websearch_to_tsquery('tr_rg', q);
end;
$$;

-- Freshness multiplier: last 90 days x1.5, last year x1.2, older x1.0 (spec 5.4).
create or replace function recency_boost(published date)
returns real
language sql
stable
as $$
  select case
    when published > current_date - interval '90 days'  then 1.5::real
    when published > current_date - interval '365 days' then 1.2::real
    else 1.0::real
  end;
$$;

-- "Did you mean" when 0 results come back (spec 5.4 step 7).
create or replace function suggest_similar(q text, limit_n int default 3)
returns table (slug text, title text, summary text, similarity real)
language sql
stable
as $$
  select r.slug,
         r.title,
         r.summary,
         similarity(r.title_normalized, q) as similarity
    from records r
   where r.has_own_page
     and r.title_normalized % q
   order by similarity desc, r.published_at desc
   limit limit_n;
$$;

-- If the config was installed correctly, all of these queries must match.
do $$
declare
  doc tsvector;
begin
  doc := to_tsvector('tr_rg', 'ÇELEBİOĞLU ÖZEL GÜVENLİK LTD GÜVENLİK HİZMETİ ALIMI İHALESİNE YAPILAN İTİRAZ');
  if not (doc @@ mk_tsquery('ihale')) then
    raise exception 'mk_tsquery: "ihale" araması "ihalesine" geçen kaydı bulamıyor';
  end if;

  doc := to_tsvector('tr_rg', '1962 ZORLA MAL İKTİSABI YASASI-GAZİMAĞUSA/VADİLİ');
  if not (doc @@ mk_tsquery('yasa')) then
    raise exception 'mk_tsquery: "yasa" araması "YASASI" geçen kaydı bulamıyor';
  end if;
  if not (doc @@ mk_tsquery('kamulastirma')) then
    raise exception 'mk_tsquery: eşanlamlı genişletme (kamulastirma -> zorla mal iktisabi) çalışmıyor';
  end if;

  doc := to_tsvector('tr_rg', 'ELEKTRİK TARİFELERİ DEĞİŞİKLİK TÜZÜĞÜNDE YAPILAN DÜZENLEME');
  if not (doc @@ mk_tsquery('tüzük')) then
    raise exception 'mk_tsquery: ünsüz yumuşaması köprüsü (tüzük -> tüzüğünde) çalışmıyor';
  end if;

  doc := to_tsvector('tr_rg', 'FİYAT İSTİKRAR FONUNA YATIRILACAK MİKTARLAR');
  if not (doc @@ mk_tsquery('fon')) then
    raise exception 'mk_tsquery: "fon" araması "FONUNA" geçen kaydı bulamıyor';
  end if;

  -- Negative control: an unrelated query must not match, or the prefix is too broad.
  if to_tsvector('tr_rg', 'MARKA TESCİL MÜRACAATI İLANI') @@ mk_tsquery('kamulastirma') then
    raise exception 'mk_tsquery: alakasız sorgu eşleşiyor, önek fazla geniş';
  end if;
end
$$;
