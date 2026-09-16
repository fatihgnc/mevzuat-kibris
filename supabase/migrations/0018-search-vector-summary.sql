-- Widens records.search_vector to also index summary (the auto-generated
-- plain-language paraphrase shown as the record's heading, spec 3.8).
--
-- Found via a Reddit report: the displayed heading for A.E. 826 reads "...ve
-- Euro dizel..." (the summariser's own, more natural Turkish rendering of
-- the raw title's "EURO DİESEL"), but summary was never part of
-- search_vector -- only title/subject/body_markdown/body_text (0015). A
-- word the summary invents or rephrases, that the title and body never use
-- verbatim, was unsearchable no matter how many synonym pairs get added to
-- search_synonyms (0007, 0017): synonyms bridge a KNOWN term to a known
-- alternative, they can't cover every paraphrase the summariser might produce.
--
-- Weighted 'B', same as subject: explanatory text a notch below the title's
-- authority, but still what most readers actually read and would type back.
--
-- Same drop+recreate-gated-on-not-already-matching pattern as 0015, for the
-- same reason: scripts/migrate/index.ts has no applied-migrations table and
-- reruns every file on every `npm run db:migrate`, so this must be a no-op
-- once applied.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_name = 'records'
       and column_name = 'search_vector'
       and generation_expression like '%summary%'
  ) then
    drop index if exists records_search_idx;
    alter table records drop column search_vector;
    alter table records add column search_vector tsvector generated always as (
      setweight(to_tsvector('tr_rg', coalesce(title, '')), 'A') ||
      setweight(to_tsvector('tr_rg', coalesce(subject, '')), 'B') ||
      setweight(to_tsvector('tr_rg', coalesce(summary, '')), 'B') ||
      setweight(to_tsvector('tr_rg', left(coalesce(nullif(body_markdown, ''), body_text, ''), 30720)), 'C')
    ) stored;
    create index records_search_idx on records using gin (search_vector);
  end if;
end $$;
