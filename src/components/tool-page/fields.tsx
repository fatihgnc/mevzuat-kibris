'use client';

import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { z } from 'zod';

import {
  caretAfterDigits,
  countDigits,
  formatNumberInput,
  normalizeTypedSeparator,
  toCanonicalNumber,
} from '@/lib/tools/number-input';
import { fieldErrors } from '@/lib/tools/validation';
import { cn } from '@/lib/utils';

/**
 * Hesaplayıcı formlarının ortak parçaları.
 *
 * Yedi form aynı üç şeyi istiyor: tarih, para ve sayı. Ortak tutulmalarının
 * sebebi tutarlı görünüm değil, tutarlı DAVRANIŞ: etiketin girdiye `htmlFor` ile
 * bağlanması, yardım metninin `aria-describedby` ile okunması ve `inputMode`in
 * telefonda doğru klavyeyi açması, kopyalanan her formda yeniden unutulabilecek
 * şeyler.
 */

const CONTROL =
  'w-full rounded border border-line-strong bg-surface px-3 py-2.5 text-md text-ink outline-none placeholder:text-ink-placeholder focus:border-ink';

/** Hatalı alanın kenarlığı. Renk tek başına yetmiyor; mesaj da altında duruyor. */
const INVALID = 'border-danger-border focus:border-danger-border';

/**
 * Açılır listenin oku.
 *
 * Tarayıcının kendi oku `appearance-none` ile kaldırılıp yerine GERÇEK BİR SVG
 * konuyor. Sebebi biçim değil KONUM: Chrome kendi okunu kutunun sağ kenarına
 * yapıştırıyor ve `padding-right` onu içeri itmiyor, ok kenarın dibinde
 * kalıyordu. Buradaki ok `right-3` ile duruyor, yani metnin sol kenarındaki
 * boşluğun aynısı sağda da var.
 *
 * ARKA PLAN GÖRSELİ OLARAK DEĞİL. Önce oku veri URI'li bir arka plan görseli
 * sınıfıyla çizmek denendi ve üç ayrı şey kırdı:
 *
 *  1. tailwind-merge, arka plan görseli sınıfını arka plan RENGİ sınıfıyla aynı
 *     grupta sayıp rengi eledi; select `appearance-none` yüzünden kendi rengini
 *     de kaybedince koyu temada tarayıcının gri varsayılanına düştü.
 *  2. Sınıfa tip ipucu eklenince derleyici, üretilen CSS'teki veri URI'sini bir
 *     modül gibi çözmeye çalışıp derlemeyi tamamen bozdu.
 *  3. Tailwind KAYNAK DOSYALARI TARIYOR: o sınıfın adı bir yorum satırında
 *     geçtiğinde bile karşılığı üretiliyor. Bu yüzden burada sınıfın kendisi
 *     yazılmıyor, ne yaptığı anlatılıyor.
 *
 * Bir öğe olarak çizilince üçü de yok: arka plan sınıfına dokunulmuyor ve renk
 * `currentColor`dan geliyor, yani tema başına ayrı bir kopya da gerekmiyor.
 */
const SELECT_CONTROL = 'appearance-none pr-9';

function SelectChevron() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 12 8"
      className="pointer-events-none absolute right-3 top-1/2 h-2 w-3 -translate-y-1/2 text-ink-muted"
    >
      <path
        d="M1 1.5L6 6.5L11 1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Fieldset({
  legend,
  children,
  className,
}: {
  legend: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('m-0 border-0 p-0', className)}>
      <legend className="mb-3 p-0 text-xs text-ink-faint">{legend}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

interface FieldShellProps {
  label: string;
  hint?: string;
  /** Doğrulama mesajı — alanın altında, ipucunun üstünde. */
  error?: string;
  /** İki sütunlu ızgarada tam genişlik kaplasın mı. */
  wide?: boolean;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
}

function FieldShell({ label, hint, error, wide, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', wide && 'sm:col-span-2')}>
      <label htmlFor={id} className="text-base font-medium text-ink">
        {label}
      </label>

      {/*
       * `aria-describedby` HEM hatayı hem ipucunu gösteriyor, hata önce.
       * Ekran okuyucu alana geldiğinde önce neyin yanlış olduğunu, sonra alanın
       * ne istediğini duyuyor.
       */}
      {children({
        id,
        describedBy: [errorId, hintId].filter(Boolean).join(' ') || undefined,
        invalid: Boolean(error),
      })}

      {error ? (
        <p id={errorId} className="m-0 text-sm font-medium leading-[1.5] text-danger-ink">
          {error}
        </p>
      ) : null}

      {hint ? (
        <p id={hintId} className="m-0 text-sm leading-[1.5] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function DateField({
  label,
  hint,
  error,
  value,
  onChange,
  wide,
  max,
}: {
  label: string;
  hint?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  max?: string;
}) {
  return (
    <FieldShell label={label} hint={hint} error={error} wide={wide}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          type="date"
          value={value}
          max={max}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(CONTROL, invalid && INVALID)}
        />
      )}
    </FieldShell>
  );
}

