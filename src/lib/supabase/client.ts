'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Tarayıcı istemcisi yalnızca magic link akışında ve takip yönetiminde kullanılıyor.
 * Liste ve kayıt sayfalarına hiç girmiyor; JS bütçesi (spec 13) bunun üzerine kurulu.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
