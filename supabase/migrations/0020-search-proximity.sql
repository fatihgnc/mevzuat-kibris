-- 0020 — proximity for multi-word searches
--
-- WHY. mk_tsquery('din işleri') used to produce  din:* & isleri:*  — "some word
-- starting with din AND some word starting with isleri, ANYWHERE in the record".
-- On a 30k-character body that is met by coincidence: 112 of the 274 hits for
-- "din işleri" (41%) were long records with "Dinamik" in one place and "işleri"
-- in another. Person names suffered most: "Anıl Aras" returned 826 records, and
-- the honest answer is about 10. Measured on production data, 2026-09-19.
--
-- WHAT. A search of plain words now requires each consecutive pair of words to
-- sit within `proximity` positions of each other, in either order. Every real
-- "din işleri" hit was already adjacent (163 at k=1 and at k=10 alike), so the
-- prefix on `din` stops mattering once the neighbour has to be right next to it.
--
-- WHAT IT DOES NOT TOUCH. Quoted phrases (already <->), OR, and minus produce
-- something other than a flat  'a' & 'b'  from websearch_to_tsquery, so the
-- proximity branch is skipped for them and they behave exactly as before.
--
-- SHAPE. This file does NOT redefine mk_tsquery(text) with a second overload:
-- `mk_tsquery(x)` against both (text) and (text, int default) is "not unique".
-- And scripts/migrate reruns every file, in order, on every db:migrate — 0007
-- recreates the old mk_tsquery(text) each time and this file then replaces it
-- again, so the final state is always this one.
--
--   mk_tsquery_expand(q, k)  the real function; k = 0 is the pre-0020 behaviour
--   mk_tsquery(q)            = mk_tsquery_expand(q, 3); search and alerts call it
--   the search page's "uzak" toggle calls mk_tsquery_expand(q, 0)
--
-- Alerts keep going through mk_tsquery(q), so what a user saw in search is what
-- an alert matches (spec 10.2).

-- One lexeme with its :* prefix and its synonyms — the unit both branches use.
create or replace function mk_lexeme_expansion(lexeme text) returns text
language plpgsql
stable
as $$
declare
  variants text[];
  alt      text;
begin
  variants := array[quote_literal(lexeme) || ':*'];

  for alt in
    select s.alternative from search_synonyms s where s.term = lexeme
  loop
    if position(' ' in alt) > 0 then
      -- Multi-word counterpart: a phrase, no prefix (see 0007).
      variants := variants || ('( ' || phraseto_tsquery('tr_rg', alt)::text || ' )');
    else
      variants := variants || (quote_literal(alt) || ':*');
    end if;
  end loop;

  return case
    when array_length(variants, 1) > 1 then '( ' || array_to_string(variants, ' | ') || ' )'
    else variants[1]
  end;
end;
$$;

create or replace function mk_tsquery_expand(q text, proximity int) returns tsquery
language plpgsql
stable
as $$
declare
  base_text  text;
  lexeme     text;
  ordered    text[];
  pairs      text[] := '{}';
  near       text[];
  a          text;
  b          text;
  d          int;
  i          int;
  idx        int := 0;
  marker     text;
  markers    text[] := '{}';
  expansions text[] := '{}';
begin
  if q is null or btrim(q) = '' then
    return null;
  end if;

  base_text := websearch_to_tsquery('tr_rg', q)::text;

  if base_text is null or base_text = '' then
    return null;
  end if;

  /*
   * Proximity branch — only for a flat AND of plain words: 'a' & 'b' [& 'c'...].
   * Anything with |, !, <-> or parentheses fails the pattern and takes the
   * pre-0020 path below.
   *
   * Each consecutive pair (w1,w2), (w2,w3)... becomes "within k positions, either
   * order", and the pairs are AND-ed. tsquery's <N> is EXACT distance, hence one
   * alternative per distance and direction.
   */
  if proximity > 0 and base_text ~ '^''[^'']+''( & ''[^'']+'')+$' then
    select array_agg(m[1] order by ord)
      into ordered
      from regexp_matches(base_text, '''([^'']+)''', 'g') with ordinality as t(m, ord);

    if coalesce(array_length(ordered, 1), 0) >= 2 then
      for i in 1 .. array_length(ordered, 1) - 1 loop
        a := mk_lexeme_expansion(ordered[i]);
        b := mk_lexeme_expansion(ordered[i + 1]);
        near := '{}';
        for d in 1 .. proximity loop
          near := near || ('( ' || a || ' <' || d || '> ' || b || ' )');
          near := near || ('( ' || b || ' <' || d || '> ' || a || ' )');
        end loop;
        pairs := pairs || ('( ' || array_to_string(near, ' | ') || ' )');
      end loop;

      return array_to_string(pairs, ' & ')::tsquery;
    end if;
  end if;

  -- Pre-0020 path (0007): prefix + synonyms, two-stage so expansions never re-expand.
  for lexeme in
    select distinct m[1] from regexp_matches(base_text, '''([^'']+)''', 'g') m
  loop
    idx := idx + 1;
    marker := '@@' || idx || '@@';
    markers := markers || marker;
    expansions := expansions || mk_lexeme_expansion(lexeme);
    base_text := replace(base_text, quote_literal(lexeme), marker);
  end loop;

  for idx in 1 .. coalesce(array_length(markers, 1), 0) loop
    base_text := replace(base_text, markers[idx], expansions[idx]);
  end loop;

  return base_text::tsquery;