/**
 * Sayı girdisi — yazarken binlik ayracı ekliyor.
 *
 * `type="number"` DEĞİL, `type="text"`. Sayı girdisi biçimlendirilmiş metin
 * taşıyamıyor: "70.893" değeri tarayıcı için geçersiz, alan boş görünüyor ve
 * `value` boş string dönüyor. Metin girdisi + `inputMode="decimal"` telefonda
 * aynı sayısal klavyeyi açıyor, üstelik nokta ve virgülü de veriyor.
 *
 * `value` prop'u KANONİK metin (70893.5), ekranda görünen ise Türkçe biçimi
 * (70.893,5). Çeviri iki yönde de burada yapılıyor, böylece formların state'i
 * doğrudan `Number()`'a verilebilir kalıyor.
 */
export function NumberField({
  label,
  hint,
  error,
  value,
  onChange,
  wide,
  suffix,
  placeholder,
}: {
  label: string;
  hint?: string;
  error?: string;
  /** Kanonik sayı metni: rakamlar ve ondalık ayracı olarak nokta. */
  value: string;
  onChange: (value: string) => void;
  wide?: boolean;
  /** "TL", "saat", "gün" — girdinin sağında gri metin. */
  suffix?: string;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);

  /*
   * Kontrollü bir girdide değeri React yazdığında tarayıcı imleci sona atıyor.
   * `useLayoutEffect` boyama öncesinde çalıştığı için imleç sıçraması ekrana
   * hiç yansımıyor; `useEffect` ile bir kare boyunca görünürdü.
   */
  useLayoutEffect(() => {
    const element = inputRef.current;
    const caret = caretRef.current;
    if (element && caret !== null) {
      element.setSelectionRange(caret, caret);
      caretRef.current = null;
    }
  });

  const previousDisplay = formatNumberInput(value);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const element = event.target;
    const caret = element.selectionStart ?? element.value.length;

    /*
     * Yazılan ayraç önce virgüle çevriliyor; ondan sonrası için metindeki her
     * nokta bizim koyduğumuz binlik ayracıdır. Bu ayrım olmadan "15.000"un
     * sonundan bir rakam silmek sayıyı 15'e düşürüyordu.
     */
    const typed = normalizeTypedSeparator(element.value, previousDisplay, caret);
    const beforeCaret = typed.slice(0, caret);

    const canonical = toCanonicalNumber(typed);
    const display = formatNumberInput(canonical);
    const nextCaret = caretAfterDigits(
      display,
      countDigits(beforeCaret),
      beforeCaret.endsWith(','),
    );

    /*
     * DOM doğrudan güncelleniyor, çünkü kanonik değer değişmediğinde (harf
     * yazmak, ikinci bir virgül basmak) React yeniden render etmiyor ve
     * girdide kullanıcının bastığı geçersiz karakter kalıyordu.
     */
    element.value = display;
    element.setSelectionRange(nextCaret, nextCaret);
    caretRef.current = nextCaret;

    onChange(canonical);
  };

  return (
    <FieldShell label={label} hint={hint} error={error} wide={wide}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <input
            id={id}
            ref={inputRef}
            type="text"
            /*
             * `inputMode="decimal"`: telefonda sayısal klavye açılıyor. Metin
             * girdisinde bu tek yol; `type="number"` gibi bir yedeği yok.
             */
            inputMode="decimal"
            autoComplete="off"
            value={previousDisplay}
            placeholder={placeholder}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            onChange={handleChange}
            className={cn(CONTROL, suffix && 'pr-14', invalid && INVALID)}
          />
          {suffix ? (
            <span
              aria-hidden
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-base text-ink-muted"
            >
              {suffix}
            </span>
          ) : null}
        </div>
      )}
    </FieldShell>
  );
}

