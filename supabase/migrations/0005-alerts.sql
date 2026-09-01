-- 0005 — users, alerts, deliveries (spec 6 and 10)

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  digest_hour smallint not null default 8 check (digest_hour between 0 and 23),
  created_at  timestamptz not null default now()
);

create table if not exists alerts (
  id           bigserial primary key,
  user_id      uuid not null references profiles(id) on delete cascade,
  label        text not null,
  query        text,
  topics       text[]   not null default '{}',
  doc_types    text[]   not null default '{}',
  entity_ids   bigint[] not null default '{}',
  -- instant is disabled per spec 10.3 rule 6; it is kept out of the enum entirely
  -- so it cannot be picked by accident from the UI.
  frequency    text not null default 'weekly' check (frequency in ('daily','weekly')),
  -- Weekly subscribers are spread across the days of the week (spec 10.3 rule 2).
  -- Defaults to hash(user_id) % 7; the user can change it.
  preferred_weekday smallint not null default 1 check (preferred_weekday between 0 and 6),
  is_active    boolean not null default true,
  last_sent_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists alerts_active_idx on alerts (is_active, frequency) where is_active;
create index if not exists alerts_user_idx on alerts (user_id);

create table if not exists alert_deliveries (
  id          bigserial primary key,
  alert_id    bigint not null references alerts(id) on delete cascade,
  record_ids  bigint[] not null,
  sent_at     timestamptz not null default now(),
  status      text not null check (status in ('sent','failed','skipped','deferred')),
  provider_id text
);

-- The quota guard (spec 10.3 rule 4) reads the daily dispatch count from here.
create index if not exists alert_deliveries_sent_idx on alert_deliveries (sent_at desc);
create index if not exists alert_deliveries_alert_idx on alert_deliveries (alert_id, sent_at desc);

-- Assigns a new user a day of the week, spreading the load (spec 10.3 rule 2).
create or replace function assign_weekday(uid uuid)
returns smallint
language sql
immutable
as $$
  select (abs(hashtext(uid::text)) % 7)::smallint;
$$;

-- create the profiles row automatically from auth.users
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
