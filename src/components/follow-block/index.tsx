import type { ReactNode } from 'react';

import { FollowCard } from '@/components/follow-card';
import { RssCard } from '@/components/rss-card';
import { cn } from '@/lib/utils';

interface FollowBlockProps {
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
  /** Anything that belongs with the offer, e.g. the record page's source notice. */
  children?: ReactNode;
  className?: string;
}

/**
 * The follow offer, at the END of a page rather than pinned beside it.
 *
 * It used to be a sticky right-hand column on the record, topic and entity
 * pages. Sticky put a call to action permanently in the corner of the eye of
 * someone trying to read a gazette decision, and it charged 250-300px of width
 * for the privilege. Moved here it appears when the reading is finished, which is
 * the moment "follow this" is actually a thought the reader might have.
 *
 * The home page keeps its column, and that is not an inconsistency: what sits
 * there is the latest-issue card, which is navigation rather than a call to
 * action — the freshest fact on the site, and useless at the bottom of the page.
 *
 * TWO CARDS SIDE BY SIDE, not stacked. At the full width of a content column a
 * single card is a 900px-wide box holding one short form; the pair fills the row
 * and keeps email and RSS at the same weight, which is what spec 10.4 asks for.
 */
export function FollowBlock({
  title,
  description,
  subject,
  showFrequency,
  rssHref,
  children,
  className,
}: FollowBlockProps) {
  return (
    <section className={cn('mt-10 border-t border-line pt-7', className)}>
      <div className="grid gap-[18px] sm:grid-cols-2">
        <FollowCard
          title={title}
          description={description}
          subject={subject}
          showFrequency={showFrequency}
        />
        <RssCard href={rssHref} />
      </div>
      {children}
    </section>
  );
}
