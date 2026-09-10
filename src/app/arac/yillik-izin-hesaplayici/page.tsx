import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ToolPage } from '@/components/tool-page';
import { AnnualLeaveForm } from '@/components/tools/annual-leave-form';
import { buildMetadata } from '@/lib/seo/metadata';
import { findTool, toolPath } from '@/lib/tools/registry';

const SLUG = 'yillik-izin-hesaplayici';

/*
 * Başlık, açıklama ve canonical KAYITTAN okunuyor. Sayfaya elle yazılsalardı
 * menüdeki ad ile <title> zamanla ayrışırdı; araç kaydı zaten tek kaynak.
 */
const tool = findTool(SLUG);

export const metadata: Metadata = buildMetadata({
  title: tool?.title ?? 'Hesaplayıcı',
  description: tool?.description ?? '',
  path: toolPath(SLUG),
});

export default function Page() {
  /*
   * Kayıttan silinmiş bir araç için sayfa 404 veriyor: boş bir iskelet
   * yayımlamaktansa sayfanın olmadığını söylemek doğru.
   */
  if (!tool) notFound();

  return (
    <ToolPage tool={tool}>
      <AnnualLeaveForm />
    </ToolPage>
  );
}
