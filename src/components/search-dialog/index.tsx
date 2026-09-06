'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, type FormEvent } from 'react';

/**
 * The header's search — an icon, and a full-screen box behind it.
 *
 * The header used to carry a real input, which is why it had two shapes: a wide
 * one with the box stretched across the middle, and a narrow one where the box
 * did not fit and had to be moved out from under the header entirely. Two
 * shapes meant the header moved as the window resized and read differently on
 * the search page than everywhere else. An icon is the same size on every
 * screen, so there is only one header now.
 *
 * The typing surface is a modal instead: at full screen the field is as wide as
 * the window rather than as wide as whatever the navigation left over, and it
 * opens over the page you were on rather than sending you to /ara first.
 *
 * A REAL `<dialog>` opened with `showModal()`, the same choice as the filter
 * sheet — focus moves in and is trapped, the page behind goes inert, Escape
 * closes it, and `::backdrop` is a real element that can take the blur.
 */
export function SearchDialog({ defaultValue = '' }: { defaultValue?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  /*
   * The lock follows the `open` ATTRIBUTE, not the `close` event. The event does
   * not fire in this browser — measured on the filter sheet: `dialog.close()`
   * flipped `open` to false and the listener never ran. Watching the attribute
   * also covers Escape, which never passes through a handler of ours.
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
    const dialog = ref.current;
    if (!dialog || dialog.open) return; // showModal() throws if it is already open
    dialog.showModal();
    /*
     * `autoFocus` is not reliable here: React strips it in some builds and the
     * dialog otherwise focuses its first tabbable child, which is the close
     * button. Selecting rather than just focusing means the previous query is
     * replaced by typing but still readable before you do.
     */
    input.current?.select();
  };

  const close = () => ref.current?.close();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.current?.value.trim() ?? '';
    close();
    router.push(query ? '/ara?q=' + encodeURIComponent(query) : '/ara');
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Ara"
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink"
      >
        <SearchIcon />
      </button>

      <dialog
        ref={ref}
        aria-label="Ara"
        /*
         * The blur is on `::backdrop`, so it falls on the real page behind and
         * not on a div pretending to be one. The dialog itself is transparent
         * and fills the window; the panel below is what you see.
         */
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        {/*
          * THE DISMISS HANDLER IS ON THIS DIV, NOT ON THE DIALOG.
          *
          * It was on the dialog first, testing `event.target === dialog`. That
          * never fires: this wrapper fills the dialog, so every click inside the
          * window lands on the wrapper and bubbles up with the wrapper as its
          * target. The dialog element itself has no area left of its own to be
          * clicked. Dispatching an event straight at the dialog made it look like
          * it worked — a real click never did.
          *
          * So the test is against THIS element, which does have bare area: the
          * dark space around the panel. The panel is a child, so clicks on it
          * have the panel as their target and are left alone.
          */}
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          className="flex min-h-full items-center justify-center px-4 py-8"
        >
          <div className="w-full max-w-[42em]">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="m-0 text-md font-semibold text-ink">Arşivde ara</h2>
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
             * Still `method="get"` to /ara, so it works with JS off and the
             * result is a shareable address (spec 5.5). router.push is only
             * there for the soft transition.
             */}
            <form action="/ara" method="get" role="search" onSubmit={onSubmit}>
              <label className="sr-only" htmlFor="q-dialog">
                Resmî Gazete kayıtlarında ara
              </label>
              <input
                ref={input}
                id="q-dialog"
                name="q"
                type="search"
                defaultValue={defaultValue}
                placeholder="kelime, kurum, şirket, köy ya da referans numarası"
                autoComplete="off"
                className="w-full rounded-lg border border-ink bg-surface px-4 py-3.5 text-lg text-ink shadow-lg outline-none placeholder:text-ink-placeholder"
              />
              {/*
                * A REAL SUBMIT BUTTON, not just Enter.
                *
                * The instruction used to read "Enter'a basın", which on a phone
                * is advice about a key that is not there — a soft keyboard's
                * return key sends "search" on some, a newline on others, and the
                * user has no way to know which. The button is the only dismissal
                * that works on every device, and it keeps the box submittable
                * with JS off.
                */}
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="m-0 text-sm text-ink-faint">
                  Referans numarasını olduğu gibi yazabilirsiniz: A.E. 817.
                </p>
                <button
                  type="submit"
                  className="shrink-0 rounded bg-accent px-5 py-2 text-base font-semibold text-accent-ink transition-colors hover:bg-accent-hover hover:text-accent-ink"
                >
                  Ara
                </button>
              </div>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="h-[18px] w-[18px]"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
