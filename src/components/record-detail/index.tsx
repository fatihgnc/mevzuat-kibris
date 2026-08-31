import Link from 'next/link';

import { AdSlot } from '@/components/ad-slot';
import { CopyLink } from '@/components/copy-link';
import { EntityChip } from '@/components/entity-chip';
import { FollowCard } from '@/components/follow-card';
import { MaskedText } from '@/components/masked-text';
import { RawTitle } from '@/components/raw-title';
import { RecordMetaBar, buildRecordMetaFields } from '@/components/record-meta-bar';
import { SourceNotice, OcrNotice } from '@/components/source-notice';
import { TopicDot } from '@/components/topic-badge';
import { docTypeLabel, formatRef } from '@/lib/constants/doc-types';
import { TOPICS } from '@/lib/constants/topics';
import { recordHref } from '@/lib/db/queries/shared';
import { maskTitle } from '@/lib/search/mask-title';
import { absoluteUrl } from '@/lib/seo/config';
import { formatDateLong, formatDateShort, isDeadlinePassed } from '@/lib/text/dates';
import type { RecordDetail as RecordDetailType } from '@/types/record';

/**
 * Kayıt sayfası gövdesi — artboards 1a (metni var) ve 1g (metni yok).
 *
 * İki artboard aynı iskelet: künye, ham başlık kutusu, meta şerit, eylemler,
 * sonra iki sütun. Fark yalnızca gövde bloğunda. Bu yüzden tek bileşen, iki dal.
 */
