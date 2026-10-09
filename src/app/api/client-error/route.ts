import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  kind: z.enum(['page', 'global']),
  name: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
  digest: z.string().max(100).optional(),
  stack: z.string().max(1500).optional(),
  url: z.string().max(500).optional(),
  chunk: z.boolean().optional(),
});

/**
 * Where the error boundaries report what a visitor's browser hit (see
 * lib/client-error). It only writes to the server log, readable in Coolify /
 * Dozzle: no database row, nothing stored about the visitor beyond the page
 * path and the error itself. A malformed or oversized body is dropped silently;
 * there is no one to show an error to.
 */
export async function POST(request: Request) {
  const raw = await request.text().catch(() => '');
  if (raw.length > 4000) return new NextResponse(null, { status: 204 });

  let json: unknown = null;
  try {
    json = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = schema.safeParse(json);
  if (parsed.success) console.error('client-error', JSON.stringify(parsed.data));

  return new NextResponse(null, { status: 204 });
}
