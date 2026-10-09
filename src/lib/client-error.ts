/**
 * Client-side failures that the error boundaries (app/error.tsx,
 * app/global-error.tsx) handle.
 *
 * WHY THIS EXISTS. With no boundary at all, any exception during a client
 * navigation replaced the whole page with Next's bare "Application error: a
 * client-side exception has occurred", and F5 was the only way out. Reproduced on
 * production 9 Ekim 2026: making the /karar page's JS chunk fail to load and then
 * clicking a record link gave exactly that screen. A chunk fails to load when the
 * connection drops for a moment (phones), or when a tab opened before a deploy
 * asks for a file the new build no longer has. Both are fixed by the reload the
 * user was doing by hand.
 *
 * Most of the fix is simply that a boundary now exists. Next has its own
 * recovery for an error thrown mid-navigation — a hard navigation to the URL
 * being opened (handleHardNavError, next/dist/client/components/error-boundary.js)
 * — but it only runs inside an error.tsx boundary, and we had none. Measured on a
 * local production build with the same broken chunk: with app/error.tsx in place,
 * the click opens the record normally. reloadOnce below covers what that misses,
 * a chunk failure outside a navigation.
 */

/** Webpack's and the browsers' wording for "a script/module for this page failed to load". */
const CHUNK_ERROR =
  /Loading (CSS )?chunk [\w-]+ failed|ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

export function isChunkLoadError(error: { name?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.name === 'ChunkLoadError' || CHUNK_ERROR.test(error.message ?? '');
}

const RELOAD_KEY = 'chunk-reload-at';

/** A reload that failed again within this window is not retried — the file is really gone, or offline. */
const RELOAD_WINDOW_MS = 30_000;

/**
 * Reloads the page once, unless it already did so in the last 30 seconds.
 * Returns whether it reloaded.
 *
 * The timestamp is what stops a loop: if the chunk is missing for good, the
 * reloaded page fails the same way and must show the fallback instead of
 * reloading forever. Without sessionStorage (private mode, blocked site data)
 * there is no way to tell a first failure from a repeat, so it does not reload.
 */
export function reloadOnce(storage: Pick<Storage, 'getItem' | 'setItem'> | null, now: number, reload: () => void): boolean {
  if (!storage) return false;
  try {
    const last = Number(storage.getItem(RELOAD_KEY) ?? 0);
    if (now - last < RELOAD_WINDOW_MS) return false;
    storage.setItem(RELOAD_KEY, String(now));
  } catch {
    return false;
  }
  reload();
  return true;
}

/**
 * Sends the error to /api/client-error, which writes it to the server log — the
 * only way to learn what a visitor's browser hit. sendBeacon so it survives the
 * reload that may follow; best-effort, a failure here is ignored.
 */
export function reportClientError(error: Error & { digest?: string }, kind: 'page' | 'global'): void {
  try {
    const body = JSON.stringify({
      kind,
      name: error.name,
      message: String(error.message ?? '').slice(0, 500),
      digest: error.digest,
      stack: String(error.stack ?? '').slice(0, 1500),
      url: window.location.pathname,
      chunk: isChunkLoadError(error),
    });
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/client-error', blob)) {
      void fetch('/api/client-error', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
    }
  } catch {
    // Reporting must never be the thing that breaks the fallback.
  }
}
