import { SITE_NAME } from '@/lib/seo/config';
import { cn } from '@/lib/utils';

/**
 * The "the original text is what binds" notice — spec 3.6 and 16.
 * It appears on every record and list page; it also counts as evidence of source
 * transparency in the AdSense application (spec 14.5 rule 6).
 */
export function SourceNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'border-t border-line pt-4 text-sm leading-[1.55] text-ink-muted',
        className,
      )}
    >
      {SITE_NAME} resmî bir kurum değildir. Bu sayfa Resmî Gazete PDF&apos;inden otomatik
      çıkarılmıştır. Hukuken bağlayıcı olan, gazetede yayımlanan resmî metindir.
    </p>
  );
}

/** The yellow band above the body on records whose text was read by OCR. */
export function OcrNotice({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-x-2 gap-y-1 rounded border border-notice-border bg-notice px-3.5 py-2.5 text-sm text-notice-ink',
        className,
      )}
    >
      <span className="font-semibold">Metin otomatik okundu.</span>
      <span>Harf hataları olabilir; bağlayıcı olan resmî PDF&apos;teki metindir.</span>
    </p>
  );
}
