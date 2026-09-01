import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Session refresh — only on paths that need auth.
 *
 * The matcher is deliberately narrow: record and list pages are served statically
 * via ISR (spec 11.1), and if middleware ran on every request that staticness would
 * lose its meaning. Auth is only needed for /takip, /hesap and /auth/*.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items: Array<{ name: string; value: string; options: CookieOptions }>) => {
        for (const { name, value } of items) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of items) response.cookies.set(name, value, options);
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/takip/:path*', '/hesap/:path*', '/auth/:path*'],
};
