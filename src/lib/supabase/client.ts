'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * The browser client is used only in the magic-link flow and in follow management.
 * It never enters list or record pages; the JS budget (spec 13) is built on that.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
