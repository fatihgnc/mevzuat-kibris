-- A tenth topic: Exam results (Sınav sonuçları), split out of Münhal.
--
-- Measured 2026-09-25: of the 1,595 records in 'munhal', 1,286 were KHK exam
-- results and 84 were appointment notices pulled in by a bare 'KADROSU'
-- keyword; the vacancies themselves were ~170. The münhal feed read as a feed
-- of results. scripts/classify/rules.ts now sends sinav_sonucu here, and
-- `npm run reclassify` moves the existing records.
--
-- Written as a migration for the same reason as 0008: record_topics.topic is a
-- foreign key to topics(slug), so this row has to exist before the classifier
-- can write the topic. Run it BEFORE the reclassify and before the new rules
-- reach the daily ingest.
--
-- The new topic sits second, after Münhal, so every later topic moves down one.
-- Texts and order match src/lib/constants/topics.ts, which stays the source.

insert into topics (slug, name, description, sort_order)
values (
  'sinav-sonuclari',
  'Sınav sonuçları',
  'Kamu Hizmeti Komisyonu ile kurumların yazılı ve sözlü sınav sonucu duyuruları, baro ve meslek sınavı sonuçları. Bir kadronun ilanı Münhal konusunda, sınavın sonucu burada, atama kararnamesi ise Atama konusunda yer alır.',
  2
)
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      sort_order  = excluded.sort_order;

update topics set sort_order = case slug
  when 'munhal'      then 1
  when 'ihale'       then 3
  when 'sirket'      then 4
  when 'gayrimenkul' then 5
  when 'marka'       then 6
  when 'vergi-mali'  then 7
  when 'mevzuat'     then 8
  when 'atama'       then 9
  when 'yurttaslik'  then 10
  else sort_order
end;
