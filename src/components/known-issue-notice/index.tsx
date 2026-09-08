import { cn } from '@/lib/utils';

/**
 * GEÇİCİ — gövde metni kalitesi duyurusu.
 *
 * Ölçüm (7 Eylül 2026, arşivin tamamı, 50.566 sayfa): sayfaların %45,1'i temiz,
 * %20,8'i font eşlemesi olmadığı için okunamıyor, %15,1'inde gömülü OCR bozuk,
 * %18,9'unda düzen/okuma sırası hatalı. Ayrıca 670 kaydın gövdesi eski bir
 * 20 KB tavanı yüzünden cümle ortasında kesilmiş durumda.
 *
 * Kullanıcı bunu zaten görüyor; söylememek onu gizlemek olurdu. Düzeltme
 * yayına girdiğinde BU BİLEŞEN KALDIRILIR — ana sayfadaki tek kullanımı
 * silmek yeterli (src/app/(home)/page.tsx).
 */
export function KnownIssueNotice({ className }: { className?: string }) {
  return (
    <aside
      aria-label="Bilinen sorun"
      className={cn(
        'rounded border border-notice-border bg-notice px-4 py-3.5 text-notice-ink',
        className,
      )}
    >
      <p className="m-0 text-base font-semibold leading-[1.5]">
        Bazı kayıtların metni bozuk veya eksik görünüyor.
      </p>
      <p className="m-0 mt-1.5 max-w-lede text-sm leading-[1.6]">
        Gazete sayılarının bir bölümü taranmış görüntü olarak yayımlandığı için otomatik
        okuma her sayfada temiz sonuç vermiyor; bazı kayıtlarda da metin yarıda kesiliyor.
        Farkındayız ve üzerinde çalışıyoruz. Bağlayıcı olan her zaman gazetedeki resmî
        PDF&apos;tir; her kayıt sayfasında kaynağa bağlantı var.
      </p>
    </aside>
  );
}