export function SelectField<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
  wide,
}: {
  label: string;
  hint?: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  wide?: boolean;
}) {
  return (
    <FieldShell label={label} hint={hint} wide={wide}>
      {({ id, describedBy }) => (
        <div className="relative">
          <select
            id={id}
            value={value}
            aria-describedby={describedBy}
            onChange={(event) => onChange(event.target.value as T)}
            className={cn(CONTROL, SELECT_CONTROL)}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <SelectChevron />
        </div>
      )}
    </FieldShell>
  );
}

export function CheckboxField({
  label,
  hint,
  checked,
  onChange,
  wide,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  wide?: boolean;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', wide && 'sm:col-span-2')}>
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-describedby={hintId}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--accent))]"
        />
        <label htmlFor={id} className="text-base font-medium leading-[1.4] text-ink">
          {label}
        </label>
      </div>
      {hint ? (
        <p id={hintId} className="m-0 pl-[26px] text-sm leading-[1.5] text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Formu saran kutu. Sonuç bloğu ayrı bir kutuda, altında.
 *
 * Hesap, her tuş vuruşunda değil GÖNDERİLDİĞİNDE yapılıyor. Anlık hesaplama
 * sonucu yarı yazılmış girdilerle sürekli oynatıyordu: ücret alanına ilk rakam
 * girildiği anda ekranda bir tutar beliriyor ve kullanıcı yazmayı bitirene kadar
 * her rakamda değişiyordu. Ayrıca bitmiş bir hesapla yarım bir hesabı ayırt
 * etmenin yolu kalmıyordu.
 *
 * `onSubmit` bir butondan da, alanların içinde Enter'a basmaktan da geliyor —
 * `<form>` bunu kendiliğinden yapıyor.
 */
export function ToolForm({
  children,
  onSubmit,
}: {
  children: React.ReactNode;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-6 rounded-lg border border-line bg-surface p-5 sm:p-6"
    >
      {children}

      <div className="flex">
        <button
          type="submit"
          className="rounded bg-accent px-6 py-3 text-md font-semibold text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Hesapla
        </button>
      </div>
    </form>
  );
}

/**
 * Gönderilmiş hesabı ve onun hangi girdilerle yapıldığını birlikte tutar.
 *
 * Buton eklenince yeni bir sorun doğuyor: kullanıcı hesaplıyor, sonra ücreti
 * değiştirip Hesapla'ya basmayı unutuyor ve ekranda ESKİ girdilere ait sayılar
 * duruyor. Sonuçla birlikte o anki girdilerin imzası da saklanınca, imza
 * değiştiği anda sonucun bayatladığı anlaşılıyor ve ekranda söylenebiliyor.
 */
export interface CalculatorOptions<TValues extends Record<string, unknown>, TInput, TResult> {
  /** Formdaki ham alanlar — hepsi metin ya da boolean. */
  values: TValues;
  /** Ham alanları hem denetleyen hem tipli girdiye çeviren şema. */
  schema: z.ZodType<TInput, z.ZodTypeDef, TValues>;
  calculate: (input: TInput) => TResult;
}

/**
 * Bir hesaplayıcı formunun bütün durumu: doğrulama, sonuç, bayatlık ve odak.
 *
 * DOĞRULAMA ZAMANLAMASI iki aşamalı. İlk Hesapla'ya kadar hiçbir alanın altında
 * hata yazmıyor — daha doldurmaya başlamamış birine kırmızı yazılar göstermek,
 * kullanıcının yaptığı bir yanlış varmış gibi duruyor. İlk gönderimden sonra
 * mesajlar canlıya geçiyor ve her tuş vuruşunda güncelleniyor, böylece düzeltme
 * yaparken doğru olduğunu anlamak için tekrar göndermek gerekmiyor.
 *
 * BAŞARILI HESAPTAN SONRA sonuç bölgesine kaydırılıyor ve odak oraya alınıyor.
 * Uzun formlarda buton ekranın altında kalıyor ve sonuç onun da altına
 * yazılıyordu: hesabı yapan kişi ekranda hiçbir şey değişmemiş gibi görüyordu.
 * Odak, aynı bilgiyi klavye ve ekran okuyucu kullananlara da veriyor.
 */
export function useCalculator<TValues extends Record<string, unknown>, TInput, TResult>({
  values,
  schema,
  calculate,
}: CalculatorOptions<TValues, TInput, TResult>) {
  const [validateLive, setValidateLive] = useState(false);
  const [state, setState] = useState<{ value: TResult; signature: string } | null>(null);
  const [scrollTick, setScrollTick] = useState(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const signature = JSON.stringify(values);
  const parsed = schema.safeParse(values);
  const errors = !validateLive || parsed.success ? {} : fieldErrors(parsed.error);

  /*
   * Kaydırma bir efektte, çünkü sonucun DOM'a yazılması gerekiyor; `onSubmit`
   * içinde çağrılsaydı hedef henüz var olmazdı. Sayaç, aynı sonuçla art arda
   * gönderimlerde de efektin yeniden çalışmasını sağlıyor.
   */
  useEffect(() => {
    if (scrollTick === 0) return;
    const element = resultRef.current;
    if (!element) return;

    /*
     * Yumuşak kaydırma, hareketi azaltma tercihi olanlarda ANİ. Uzun bir formun
     * altından sonuca kayan bir sayfa, o tercihi açmış birinin kaçındığı tam da
     * bu tür bir hareket.
     */
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });

    /* `preventScroll`: odak kendi başına ikinci bir sıçrama yapmasın. */
    element.focus({ preventScroll: true });
  }, [scrollTick]);

  const onSubmit = () => {
    setValidateLive(true);

    const checked = schema.safeParse(values);
    if (!checked.success) {
      setState(null);
      return;
    }

    setState({ value: calculate(checked.data), signature });
    setScrollTick((tick) => tick + 1);
  };

  return {
    /** `{ alanAdı: mesaj }` — ilk gönderimden önce her zaman boş. */
    errors,
    result: state?.value ?? null,
    /** Sonuç ekranda ama girdiler o günden beri değişti. */
    stale: state !== null && state.signature !== signature,
    onSubmit,
    resultRef,
  };
}

/**
 * Sonuçları saran, odaklanabilir bölge.
 *
 * `tabIndex={-1}`: klavyeyle gezilen sıraya girmiyor ama programla odak
 * alabiliyor. `scroll-mt-*` yapışkan başlığın altında kalmasını engelliyor.
 */
export const ResultsRegion = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  function ResultsRegion({ children }, ref) {
    return (
      <div
        ref={ref}
        tabIndex={-1}
        className="scroll-mt-[calc(var(--header-h)+16px)] outline-none"
      >
        {children}
      </div>
    );
  },
);

