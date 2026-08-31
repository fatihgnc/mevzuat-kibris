import Link from 'next/link';

import { TOPICS, isTopicSlug } from '@/lib/constants/topics';
import { cn } from '@/lib/utils';

interface TopicDotProps {
  topic: string;
  size?: number;
  className?: string;
}

/**
 * Konu noktası. Renkler oklch; sekiz konu tek L/C üzerinde yalnızca hue ile
 * ayrışıyor, böylece listede hiçbir konu diğerinden daha baskın görünmüyor.
 * Renk tek başına anlam taşımıyor — yanında her zaman konu adı var (erişilebilirlik).
 */
export function TopicDot({ topic, size = 7, className }: TopicDotProps) {
  const color = isTopicSlug(topic) ? TOPICS[topic].color : 'hsl(var(--ink-fainter))';

  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 rounded-full', className)}
      style={{ width: size, height: size, background: color }}
    />
  );
}

interface TopicBadgeProps {
  topic: string;
  href?: string;
  /** Künye şeridinde koyu ve kalın, liste satırında ikincil. */
  emphasis?: boolean;
  size?: number;
  className?: string;
}

export function TopicBadge({ topic, href, emphasis, size = 7, className }: TopicBadgeProps) {
  if (!isTopicSlug(topic)) return null;
  const meta = TOPICS[topic];

  const content = (
    <>
      <TopicDot topic={topic} size={size} />
      {meta.name}
    </>
  );

  const classes = cn(
    'inline-flex items-center gap-[7px] text-sm',
    emphasis ? 'font-semibold text-ink-body' : 'text-ink-muted',
    className,
  );

  if (!href) return <span className={classes}>{content}</span>;

  return (
    <Link href={href} className={cn(classes, 'hover:text-accent hover:no-underline')}>
      {content}
    </Link>
  );
}
