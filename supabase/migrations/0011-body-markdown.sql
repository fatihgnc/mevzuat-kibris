-- Pilot for the DeepSeek-OCR replacement extraction path (see project notes on the
-- SHOW_RECORD_BODIES = false decision in src/components/record-detail/index.tsx).
--
-- The old pipeline's body_text scrambles list order and corrupts dotted/dotless I
-- (spec: pdfminer/pdftotext read a broken embedded font cmap). A self-hosted
-- vision OCR model (DeepSeek-OCR) reads the rendered page image instead, sidestepping
-- that font bug, and returns GitHub-flavored markdown (with HTML tables) rather than
-- flat text. body_text stays as the search-indexed plain-text source (unchanged
-- pipeline); body_markdown is the new, render-ready column, populated only for
-- records that go through the new path. NULL means "not migrated yet" -- never
-- "empty on purpose" (has_own_page / body_text already cover that case).
alter table records add column if not exists body_markdown text;

alter table records add column if not exists text_source text
  check (text_source in ('legacy_pdfminer', 'deepseek_ocr'));

comment on column records.body_markdown is
  'DeepSeek-OCR ile üretilen, doğrudan render edilebilir GitHub-flavored markdown gövde (tablolar dahil). NULL = bu kayıt henüz yeni akışla işlenmedi.';

comment on column records.text_source is
  'body_markdown''in nereden geldiği: legacy_pdfminer (eski pipeline, artık kullanılmıyor) veya deepseek_ocr (yeni, self-hosted vizyon OCR). NULL = henüz işlenmedi.';
