-- Adds Mistral OCR 3 as a second body_markdown source alongside DeepSeek-OCR
-- (migration 0011). See HANDOFF.md §8.5: measured against DeepSeek-OCR, Mistral
-- OCR 3 (model mistral-ocr-2512) had no hallucinations, clean tables needing no
-- repair, and ~70x the throughput -- the pilot in this migration is to confirm
-- that on real records before committing to a full backfill.
alter table records drop constraint if exists records_text_source_check;

alter table records add constraint records_text_source_check
  check (text_source in ('legacy_pdfminer', 'deepseek_ocr', 'mistral_ocr'));

-- Separate progress column from issues.deepseek_ocr_at (migration 0012): the two
-- engines are being run independently during the pilot, so an issue done by one
-- must not look "done" to the other.
alter table issues add column if not exists mistral_ocr_at timestamptz;

comment on column issues.mistral_ocr_at is
  'Bu sayının Mistral OCR 3 ile ne zaman işlendiği. NULL = henüz işlenmedi. scripts/extract-text/mistral-run.ts tarafından yazılır.';
