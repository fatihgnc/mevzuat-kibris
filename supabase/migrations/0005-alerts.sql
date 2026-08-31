-- 0005 — kullanıcı, alarm, gönderim (spec 6 ve 10)

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
  -- instant spec 10.3 madde 6 uyarınca kapalı; enum'a hiç girmiyor ki
  -- arayüzden yanlışlıkla seçilemesin.
  frequency    text not null default 'weekly' check (frequency in ('daily','weekly')),
  -- Haftalık aboneler haftanın gününe dağıtılır (spec 10.3 madde 2).
  -- Varsayılan hash(user_id) % 7; kullanıcı değiştirebilir.
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

-- Kota bekçisi (spec 10.3 madde 4) günlük gönderim sayısını buradan okur.
create index if not exists alert_deliveries_sent_idx on alert_deliveries (sent_at desc);
create index if not exists alert_deliveries_alert_idx on alert_deliveries (alert_id, sent_at desc);

-- Yeni kullanıcıya haftanın gününü dağıtarak atar (spec 10.3 madde 2).
create or replace function assign_weekday(uid uuid)
returns smallint
language sql
immutable
as $$
  select (abs(hashtext(uid::text)) % 7)::smallint;
$$;

-- profiles satırını auth.users'tan otomatik oluştur
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
