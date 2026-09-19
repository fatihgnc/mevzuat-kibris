import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { AdSlot } from '@/components/ad-slot';
import { EntityChip } from '@/components/entity-chip';
import { InBodySearch } from '@/components/in-body-search';
import { MaskedText } from '@/components/masked-text';
// Takip akışı test edilmedi ve şu an sağlıklı çalışmıyor -- görünürden
// kaldırıldı, kod silinmedi. Geri eklerken bu satırı ve aşağıdaki <FollowDialog> bloğunu aç.
// import { FollowDialog } from '@/components/follow-dialog';
import { RecordMetaBar, buildRecordMetaFields } from '@/components/record-meta-bar';
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- geçici olarak kullanılmıyor, bkz. BodyTemporarilyUnavailableNotice
import { OcrNotice } from '@/components/source-notice';
import { docTypeLabel, formatRef, refAliases } from '@/lib/constants/doc-types';
import { TOPICS } from '@/lib/constants/topics';
import { recordHref } from '@/lib/db/queries/shared';
import { formatDateLong, formatDateShort, isDeadlinePassed } from '@/lib/text/dates';
import { cn } from '@/lib/utils';
import type { RecordDetail as RecordDetailType } from '@/types/record';

/**
 * The record page body — artboards 1a (text present) and 1g (text missing).
 *
 * Both artboards share a skeleton: meta line, raw title box, meta bar, actions,
 * then two columns. Only the body block differs. Hence one component, two branches.
 */
