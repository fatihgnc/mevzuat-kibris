import { NextResponse } from 'next/server';

import { siteStatus } from '@/lib/db/queries/records';

/**
 * The status endpoint — spec 11.2.
 *
 * It exists to stop static rendering going stale: the "N records added today" line
 * on the home page comes from ISR, but after mount the client reads from here once
 * more and corrects it. The payload is deliberately small.
 *
 * The same endpoint is also used in the post-ingest consistency test (spec 11.3).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await siteStatus();

  return NextResponse.json(status, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
  });
}
