import { cn } from '@/lib/utils';

/**
 * Boş durum kabuğu. Tasarımda boş sonuç sayfası "üzgünüz" demiyor, bir sonraki
 * adımı veriyor: öneri, filtre kaldırma, konudan giriş, referansla arama.
 * Bu bileşen o yapının kabuğu; içeriği çağıran sayfa dolduruyor.
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
