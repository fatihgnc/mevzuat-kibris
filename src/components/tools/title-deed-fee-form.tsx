'use client';

import { useState } from 'react';
import { z } from 'zod';

import {
  CheckboxField,
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
import { MINIMUM_WAGE } from '@/lib/tools/constants';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/tools/format';
import {
  calculateTitleDeedFee,
  FIRST_HOME_EXEMPTION,
  FIXED_FEES,
  MAX_PROPERTIES,
  PROPERTY_VAT,
  type Buyer,
  type Expropriator,
  type FeeLine,
  type GiftRelation,
  type PointsTransfer,
  type SaleRoute,
  type Seller,
  type Transaction,
} from '@/lib/tools/title-deed-fee';
import { optionalAmount, requiredAmount } from '@/lib/tools/validation';

type Currency = 'TRY' | 'GBP' | 'EUR' | 'USD';

const CURRENCIES: ReadonlyArray<{ value: Currency; label: string; symbol: string }> = [
  { value: 'TRY', label: 'Türk lirası (TL)', symbol: 'TL' },
  { value: 'GBP', label: 'Sterlin (£)', symbol: '£' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'USD', label: 'Dolar ($)', symbol: '$' },
];

const TRANSACTIONS: ReadonlyArray<{ value: Transaction; label: string }> = [
  { value: 'sale', label: 'Satış' },
  { value: 'gift', label: 'Bağış (hibe)' },
  { value: 'mortgage', label: 'Yalnızca ipotek' },
  { value: 'exchange', label: 'Değiştirme (takas)' },
  { value: 'prescription', label: 'Zamanaşımı ile kazanma' },
  { value: 'expropriation', label: 'Kamulaştırma veya geçit istimlakı' },
  { value: 'points', label: 'Mal Değer Belgeli puan devri' },
];

const BUYERS: ReadonlyArray<{ value: Buyer; label: string }> = [
  { value: 'kktc', label: 'KKTC vatandaşı' },
  { value: 'tc', label: 'TC vatandaşı (KKTC’yi tanıyan ülke)' },
  { value: 'foreign', label: 'Diğer yabancı' },
];

const GIFT_RELATIONS: ReadonlyArray<{ value: GiftRelation; label: string }> = [
  { value: 'child', label: 'Anne veya babadan çocuğa' },
  { value: 'spouse', label: 'Eşler arasında' },
  { value: 'grandchild', label: 'Büyükanne veya büyükbabadan toruna' },
  { value: 'other', label: 'Diğer bağışlar' },
];

const POINTS_TRANSFERS: ReadonlyArray<{ value: PointsTransfer; label: string }> = [
  { value: 'sale', label: 'Satış' },
  ...GIFT_RELATIONS.map((entry) => ({ value: entry.value, label: `Bağış — ${entry.label.toLocaleLowerCase('tr')}` })),
];

const EXPROPRIATORS: ReadonlyArray<{ value: Expropriator; label: string }> = [
  { value: 'public', label: 'Devlet dışındaki bir kamu kuruluşu' },
  { value: 'private', label: 'Özel kişi veya kuruluş' },
];

const ROUTES: ReadonlyArray<{ value: SaleRoute; label: string }> = [
  { value: 'direct', label: 'Sözleşmesiz, doğrudan tapu devri' },
  { value: 'contract', label: 'Önce satış sözleşmesi Tapu’ya kaydedilecek' },
];

const VAT_KINDS: ReadonlyArray<{ value: 'home' | 'other'; label: string }> = [
  { value: 'home', label: 'Konut' },
  { value: 'other', label: 'Arsa, işyeri veya diğer taşınmaz' },
];

const SELLERS: ReadonlyArray<{ value: Seller; label: string }> = [
  { value: 'none', label: 'Hesaplanmasın' },
  { value: 'individual', label: 'Kişi, alım-satımla uğraşmıyor (%2,8)' },
  { value: 'individual-exempt', label: 'Kişi, bir defalık ev/arsa istisnasını kullanıyor (yabancılar hariç)' },
  { value: 'professional', label: 'Şirket veya alım-satımla uğraşan kişi (%4)' },
];

function propertyOptions(max: number) {
  return Array.from({ length: max }, (_, index) => ({
    value: String(index + 1),
    label: `${index + 1}. taşınmaz`,
  }));
}

const schema = z
  .object({
    transaction: z.enum(['sale', 'gift', 'mortgage', 'exchange', 'prescription', 'expropriation', 'points']),
    buyer: z.enum(['kktc', 'tc', 'foreign']),
    currency: z.enum(['TRY', 'GBP', 'EUR', 'USD']),
    exchangeRate: optionalAmount('kur'),
    amount: requiredAmount('Tutarı girin.'),
    marketValue: optionalAmount('rayiç değer'),
    givenValue: optionalAmount('değer'),
    propertyNumber: z.string(),
    route: z.enum(['direct', 'contract']),
    giftRelation: z.enum(['child', 'spouse', 'grandchild', 'other']),
    pointsTransfer: z.enum(['sale', 'child', 'spouse', 'grandchild', 'other']),
    expropriator: z.enum(['public', 'private']),
    oneOff: z.boolean(),
    firstHome: z.boolean(),
    gbpRate: optionalAmount('kur'),
    mortgageAmount: optionalAmount('ipotek tutarı'),
    stampDuty: z.boolean(),
    vat: z.boolean(),
    vatKind: z.enum(['home', 'other']),
    areaM2: optionalAmount('alan'),
    seller: z.enum(['none', 'individual', 'individual-exempt', 'professional']),
    fixedFees: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.currency !== 'TRY' && !values.exchangeRate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['exchangeRate'], message: 'Kuru girin.' });
    }
    if (values.transaction === 'exchange' && values.givenValue === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['givenValue'], message: 'Verdiğiniz taşınmazın değerini girin.' });
    }
    const exemptionApplies =
      values.firstHome &&
      values.buyer === 'kktc' &&
      (values.transaction === 'sale' || values.transaction === 'mortgage');
    if (exemptionApplies && values.currency !== 'GBP' && !values.gbpRate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gbpRate'], message: 'Sterlin kurunu girin.' });
    }
  });

