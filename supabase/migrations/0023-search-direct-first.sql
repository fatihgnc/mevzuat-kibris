-- 0023 — records that contain the searched word itself come before synonym-only hits
--
-- WHY. Search expands every word with its search_synonyms counterparts (0007), so
-- "tapu" also matches records that only say "koçan". That is intended, but results
-- are ordered by date alone, so a synonym-only record can sit above records that
-- contain the word the user typed — "I searched tapu and the first hit never says
-- tapu". Measured on production, 2026-09-25: "tapu" 925 hits, 162 synonym-only;
-- "yönetmelik" 1827 hits, 1715 synonym-only (all of its first 20).
--
-- WHAT. mk_tsquery_direct(q) is the query WITHOUT synonym expansion. The search
-- page sorts by "matches it" first, date second. Matching itself is unchanged:
-- the same records come back, only their order moves.
--
-- BRIDGES ARE NOT SYNONYMS. The consonant-softening rows (tuzuk -> tuzug) are
-- spellings of the same word, not a different word: "tüzüğünde" is a direct hit
-- for "tüzük". They are flagged so the direct query keeps them.

alter table search_synonyms add column if not exists is_bridge boolean not null default false;

update search_synonyms
   set is_bridge = true
 where (term, alternative) in (
   ('tuzuk', 'tuzug'),
   ('toprak', 'toprag'),
   ('kaynak', 'kaynag'),
   ('ocak', 'ocag'),
   ('yaprak', 'yaprag'),
   ('sozlesme', 'sozlesmes')
 );

/*
 * A flat rewrite (the pre-0020 path) is enough here: this only decides which
 * tier a record that already matched mk_tsquery goes into, it never admits one.
 */
create or replace function mk_tsquery_direct(q text) returns tsquery
language plpgsql
stable
as $$
declare
  base_text  text;
  lexeme     text;
  variants   text[];
  alt        text;
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

  for lexeme in
    select distinct m[1] from regexp_matches(base_text, '''([^'']+)''', 'g') m
  loop
    variants := array[quote_literal(lexeme) || ':*'];
    for alt in
      select s.alternative from search_synonyms s where s.term = lexeme and s.is_bridge
    loop
      variants := variants || (quote_literal(alt) || ':*');
    end loop;

    idx := idx + 1;
    marker := '@@' || idx || '@@';
    markers := markers || marker;
    expansions := expansions || (
      case when array_length(variants, 1) > 1
        then '( ' || array_to_string(variants, ' | ') || ' )'
        else variants[1]
      end
    );
    base_text := replace(base_text, quote_literal(lexeme), marker);
  end loop;

  for idx in 1 .. coalesce(array_length(markers, 1), 0) loop
    base_text := replace(base_text, markers[idx], expansions[idx]);
  end loop;

  return base_text::tsquery;
exception
  when others then
    return websearch_to_tsquery('tr_rg', q);
end;
$$;

do $$
begin
  if to_tsvector('tr_rg', 'KOÇAN İLE İLGİLİ İLAN') @@ mk_tsquery_direct('tapu') then
    raise exception 'mk_tsquery_direct: eşanlamlı (koçan) hâlâ doğrudan eşleşme sayılıyor';
  end if;
  if not (to_tsvector('tr_rg', 'TAPU VE KADASTRO DAİRESİ') @@ mk_tsquery_direct('tapu')) then
    raise exception 'mk_tsquery_direct: "tapu" geçen kaydı doğrudan saymıyor';
  end if;
  if not (to_tsvector('tr_rg', 'ELEKTRİK TARİFELERİ DEĞİŞİKLİK TÜZÜĞÜNDE') @@ mk_tsquery_direct('tüzük')) then
    raise exception 'mk_tsquery_direct: ünsüz yumuşaması köprüsü doğrudan sayılmıyor';
  end if;
end
$$;
