-- 20 KB gövde tavanı kaldırıldı; arama vektörü 30 KB ile sınırlandı;
-- records.text_quality eklendi.
--
-- NEDEN
-- Tavan Supabase 500 MB sınırı için konmuştu ve fazla temkinliydi: Postgres
-- TOAST, 2 KB üstü değerleri zaten otomatik sıkıştırıyor ve hukuki metin çok
-- tekrarlı olduğu için %70-80 sıkışıyor. Ham bayt hesabı gerçek maliyeti üç
-- dört kat abartıyordu.
--
-- Bedeli ölçüldü: 670 kaydın gövdesi 18.432 karakterde kesilmişti (625'i
-- cümle ortasında). Kayıt 2977'de kesilen %19'un içinde "KARAR: Kurul,
-- 10-149/2025..." yani hükmün kendisi vardı; PDF'te temiz duruyordu,
-- veritabanında yoktu. Ürünün var olma sebebi tam olarak o cümleyi
-- bulunabilir kılmak.
--
-- Yeni kural: body_text tam saklanır. search_vector yalnızca başlık + konu +
-- gövdenin ilk 30.720 karakterinden üretilir, böylece GIN indeksi kontrol
-- altında kalır. Uzun bir bütçe belgesinin 40. sayfasındaki kelimeyle arama
-- yapılamaması kabul edilebilir; hükmün sayfada hiç görünmemesi değil.

-- NOT: burada acik `begin/commit` YOK.
-- postgres.js havuzlu baglantida acik transaction'i reddediyor
-- ("UNSAFE_TRANSACTION: Only use sql.begin, sql.reserved or max: 1") ve
-- migration runner exit 1 veriyor — is aslinda uygulanmis olsa bile.
-- Zaten gerek de yok: `sql.unsafe()` cok ifadeli metni simple query protokolu
-- ile gonderiyor, PostgreSQL onu ortuk tek transaction olarak calistiriyor.
-- Asil atomiklik ihtiyaci olan search_vector islemi zaten tek bir DO blogunda.

-- DIKKAT: scripts/migrate/index.ts bir takip tablosu tutmuyor, her koşumda
-- BÜTÜN .sql dosyalarını yeniden çalıştırıyor. search_vector'ü koşulsuz
-- düşürüp yeniden eklersek her `npm run db:migrate` çağrısı records
-- tablosunun tamamını yeniden yazar ve site o sürede kilitlenir. Bu yüzden
-- iş, yalnızca kolon henüz yeni tanımda değilse yapılıyor.
do $$
declare
  current_expr text;
begin
  select generation_expression into current_expr
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'records'
     and column_name = 'search_vector';

  -- Zaten 30.720 sınırlı tanımdaysa hiçbir şey yapma (idempotent).
  if current_expr is not null and current_expr like '%30720%' then
    raise notice '0011: search_vector zaten güncel, atlanıyor';
    return;
  end if;

  raise notice '0011: search_vector yeniden kuruluyor (tablo yeniden yazılacak)';

  drop index if exists records_search_idx;
  alter table records drop column if exists search_vector;

  alter table records
    add column search_vector tsvector generated always as (
      setweight(to_tsvector('tr_rg', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('tr_rg', coalesce(subject, '')), 'B') ||
      -- 30.720 KARAKTER (bayt değil). Generated column ifadesinin IMMUTABLE
      -- olması şart; bayt bazlı kesme bunu karşılamıyor ve zaten çok baytlı
      -- karakterlerde bu projeyi bir kez ısıran hatanın kaynağıydı.
      -- Türkçe metinde ~1,05 bayt/karakter, yani pratikte ~32 KB.
      setweight(to_tsvector('tr_rg', left(coalesce(body_text, ''), 30720)), 'C')
    ) stored;

  create index records_search_idx on records using gin (search_vector);
end
$$;

-- Kayıt bazlı metin kalitesi.
-- issues.text_quality yanıltıcı: sayının tamamını puanlıyor ve hasar sayfa
-- düzeyinde olduğu için 28-49 sayfaya bölününce eriyor. Kayıt 2977'nin sayısı
-- 0,972 puanla "temiz" görünüyordu. Bu kolon, kaydın kapsadığı sayfa
-- aralığının karakterle ağırlıklı ortalamasını tutar (scripts/rg_teshis.py
-- ile aynı ölçü). Nullable: henüz ölçülmemiş kayıt null kalır.
alter table records add column if not exists text_quality real;

comment on column records.text_quality is
  'Kaydın kapsadığı PDF sayfalarının karakterle ağırlıklı sözlük isabeti (0-1). '
  'issues.text_quality çıkarmanın BAŞARISINI ölçer; bu kolon çıkan metnin '
  'OKUNABİLİRLİĞİNİ ölçer. İkisi karıştırılmamalı.';
