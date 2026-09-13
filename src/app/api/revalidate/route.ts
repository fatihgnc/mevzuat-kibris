import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { absoluteUrl } from '@/lib/seo/config';

export const dynamic = 'force-dynamic';

const schema = z.object({
  secret: z.string().min(1),
  topics: z.array(z.string()).default([]),
  entities: z.array(z.string()).default([]),
  issues: z.array(z.object({ year: z.number().int(), number: z.number().int() })).default([]),
  records: z.array(z.string()).default([]),
});

/**
 * `revalidatePath` only clears the ORIGIN's own ISR cache. Cloudflare sits in
 * front of it with its own edge copy, keyed by `s-maxage` (Cache Rule added for
 * LCP — the origin restarting on every Coolify deploy was leaving cold-rendered
 * pages exposed at the edge). Without this, a corrected /karar/ page would
 * render correctly at the origin but Cloudflare would keep serving the stale
 * edge copy for up to a year. Best-effort: a failed purge never blocks
 * ingest — the page still self-heals once the edge TTL lapses.
 */
async function purgeCloudflareUrls(urls: string[]): Promise<void> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const zoneId = process.env.CLOUDFLARE_ZONE_ID;
  if (!token || !zoneId || urls.length === 0) return;

  try {
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/purge_cache`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    });

    if (!response.ok) {
      console.error('cloudflare purge reddedildi', { status: response.status, body: await response.text() });
    }
  } catch (error) {
    console.error('cloudflare purge isteği başarısız', { message: String(error) });
  }
}

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

  // Corrected records (spec 3.3): the ORIGINAL page, not just the new DÜZELTME page.
  for (const slug of parsed.data.records) {
    revalidatePath('/karar/' + slug);
    revalidated.push('/karar/' + slug);
  }

  await purgeCloudflareUrls(parsed.data.records.map((slug) => absoluteUrl('/karar/' + slug)));

  return NextResponse.json({ ok: true, revalidated });
}
