'use client';

import { useState } from 'react';
import { z } from 'zod';

import {
  DateField,
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
import { formatCurrency, formatPercent } from '@/lib/tools/format';
import { daysBetween, formatDuration, toDateInputValue } from '@/lib/tools/duration';
import {
  calculateProvidentFund,
  FULL_WITHDRAWAL_AGE_OTHER,
  FULL_WITHDRAWAL_AGE_SGK,
  QUARTER_WITHDRAWAL_ADVANCE_BLOCK_YEARS,
  QUARTER_WITHDRAWAL_YEARS,
  type ProvidentScheme,
} from '@/lib/tools/provident-fund';
import { optionalAmount, requiredAmount, requiredDate } from '@/lib/tools/validation';

const schema = z
  .object({
    joinDate: requiredDate('Sandığa giriş tarihini girin.'),
    asOf: requiredDate('Hesabın yapılacağı tarihi girin.'),
    wage: requiredAmount('Aylık brüt ücreti girin.'),
    scheme: z.enum(['current', 'legacy']),
    interest: optionalAmount('oran'),
    growth: optionalAmount('oran'),
  })
  .refine((data) => daysBetween(data.joinDate, data.asOf) >= 0, {
    message: 'Bu tarih sandığa giriş tarihinden önce olamaz.',
    path: ['asOf'],
  });

export function ProvidentFundForm() {
  const today = toDateInputValue(new Date());

  const [joinDate, setJoinDate] = useState('');
  const [asOf, setAsOf] = useState(today);
  const [wage, setWage] = useState('');
  const [scheme, setScheme] = useState<ProvidentScheme>('current');
  const [interest, setInterest] = useState('');
  const [growth, setGrowth] = useState('');

  const { errors, result, stale, onSubmit, resultRef } = useCalculator({
    values: { joinDate, asOf, wage, scheme, interest, growth },
    schema,
    calculate: (input) =>
      calculateProvidentFund({
        joinDate: input.joinDate,
        asOf: input.asOf,
        grossMonthlyWage: input.wage,
        scheme: input.scheme,
        /* Kullanıcı yüzde giriyor, hesap oran bekliyor. */
        annualInterestRate: input.interest === null ? null : input.interest / 100,
        annualWageGrowth: input.growth === null ? null : input.growth / 100,
      }),
  });

  return (
    <>
      <ToolForm onSubmit={onSubmit}>
        <Fieldset legend="Sandık geçmişi">
          <DateField
            label="Sandığa giriş tarihi"
            error={errors.joinDate}
            value={joinDate}
            onChange={setJoinDate}
            max={asOf || today}
          />
          <DateField
            label="Birikim hangi tarihe göre hesaplansın"
            hint="Varsayılan bugün."
            error={errors.asOf}
            value={asOf}
            onChange={setAsOf}
          />
          <NumberField
            label="Şu an aldığınız aylık brüt ücret"
            hint="Prim ve depozitin matrahı brüt ücrettir (madde 8)."
            error={errors.wage}
            value={wage}
            onChange={setWage}
            suffix="TL"
          />
          <SelectField
            label="Hangi sistemdesiniz"
            value={scheme}
            onChange={setScheme}
            options={[
              {
                value: 'current',
                label: 'Sosyal Güvenlik Yasası sonrası ilk kez kapsama girdim (%4 + %4)',
              },
              { value: 'legacy', label: 'Daha önce kapsama girdim (%5 + %5)' },
            ]}
          />
        </Fieldset>

        <Fieldset legend="Projeksiyon (isteğe bağlı)">
          <NumberField
            label="Yıllık faiz oranı"
            hint="Oran Bakanlar Kurulu kararıyla belirlenir ve yıldan yıla değişir; güncel oranı İhtiyat Sandığı Dairesi’nden öğrenebilirsiniz. Boş bırakılırsa faiz işletilmez."
            error={errors.interest}
            value={interest}
            onChange={setInterest}
            suffix="%"
          />
          <NumberField
            label="Yıllık ortalama ücret artışı"
            hint="Girilirse geçmiş aylardaki ücret bugünkü ücretten geriye doğru indirgenir."
            error={errors.growth}
            value={growth}
            onChange={setGrowth}
            suffix="%"
          />
        </Fieldset>
      </ToolForm>

      <ResultsRegion ref={resultRef}>
        <StaleNotice show={stale} />

        {result ? (
          <>
            <ToolNotice tone="info">
              Bu bir tahmindir. Gerçek bakiye, her ay yatırılan primlerin yıldan yıla değişen
              oranlarla işletilmesinden çıkar. Kesin tutar için İhtiyat Sandığı Dairesi&apos;nden
              hesap dökümü isteyin.
            </ToolNotice>

            <ResultPanel
              title="Sonuç"
              note={`Madde 9(9): Sosyal Güvenlik Yasası kapsamında ${FULL_WITHDRAWAL_AGE_SGK}, diğer sosyal güvenlik kurumlarına tabi olanlardan ${FULL_WITHDRAWAL_AGE_OTHER} yaşını aşanlar ile emeklilik veya yaşlılık aylığı almaya başlayanlar, başvurmaları halinde birikimin tümünü faiziyle çekebilir.`}
            >
              <ResultRow label="Sandıktaki süre" value={formatDuration(result.duration)} />
              <ResultRow
                label="Aylık toplam yatırım"
                value={formatCurrency(result.monthlyContribution)}
                hint={`İşçi primi ${formatPercent(result.employeeRate * 100)} + işveren depoziti ${formatPercent(result.employerRate * 100)}`}
              />
              <ResultRow
                label="Yatırılan toplam (faiz hariç)"
                value={formatCurrency(result.contributionsTotal)}
              />
              <ResultRow
                label="Tahmini birikim"
                value={formatCurrency(result.estimatedBalance)}
                emphasis
              />
              <ResultRow
                label="Çekilebilecek azami avans"
                value={formatCurrency(result.maxAdvance)}
                hint="Madde 10(1): birikimin en fazla yarısı, Yönetim Kurulu onayıyla."
              />
              <ResultRow
                label={`${QUARTER_WITHDRAWAL_YEARS} yıl dörtte bir hakkı`}
                value={
                  result.quarter.eligible
                    ? formatCurrency(result.quarter.amount)
                    : `${Math.ceil(result.quarter.monthsRemaining / 12)} yıl kaldı`
                }
                hint={
                  result.quarter.eligible
                    ? `Madde 10(3): bir defaya mahsus. Bu hakkı kullanan iştirakçi ${QUARTER_WITHDRAWAL_ADVANCE_BLOCK_YEARS} yıl avans alamaz.`
                    : `Madde 10(3): en az ${QUARTER_WITHDRAWAL_YEARS} yıl yatırım gerekiyor. Kalan: ${result.quarter.monthsRemaining} ay.`
                }
              />
            </ResultPanel>
          </>
        ) : null}
      </ResultsRegion>
    </>
  );
}
