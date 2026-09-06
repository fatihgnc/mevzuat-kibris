'use client';

import type { ReactNode } from 'react';

import { Modal } from '@/components/modal';

/**
 * The filter rail as a sheet, for narrow screens.
 *
 * The rail is a tall thing — nine topics, eight document types, seven years and
 * a date range. On a phone the grid collapses to one column and all of that sat
 * ABOVE the results, so a search pushed its own answers off the screen. Behind a
 * button, the results are the first thing on the page again and the filters are
 * one tap away.
 *
 * `placement="sheet"` pins it to the bottom below `sm`: on a phone that is where
 * a thumb reaches, and it keeps the results visible above it so you can see what
 * you are filtering.
 *
 * The filters themselves are passed in as `children`, so they stay
 * server-rendered — this file adds the opening and closing and nothing else. It
 * renders nothing at all above `lg`, where the rail sits in its own column.
 *
 * The dialog is `components/modal`, shared with the header's search and the
 * follow offer. This file used to carry its own copy of that machinery, and the
 * copies had drifted: this one dismissed on Escape and locked the body, and the
 * search modal's backdrop click did not work at all.
 */
export function FilterSheet({
  children,
  activeCount,
}: {
  children: ReactNode;
  /** Shown on the button so the sheet does not have to be opened to know it is filtered. */
  activeCount: number;
}) {
  return (
    <Modal
      className="lg:hidden"
      label="Filtreler"
      title="Filtreler"
      placement="sheet"
      trigger={(open) => (
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
      )}
    >
      <div className="pt-4">{children}</div>
    </Modal>
  );
}
