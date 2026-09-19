-- Consolidated legislation (yasalar first; tüzükler reuse the same table via `kind`).
--
-- One row per law. Two upstream sources can hold a copy of the same law:
--   portal   mevzuat.mahkemeler.net  (wide coverage, copies of mixed age)
--   official mevzuat.gov.ct.tr       (narrow coverage, mostly newer)
-- body_text is the copy with the newer Last-Modified of the two, and body_source
-- says which source it came from. The table is a static snapshot loaded once:
-- nothing in the app writes to it. Nothing here is the legal text of record; the
-- page must always link back to the source file.
--
-- Same idempotency rule as every other migration: scripts/migrate/index.ts
-- reruns all files, so everything is `if not exists` / drop-then-create.

create table if not exists legislation (
  id                 bigserial primary key,
  slug               text not null unique,
  kind               text not null check (kind in ('yasa', 'tuzuk')),
  lang               text not null default 'tr' check (lang in ('tr', 'en')),

  -- Identity across both sources: 'N/YIL' ('23/2016'), 'Fasıl N' ('F12') or,
  -- for the English collection, 'Cap N' ('C12'). Null only when a source gives
  -- nothing to key on (tüzükler; matched by normalized title instead).
  law_key            text,
  law_number         integer,
  law_year           integer,

  title              text not null,
  title_normalized   text not null,            -- tr-lowercase + unaccent, done application-side

  -- The copy currently shown.
  body_text          text,
  body_source        text check (body_source in ('portal', 'official')),
  body_modified_at   timestamptz,              -- Last-Modified of the winning file, NOT the legal effective date
  body_hash          text,                     -- sha256 of body_text
  extract_status     text not null default 'pending'
                       check (extract_status in ('pending', 'ok', 'failed', 'unsupported')),
  -- True when the text was typed out by hand from page scans (files with no text
  -- layer at all). The page says so: a hand copy can carry a slip a machine would not.
  transcribed        boolean not null default false,

  -- Both candidate files, for the record, whichever one body_text came from.
  portal_url         text,
  portal_modified_at timestamptz,
  official_url       text,
  official_modified_at timestamptz,

  checked_at         timestamptz,              -- when the source files' dates were last checked
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- tsvector caps out at 1 MB; the longest laws are far under it, the left()
  -- is only a guard so one oversized file can never break the insert.
  search_vector      tsvector generated always as (
                       setweight(to_tsvector('tr_rg', coalesce(title, '')), 'A') ||
                       setweight(to_tsvector('tr_rg', left(coalesce(body_text, ''), 500000)), 'C')
                     ) stored
);

-- For databases that ran an earlier draft of this file.
alter table legislation add column if not exists transcribed boolean not null default false;

create unique index if not exists legislation_key_uidx
  on legislation (kind, lang, law_key) where law_key is not null;
create index if not exists legislation_search_idx on legislation using gin (search_vector);
create index if not exists legislation_title_trgm_idx
  on legislation using gin (title_normalized gin_trgm_ops);
create index if not exists legislation_kind_year_idx
  on legislation (kind, law_year desc nulls last, law_number desc nulls last);

-- Public read, service-role write (same as records, 0006).
alter table legislation enable row level security;
drop policy if exists legislation_public_read on legislation;
create policy legislation_public_read on legislation for select using (true);
