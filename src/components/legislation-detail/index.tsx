import { Info, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

import { InBodySearch } from '@/components/in-body-search';
import { KIND_META, SOURCE_META, lawRef, type LegislationSource } from '@/lib/legislation/labels';
import { lawTextBlocks } from '@/lib/text/law-text';
import { formatDateLong } from '@/lib/text/dates';
import type { LegislationDetail } from '@/types/legislation';

/** Shared between the search bar's `targetId` and the body element's own `id`. */
const BODY_ELEMENT_ID = 'law-body-text';

/**
 * A law's page: what it is, where the text came from and how old that copy is,
 * then the text itself.
 *
 * THE DATE IS THE FILE'S, AND THE PAGE SAYS SO. It is the Last-Modified of the
 * file the text was read from — when the source uploaded it, not when the law was
 * last amended. The two can be years apart in either direction, so the wording
 * never calls it "yürürlük" or "son değişiklik".
 */
export function LegislationView({ law }: { law: LegislationDetail }) {
  const ref = lawRef(law.lawKey);
  const source = law.bodySource;
  const sourceUrl = source === 'official' ? law.officialUrl : law.portalUrl;

  // The copy that was NOT chosen, offered as a second link when it exists.
  const otherSource: LegislationSource | null =
    source === 'official' && law.portalUrl ? 'portal' : source === 'portal' && law.officialUrl ? 'official' : null;
  const otherUrl = otherSource === 'official' ? law.officialUrl : law.portalUrl;
  const otherDate = otherSource === 'official' ? law.officialModifiedAt : law.portalModifiedAt;

  const blocks = law.bodyText ? lawTextBlocks(law.bodyText) : [];

  return (
    <article>
      <div className="mb-[18px] flex flex-wrap items-center gap-2.5 text-sm text-ink-muted">
        <Link
          href={KIND_META[law.kind].path}
          className="font-semibold text-ink-body no-underline hover:text-accent hover:no-underline"
        >
          {KIND_META[law.kind].singular}
        </Link>
        {ref ? (
          <>
            <Divider />
            <span>{ref}</span>
          </>
        ) : null}
      </div>

      <h1 className="mt-3 max-w-title text-4xl font-semibold leading-[1.28] tracking-tightest text-ink sm:text-6xl">
        {law.title}
      </h1>

      {/*
        * AN INFO BANNER, NOT ANOTHER CARD. The text below sits in a grey card in the
        * page's own type; this notice used to be the same grey card at the same size,
        * so it read as the first paragraph of the law. It now carries the `info` colours
        * (blue, defined for the dark theme as well), an icon and a heading, and is set
        * smaller than the text it introduces. Not the yellow `notice` set: that one is a
        * caution, and this only explains where the text came from.
        */}
      <aside
        role="note"
        aria-label="Kaynak ve güncellik bilgisi"
        className="mt-7 flex gap-3 rounded-md border border-info-border bg-info px-4 py-3.5 text-sm leading-[1.6] text-info-ink"
      >
        <Info aria-hidden className="mt-[3px] h-4 w-4 shrink-0" />

        <div className="min-w-0">
          <p className="m-0 font-semibold">Kaynak ve güncellik bilgisi</p>

          {source && law.bodyModifiedAt ? (
            <p className="m-0 mt-1.5">
              Bu metin <strong className="font-semibold">{SOURCE_META[source].name}</strong>{' '}
              ({SOURCE_META[source].host}) tarafından yayımlanan dosyadan alınmıştır. Dosyanın
              kaynaktaki tarihi: <strong className="font-semibold">{formatDateLong(law.bodyModifiedAt)}</strong>.
            </p>
          ) : null}

          <p className="m-0 mt-1.5">
            Bu tarih dosyanın yüklendiği gündür, {KIND_META[law.kind].genitive} son değiştiği gün
            olmayabilir. Metin otomatik olarak çıkarılmıştır ve resmî metin yerine geçmez; bir
            işlemde kullanmadan önce kaynak dosyaya ve Resmî Gazete&apos;deki{' '}
            {KIND_META[law.kind].amendmentsDative} bakın.
          </p>

          {law.transcribed ? (
            <p className="m-0 mt-2.5 flex gap-2 border-t border-info-border pt-2.5 font-semibold">
              <TriangleAlert aria-hidden className="mt-[3px] h-4 w-4 shrink-0" />
              <span>
                Kaynak dosya taranmış sayfa görüntülerinden oluşuyor; bu metin görüntülere bakılarak
                elle yazıya geçirilmiştir ve yazım hatası içerebilir. Kesin metin için kaynak
                dosyaya bakın.
              </span>
            </p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 font-medium">
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                Kaynak dosyayı aç
              </a>
            ) : null}
            {otherUrl && otherSource ? (
              <a href={otherUrl} target="_blank" rel="noopener noreferrer">
                {SOURCE_META[otherSource].host} kopyası{otherDate ? ' (' + formatDateLong(otherDate) + ')' : ''}
              </a>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {KIND_META[law.kind].singular} metni
          </h2>
          {blocks.length ? <InBodySearch targetId={BODY_ELEMENT_ID} /> : null}
        </div>

        {blocks.length ? (
          <div
            id={BODY_ELEMENT_ID}
            className="w-full rounded-md border border-line bg-surface-muted px-6 py-6 text-xl leading-[1.72] text-ink-body shadow-sm sm:px-10 sm:py-8"
          >
            {blocks.map((block, index) =>
              block.kind === 'heading' ? (
                <h3
                  key={index}
                  className="mb-2 mt-8 text-lg font-semibold leading-snug text-ink first:mt-0"
                >
                  {block.text}
                </h3>
              ) : (
                <p key={index} className="m-0 mt-[14px] first:mt-0">
                  {block.text}
                </p>
              ),
            )}
          </div>
        ) : (
          <div className="rounded-md border border-line px-6 py-6 text-lg text-ink-body">
            Bu metin henüz okunabilir biçimde çıkarılamadı.
            {sourceUrl ? (
              <>
                {' '}
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                  Kaynak dosyayı açın.
                </a>
              </>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

function Divider() {
  return <span aria-hidden className="inline-block h-[11px] w-px bg-line" />;
}
