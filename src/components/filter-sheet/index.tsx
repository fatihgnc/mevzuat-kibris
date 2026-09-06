'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * The filter rail as a sheet, for narrow screens.
 *
 * The rail is a tall thing — nine topics, eight document types, seven years and a
 * date range. On a phone the grid collapses to one column and all of that sat
 * ABOVE the results, so a search pushed its own answers off the screen. Behind a
 * button, the results are the first thing on the page again and the filters are
 * one tap away.
 *
 * A real `<dialog>`, opened with `showModal()`. That brings the parts that are
 * laborious to redo and easy to get subtly wrong: focus moves into the sheet and
 * is trapped there, the page behind goes inert, Escape closes it, and the
 * backdrop is a real element rather than a div pretending to be one.
 *
 * The filters themselves are passed in as `children`, so they stay server-
 * rendered — this component adds the opening and closing and nothing else. It
 * renders nothing at all above `lg`, where the rail sits in its own column.
 */
export function FilterSheet({
  children,
  activeCount,
}: {
  children: ReactNode;
  /** Shown on the button so the sheet does not have to be opened to know it is filtered. */
  activeCount: number;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  /*
   * A dialog opened with showModal() leaves the page behind it scrollable, and on
   * a phone that reads as the sheet sliding around over a moving page. Locking
   * the body while it is open is the one piece <dialog> does not bring.
   *
   * The lock follows the `open` ATTRIBUTE rather than the `close` event. The
   * event was tried first and does not fire in this browser — measured directly:
   * `dialog.close()` flipped `open` to false and the listener never ran, so the
   * body stayed locked after the sheet was shut. Watching the attribute is also
   * the only version that covers every way it can close, including the Escape
   * key, which never passes through the handler below.
   */
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const sync = () => {
      document.body.style.overflow = dialog.open ? 'hidden' : '';
    };

    const observer = new MutationObserver(sync);
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    sync();

    return () => {
      observer.disconnect();
      document.body.style.overflow = '';
    };
  }, []);

  const open = () => {
    // showModal() throws if it is already open; a double tap should be harmless.
    if (!ref.current?.open) ref.current?.showModal();
  };

  const close = () => {
    ref.current?.close();
  };

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={open}
        className="flex w-full items-center justify-center gap-2 rounded border border-line-strong py-2.5 text-base font-semibold text-ink transition-colors hover:border-ink"
      >
        Filtreler
        {activeCount ? (
          <span className="rounded-pill bg-accent px-2 py-0.5 text-sm text-accent-ink">
            {activeCount}
          </span>
        ) : null}
      </button>

      <dialog
        ref={ref}
        aria-label="Filtreler"
        /*
         * `backdrop:` styles the real ::backdrop. The dialog is pinned to the
         * bottom as a sheet: on a phone that is where a thumb reaches, and it
         * keeps the results visible above it so you can see what you are filtering.
         */
        className="m-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-lg border border-line bg-surface p-0 text-ink backdrop:bg-black/50 sm:mx-auto sm:mb-auto sm:mt-[10vh] sm:max-w-md sm:rounded-lg"
      >
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="m-0 text-md font-semibold text-ink">Filtreler</h2>
            <button
              type="button"
              onClick={close}
              aria-label="Kapat"
              className="rounded px-2 py-1 text-xl leading-none text-ink-muted hover:text-ink"
            >
              ×
            </button>
          </div>

          {/*
            * The filters scroll inside the sheet, not with the page. Without its
            * own scroller the "Filtrele" button at the bottom of a long rail
            * cannot be reached on a short screen.
            */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{children}</div>
        </div>
      </dialog>
    </div>
  );
}
