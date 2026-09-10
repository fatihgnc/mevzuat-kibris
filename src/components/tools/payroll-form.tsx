'use client';

import Link from 'next/link';
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
import { MINIMUM_WAGE } from '@/lib/tools/constants';
import { formatCurrency, formatPercent } from '@/lib/tools/format';
import {
  ACCIDENT_RATE_RANGE,
  calculatePayroll,
  SGK_CEILING_MULTIPLIER,
  type InsuranceScheme,
  type Nationality,
} from '@/lib/tools/payroll';
import { requiredAmount } from '@/lib/tools/validation';

const schema = z.object({
  wage: requiredAmount('Aylık brüt ücreti girin.'),
  scheme: z.enum(['sgk', 'legacy']),
  nationality: z.enum(['equal', 'other']),
  accidentRate: requiredAmount('İş kazası prim oranını girin.'),
  minimumWage: requiredAmount('Yürürlükteki brüt asgari ücreti girin.'),
});

export function PayrollForm() {
  const [wage, setWage] = useState('');
  const [scheme, setScheme] = useState<InsuranceScheme>('sgk');
  const [nationality, setNationality] = useState<Nationality>('equal');
  const [accidentRate, setAccidentRate] = useState(String(ACCIDENT_RATE_RANGE.min));
  const [minimumWage, setMinimumWage] = useState(String(MINIMUM_WAGE.grossMonthly));

  const { errors, result, stale, onSubmit, resultRef } = useCalculator({
    values: { wage, scheme, nationality, accidentRate, minimumWage },
    schema,
    calculate: (input) =>
      calculatePayroll({
        grossMonthlyWage: input.wage,
        scheme: input.scheme,
        nationality: input.nationality,
        accidentRate: input.accidentRate,
        minimumWage: input.minimumWage,
      }),
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
            Gelir vergisi (stopaj) bu hesaba dahil değildir. Vergi, 24/1982 Gelir Vergisi
            Yasası&apos;nın dilim ve şahsi indirim kurallarına bağlıdır. Asgari ücret düzeyinde
            vergi çıkmadığı için Çalışma Dairesi&apos;nin ilan ettiği net bu hesapla birebir tutar;
            daha yüksek ücretlerde ele geçen tutar aşağıdakinden düşük olur.
          </ToolNotice>

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
              emphasis
            />
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