type FormInput = z.output<typeof schema>;

function toInput(values: FormInput) {
  const rate = values.currency === 'TRY' ? 1 : values.exchangeRate ?? 1;
  const tl = (value: number | null) => (value === null ? null : value * rate);
  const gbpRate = values.currency === 'GBP' ? rate : values.gbpRate;
  const sale = values.transaction === 'sale';
  const exemptionApplies =
    values.firstHome && values.buyer === 'kktc' && (sale || values.transaction === 'mortgage');

  return {
    transaction: values.transaction,
    buyer: values.buyer,
    amount: values.amount * rate,
    marketValue: sale ? tl(values.marketValue) : null,
    givenValue: values.transaction === 'exchange' ? tl(values.givenValue) : null,
    propertyNumber: Number(values.propertyNumber),
    route: values.route,
    giftRelation: values.giftRelation,
    pointsTransfer: values.pointsTransfer,
    expropriator: values.expropriator,
    oneOff: values.oneOff,
    firstHomeGbpRate: exemptionApplies ? gbpRate : null,
    mortgageAmount: sale ? tl(values.mortgageAmount) : null,
    stampDuty: sale && values.stampDuty,
    vat: sale && values.vat ? { kind: values.vatKind, areaM2: values.areaM2 } : null,
    seller: sale || values.transaction === 'gift' ? values.seller : ('none' as const),
    fixedFees: values.fixedFees,
  };
}

function lineHint(line: FeeLine): string | undefined {
  const parts: string[] = [];
  if (line.base !== undefined && line.rate !== undefined) {
    const rate = line.key === 'stamp' ? 'binde 5' : formatPercent(line.rate);
    parts.push(`${formatCurrency(line.base)} × ${rate}`);
  }
  if (line.note) parts.push(line.note);
  return parts.length ? parts.join(' — ') : undefined;
}

