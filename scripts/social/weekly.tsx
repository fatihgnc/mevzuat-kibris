/**
 * Weekly Resmî Gazete digest Reel: intro with the week's issue/record counts, five
 * highlighted decisions, then a call to action.
 *
 *   npx tsx --tsconfig scripts/social/tsconfig.json scripts/social/weekly.tsx [--frame 5.0]
 *
 * Figures come from the live site's issue pages (sayılar/2026, issues 194–202) and the
 * record texts; each card names the issue it came from.
 */
import { C } from './kit';
import { ReelFrame, enter, life, ramp, runReel } from './reel-kit';

const WEEK = { label: '5–11 Ekim 2026', issues: 9, records: 220 };

type Item = {
  tag: string;
  title: string;
  /** The one figure the card is built around. */
  big: string;
  detail: string;
  source: string;
};

const items: Item[] = [
  {
    tag: 'SEÇİM',
    title: 'Erken seçim kararı',
    big: '6 Aralık 2026',
    detail: 'Cumhuriyet Meclisi 8 Ekim’de oybirliğiyle seçimlerin yenilenmesine karar verdi.',
    source: 'Sayı 200 · 9 Ekim',
  },
  {
    tag: 'ENERJİ',
    title: 'KIB-TEK grevi ertelendi',
    big: '60 gün',
    detail: 'Bakanlar Kurulu, 5 Ekim’de başlayan grevi “elzem hizmet” gerekçesiyle 7 Ekim’den itibaren erteledi.',
    source: 'Sayı 199 · 7 Ekim',
  },
  {
    tag: 'AKARYAKIT',
    title: 'İthalatta vergi muafiyeti',
    big: '8–14 Ekim',
    detail: 'Gümrük vergisi ve rıhtım harcı alınmıyor; mazot ithalatında %1 prim kesilmiyor.',
    source: 'Sayı 198 · 7 Ekim',
  },
  {
    tag: 'TAŞINMAZ',
    title: 'Yabancılara mülk satışında yeni kararname',
    big: 'En fazla 3 daire',
    detail: 'KKTC’yi tanıyan ülkelerin vatandaşlarına 6. Yasadaki süreler uzatıldı; amaç bekleyen vergi ve harçların tahsili.',
    source: 'Sayı 196 · 6 Ekim',
  },
  {
    tag: 'MÜNHAL',
    title: 'Kamuya ilk atama ilanları',
    big: '129 kadro',
    detail: 'En çok: 40 İlk ve Acil Yardım Teknikeri, 24 Gelir ve Vergi Memuru. Başvurular Nisan–Haziran 2027’ye kadar açık.',
    source: 'Sayı 198 ve 202 · 7 ve 10 Ekim',
  },
];

// Timeline, seconds.
const INTRO = [0, 3.4] as const;
const ITEM_LEN = 3.7;
const itemStart = (i: number) => INTRO[1] + i * ITEM_LEN;
const OUTRO_START = itemStart(items.length);
const DURATION = OUTRO_START + 3.6;

function frame(t: number, progress: number) {
  let body = null;
  if (t < INTRO[1]) body = intro(t);
  else if (t < OUTRO_START) {
    const i = Math.min(items.length - 1, Math.floor((t - INTRO[1]) / ITEM_LEN));
    body = item(t, i);
  } else body = outro(t);
  return <ReelFrame progress={progress}>{body}</ReelFrame>;
}

