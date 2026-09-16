-- 0016 — RLS backfill for two tables added after 0006 without policies
-- (Supabase security advisor: rls_disabled_in_public).

-- record_body_backup: a raw pre-OCR-migration snapshot of body_text, ungated
-- by the has_personal_data masking the site applies everywhere else. Same
-- treatment as ingest_runs/search_logs — service role only, no public policy.
alter table record_body_backup enable row level security;

-- search_synonyms: a lookup table for query expansion, no different from
-- topics or entities — public data, public read.
alter table search_synonyms enable row level security;

drop policy if exists search_synonyms_public_read on search_synonyms;
create policy search_synonyms_public_read on search_synonyms
  for select using (true);
