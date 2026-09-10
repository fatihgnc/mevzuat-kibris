'use client';

import { useState } from 'react';
import { z } from 'zod';

import {
  CheckboxField,
  DateField,
  Fieldset,
  NumberField,
  ResultPanel,
  ResultRow,
  ResultsRegion,
  StaleNotice,
  ToolForm,
  ToolNotice,
  useCalculator,
} from '@/components/tool-page/fields';
import { formatCurrency, formatPercent } from '@/lib/tools/format';
import { daysBetween, formatDuration, toDateInputValue } from '@/lib/tools/duration';
import {
  calculateSeverance,
  COLLECTIVE_MIN_HEADCOUNT,
  COLLECTIVE_MIN_SHARE,
} from '@/lib/tools/severance';
import { optionalCount, requiredAmount, requiredDate } from '@/lib/tools/validation';

const schema = z
  .object({
    startDate: requiredDate('İşe giriş tarihini girin.'),
    endDate: requiredDate('İşten çıkış tarihini girin.'),
    wage: requiredAmount('Aylık brüt ücreti girin.'),
    headcount: optionalCount('kişi sayısı'),
    dismissedCount: optionalCount('kişi sayısı'),
    seasonal: z.boolean(),
  })
  .refine((data) => daysBetween(data.startDate, data.endDate) >= 0, {
    message: 'Çıkış tarihi işe giriş tarihinden önce olamaz.',
    path: ['endDate'],
  })
  .refine(
    (data) =>
      data.headcount === null || data.dismissedCount === null || data.dismissedCount <= data.headcount,
    {
      message: 'Çıkarılan sayısı toplam çalışan sayısından fazla olamaz.',
      path: ['dismissedCount'],
    },
  );

export function SeveranceForm() {
  const today = toDateInputValue(new Date());

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(today);
  const [wage, setWage] = useState('');
  const [headcount, setHeadcount] = useState('');
  const [dismissedCount, setDismissedCount] = useState('');
  const [seasonal, setSeasonal] = useState(false);

  const { errors, result, stale, onSubmit, resultRef } = useCalculator({
    values: { startDate, endDate, wage, headcount, dismissedCount, seasonal },
    schema,
    calculate: (input) =>
      calculateSeverance({
        startDate: input.startDate,
        endDate: input.endDate,
        grossMonthlyWage: input.wage,
        seasonal: input.seasonal,
        headcount: input.headcount,
        dismissedCount: input.dismissedCount,
      }),
  });

  return (
    <>
      <ToolForm onSubmit={onSubmit}>
        <Fieldset legend="Hizmet ve ücret">
          <DateField
            label="İşe giriş tarihi"
            error={errors.startDate}
            value={startDate}
            onChange={setStartDate}
            max={endDate || today}
          />
          <DateField
            label="İşten çıkış tarihi"
            error={errors.endDate}
            value={endDate}
            onChange={setEndDate}
          />
          <NumberField
            label="Aylık brüt ücret"
            hint="Haftalık ücret, madde 27(3)(D) çevrimiyle bulunur: aylık × 12 ÷ 52."
            error={errors.wage}
            value={wage}
            onChange={setWage}
            suffix="TL"
            wide
          />
        </Fieldset>

        <Fieldset legend="Madde 19(1) eşiği (isteğe bağlı)">
          <NumberField
            label="İşyerindeki toplam çalışan"
            error={errors.headcount}
            value={headcount}
            onChange={setHeadcount}
            suffix="kişi"
          />
          <NumberField
            label="İşten çıkarılan"
            hint={`Madde 19 ancak en az ${COLLECTIVE_MIN_HEADCOUNT} kişi VE çalışanların en az %${COLLECTIVE_MIN_SHARE * 100}'si birlikte çıkarıldığında uygulanır.`}
            error={errors.dismissedCount}
            value={dismissedCount}
            onChange={setDismissedCount}
            suffix="kişi"
          />
          <CheckboxField
            label="Niteliği gereği altı aydan az süren mevsimlik veya kampanya işi"
            hint="Madde 19(4): bu işlerde madde 19 kuralları uygulanmaz. İhbar süresi (madde 12) yine de doğar."
            checked={seasonal}
            onChange={setSeasonal}
            wide
          />
        </Fieldset>
      </ToolForm>

      <ResultsRegion ref={resultRef}>
        <StaleNotice show={stale} />

        {result ? (
          <>
            {result.thresholdMet === false ? (
              <ToolNotice tone="notice">
                Girilen sayılar madde 19(1) eşiğini karşılamıyor
                {result.dismissedShare !== null
                  ? ` (çıkarılan oran ${formatPercent(result.dismissedShare * 100)})`
                  : ''}
                . Bu durumda toplu işten çıkarma tazminatı doğmaz; aşağıdaki madde 12 ihbar süresi
                bireysel fesihte de geçerlidir.
              </ToolNotice>
            ) : null}

            {result.seasonalExempt ? (
              <ToolNotice tone="notice">
                Madde 19(4) uyarınca, niteliği gereği altı aydan az süren mevsimlik ve kampanya
                işlerinde madde 19 kuralları uygulanmaz.
              </ToolNotice>
            ) : null}

            <ResultPanel
              title="Sonuç"
              note="Madde 50: fesihte kullanılmayan yıllık iznin ücreti bu iki kalemden ayrı olarak ödenir; ihbar süreleriyle yıllık izin süreleri iç içe giremez."
            >
              <ResultRow label="Hizmet süresi" value={formatDuration(result.duration)} />
              <ResultRow label="Haftalık ücret" value={formatCurrency(result.weeklyWage)} />
              <ResultRow
                label="Toplu işten çıkarma tazminatı"
                value={formatCurrency(result.severance.amount)}
                hint={
                  result.severance.tier
                    ? `Madde 19(2)(${result.severance.tier.clause}) — ${result.severance.tier.label}, ${result.severance.weeks} haftalık ücret`
                    : 'Hizmet süresi üç ayı doldurmadığı için madde 19(2) tazminatı doğmuyor.'
                }
              />
              <ResultRow
                label="İhbar süresi karşılığı"
                value={formatCurrency(result.notice.amount)}
                hint={`Madde 12(1)(A)(${result.notice.tier.clause}) — ${result.notice.weeks} hafta. Bildirim usulüne uygun yapıldıysa işçi bu süre boyunca çalışıp ücretini alır; yapılmadıysa madde 12(1)(C) uyarınca bu tutar tazminat olarak ödenir.`}
              />
              <ResultRow
                label="Toplam (bildirim hiç yapılmadıysa)"
                value={formatCurrency(result.total)}
                emphasis
              />
            </ResultPanel>
          </>
        ) : null}
      </ResultsRegion>
    </>
  );
}
