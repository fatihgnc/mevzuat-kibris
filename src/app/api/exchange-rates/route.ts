import { NextResponse } from 'next/server';

import { EXCHANGE_RATE_SOURCE, parseCentralBankRates } from '@/lib/tools/exchange-rates';

export const dynamic = 'force-dynamic';

/** The bank publishes once a working day; an hour keeps the request count negligible. */
const MAX_AGE_SECONDS = 3600;

/** Feeds the currency fields of the import and title deed calculators. */
export async function GET() {
  try {
    const response = await fetch(EXCHANGE_RATE_SOURCE.url, {
      next: { revalidate: MAX_AGE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });
    const parsed = response.ok ? parseCentralBankRates(await response.text()) : null;
    if (!parsed) throw new Error(`unexpected response ${response.status}`);

    return NextResponse.json(
      { ...parsed, source: EXCHANGE_RATE_SOURCE.name },
      { headers: { 'Cache-Control': `public, max-age=${MAX_AGE_SECONDS}, s-maxage=${MAX_AGE_SECONDS}` } },
    );
  } catch (error) {
    console.error('[exchange-rates]', error);
    return NextResponse.json({ rates: null }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
