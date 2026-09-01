import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({
  secret: z.string().min(1),
  topics: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  issues: z.array(z.object({ year: z.number().int(), number: z.number().int() })).default([]),
});

/**
 * On-demand revalidation after ingest — spec 11.2.
 *
 * The critical point: we refresh EVERY affected tag, not just the home page. The
 * home page saying "3 new records" while the topic page says "no records" means two
 * pages giving two different answers from the same data; that is the bug that ends
 * the product's credibility in one go.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek.' }, { status: 400 });
  }

  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || parsed.data.secret !== secret) {
    return NextResponse.json({ ok: false, error: 'Yetkisiz.' }, { status: 401 });
  }

  const revalidated: string[] = [];

  revalidateTag('latest');
  revalidatePath('/');
  revalidated.push('latest', '/');

  for (const topic of parsed.data.topics) {
    revalidateTag('topic:' + topic);
    revalidatePath('/konu/' + topic);
    revalidated.push('topic:' + topic);
  }

  for (const entity of parsed.data.entities) {
    revalidateTag('entity:' + entity);
    revalidated.push('entity:' + entity);
  }

  for (const issue of parsed.data.issues) {
    revalidatePath('/sayilar/' + issue.year);
    revalidatePath('/sayilar/' + issue.year + '/' + issue.number);
    revalidated.push('/sayilar/' + issue.year + '/' + issue.number);
  }

  revalidatePath('/sayilar');

  return NextResponse.json({ ok: true, revalidated });
}