export function RecordDetail({ record }: { record: RecordDetailType }) {
  const primaryTopic = record.topics[0] ? TOPICS[record.topics[0]] : null;
  const institution = record.entities.find((entity) => entity.kind === 'institution') ?? null;
  const refLabel = formatRef(record.refType, record.refNumber);
  const aliases = refAliases(record.refType, record.refNumber);
  const heading = record.summary ?? record.title;
  const hasBody = Boolean(record.bodyText && record.bodyText.trim().length > 0);

  return (
    <article>
      {/* The meta line — topic · document type · date */}
      <div className="mb-[18px] flex flex-wrap items-center gap-2.5 text-sm text-ink-muted">
        {primaryTopic ? (
          <Link
            href={'/konu/' + primaryTopic.slug}
            className="inline-flex items-center gap-[7px] font-semibold text-ink-body no-underline hover:text-accent hover:no-underline"
          >
            {primaryTopic.name}
          </Link>
        ) : null}
        <Divider />
        <span>{docTypeLabel(record.docType)}</span>
        <Divider />
        <time dateTime={record.publishedAt}>{formatDateLong(record.publishedAt)}</time>
        <Divider />
        <Link href={'/sayilar/' + record.issue.year + '/' + record.issue.number}>
          Sayı {record.issue.number}
        </Link>
      </div>

      {/*
        * Takip akışı test edilmedi ve şu an sağlıklı çalışmıyor -- görünürden
        * kaldırıldı, kod silinmedi. Geri eklerken bu bloğu aç.
        *
        * "Takip et" sits above the title rather than beside or below it — the
        * title is the first thing to read, not something to click past.
        *
        * <div className="flex flex-wrap gap-2.5">
        *   <FollowDialog
        *     label="Bu kaydı takip et"
        *     className="px-1 py-2.5 text-md"
        *     title="Bu kaydı takip et"
        *     description={
        *       institution
        *         ? institution.name + ' ile ilgili yeni bir kayıt yayımlanırsa haber veririz.'
        *         : 'Bu konuda yeni bir kayıt yayımlanırsa haber veririz.'
        *     }
        *     subject={{
        *       label: primaryTopic?.name ?? 'Bu kayıt',
        *       topic: primaryTopic?.slug,
        *       entityId: institution?.id,
        *     }}
        *     showFrequency={false}
        *     rssHref={primaryTopic ? '/konu/' + primaryTopic.slug + '/rss.xml' : '/rss.xml'}
        *   />
        * </div>
        */}

      <h1 className="mt-3 max-w-title text-4xl font-semibold leading-[1.28] tracking-tightest text-ink sm:text-6xl">
        {heading}
      </h1>

      <RecordMetaBar
        className="mt-7"
        fields={buildRecordMetaFields({
          refLabel,
          publishedAt: record.publishedAt,
          issueYear: record.issue.year,
          issueNumber: record.issue.number,
          section: record.section,
          institution,
          primaryTopic: primaryTopic
            ? { slug: primaryTopic.slug, name: primaryTopic.name }
            : null,
          pdfUrl: record.issue.pdfUrl,
          pageFrom: record.pageFrom,
        })}
      />

      {/*
        * The same reference number, spelled the way it gets typed.
        *
        * The meta bar above already shows "A.E. 21196"; nobody searching for it
        * writes the dots, and Search Console shows the query arriving as one
        * unbroken token. Without this line the page does not contain the string
        * the visitor typed, so the result reads as the wrong record and goes
        * unclicked at a rank that was already good enough.
        *
        * IT IS VISIBLE, DELIBERATELY. A hidden block of spelling variants is
        * exactly what a search engine treats as keyword stuffing, and the line
        * earns its place for a reader too: it confirms, in the words they used,
        * that this is the record they came for. Rendered only when refAliases
        * finds a prefix worth respelling, so ordinary "Karar 123" references get
        * no line at all.
        */}
      {aliases.length ? (
        <p className="mt-4 text-xs text-ink-faint">
          Arama karşılıkları: {aliases.join(', ')}
        </p>
      ) : null}

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

      {/*
       * The meta bar above already ends in its own hairline (`border-y` on
       * RecordMetaBar). With no aliases line and no deadline banner between
       * them, this section's own top border landed 16px under that one —
       * two hairlines reading as one doubled, purposeless line. Only draw
       * this one when there is content between the two to actually separate.
       */}
      <div className={cn('mt-4 pt-[26px]', (aliases.length > 0 || record.deadlineAt) && 'border-t border-line')}>
        <div className="min-w-0">
          {/*
           * A LABEL, so the document has a visible start. Everything above this
           * point is metadata about the record; nothing said "the actual text
           * starts here" — the body just ran on from the meta bar in the same
           * weight, same measure, same everything, so it read as more chrome
           * rather than as the gazette's own words.
           */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Karar metni
            </h2>
            {record.bodyMarkdown ? <InBodySearch targetId={BODY_ELEMENT_ID} /> : null}
          </div>

          {/*
           * GEÇİCİ: gövde varsa (body_markdown) düz gösterilir, yoksa tek mesaj
           * basılır. hasBody/OCR dallanması ve BodyText/BodyHiddenCard/
           * MissingTextCard fonksiyonları kasıtlı olarak SİLİNMEDİ — sorun
           * çözülünce bu blok eski dallanmaya geri döner. Kişisel veri
           * (hasPersonalData) gövdeyi gizlemez.
           */}
          {record.bodyMarkdown ? (
            <BodyMarkdown markdown={record.bodyMarkdown} />
          ) : (
            <BodyTemporarilyUnavailableNotice record={record} />
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
          ) : (
            <section className="mt-[30px] border-t border-line pt-[22px]">
              <h2 className="mb-3.5 text-md font-semibold text-ink">Arşivde gezin</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-base">
                <Link href={'/sayilar/' + record.issue.year + '/' + record.issue.number}>
                  Sayı {record.issue.number}&apos;in tamamı
                </Link>
                <Link href={'/sayilar/' + record.issue.year}>{record.issue.year} sayıları</Link>
                <Link href="/sayilar">Tüm sayılar</Link>
              </div>
            </section>
          )}

          {/* Ads only after the content has ended (spec 14.4). */}
          <AdSlot kind="in-article" slotId={process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE} className="mt-8" />
        </div>

      </div>
    </article>
  );
}

/**
 * Pilot renderer for the DeepSeek-OCR replacement path (migration 0011).
 * Independent of BodyText/BodyHiddenCard/etc. below — those stay untouched
 * for the ~21k records still on the legacy pipeline; this only fires when
 * body_markdown has actually been populated for a record.
 *
 * rehypeRaw + rehypeSanitize (default schema, which allows table/tr/td):
 * DeepSeek-OCR emits raw <table> HTML inside its markdown for dense tables
 * (see table-repair.ts), not GFM pipe syntax, so the raw-HTML pass is
 * required — sanitize afterwards since this HTML comes from a model, not
 * from our own code.
 */
/** Shared between the search box's `targetId` and this element's own `id`. */
const BODY_ELEMENT_ID = 'record-body-text';

function BodyMarkdown({ markdown }: { markdown: string }) {
  return (
    <div
      id={BODY_ELEMENT_ID}
      className={[
        // A card, not a run of plain paragraphs: the border and tint are what
        // say "this is the document" rather than more page around it. Full
        // width (no max-w-prose) — a plain content box, sans font kept as
        // everywhere else on the page.
        'w-full rounded-md border border-line bg-surface-muted px-6 py-6 shadow-sm sm:px-10 sm:py-8',
        'text-xl leading-[1.72] text-ink-body',
        // Paragraphs and lists: unchanged from the pre-styling pass.
        '[&_p]:m-0 [&_p+p]:mt-[18px] [&_p+ol]:mt-[18px] [&_ol+p]:mt-[18px] [&_li+li]:mt-[18px]',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6',
        // Headings: the OCR text carries the gazette's own running header/section
        // titles as markdown headings (e.g. "Bölüm I") — styled as section breaks
        // rather than left at browser-default heading sizes.
        '[&_h1]:mb-3 [&_h1]:mt-10 [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:leading-tight [&_h1]:text-ink',
        '[&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-line [&_h2]:pb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink',
        '[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-ink',
        '[&_strong]:font-semibold [&_strong]:text-ink [&_em]:italic',
        '[&_hr]:my-8 [&_hr]:border-line',
        '[&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-ink-muted',
        // Tables: header row set apart with a tint, zebra body rows so a dense
        // register table (records-per-issue lists, amendment histories) stays
        // readable instead of a wall of identical bordered cells.
        '[&_table]:mt-[18px] [&_table]:w-full [&_table]:border-collapse [&_table]:text-base',
        '[&_th]:border [&_th]:border-line [&_th]:bg-surface [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink',
        '[&_td]:border [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_td]:align-top',
        '[&_tr:nth-child(even)_td]:bg-surface',
      ].join(' ')}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, rehypeSanitize]}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}

