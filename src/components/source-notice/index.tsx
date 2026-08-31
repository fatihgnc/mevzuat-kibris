import { SITE_NAME } from '@/lib/seo/config';
import { cn } from '@/lib/utils';

/**
 * "Bağlayıcı olan orijinal metindir" ibaresi — spec 3.6 ve 16.
 * Her kayıt ve liste sayfasında görünür; AdSense başvurusunda kaynak
 * şeffaflığının kanıtı olarak da sayılıyor (spec 14.5 madde 6).
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

/** Metnin OCR ile okunduğu kayıtlarda gövdenin üstündeki sarı bant. */
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
