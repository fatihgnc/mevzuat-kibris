import Link from 'next/link';

import { TopicDot } from '@/components/topic-badge';
import { TOPIC_LIST } from '@/lib/constants/topics';
import { formatCount } from '@/lib/db/queries/shared';

/**
 * Ana sayfa konu ızgarası — artboard 1d.
 *
 * İki sütun, aralarında 1px boşluk ve arkada çizgi rengi: hücreler beyaz,
 * aradaki boşluk gri, yani ızgara kendi kenarlığını çiziyor. Kenarlık yerine
 * boşluk kullanmak hücre içindeki metnin hizasını bozmuyor.
 *
 * Sıralama kayıt sayısına göre: kullanıcı en çok içerik olan konuyu önce görür.
 */
export function TopicStrip({ counts }: { counts: Record<string, number> }) {
  const topics = [...TOPIC_LIST].sort(
    (a, b) => (counts[b.slug] ?? 0) - (counts[a.slug] ?? 0) || a.sortOrder - b.sortOrder,
  );

  return (
    <div className="mt-[1px] grid gap-[1px] bg-line-soft sm:grid-cols-2">
      {topics.map((topic) => (
        <Link
          key={topic.slug}
          href={'/konu/' + topic.slug}
          className="flex flex-col gap-1 bg-surface px-4 py-3.5 no-underline transition-colors hover:bg-surface-hover hover:no-underline"
        >
          <span className="flex items-center gap-2 text-lg font-semibold text-ink">
            <TopicDot topic={topic.slug} size={8} />
            {topic.name}
          </span>
          <span className="text-base leading-[1.45] text-ink-muted">{topic.blurb}</span>
          <span className="text-sm text-ink-fainter">
            {counts[topic.slug] ? formatCount(counts[topic.slug]!) + ' kayıt' : 'Henüz kayıt yok'}
          </span>
        </Link>
      ))}
    </div>
  );
}
