'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

export interface NavDropdownItem {
  href: string;
  label: string;
  /** Menüde adın altındaki tek satır. */
  description?: string;
}

/**
 * Başlıktaki tek açılır menü — "Araçlar".
 *
 * `NavMenu` ile aynı `<details>` temelinde: eleman gerçek bir açma-kapama
 * düğmesini, klavye desteğini ve açık durumun DOM'da görünmesini hazır getiriyor.
 * Buradaki tek fark ÜSTÜNE GELİNCE de açılması — istenen davranış bu — ve bunun
 * yalnızca işaretçi cihazlarda yapılması gerekiyor.
 *
 * Dokunmatik ekranda hover diye bir şey yok: bir dokunuş önce `pointerenter`
 * sonra `click` üretir, ikisi birlikte menüyü açıp hemen kapatırdı. Bu yüzden
 * hover yalnızca `(hover: hover)` eşleşen cihazlarda bağlanıyor; diğerlerinde
 * menü tıklamayla çalışan sıradan bir `<details>`.
 */
export function NavDropdown({
  label,
  href,
  items,
}: {
  label: string;
  /** Menünün başlığının kendisi de bir sayfa — hub. */
  href: string;
  items: readonly NavDropdownItem[];
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const close = () => {
      if (node.open) node.open = false;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (node.open && !node.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    const canHover = window.matchMedia('(hover: hover)').matches;
    const open = () => {
      node.open = true;
    };

    /*
     * Üstüne gelince açılan bir menüde TIKLAMA KAPATMAMALI.
     *
     * `<summary>`'nin doğal davranışı açıp kapatmak. Menü zaten hover ile açık
     * olduğu için tıklamanın tek etkisi kapatmak oluyordu: kullanıcı menüyü
     * görüp başlığa tıklıyor ve menü gözünün önünde kayboluyordu. İşaretçili
     * cihazda tıklama artık yalnızca "açık kalsın" anlamına geliyor; kapatma
     * dışarı tıklama ve Escape ile.
     */
    const keepOpenOnClick = (event: Event) => {
      event.preventDefault();
      node.open = true;
    };

    const summary = node.querySelector('summary');

    if (canHover) {
      node.addEventListener('pointerenter', open);
      node.addEventListener('pointerleave', close);
      summary?.addEventListener('click', keepOpenOnClick);
      /*
       * Klavyeyle gezerken menüden çıkıldığında da kapansın. `focusout`
       * kabarcıklandığı için `<details>` üzerinde dinlenebiliyor; `relatedTarget`
       * menünün içindeyse odak hâlâ içeride demektir.
       */
      node.addEventListener('focusout', (event) => {
        const next = (event as FocusEvent).relatedTarget as Node | null;
        if (!next || !node.contains(next)) close();
      });
    }

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      if (canHover) {
        node.removeEventListener('pointerenter', open);
        node.removeEventListener('pointerleave', close);
        summary?.removeEventListener('click', keepOpenOnClick);
      }
    };
  }, []);

  return (
    <details ref={ref} className="group relative hidden min-[1060px]:block">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        {label}
        <span aria-hidden className="text-2xs transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      {/*
       * `hidden group-open:block`: kapalı bir <details>'in içeriğini tarayıcı
       * kendi kuralıyla gizliyor ve `display` veren bir yardımcı sınıf o kuralı
       * eziyor. Bare `block` yazılsaydı panel menü kapalıyken de ekranda kalırdı.
       *
       * Başlıkla panel arasındaki boşluk BU KUTUNUN İÇİNDE, `pt-3` olarak.
       * Önce panelin kendisi `top-[calc(100%+12px)]` ile aşağı itilmişti ve
       * aradaki 12px hiçbir elemana ait değildi: imleç oraya girdiği anda
       * <details> üzerinde pointerleave tetikleniyor ve menü, kullanıcı daha
       * araçlara ulaşamadan kapanıyordu. Dolgu boşluğu elemanın içine aldığı
       * için imleç kesintisiz bir yüzeyde ilerliyor.
       */}
      <div className="absolute right-0 top-full z-30 hidden w-[320px] pt-3 group-open:block">
        <div className="rounded-md border border-line bg-surface py-1.5 shadow-lg">
          <ul className="flex flex-col">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => {
                    if (ref.current) ref.current.open = false;
                  }}
                  className="block px-4 py-2 no-underline hover:bg-surface-hover hover:no-underline"
                >
                  <span className="block text-base font-medium text-ink-body">{item.label}</span>
                  {item.description ? (
                    <span className="mt-0.5 block text-sm leading-[1.45] text-ink-muted">
                      {item.description}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-1.5 border-t border-line-soft pt-1.5">
            <Link
              href={href}
              onClick={() => {
                if (ref.current) ref.current.open = false;
              }}
              className="block px-4 py-2 text-base text-ink-muted no-underline hover:bg-surface-hover hover:text-ink hover:no-underline"
            >
              Tüm araçlar →
            </Link>
          </div>
        </div>
      </div>
    </details>
  );
}