export function StaleNotice({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <p className="m-0 mt-6 rounded-lg border border-notice-border bg-notice p-4 text-base leading-[1.6] text-notice-ink">
      Girdiler değişti. Aşağıdaki sonuç bir önceki hesaba ait — güncellemek için{' '}
      <strong className="font-semibold">Hesapla</strong>&apos;ya basın.
    </p>
  );
}

export function ResultPanel({
  title,
  children,
  note,
}: {
  title: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <section
      aria-live="polite"
      className="mt-6 rounded-lg border border-line-strong bg-surface-muted p-5 sm:p-6"
    >
      <h2 className="m-0 text-3xl font-semibold tracking-tighter text-ink">{title}</h2>
      <dl className="mt-4 flex flex-col">{children}</dl>
      {note ? <p className="m-0 mt-4 text-base leading-[1.55] text-ink-muted">{note}</p> : null}
    </section>
  );
}

export function ResultRow({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Sonucun ana sayısı — bir kademe büyük ve kalın. */
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line-soft py-3 last:border-b-0',
        emphasis && 'border-b-0 pt-4',
      )}
    >
      <dt className={cn('text-base text-ink-body', emphasis && 'text-md font-medium text-ink')}>
        {label}
        {hint ? <span className="mt-0.5 block text-sm text-ink-muted">{hint}</span> : null}
      </dt>
      <dd
        className={cn(
          'm-0 text-md font-medium tabular-nums text-ink',
          emphasis && 'text-4xl font-semibold tracking-tighter',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Hesap yapılamadığında veya bir muafiyet devreye girdiğinde. */
export function ToolNotice({
  tone = 'notice',
  children,
}: {
  /**
   * `info` bilgi, `notice` dikkat, `danger` hata.
   *
   * Ayrım gerekliydi: kapsam dışı kalan bir kalemi anlatan not (gelir vergisi
   * bu hesaba dahil değil) kırmızı bir kutuda dururken, hesabın yanlış gittiği
   * ya da bir şeyin bozulduğu izlenimi veriyordu. Kırmızı yalnızca kullanıcının
   * düzeltmesi gereken bir durum için.
   */
  tone?: 'info' | 'notice' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        'm-0 mt-6 rounded-lg border p-4 text-base leading-[1.6]',
        tone === 'danger' && 'border-danger-border bg-danger text-danger-ink',
        tone === 'notice' && 'border-notice-border bg-notice text-notice-ink',
        tone === 'info' && 'border-line bg-surface-muted text-ink-body',
      )}
    >
      {children}
    </p>
  );
}
