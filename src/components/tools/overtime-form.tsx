'use client';

import { useState } from 'react';
import { z } from 'zod';

import {
  Fieldset,
  NumberField,
  ResultPanel,
  ResultRow,
  ResultsRegion,
  SelectField,
  StaleNotice,
  ToolForm,
  ToolNotice,
  useCalculator,
} from '@/components/tool-page/fields';
import { formatCurrency, formatNumber } from '@/lib/tools/format';
import {
  calculateOvertime,
  defaultNormalHours,
  HOLIDAY_OVERTIME_UPLIFT,
  MAX_OVERTIME_DAYS_PER_YEAR,
  MAX_OVERTIME_HOURS_PER_DAY,
  monthlyFromWeekly,
  WEEKDAY_OVERTIME_UPLIFT,
} from '@/lib/tools/overtime';
import { optionalAmount, requiredAmount } from '@/lib/tools/validation';

/** Ortalama bir ayda 22 iş günü — madde 27(3)(Ç) paydası için makul bir başlangıç. */
const DEFAULT_WORKING_DAYS = 22;

const schema = z.object({
  period: z.enum(['monthly', 'weekly']),
  wage: requiredAmount('Brüt ücreti girin.'),
  normalHours: requiredAmount('Aylık normal mesai saatini girin.'),
  weekdayHours: optionalAmount('saat'),
  holidayHours: optionalAmount('saat'),
  holidayDays: optionalAmount('gün sayısı'),
  maxHoursInOneDay: optionalAmount('saat'),
  overtimeDaysInYear: optionalAmount('gün sayısı'),
});

