-- Progress marker for the DeepSeek-OCR backfill/daily run (deepseek-run.ts).
--
-- One GPU pass over an issue's PDF yields text for EVERY record in it, so the
-- runner processes whole issues, not individual records. This column is what
-- lets it pick up where it left off: "where deepseek_ocr_at is null" is the
-- entire work queue, for both the backfill (old issues) and newly-ingested
-- ones (new issues start with this null too, since nothing sets it but this
-- runner). Set even when an issue turns out to have zero extractable records
-- (e.g. all A.E./older-era refs with no printed body anchor, spec note in
-- parser.ts bodyAnchor) -- otherwise the runner would retry it forever.
alter table issues add column if not exists deepseek_ocr_at timestamptz;

comment on column issues.deepseek_ocr_at is
  'Bu sayının DeepSeek-OCR ile ne zaman işlendiği. NULL = henüz işlenmedi (backfill kuyruğunda). scripts/extract-text/deepseek-run.ts tarafından yazılır.';
