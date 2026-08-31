import type { Config } from 'tailwindcss';

/**
 * Renk ve ölçek değerleri src/styles/globals.css içindeki CSS değişkenlerinden gelir.
 * Tasarım tek açık temaya bağlı; darkMode kapalı.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'hsl(var(--canvas))',
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          muted: 'hsl(var(--surface-muted))',
          hover: 'hsl(var(--surface-hover))',
        },
        line: {
          DEFAULT: 'hsl(var(--border))',
          soft: 'hsl(var(--border-soft))',
          strong: 'hsl(var(--border-strong))',
          dashed: 'hsl(var(--border-dashed))',
        },
        ink: {
          DEFAULT: 'hsl(var(--ink))',
          body: 'hsl(var(--ink-body))',
          muted: 'hsl(var(--ink-muted))',
          faint: 'hsl(var(--ink-faint))',
          fainter: 'hsl(var(--ink-fainter))',
          placeholder: 'hsl(var(--ink-placeholder))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          hover: 'hsl(var(--accent-hover))',
          ink: 'hsl(var(--accent-ink))',
        },
        mark: 'hsl(var(--mark))',
        notice: {
          DEFAULT: 'hsl(var(--notice))',
          border: 'hsl(var(--notice-border))',
          ink: 'hsl(var(--notice-ink))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          border: 'hsl(var(--danger-border))',
          ink: 'hsl(var(--danger-ink))',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Artboard'daki px değerleri, rem'e çevrilmiş hâliyle
        '2xs': ['0.6875rem', { lineHeight: '1.4' }], // 11px
        xs: ['0.75rem', { lineHeight: '1.45' }], //     12px
        sm: ['0.8125rem', { lineHeight: '1.5' }], //    13px
        base: ['0.875rem', { lineHeight: '1.55' }], //  14px
        md: ['0.9375rem', { lineHeight: '1.55' }], //   15px
        lg: ['1rem', { lineHeight: '1.4' }], //         16px
        xl: ['1.0625rem', { lineHeight: '1.38' }], //   17px — liste başlığı
        '2xl': ['1.125rem', { lineHeight: '1.35' }], // 18px — marka
        '3xl': ['1.25rem', { lineHeight: '1.4' }], //   20px
        '4xl': ['1.5rem', { lineHeight: '1.3' }], //    24px — mobil h1
        '5xl': ['1.875rem', { lineHeight: '1.25' }], // 30px — sayfa h1
        '6xl': ['2.0625rem', { lineHeight: '1.28' }], //33px — kayıt h1
      },
      letterSpacing: {
        tightest: '-0.015em',
        tighter: '-0.01em',
        tight: '-0.005em',
      },
      borderRadius: {
        sm: '2px',
        DEFAULT: '4px',
        md: '5px',
        lg: '6px',
        pill: '16px',
        phone: '22px',
      },
      maxWidth: {
        prose: '38em', // gövde metni ölçüsü (artboard 1a) — yan sütunlu sayfalarda
        title: '24em', // kayıt h1 ölçüsü
        lede: '40em',
      },
      gridTemplateColumns: {
        // Liste satırı: 92px künye sütunu + esnek içerik (artboard 1b/1d/1e)
        row: '92px 1fr',
        // Sayfa gövdesi: içerik + yan sütun
        page: '1fr 300px',
        record: '1fr 250px',
        // Arama: filtre rayı + sonuçlar
        search: '210px 1fr',
      },
    },
  },
  plugins: [],
};

export default config;