function Divider() {
  return <span aria-hidden className="inline-block h-[11px] w-px bg-line" />;
}

/*
 * GEÇİCİ kart — gövde (body_markdown) olmayan kayıtlarda tek bu mesaj basılıyor.
 * Aşağıdaki BodyText/BodyHiddenCard/MissingTextCard ve ilgili yardımcılar
 * kasıtlı olarak duruyor; sorun çözülünce RecordDetail içindeki çağrı eski
 * dallanmaya geri alınacak.
 */
function BodyTemporarilyUnavailableNotice({ record }: { record: RecordDetailType }) {
  const page = record.pageFrom ? ', sayfa ' + record.pageFrom : '';

  // 2025/170 and any future case like it: the source's OWN archive page links to a
  // PDF that 404s on their server (issues.pdf_broken, migration 0014) -- permanent,
  // not something a re-crawl or a better OCR pass ever fixes. The generic "we're
  // working on it" copy below would be actively misleading here.
  if (record.issue.pdfBroken) {
    return (
      <div className="overflow-hidden rounded-md border border-line">
        <div className="px-6 pb-6 pt-[22px]">
          <h2 className="text-3xl font-semibold text-ink">Kararın metnine şu an ulaşılamıyor</h2>
          <p className="mt-2 max-w-[36em] text-lg leading-[1.6] text-ink-body">
            Bu, bizim çıkarma sürecimizden kaynaklanmıyor — kaynağın kendi arşiv sayfası
            bu sayının PDF&apos;ine bozuk bir bağlantı veriyor, bağlantı kaynağın kendi
            sunucusunda erişilemiyor (404). Kaynak bunu düzeltirse biz de otomatik
            olarak yakalayıp güncelleyeceğiz.
          </p>
          <div className="mt-[18px] flex flex-wrap gap-2.5">
            <a
              href={record.issue.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-accent px-5 py-3 text-lg font-semibold text-accent-ink no-underline transition-colors hover:bg-accent-hover hover:text-accent-ink hover:no-underline"
            >
              Kaynaktaki bağlantı{page}
            </a>
            <Link
              href={'/sayilar/' + record.issue.year + '/' + record.issue.number}
              className="rounded border border-line-strong px-[18px] py-3 text-lg font-semibold text-ink no-underline transition-colors hover:border-ink hover:no-underline"
            >
              Sayı {record.issue.number}&apos;in tamamı
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /*
   * Kaynak dosyanın kendi yapısından kaynaklanan, kalıcı bir sınır: bu kaydın
   * gazetedeki/indeksteki basılı bir referans numarası yok, ve gövde çıkarma
   * yöntemi bir kaydı OCR metninde bulmak için önce bilinen bir referans
   * etiketine ihtiyaç duyuyor (bkz. parser.ts bodyAnchor). Etiket yoksa hiçbir
   * OCR motoru veya yeniden deneme bunu çözmez -- "üzerinde çalışıyoruz"
   * demek yanıltıcı olur, bu yüzden kaynağa yönlendiren ayrı bir mesaj var.
   */
  if (!record.refType || !record.refNumber) {
    return (
      <div className="overflow-hidden rounded-md border border-line">
        <div className="px-6 pb-6 pt-[22px]">
          <h2 className="text-3xl font-semibold text-ink">Kararın metni burada gösterilemiyor</h2>
          <p className="mt-2 text-lg leading-[1.6] text-ink-body">
            Bu kaydın kaynak dosyadaki yapısından dolayı içeriği otomatik olarak
            çıkaramıyoruz, bu yüzden sizi doğrudan kaynağa yönlendiriyoruz.
          </p>
          <div className="mt-[18px] flex flex-wrap gap-2.5">
            <a
              href={record.issue.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-accent px-5 py-3 text-lg font-semibold text-accent-ink no-underline transition-colors hover:bg-accent-hover hover:text-accent-ink hover:no-underline"
            >
              Kaynağa git{page}
            </a>
            <Link
              href={'/sayilar/' + record.issue.year + '/' + record.issue.number}
              className="rounded border border-line-strong px-[18px] py-3 text-lg font-semibold text-ink no-underline transition-colors hover:border-ink hover:no-underline"
            >
              Sayı {record.issue.number}&apos;in tamamı
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="px-6 pb-6 pt-[22px]">
        <h2 className="text-3xl font-semibold text-ink">Kararın metni şu an gösterilmiyor</h2>
        <p className="mt-2 max-w-[36em] text-lg leading-[1.6] text-ink-body">
          Şu an gövdeleri düzgün bir şekilde çıkarıp sizlere gösteremiyoruz. Bunun üzerinde
          çalışıyoruz, sorunu halledip tekrar size sunacağız. O zamana kadar orijinal
          PDF&apos;ten okumanızı rica ederiz.
        </p>
        <div className="mt-[18px] flex flex-wrap gap-2.5">
          <a
            href={record.issue.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-accent px-5 py-3 text-lg font-semibold text-accent-ink no-underline transition-colors hover:bg-accent-hover hover:text-accent-ink hover:no-underline"
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
    </div>
  );
}

/**
 * A record whose body text could not be extracted — artboard 1g.
 *
 * The design's decision: state what happened rather than apologise, and emphasise
 * that the record is still valid. The meta line is right, the gazette location is
 * right; only the body is missing. A promise to retry is made too, and it is
 * backed by code (spec 7.2's retry queue).
 */
/** Gövdeyi basar; sınırı aşarsa keser ve kalanı PDF'e yönlendirir. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- geçici olarak kullanılmıyor, bkz. BodyTemporarilyUnavailableNotice
function BodyText({ record }: { record: RecordDetailType }) {
  const paragraphs = splitParagraphs(record.bodyText!);
  const { shown, hiddenParagraphs, hiddenChars } = clampParagraphs(
    paragraphs,
    RENDERED_BODY_LIMIT,
    RENDERED_PARAGRAPH_LIMIT,
  );

  return (
    <>
      <div className="flex max-w-prose flex-col gap-[18px] text-xl leading-[1.72] text-ink-body">
        {shown.map((paragraph, index) => (
          <p key={index} className="m-0">
            {paragraph}
          </p>
        ))}
      </div>
      {hiddenParagraphs > 0 ? (
        <div className="mt-6 rounded border border-notice-border bg-notice px-4 py-3.5 text-notice-ink">
          <p className="m-0 text-base font-semibold leading-[1.5]">
            Bu kaydın metni çok uzun; sayfada bir bölümü gösteriliyor.
          </p>
          <p className="m-0 mt-1.5 max-w-lede text-sm leading-[1.6]">
            Kalan {hiddenParagraphs.toLocaleString('tr')} paragraf (yaklaşık{' '}
            {Math.round(hiddenChars / 1000).toLocaleString('tr')} bin karakter) burada
            basılmıyor. Metnin tamamı resmî PDF&apos;te; arama ise gövdenin tamamı üzerinde
            çalışıyor.
          </p>
          <div className="mt-3">
            <a
              href={record.issue.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-accent px-4 py-2.5 text-base font-semibold text-accent-ink no-underline transition-colors hover:bg-accent-hover hover:text-accent-ink hover:no-underline"
            >
              Tamamı için PDF&apos;i aç
              {record.pageFrom ? ', sayfa ' + record.pageFrom : ''}
            </a>
          </div>
        </div>
      ) : null}
    </>
  );
}

/*
 * Gövde gizliyken gösterilen kart.
 *
 * `MissingTextCard`'dan AYRI olması şart: o kart "metni çıkaramadık" diyor ve
 * metni olan bir kayıtta bu doğru olmaz. Burada olan şey farklı — metin var
 * ama yayımlanacak kalitede değil, ve okuyucuya bunu olduğu gibi söylüyoruz.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- geçici olarak kullanılmıyor, bkz. BodyTemporarilyUnavailableNotice
function BodyHiddenCard({ record }: { record: RecordDetailType }) {
  const page = record.pageFrom ? ', sayfa ' + record.pageFrom : '';

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="px-6 pb-6 pt-[22px]">
        <h2 className="text-3xl font-semibold text-ink">Kararın metni resmî PDF&apos;te</h2>
        <p className="mt-2 max-w-[36em] text-lg leading-[1.6] text-ink-body">
          Gazete sayıları taranmış görüntü olarak yayımlandığı için otomatik okuma yeterince
          temiz sonuç vermiyor. Yanlış okunmuş bir metni doğruymuş gibi göstermektense, kararın
          tamamını kaynağından okumanızı tercih ediyoruz. Metin kalitesi üzerinde çalışıyoruz.
        </p>
        <div className="mt-[18px] flex flex-wrap gap-2.5">
          <a
            href={record.issue.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded bg-accent px-5 py-3 text-lg font-semibold text-accent-ink no-underline transition-colors hover:bg-accent-hover hover:text-accent-ink hover:no-underline"
          >
            Kararı PDF&apos;te oku{page}
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
        Arama yine kararın tam metni üzerinde çalışıyor — aradığınız kelime bu kayıtta geçiyorsa
        sonuçlarda çıkar.
      </p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- geçici olarak kullanılmıyor, bkz. BodyTemporarilyUnavailableNotice
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
            className="rounded bg-accent px-5 py-3 text-lg font-semibold text-accent-ink no-underline transition-colors hover:bg-accent-hover hover:text-accent-ink hover:no-underline"
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
    <section className="mt-[30px] border-t border-line pt-[22px]">
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
 * Splits the body text into paragraphs. In the PDF dump line breaks can fall
 * mid-word, so a single line break becomes a space; only a blank line counts as a
 * paragraph separator.
 */
/*
 * SAYFADA BASILAN METNİN ÜST SINIRI — depolamanın değil, render'ın sınırı.
 *
 * Vercel bir ISR sayfasını 19,07 MB'da kesiyor (FALLBACK_BODY_TOO_LARGE) ve
 * production deploy'u bu yüzden kırmızıya döndü. Sebep: 20 KB gövde tavanı
 * kalkınca tam metinler `body_text`'e girdi ve iki kayıt sayfayı patlattı —
 * 5.199.857 karakter (59,55 MB HTML) ve 2.454.861 karakter (37,52 MB).
 *
 * Karakter başına ~11,5 bayta çıkmasının sebebi metnin sayfada İKİ kez
 * bulunması: bir kez HTML, bir kez de RSC flight payload'ı olarak.
 *
 * `next build` bu limiti uygulamıyor, Vercel'in "Deploying outputs" adımı
 * uyguluyor — yani yerel build yeşil görünürken çıktı bozuk olabiliyor.
 *
 * EŞİK ÖLÇÜMLE SEÇİLDİ. 17.795 gövdeli kayıtta p50 1.098, p90 7.592,
 * p99 52.837 karakter. 100.000'lik sınır p99'un üstünde: 75 kaydı (%0,4)
 * etkiliyor, en ağır sayfayı ~1,1 MB'a indiriyor ve 19 MB'a 17 kat pay
 * bırakıyor. 100.000 karakter zaten ~50 sayfa metin.
 *
 * DEPOLAMAYA DOKUNULMUYOR. `body_text` tam kalıyor, arama tam metin üzerinde
 * çalışmaya devam ediyor; kısıtlanan yalnızca sayfanın bastığı miktar. Bu,
 * truncate.ts'teki "depolamayı değil indeksi sınırla" notuyla çelişmiyor.
 */
/*
 * GÖVDE METNİ ŞİMDİLİK SAYFADA GÖSTERİLMİYOR — ürün sahibinin kararı.
 *
 * Gerekçe: çıkarılan metnin tipografik kalitesi yayımlanacak seviyede değil.
 * Ölçüm (17.831 gövdeli kayıt): %2,0'si harf harf parçalanmış, %0,5'i düşük
 * kaliteli, %62,9'unun kuyruğunda sonraki kaydın başlığı duruyor. Kuyruk
 * temizliği bunu %97,4'e çıkarıyor ama harf düzeyindeki bozulmalar
 * (ÜRETiM, TADİL ED İLME S İ, sayl) kalıyor ve bunların çözümü yeniden OCR.
 *
 * Bu bir RENDER kararı, veri kararı değil:
 *   - `body_text` veritabanında olduğu gibi duruyor
 *   - arama gövdenin tamamı üzerinde çalışmaya devam ediyor
 *   - geri almak bu sabiti `true` yapmaktan ibaret
 *
 * Metin kalitesi yayımlanabilir seviyeye geldiğinde `true` yapılacak.
 */
export const SHOW_RECORD_BODIES = false;

export const RENDERED_BODY_LIMIT = 100_000;

/*
 * PARAGRAF SAYISI DA SINIRLI — ve asıl şişiren buymuş.
 *
 * Karakter sınırı tek başına yetmedi: 2024/886'nın sayfası 100.000 karakterle
 * bile 2,93 MB kaldı. Dosyanın içine bakınca sebep çıktı — o 100.000 karakter
 * 27.052 PARAGRAFA bölünmüş (paragraf başına 3,7 karakter; metin satır satır
 * parçalanmış bir bozulma). Her paragraf hem HTML'de hem RSC payload'ında ayrı
 * bir eleman ve eleman başına ~89 bayt maliyet metnin kendisini gölgede
 * bırakıyor: sayfanın %78'i script bloğuydu.
 *
 * Ölçüm (17.832 kayıt): p50 9 paragraf, p90 107, p99 925, p99.9 14.671,
 * max 511.559. 1.000'lik sınır p99'un hemen üstünde ve kayıtların %1,2'sine
 * dokunuyor.
 */
export const RENDERED_PARAGRAPH_LIMIT = 1_000;

/** Sınırı aşan gövdeyi paragraf sınırında keser. */
function clampParagraphs(paragraphs: string[], limit: number, maxParagraphs: number): {
  shown: string[];
  hiddenParagraphs: number;
  hiddenChars: number;
} {
  let used = 0;
  const shown: string[] = [];
  let kesilenIlk = 0;
  for (const p of paragraphs) {
    if (used >= limit || shown.length >= maxParagraphs) break;
    if (used + p.length <= limit) {
      shown.push(p);
      used += p.length;
      continue;
    }
    /*
     * TEK PARAGRAF SINIRDAN BÜYÜK OLABİLİR. İlk sürüm paragrafı bölünmez
     * kabul ediyordu ve "ilk paragrafı her hâlükârda bas" davranışı yüzünden
     * 255 bin karakterlik tek bir paragraf olduğu gibi basılıyordu — sayfa
     * 2,93 MB. Sınır o zaman garanti değil, tesadüf oluyor. Kelime sınırında
     * bölüp bitiriyoruz.
     */
    const kalan = limit - used;
    const parca = p.slice(0, kalan);
    const bosluk = parca.lastIndexOf(' ');
    shown.push(bosluk > kalan * 0.5 ? parca.slice(0, bosluk) : parca);
    kesilenIlk = p.length - shown[shown.length - 1]!.length;
    used = limit;
    break;
  }
  const hidden = paragraphs.slice(shown.length);
  return {
    shown,
    hiddenParagraphs: hidden.length + (kesilenIlk > 0 ? 1 : 0),
    hiddenChars: hidden.reduce((a, p) => a + p.length, 0) + kesilenIlk,
  };
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}
