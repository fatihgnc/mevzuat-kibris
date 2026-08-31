import { NextResponse } from 'next/server';

import { searchEntities } from '@/lib/db/queries/entities';
import type { EntityKind } from '@/types/record';

export const dynamic = 'force-dynamic';

const KINDS: EntityKind[] = ['institution', 'company', 'place'];

/** Filtre rayındaki "kurum ara" / "yer ara" kutularını besler (artboard 1b). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim();
  const kindParam = url.searchParams.get('kind') ?? 'institution';
  const kind = KINDS.includes(kindParam as EntityKind) ? (kindParam as EntityKind) : 'institution';

  if (query.length < 2) return NextResponse.json({ results: [] });

  const results = await searchEntities(kind, query, 8);

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
