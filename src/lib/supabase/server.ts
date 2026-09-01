import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Auth is only for /takip and /hesap (both noindex and dynamic in spec 8.1).
 * Record and list pages never touch auth — if they did, static rendering would be
 * impossible (spec 11.1).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items: Array<{ name: string; value: string; options: CookieOptions }>) => {
          try {
            for (const { name, value, options } of items) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Cookies cannot be written when called from a server component; middleware
            // already refreshes the session, so passing silently here is the right behaviour.
          }
        },
      },
    },
  );
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
