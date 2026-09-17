-- Automated detection for the gap classes the `verify-issue` skill was written
-- to catch by hand (see .claude/skills/verify-issue/SKILL.md): a record with no
-- body at all, a legal instrument with no reference number for the pipeline to
-- anchor on, a body that swallowed a neighboring record's text whole, or a body
-- whose tail is really the next page's running header. Daily ingest now flags
-- these automatically (scripts/daily/flag-review.ts) so they surface without
-- someone remembering to run the skill manually.
--
-- This only flags -- it never rewrites body content. Fixing still needs a human
-- to read the source PDF and transcribe, exactly as documented in the skill.
alter table records add column if not exists review_flags text[];
alter table records add column if not exists review_flagged_at timestamptz;

comment on column records.review_flags is
  'Otomatik ingest denetiminin şüphelendiği durumlar: no_body, no_anchor, neighbor_bleed, masthead_bleed. NULL = temiz.';
comment on column records.review_flagged_at is
  'review_flags son güncellendiği zaman (denetim tekrar temiz bulursa NULL''a döner ve bu da NULL olur).';

create index if not exists records_review_flags_idx on records using gin (review_flags)
  where review_flags is not null;
