-- 0003 — gazete sayıları, kayıtlar, konular (spec 6)

create table if not exists issues (
  id             bigserial primary key,
  year           smallint not null,
  number         integer  not null,
  published_at   date     not null,
  pdf_url        text     not null,            -- orijinal kaynak; PDF saklanmıyor (spec 3.6)
  page_count     smallint,
  text_status    text not null default 'pending'
                 check (text_status in ('pending','extracted','ocr','failed','needs_review')),
  text_quality   real check (text_quality between 0 and 1),
  retry_count    smallint not null default 0,  -- spec 7.2 yeniden deneme kuyruğu, 3'te durur
  raw_index_html text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (year, number)
);

create index if not exists issues_published_idx on issues (published_at desc);
create index if not exists issues_retry_idx on issues (text_status, retry_count)
  where text_status in ('failed','needs_review');

create table if not exists records (
  id                bigserial primary key,
  issue_id          bigint not null references issues(id) on delete cascade,
  slug              text not null unique,
  section           text not null,
  doc_type          text not null,
  ref_type          text,
  ref_number        text,
  title             text not null,             -- ham başlık, hiç değiştirilmez
  title_normalized  text not null,             -- tr-lowercase + unaccent (uygulama tarafında)
  subject           text,
  body_text         text,                      -- 20 KB'de kesilir (spec 14.3)
  summary           text,                      -- üretilen özet cümle (spec 3.8), kalıcı
  summary_source    text check (summary_source in ('rule','llm')),
  deadline_at       date,                      -- münhal/ihale son başvuru (spec 3.9)
  deadline_note     text,
  page_from         smallint,
  page_to           smallint,
  published_at      date not null,             -- issues.published_at denormalize
  related_record_id bigint references records(id) on delete set null,
  corrects_id       bigint references records(id) on delete set null,
  has_personal_data boolean not null default false,
  -- Spec 8.2 madde 2: 200 karakterden kısa ve varlık bağlantısı olmayan kayıt
  -- kendi sayfasını almaz; yalnızca sayı sayfasında anchor alır. Ingest yazar.
  has_own_page      boolean not null default true,
  search_vector     tsvector generated always as (
                      setweight(to_tsvector('tr_rg', coalesce(title, '')), 'A') ||
                      setweight(to_tsvector('tr_rg', coalesce(subject, '')), 'B') ||
                      setweight(to_tsvector('tr_rg', coalesce(body_text, '')), 'C')
                    ) stored,
  created_at        timestamptz not null default now()
);

create index if not exists records_search_idx on records using gin (search_vector);
create index if not exists records_title_trgm_idx on records using gin (title_normalized gin_trgm_ops);
create index if not exists records_published_idx on records (published_at desc);
create index if not exists records_doctype_published_idx on records (doc_type, published_at desc);
create index if not exists records_issue_idx on records (issue_id);
-- /konu/munhal "başvurusu açık" filtresi bu indeksten geçer
create index if not exists records_deadline_idx on records (deadline_at)
  where deadline_at is not null;

create table if not exists topics (
  slug        text primary key,
  name        text not null,
  description text not null,
  sort_order  smallint not null
);

create table if not exists record_topics (
  record_id bigint not null references records(id) on delete cascade,
  topic     text   not null references topics(slug),
  primary key (record_id, topic)
);

-- Konu akışı sorgusu: konuya göre filtrele, tarihe göre sırala
create index if not exists record_topics_topic_idx on record_topics (topic, record_id desc);

create table if not exists ingest_runs (
  id          bigserial primary key,
  kind        text not null check (kind in ('daily','backfill','retry')),
  target_year smallint,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  status      text not null default 'running' check (status in ('running','ok','failed')),
  issues_seen integer not null default 0,
  issues_new  integer not null default 0,
  records_new integer not null default 0,
  errors      jsonb not null default '[]'
);

create table if not exists search_logs (
  id           bigserial primary key,
  query        text not null,
  result_count integer not null,
  created_at   timestamptz not null default now()
);

create index if not exists search_logs_empty_idx on search_logs (created_at desc)
  where result_count = 0;
