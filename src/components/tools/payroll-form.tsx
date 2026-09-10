'use client';

import Link from 'next/link';
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
import { formatCurrency, formatPercent } from '@/lib/tools/format';
import {
  ACCIDENT_RATE_RANGE,
  calculatePayroll,
  SGK_CEILING_MULTIPLIER,
  type InsuranceScheme,
  type Nationality,
} from '@/lib/tools/payroll';
import {
  calculateIncomeTax,
  INCOME_TAX_YEAR,
  PERSONAL_ALLOWANCE,
  SOCIAL_DEDUCTION_CAP_RATE,
  SPECIAL_ALLOWANCE_RATE,
  type Disability,
} from '@/lib/tools/income-tax';
import { optionalWholeCount, requiredAmount } from '@/lib/tools/validation';

const schema = z.object({
  wage: requiredAmount('Aylık brüt ücreti girin.'),
  scheme: z.enum(['sgk', 'legacy']),
  nationality: z.enum(['equal', 'other']),
  accidentRate: requiredAmount('İş kazası prim oranını girin.'),
  minimumWage: requiredAmount('Yürürlükteki brüt asgari ücreti girin.'),
  salaries: z.enum(['12', '13']),
  spouse: z.enum(['no', 'yes']),
  childrenA: optionalWholeCount(),
  childrenB: optionalWholeCount(),
  childrenC: optionalWholeCount(),
  disability: z.enum(['none', '50', '100']),
  over65: z.boolean(),
});

