import type { Metadata } from 'next';

import { ContactForm } from '@/components/contact-form';
import { ProsePage, Section } from '@/components/prose-page';
import { CONTACT_EMAIL } from '@/lib/seo/config';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'İletişim',
  description:
    'Hata bildirimi, kaldırma talebi ve diğer sorular için iletişim. Kaldırma talepleri yedi gün içinde yanıtlanır.',
  path: '/iletisim',
});

export default function ContactPage() {
  return (
    <ProsePage
      title="İletişim"
      crumbs={[{ name: 'Ana sayfa', href: '/' }, { name: 'İletişim' }]}
    >
      <Section>
        <p className="m-0">
          Her konu için tek adres:{' '}
          <a href={'mailto:' + CONTACT_EMAIL} className="font-semibold">
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>

      <Section heading="Kayıt hatası bildirimi">
        <p className="m-0">
          Bir kaydın başlığı, tarihi, referans numarası ya da metni yanlışsa kaydın bağlantısıyla
          birlikte yazın. Ayrıştırma hatalarını düzeltip test setimize ekliyoruz.
        </p>
      </Section>

      <Section heading="Kaldırma talebi">
        <p className="m-0">
          Resmî Gazete kamuya açık bir belge; yine de kişi adı geçen kayıtlarda kaldırma talebinde
          bulunabilirsiniz. Talebinizi <strong>yedi gün içinde</strong> yanıtlıyoruz.
        </p>
        <p className="m-0">
          Sınav sonucu ve atama kararnamesi gibi kişi adı geçen kayıtlar, gazetede yayımlandığı
          şekliyle kayıt sayfasında görünebilir. Adınızın geçtiği bir kayıt hakkında kaldırma
          talebiniz varsa yukarıdaki adrese yazın, kaldırırız.
        </p>
      </Section>

      <Section heading="Kurumsal kullanım">
        <p className="m-0">
          Verinin toplu kullanımı, RSS beslemelerinin haber sitesi ya da Telegram kanalında
          kullanılması için izin almanıza gerek yok. Kaynak göstermeniz yeterli.
        </p>
      </Section>

      <Section heading="Mesaj gönderin">
        <p className="m-0">
          Mail istemcisi açmak istemiyorsanız, kısa bir mesaj için aşağıdaki formu kullanabilirsiniz.
        </p>
        <ContactForm />
      </Section>
    </ProsePage>
  );
}
