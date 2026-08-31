import Link from 'next/link';

import { TOPIC_LIST } from '@/lib/constants/topics';
import { formatCount } from '@/lib/db/queries/shared';
import { cn } from '@/lib/utils';

/**
 * Ana sayfa konu ızgarası — artboard 1d.
 *
 * İki sütun, aralarında 1px boşluk ve arkada çizgi rengi: hücreler beyaz,
 * aradaki boşluk gri, yani ızgara kendi kenarlığını çiziyor. Kenarlık yerine
 * boşluk kullanmak hücre içindeki metnin hizasını bozmuyor.
 *
 * Bu tekniğin bedeli: son satır eksik kalırsa boşluk hücre kadar büyür ve
 * ızgaranın zemini koca bir blok olarak görünür. Konu sayısı sekizken (çift)
 * fark edilmiyordu; dokuzuncu konu eklenince ortaya çıktı. Boş hücreleri
 * yüzey renginde dolgular kapatıyor.
 *
 * Sütun sayısı kırılım noktasına göre değiştiği için (2 → 3) eksik hücre
 * sayısı da değişiyor: dokuz konu iki sütunda bir boşluk bırakıyor, üç
 * sütunda hiç bırakmıyor. Dolgular bu yüzden sabit değil, her iki düzen için
 * ayrı hesaplanıp yalnızca gerektiği kırılımda görünüyor. Konu sayısı
 * değişince kendiliğinden doğru sonucu veriyor.
 *
 * Sıralama kayıt sayısına göre: kullanıcı en çok içerik olan konuyu önce görür.
 */
/** Verilen sütun sayısında son satırı tamamlamak için kaç hücre eksik. */
function missingCells(count: number, columns: number): number {
  return (columns - (count % columns)) % columns;
}

export function TopicStrip({ counts }: { counts: Record<string, number> }) {
  const topics = [...TOPIC_LIST].sort(
    (a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0) || a.sortOrder - b.sortOrder,
  );

  const twoCol = missingCells(topics.length, 2);
  const threeCol = missingCells(topics.length, 3);

  const fillers = Array.from({ length: Math.max(twoCol, threeCol) }, (_, index) => {
    const inTwo = index < twoCol;
    const inThree = index < threeCol;
    if (inTwo && inThree) return 'sm:block';
    if (inTwo) return 'sm:block lg:hidden';
    return 'lg:block';
  });

  return (
    <div className="mt-[1px] grid gap-[1px] bg-line-soft sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic) => (
        <Link
          key={topic.slug}
          href={'/konu/' + topic.slug}
          className="flex flex-col gap-1 bg-surface px-4 py-3.5 no-underline transition-colors hover:bg-surface-hover hover:no-underline"
        >
          <span className="flex items-center gap-2 text-lg font-semibold text-ink">
            {topic.name}
          </span>
          <span className="text-base leading-[1.45] text-ink-muted">{topic.blurb}</span>
          <span className="text-sm text-ink-fainter">
            {counts[topic.slug] ? formatCount(counts[topic.slug]!) + ' kayıt' : 'Henüz kayıt yok'}
          </span>
        </Link>
      ))}

      {/*
        Tek sütunlu düzende (sm altı) boş hücre diye bir şey yok; dolgu orada
        yalnızca ızgaranın altına sahte bir ayraç çizerdi. Bu yüzden hiçbir
        dolgu varsayılan olarak görünmüyor, her biri yalnızca ihtiyaç duyulan
        kırılımda açılıyor.
      */}
      {fillers.map((visibility, index) => (
        <div key={index} aria-hidden className={cn('hidden bg-surface', visibility)} />
      ))}
    </div>
  );
}
