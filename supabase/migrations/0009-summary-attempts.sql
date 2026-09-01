-- A trace of the LLM summary attempt — the cost side of spec 3.8's staged generation.
--
-- The problem: the third tier of staged generation is "no summary". When a record
-- passes neither the rules nor the LLM, `summary` STAYS null, and staying null is
-- CORRECT. But because `scripts/summarize` selects its work with "summary is null",
-- that record is asked again on every run: on an ingest that runs twice a day, that
-- means paying forever for the same failing titles.
--
-- A null `summary` cannot express two different things: "never attempted" versus
-- "attempted, no safe summary came out". This column is what separates them.
--
-- Why we did not add 'declined' to `summary_source`: that column names the layer
-- that PRODUCED the summary, and its check constraint ('rule','llm') carries that
-- meaning. Claiming a "source" when there is no summary misleads every reader.
alter table records add column if not exists summary_attempted_at timestamptz;

comment on column records.summary_attempted_at is
  'LLM özet katmanının bu kaydı en son ne zaman denediği. Dolu + summary null = denendi, güvenli özet çıkmadı (3. basamak). Yeniden denemek için: scripts/summarize --retry.';

-- NO INDEX, deliberately. A partial index on this column was tried and `explain
-- analyze` never used it: the backfill query is an aggregate that reads ALL matching
-- ROWS and groups them by title/section/ref_type, so a seq scan is already the
-- cheapest path (6,915 records, 19 ms). An unused index did nothing but add weight
-- to every record write.
