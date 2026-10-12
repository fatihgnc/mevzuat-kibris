/**
 * Renders a batch of Instagram feed images (1080×1350) into social-out/<date>/.
 *
 *   npx tsx --tsconfig scripts/social/tsconfig.json scripts/social/index.tsx
 *
 * Content is hand-curated from the live record pages for now; every card carries
 * the gazette issue it came from so a reader can check it against the source.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';

import { C, Frame, renderPng } from './kit';

type Slide = { file: string; node: ReactNode };

// --- Early election ----------------------------------------------------------------

const election: Slide = {
  file: '01-erken-secim.png',
  node: (
    <Frame theme="teal" kicker="RESMÎ GAZETE" source="Kaynak: Resmî Gazete, 9 Ekim 2026, sayı 200 · Karar No 118/5/2026">
      <span style={{ fontSize: 40, fontWeight: 600, color: C.muted }}>Meclis kararını verdi</span>
      <span style={{ fontSize: 104, fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.02em', marginTop: 12 }}>
        Erken seçim tarihi belli oldu
      </span>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 56,
          background: C.tealDeep,
          borderRadius: 32,
          padding: '40px 48px',
        }}
      >
        <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '0.08em', color: C.muted }}>SEÇİM GÜNÜ</span>
        <span style={{ fontSize: 132, fontWeight: 900, color: C.accent, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
          6 Aralık 2026
        </span>
        <span style={{ fontSize: 40, fontWeight: 600 }}>Pazar</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 48 }}>
        {[
          'Cumhuriyet Meclisi 8 Ekim’de oybirliğiyle karar aldı',
          'Seçimler, dönem sona ermeden yenileniyor (Anayasa md. 88/1)',
        ].map((line) => (
          <div key={line} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: C.accent }} />
            <span style={{ fontSize: 34 }}>{line}</span>
          </div>
        ))}
      </div>
    </Frame>
  ),
};

// --- Münhal carousel ---------------------------------------------------------------

const MUNHAL_SOURCE = 'Kaynak: Resmî Gazete, 7 Ekim (sayı 198) ve 10 Ekim 2026 (sayı 202)';
const MUNHAL_TOTAL = 5;

const institutions = [
  { name: 'Sağlık Hizmetleri Dairesi', count: 40, roles: 'İlk ve Acil Yardım Teknikeri' },
  { name: 'Telekomünikasyon Dairesi', count: 30, roles: 'Teknisyen, Mühendis, Telekom. Memuru, Programcı, Ambar Emini' },
  { name: 'Gelir ve Vergi Dairesi', count: 24, roles: 'Gelir ve Vergi Memuru' },
  { name: 'Jeoloji ve Maden Dairesi', count: 11, roles: 'Mühendis, Teknisyen, Yardımcı Sondör' },
  { name: 'Muhaceret Dairesi', count: 8, roles: 'Muhaceret Memuru, Analist/Programcı, Tahsilat Memuru' },
  { name: 'Limanlar Dairesi', count: 8, roles: 'Gemici, Kılavuz-Kaptan Yardımcısı' },
  { name: 'Dijital Dönüşüm ve E-Devlet Kurumu', count: 6, roles: 'Yardımcı Bilişim Uzmanı' },
  { name: 'Yataklı Tedavi Kurumları Dairesi', count: 2, roles: 'Sağlık Psikoloğu' },
];
const munhalSum = institutions.reduce((sum, i) => sum + i.count, 0);

const topRoles = [
  { count: 40, role: 'İlk ve Acil Yardım Teknikeri', where: 'Sağlık Hizmetleri · 6 ilçe' },
  { count: 24, role: 'Gelir ve Vergi Memuru', where: 'Lefkoşa, Girne, Güzelyurt' },
  { count: 20, role: 'Teknisyen', where: 'Telekomünikasyon · 4 ilçe' },
  { count: 6, role: 'Muhaceret Memuru', where: 'Lefkoşa' },
  { count: 6, role: 'Gemici', where: 'Limanlar · Gazimağusa, Girne' },
];

const deadlines = [
  { date: '30 Nisan 2027', who: 'Telekomünikasyon · Limanlar (Kılavuz-Kaptan Yrd.)' },
  { date: '13 Mayıs 2027', who: 'Gelir ve Vergi · Dijital Dönüşüm' },
  { date: '27 Mayıs 2027', who: 'Muhaceret · Limanlar (Gemici)' },
  { date: '11 Haziran 2027', who: 'Sağlık Hizmetleri · Yataklı Tedavi · Jeoloji ve Maden' },
];

function SlideTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 32 }}>
      <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: '0.06em', color: C.teal }}>{eyebrow}</span>
      <span style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em' }}>{title}</span>
    </div>
  );
}

const munhal: Slide[] = [
  {
    file: '02-munhal-1-kapak.png',
    node: (
      <Frame theme="teal" kicker="MÜNHAL İLANLARI" source={MUNHAL_SOURCE} page={{ index: 0, total: MUNHAL_TOTAL }}>
        <span style={{ fontSize: 44, fontWeight: 600, color: C.muted }}>Bu hafta Resmî Gazete’de</span>
        <span style={{ fontSize: 330, fontWeight: 900, color: C.accent, lineHeight: 0.95, letterSpacing: '-0.04em' }}>
          {String(munhalSum)}
        </span>
        <span style={{ fontSize: 92, fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.02em' }}>
          kamu kadrosu başvuruya açıldı
        </span>
        <span style={{ fontSize: 38, color: C.muted, marginTop: 28 }}>8 kurum · ilk atama kadroları</span>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <span style={{ fontSize: 34, fontWeight: 700, color: C.accent }}>Kaydır → hangi kurum, kaç kişi, son tarih</span>
      </Frame>
    ),
  },
  {
    file: '02-munhal-2-en-cok.png',
    node: (
      <Frame theme="paper" kicker="MÜNHAL İLANLARI" source={MUNHAL_SOURCE} page={{ index: 1, total: MUNHAL_TOTAL }}>
        <SlideTitle eyebrow="EN ÇOK KADRO" title="Hangi pozisyona kaç kişi alınacak?" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {topRoles.map((r) => (
            <div
              key={r.role}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 32,
                background: '#FFFFFF',
                borderRadius: 24,
                padding: '16px 32px',
              }}
            >
              <span style={{ fontSize: 66, fontWeight: 900, color: C.teal, width: 110, letterSpacing: '-0.03em' }}>
                {String(r.count)}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 36, fontWeight: 700 }}>{r.role}</span>
                <span style={{ fontSize: 28, color: C.paperMuted }}>{r.where}</span>
              </div>
            </div>
          ))}
        </div>
      </Frame>
    ),
  },
  {
    file: '02-munhal-3-kurumlar.png',
    node: (
      <Frame theme="paper" kicker="MÜNHAL İLANLARI" source={MUNHAL_SOURCE} page={{ index: 2, total: MUNHAL_TOTAL }}>
        <SlideTitle eyebrow="KURUM KURUM" title={`${institutions.length} kurum, ${munhalSum} kadro`} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {institutions.map((i, n) => (
            <div
              key={i.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 24,
                padding: '9px 0',
                borderTop: n === 0 ? 'none' : `2px solid ${C.paperRule}`,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 760 }}>
                <span style={{ fontSize: 31, fontWeight: 700 }}>{i.name}</span>
                <span style={{ fontSize: 24, color: C.paperMuted }}>{i.roles}</span>
              </div>
              <span style={{ fontSize: 50, fontWeight: 900, color: C.teal }}>{String(i.count)}</span>
            </div>
          ))}
        </div>
      </Frame>
    ),
  },
  {
    file: '02-munhal-4-son-tarihler.png',
    node: (
      <Frame theme="paper" kicker="MÜNHAL İLANLARI" source={MUNHAL_SOURCE} page={{ index: 3, total: MUNHAL_TOTAL }}>
        <SlideTitle eyebrow="SON BAŞVURU" title="Acele yok ama takvimi kaçırma" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          {deadlines.map((d) => (
            <div key={d.date} style={{ display: 'flex', alignItems: 'stretch', gap: 28 }}>
              <div style={{ width: 10, borderRadius: 999, background: C.accent }} />
              <div style={{ display: 'flex', flexDirection: 'column', padding: '4px 0' }}>
                <span style={{ fontSize: 54, fontWeight: 900, color: C.teal, letterSpacing: '-0.01em' }}>{d.date}</span>
                <span style={{ fontSize: 31 }}>{d.who}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <span style={{ fontSize: 29, color: C.paperMuted }}>
          Başvurular Kamu Hizmeti Komisyonu’na yapılır. Aranan nitelikler her ilanın hizmet şemasında.
        </span>
      </Frame>
    ),
  },
  {
    file: '02-munhal-5-cta.png',
    node: (
      <Frame theme="teal" kicker="MÜNHAL İLANLARI" source={MUNHAL_SOURCE} page={{ index: 4, total: MUNHAL_TOTAL }}>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: 92, fontWeight: 900, lineHeight: 1.02, letterSpacing: '-0.02em' }}>
            Nitelikler, hizmet şemaları, başvuru linkleri
          </span>
          <span style={{ fontSize: 40, color: C.muted, marginTop: 28 }}>Her ilanın tam metni sitede:</span>
          <div
            style={{
              display: 'flex',
              marginTop: 24,
              background: C.accent,
              color: C.tealDeep,
              borderRadius: 24,
              padding: '26px 36px',
              fontSize: 50,
              fontWeight: 900,
            }}
          >
            mevzuatkibris.com/konu/munhal
          </div>
          <span style={{ fontSize: 40, fontWeight: 700, marginTop: 64 }}>Kaydet, iş arayan arkadaşına gönder.</span>
          <span style={{ fontSize: 34, color: C.muted, marginTop: 10 }}>Yeni ilanları her gün buradan paylaşıyoruz.</span>
        </div>
      </Frame>
    ),
  },
];

// --- Fuel exemptions ---------------------------------------------------------------

const fuel: Slide = {
  file: '03-akaryakit-muafiyet.png',
  node: (
    <Frame theme="teal" kicker="BAKANLAR KURULU" source="Kaynak: Resmî Gazete, 7 Ekim 2026, sayı 198 · Ü(K-I) 2677, 2678, 2680">
      <span style={{ fontSize: 96, fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.02em' }}>
        Akaryakıt ithalatında 1 haftalık muafiyet
      </span>
      <div style={{ display: 'flex', marginTop: 32 }}>
        <span
          style={{
            fontSize: 44,
            fontWeight: 900,
            background: C.accent,
            color: C.tealDeep,
            borderRadius: 999,
            padding: '10px 32px',
          }}
        >
          8 – 14 Ekim 2026
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 48 }}>
        {[
          { what: 'Gümrük Vergisi', detail: 'alınmayacak — benzin, eurodiesel, mazot, gazyağı, fuel-oil, uçak benzini' },
          { what: 'Rıhtım Harcı', detail: 'alınmayacak — aynı ürünlerin ithalatında' },
          { what: '%1 prim', detail: 'kesilmeyecek — mazot (motorin, eurodiesel) ithalatında' },
        ].map((row) => (
          <div
            key={row.what}
            style={{ display: 'flex', flexDirection: 'column', background: C.tealDeep, borderRadius: 24, padding: '26px 34px' }}
          >
            <span style={{ fontSize: 46, fontWeight: 900, color: C.accent }}>{row.what}</span>
            <span style={{ fontSize: 31, marginTop: 4 }}>{row.detail}</span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: 29, color: C.muted, marginTop: 34 }}>
        Amaç: Orta Doğu’daki savaşın enerji fiyatlarına etkisini sınırlamak.
      </span>
    </Frame>
  ),
};

// --- Calculators -------------------------------------------------------------------

const tools = [
  'Net–brüt maaş',
  'Yıllık izin',
  'Fazla mesai',
  'İhtiyat Sandığı',
  'Tapu harcı',
  'İthal araç vergisi',
  'Toplu işten çıkarma tazminatı',
  'Doğum ve mazeret izni',
  'Çalışma izni cezası',
];

const calculators: Slide = {
  file: '04-hesaplayicilar.png',
  node: (
    <Frame theme="paper" kicker="ÜCRETSİZ ARAÇLAR" source="KKTC mevzuatına göre hesaplar · kayıt gerekmez">
      <span style={{ fontSize: 40, fontWeight: 600, color: C.paperMuted }}>Maaşın, iznin, harcın…</span>
      <span style={{ fontSize: 100, fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.02em', marginTop: 8 }}>
        Kaç ediyor? Saniyede hesapla.
      </span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 52 }}>
        {tools.map((t) => (
          <span
            key={t}
            style={{
              fontSize: 34,
              fontWeight: 700,
              background: '#FFFFFF',
              border: `2px solid ${C.paperRule}`,
              borderRadius: 999,
              padding: '14px 28px',
            }}
          >
            {t}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', flexGrow: 1 }} />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: C.teal,
          color: C.ink,
          borderRadius: 28,
          padding: '30px 40px',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 30, color: C.muted }}>{`${tools.length} hesaplayıcı, hepsi ücretsiz`}</span>
          <span style={{ fontSize: 48, fontWeight: 900 }}>mevzuatkibris.com/arac</span>
        </div>
        <span style={{ fontSize: 64, fontWeight: 900, color: C.accent }}>→</span>
      </div>
    </Frame>
  ),
};

// --- Render ------------------------------------------------------------------------

async function main() {
  const date = new Date().toISOString().slice(0, 10);
  const outDir = path.join(process.cwd(), 'social-out', date);
  mkdirSync(outDir, { recursive: true });

  for (const slide of [election, ...munhal, fuel, calculators]) {
    writeFileSync(path.join(outDir, slide.file), await renderPng(slide.node));
    console.log('wrote', slide.file);
  }
  console.log('→', outDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