function intro(t: number) {
  const [, end] = INTRO;
  const issues = Math.round(WEEK.issues * ramp(t, 0.5, 1.0));
  const records = Math.round(WEEK.records * ramp(t, 0.5, 1.3));
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: '0.08em', color: C.accent, ...enter(t, -1, end) }}>
        HAFTALIK ÖZET
      </span>
      <span style={{ fontSize: 104, fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.02em', marginTop: 10, ...enter(t, -1, end) }}>
        Resmî Gazete’de bu hafta
      </span>
      <span style={{ fontSize: 48, fontWeight: 600, color: C.muted, marginTop: 20, ...enter(t, 0.2, end) }}>{WEEK.label}</span>

      <div style={{ display: 'flex', gap: 28, marginTop: 56, ...enter(t, 0.4, end) }}>
        {[
          { n: issues, label: 'sayı' },
          { n: records, label: 'kayıt' },
        ].map((s) => (
          <div
            key={s.label}
            style={{ display: 'flex', flexDirection: 'column', background: C.tealDeep, borderRadius: 28, padding: '24px 36px', minWidth: 300 }}
          >
            <span style={{ fontSize: 130, fontWeight: 900, color: C.accent, lineHeight: 1.0, letterSpacing: '-0.03em' }}>{String(s.n)}</span>
            <span style={{ fontSize: 40, fontWeight: 600 }}>{s.label}</span>
          </div>
        ))}
      </div>

      <span style={{ fontSize: 42, fontWeight: 700, marginTop: 56, ...enter(t, 1.6, end) }}>
        {`Öne çıkan ${items.length} karar →`}
      </span>
    </div>
  );
}

function item(t: number, i: number) {
  const it = items[i]!;
  const start = itemStart(i);
  const end = start + ITEM_LEN;
  const pop = 0.88 + 0.12 * ramp(t, start + 0.35, 0.35);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22, ...enter(t, start, end, 20) }}>
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 84,
            height: 84,
            borderRadius: 999,
            background: C.accent,
            color: C.tealDeep,
            fontSize: 50,
            fontWeight: 900,
          }}
        >
          {String(i + 1)}
        </span>
        <span style={{ fontSize: 34, fontWeight: 700, letterSpacing: '0.08em', color: C.muted }}>{it.tag}</span>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          {items.map((_, k) => (
            <div
              key={k}
              style={{
                width: k === i ? 34 : 12,
                height: 12,
                borderRadius: 999,
                background: k === i ? C.accent : k < i ? C.muted : 'rgba(255,255,255,0.25)',
              }}
            />
          ))}
        </div>
      </div>

      <span style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.02em', marginTop: 40, ...enter(t, start + 0.1, end) }}>
        {it.title}
      </span>

      <span
        style={{
          fontSize: 104,
          fontWeight: 900,
          color: C.accent,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          marginTop: 34,
          opacity: life(t, start + 0.35, end),
          transform: `scale(${pop})`,
          transformOrigin: 'left center',
        }}
      >
        {it.big}
      </span>

      <span style={{ fontSize: 40, lineHeight: 1.3, marginTop: 30, ...enter(t, start + 0.7, end) }}>{it.detail}</span>
      <span style={{ fontSize: 30, color: C.muted, marginTop: 30, ...enter(t, start + 0.9, end) }}>{`Resmî Gazete ${it.source}`}</span>
    </div>
  );
}

function outro(t: number) {
  const start = OUTRO_START;
  const end = DURATION + 1;
  const pop = 0.9 + 0.1 * ramp(t, start + 0.4, 0.4);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 92, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.02em', ...enter(t, start, end) }}>
        {`Haftanın ${WEEK.records} kaydının tamamı`}
      </span>
      <div
        style={{
          display: 'flex',
          marginTop: 40,
          background: C.accent,
          color: C.tealDeep,
          borderRadius: 26,
          padding: '26px 34px',
          fontSize: 56,
          fontWeight: 900,
          opacity: life(t, start + 0.4, end),
          transform: `scale(${pop})`,
          transformOrigin: 'left center',
        }}
      >
        mevzuatkibris.com
      </div>
      <span style={{ fontSize: 46, fontWeight: 700, marginTop: 64, ...enter(t, start + 0.9, end) }}>
        Takip et, haftalık özeti kaçırma.
      </span>
      <span style={{ fontSize: 32, color: C.muted, marginTop: 30, ...enter(t, start + 1.2, end) }}>
        Bağlayıcı olan, Resmî Gazete’de yayımlanan metindir.
      </span>
    </div>
  );
}

runReel({ name: '06-haftalik-ozet-reels', duration: DURATION, coverAt: 2.9, frame }).catch((error) => {
  console.error(error);
  process.exit(1);
});
