import { NextResponse } from 'next/server';

import { googleTopRecords } from '@/lib/gsc/top-records';

/**
 * The home page's "Öne çıkanlar" list, for the card to refetch when the
 * prerendered page came out without it (see googleTopRecords).
 *
 * An empty answer is cached only briefly, so a Search Console outage does not
 * pin an empty card at the edge; a real list is cached like the data behind it.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const items = await googleTopRecords(5);

  return NextResponse.json(items, {
    headers: {
      'Cache-Control': items.length
        ? 'public, max-age=300, s-maxage=3600'
        : 'public, max-age=0, s-maxage=60',
    },
  });
}
