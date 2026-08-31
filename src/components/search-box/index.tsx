'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { cn } from '@/lib/utils';

interface SearchBoxProps {
  /** `hero` ana sayfadaki büyük kutu, `compact` başlıktaki dar kutu. */
  size?: 'hero' | 'compact';
  defaultValue?: string;
  placeholder?: string;
  /** Pasif görünüm: konu sayfasındaki gri kutu (odak yok, kenarlık soluk). */
  active?: boolean;
  className?: string;
}

/**
 * Arama kutusu — sitedeki dört client component'ten biri (spec 13).
 *
 * Form GET ile /ara'ya gidiyor: JS kapalıyken de çalışıyor ve sonuç URL'i
 * paylaşılabilir kalıyor (spec 5.5). router.push yalnızca yumuşak geçiş için.
 */
export function SearchBox({
  size = 'hero',
  defaultValue = '',
  placeholder = 'kelime, kurum, şirket, köy ya da referans numarası',
  active = true,
  className,
}: SearchBoxProps) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = value.trim();
    router.push(query ? '/ara?q=' + encodeURIComponent(query) : '/ara');
  }

  const hero = size === 'hero';

  return (
    <form
      action="/ara"
      method="get"
      onSubmit={onSubmit}
      role="search"
      className={cn('flex gap-2.5', hero && 'max-w-[44em]', className)}
    >
      <label className="sr-only" htmlFor={'q-' + size}>
        Resmî Gazete kayıtlarında ara
      </label>
      <input
        id={'q-' + size}
        name="q"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(
          'min-w-0 flex-1 rounded bg-surface text-ink outline-none',
          'placeholder:text-ink-placeholder',
          hero ? 'border px-3.5 py-3 text-lg' : 'border px-3 py-2 text-md',
          active ? 'border-ink' : 'border-line bg-surface-muted',
        )}
      />
      <button
        type="submit"
        className={cn(
          'shrink-0 rounded bg-accent font-semibold text-accent-ink transition-colors hover:bg-accent-hover',
          hero ? 'px-6 py-3 text-lg' : 'px-4 py-2 text-base',
        )}
      >
        Ara
      </button>
    </form>
  );
}