/** The label and hint of the main amount field for each transaction. */
const AMOUNT_FIELD: Record<Transaction, { label: string; hint?: string }> = {
  sale: { label: 'Satış bedeli (sözleşmedeki)' },
  gift: {
    label: 'Taşınmazın rayiç değeri',
    hint: 'Devralan kişi işlem günü rayiç değeri bildirir; harç bu değer üzerinden alınır.',
  },
  mortgage: {
    label: 'İpotek tutarı',
    hint: 'İpotekle güvence altına alınan borç miktarı veya ipotek anlaşmasındaki en yüksek miktar.',
  },
  exchange: {
    label: 'Aldığınız taşınmazın rayiç değeri',
    hint: 'Her taraf, aldığı taşınmazın değeri üzerinden %3 öder.',
  },
  prescription: {
    label: 'Taşınmazın rayiç değeri',
    hint: 'Zamanaşımı (tasarruf) yoluyla kazanılan hakkın kaydında harç rayiç değer üzerinden alınır.',
  },
  expropriation: {
    label: 'Kamulaştırma tazminatı',
    hint: 'Harç tazminat bedeli üzerinden alınır.',
  },
  points: {
    label: 'Puanların TL değeri',
    hint: 'Puan sayısı × işlem günündeki puan birim fiyatı (İskân, Topraklandırma ve Eşdeğer Mal Yasası madde 64(4)). Satışta satış bedeli.',
  },
};