export function PayrollForm() {
  const [wage, setWage] = useState('');
  const [scheme, setScheme] = useState<InsuranceScheme>('sgk');
  const [nationality, setNationality] = useState<Nationality>('equal');
  const [accidentRate, setAccidentRate] = useState(String(ACCIDENT_RATE_RANGE.min));
  const [minimumWage, setMinimumWage] = useState(String(MINIMUM_WAGE.grossMonthly));
  const [salaries, setSalaries] = useState<'12' | '13'>('12');
  const [spouse, setSpouse] = useState<'no' | 'yes'>('no');
  const [childrenA, setChildrenA] = useState('');
  const [childrenB, setChildrenB] = useState('');
  const [childrenC, setChildrenC] = useState('');
  const [disability, setDisability] = useState<Disability>('none');
  const [over65, setOver65] = useState(false);

  const { errors, result, stale, onSubmit, resultRef } = useCalculator({
    values: {
      wage,
      scheme,
      nationality,
      accidentRate,
      minimumWage,
      salaries,
      spouse,
      childrenA,
      childrenB,
      childrenC,
      disability,
      over65,
    },
    schema,
    calculate: (input) => {
      const payroll = calculatePayroll({
        grossMonthlyWage: input.wage,
        scheme: input.scheme,
        nationality: input.nationality,
        accidentRate: input.accidentRate,
        minimumWage: input.minimumWage,
      });
      const tax = calculateIncomeTax({
        grossMonthlyWage: input.wage,
        socialContributions: payroll.totalEmployeeDeduction,
        salariesPerYear: input.salaries === '13' ? 13 : 12,
        spouse: input.spouse === 'yes',
        childrenA: input.childrenA,
        childrenB: input.childrenB,
        childrenC: input.childrenC,
        disability: input.disability,
        over65: input.over65,
      });
      return { ...payroll, tax, net: payroll.netBeforeTax - tax.tax };
    },
  });

  return (
    <>
      <ToolForm onSubmit={onSubmit}>
        <Fieldset legend="Ücret ve sigortalılık">
          <NumberField
            label="Aylık brüt ücret"
            hint="73/2007 madde 82: hayat pahalılığı, aile yardımı, komisyon ve servis ücreti gibi ödemeler de prime esas kazanca dahildir."
            error={errors.wage}
            value={wage}
            onChange={setWage}
            suffix="TL"
          />
          <SelectField
            label="İlk kez ne zaman sigortalı oldunuz"
            hint="73/2007 Sosyal Güvenlik Yasası 1 Ocak 2008’de yürürlüğe girdi; o tarihte hâlihazırda sigortalı olanlar eski sisteme bağlı kalmaya devam etti."
            value={scheme}
            onChange={setScheme}
            options={[
              { value: 'sgk', label: '1 Ocak 2008 veya sonrası — 73/2007 Sosyal Güvenlik Yasası' },
              { value: 'legacy', label: '1 Ocak 2008 öncesi — 16/1976 Sosyal Sigortalar Yasası' },
            ]}
          />
          {/*
            * Asked only under 73/2007: the YGK 83/2026 split does not touch
            * the old scheme, and asking there would suggest the answer
            * changes something.
            */}
          {scheme === 'sgk' ? (
            <SelectField
              label="Vatandaşlık"
              hint="YGK 83/2026 (29 Temmuz 2026’dan itibaren): KKTC ile işlem eşitliği sağlayan sosyal güvenlik anlaşması olmayan ülke vatandaşlarının sigortalı hissesi %13’tür ve işsizlik primi uygulanmaz."
              value={nationality}
              onChange={setNationality}
              options={[
                { value: 'equal', label: 'KKTC veya anlaşmalı ülke (ör. TC) vatandaşı' },
                { value: 'other', label: 'Diğer ülke vatandaşı' },
              ]}
            />
          ) : null}
        </Fieldset>

        <Fieldset legend="Gelir vergisi">
          <SelectField
            label="Yıllık maaş sayısı"
            hint="Vergi Dairesi aylık dilimleri ve indirimleri yıllık tutarların maaş sayısına bölümüyle uygular."
            value={salaries}
            onChange={setSalaries}
            options={[
              { value: '12', label: '12 maaş' },
              { value: '13', label: '13 maaş (ikramiyeli)' },
            ]}
          />
          <SelectField
            label="Eş indirimi"
            hint="Madde 12(2): KKTC’de sürekli olarak sizinle birlikte yaşayan eş için kişisel indirimin %8’i."
            value={spouse}
            onChange={setSpouse}
            options={[
              { value: 'no', label: 'Yok' },
              { value: 'yes', label: 'Birlikte yaşadığım eşim var' },
            ]}
          />
          {/*
            * The three child fields sit in one bordered group so the warning
            * visibly belongs to them rather than floating between fields.
            */}
          <div className="rounded-lg border border-line p-4 sm:col-span-2">
            <p className="m-0 text-base font-medium text-ink">Çocuk indirimi</p>
            <p
              role="note"
              className="m-0 mt-2 rounded border border-notice-border bg-notice px-3 py-2 text-sm leading-[1.5] text-notice-ink"
            >
              <strong className="font-semibold">Dikkat:</strong> Her çocuk yalnızca bir gruba
              girer. Aynı çocuğu birden fazla alana yazmayın; okul durumuna uyan alana yazın.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <NumberField
                label="Okula gitmeyen (16 yaş ve altı) veya ilkokuldaki çocuk sayısı"
                hint="Madde 13(1)(A): çocuk başı kişisel indirimin %6’sı."
                error={errors.childrenA}
                value={childrenA}
                onChange={setChildrenA}
                suffix="çocuk"
              />
              <NumberField
                label="Ortaöğretimdeki (20 yaş ve altı), askerdeki veya sürekli sakat çocuk sayısı"
                hint="Madde 13(1)(B): çocuk başı kişisel indirimin %8’i. Ortaokuldaki çocuklar da buraya girer."
                error={errors.childrenB}
                value={childrenB}
                onChange={setChildrenB}
                suffix="çocuk"
              />
              <NumberField
                label="Yükseköğretimde çocuk sayısı"
                hint="Madde 13(1)(C): çocuk başı kişisel indirimin %11’ine kadar, harcanan eğitim gideri kadar. Üst sınır varsayıldı."
                error={errors.childrenC}
                value={childrenC}
                onChange={setChildrenC}
                suffix="çocuk"
              />
            </div>
          </div>
          <SelectField
            label="Sakatlık"
            hint="Madde 15(1): Sağlık Kurulu raporuyla belgelenen çalışma gücü kaybı."
            value={disability}
            onChange={setDisability}
            options={[
              { value: 'none', label: 'Yok' },
              { value: '50', label: 'En az %50 çalışma gücü kaybı' },
              { value: '100', label: '%100 çalışma gücü kaybı' },
            ]}
          />
          <CheckboxField
            label="65 yaşını doldurdum"
            hint="Madde 15(2): sakatlık indirimi alınmıyorsa kişisel indirimin %5’i."
            checked={over65}
            onChange={setOver65}
          />
        </Fieldset>

        <Fieldset legend="İşveren tarafı">
          <NumberField
            label="İş kazası ve meslek hastalığı prim oranı"
            hint={`Tehlike sınıfına göre %${ACCIDENT_RATE_RANGE.min} ile %${ACCIDENT_RATE_RANGE.max} arası; işyerinize bildirilen oranı Sosyal Sigortalar Dairesi’nden öğrenebilirsiniz. Yalnızca işveren maliyetini etkiler.`}
            error={errors.accidentRate}
            value={accidentRate}
            onChange={setAccidentRate}
            suffix="%"
          />
          <NumberField
            label="Yürürlükteki aylık brüt asgari ücret"
            hint={`${MINIMUM_WAGE.effectiveLabel} itibarıyla ${formatCurrency(MINIMUM_WAGE.grossMonthly)}. Prim taban ve tavanının dayanağı.`}
            error={errors.minimumWage}
            value={minimumWage}
            onChange={setMinimumWage}
            suffix="TL"
          />
        </Fieldset>
      </ToolForm>

      <ResultsRegion ref={resultRef}>
        <StaleNotice show={stale} />

        {result ? (
        <>
          <ToolNotice tone="info">
            Gelir vergisi, {INCOME_TAX_YEAR} yılı dilimleri ve kişisel indirimi (
            {formatCurrency(PERSONAL_ALLOWANCE)}) ile aylık stopaj olarak hesaplandı; tek işverenden
            ücret alındığı ve yıl boyu KKTC&apos;de yerleşik olunduğu varsayıldı. %
            {SPECIAL_ALLOWANCE_RATE} özel indirim, madde 14(1)&apos;in lafzına uygun olarak brüt
            ücret üzerinden uygulandı. Yıl sonu beyannamesiyle kesin vergi farklı olabilir.
          </ToolNotice>

          {result.tax.socialDeductionCapped ? (
            <ToolNotice tone="notice">
              Sosyal güvence kesintilerinin yalnızca brüt ücretin %{SOCIAL_DEDUCTION_CAP_RATE}’ü
              kadarı vergi matrahından indirilebiliyor (madde 7(1)(f)); aşan kısım vergiden
              düşülmedi.
            </ToolNotice>
          ) : null}

          <ToolNotice tone="info">
            Temmuz–Eylül 2026 döneminde YGK 82/2026 ile işveren hissesine koşullu, geçici bir
            prim desteği uygulanıyor; desteğin oranı sigortalının cinsiyetine, vatandaşlığına ve
            sektöre göre değiştiği için işveren maliyetine yansıtılmadı. Ayrıntılar{' '}
            <Link href="/karar/2026-uki-1608-2026-temmuz-2026-eylul-2026-donemi-sosyal-guvenlik-yasasi-kapsaminda">
              Resmî Gazete kaydında
            </Link>
            .
          </ToolNotice>

          {result.ceilingApplied ? (
            <ToolNotice tone="info">
              Ücret, 73/2007 madde 83 uyarınca prime esas kazancın üst sınırını (brüt asgari ücretin{' '}
              {SGK_CEILING_MULTIPLIER} katı) aşıyor. Sosyal sigorta primleri{' '}
              {formatCurrency(result.contributionBase)} üzerinden hesaplandı.
            </ToolNotice>
          ) : null}

          {result.floorApplied ? (
            <ToolNotice tone="info">
              Ücret prime esas kazancın alt sınırının altında. Madde 83(3): aradaki farka ait
              sigortalı, işveren ve Devlet paylarının tümünü işveren öder.
            </ToolNotice>
          ) : null}

          <ResultPanel
            title="Kesintiler"
            note={
              result.scheme === 'legacy'
                ? '16/1976 madde 88’de prime esas kazancın üst sınırı yasada formülle değil Bakanlar Kurulu kararıyla saptanır; bu rejimde tavan uygulanmadı.'
                : undefined
            }
          >
            <ResultRow label="Brüt maaş" value={formatCurrency(result.grossMonthlyWage)} />
            <ResultRow
              label="Prime esas kazanç"
              value={formatCurrency(result.contributionBase)}
              hint={
                result.ceiling !== null
                  ? `Tavan: ${formatCurrency(result.ceiling)} (brüt asgari ücret × ${SGK_CEILING_MULTIPLIER})`
                  : undefined
              }
            />
            <ResultRow
              label="Sosyal sigorta kesintisi"
              value={formatCurrency(result.socialSecurity.employeeAmount)}
              hint={`Sigortalı hissesi ${formatPercent(result.socialSecurity.employeeRate)}`}
            />
            <ResultRow
              label="İhtiyat Sandığı kesintisi"
              value={formatCurrency(result.provident.employeeAmount)}
              hint={`İşçi primi ${formatPercent(result.provident.employeeRate)} — brüt ücretin tamamı üzerinden, prim tavanı uygulanmadan.`}
            />
            <ResultRow
              label="Toplam kesinti"
              value={formatCurrency(result.totalEmployeeDeduction)}
            />
            <ResultRow
              label="Vergi öncesi ele geçen"
              value={formatCurrency(result.netBeforeTax)}
            />
            <ResultRow
              label="Gelir vergisi"
              value={formatCurrency(result.tax.tax)}
              hint={
                result.tax.tax > 0
                  ? `En yüksek dilim %${result.tax.marginalRate}`
                  : 'Matrah indirimlerin altında kaldı.'
              }
            />
            <ResultRow label="Net maaş" value={formatCurrency(result.net)} emphasis />
          </ResultPanel>

          <ResultPanel title="Gelir vergisi hesabı">
            <ResultRow label="Brüt maaş" value={formatCurrency(result.grossMonthlyWage)} />
            <ResultRow
              label="Sosyal güvence kesintileri"
              value={`− ${formatCurrency(result.tax.socialDeduction)}`}
              hint={`Madde 7(1)(f): en fazla brüt ücretin %${SOCIAL_DEDUCTION_CAP_RATE}’ü`}
            />
            <ResultRow
              label="Özel indirim"
              value={`− ${formatCurrency(result.tax.specialAllowance)}`}
              hint={`Madde 14(1): brüt ücretin %${SPECIAL_ALLOWANCE_RATE}’u`}
            />
            {result.tax.allowances.map((line) => (
              <ResultRow key={line.label} label={line.label} value={`− ${formatCurrency(line.amount)}`} />
            ))}
            <ResultRow label="Vergi matrahı" value={formatCurrency(result.tax.taxableBase)} />
            {result.tax.largeFamilyRate > 0 ? (
              <>
                <ResultRow
                  label="Hesaplanan vergi"
                  value={formatCurrency(result.tax.taxBeforeReduction)}
                />
                <ResultRow
                  label="Çok çocuk indirimi"
                  value={`− ${formatCurrency(result.tax.largeFamilyReduction)}`}
                  hint={`Madde 13(1)(D): verginin %${result.tax.largeFamilyRate}’i`}
                />
              </>
            ) : null}
            <ResultRow label="Gelir vergisi" value={formatCurrency(result.tax.tax)} emphasis />
          </ResultPanel>

          <ResultPanel title="İşverene maliyet">
            <ResultRow label="Brüt maaş" value={formatCurrency(result.grossMonthlyWage)} />
            <ResultRow
              label="Sosyal sigorta işveren payı"
              value={formatCurrency(result.socialSecurity.employerAmount)}
              hint={`${formatPercent(result.socialSecurity.employerRate)} (iş kazası primi dahil)`}
            />
            <ResultRow
              label="İhtiyat Sandığı işveren depoziti"
              value={formatCurrency(result.provident.employerAmount)}
              hint={formatPercent(result.provident.employerRate)}
            />
            <ResultRow label="Toplam maliyet" value={formatCurrency(result.employerCost)} emphasis />
          </ResultPanel>

          <section
            aria-labelledby="prim-dagilimi"
            className="mt-6 overflow-x-auto rounded-lg border border-line bg-surface p-5 sm:p-6"
          >
            <h2 id="prim-dagilimi" className="m-0 text-3xl font-semibold tracking-tighter text-ink">
              Sigorta kolu bazında prim dağılımı
            </h2>
            <table className="mt-4 w-full min-w-[34em] border-collapse text-base">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th className="py-2 pr-4 font-normal">Sigorta kolu</th>
                  <th className="py-2 pr-4 text-right font-normal">Toplam</th>
                  <th className="py-2 pr-4 text-right font-normal">Sigortalı</th>
                  <th className="py-2 pr-4 text-right font-normal">İşveren</th>
                  <th className="py-2 text-right font-normal">Devlet</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((line) => (
                  <tr key={line.branch} className="border-b border-line-soft last:border-b-0">
                    <td className="py-2.5 pr-4 text-ink-body">
                      {line.branch}
                      {line.note ? (
                        <span className="mt-0.5 block text-sm text-ink-muted">{line.note}</span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                      {formatPercent(line.total)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                      {formatPercent(line.employee)}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-ink">
                      {formatPercent(line.employer)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-ink">
                      {formatPercent(line.state)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
        ) : null}
      </ResultsRegion>
    </>
  );
}