export function OvertimeForm() {
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [wage, setWage] = useState('');
  const [normalHours, setNormalHours] = useState(String(defaultNormalHours(DEFAULT_WORKING_DAYS)));
  const [weekdayHours, setWeekdayHours] = useState('');
  const [holidayHours, setHolidayHours] = useState('');
  const [holidayDays, setHolidayDays] = useState('');
  const [maxHoursInOneDay, setMaxHoursInOneDay] = useState('');
  const [overtimeDaysInYear, setOvertimeDaysInYear] = useState('');

  const { errors, result, stale, onSubmit, resultRef } = useCalculator({
    values: {
      period,
      wage,
      normalHours,
      weekdayHours,
      holidayHours,
      holidayDays,
      maxHoursInOneDay,
      overtimeDaysInYear,
    },
    schema,
    calculate: (input) =>
      calculateOvertime({
        grossMonthlyWage: input.period === 'weekly' ? monthlyFromWeekly(input.wage) : input.wage,
        normalHoursInMonth: input.normalHours,
        weekdayOvertimeHours: input.weekdayHours ?? 0,
        holidayOvertimeHours: input.holidayHours ?? 0,
        publicHolidayDaysWorked: input.holidayDays ?? 0,
        maxHoursInOneDay: input.maxHoursInOneDay,
        overtimeDaysInYear: input.overtimeDaysInYear,
      }),
  });

  return (
    <>
      <ToolForm onSubmit={onSubmit}>
        <Fieldset legend="Ücret">
          <SelectField
            label="Maaş ödenme sıklığı"
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'monthly', label: 'Aylık' },
              { value: 'weekly', label: 'Haftalık' },
            ]}
          />
          <NumberField
            label={period === 'weekly' ? 'Haftalık brüt ücret' : 'Aylık brüt ücret'}
            hint={
              period === 'weekly'
                ? 'Madde 27(3)(D): haftalık ücret × 52 ÷ 12 ile aylığa çevrilir.'
                : undefined
            }
            error={errors.wage}
            value={wage}
            onChange={setWage}
            suffix="TL"
          />
          <NumberField
            label="Aylık normal mesai için çalışılan toplam saat"
            hint={`Madde 27(3)(Ç)'nin paydası. Varsayılan ${DEFAULT_WORKING_DAYS} iş günü × 8 saat; kendi ayınıza göre düzeltin.`}
            error={errors.normalHours}
            value={normalHours}
            onChange={setNormalHours}
            suffix="saat"
            wide
          />
        </Fieldset>

        <Fieldset legend="Fazla çalışma">
          <NumberField
            label="Normal iş günlerinde yapılan fazla mesai"
            hint={`Zam %${WEEKDAY_OVERTIME_UPLIFT * 100} (madde 27(3)(A), 50/2010 ile değişik).`}
            error={errors.weekdayHours}
            value={weekdayHours}
            onChange={setWeekdayHours}
            suffix="saat"
          />
          <NumberField
            label="Hafta tatili ve resmî tatilde yapılan fazla mesai"
            hint={`Zam %${HOLIDAY_OVERTIME_UPLIFT * 100} (madde 27(3)(B), 50/2010 ile değişik).`}
            error={errors.holidayHours}
            value={holidayHours}
            onChange={setHolidayHours}
            suffix="saat"
          />
        </Fieldset>

        <Fieldset legend="Resmî tatil çalışması (madde 40)">
          <NumberField
            label="Çalışılan resmî tatil günü sayısı"
            hint="Her gün için saat başı ücretin sekiz katı, normal ödemeye EK olarak."
            error={errors.holidayDays}
            value={holidayDays}
            onChange={setHolidayDays}
            suffix="gün"
            wide
          />
        </Fieldset>

        <Fieldset legend="Yasal sınır kontrolü (isteğe bağlı)">
          <NumberField
            label="En yoğun günde yapılan fazla mesai"
            hint={`Madde 27(2): günde en çok ${MAX_OVERTIME_HOURS_PER_DAY} saat.`}
            error={errors.maxHoursInOneDay}
            value={maxHoursInOneDay}
            onChange={setMaxHoursInOneDay}
            suffix="saat"
          />
          <NumberField
            label="Yıl içinde fazla mesai yapılan gün sayısı"
            hint={`Madde 27(2): yılda en çok ${MAX_OVERTIME_DAYS_PER_YEAR} iş günü.`}
            error={errors.overtimeDaysInYear}
            value={overtimeDaysInYear}
            onChange={setOvertimeDaysInYear}
            suffix="gün"
          />
        </Fieldset>
      </ToolForm>

      <ResultsRegion ref={resultRef}>
        <StaleNotice show={stale} />

        {result ? (
          <>
            {result.warnings.length ? (
              <ToolNotice tone="notice">
                Girilen değerler madde 27(2)&apos;deki yasal sınırı aşıyor
                {result.warnings.includes('daily-limit')
                  ? ` (günde en çok ${MAX_OVERTIME_HOURS_PER_DAY} saat)`
                  : ''}
                {result.warnings.includes('yearly-limit')
                  ? ` (yılda en çok ${MAX_OVERTIME_DAYS_PER_YEAR} iş günü)`
                  : ''}
                . Sınırın aşılmış olması ücret hakkını ortadan kaldırmaz; hesap aşağıda yine
                gösteriliyor.
              </ToolNotice>
            ) : null}

            <ResultPanel
              title="Sonuç"
              note="Madde 41: fazla çalışma karşılığı ücretler, primler ve sosyal yardımlar resmî tatil ücretinin saptanmasında hesaba katılmaz. Tutarlar brüttür."
            >
              <ResultRow label="Saat başı normal ücret" value={formatCurrency(result.hourlyRate)} />
              <ResultRow
                label="Hafta içi fazla mesai"
                value={formatCurrency(result.weekday.amount)}
                hint={`${formatNumber(result.weekday.hours)} saat × ${formatCurrency(result.weekday.rate)}`}
              />
              <ResultRow
                label="Hafta tatili / resmî tatil fazla mesaisi"
                value={formatCurrency(result.holiday.amount)}
                hint={`${formatNumber(result.holiday.hours)} saat × ${formatCurrency(result.holiday.rate)}`}
              />
              <ResultRow
                label="Resmî tatil ek ödemesi"
                value={formatCurrency(result.publicHoliday.amount)}
                hint={`${formatNumber(result.publicHoliday.days)} gün × ${formatCurrency(result.publicHoliday.perDay)} (saat ücreti × 8)`}
              />
              <ResultRow label="Toplam" value={formatCurrency(result.total)} emphasis />
            </ResultPanel>
          </>
        ) : null}
      </ResultsRegion>
    </>
  );
}
