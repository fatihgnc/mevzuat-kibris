import type { Metadata } from 'next';
import Link from 'next/link';

import { ProsePage, Section } from '@/components/prose-page';
import { CONTACT_EMAIL } from '@/lib/seo/config';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Gizlilik',
  description:
    'Hangi verileri topluyoruz, neden topluyoruz ve ne kadar saklıyoruz.',
  path: '/gizlilik',
});

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Gizlilik"
      crumbs={[{ name: 'Ana sayfa', href: '/' }, { name: 'Gizlilik' }]}
    >
      <Section heading="Arama kayıtları">
        <p className="m-0">
          Yapılan aramaları ve sonuç sayısını kaydediyoruz. Bu kayıtlar kişiye bağlı değil: IP
          adresi, tarayıcı bilgisi ya da kullanıcı kimliği tutulmuyor. Amaç, boş sonuç dönen
          aramaları görüp aramayı düzeltmek ve ana sayfadaki sık aranan listesini üretmek.
        </p>
      </Section>

      <Section heading="Ölçüm">
        <p className="m-0">
          Sayfa görüntüleme sayısını ölçmek için Cloudflare Web Analytics kullanıyoruz; bu araç
          çerez kullanmıyor ve ziyaretçi bazında iz tutmuyor.
        </p>
      </Section>

      <Section heading="Kayıtlardaki kişi adları">
        <p className="m-0">
          Resmî Gazete atama kararnameleri ve sınav sonuç listeleri gibi kişi adı içeren kayıtlar
          barındırıyor. Bu kayıtlar gazetede yayımlandığı şekliyle kayıt sayfasında görünebilir.
          Adınızın geçtiği bir kayıt hakkında kaldırma talebi için{' '}
          <a href={'mailto:' + CONTACT_EMAIL}>{CONTACT_EMAIL}</a> adresine yazın; yedi gün içinde
          yanıtlıyoruz. Ayrıntı için <Link href="/iletisim">iletişim sayfasına</Link> bakın.
        </p>
      </Section>
    </ProsePage>
  );
}
