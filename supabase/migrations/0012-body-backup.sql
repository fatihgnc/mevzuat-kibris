-- Yeniden çıkarım öncesi gövde yedeği.
--
-- NEDEN
-- Yeniden çıkarım `processIssue` üzerinden gidiyor ve `body_text`'i yerinde
-- eziyor. Çıkarma hattı değiştiğinde (anchor toleransı, tavanın kaldırılması)
-- kayıtların çoğu düzeliyor ama bir kısmı KÖTÜLEŞEBİLİR: yeni bir anchor
-- eşleşmesi gövdeyi erken kesebilir, ya da o koşumda PDF'ten metin hiç
-- çıkmayabilir. Yedek olmadan bu geri alınamaz — PDF saklamıyoruz, eski metni
-- yeniden üretmenin yolu yok.
--
-- Ürün sahibinin kuralı: "Eski metni sakla. Skoru düşen kaydı atla ve sayısını
-- raporla."
--
-- Yedek KALICI DEĞİL: yeniden çıkarım doğrulandıktan sonra bu tablo düşürülür.
-- O zamana kadar 500 MB bütçesinden yer yiyor, bu yüzden yalnızca dokunulan
-- kayıtlar yedekleniyor, tablonun tamamı değil.

create table if not exists record_body_backup (
  record_id   bigint primary key references records(id) on delete cascade,
  body_text   text,
  page_from   smallint,
  -- Hangi koşumun yedeklediği; birden çok tur olursa ayırt etmek için.
  run_label   text not null,
  captured_at timestamptz not null default now()
);

create index if not exists record_body_backup_run_idx on record_body_backup (run_label);

comment on table record_body_backup is
  'Yeniden çıkarım öncesi gövde yedeği. Kayıt kötüleşirse buradan geri yazılır. '
  'Doğrulama bittikten sonra düşürülecek geçici tablo.';
