'use client';

import { useEffect, useRef, useState } from 'react';

import type { ExchangeRates, RateCurrency, RateKind } from '@/lib/tools/exchange-rates';

interface RatesResponse extends ExchangeRates {
  source: string;
}

/* One request per page load, shared by every field that asks. */
let request: Promise<RatesResponse | null> | null = null;

function loadRates(): Promise<RatesResponse | null> {
  request ??= fetch('/api/exchange-rates')
    .then((response) => (response.ok ? (response.json() as Promise<RatesResponse>) : null))
    .then((data) => (data?.rates ? data : null))
    .catch(() => null);
  return request;
}

/** The day's rates, or `null` while loading or when the bank could not be reached. */
export function useExchangeRates(): RatesResponse | null {
  const [rates, setRates] = useState<RatesResponse | null>(null);
  useEffect(() => {
    let active = true;
    void loadRates().then((loaded) => {
      if (active) setRates(loaded);
    });
    return () => {
      active = false;
    };
  }, []);
  return rates;
}

/**
 * Prefills a rate field with the day's rate for `currency`.
 *
 * A rate the reader typed is kept while the currency stays the same, so a
 * late response never overwrites it; switching currency always refills,
 * because the old figure belongs to another currency. Returns a hint naming
 * the source while the shown value is the prefilled one.
 */
export function useAutoRate(
  rates: RatesResponse | null,
  currency: string,
  value: string,
  setValue: (value: string) => void,
  kind: RateKind = 'forex',
): string | undefined {
  const table = kind === 'banknote' ? rates?.banknoteRates : rates?.rates;
  const suggested = table?.[currency as RateCurrency];
  const suggestedText = suggested === undefined ? null : String(suggested);
  const autoValue = useRef<string | null>(null);
  const filledCurrency = useRef<string | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (suggestedText === null) return;
    const current = valueRef.current;
    const currencyChanged = filledCurrency.current !== null && filledCurrency.current !== currency;
    if (current === '' || current === autoValue.current || currencyChanged) {
      autoValue.current = suggestedText;
      filledCurrency.current = currency;
      setValue(suggestedText);
    }
  }, [suggestedText, currency, setValue]);

  if (!rates || suggestedText === null || value !== suggestedText) return undefined;
  return `${rates.source}, ${rates.date} ${kind === 'banknote' ? 'efektif' : 'döviz'} satış kuru; değiştirebilirsiniz.`;
}
