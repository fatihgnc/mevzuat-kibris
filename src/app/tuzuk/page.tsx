import { LegislationIndexPage, legislationIndexMetadata } from '@/components/legislation-pages';

export const revalidate = 3600;

export const metadata = legislationIndexMetadata('tuzuk');

export default function Page() {
  return <LegislationIndexPage kind="tuzuk" />;
}
