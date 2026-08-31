import type { Metadata } from 'next';
import Link from 'next/link';

import { ProsePage, Section } from '@/components/prose-page';
import { archiveCoverage, coverageShort } from '@/lib/db/queries/coverage';
import { SITE_NAME, SOURCE_BASE_URL } from '@/lib/seo/config';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Hakkında',
  description:
    'Mevzuat Kıbrıs nedir, neyi çözüyor, veriyi nereden alıyor ve neden ücretsiz. Resmî bir kurum değildir.',
  path: '/hakkinda',
});

export default async function AboutPage() {
  const coverage = await archiveCoverage();

  return (
    <ProsePage
      title="Hakkında"
      lede="KKTC Resmî Gazete’de yayımlanan her şeyi aranabilir hâle getiriyoruz. Ücretsiz, reklam destekli, resmî değil."
      crumbs={[{ name: 'Ana sayfa', href: '/' }, { name: 'Hakkında' }]}
    >
      <Section heading="Sorun ne">
        <p className="m-0">
          KKTC Resmî Gazete yalnızca PDF olarak yayımlanıyor. Bir yılın tüm sayıları tek bir HTML
          sayfasında listeleniyor ve sitenin kendi önerisi sayfa içinde CTRL+F yapmak. Full-text
          arama yok, filtreleme yok, bildirim yok, tekil bir karara bağlantı verilemiyor ve mobilde
          kullanılamıyor.
        </p>
        <p className="m-0">
          Sonuç: münhal ilanı arayan biri her gün PDF açıp taramak zorunda; arsası kamulaştırılan
          biri kararı çoğu zaman geç öğreniyor.
        </p>
      </Section>

      <Section heading="Ne yapıyoruz">
        <p className="m-0">
          Aynı veriyi indiriyor, metne çeviriyor, kayıt seviyesinde parçalıyor, sınıflandırıyor ve
          aranabilir hâle getiriyoruz. Kaydettiğiniz kelime, şirket, yer ya da konu için yeni bir
          kayıt yayımlandığında e-posta gönderiyoruz. Aynı akışların RSS bağlantısı da var ve kayıt
          gerektirmiyor.
        </p>
        <p className="m-0">
          {coverageShort(coverage)}. Süreci{' '}
          <Link href="/rehber/veriyi-nasil-topluyoruz">nasıl topladığımızı anlatan rehberde</Link>{' '}
          adım adım açıkladık; hata payının nerede olduğunu da orada yazıyor.
        </p>
      </Section>

      <Section heading="Resmî değiliz">
        <p className="m-0">
          {SITE_NAME} bağımsız bir arşivdir; hiçbir kamu kurumuyla bağlantısı yoktur. Hukuken
          bağlayıcı olan, Resmî Gazete&apos;de yayımlanan orijinal metindir. Her kayıt sayfasında o
          metnin bulunduğu PDF&apos;e bağlantı veriyoruz.
        </p>
        <p className="m-0">
          Kaynak:{' '}
          <a href={SOURCE_BASE_URL} target="_blank" rel="noopener noreferrer">
            Devlet Basımevi arşivi
          </a>
          . PDF&apos;leri saklamıyoruz; indirme bağlantıları her zaman orijinal kaynağa gider.
        </p>
      </Section>

      <Section heading="Neden ücretsiz">
        <p className="m-0">
          Resmî Gazete kamu belgesidir; ona erişimi paralı hâle getirmek doğru olmazdı. Ücretli
          abonelik, paywall ve kullanım limiti kalıcı olarak kapsam dışı. Tek gelir kaynağı reklam
          ve reklamlar ilk ekranın altında, içerikten sonra duruyor.
        </p>
      </Section>

      <Section heading="Hata bulursanız">
        <p className="m-0">
          Ayrıştırma hataları oluyor, özellikle taranmış eski sayılarda.{' '}
          <Link href="/iletisim">İletişim sayfasından</Link> kaydın bağlantısıyla birlikte yazın;
          düzeltip test setimize ekliyoruz, böylece aynı hata tekrarlanmıyor.
        </p>
      </Section>
    </ProsePage>
  );
}
