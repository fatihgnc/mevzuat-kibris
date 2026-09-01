-- 0006 — RLS (spec 6)
-- Public data is readable by everyone; user-owned data only by its owner.
-- Ingest service role key ile yazar, RLS'i baypas eder.

alter table issues          enable row level security;
alter table records         enable row level security;
alter table topics          enable row level security;
alter table record_topics   enable row level security;
alter table entities        enable row level security;
alter table record_entities enable row level security;
alter table profiles        enable row level security;
alter table alerts          enable row level security;
alter table alert_deliveries enable row level security;
alter table ingest_runs     enable row level security;
alter table search_logs     enable row level security;

-- Public read
do $$
declare t text;
begin
  foreach t in array array['issues','records','topics','record_topics','entities','record_entities']
  loop
    execute format('drop policy if exists %I on %I', t || '_public_read', t);
    execute format('create policy %I on %I for select using (true)', t || '_public_read', t);
  end loop;
end
$$;

-- User-owned tables
drop policy if exists profiles_own on profiles;
create policy profiles_own on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists alerts_own on alerts;
create policy alerts_own on alerts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists alert_deliveries_own on alert_deliveries;
create policy alert_deliveries_own on alert_deliveries
  for select using (
    exists (select 1 from alerts a where a.id = alert_id and a.user_id = auth.uid())
  );

-- ingest_runs and search_logs: open to nobody, service role only.
-- Search log writes go through /api/search-suggest with the service role;
-- opening writes to the anon client would let the log be polluted.
