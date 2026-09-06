'use client';

import { useRouter } from 'next/navigation';
import { useRef, type FormEvent } from 'react';

import { Modal } from '@/components/modal';

/**
 * The header's search — an icon, and a full-screen box behind it.
 *
 * The header used to carry a real input, which is why it had two shapes: a wide
 * one with the box stretched across the middle, and a narrow one where the box
 * did not fit and had to be moved out from under the header entirely. Two shapes
 * meant the header moved as the window resized and read differently on the
 * search page than everywhere else. An icon is the same size on every screen, so
 * there is only one header now.
 *
 * The typing surface is a modal instead: the field is as wide as the panel
 * rather than as wide as whatever the navigation left over, and it opens over
 * the page you were on rather than sending you to /ara first.
 *
 * The dialog is `components/modal`, shared with the filter sheet and the follow
 * offer. This file used to carry its own copy of that machinery.
 */
export function SearchDialog({ defaultValue = '' }: { defaultValue?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = input.current?.value.trim() ?? '';
    input.current?.closest('dialog')?.close();
    router.push(query ? '/ara?q=' + encodeURIComponent(query) : '/ara');
  }

  return (
    <Modal
      label="Ara"
      title="Arşivde ara"
      className="contents"
      trigger={(open) => (
        <button
          type="button"
          onClick={() => {
            open();
            /*
             * `autoFocus` is not reliable here: the dialog otherwise focuses its
             * first tabbable child, which is the close button. Selecting rather
             * than only focusing means the previous query is replaced by typing
             * but is still readable before you do.
             */
            input.current?.select();
          }}
          aria-label="Ara"
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded text-ink-muted transition-colors hover:text-ink"
        >
          <SearchIcon />
        </button>
      )}
    >
      {/*
        * Still `method="get"` to /ara, so it works with JS off and the result is
        * a shareable address (spec 5.5). router.push is only there for the soft
        * transition.
        */}
      <form action="/ara" method="get" role="search" onSubmit={onSubmit} className="pt-1">
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
          className="w-full rounded-lg border border-ink bg-surface px-4 py-3.5 text-lg text-ink outline-none placeholder:text-ink-placeholder"
        />
        {/*
          * A REAL SUBMIT BUTTON, not just Enter. The instruction used to read
          * "Enter'a basın", which on a phone is advice about a key that is not
          * there — a soft keyboard's return key sends "search" on some devices
          * and a newline on others, and the user cannot know which.
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
    </Modal>
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
