-- 0004 — varlıklar: kurum, şirket, yerleşim yeri (spec 6)
-- Kişi bilerek yok: /kisi/[slug] üretilmiyor (spec 3.7 madde 1).

create table if not exists entities (
  id              bigserial primary key,
  kind            text not null check (kind in ('institution','company','place')),
  slug            text not null unique,
  name            text not null,
  name_normalized text not null,
  aliases         text[] not null default '{}',
  district        text,
  meta            jsonb not null default '{}',
  record_count    integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists entities_name_trgm_idx on entities using gin (name_normalized gin_trgm_ops);
create index if not exists entities_kind_count_idx on entities (kind, record_count desc);

create table if not exists record_entities (
  record_id  bigint not null references records(id) on delete cascade,
  entity_id  bigint not null references entities(id) on delete cascade,
  confidence real not null default 1.0,
  primary key (record_id, entity_id)
);

create index if not exists record_entities_entity_idx on record_entities (entity_id, record_id desc);

-- Varlık sayaçlarını yeniden hesaplar. Ingest'in index aşaması çağırır (spec 7.1 adım 7).
create or replace function refresh_entity_counts(target_ids bigint[] default null)
returns void
language sql
as $$
  update entities e
     set record_count = coalesce(c.n, 0)
    from (
      select entity_id, count(*)::int as n
        from record_entities
       group by entity_id
    ) c
   where c.entity_id = e.id
     and (target_ids is null or e.id = any(target_ids));
$$;

-- Spec 8.5: bir varlıkla en çok birlikte geçen diğer varlıklar.
create or replace function co_occurring_entities(target_id bigint, limit_n int default 8)
returns table (id bigint, kind text, slug text, name text, shared_records bigint)
language sql
stable
as $$
  select e.id, e.kind, e.slug, e.name, count(*) as shared_records
    from record_entities a
    join record_entities b on b.record_id = a.record_id and b.entity_id <> a.entity_id
    join entities e on e.id = b.entity_id
   where a.entity_id = target_id
   group by e.id, e.kind, e.slug, e.name
   order by shared_records desc, e.name
   limit limit_n;
$$;
