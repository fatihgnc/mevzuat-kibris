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
  SelectField,
  StaleNotice,
  ToolForm,
  ToolNotice,
  useCalculator,
} from '@/components/tool-page/fields';
import { formatDate, toDateInputValue } from '@/lib/tools/duration';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/tools/format';
import { optionalAmount, optionalDate, requiredAmount, requiredDate } from '@/lib/tools/validation';
import {
  ageCheck,
  calculateVehicleImport,
  MAX_AGE_YEARS,
  type Fuel,
  type ImportLine,
  type Origin,
} from '@/lib/tools/vehicle-import';

type Currency = 'TRY' | 'GBP' | 'EUR' | 'USD' | 'JPY';

const CURRENCIES: ReadonlyArray<{ value: Currency; label: string; symbol: string }> = [
  { value: 'GBP', label: 'Sterlin (£)', symbol: '£' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'USD', label: 'Dolar ($)', symbol: '$' },
  { value: 'JPY', label: 'Japon yeni (¥)', symbol: '¥' },
  { value: 'TRY', label: 'Türk lirası (TL)', symbol: 'TL' },
];

const FUELS: ReadonlyArray<{ value: Fuel; label: string }> = [
  { value: 'petrol', label: 'Benzinli' },
  { value: 'diesel', label: 'Dizel' },
  { value: 'hybrid', label: 'Hibrit (şarj edilebilir dahil)' },
  { value: 'electric', label: 'Tamamen elektrikli' },
];

const ORIGINS: ReadonlyArray<{ value: Origin; label: string }> = [
  { value: 'other', label: 'Diğer ülke (Japonya, İngiltere vb.)' },
  { value: 'eu', label: 'AB veya EFTA (menşe belgesiyle)' },
  { value: 'tc', label: 'Türkiye (menşe belgesiyle)' },
];

const schema = z
  .object({
    currency: z.enum(['TRY', 'GBP', 'EUR', 'USD', 'JPY']),
    exchangeRate: optionalAmount('kur'),
    price: requiredAmount('Fatura bedelini girin.'),
    freight: optionalAmount('navlun'),
    insurance: optionalAmount('sigorta'),
    fuel: z.enum(['petrol', 'diesel', 'hybrid', 'electric']),
    engineCc: optionalAmount('silindir hacmi'),
    origin: z.enum(['tc', 'eu', 'other']),
    commercial: z.boolean(),
    firstRegistration: optionalDate(),
    arrival: requiredDate('Limana varış tarihini girin.'),
  })
  .superRefine((values, ctx) => {
    if (values.currency !== 'TRY' && !values.exchangeRate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exchangeRate'], message: 'Kuru girin.' });
    }
    if (values.fuel !== 'electric' && !values.engineCc) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['engineCc'], message: 'Silindir hacmini girin.' });
    }
  });

function lineHint(line: ImportLine): string {
  const parts = [`${formatCurrency(line.base)} × ${formatPercent(line.rate)}`];
  if (line.note) parts.push(line.note);
  return parts.join(' — ');
}

