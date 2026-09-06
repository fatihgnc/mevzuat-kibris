'use client';

import { useEffect, useRef } from 'react';

import { FollowCard } from '@/components/follow-card';
import { RssCard } from '@/components/rss-card';
import { cn } from '@/lib/utils';

interface FollowDialogProps {
  /** The word on the trigger. Short — it sits in a row of counts and sort links. */
  label?: string;
  title: string;
  description: string;
  subject: {
    label: string;
    topic?: string;
    query?: string;
    entityId?: number;
    docTypes?: string[];
  };
  showFrequency?: boolean;
  /** This page's own feed — the topic's, the entity's, or the site-wide one. */
  rssHref: string;
  className?: string;
}

/**
 * "Takip et" as a link at the top of a list, and the form behind it.
 *
 * The offer has now been in three places. It began as a sticky right-hand
 * column, which put a call to action permanently beside a gazette decision
 * someone was trying to read and charged 300px of width for it. It moved to the
 * end of the page, which fixed the width and the nagging but buried it: the
 * bottom of a twenty-row feed is not somewhere people go, they click page two.
 * A link at the top of the results costs one line, and the form it opens is the
 * same form.
 *
 * THE RSS ADDRESS IS IN HERE TOO. Spec 10.4 wants the feed carried with the same
 * weight as email, and dropping the card without moving the feed somewhere would
 * have quietly demoted it to nothing.
 *
 * A real `<dialog>` with showModal(), the same as the search and filter modals:
 * focus moves in and is trapped, the page behind goes inert, Escape closes it,
 * and `::backdrop` is a real element.
 */
export function FollowDialog({
  label = 'Takip et',
  title,
  description,
  subject,
  showFrequency,
  rssHref,
  className,
}: FollowDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  /*
   * The body lock follows the `open` ATTRIBUTE, not the `close` event. The event
   * does not fire in this browser — measured on the filter sheet: `close()`
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
    if (!ref.current?.open) ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={cn(
          'text-base text-link underline-offset-2 hover:underline',
          className,
        )}
      >
        {label}
      </button>

      <dialog
        ref={ref}
        aria-label={title}
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        {/*
          * The dismiss handler is on this wrapper, not on the dialog. It fills
          * the dialog, so every click inside the window lands here and bubbles
          * with this element as its target; the dialog itself has no bare area
          * left to be clicked, and testing against it never fires.
          */}
        <div
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
          className="flex min-h-full items-center justify-center px-4 py-8"
        >
          <div className="w-full max-w-[34em]">
            <div className="mb-3 flex items-center justify-end">
              <button
                type="button"
                onClick={close}
                aria-label="Kapat"
                className="rounded px-2 py-1 text-xl leading-none text-ink-muted hover:text-ink"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-[18px]">
              <FollowCard
                title={title}
                description={description}
                subject={subject}
                showFrequency={showFrequency}
              />
              <RssCard href={rssHref} />
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
