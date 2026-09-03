import type { Metadata } from 'next';

import { EntityIndex, entityIndexMetadata } from '@/components/entity-index';

/**
 * ISR 1 day — the ranking is by record count, so the order shifts with every
 * ingest. Prerendered for real now that pagination lives at ./sayfa/[n] and this
 * route reads no query string.
 */
export const revalidate = 86400;

export const metadata: Metadata = entityIndexMetadata('company', 1);

export default async function Page() {
  return <EntityIndex kind="company" page={1} />;
}
