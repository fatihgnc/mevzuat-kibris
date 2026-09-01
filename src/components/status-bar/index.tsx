'use client';

import { useEffect, useState } from 'react';

/**
 * The "N records added today" line — spec 11.2's no-staleness rule.
 *
 * The number comes from the server (ISR, refreshed via revalidateTag('latest')),
 * but if the cache goes stale unexpectedly the page shows a wrong number and the
 * kesintimivar.com bug ("the home page says 3 outages, the region page says none")
 * repeats. So after mount we read /api/status once more and correct it: the first
 * paint has the right value (no flash), and the chance of it going stale is closed
 * off.
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
        // The server's value stays put; the error is not shown to the user.
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
