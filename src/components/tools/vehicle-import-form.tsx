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
  AGE_LIMITS,
  ageCheck,
  calculateVehicleImport,
  DISABILITY_LIMITS,
  VEHICLE_IMPORT_RATES,
  type DisabilityGroup,
  type Fuel,
  type ImportLine,
  type Origin,
  type VehicleType,
} from '@/lib/tools/vehicle-import';

type Currency = 'TRY' | 'GBP' | 'EUR' | 'USD' | 'JPY';

const CURRENCIES: ReadonlyArray<{ value: Currency; label: string; symbol: string }> = [
  { value: 'GBP', label: 'Sterlin (£)', symbol: '£' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'USD', label: 'Dolar ($)', symbol: '$' },
  { value: 'JPY', label: 'Japon yeni (¥)', symbol: '¥' },
  { value: 'TRY', label: 'Türk lirası (TL)', symbol: 'TL' },
];

const VEHICLE_TYPES: ReadonlyArray<{ value: VehicleType; label: string }> = [
  { value: 'car', label: 'Binek otomobil' },
  { value: 'pickup', label: 'Pikap / kamyonet (5 tona kadar)' },
  { value: 'truck', label: 'Kamyon (brüt ağırlığı 5 tonu aşan)' },
  { value: 'motorcycle', label: 'Motosiklet' },
];

const FUELS: ReadonlyArray<{ value: Fuel; label: string }> = [
  { value: 'petrol', label: 'Benzinli' },
  { value: 'diesel', label: 'Dizel' },
  { value: 'hybrid', label: 'Hibrit (şarj edilebilir dahil)' },
  { value: 'electric', label: 'Tamamen elektrikli' },
];

const MOTORCYCLE_FUELS: ReadonlyArray<{ value: Fuel; label: string }> = [
  { value: 'petrol', label: 'Benzinli' },
  { value: 'electric', label: 'Elektrikli' },
];

const ORIGINS: ReadonlyArray<{ value: Origin; label: string }> = [
  { value: 'other', label: 'Diğer ülke (Japonya, İngiltere vb.)' },
  { value: 'eu', label: 'AB veya EFTA (menşe belgesiyle)' },
  { value: 'tc', label: 'Türkiye (menşe belgesiyle)' },
];

const DISABILITY: ReadonlyArray<{ value: DisabilityGroup | 'none'; label: string }> = [
  { value: 'none', label: 'Yok' },
  { value: 'orthopaedic', label: 'Ortopedik engelli (%50 ve üzeri), kendisi ithal ediyor' },
  { value: 'cerebral-palsy-down', label: 'Spastik veya Down sendromlu kişinin ailesi' },
  { value: 'visual-mental', label: 'Görme engelli (%50 ve üzeri) veya görme/zihinsel engellinin ailesi' },
  { value: 'neurological', label: 'Nörolojik kaynaklı fiziksel engelli (%45 ve üzeri) veya ailesi' },
];

const schema = z
  .object({
    vehicleType: z.enum(['car', 'pickup', 'truck', 'motorcycle']),
    currency: z.enum(['TRY', 'GBP', 'EUR', 'USD', 'JPY']),
    exchangeRate: optionalAmount('kur'),
    price: requiredAmount('Fatura bedelini girin.'),
    freight: optionalAmount('navlun'),
    insurance: optionalAmount('sigorta'),
    fuel: z.enum(['petrol', 'diesel', 'hybrid', 'electric']),
    engineCc: optionalAmount('silindir hacmi'),
    origin: z.enum(['tc', 'eu', 'other']),
    doubleCab: z.boolean(),
    weightKg: optionalAmount('ağırlık'),
    motorKw: optionalAmount('motor gücü'),
    commercial: z.boolean(),
    roadTax: z.boolean(),
    firstRegistration: optionalDate(),
    arrival: requiredDate('Limana varış tarihini girin.'),
    resettling: z.boolean(),
    classic: z.boolean(),
    builtBy1983: z.boolean(),
    disability: z.enum(['none', 'orthopaedic', 'cerebral-palsy-down', 'visual-mental', 'neurological']),
    adapted: z.boolean(),
    gbpRate: optionalAmount('kur'),
  })
  .superRefine((values, ctx) => {
    if (values.currency !== 'TRY' && !values.exchangeRate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exchangeRate'], message: 'Kuru girin.' });
    }
    if (values.fuel !== 'electric' && !values.engineCc) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['engineCc'], message: 'Silindir hacmini girin.' });
    }
  });

