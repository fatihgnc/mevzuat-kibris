-- Dokuzuncu konu: Yurttaşlık.
--
-- Gerçek veriden geldi. 2025 arşivi işlendiğinde konusuz kalan 1.595 kaydın
-- 537'si (üçte biri) "X'in KKTC YURTTAŞLIĞINA ALINMASI" biçimindeydi ve
-- mevcut sekiz konunun hiçbirine girmiyordu.
--
-- Migration olarak yazılmasının sebebi: record_topics.topic sütunu
-- topics(slug)'a foreign key. Konu satırı olmadan sınıflandırıcı kaydı
-- yazamaz. `scripts/seed` bu tabloyu dolduruyor ama yalnızca db:reset'te
-- çalışıyor; gerçek veri yüklü bir veritabanında reset yapılamaz.
--
-- Metinler src/lib/constants/topics.ts ile aynı; orası tek kaynak ve seed
-- her çalıştığında buradaki satırı tazeliyor.

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
