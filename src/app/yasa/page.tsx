import { LegislationIndexPage, legislationIndexMetadata } from '@/components/legislation-pages';

export const revalidate = 3600;

export const metadata = legislationIndexMetadata('yasa');

export default function Page() {
  return <LegislationIndexPage kind="yasa" />;
}
