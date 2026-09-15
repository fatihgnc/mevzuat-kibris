-- Marks an issue whose PDF is permanently unreachable AT THE SOURCE (a dead
-- link on basimevi.gov.ct.tr's own archive page, not something we can fix by
-- retrying or re-crawling). First real case: 2025/170, whose archive page
-- links to `170_1.pdf` and that file 404s on their server -- confirmed by
-- fetching the archive page directly, not a parsing mistake on our side.
--
-- Without this flag, such a record shows the generic "we're still working on
-- extracting text" notice (record-detail/index.tsx's
-- BodyTemporarilyUnavailableNotice), which is misleading here: no amount of
-- reprocessing will ever produce a body for it.
alter table issues add column if not exists pdf_broken boolean not null default false;

comment on column issues.pdf_broken is
  'true = kaynağın kendi arşiv sayfası bozuk bir PDF bağlantısına işaret ediyor (404), bizim çıkarma hattımızdan bağımsız, kalıcı bir durum.';
