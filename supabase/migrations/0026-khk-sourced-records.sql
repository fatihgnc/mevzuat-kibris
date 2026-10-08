-- Records that come straight from khk.gov.ct.tr and never appeared in a gazette issue.
--
-- The Kamu Hizmeti Komisyonu publishes every vacancy circular on its own site, but
-- the Resmî Gazete carries only part of them (measured 2026-10-08: of 391 circulars
-- listed for 2022-2026, 177 were in the archive; all 190 yükselme "MT" circulars and
-- most teacher/other announcements were not). Those records have no issue, so
-- `issue_id` becomes optional and the source PDF is kept on the record.
--
-- NULL issue_id = taken from `source_url`. The app builds no /sayilar link for these.

alter table records alter column issue_id drop not null;

alter table records add column if not exists source_url text;

alter table records drop constraint if exists records_source_check;
alter table records add constraint records_source_check
  check (issue_id is not null or source_url is not null);

create unique index if not exists records_source_url_key on records (source_url)
  where source_url is not null;
