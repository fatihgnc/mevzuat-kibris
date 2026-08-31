import Link from 'next/link';

import { TOPICS, isTopicSlug } from '@/lib/constants/topics';
import { cn } from '@/lib/utils';

interface TopicBadgeProps {
  topic: string;
  href?: string;
  /** Künye şeridinde koyu ve kalın, liste satırında ikincil. */
  emphasis?: boolean;
  className?: string;
}

/**
 * Konu etiketi.
 *
 * Renkli nokta KALDIRILDI (ürün sahibinin kararı). Tasarımda sekiz konu tek
 * L/C üzerinde yalnızca hue ile ayrışan birer nokta taşıyordu; konu sayısı
 * dokuza çıkınca ve noktalar hem filtre rayında hem listede hem altbilgide
 * tekrarlanınca renk ayırt edici olmaktan çıkıp gürültüye dönüştü. Konu adı
 * zaten yazılı ve renk hiçbir zaman tek başına anlam taşımıyordu, o yüzden
 * kaldırılması erişilebilirlik açısından da bir kayıp değil.
 *
 * `Topic.color` alanı bu yüzden silindi; geri istenirse git geçmişinde.
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
