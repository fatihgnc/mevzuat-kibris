import 'server-only';

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Auth yalnızca /takip ve /hesap için (spec 8.1'de ikisi de noindex, dinamik).
 * Kayıt ve liste sayfaları auth'a hiç dokunmuyor — dokunsalardı statik render
 * mümkün olmazdı (spec 11.1).
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
            // Server component'ten çağrıldığında cookie yazılamaz; middleware
            // oturumu zaten tazeliyor, burada sessizce geçmek doğru davranış.
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
