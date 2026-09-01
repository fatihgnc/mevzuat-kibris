-- A ninth topic: Citizenship (Yurttaşlık).
--
-- It came from real data. When the 2025 archive was processed, of the 1,595 records
-- left without a topic, 537 (a third) had the form "X'in KKTC YURTTAŞLIĞINA ALINMASI"
-- and fitted none of the existing eight topics.
--
-- Why it is written as a migration: the record_topics.topic column is a foreign
-- key to topics(slug). Without the topic row the classifier cannot write the
-- record. `scripts/seed` populates this table but only runs on db:reset;
-- a database loaded with real data cannot be reset.
--
-- The texts match src/lib/constants/topics.ts; that file is the single source and
-- seed refreshes this row every time it runs.

insert into topics (slug, name, description, sort_order)
values (
  'yurttaslik',
  'Yurttaşlık',
  'Bakanlar Kurulunun KKTC yurttaşlığına alınma kararları. Kayıtlar kişi adı taşıdığı için kişiye özel sayfa üretilmez; tam metin için resmî PDF sayfasına yönlendirilirsiniz.',
  9
)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      sort_order  = excluded.sort_order;
