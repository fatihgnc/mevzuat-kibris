'use client';

import { useEffect, useState } from 'react';

/**
 * "Bugün eklenen N kayıt" satırı — spec 11.2 donma yasağı.
 *
 * Sayı sunucudan geliyor (ISR, revalidateTag('latest') ile tazeleniyor) ama
 * cache beklenmedik biçimde eskirse sayfa yanlış bir sayı gösterir ve
 * kesintimivar.com'daki "ana sayfa 3 kesinti diyor, bölge sayfası yok diyor"
 * hatası tekrarlanır. O yüzden mount'tan sonra /api/status'tan bir kez daha
 * okuyup düzeltiyoruz: ilk boyamada doğru değer var (flash yok), bayat kalma
 * ihtimali de kapanıyor.
 */
export function StatusBar({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/status')
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { todayCount?: number } | null) => {
        if (!cancelled && typeof data?.todayCount === 'number') setCount(data.todayCount);
      })
      .catch(() => {
        // Sunucudan gelen değer yerinde kalıyor; hata kullanıcıya gösterilmiyor.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span className="text-md font-semibold text-ink">
      {count > 0 ? 'Bugün eklenen ' + count + ' kayıt' : 'Son eklenen kayıtlar'}
    </span>
  );
}
