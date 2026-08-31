'use client';

import { useEffect, useRef, useState } from 'react';

/** "Bağlantıyı kopyala" — kayıt sayfası eylem şeridi (artboard 1a). */
export function CopyLink({ url, label = 'Bağlantıyı kopyala' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      // Pano yoksa kullanıcı adres çubuğundan kopyalayabilir; sessizce geçiyoruz.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded border border-transparent px-3 py-2.5 text-md text-ink-muted transition-colors hover:bg-surface-muted"
    >
      {copied ? 'Kopyalandı' : label}
    </button>
  );
}
