import type { TextStatus } from '@/types/record';

const LABELS: Record<TextStatus, string | null> = {
  // No badge on cleanly extracted text: an "everything is fine" badge on every
  // page is noise, not information.
  extracted: null,
  pending: 'Metin henüz işlenmedi',
  ocr: 'Metin taramadan okundu',
  needs_review: 'Metin kalitesi düşük',
  failed: 'Metin çıkarılamadı',
};

export function TextQualityBadge({
  status,
  quality,
}: {
  status: TextStatus;
  quality?: number | null;
}) {
  const label = LABELS[status];
  if (!label) return null;

  const percent = typeof quality === 'number' ? Math.round(quality * 100) : null;

  return (
    <span className="inline-flex items-center gap-2 rounded border border-notice-border bg-notice px-2.5 py-1 text-xs text-notice-ink">
      {label}
      {percent !== null ? <span className="opacity-70">okunabilirlik %{percent}</span> : null}
    </span>
  );
}
