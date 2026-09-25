import { NextResponse } from 'next/server';

import { searchEntities } from '@/lib/db/queries/entities';
import type { EntityKind } from '@/types/record';

export const dynamic = 'force-dynamic';

const KINDS: EntityKind[] = ['institution', 'company', 'place'];

/** Feeds the filter box on the entity index pages (/kurum, /sirket, /yer). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim();
  const kindParam = url.searchParams.get('kind') ?? 'institution';
  const kind = KINDS.includes(kindParam as EntityKind) ? (kindParam as EntityKind) : 'institution';

  // The index-page filter asks for a full page of results; the cap keeps the
  // endpoint from being used to dump the whole table.
  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 60) : 8;

  if (query.length < 2) return NextResponse.json({ results: [] });

  const results = await searchEntities(kind, query, limit);

  return NextResponse.json(
    {
      results: results.map((entity) => ({
        slug: entity.slug,
        name: entity.name,
        district: entity.district,
        count: entity.recordCount,
      })),
    },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=300' } },
  );
}
