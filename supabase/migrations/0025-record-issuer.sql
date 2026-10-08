-- Who published a vacancy notice: the Kamu Hizmeti Komisyonu or another body.
--
-- Measured 2026-10-08 on the 234 records of the 'munhal' topic: 207 are KHK
-- circulars and 27 are notices an institution issued itself (Polis Genel
-- Müdürlüğü, Güvenlik Kuvvetleri, Yüksek Savcılar Kurulu, Yüksek Adliye Kurulu,
-- Sivil Savunma Teşkilatı, Sayıştay). The title cannot tell them apart: a KHK
-- circular often carries only the department's name ("Trafik Dairesi ... MİA.17"),
-- so the value is derived from the text by scripts/classify/rules.ts
-- (classifyIssuer) and stored, rather than guessed at query time.
--
-- NULL = not decided (no body text yet and no evidence in the title). The topic
-- rail's "Yayıncı" filter leaves those under "Tümü" only.

alter table records add column if not exists issuer text;

alter table records drop constraint if exists records_issuer_check;
alter table records add constraint records_issuer_check
  check (issuer is null or issuer in ('khk', 'diger'));

create index if not exists records_issuer_idx on records (issuer)
  where issuer is not null;
