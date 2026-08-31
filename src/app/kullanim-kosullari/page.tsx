import type { Metadata } from 'next';
import Link from 'next/link';

import { ProsePage, Section } from '@/components/prose-page';
import { SITE_NAME } from '@/lib/seo/config';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Kullanım koşulları',
  description:
    'Sitenin kullanım koşulları: içerik resmî değildir, bağlayıcı olan Resmî Gazete’de yayımlanan metindir.',
  path: '/kullanim-kosullari',
});

export default function TermsPage() {
  return (
    <ProsePage
      title="Kullanım koşulları"
      crumbs={[{ name: 'Ana sayfa', href: '/' }, { name: 'Kullanım koşulları' }]}
    >
      <Section heading="İçeriğin niteliği">
        <p className="m-0">
          {SITE_NAME} resmî bir kurum değildir ve bu sitedeki hiçbir metin resmî yayın sayılmaz.
          Kayıtlar Resmî Gazete PDF&apos;lerinden otomatik olarak çıkarılmıştır. Hukuken bağlayıcı
          olan, Resmî Gazete&apos;de yayımlanan orijinal metindir.
        </p>
        <p className="m-0">
          Özet cümleler tarafımızdan üretilmiştir ve kararların sonucunu bildirmez. Bir kararın
          nasıl sonuçlandığını öğrenmek için orijinal metne bakmanız gerekir.
        </p>
      </Section>

      <Section heading="Doğruluk ve sorumluluk">
        <p className="m-0">
          Metinler otomatik okunuyor; özellikle taranmış eski sayılarda harf hataları ve eksik
          çıkarım olabilir. Site olduğu gibi sunulmaktadır. Buradaki bilgiye dayanarak alınan
          kararlardan doğan sonuçlardan sorumlu değiliz.
        </p>
        <p className="m-0">
          Başvuru ve itiraz süreleri gibi hak düşürücü tarihler için her zaman orijinal
          PDF&apos;i esas alın.
        </p>
      </Section>

      <Section heading="Hukuki tavsiye değildir">
        <p className="m-0">
          Bu sitedeki hiçbir içerik hukuki tavsiye niteliğinde değildir. Somut bir hukuki durum için
          avukata danışın.
        </p>
      </Section>

      <Section heading="Kullanım ve yeniden yayım">
        <p className="m-0">
          Resmî Gazete içeriği kamu belgesidir ve telif kısıtı yoktur. Sitedeki kayıtlara bağlantı
          verebilir, RSS beslemelerini kullanabilirsiniz. Otomatik toplu erişim yapacaksanız makul
          bir hızda kalın; kaynak sitenin yükünü artırmamak için biz de öyle yapıyoruz.
        </p>
      </Section>

      <Section heading="Ücretsizlik">
        <p className="m-0">
          Tüm özellikler herkese ücretsizdir. Ücretli abonelik, paywall ya da kullanım limiti
          getirilmeyecektir. Ayrıntı için <Link href="/hakkinda">hakkında sayfasına</Link> bakın.
        </p>
      </Section>
    </ProsePage>
  );
}
