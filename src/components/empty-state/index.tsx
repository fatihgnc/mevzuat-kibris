import { cn } from '@/lib/utils';

/**
 * The empty-state shell. In the design an empty results page does not say "sorry";
 * it offers the next step: a suggestion, clearing filters, entering by topic,
 * searching by reference. This component is the shell of that structure; the
 * calling page fills in the content.
 */
export function EmptyState({
  title,
  children,
  className,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('py-2', className)}>
      <div className="border-b border-line pb-[18px] text-md text-ink-muted">{title}</div>
      {children}
    </div>
  );
}