export function RecordDetail({ record }: { record: RecordDetailType }) {
  const primaryTopic = record.topics[0] ? TOPICS[record.topics[0]] : null;
  const institution = record.entities.find((entity) => entity.kind === 'institution') ?? null;
  const refLabel = formatRef(record.refType, record.refNumber);
  const titleTokens = maskTitle(record.title);
  const heading = record.summary ?? record.title;
  const url = absoluteUrl('/karar/' + record.slug);
  const hasBody = Boolean(record.bodyText && record.bodyText.trim().length > 0);
  const pageLabel = record.pageFrom ? ', sayfa ' + record.pageFrom : '';

  return (
    <article>
      {/* Künye şeridi — konu · belge türü · tarih */}
      <div className="mb-[18px] flex flex-wrap items-center gap-2.5 text-sm text-ink-muted">
        {primaryTopic ? (
          <Link
            href={'/konu/' + primaryTopic.slug}
            className="inline-flex items-center gap-[7px] font-semibold text-ink-body no-underline hover:text-accent hover:no-underline"
          >
            <TopicDot topic={primaryTopic.slug} />
            {primaryTopic.name}
          </Link>
        ) : null}
        <Divider />
        <span>{docTypeLabel(record.docType)}</span>
        <Divider />
        <time dateTime={record.publishedAt}>{formatDateLong(record.publishedAt)}</time>
      </div>

      <h1 className="m-0 max-w-title text-4xl font-semibold leading-[1.28] tracking-tightest text-ink sm:text-6xl">
        {heading}
      </h1>

      {/*
       * Özetin üretilmiş olduğunu açıkça söylüyoruz (spec 3.8). Kullanıcı h1'de
       * gördüğü cümlenin gazetede yazmadığını bilmeli; hemen altındaki kutuda da
       * gazetenin kendi başlığı duruyor.
       */}
      {record.summary ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
          <span aria-hidden className="h-[5px] w-[5px] rounded-full bg-accent" />
          Bu özeti kayıttaki alanlardan biz oluşturduk
        </p>
      ) : null}

      <RawTitle tokens={titleTokens} plainTitle={record.title} />

      <RecordMetaBar
        className="mt-7"
        fields={buildRecordMetaFields({
          refLabel,
          publishedAt: record.publishedAt,
          issueNumber: record.issue.number,
          section: record.section,
          institution,
          primaryTopic: primaryTopic
            ? { slug: primaryTopic.slug, name: primaryTopic.name }
            : null,
        })}
      />

      {record.deadlineAt ? (
        <p className="mt-4 text-md">
          {isDeadlinePassed(record.deadlineAt) ? (
            <span className="text-ink-muted">
              Başvuru süresi doldu, {formatDateLong(record.deadlineAt)}
            </span>
          ) : (
            <span className="rounded-sm bg-mark px-1.5 py-0.5 font-semibold text-ink">
              Son başvuru {formatDateLong(record.deadlineAt)}
            </span>
          )}
          {record.deadlineNote ? (
            <span className="ml-2 text-ink-muted">{record.deadlineNote}</span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-[22px] flex flex-wrap gap-2.5">
        <a
          href={record.issue.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-ink bg-surface px-[18px] py-2.5 text-md font-semibold text-ink no-underline transition-colors hover:bg-ink hover:text-surface hover:no-underline"
        >
          Resmî PDF{pageLabel}
        </a>
        <CopyLink url={url} />
      </div>

      <div className="mt-9 grid gap-10 lg:grid-cols-record">
        <div className="min-w-0">
          {hasBody ? (
            <>
              {record.issue.textStatus === 'ocr' || record.issue.textStatus === 'needs_review' ? (
                <OcrNotice className="mb-[22px]" />
              ) : null}

              {/*
               * Kişisel veri içeren kayıtlarda gövde render edilmiyor (spec 3.7
               * madde 2): sınav sonuç listeleri ve benzeri belgeleri aranabilir
               * bir kişi dizinine çevirmek istemiyoruz.
               */}
              {record.hasPersonalData ? (
                <PersonalDataNotice pdfUrl={record.issue.pdfUrl} />
              ) : (
                <div className="flex max-w-prose flex-col gap-[18px] text-xl leading-[1.72] text-ink-body">
                  {splitParagraphs(record.bodyText!).map((paragraph, index) => (
                    <p key={index} className="m-0">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
            </>
          ) : (
            <MissingTextCard record={record} />
          )}

          {record.entities.length ? (
            <section className="mt-[30px] border-t border-line pt-[22px]">
              <h2 className="mb-3 text-xs text-ink-faint">
                {hasBody ? 'Kayıtta geçenler' : 'Başlıktan çıkarılan varlıklar'}
              </h2>
              <div className="flex flex-wrap gap-2">
                {record.entities.map((entity) => (
                  <EntityChip key={entity.id} {...entity} />
                ))}
              </div>
            </section>
          ) : null}

          {record.corrections.length ? (
            <RelatedBlock title="Bu kaydın düzeltmeleri" records={record.corrections} />
          ) : null}

          {record.related.length ? (
            <RelatedBlock title="Bağlantılı kayıtlar" records={record.related} />
          ) : null}

          {record.sameIssue.length ? (
            <RelatedBlock
              title={'Sayı ' + record.issue.number + ' içindeki diğer kayıtlar'}
              records={record.sameIssue}
              moreHref={'/sayilar/' + record.issue.year + '/' + record.issue.number}
            />
          ) : null}

          {/* Reklam yalnızca içerik bittikten sonra (spec 14.4). */}
          <AdSlot kind="in-article" slotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE} className="mt-8" />
        </div>

        <aside className="flex flex-col gap-[18px]">
          <FollowCard
            title="Bu kaydı takip et"
            description={
              institution
                ? institution.name + ' ile ilgili yeni bir kayıt yayımlanırsa haber veririz.'
                : 'Bu konuda yeni bir kayıt yayımlanırsa haber veririz.'
            }
            subject={{
              label: primaryTopic?.name ?? 'Bu kayıt',
              topic: primaryTopic?.slug,
              entityId: institution?.id,
            }}
            rssHref={primaryTopic ? '/konu/' + primaryTopic.slug + '/rss.xml' : '/rss.xml'}
            showFrequency={false}
          />
          <SourceNotice />
        </aside>
      </div>
    </article>
  );
}

function Divider() {
  return <span aria-hidden className="inline-block h-[11px] w-px bg-line" />;
}

/**
 * Gövde metni çıkarılamamış kayıt — artboard 1g.
 *
 * Tasarımın kararı: özür dilemek yerine ne olduğunu söylemek ve kaydın
 * geçerliliğini vurgulamak. Künye doğru, gazete yeri doğru; eksik olan yalnızca
 * gövde. Yeniden deneme sözü de veriliyor ve bunun kodda karşılığı var
 * (spec 7.2 yeniden deneme kuyruğu).
 */
function MissingTextCard({ record }: { record: RecordDetailType }) {
  const page = record.pageFrom ? ', sayfa ' + record.pageFrom : '';

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="px-6 pb-6 pt-[22px]">
        <h2 className="text-3xl font-semibold text-ink">
          Bu kaydın metni gazetede taranmış görüntü
        </h2>
        <p className="mt-2 max-w-[36em] text-lg leading-[1.6] text-ink-body">
          Sayfayı okunabilir metne çeviremedik, o yüzden burada gövde yok. Kaydın kendisi eksik
          değil: künye ve gazete yeri doğru, metnin tamamı resmî PDF&apos;in
          {record.pageFrom ? ' ' + record.pageFrom + '. sayfasında' : ' içinde'}.
        </p>
        <div className="mt-[18px] flex flex-wrap gap-2.5">
          <a
            href={record.issue.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-accent px-5 py-3 text-lg font-semibold text-accent-ink no-underline transition-colors hover:bg-accent-hover hover:no-underline"
          >
            PDF&apos;i aç{page}
          </a>
          <Link
            href={'/sayilar/' + record.issue.year + '/' + record.issue.number}
            className="rounded border border-line-strong px-[18px] py-3 text-lg font-semibold text-ink no-underline transition-colors hover:border-ink hover:no-underline"
          >
            Sayı {record.issue.number}&apos;in tamamı
          </Link>
        </div>
      </div>
      <p className="border-t border-line bg-surface-muted px-6 py-3.5 text-base leading-[1.55] text-ink-muted">
        Metni okuma denemesini yeniden kuyruğa aldık. Çıkarılabilirse bu sayfaya eklenir,
        takipçilere ayrıca bildirim gitmez.
      </p>
    </div>
  );
}

function PersonalDataNotice({ pdfUrl }: { pdfUrl: string }) {
  return (
    <div className="rounded-md border border-notice-border bg-notice px-5 py-4 text-base leading-[1.6] text-notice-ink">
      <p className="m-0 font-semibold">Bu kayıtta kişi adları var.</p>
      <p className="m-0 mt-1.5">
        Listeyi burada yayımlamıyoruz. Tam liste için{' '}
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
          orijinal PDF&apos;e bakınız
        </a>
        .
      </p>
    </div>
  );
}

function RelatedBlock({
  title,
  records,
  moreHref,
}: {
  title: string;
  records: RecordDetailType['related'];
  moreHref?: string;
}) {
  return (
    <section className="mt-8">
      <div className="mb-3.5 flex items-baseline justify-between gap-4">
        <h2 className="text-md font-semibold text-ink">{title}</h2>
        {moreHref ? (
          <Link href={moreHref} className="text-base">
            Tümü
          </Link>
        ) : null}
      </div>
      <div className="flex flex-col">
        {records.map((item) => (
          <Link
            key={item.id}
            href={recordHref(item)}
            className="flex flex-col gap-[5px] border-t border-line py-3.5 no-underline transition-colors hover:bg-surface-hover hover:no-underline"
          >
            <span className="text-lg font-medium leading-[1.4] text-ink">
              {item.summary ?? <MaskedText tokens={item.titleTokens} />}
            </span>
            <span className="text-sm text-ink-muted">
              {formatDateShort(item.publishedAt)}, Sayı {item.issueNumber},{' '}
              {item.docTypeLabel}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Gövde metnini paragraflara böler. PDF dökümünde satır sonları sözcük ortasında
 * olabiliyor, o yüzden tek satır sonu boşluğa çevriliyor; paragraf ayracı olarak
 * yalnızca boş satır sayılıyor.
 */
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}