exception
  when others then
    -- A malformed query must not take down the search page; fall back to the raw form.
    return websearch_to_tsquery('tr_rg', q);
end;
$$;

-- The default everybody calls. 3 = "within a couple of words": measured across
-- the real query log, it leaves person names and short titles clean; a looser
-- window (k=30) brought "Anıl Aras" back from 10 to 57 hits.
create or replace function mk_tsquery(q text) returns tsquery
language sql
stable
as $$
  select mk_tsquery_expand(q, 3)
$$;

-- Acceptance tests, same spirit as 0002 / 0007. A failure aborts the migration.
do $$
declare
  doc tsvector;
begin
  doc := to_tsvector('tr_rg', 'KAMU HİZMETİ KOMİSYONU VAKIFLAR ÖRGÜTÜ VE DİN İŞLERİ DAİRESİ YÖNETİM KURULU');
  if not (doc @@ mk_tsquery('din işleri')) then
    raise exception 'mk_tsquery: "din işleri" bitişik geçtiği kaydı bulamıyor';
  end if;
  if not (doc @@ mk_tsquery('işleri din')) then
    raise exception 'mk_tsquery: sözcük sırası ters olunca eşleşme kayboluyor';
  end if;

  -- The bug this migration exists for: the two words far apart in one record.
  doc := to_tsvector('tr_rg',
    'MAKİNE ELEMANLARI TERMODİNAMİK DİNAMİK PROGRAM ISI TRANSFERİ STATİK CAD TASARIM PROGRAMI '
    || 'SİMÜLASYON KİŞİLİK VE SAVUNMA MEKANİZMALARI GRUP DİNAMİĞİ VE KALABALIK YÖNETİMİ İLETİŞİM '
    || 'VE KRİZ ANI DAVRANIŞLARI TÜRKÇE MATEMATİK BAKANLIĞI MALİ İŞLERİ');
  if doc @@ mk_tsquery('din işleri') then
    raise exception 'mk_tsquery: uzakta geçen "din" ve "işleri" hâlâ eşleşiyor';
  end if;
  if not (doc @@ mk_tsquery_expand('din işleri', 0)) then
    raise exception 'mk_tsquery_expand(q, 0): eski davranış (uzak eşleşme) çalışmıyor';
  end if;

  -- Three words: each neighbouring pair has to be near, so a title still matches.
  doc := to_tsvector('tr_rg', 'TAPU VE KADASTRO DAİRESİ HARÇ VE ÜCRETLER YASASI');
  if not (doc @@ mk_tsquery('harç ve ücret yasası')) then
    raise exception 'mk_tsquery: üç+ sözcüklü başlık eşleşmiyor';
  end if;

  -- Synonym expansion still works inside a proximity pair.
  doc := to_tsvector('tr_rg', 'ZORLA MAL İKTİSABI LEFKOŞA KÖYÜ');
  if not (doc @@ mk_tsquery('kamulaştırma lefkoşa')) then
    raise exception 'mk_tsquery: eşanlamlı genişletme yakınlık dalında çalışmıyor';
  end if;

  -- Operators keep their old meaning: no proximity, no rewrite.
  if mk_tsquery('din OR işleri')::text <> '''din'':* | ''isleri'':*' then
    raise exception 'mk_tsquery: OR sorgusu değişti: %', mk_tsquery('din OR işleri')::text;
  end if;
  if mk_tsquery('din -işleri')::text <> '''din'':* & !''isleri'':*' then
    raise exception 'mk_tsquery: eksi (-) sorgusu değişti: %', mk_tsquery('din -işleri')::text;
  end if;
  if mk_tsquery('"din işleri"')::text <> '''din'':* <-> ''isleri'':*' then
    raise exception 'mk_tsquery: tırnaklı ifade değişti: %', mk_tsquery('"din işleri"')::text;
  end if;

  -- One word is untouched.
  if mk_tsquery('fon')::text <> '''fon'':*' then
    raise exception 'mk_tsquery: tek sözcüklü sorgu değişti: %', mk_tsquery('fon')::text;
  end if;
end
$$;
