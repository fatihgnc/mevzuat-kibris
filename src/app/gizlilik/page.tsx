import type { Metadata } from 'next';
import Link from 'next/link';

import { ProsePage, Section } from '@/components/prose-page';
import { CONTACT_EMAIL } from '@/lib/seo/config';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Gizlilik',
  description:
    'Hangi verileri topluyoruz, neden topluyoruz ve ne kadar saklıyoruz. E-posta yalnızca takip bildirimleri için kullanılır.',
  path: '/gizlilik',
});

export default function PrivacyPage() {
  return (
    <ProsePage
      title="Gizlilik"
      lede="Kısa versiyon: takip kurmazsanız sizden hiçbir şey istemiyoruz. Kurarsanız yalnızca e-posta adresinizi saklıyoruz."
      crumbs={[{ name: 'Ana sayfa', href: '/' }, { name: 'Gizlilik' }]}
    >
      <Section heading="E-posta adresi">
        <p className="m-0">
          Takip kurduğunuzda e-posta adresinizi saklıyoruz. Yalnızca takip ettiğiniz konu ya da
          kelime için yeni kayıt yayımlandığında bildirim göndermek için kullanılıyor. Pazarlama
          e-postası göndermiyoruz, adresinizi kimseyle paylaşmıyor ve satmıyoruz.
        </p>
        {/*
          * WORDED TO MATCH WHAT THE CODE ACTUALLY DOES — measured, not assumed.
          *
          * /api/abonelik-iptal deletes the alerts and, once none are left, the
          * `profiles` row. It does NOT touch `auth.users`, which belongs to
          * Supabase Auth and still holds the address; removing that needs the
          * Admin API and a service-role key at run time, which the app
          * deliberately does not carry. Verified after a real unsubscribe:
          * alerts 0, profiles 0, alert_deliveries 0, auth.users 1.
          *
          * This paragraph used to promise "your address is deleted from our
          * records", which was simply untrue. If the deletion is ever made
          * complete, change this text back in the same commit — and the /takip
          * `durum=iptal` box with it.
          */}
        <p className="m-0">
          Her e-postanın altında tek tıkla abonelikten çıkma bağlantısı var. Çıktığınızda
          takipleriniz ve onlara bağlı e-posta kaydınız silinir; size bir daha e-posta gitmez.
        </p>
        <p className="m-0">
          Giriş kaydınız — yalnızca e-posta adresiniz — kimlik doğrulama sağlayıcımızda kalır, ki
          daha sonra aynı adresle yeniden giriş yapabilesiniz. Bunun da silinmesini isterseniz{' '}
          <a href={'mailto:' + CONTACT_EMAIL}>{CONTACT_EMAIL}</a> adresine yazın.
        </p>
      </Section>

      <Section heading="Hesap">
        <p className="m-0">
          Parola yok. Giriş, e-posta adresinize gönderilen tek kullanımlık bağlantıyla yapılıyor.
          Bağlantıya tıklanana kadar hiçbir kayıt oluşmaz; adres başkasına aitse hiçbir şey olmaz.
        </p>
      </Section>

      <Section heading="Arama kayıtları">
        <p className="m-0">
          Yapılan aramaları ve sonuç sayısını kaydediyoruz. Bu kayıtlar kişiye bağlı değil: IP
          adresi, tarayıcı bilgisi ya da kullanıcı kimliği tutulmuyor. Amaç, boş sonuç dönen
          aramaları görüp aramayı düzeltmek ve ana sayfadaki sık aranan listesini üretmek.
        </p>
      </Section>

      <Section heading="Reklam ve ölçüm">
        <p className="m-0">
          Site Google AdSense reklamı gösterir. Google, reklam kişiselleştirmesi için çerez
          kullanabilir; tarayıcınızın reklam ayarlarından bunu kapatabilirsiniz. Sayfa görüntüleme
          sayısını ölçmek için Vercel Analytics kullanıyoruz; bu araç çerez kullanmıyor ve ziyaretçi
          bazında iz tutmuyor.
        </p>
      </Section>

      <Section heading="Kayıtlardaki kişi adları">
        <p className="m-0">
          Resmî Gazete atama kararnameleri ve sınav sonuç listeleri gibi kişi adı içeren kayıtlar
          barındırıyor. Kişi adına özel sayfa üretmiyoruz ve bu listelerdeki adları sayfada
          göstermiyoruz. Kaldırma talebi için{' '}
          <a href={'mailto:' + CONTACT_EMAIL}>{CONTACT_EMAIL}</a> adresine yazın; yedi gün içinde
          yanıtlıyoruz. Ayrıntı için <Link href="/iletisim">iletişim sayfasına</Link> bakın.
        </p>
      </Section>
    </ProsePage>
  );
}
