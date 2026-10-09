'use client';

import { ErrorFallback } from '@/components/error-fallback';

/**
 * The boundary for every page: an exception while rendering or navigating lands
 * here, inside the root layout, instead of blanking the whole document. See
 * lib/client-error for why it exists.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorFallback error={error} reset={reset} kind="page" />;
}
