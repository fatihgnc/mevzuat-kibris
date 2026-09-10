'use client';

import { useState } from 'react';
import { z } from 'zod';

import {
  DateField,
  Fieldset,
  ResultPanel,
  ResultRow,
  ResultsRegion,
  StaleNotice,
  ToolForm,
  useCalculator,
} from '@/components/tool-page/fields';
import { formatDate } from '@/lib/tools/duration';
import {
  EXCUSE_LEAVE,
  MANDATORY_WEEKS_AFTER,
  MANDATORY_WEEKS_BEFORE,
  maternityTimeline,
  NURSING_HOURS_PER_DAY,
  NURSING_MONTHS,
  UNPAID_WEEKS_AFTER,
  UNPAID_WEEKS_BEFORE,
} from '@/lib/tools/parental-leave';
import { requiredDate } from '@/lib/tools/validation';

const schema = z.object({
  birthDate: requiredDate('Doğum tarihini girin.'),
});

export function ParentalLeaveForm() {
  const [birthDate, setBirthDate] = useState('');

  const {
    errors,
    result: timeline,
    stale,
    onSubmit,
    resultRef,
  } = useCalculator({
    values: { birthDate },
    schema,
    calculate: (input) => maternityTimeline(input.birthDate),
  });

  return (
    <>
      <ToolForm onSubmit={onSubmit}>
        <Fieldset legend="Doğum izni (madde 56)">
          <DateField
            label="Beklenen veya gerçekleşen doğum tarihi"
            hint="Süreler bu tarihten itibaren takvim üzerinden sayılır."
            error={errors.birthDate}
            value={birthDate}
            onChange={setBirthDate}
            wide
          />
        </Fieldset>
      </ToolForm>

      <ResultsRegion ref={resultRef}>
        <StaleNotice show={stale} />

        {timeline ? (
          <ResultPanel
            title="Doğum izni takvimi"
            note="Madde 56(1)(B) son cümlesi: bu süreler, işçinin sağlık durumuna ve işin özelliğine göre Sağlık Kurulu raporuyla belgelenmek koşuluyla artırılabilir."
          >
            <ResultRow
              label="Çalıştırma yasağının başlangıcı"
              value={formatDate(timeline.mandatoryStart)}
              hint={`Doğumdan ${MANDATORY_WEEKS_BEFORE} hafta önce (madde 56(1)(A)).`}
            />
            <ResultRow
              label="Çalıştırma yasağının son günü"
              value={formatDate(timeline.mandatoryEnd)}
              hint={`Doğumdan sonra ${MANDATORY_WEEKS_AFTER} hafta. Toplam ${
                MANDATORY_WEEKS_BEFORE + MANDATORY_WEEKS_AFTER
              } hafta çalıştırma yasağı.`}
            />
            <ResultRow
              label="İsteğe bağlı ödeneksiz izin — en erken başlangıç"
              value={formatDate(timeline.unpaidStart)}
              hint={`Madde 56(1)(B): doğum öncesi ${UNPAID_WEEKS_BEFORE} hafta ödeneksiz izin hakkı.`}
            />
            <ResultRow
              label="İsteğe bağlı ödeneksiz izin de kullanılırsa son gün"
              value={formatDate(timeline.unpaidEnd)}
              hint={`Doğum sonrası ${UNPAID_WEEKS_AFTER} hafta daha. Süre sonunda işçi aynı iş ve görevine döner.`}
            />
            <ResultRow
              label="Emzirme izninin son günü"
              value={formatDate(timeline.nursingEnd)}
              hint={`Madde 56(2): doğumdan itibaren ${NURSING_MONTHS} ay boyunca günde ${NURSING_HOURS_PER_DAY} saat (biri sabah, biri öğleden sonra), ücret kesintisi yapılmadan.`}
              emphasis
            />
          </ResultPanel>
        ) : null}
      </ResultsRegion>

      <section
        aria-labelledby="mazeret-izinleri"
        className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-6"
      >
        <h2 id="mazeret-izinleri" className="m-0 text-3xl font-semibold tracking-tighter text-ink">
          Ödenekli mazeret izinleri
        </h2>
        <p className="mt-2 text-base leading-[1.6] text-ink-body">
          Madde 53 bu süreleri asgari sayıyor; hizmet akitleri veya toplu iş sözleşmeleriyle
          artırılabilir. Madde 45(8) uyarınca bu günler yıllık izin hakkının hesabında çalışılmış
          süre sayılır.
        </p>

        <dl className="mt-4 flex flex-col">
          {EXCUSE_LEAVE.map((entry) => (
            <div
              key={entry.event}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line-soft py-3 last:border-b-0"
            >
              <dt className="text-base text-ink-body">
                {entry.event}
                {entry.note ? (
                  <span className="mt-0.5 block text-sm text-ink-muted">{entry.note}</span>
                ) : null}
              </dt>
              <dd className="m-0 text-md font-medium tabular-nums text-ink">
                {entry.days} gün ödenekli
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
