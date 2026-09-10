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
import { formatCurrency, formatNumber } from '@/lib/tools/format';
import {
  calculateWorkPermitPenalty,
  PENALTY_KINDS,
  type PenaltyKind,
} from '@/lib/tools/work-permit-penalty';
import { requiredAmount } from '@/lib/tools/validation';

const OCCURRENCE_OPTIONS = [
  { value: '1' as const, label: 'Aynı yıl içindeki ilk tespit' },
  { value: '2' as const, label: 'Aynı yıl içindeki 2. tespit' },
  { value: '3' as const, label: 'Aynı yıl içindeki 3. ve sonraki tespit' },
];

const schema = z.object({
  kind: z.enum([
    'unlicensed-employment',
    'termination-not-reported',
    'inspection',
    'regulation',
  ]),
  count: requiredAmount('Kişi sayısını girin.'),
  occurrence: z.enum(['1', '2', '3']),
  stopped: z.boolean(),
  minimumWage: requiredAmount('Yürürlükteki brüt asgari ücreti girin.'),
});

export function WorkPermitPenaltyForm() {
  const [kind, setKind] = useState<PenaltyKind>('unlicensed-employment');
  const [count, setCount] = useState('1');
  const [occurrence, setOccurrence] = useState<'1' | '2' | '3'>('1');
  const [stopped, setStopped] = useState(false);
  const [minimumWage, setMinimumWage] = useState(String(MINIMUM_WAGE.grossMonthly));

  const unlicensed = kind === 'unlicensed-employment';

  const { errors, result, stale, onSubmit, resultRef } = useCalculator({
    values: { kind, count, occurrence, stopped, minimumWage },
    schema,
    calculate: (input) =>
      calculateWorkPermitPenalty({
        kind: input.kind,
        count: input.count,
        minimumWage: input.minimumWage,
        occurrenceInYear:
          input.kind === 'unlicensed-employment' ? (Number(input.occurrence) as 1 | 2 | 3) : 1,
        previouslyReportedStopped: input.kind === 'unlicensed-employment' && input.stopped,
      }),
  });

  return (
    <>
      <ToolForm onSubmit={onSubmit}>
        <Fieldset legend="İhlal">
          <SelectField
            label="Tespit edilen aykırılık"
            value={kind}
            onChange={setKind}
            options={PENALTY_KINDS.map((entry) => ({ value: entry.kind, label: entry.label }))}
            wide
          />
          <NumberField
            label={unlicensed ? 'İzinsiz çalıştırılan kişi sayısı' : 'Aykırı husus sayısı'}
            hint={
              unlicensed
                ? 'Ceza kişi başı uygulanır (madde 24(2)(Ç)).'
                : 'Tüzük ihlalinde her aykırı husus için ayrı ceza uygulanır (madde 24(2)(B)).'
            }
            error={errors.count}
            value={count}
            onChange={setCount}
          />
          <NumberField
            label="Yürürlükteki aylık brüt asgari ücret"
            hint={`${MINIMUM_WAGE.effectiveLabel} itibarıyla ${formatCurrency(MINIMUM_WAGE.grossMonthly)} (Çalışma Dairesi). Değiştiyse buradan güncelleyin.`}
            error={errors.minimumWage}
            value={minimumWage}
            onChange={setMinimumWage}
            suffix="TL"
          />
        </Fieldset>

        {unlicensed ? (
          <Fieldset legend="Artırım">
            <SelectField
              label="Aynı yıl içinde kaçıncı tespit"
              hint="Madde 24(2)(Ç) artırımı işverenin bütün geçmişini değil, aynı yıl içindeki tekrarları sayar."
              value={occurrence}
              onChange={setOccurrence}
              options={OCCURRENCE_OPTIONS}
            />
            <CheckboxField
              label="İşçi daha önce aynı işveren tarafından “işten durdurulmuş” olarak bildirilmişti"
              hint="Madde 24(2)(D): bu durumda ceza bir kat daha artırılır."
              checked={stopped}
              onChange={setStopped}
            />
          </Fieldset>
        ) : null}
      </ToolForm>

      <ResultsRegion ref={resultRef}>
        <StaleNotice show={stale} />

        {result ? (
          <>
            {result.warningFirst ? (
              <ToolNotice tone="info">
                Madde 24(1): bu aykırılıkta önce işverene, aykırı hususların on beş gün içinde
                düzeltilmesi için yazılı uyarı yapılır. İdari para cezası ancak süre sonunda
                aykırılık düzeltilmezse uygulanır.
              </ToolNotice>
            ) : null}

            <ResultPanel
              title="Sonuç"
              note="İdari para cezasının süresinde ödenmemesi halinde gecikme zammı işler; burada yalnızca ana tutar hesaplanıyor."
            >
              <ResultRow
                label="Uygulanan kat"
                value={`${formatNumber(result.multiplierPerUnit)} kat`}
                hint={result.breakdown.join(' ')}
              />
              <ResultRow
                label={unlicensed ? 'Kişi sayısı' : 'Husus sayısı'}
                value={formatNumber(result.count)}
              />
              <ResultRow
                label="İdari para cezası"
                value={formatCurrency(result.administrativeFine)}
                emphasis
              />
              <ResultRow
                label="Mahkemeye giderse azami para cezası"
                value={formatCurrency(result.court.maxFine)}
                hint={
                  unlicensed
                    ? `Madde 25(2): izinsiz çalıştırılan her kişi için asgari ücretin ${result.court.maxMultiplier} katına kadar para cezası veya ${result.court.maxPrisonYears} yıla kadar hapis veya her ikisi. Tüzel kişide direktör de aynı suçu işlemiş sayılır.`
                    : `Madde 25(1): mahkûmiyet halinde asgari ücretin ${result.court.maxMultiplier} katına kadar para cezası.`
                }
              />
            </ResultPanel>
          </>
        ) : null}
      </ResultsRegion>
    </>
  );
}
