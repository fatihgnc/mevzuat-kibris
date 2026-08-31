import Link from 'next/link';

import { MaskedText } from '@/components/masked-text';
import { TopicDot } from '@/components/topic-badge';
import { recordHref } from '@/lib/db/queries/shared';
import { formatDateShort, isDeadlinePassed } from '@/lib/text/dates';
import { TOPICS } from '@/lib/constants/topics';
import { cn } from '@/lib/utils';
import type { RecordListItem } from '@/types/record';

interface RecordCardProps {
  record: RecordListItem;
  /** Konu akışında konu zaten belli; noktayı tekrar basmıyoruz. */
  hideTopic?: boolean;
  /** Münhal akışında başvuru bitiş tarihi öne çıkar (spec 3.9). */
  showDeadline?: boolean;
  /**
   * `full`    — arama ve konu akışı (artboard 1b/1e): referans, alıntı, künye satırı
   * `compact` — ana sayfa (artboard 1d): yalnızca tarih, özet ve konu
   *
   * Tasarımda ana sayfa satırı bilerek daha sade: orada amaç taramak, karşılaştırmak
   * değil.
   */
  variant?: 'full' | 'compact';
  className?: string;
}

/**
 * Liste satırı — artboard 1b/1d/1e'deki tek biçim.
 *
 * Sol sütun 92px sabit: tarih ve referans numarası. Sabit genişlik, satırlar
 * arasında dikey bir hizanın oluşmasını sağlıyor; tarihler farklı uzunlukta
 * olduğunda bile göz tek bir sütunu tarıyor.
 *
 * Özet (summary) ana metin, ham başlık değil. Ham başlık yalnızca gövde metni
 * çıkarılamadığında ve o zaman da maskelenmiş hâliyle görünüyor (spec 3.8).
 */
export function RecordCard({
  record,
  hideTopic,
  showDeadline,
  variant = 'full',
  className,
}: RecordCardProps) {
  const heading = record.summary ?? null;
  const deadlinePassed = isDeadlinePassed(record.deadlineAt);
  const compact = variant === 'compact';

  return (
    <Link
      href={recordHref(record)}
      className={cn(
        'grid grid-cols-row items-start gap-[18px] border-b border-line-soft py-4 pr-[10px]',
        'no-underline transition-colors hover:bg-surface-hover hover:no-underline',
        className,
      )}
    >
      <div className="flex flex-col gap-[3px] pt-0.5">
        <time dateTime={record.publishedAt} className="text-base font-semibold text-ink-body">
          {formatDateShort(record.publishedAt)}
        </time>
        {!compact && record.refLabel ? (
          <span className="text-xs text-ink-fainter">{record.refLabel}</span>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        {heading ? (
          <span className="text-xl font-medium leading-[1.38] tracking-tight text-ink">
            {heading}
          </span>
        ) : (
          <MaskedText tokens={record.titleTokens} className="text-xl leading-[1.38]" />
        )}

        {compact ? null : record.snippet ? (
          <span className="text-base leading-[1.55] text-ink-muted">
            <MaskedText tokens={record.snippet} variant="quote" />
          </span>
        ) : !record.hasBody && heading ? (
          /*
           * Gövde metni GERÇEKTEN yok. Tasarımın kararı: satırı boş bırakmak
           * yerine gazetedeki ham başlığı maskelenmiş hâliyle göstermek ve bunu
           * açıkça söylemek.
           *
           * Koşul record.hasBody'ye bakıyor, snippet'e değil: liste sayfalarında
           * ts_headline hiç çalışmıyor, snippet null oluyor ve yalnızca snippet'e
           * bakılırsa gövdesi olan kayıtlara da "çıkarılamadı" yazılıyor.
           */
          <span className="flex flex-col gap-1 border-l-2 border-line-dashed pl-2.5">
            <span className="text-2xs text-ink-fainter">
              Gövde metni çıkarılamadı, gazetedeki başlık:
            </span>
            <MaskedText tokens={record.titleTokens} className="text-base leading-[1.5]" />
          </span>
        ) : null}

        {showDeadline && record.deadlineAt ? (
          <span
            className={cn(
              'text-sm font-semibold',
              deadlinePassed ? 'text-ink-muted' : 'rounded-sm bg-mark px-1 text-ink',
            )}
          >
            {deadlinePassed
              ? 'Başvuru süresi doldu, ' + formatDateShort(record.deadlineAt)
              : 'Başvuru bitişi ' + formatDateShort(record.deadlineAt)}
          </span>
        ) : null}

        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
          {!hideTopic && record.primaryTopic ? (
            <span className="inline-flex items-center gap-1.5">
              <TopicDot topic={record.primaryTopic} />
              {TOPICS[record.primaryTopic].name}
            </span>
          ) : null}
          {/*
           * Belge türü konu adıyla başlıyorsa tekrar basmıyoruz: "Münhal · Münhal
           * ilanı" gibi bir satır bilgi taşımıyor. Tasarımdaki showTur kuralı bu.
           */}
          {shouldShowDocType(record) ? <span>{record.docTypeLabel}</span> : null}
          {record.institution ? (
            <span className="text-ink-fainter">{record.institution}</span>
          ) : null}
        </span>
      </div>
    </Link>
  );
}

function shouldShowDocType(record: RecordListItem): boolean {
  if (!record.primaryTopic) return true;
  const topicName = TOPICS[record.primaryTopic].name;
  return !record.docTypeLabel.toLocaleLowerCase('tr').startsWith(topicName.toLocaleLowerCase('tr'));
}
