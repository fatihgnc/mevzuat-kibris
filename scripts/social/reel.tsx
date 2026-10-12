/**
 * Münhal Reel (1080×1920, 30 fps). No audio track: music is picked in the Instagram
 * app, where trending sounds are licensed and help reach.
 *
 *   npx tsx --tsconfig scripts/social/tsconfig.json scripts/social/reel.tsx [--frame 2.0]
 */
import { C } from './kit';
import { ReelFrame, enter, life, ramp, runReel } from './reel-kit';

const DURATION = 15;

// --- Content (same figures as the feed carousel) -----------------------------------

const TOTAL = 129;
const roles = [
  { count: 40, role: 'İlk ve Acil Yardım Teknikeri', where: 'Sağlık Hizmetleri' },
  { count: 24, role: 'Gelir ve Vergi Memuru', where: 'Gelir ve Vergi Dairesi' },
  { count: 20, role: 'Teknisyen', where: 'Telekomünikasyon Dairesi' },
  { count: 6, role: 'Muhaceret Memuru', where: 'Muhaceret Dairesi' },
  { count: 6, role: 'Gemici', where: 'Limanlar Dairesi' },
];
const deadlines = [
  { date: '30 Nisan 2027', who: 'Telekomünikasyon · Limanlar' },
  { date: '13 Mayıs 2027', who: 'Gelir ve Vergi · Dijital Dönüşüm' },
  { date: '27 Mayıs 2027', who: 'Muhaceret · Limanlar' },
  { date: '11 Haziran 2027', who: 'Sağlık · Yataklı Tedavi · Jeoloji' },
];

// Scene boundaries, seconds.
const S1 = [0, 3.4] as const;
const S2 = [3.4, 8.6] as const;
const S3 = [8.6, 12.0] as const;
const S4 = [12.0, DURATION + 1] as const;

// --- Frame ---------------------------------------------------------------------------

function frame(t: number, progress: number) {
  const inScene = (sc: readonly [number, number]) => t >= sc[0] && t < sc[1];
  return (
    <ReelFrame progress={progress}>
      {inScene(S1) ? scene1(t) : null}
      {inScene(S2) ? scene2(t) : null}
      {inScene(S3) ? scene3(t) : null}
      {inScene(S4) ? scene4(t) : null}
    </ReelFrame>
  );
}

function scene1(t: number) {
  const [, end] = S1;
  const n = Math.round(TOTAL * ramp(t, 0.1, 1.3));
  const pop = 0.85 + 0.15 * ramp(t, 0.1, 0.5);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 50, fontWeight: 600, color: C.muted, ...enter(t, -1, end) }}>Bu hafta Resmî Gazete’de</span>
      <span
        style={{
          fontSize: 360,
          fontWeight: 900,
          color: C.accent,
          lineHeight: 1.0,
          letterSpacing: '-0.04em',
          opacity: life(t, -1, end),
          transform: `scale(${pop})`,
          transformOrigin: 'left center',
        }}
      >
        {String(n)}
      </span>
      <span style={{ fontSize: 96, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.02em', ...enter(t, 1.2, end) }}>
        kamu kadrosu başvuruya açıldı
      </span>
      <span style={{ fontSize: 44, color: C.muted, marginTop: 30, ...enter(t, 1.7, end) }}>8 kurum · ilk atama kadroları</span>
    </div>
  );
}

function scene2(t: number) {
  const [start, end] = S2;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '0.08em', color: C.accent, ...enter(t, start, end) }}>EN ÇOK KADRO</span>
      <span style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05, marginBottom: 40, ...enter(t, start + 0.1, end) }}>
        Kaç kişi alınacak?
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {roles.map((r, i) => {
          const at = start + 0.5 + i * 0.55;
          const p = life(t, at, end);
          const n = Math.round(r.count * ramp(t, at, 0.6));
          return (
            <div
              key={r.role}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 30,
                background: C.tealDeep,
                borderRadius: 26,
                padding: '22px 30px',
                opacity: p,
                transform: `translateX(${(1 - p) * 120}px)`,
              }}
            >
              <span style={{ fontSize: 80, fontWeight: 900, color: C.accent, width: 120, letterSpacing: '-0.03em' }}>{String(n)}</span>
              <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 1 }}>
                <span style={{ fontSize: 40, fontWeight: 700, lineHeight: 1.1 }}>{r.role}</span>
                <span style={{ fontSize: 30, color: C.muted }}>{r.where}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function scene3(t: number) {
  const [start, end] = S3;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: '0.08em', color: C.accent, ...enter(t, start, end) }}>SON BAŞVURU</span>
      <span style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05, marginBottom: 50, ...enter(t, start + 0.1, end) }}>
        Takvimi kaçırma
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
        {deadlines.map((d, i) => (
          <div key={d.date} style={{ display: 'flex', alignItems: 'stretch', gap: 28, ...enter(t, start + 0.45 + i * 0.4, end) }}>
            <div style={{ width: 10, borderRadius: 999, background: C.accent }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 66, fontWeight: 900, color: C.accent, letterSpacing: '-0.01em' }}>{d.date}</span>
              <span style={{ fontSize: 36 }}>{d.who}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function scene4(t: number) {
  const [start, end] = S4;
  const pop = 0.9 + 0.1 * ramp(t, start + 0.5, 0.4);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 92, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.02em', ...enter(t, start, end) }}>
        Nitelikler ve başvuru linkleri
      </span>
      <span style={{ fontSize: 44, color: C.muted, marginTop: 30, ...enter(t, start + 0.25, end) }}>Her ilanın tam metni:</span>
      <div
        style={{
          display: 'flex',
          marginTop: 26,
          background: C.accent,
          color: C.tealDeep,
          borderRadius: 26,
          padding: '26px 30px',
          fontSize: 44,
          fontWeight: 900,
          opacity: life(t, start + 0.5, end),
          transform: `scale(${pop})`,
          transformOrigin: 'left center',
        }}
      >
        mevzuatkibris.com/konu/munhal
      </div>
      <span style={{ fontSize: 48, fontWeight: 700, marginTop: 70, ...enter(t, start + 1.0, end) }}>Kaydet, iş arayan arkadaşına gönder.</span>
      <span style={{ fontSize: 34, color: C.muted, marginTop: 40, ...enter(t, start + 1.3, end) }}>
        Kaynak: Resmî Gazete, 7 ve 10 Ekim 2026 (sayı 198, 202)
      </span>
    </div>
  );
}

// --- Render --------------------------------------------------------------------------

runReel({ name: '05-munhal-reels', duration: DURATION, coverAt: 2.8, frame }).catch((error) => {
  console.error(error);
  process.exit(1);
});
