-- Widens records.search_vector to also index body_markdown (the Mistral OCR
-- text, migration 0011) -- until now it only ever indexed body_text, so the
-- ~24k records already backfilled with Mistral OCR are unsearchable by their
-- own body text and get no snippet either. Prefers body_markdown when a
-- record has one (it is the higher-quality source); falls back to body_text
-- otherwise, same as everywhere else this pair of columns is read together.
--
-- left(..., 30720): to_tsvector's output (a tsvector) has a hard 1MB limit
-- (Postgres error "string is too long for tsvector"), and a handful of
-- records are multi-megabyte gazette-wide tables (see the prerender-size
-- guard in src/lib/db/queries/records.ts). The production column already
-- truncated body_text at this same 30720-character length for this exact
-- reason -- that cap was applied directly on the database at some point and
-- never captured in a migration file, so this also documents the drift.
-- 30k characters of a record's opening text is far more than any query
-- needs to match against; nobody is searching for a name buried on row 6000
-- of a tax-declaration table.
--
-- This runs on every `npm run db:migrate` (scripts/migrate/index.ts has no
-- applied-migrations table -- see its own comment), so the drop+recreate
-- below -- a full-table rewrite, the only way Postgres lets you change a
-- STORED generated column's expression -- is gated on the column not already
-- matching. Without the guard, every migrate run would rewrite all ~24k rows
-- for nothing.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_name = 'records'
       and column_name = 'search_vector'
       and generation_expression like '%body_markdown%'
  ) then
    drop index if exists records_search_idx;
    alter table records drop column search_vector;
    alter table records add column search_vector tsvector generated always as (
      setweight(to_tsvector('tr_rg', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('tr_rg', coalesce(subject, '')), 'B') ||
      setweight(to_tsvector('tr_rg', left(coalesce(nullif(body_markdown, ''), body_text, ''), 30720)), 'C')
    ) stored;
    create index records_search_idx on records using gin (search_vector);
  end if;
end $$;