function lineHint(line: ImportLine): string | undefined {
  const parts: string[] = [];
  if (line.base !== undefined && line.rate !== undefined && !line.exempt) {
    parts.push(`${formatCurrency(line.base)} × ${formatPercent(line.rate)}`);
  }
  if (line.note) parts.push(line.note);
  return parts.length ? parts.join(' — ') : undefined;
}

export function VehicleImportForm() {
  const today = toDateInputValue(new Date());

  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [currency, setCurrency] = useState<Currency>('GBP');
  const [exchangeRate, setExchangeRate] = useState('');
  const [price, setPrice] = useState('');
  const [freight, setFreight] = useState('');
  const [insurance, setInsurance] = useState('');
  const [fuel, setFuel] = useState<Fuel>('petrol');
  const [engineCc, setEngineCc] = useState('');
  const [origin, setOrigin] = useState<Origin>('other');
  const [doubleCab, setDoubleCab] = useState(true);
  const [weightKg, setWeightKg] = useState('');
  const [motorKw, setMotorKw] = useState('');
  const [commercial, setCommercial] = useState(false);
  const [roadTax, setRoadTax] = useState(false);
  const [firstRegistration, setFirstRegistration] = useState('');
  const [arrival, setArrival] = useState(today);
  const [resettling, setResettling] = useState(false);
  const [classic, setClassic] = useState(false);
  const [builtBy1983, setBuiltBy1983] = useState(false);
  const [disability, setDisability] = useState<DisabilityGroup | 'none'>('none');
  const [adapted, setAdapted] = useState(false);
  const [gbpRate, setGbpRate] = useState('');

  const car = vehicleType === 'car';
  const pickup = vehicleType === 'pickup';
  const truck = vehicleType === 'truck';
  const motorcycle = vehicleType === 'motorcycle';
  const symbol = CURRENCIES.find((entry) => entry.value === currency)?.symbol ?? 'TL';
  const showWeight = (car && roadTax) || (pickup && doubleCab);
  const disabled = car && disability !== 'none';

  /* A motorcycle is petrol or electric; keep the fuel within its list. */
  const changeVehicleType = (next: VehicleType) => {
    setVehicleType(next);
    if (next === 'motorcycle' && (fuel === 'diesel' || fuel === 'hybrid')) setFuel('petrol');
  };

  const { errors, result, stale, onSubmit, resultRef } = useCalculator({
    values: {
      vehicleType,
      currency,
      exchangeRate,
      price,
      freight,
      insurance,
      fuel,
      engineCc,
      origin,
      doubleCab,
      weightKg,
      motorKw,
      commercial,
      roadTax,
      firstRegistration,
      arrival,
      resettling,
      classic,
      builtBy1983,
      disability,
      adapted,
      gbpRate,
    },
    schema,
    calculate: (values) => {
      const rate = values.currency === 'TRY' ? 1 : values.exchangeRate ?? 1;
      const cifForeign = values.price + (values.freight ?? 0) + (values.insurance ?? 0);
      const cifTl = cifForeign * rate;
      const isPickup = values.vehicleType === 'pickup';
      const workVehicle = values.vehicleType === 'truck' || (isPickup && !values.doubleCab);
      const limitYears = workVehicle ? AGE_LIMITS.work : AGE_LIMITS.passenger;
      const isCar = values.vehicleType === 'car';
      const age = values.firstRegistration ? ageCheck(values.firstRegistration, values.arrival, limitYears) : null;
      const gbp = values.currency === 'GBP' ? rate : values.gbpRate;
      const disabilityGroup = values.vehicleType === 'car' && values.disability !== 'none' ? values.disability : null;

      const calculation = calculateVehicleImport({
        vehicleType: values.vehicleType,
        cifTl,
        fuel: values.fuel,
        engineCc: values.fuel === 'electric' ? null : values.engineCc,
        origin: values.origin,
        commercial: values.commercial,
        ageYears: age ? age.ageYears : null,
        doubleCab: isPickup && values.doubleCab,
        weightKg: values.weightKg,
        roadTax: values.roadTax,
        motorKw: values.motorKw,
        classic: isCar && values.classic,
        builtBy1983: isCar && values.classic && values.builtBy1983,
        disability: disabilityGroup
          ? { group: disabilityGroup, adapted: values.adapted, cifGbp: gbp ? cifTl / gbp : null }
          : null,
      });
      return {
        ...calculation,
        vehicleType: values.vehicleType,
        origin: values.origin,
        currency: values.currency,
        rate,
        age,
        limitYears,
        resettling: values.resettling,
        disabled: disabilityGroup !== null,
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
          <SelectField label="Araç türü" value={vehicleType} onChange={changeVehicleType} options={VEHICLE_TYPES} />
          <SelectField
            label="Yakıt türü"
            value={fuel}
            onChange={setFuel}
            options={motorcycle ? MOTORCYCLE_FUELS : FUELS}
          />
          {fuel !== 'electric' ? (
            <NumberField
              label="Silindir hacmi"
              hint={
                car
                  ? 'Ruhsattaki motor hacmi. Fon oranı 2000 ve 3000 cm³’ü geçince artıyor; gümrük vergisi muafiyeti benzinlide 2000, dizelde 2500 cm³’e kadar.'
                  : pickup
                    ? 'Genel sütunda gümrük vergisi dizelde 2500, benzinlide 2800 cm³’ü geçince %10’dan %22’ye çıkıyor.'
                    : truck
                      ? 'Kamyonda oranlar motor hacmine göre değişmiyor; kayıt için girin.'
                      : 'Fon 80 ve 125 cm³’te, gümrük vergisi 250 cm³’te, KDV 200 cm³’te değişiyor.'
              }
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
          {pickup ? (
            <CheckboxField
              label="Çift kabin (yolcu da taşıyor)"
              hint={`Çift kabin ${AGE_LIMITS.passenger} yaş, yalnızca yük taşıyan tek kabin ${AGE_LIMITS.work} yaş sınırına tabi; ${VEHICLE_IMPORT_RATES.pickupFif.doubleCabMaxKg} kg’a kadar çift kabinde ${formatCurrency(VEHICLE_IMPORT_RATES.pickupFif.doubleCabSpecificTl)} ek fon alınır.`}
              checked={doubleCab}
              onChange={setDoubleCab}
              wide
            />
          ) : null}
          {showWeight ? (
            <NumberField
              label="Boş ağırlık"
              hint={car ? 'Seyrüsefer ağırlığa göre hesaplanır.' : 'Çift kabin ek fonunun ağırlık sınırı için.'}
              error={errors.weightKg}
              value={weightKg}
              onChange={setWeightKg}
              suffix="kg"
            />
          ) : null}
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
          <NumberField label="Fatura bedeli" error={errors.price} value={price} onChange={setPrice} suffix={symbol} />
          <NumberField
            label="Navlun (nakliye)"
            hint="Limana kadar taşıma bedeli. Vergiler navlun ve sigorta dahil değer (CİF) üzerinden alınır."
            error={errors.freight}
            value={freight}
            onChange={setFreight}
            suffix={symbol}
          />
          <NumberField label="Sigorta" error={errors.insurance} value={insurance} onChange={setInsurance} suffix={symbol} />
        </Fieldset>

        <Fieldset legend="Yaş sınırı">
          <DateField
            label="İlk kayıt tarihi (kullanılmışsa)"
            hint="Boş bırakılırsa yeni araç sayılır. Araç, limana vardığında ilk kayıttan itibaren yaş sınırını doldurmuşsa ithal izni verilmez. Klasik araçta imal tarihi esas alınır."
            error={errors.firstRegistration}
            value={firstRegistration}
            onChange={setFirstRegistration}
            max={today}
          />
          <DateField label="Limana varış tarihi" error={errors.arrival} value={arrival} onChange={setArrival} />
          <CheckboxField
            label="Yerleşmeye geliyorum; araç benim adıma kayıtlı"
            hint="Yerleşmeye gelen kişi, gümrüğe gelmeden önce kendi adına kayıtlı aracını bir defaya mahsus yaş sınırı olmadan getirebilir (Yaş Sınırlandırılması Tüzüğü madde 6). Vergiler değişmez."
            checked={resettling}
            onChange={setResettling}
            wide
          />
        </Fieldset>

        <Fieldset legend="Muafiyet ve diğer">
          {car ? (
            <>
              <CheckboxField
                label="Klasik araç (25 yaşını doldurmuş, Eski Eserler ve Müzeler Dairesi onaylı)"
                hint={`Fon, oranlar yerine ${formatCurrency(VEHICLE_IMPORT_RATES.classicFif.specificTl)} + %${VEHICLE_IMPORT_RATES.classicFif.rate} alınır; Klasik Otomobil Derneği veya Klasik ve Spor Otomobil Kulübü’nün klasik kabulüyle yaş sınırı uygulanmaz.`}
                checked={classic}
                onChange={setClassic}
                wide
              />
              {classic && roadTax ? (
                <CheckboxField
                  label="31 Aralık 1983’e kadar imal edildi"
                  hint={`Kulüp veya derneğin klasik kabulü ve Eski Eserler onayıyla seyrüsefer %${VEHICLE_IMPORT_RATES.classicRoadTaxDiscount} indirimli.`}
                  checked={builtBy1983}
                  onChange={setBuiltBy1983}
                  wide
                />
              ) : null}
              <SelectField
                label="Engelli muafiyeti"
                hint={`Devlet Sağlık Kurulu raporu gerekir. Gümrük vergisi muafiyeti ${DISABILITY_LIMITS.customsMaxCc} cm³’e ve ${DISABILITY_LIMITS.customsMaxCifGbp.toLocaleString('tr-TR')} £ CİF’e kadar; fon ve kayıt harcı muafiyeti ${DISABILITY_LIMITS.smallCarMaxCc} cm³’e kadar.`}
                value={disability}
                onChange={setDisability}
                options={DISABILITY}
                wide
              />
              {disabled ? (
                <>
                  <CheckboxField
                    label="Araç engelliye özel imal veya donanımlı (özel teçhizat, rampa, vinç) ve onun adına gümrükleniyor"
                    hint="Güçlendirme Kurumu payı muafiyeti ve bazı gruplarda kayıt harcı muafiyeti bu koşula bağlı."
                    checked={adapted}
                    onChange={setAdapted}
                    wide
                  />
                  {currency !== 'GBP' ? (
                    <NumberField
                      label="1 £ kaç TL (30.000 £ sınırı için)"
                      hint="Girilmezse CİF sınırı kontrol edilmez."
                      error={errors.gbpRate}
                      value={gbpRate}
                      onChange={setGbpRate}
                      suffix="TL"
                    />
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
          <CheckboxField
            label="İlk yıl seyrüseferi (yol vergisi) ekle"
            hint="Yıllık ruhsat harcı; ithalat vergisi değil ama ilk kayıtta ödenir."
            checked={roadTax}
            onChange={setRoadTax}
            wide
          />
          {roadTax && motorcycle && fuel === 'electric' ? (
            <NumberField
              label="Motor gücü"
              hint="Elektrikli motosikletin seyrüseferi güce göre."
              error={errors.motorKw}
              value={motorKw}
              onChange={setMotorKw}
              suffix="kW"
            />
          ) : null}
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
            {result.classicUnavailable ? <ToolNotice tone="notice">{result.classicUnavailable}</ToolNotice> : null}
            {result.classic ? (
              <ToolNotice tone="info">
                Klasik araç: yaş sınırı uygulanmaz (Yaş Sınırlandırılması Tüzüğü madde 5(2)(A)); Klasik Otomobil
                Derneği veya Klasik ve Spor Otomobil Kulübü’nün klasik kabulü ve Eski Eserler ve Müzeler Dairesi onayı
                gerekir. Gümrük vergisi ve KDV binek otomobil (87.03) gibi hesaplandı; Gümrük aracı tarihi koleksiyon
                eşyası (97.05) sayarsa gümrük vergisi alınmaz.
              </ToolNotice>
            ) : null}
            {result.newWorkVehicle && result.vehicleType === 'pickup' ? (
              <ToolNotice tone="notice">
                Rıhtım harcı ve KDV muafiyetleri yeni iş araçlarından yalnızca dizel ve benzinli pikapları (87.04.21,
                87.04.31) hariç tutuyor; metne göre yeni hibrit ve elektrikli pikaplar muaf. Uygulamayı Gümrük’e
                sorun.
              </ToolNotice>
            ) : null}
            {result.age && !result.age.allowed && !result.resettling && !result.classic ? (
              <ToolNotice tone="danger">
                Bu araç {formatDate(result.age.limitDate)} tarihinde {result.limitYears} yaşını dolduruyor; girdiğiniz
                varış tarihinde ithal izni verilmez. Yerleşmeye gelenlerin kendi adına kayıtlı aracı gibi istisnalar
                için Yaş Sınırlandırılması Tüzüğü’ne bakın.
              </ToolNotice>
            ) : null}
            {result.age && (result.age.allowed || result.resettling) && !result.classic ? (
              <ToolNotice tone="info">
                {result.resettling
                  ? 'Yerleşmeye gelen kişinin kendi adına kayıtlı aracı için yaş sınırı bir defaya mahsus uygulanmaz.'
                  : `Yaş sınırı: araç ${formatDate(result.age.limitDate)} tarihinde ${result.limitYears} yaşını dolduruyor; bu tarihten önce limana varmalı.`}{' '}
                Sol direksiyon araçlara ithal izni verilmez.
              </ToolNotice>
            ) : null}
            {result.disabled ? (
              <ToolNotice tone="notice">
                {result.disabilityNotes.length ? `${result.disabilityNotes.join(' ')} ` : ''}
                Muaf ithal edilen araç {DISABILITY_LIMITS.resaleYears} yıl dolmadan satılırsa vergiler aracın son
                değeri üzerinden alınır; hak, araç kaydedildikten {DISABILITY_LIMITS.renewYears} yıl sonra yeniden
                kullanılabilir. Rıhtım harcı için muafiyet yok; KDV’nin alınıp alınmadığını Gümrük’e sorun (KDV Yasası
                madde 16(1)(I)).
              </ToolNotice>
            ) : null}
            {result.vehicleType === 'motorcycle' ? (
              <ToolNotice tone="notice">
                Motosiklet fon oranları bulunabilen en son değişiklikten (A.E. 624, 14.10.2010). 2020–2026 fon
                emirnamelerinin hiçbiri motosiklete dokunmuyor, ancak 2013–2017 arasındaki bazı sayılar
                indirilemediği için sonraki bir değişiklik dışlanamıyor.
              </ToolNotice>
            ) : null}
            {result.vehicleType === 'pickup' && result.origin === 'tc' && !result.age ? (
              <ToolNotice tone="info">
                Fon emirnamesinin istisna sütunu TC menşeli yeni pikaplara %7 uyguluyor; tablonun AB-EFTA-TC sütunundaki
                oran %5. Hesapta özel kural (%7) kullanıldı.
              </ToolNotice>
            ) : null}
            {result.roadTaxUnavailable ? <ToolNotice tone="info">{result.roadTaxUnavailable}</ToolNotice> : null}

            <ResultPanel
              title="Sonuç"
              note="Kesin tutarı Gümrük ve Rüsumat Dairesi belirler: kıymeti faturadan farklı saptayabilir. Fon oranları yılda birkaç kez değişiyor."
            >
              <ResultRow
                label="CİF değeri"
                value={formatCurrency(result.cifTl)}
                hint={
                  result.missingFreight
                    ? 'Navlun veya sigorta girilmedi; gümrük bunları da değere ekler.'
                    : inCurrency(result.cifTl)
                }
              />
              {result.lines.map((line) => (
                <ResultRow
                  key={line.key}
                  label={line.exempt ? `${line.label} (muaf)` : line.label}
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
