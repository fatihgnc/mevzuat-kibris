'use client';

import { ErrorFallback } from '@/components/error-fallback';

import '@/styles/globals.css';

/**
 * The last-resort boundary, for errors in the root layout itself — app/error.tsx
 * sits inside that layout and cannot catch them. It replaces the layout, so it
 * brings its own <html> and <body>.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body className="min-h-dvh bg-surface font-sans text-ink-body">
        <ErrorFallback error={error} reset={reset} kind="global" />
      </body>
    </html>
  );
}
