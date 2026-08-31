'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Açık/koyu tema anahtarı — başlıkta.
 *
 * Temayı `document.documentElement` üzerindeki `data-theme` özniteliği taşıyor
 * ve bütün renkler CSS değişkenlerinden geldiği için tek satır her şeyi
 * çeviriyor (globals.css).
 *
 * İlk değeri BURASI belirlemiyor: layout'taki satır içi betik, sayfa
 * boyanmadan önce özniteliği kuruyor. Bu bileşen yalnızca o kararı okuyup
 * değiştiriyor. Sıra tersine olsaydı sayfa önce açık temayla boyanır, sonra
 * koyuya atlardı.
 *
 * `mounted` bekçisi hidrasyon uyuşmazlığını önlüyor: sunucu hangi temanın
 * seçili olduğunu bilemez (localStorage ve işletim sistemi tercihi yalnızca
 * tarayıcıda), o yüzden ilk render'da ikon yerine aynı boyutta boş bir kutu
 * basılıyor ve düzen zıplamıyor.
 */
const STORAGE_KEY = 'tema';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;

    /*
     * Seçim kalıcı. try/catch şart: gizli sekmede ve site verisi engelliyken
     * localStorage'a yazmak istisna atıyor ve tema değişimini götürürdü.
     */
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Saklanamadıysa tema yine de bu sekmede geçerli; sessizce devam.
    }
  }

  const label = theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      /*
       * aria-pressed yerine aria-label: bu bir açma/kapama değil, iki durum
       * arasında geçiş. Ekran okuyucuya "koyu tema açık mı" değil, "basınca ne
       * olacak" söylemek daha anlaşılır.
       */
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded border border-line text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {mounted ? (
        theme === 'dark' ? (
          <Sun size={17} aria-hidden />
        ) : (
          <Moon size={17} aria-hidden />
        )
      ) : null}
    </button>
  );
}