export function TitleDeedFeeForm() {
  const [transaction, setTransaction] = useState<Transaction>('sale');
  const [buyer, setBuyer] = useState<Buyer>('kktc');
  const [currency, setCurrency] = useState<Currency>('TRY');
  const [exchangeRate, setExchangeRate] = useState('');
  const [amount, setAmount] = useState('');
  const [marketValue, setMarketValue] = useState('');
  const [givenValue, setGivenValue] = useState('');
  const [propertyNumber, setPropertyNumber] = useState('1');
  const [route, setRoute] = useState<SaleRoute>('direct');
  const [giftRelation, setGiftRelation] = useState<GiftRelation>('child');
  const [pointsTransfer, setPointsTransfer] = useState<PointsTransfer>('sale');
  const [expropriator, setExpropriator] = useState<Expropriator>('public');
  const [oneOff, setOneOff] = useState(false);
  const [firstHome, setFirstHome] = useState(false);
  const [gbpRate, setGbpRate] = useState('');
  const [mortgageAmount, setMortgageAmount] = useState('');
  const [stampDuty, setStampDuty] = useState(true);
  const [vat, setVat] = useState(false);
  const [vatKind, setVatKind] = useState<'home' | 'other'>('home');
  const [areaM2, setAreaM2] = useState('');
  const [seller, setSeller] = useState<Seller>('none');
  const [fixedFees, setFixedFees] = useState(false);

  const sale = transaction === 'sale';
  const gift = transaction === 'gift';
  const kktc = buyer === 'kktc';
  /*
   * Nationality changes the rate only for a sale, a gift (the one-off 3%) and
   * the first-home exemption; elsewhere the select would be a question with
   * no effect on the answer.
   */
  const showBuyer = sale || gift || transaction === 'mortgage';
  const symbol = CURRENCIES.find((entry) => entry.value === currency)?.symbol ?? 'TL';
  const maxProperties = kktc ? 1 : MAX_PROPERTIES[buyer];
  const showOneOff = kktc && (sale || (gift && giftRelation === 'other'));
  const showFirstHome = kktc && (sale || transaction === 'mortgage');
  const amountField = AMOUNT_FIELD[transaction];

  /*
   * The property number is kept within the selected buyer's table, so
   * switching from a Turkish buyer's 5th property to a foreign buyer does not
   * leave an option the select cannot show.
   */
  const changeBuyer = (next: Buyer) => {
    setBuyer(next);
    if (next !== 'kktc' && Number(propertyNumber) > MAX_PROPERTIES[next]) {
      setPropertyNumber(String(MAX_PROPERTIES[next]));
    }
  };

  const { errors, result, stale, onSubmit, resultRef } = useCalculator({
    values: {
      transaction,
      buyer,
      currency,
      exchangeRate,
      amount,
      marketValue,
      givenValue,
      propertyNumber,
      route,
      giftRelation,
      pointsTransfer,
      expropriator,
      oneOff,
      firstHome,
      gbpRate,
      mortgageAmount,
      stampDuty,
      vat,
      vatKind,
      areaM2,
      seller,
      fixedFees,
    },
    schema,
    calculate: (values) => ({
      ...calculateTitleDeedFee(toInput(values)),
      currency: values.currency,
      exchangeRate: values.currency === 'TRY' ? 1 : values.exchangeRate ?? 1,
      transaction: values.transaction,
    }),
  });

  const inCurrency = (value: number) =>
    result && result.currency !== 'TRY'
      ? `≈ ${formatNumber(value / result.exchangeRate)} ${
          CURRENCIES.find((entry) => entry.value === result.currency)?.symbol ?? ''
        }`
      : undefined;
  const buyerLines = result?.lines.filter((line) => line.payer === 'buyer') ?? [];
  const sellerLines = result?.lines.filter((line) => line.payer === 'seller') ?? [];
  const hasNonLandOfficeLines = buyerLines.some((line) =>
    ['stamp', 'vat', 'permit'].includes(line.key),
  );
  const payerLabel =
    result?.transaction === 'mortgage'
      ? 'borçlunun'
      : result?.transaction === 'sale'
        ? 'alıcının'
        : result?.transaction === 'expropriation'
          ? 'kamulaştıranın'
          : 'devralanın';

  return (
    <>
      <ToolForm onSubmit={onSubmit}>
        <Fieldset legend="İşlem">
          <SelectField label="İşlem türü" value={transaction} onChange={setTransaction} options={TRANSACTIONS} />
          {showBuyer ? (
            <SelectField
              label={transaction === 'mortgage' ? 'Borçlunun uyruğu' : gift ? 'Bağış alanın uyruğu' : 'Alıcının uyruğu'}
              hint={buyer === 'tc' ? 'Hem KKTC hem TC vatandaşıysanız KKTC vatandaşı seçin.' : undefined}
              value={buyer}
              onChange={changeBuyer}
              options={BUYERS}
            />
          ) : null}
          {gift ? (
            <SelectField
              label="Kimden kime"
              value={giftRelation}
              onChange={setGiftRelation}
              options={GIFT_RELATIONS}
              wide
            />
          ) : null}
          {transaction === 'points' ? (
            <SelectField
              label="Devir şekli"
              value={pointsTransfer}
              onChange={setPointsTransfer}
              options={POINTS_TRANSFERS}
              wide
            />
          ) : null}
          {transaction === 'expropriation' ? (
            <SelectField
              label="Kamulaştıran"
              hint="Devletin kendi kamulaştırmaları için cetvelde harç öngörülmemiş."
              value={expropriator}
              onChange={setExpropriator}
              options={EXPROPRIATORS}
              wide
            />
          ) : null}
          {sale && !kktc ? (
            <>
              <SelectField
                label="Kaçıncı taşınmazınız"
                hint={
                  buyer === 'tc'
                    ? '52/2008 madde 8(1): KKTC’yi tanıyan ülke vatandaşları en çok 3 apartman dairesi alabilir. Cetvel 4–6. daireyi ilk üçü de apartman dairesiyse sayıyor.'
                    : '52/2008 madde 8(1): yabancılar kural olarak 1 taşınmaz alabilir. 2. ve 3. taşınmaz oranı önceki haklar için.'
                }
                value={propertyNumber}
                onChange={setPropertyNumber}
                options={propertyOptions(maxProperties)}
              />
              <SelectField
                label="Devir şekli"
                hint="Önce sözleşme kaydedilirse harcın bir kısmı kayıtta, kalanı devirde ödenir; toplam değişmez."
                value={route}
                onChange={setRoute}
                options={ROUTES}
              />
            </>
          ) : null}
        </Fieldset>

        <Fieldset legend="Tutar">
          <SelectField label="Para birimi" value={currency} onChange={setCurrency} options={CURRENCIES} />
          {currency !== 'TRY' ? (
            <NumberField
              label={`1 ${symbol} kaç TL`}
              hint="Harç TL olarak alınır. Tapu’da işlem günündeki kur esas alınır."
              error={errors.exchangeRate}
              value={exchangeRate}
              onChange={setExchangeRate}
              suffix="TL"
            />
          ) : null}
          <NumberField
            label={amountField.label}
            hint={amountField.hint}
            error={errors.amount}
            value={amount}
            onChange={setAmount}
            suffix={symbol}
          />
          {transaction === 'exchange' ? (
            <NumberField
              label="Verdiğiniz taşınmazın rayiç değeri"
              hint="Aldığınız daha değerliyse fark üzerinden ayrıca %4 alınır."
              error={errors.givenValue}
              value={givenValue}
              onChange={setGivenValue}
              suffix={symbol}
            />
          ) : null}
          {sale ? (
            <>
              <NumberField
                label="Rayiç değer (biliniyorsa)"
                hint="İlçe Tapu Amirliği’nin belirlediği değer. Satış bedelinden yüksekse harç bunun üzerinden alınır."
                error={errors.marketValue}
                value={marketValue}
                onChange={setMarketValue}
                suffix={symbol}
              />
              <NumberField
                label="Aynı işlemde konacak ipotek (varsa)"
                hint="Konut kredisi için konan ipoteğin tutarı. Harcı borçlu öder."
                error={errors.mortgageAmount}
                value={mortgageAmount}
                onChange={setMortgageAmount}
                suffix={symbol}
              />
            </>
          ) : null}
        </Fieldset>

        {showOneOff || showFirstHome ? (
          <Fieldset legend="İndirim ve muafiyet">
            {showOneOff ? (
              <CheckboxField
                label="Bir defalık %3 hakkımı bu işlemde kullanıyorum"
                hint="KKTC vatandaşları ömürde bir kez, bir ev (bir dönüm alanıyla) ve bir arsa — ya da arsa yerine bir dönüm tarla veya 300 m²’ye kadar işyeri — için %3 öder (A.E. 540/2024)."
                checked={oneOff}
                onChange={setOneOff}
                wide
              />
            ) : null}
            {showFirstHome ? (
              <>
                <CheckboxField
                  label="İlk konutumu Merkez Bankası destekli konut kredisiyle alıyorum"
                  hint={`Adına kayıtlı evi olmayan KKTC vatandaşı, düşük faizli TL konut kredisi başvurusu bankaca uygun görüldüyse satış ve ipotek harcının 100.000 £ karşılığına kadar olan kısmından muaf (${FIRST_HOME_EXEMPTION.untilLabel} kadar).`}
                  checked={firstHome}
                  onChange={setFirstHome}
                  wide
                />
                {firstHome && currency !== 'GBP' ? (
                  <NumberField
                    label="1 £ kaç TL"
                    hint="Devir günündeki Merkez Bankası efektif satış kuru."
                    error={errors.gbpRate}
                    value={gbpRate}
                    onChange={setGbpRate}
                    suffix="TL"
                  />
                ) : null}
              </>
            ) : null}
          </Fieldset>
        ) : null}

        <Fieldset legend="Diğer vergi ve harçlar">
          {sale ? (
            <>
              <CheckboxField
                label="Yazılı satış sözleşmesi yapılıyor (pul vergisi)"
                hint="Sözleşme bedelinin 89.000.000 TL’ye kadar kısmı binde 5, üstü binde 1 (Pul Yasası, 2/2026)."
                checked={stampDuty}
                onChange={setStampDuty}
                wide
              />
              <CheckboxField
                label="Satıcı KDV mükellefi (ör. müteahhitten yeni konut)"
                hint="İki kişi arasındaki ikinci el satışta KDV yoktur."
                checked={vat}
                onChange={setVat}
                wide
              />
              {vat ? (
                <>
                  <SelectField label="Taşınmazın türü" value={vatKind} onChange={setVatKind} options={VAT_KINDS} />
                  {vatKind === 'home' ? (
                    <NumberField
                      label="Kapalı alan"
                      hint={`${PROPERTY_VAT.largeHomeFromM2} m² ve üzeri konutta KDV %${PROPERTY_VAT.largeHome}, altında %${PROPERTY_VAT.standard}.`}
                      error={errors.areaM2}
                      value={areaM2}
                      onChange={setAreaM2}
                      suffix="m²"
                    />
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
          {sale || gift ? (
            <SelectField
              label={sale ? 'Satıcının gelir vergisi stopajı' : 'Bağışlayanın gelir vergisi stopajı'}
              hint="Tapu, devir sırasında elden çıkarandan keser (Gelir Vergisi Yasası madde 31(1)(i)-(j)). Eşe ve çocuğa bağışta kazanç aranmaz."
              value={seller}
              onChange={setSeller}
              options={SELLERS}
              wide
            />
          ) : null}
          <CheckboxField
            label="Sabit harçları ekle (tahmini)"
            hint={`Kayıt dilekçesi ${FIXED_FEES.petition} TL ve koçan veya ipotek sertifikası ${FIXED_FEES.certificate} TL (A.E. 217/2024, cetvel madde 2 ve 11). İşleme göre başka sabit harçlar da alınabilir.`}
            checked={fixedFees}
            onChange={setFixedFees}
            wide
          />
        </Fieldset>
      </ToolForm>

      <ResultsRegion ref={resultRef}>
        <StaleNotice show={stale} />

        {result ? (
          <>
            {result.baseFromMarketValue ? (
              <ToolNotice tone="info">
                Rayiç değer satış bedelinden yüksek olduğu için tapu harcı ve stopaj rayiç değer (
                {formatCurrency(result.base)}) üzerinden hesaplandı. Pul vergisi ve KDV sözleşme
                bedeli üzerinden.
              </ToolNotice>
            ) : null}

            {result.exemption ? (
              <ToolNotice tone="info">
                İlk konut muafiyeti: 100.000 £ = {formatCurrency(result.exemption.capTl)}. Bu kısım
                için ödenmeyen harç{' '}
                <strong className="font-semibold">
                  {formatCurrency(result.exemption.saleSaving + result.exemption.mortgageSaving)}
                </strong>
                . Muafiyet {FIRST_HOME_EXEMPTION.untilLabel} kadar geçerli ve bankanın verdiği hak
                sahipliği belgesinin Tapu’ya sunulmasına bağlı.
              </ToolNotice>
            ) : null}

            <ResultPanel
              title="Sonuç"
              note="Kesin tutarı İlçe Tapu Amirliği belirler: rayiç değeri Tapu saptar ve itiraz edilebilir."
            >
              {buyerLines.map((line) => (
                <ResultRow
                  key={line.key}
                  label={line.label}
                  value={formatCurrency(line.amount)}
                  hint={lineHint(line)}
                />
              ))}
              {hasNonLandOfficeLines ? (
                <ResultRow label="Tapu’ya ödenecek harç" value={formatCurrency(result.landOfficeTotal)} />
              ) : null}
              <ResultRow
                label={`Toplam (${payerLabel} ödediği)`}
                value={formatCurrency(result.total)}
                hint={inCurrency(result.total)}
                emphasis
              />
            </ResultPanel>

            {sellerLines.length ? (
              <ResultPanel
                title={result.transaction === 'gift' ? 'Bağışlayanın ödediği' : 'Satıcının ödediği'}
                note="Kazanç, satış bedeli ile rayiç değerden yüksek olanın %20’si sayılır; kişilerde bunun %30’u indirilir ve kalan üzerinden %20 kesilir. Kesinti kesin vergidir, yıl sonunda başka gelirlerle birleştirilmez."
              >
                {sellerLines.map((line) => (
                  <ResultRow
                    key={line.key}
                    label={line.label}
                    value={formatCurrency(line.amount)}
                    hint={lineHint(line)}
                    emphasis
                  />
                ))}
              </ResultPanel>
            ) : null}

            {result.lines.some((line) => line.key === 'permit') ? (
              <ToolNotice tone="info">
                Satın alma izni hizmet harcı {MINIMUM_WAGE.effectiveLabel} asgari ücreti (
                {formatCurrency(MINIMUM_WAGE.grossMonthly)}) üzerinden hesaplandı ve başvuru günündeki
                asgari ücrete göre değişir.
              </ToolNotice>
            ) : null}
          </>
        ) : null}
      </ResultsRegion>
    </>
  );
}
