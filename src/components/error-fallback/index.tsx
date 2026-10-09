'use client';

import { useEffect, useState } from 'react';

import { isChunkLoadError, reloadOnce, reportClientError } from '@/lib/client-error';

function sessionStorageOrNull(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * What app/error.tsx and app/global-error.tsx render. A chunk-load failure
 * reloads the page once by itself (see lib/client-error); anything else, or a
 * chunk failure that survives the reload, gets a message and a reload button
 * instead of Next's blank "Application error" screen.
 */
export function ErrorFallback({
  error,
  reset,
  kind,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  kind: 'page' | 'global';
}) {
  // Hidden until we know we are not reloading, so the message does not flash before a reload.
  const [show, setShow] = useState(false);

  useEffect(() => {
    reportClientError(error, kind);
    const reloading =
      isChunkLoadError(error) && reloadOnce(sessionStorageOrNull(), Date.now(), () => window.location.reload());
    if (!reloading) setShow(true);
  }, [error, kind]);

  if (!show) return null;

  return (
    <main id="icerik" className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-8 lg:px-10">
      <h1 className="m-0 text-4xl font-semibold tracking-tightest text-ink sm:text-5xl">
        Sayfa yüklenemedi
      </h1>
      <p className="mt-3 max-w-lede text-xl leading-[1.6] text-ink-body">
        Bağlantı kesilmiş ya da site o sırada güncellenmiş olabilir. Sayfayı yenilemek çoğu zaman
        sorunu çözer.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded border border-ink bg-ink px-[18px] py-2.5 text-md font-semibold text-surface transition-colors hover:bg-surface hover:text-ink"
        >
          Sayfayı yenile
        </button>
        <button type="button" onClick={reset} className="text-md text-link hover:underline">
          Tekrar dene
        </button>
        {/* A plain <a>, not next/link: the client router may be what just failed. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="text-md">
          Ana sayfaya dön
        </a>
      </div>
    </main>
  );
}
