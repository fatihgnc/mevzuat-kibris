'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ModalProps {
  /**
   * The control that opens it. A render prop rather than a `children` slot,
   * because every caller's trigger looks different — a magnifier, a word, a
   * bordered button with a count — and only the opening is shared.
   */
  trigger: (open: () => void) => ReactNode;
  /** Accessible name for the dialog. */
  label: string;
  /** Shown in the panel's header. Omit when the content carries its own heading. */
  title?: string;
  children: ReactNode;
  /**
   * `center` — a panel in the middle of the window.
   * `sheet`  — pinned to the bottom below `sm`, centred above it. For content
   *            tall enough to need its own scroller, where the bottom of the
   *            screen is also where a thumb reaches.
   */
  placement?: 'center' | 'sheet';
  panelClassName?: string;
  className?: string;
}

/**
 * THE ONE MODAL. Every dialog on the site is this component.
 *
 * There were three: the header's search, the filter sheet and the follow offer.
 * Each had its own copy of the same forty lines — `showModal()`, the body lock,
 * the backdrop dismissal, the close button — and they had already drifted: one
 * had a panel background and two did not, one dismissed on a backdrop click
 * correctly and another had the handler on an element that could never receive
 * it. Both of those were found as bugs, separately, in the copies.
 *
 * TWO THINGS HERE ARE NOT OBVIOUS AND BOTH WERE MEASURED.
 *
 * 1. The body lock watches the `open` ATTRIBUTE, not the `close` event. The
 *    event does not fire in this browser: `dialog.close()` flipped `open` to
 *    false and the listener never ran, so the page behind stayed locked after
 *    the dialog was shut. The attribute also covers Escape, which never passes
 *    through a handler of ours.
 *
 * 2. The backdrop-dismiss handler is on the WRAPPER, not on the dialog. The
 *    wrapper fills the dialog, so every click inside the window lands on it and
 *    bubbles with the wrapper as its target; the dialog element has no bare area
 *    left to be clicked, and `event.target === dialog` never fires. Dispatching
 *    an event straight at the dialog made it look like it worked — a real click
 *    never did.
 *
 * Everything else is the browser's: focus moves in and is trapped, the page
 * behind goes inert, Escape closes it, and `::backdrop` is a real element that
 * can take the blur.
 */
export function Modal({
  trigger,
  label,
  title,
  children,
  placement = 'center',
  panelClassName,
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

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

  // showModal() throws if it is already open; a double tap should be harmless.
  const open = () => {
    if (!ref.current?.open) ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  const sheet = placement === 'sheet';

  return (
    <div className={className}>
      {trigger(open)}

      <dialog
        ref={ref}
        aria-label={label}
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          className={cn(
            'flex min-h-full justify-center px-4',
            sheet ? 'items-end py-0 sm:items-center sm:py-8' : 'items-center py-8',
          )}
        >
          <div
            className={cn(
              'flex w-full flex-col border border-line bg-surface shadow-lg',
              sheet
                ? 'max-h-[85dvh] rounded-t-lg sm:max-w-md sm:rounded-lg'
                : 'max-w-[34em] rounded-lg',
              panelClassName,
            )}
          >
            <div
              className={cn(
                'flex shrink-0 items-center gap-4',
                title ? 'justify-between border-b border-line px-4 py-3' : 'justify-end px-2 pt-2',
              )}
            >
              {title ? <h2 className="m-0 text-md font-semibold text-ink">{title}</h2> : null}
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
              * The vertical padding is HERE, not in each caller. Three of them had
              * their own `pt-*` on the children and the gap under the header
              * differed by modal; one value in one place is what keeps them the
              * same. 26px rather than a scale step — it was set by eye against
              * the header rule and 24px sat a shade tight.
              *
              * `min-h-0` with the scroller is what makes a tall panel usable: a
              * flex child will not shrink below its content without it, and the
              * filter rail's "Filtrele" button at the bottom became unreachable
              * on a short screen.
              */}
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-[26px]">{children}</div>
          </div>
        </div>
      </dialog>
    </div>
  );
}
