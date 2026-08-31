-- 0007 — arama fonksiyonları (spec 5.4)

/*
 * Eşanlamlı ve köprü sözlüğü.
 *
 * Spec 5.2 bunu dosya tabanlı bir synonym dictionary olarak tarif ediyor ve
 * Supabase'de $SHAREDIR'a yazılamadığı için "uygulama katmanında sorgu
 * genişletmesi" tavizini kabul ediyor. Bunu TABLO olarak yapıyoruz; çünkü
 * uygulama katmanında yapılırsa alarm eşleştirmesi (spec 10.2) aynı genişletmeyi
 * almaz ve "kullanıcının aramada gördüğü ile alarmda aldığı birebir aynıdır"
 * vaadi bozulurdu. Tabloda olunca iki taraf da aynı fonksiyondan geçiyor.
 */
create table if not exists search_synonyms (
  term        text not null,
  alternative text not null,
  primary key (term, alternative)
);

create index if not exists search_synonyms_term_idx on search_synonyms (term);

-- Alan terimleri (spec 5.2 örnek listesi). Çift yönlü yazılıyor.
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
  -- Ünsüz yumuşaması köprüleri: önek eşleşmesinin kapatamadığı tek boşluk.
  -- "tüzük" araması "tüzüğünde" geçen kaydı bulmalı (k -> ğ, unaccent sonrası g).
  ('tuzuk', 'tuzug'),
  ('toprak', 'toprag'),
  ('kaynak', 'kaynag'),
  ('ocak', 'ocag'),
  ('yaprak', 'yaprag'),
  ('sozlesme', 'sozlesmes')
on conflict do nothing;

/*
 * Sorgu üretimi — spec 5.4 adım 2-4.
 *
 * websearch_to_tsquery kullanıcı sözdizimini (tırnaklı ifade, OR, eksi) kendisi
 * güvenle ayrıştırıyor; onun çıktısını alıp iki şey ekliyoruz:
 *
 *   1. Her sözcüğe :* öneki. Türkçe eklemeli ve ekler sona geldiği için önek
 *      eşleşmesi gövdelemenin işini yapıyor (bkz. 0002 ölçümü).
 *   2. search_synonyms'teki karşılıklar OR ile ekleniyor.
 *
 * İki aşamalı değiştirme (önce yer tutucu, sonra açılım) kullanılıyor; tek
 * aşamada yapılırsa üretilen alternatifler yeniden eşleşip sonsuz genişliyor.
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

  -- Aşama 1: her benzersiz lexeme'i yer tutucuya çevir
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

  -- Aşama 2: yer tutucuları açılımlarıyla değiştir
  for idx in 1 .. coalesce(array_length(markers, 1), 0) loop
    base_text := replace(base_text, markers[idx], expansions[idx]);
  end loop;

  return base_text::tsquery;
exception
  when others then
    -- Bozuk bir sorgu arama sayfasını düşürmemeli; ham hâline geri dönüyoruz.
    return websearch_to_tsquery('tr_rg', q);
end;
$$;

-- Tazelik çarpanı: son 90 gün x1.5, son 1 yıl x1.2, gerisi x1.0 (spec 5.4).
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

-- 0 sonuç dönünce "bunu mu demek istediniz" (spec 5.4 adım 7).
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

-- Config doğru kurulduysa bu sorguların hepsi eşleşmeli.
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

  -- Negatif kontrol: alakasız sorgu eşleşmemeli, yoksa önek fazla geniş demektir.
  if to_tsvector('tr_rg', 'MARKA TESCİL MÜRACAATI İLANI') @@ mk_tsquery('kamulastirma') then
    raise exception 'mk_tsquery: alakasız sorgu eşleşiyor, önek fazla geniş';
  end if;
end
$$;
