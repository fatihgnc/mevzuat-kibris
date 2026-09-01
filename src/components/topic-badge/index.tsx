import Link from 'next/link';

import { TOPICS, isTopicSlug } from '@/lib/constants/topics';
import { cn } from '@/lib/utils';

interface TopicBadgeProps {
  topic: string;
  href?: string;
  /** Dark and bold in the meta bar, secondary in a list row. */
  emphasis?: boolean;
  className?: string;
}

/**
 * The topic label.
 *
 * The coloured dot was REMOVED (the product owner's decision). In the design, eight
 * topics each carried a dot distinguished only by hue at a single L/C; once the
 * topic count went to nine and the dots repeated in the filter rail, the list and
 * the footer, colour stopped being distinctive and turned into noise. The topic
 * name is written out anyway and colour never carried meaning on its own, so
 * removing it is no accessibility loss either.
 *
 * That is why the `Topic.color` field was deleted; it is in git history if wanted
 * back.
 */
export function TopicBadge({ topic, href, emphasis, className }: TopicBadgeProps) {
  if (!isTopicSlug(topic)) return null;
  const meta = TOPICS[topic];

  const classes = cn(
    'inline-flex items-center text-sm',
    emphasis ? 'font-semibold text-ink-body' : 'text-ink-muted',
    className,
  );

  if (!href) return <span className={classes}>{meta.name}</span>;

  return (
    <Link href={href} className={cn(classes, 'hover:text-accent hover:no-underline')}>
      {meta.name}
    </Link>
  );
}
