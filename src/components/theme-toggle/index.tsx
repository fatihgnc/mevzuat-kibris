'use client';

import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Açık/koyu tema anahtarı — başlıkta.
 *
 * Temayı `document.documentElement` üzerindeki `data-theme` özniteliği taşıyor
 * ve bütün renkler CSS değişkenlerinden geldiği için tek satır her şeyi
 * çeviriyor (globals.css).
 *
 * İlk değeri BURASI belirlemiyor: layout'taki satır içi betik, sayfa
 * boyanmadan önce özniteliği kuruyor. Bu bileşen yalnızca o kararı okuyup
 * değiştiriyor. Sıra tersine olsaydı sayfa önce açık temayla boyanır, sonra
 * koyuya atlardı.
 *
 * `mounted` bekçisi hidrasyon uyuşmazlığını önlüyor: sunucu hangi temanın
 * seçili olduğunu bilemez (localStorage ve işletim sistemi tercihi yalnızca
 * tarayıcıda), o yüzden ilk render'da ikon yerine aynı boyutta boş bir kutu
 * basılıyor ve düzen zıplamıyor.
 */
const STORAGE_KEY = 'tema';

type Theme = 'light' | 'dark';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(
      document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
    );
    setMounted(true);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;

    /*
     * Seçim kalıcı. try/catch şart: gizli sekmede ve site verisi engelliyken
     * localStorage'a yazmak istisna atıyor ve tema değişimini götürürdü.
     */
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Saklanamadıysa tema yine de bu sekmede geçerli; sessizce devam.
    }
  }

  const label = theme === 'dark' ? 'Açık temaya geç' : 'Koyu temaya geç';

  return (
    <button
      type='button'
      onClick={toggle}
      aria-label={label}
      title={label}
      /*
       * aria-pressed yerine aria-label: bu bir açma/kapama değil, iki durum
       * arasında geçiş. Ekran okuyucuya "koyu tema açık mı" değil, "basınca ne
       * olacak" söylemek daha anlaşılır.
       */
      /*
       * Boyut, yanındaki "Ara" butonuyla birebir aynı olmak zorunda ve o buton
       * yüksekliğini arama GİRDİSİNDEN alıyor (form `flex`, hizalama stretch).
       * Girdinin dış kutusu `border px-3 py-2 text-md`, yani:
       *
       *     2px kenarlık + 1rem dikey dolgu + 15px × 1.55 satır yüksekliği
       *
       * Aşağıdaki calc tam olarak bu; sayı uydurulmadı, aynı jetonlardan
       * türetildi. 2px terimi GİRDİNİN kenarlığı — bu butonun kendi kenarlığı
       * yok, ama toplam yüksekliğin girdiyle eşleşmesi için sayılması gerekiyor.
       * `aspect-square` genişliği yükseklikten alıyor.
       *
       * Kenarlık KALDIRILDI (ürün sahibinin kararı): dolu teal "Ara" butonunun
       * yanında çerçeveli bir kutu, ölçüleri birebir aynı olsa bile farklı bir
       * nesne gibi okunuyor ve hizasız duruyordu. Geri bildirim artık hover'da
       * zemin rengiyle veriliyor.
       *
       * `self-stretch` denendi ve yükseklik doğru geliyor ama genişlik içerik
       * kadar (19px) kalıyor: esnetmeyle gelen yükseklik `aspect-ratio` için
       * belirli sayılmıyor. Açık yükseklik verilince oran çalışıyor.
       */
      className='inline-flex aspect-square h-[42px] shrink-0 items-center justify-center rounded p-0 text-ink-muted transition-colors hover:text-ink'
    >
      {/*
        İkon boyutu kutuyla birlikte büyüdü. Kutu 36px'ken ikon 17px'ti (%47);
        kutu "Ara" ile eşitlenip 41px olunca 17px ikon kutunun içinde kaybolup
        boş bir çerçeve gibi duruyordu. 20px aynı oranı (%48) koruyor.
      */}
      {mounted ? (
        theme === 'dark' ? (
          <Sun size={20} aria-hidden />
        ) : (
          <Moon size={20} aria-hidden />
        )
      ) : null}
    </button>
  );
}
