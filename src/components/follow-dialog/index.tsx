'use client';

import { FollowCard } from '@/components/follow-card';
import { Modal } from '@/components/modal';
import { RssCard } from '@/components/rss-card';
import { cn } from '@/lib/utils';

interface FollowDialogProps {
  /**
   * The words on the trigger. Each screen says what it would be following —
   * "Bu aramayi takip et", "Bu konuyu takip et" — because a bare "Takip et" on a
   * page carrying a query, a topic and a document type does not say which of
   * them it means.
   */
  label: string;
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
 * The dialog is `components/modal`, shared with the header's search and the
 * filter sheet. The heading lives in the modal's header, so FollowCard is asked
 * not to draw its own — it did for a while, and the same sentence appeared twice
 * four lines apart.
 *
 * IT STAYS A CLIENT COMPONENT even though the state moved into Modal. `trigger`
 * is a function, and a server component cannot hand a function across the
 * boundary to a client one — the markup renders during SSR and then has nothing
 * to hydrate against. The wrapper is three lines of markup; the cost of the
 * directive is nothing next to the render prop it buys.
 */
export function FollowDialog({
  label,
  title,
  description,
  subject,
  showFrequency,
  rssHref,
  className,
}: FollowDialogProps) {
  return (
    <Modal
      label={title}
      title={title}
      trigger={(open) => (
        <button
          type="button"
          onClick={open}
          className={cn('text-base text-link underline-offset-2 hover:underline', className)}
        >
          {label}
        </button>
      )}
    >
      <div className="flex flex-col gap-[18px]">
        {/* No `title` here: the modal's header carries it — see FollowCard. */}
        <FollowCard
          description={description}
          subject={subject}
          showFrequency={showFrequency}
        />
        <RssCard href={rssHref} />
      </div>
    </Modal>
  );
}