export function VehicleImportForm() {
  const today = toDateInputValue(new Date());

  const [currency, setCurrency] = useState<Currency>('GBP');
  const [exchangeRate, setExchangeRate] = useState('');
  const [price, setPrice] = useState('');
  const [freight, setFreight] = useState('');
  const [insurance, setInsurance] = useState('');
  const [fuel, setFuel] = useState<Fuel>('petrol');
  const [engineCc, setEngineCc] = useState('');
  const [origin, setOrigin] = useState<Origin>('other');
  const [commercial, setCommercial] = useState(false);
  const [firstRegistration, setFirstRegistration] = useState('');
  const [arrival, setArrival] = useState(today);

  const symbol = CURRENCIES.find((entry) => entry.value === currency)?.symbol ?? 'TL';

  const { errors, result, stale, onSubmit, resultRef } = useCalculator({
    values: {
      currency,
      exchangeRate,
      price,
      freight,
      insurance,
      fuel,
      engineCc,
      origin,
      commercial,
      firstRegistration,
      arrival,
    },
    schema,
    calculate: (values) => {
      const rate = values.currency === 'TRY' ? 1 : values.exchangeRate ?? 1;
      const cifForeign = values.price + (values.freight ?? 0) + (values.insurance ?? 0);
      const calculation = calculateVehicleImport({
        cifTl: cifForeign * rate,
        fuel: values.fuel,
        engineCc: values.fuel === 'electric' ? null : values.engineCc,
        origin: values.origin,
        commercial: values.commercial,
      });
      return {
        ...calculation,
        currency: values.currency,
        rate,
        age: values.firstRegistration ? ageCheck(values.firstRegistration, values.arrival) : null,
        missingFreight: values.freight === null || values.insurance === null,
      };
    },
  });

  const inCurrency = (value: number) =>
    result && result.currency !== 'TRY'
      ? `≈ ${formatNumber(value / result.rate)} ${
          CURRENCIES.find((entry) => entry.value === result.currency)?.symbol ?? ''
        }`
      : undefined;

  return (
    <>
      <ToolForm onSubmit={onSubmit}>
        <Fieldset legend="Araç">
          <SelectField label="Yakıt türü" value={fuel} onChange={setFuel} options={FUELS} />
          {fuel !== 'electric' ? (
            <NumberField
              label="Silindir hacmi"
              hint="Ruhsattaki motor hacmi. Fon oranı 2000 ve 3000 cm³’ü geçince artıyor; gümrük vergisi muafiyeti benzinlide 2000, dizelde 2500 cm³’e kadar."
              error={errors.engineCc}
              value={engineCc}
              onChange={setEngineCc}
              suffix="cm³"
            />
          ) : null}
          <SelectField
            label="Menşe"
            hint="Menşe ve dolaşım belgesi sunulmazsa genel oran uygulanır (Tarife Yasası madde 7). Japonya ve İngiltere menşeli araçlar genel orana tabidir."
            value={origin}
            onChange={setOrigin}
            options={ORIGINS}
            wide
          />
        </Fieldset>

        <Fieldset legend="Değer (CİF)">
          <SelectField label="Fatura para birimi" value={currency} onChange={setCurrency} options={CURRENCIES} />
          {currency !== 'TRY' ? (
            <NumberField
              label={`1 ${symbol} kaç TL`}
              hint="Gümrük beyanının tescil tarihindeki döviz satış kuru esas alınır."
              error={errors.exchangeRate}
              value={exchangeRate}
              onChange={setExchangeRate}
              suffix="TL"
            />
          ) : null}
          <NumberField
            label="Fatura bedeli"
            error={errors.price}
            value={price}
            onChange={setPrice}
            suffix={symbol}
          />
          <NumberField
            label="Navlun (nakliye)"
            hint="Limana kadar taşıma bedeli. Vergiler navlun ve sigorta dahil değer (CİF) üzerinden alınır."
            error={errors.freight}
            value={freight}
            onChange={setFreight}
            suffix={symbol}
          />
          <NumberField
            label="Sigorta"
            error={errors.insurance}
            value={insurance}
            onChange={setInsurance}
            suffix={symbol}
          />
        </Fieldset>

        <Fieldset legend="Yaş sınırı ve ithalatçı">
          <DateField
            label="İlk kayıt tarihi (kullanılmış araçta)"
            hint={`Binek otomobil, limana vardığında ilk kayıt tarihinden itibaren ${MAX_AGE_YEARS} yaşını doldurmuşsa ithal izni verilmez.`}
            error={errors.firstRegistration}
            value={firstRegistration}
            onChange={setFirstRegistration}
            max={today}
          />
          <DateField
            label="Limana varış tarihi"
            error={errors.arrival}
            value={arrival}
            onChange={setArrival}
          />
          <CheckboxField
            label="Ticari ithalat (galeri, satış amacıyla)"
            hint="Kişisel kullanım için getirilen araçta yapılmayan %4 gelir vergisi stopajını ekler."
            checked={commercial}
            onChange={setCommercial}
            wide
          />
        </Fieldset>
      </ToolForm>

      <ResultsRegion ref={resultRef}>
        <StaleNotice show={stale} />

        {result ? (
          <>
            {result.age && !result.age.allowed ? (
              <ToolNotice tone="danger">
                Bu araç {formatDate(result.age.limitDate)} tarihinde {MAX_AGE_YEARS} yaşını dolduruyor; girdiğiniz
                varış tarihinde ithal izni verilmez. Sağ direksiyon zorunluluğu da ayrıca aranır. Yerleşmeye
                gelenlerin kendi adına kayıtlı aracı gibi istisnalar için Yaş Sınırlandırılması Tüzüğü’ne bakın.
              </ToolNotice>
            ) : null}
            {result.age && result.age.allowed ? (
              <ToolNotice tone="info">
                Yaş sınırı: araç {formatDate(result.age.limitDate)} tarihinde {MAX_AGE_YEARS} yaşını dolduruyor;
                bu tarihten önce limana varmalı. Sol direksiyon araçlara ithal izni verilmez.
              </ToolNotice>
            ) : null}

            <ResultPanel
              title="Sonuç"
              note="Kesin tutarı Gümrük ve Rüsumat Dairesi belirler: kıymeti faturadan farklı saptayabilir. Fon oranları yılda birkaç kez değişiyor; yıllık seyrüsefer (yol vergisi) ayrıca ödenir."
            >
              <ResultRow
                label="CİF değeri"
                value={formatCurrency(result.cifTl)}
                hint={result.missingFreight ? 'Navlun veya sigorta girilmedi; gümrük bunları da değere ekler.' : inCurrency(result.cifTl)}
              />
              {result.lines.map((line) => (
                <ResultRow
                  key={line.key}
                  label={line.label}
                  value={formatCurrency(line.amount)}
                  hint={lineHint(line)}
                />
              ))}
              <ResultRow label="Gümrükte ödenen" value={formatCurrency(result.customsTotal)} />
              <ResultRow
                label="Toplam vergi ve harç"
                value={formatCurrency(result.total)}
                hint={`CİF değerine oranı %${formatNumber(result.burdenPercent)}. ${inCurrency(result.total) ?? ''}`.trim()}
                emphasis
              />
              <ResultRow
                label="Araç + vergiler"
                value={formatCurrency(result.landedCost)}
                hint={inCurrency(result.landedCost)}
              />
            </ResultPanel>
          </>
        ) : null}
      </ResultsRegion>
    </>
  );
}
