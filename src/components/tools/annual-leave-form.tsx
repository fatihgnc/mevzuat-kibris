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
import {
  calculateAnnualLeave,
  MAX_CARRY_OVER_DAYS,
  MIN_DAYS_USED_IN_YEAR,
} from '@/lib/tools/annual-leave';
import { formatDays, formatNumber } from '@/lib/tools/format';
import { daysBetween, formatDuration, toDateInputValue } from '@/lib/tools/duration';
import { optionalAmount, optionalDate, requiredDate } from '@/lib/tools/validation';

const schema = z
  .object({
    startDate: requiredDate('İşe giriş tarihini girin.'),
    asOf: requiredDate('Hesabın yapılacağı tarihi girin.'),
    birthDate: optionalDate(),
    usedDays: optionalAmount('gün sayısı'),
    seasonal: z.boolean(),
  })
  .refine((data) => daysBetween(data.startDate, data.asOf) >= 0, {
    message: 'Bu tarih işe giriş tarihinden önce olamaz.',
    path: ['asOf'],
  });

export function AnnualLeaveForm() {
  const today = toDateInputValue(new Date());

  const [startDate, setStartDate] = useState('');
  const [asOf, setAsOf] = useState(today);
  const [birthDate, setBirthDate] = useState('');
  const [usedDays, setUsedDays] = useState('');
  const [seasonal, setSeasonal] = useState(false);

  const { errors, result, stale, onSubmit, resultRef } = useCalculator({
    values: { startDate, asOf, birthDate, usedDays, seasonal },
    schema,
    calculate: (input) =>
      calculateAnnualLeave({
        startDate: input.startDate,
        asOf: input.asOf,
        birthDate: input.birthDate,
        usedDays: input.usedDays ?? 0,
        seasonal: input.seasonal,
      }),
  });

  return (
    <>
      <ToolForm onSubmit={onSubmit}>
        <Fieldset legend="Hizmet süresi">
          <DateField
            label="İşe giriş tarihi"
            error={errors.startDate}
            value={startDate}
            onChange={setStartDate}
            max={asOf || today}
          />
          <DateField
            label="İzin hakkı hangi tarihe göre hesaplansın"
            hint="Varsayılan bugün. İşten çıkış tarihini girerseniz madde 50 uyarınca ödenecek izin ücretine esas hakkı görürsünüz."
            error={errors.asOf}
            value={asOf}
            onChange={setAsOf}
          />
        </Fieldset>

        <Fieldset legend="İsteğe bağlı">
          <DateField
            label="Doğum tarihi"
            hint="18 yaşında ve daha küçük işçide izin 18 iş gününden az olamaz (madde 43(1))."
            error={errors.birthDate}
            value={birthDate}
            onChange={setBirthDate}
          />
          <NumberField
            label="Bu yıl kullanılan izin"
            error={errors.usedDays}
            value={usedDays}
            onChange={setUsedDays}
            suffix="gün"
            placeholder="0"
          />
          <CheckboxField
            label="Niteliği gereği altı aydan az süren mevsimlik veya kampanya işi"
            hint="Madde 44(5): bu işlerde yıllık ücretli izin kuralları uygulanmaz."
            checked={seasonal}
            onChange={setSeasonal}
            wide
          />
        </Fieldset>
      </ToolForm>

      <ResultsRegion ref={resultRef}>
        <StaleNotice show={stale} />

        {!result ? null : !result.eligible ? (
          <ToolNotice tone="notice">
            {result.reason === 'seasonal'
              ? 'Madde 44(5) uyarınca, niteliği gereği altı aydan az süren mevsimlik ve kampanya işlerinde yıllık ücretli izin kuralları uygulanmaz.'
              : `Madde 43(1) izin hakkını en az altı ay çalışmış olma koşuluna bağlıyor. Hesaplanan hizmet süresi ${formatDuration(result.duration)}.`}
          </ToolNotice>
        ) : (
          <ResultPanel
            title="Sonuç"
            note={`Madde 46(4) hak edilen iznin en az ${MIN_DAYS_USED_IN_YEAR} iş gününün o yıl kullanılmasını istiyor; aktarılarak biriktirilen izin ${MAX_CARRY_OVER_DAYS} iş gününü geçemez. Madde 46(2) uyarınca izne rastlayan resmî tatil ve hafta tatili günleri izin süresinden sayılmaz.`}
          >
            <ResultRow label="Toplam hizmet süresi" value={formatDuration(result.duration)} />
            <ResultRow
              label="Hizmet süresi basamağı"
              value={result.tier ? `Madde 43(1)(${result.tier.clause})` : '—'}
              hint={result.tier?.label}
            />
            <ResultRow
              label="Tam hizmet yılı karşılığı izin"
              value={formatDays(result.fullYearDays)}
              hint={result.youngWorkerApplied ? '18 yaş tabanı uygulandı.' : undefined}
            />
            <ResultRow
              label="İçinde bulunulan hizmet yılında biriken"
              value={formatDays(result.proRatedDays)}
              hint={`${result.monthsIntoCurrentYear} ay için orantılı (madde 43(4)); kesirler bir sonraki hesaba aktarılır.`}
            />
            <ResultRow label="Kullanılan izin" value={formatDays(result.usedDays)} />
            <ResultRow
              label={
                result.duration.years >= 1
                  ? 'Şu an kullanılabilir kalan izin'
                  : 'Kalan orantılı izin'
              }
              value={formatDays(result.remainingDays)}
              hint={
                result.duration.years >= 1
                  ? `Madde 44(4): dolan hizmet yılının ${formatNumber(result.usableDays)} günlük izni, içinde bulunulan hizmet yılında kullanılır.`
                  : undefined
              }
              emphasis
            />
          </ResultPanel>
        )}
      </ResultsRegion>
    </>
  );
}
