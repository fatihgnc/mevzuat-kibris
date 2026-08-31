import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Oturum tazeleme — yalnızca auth gereken yollarda.
 *
 * matcher kasıtlı olarak dar: kayıt ve liste sayfaları ISR ile statik
 * servis ediliyor (spec 11.1) ve middleware her isteğe girerse o statiklik
 * anlamını yitirir. Auth yalnızca /takip, /hesap ve /auth/* için gerekli.
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
