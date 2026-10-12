import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ReactNode } from 'react';

import { C, Mark, renderPng } from './kit';

export const REEL = { width: 1080, height: 1920 };
export const FPS = 30;

// --- Timing helpers ------------------------------------------------------------------

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
/** 0→1 progress of `t` through [start, start+len], eased. */
export const ramp = (t: number, start: number, len: number) => easeOut(clamp((t - start) / len));
/** Fade-in at `start`, fade-out ending at `end`. */
export const life = (t: number, start: number, end: number, inLen = 0.4, outLen = 0.3) =>
  Math.min(ramp(t, start, inLen), 1 - clamp((t - (end - outLen)) / outLen));

export function enter(t: number, start: number, end: number, dy = 40) {
  const p = life(t, start, end);
  return { opacity: p, transform: `translateY(${(1 - p) * dy}px)` };
}

// --- Frame chrome --------------------------------------------------------------------

/**
 * Shared Reel chrome: brand ground, logo and the top progress bar.
 *
 * `progress` is 0 on the first frame and exactly 1 on the last. The bar width is in
 * pixels of the full canvas: satori resolves a percentage width on an absolutely
 * positioned child against the padded content box, which left the bar stuck at ~78%.
 *
 * Reels UI covers roughly the top 220px, the bottom 420px (caption, audio) and a
 * 140px strip on the right (buttons); the content slot stays inside that safe box.
 */
export function ReelFrame({ progress, children }: { progress: number; children: ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: C.teal,
        color: C.ink,
        fontFamily: 'SS3, "SS3 Ext"',
        padding: '230px 150px 420px 80px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, width: REEL.width, height: 12, background: 'rgba(255,255,255,0.15)' }} />
      <div
        style={{
          display: 'flex',
          position: 'absolute',
          top: 0,
          left: 0,
          width: Math.round(clamp(progress) * REEL.width),
          height: 12,
          background: C.accent,
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <Mark height={44} />
        <span style={{ fontSize: 38, fontWeight: 700 }}>Mevzuat Kıbrıs</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1 }}>{children}</div>
    </div>
  );
}

// --- Render --------------------------------------------------------------------------

type ReelSpec = {
  /** Output base name, e.g. "05-munhal-reels" → .mp4 and -kapak.png */
  name: string;
  duration: number;
  /** Seconds into the video used for the cover image. */
  coverAt: number;
  /** Draws the frame at time `t`; `progress` is already normalised to end at 1. */
  frame: (t: number, progress: number) => ReactNode;
};

/**
 * CLI shared by every Reel script:
 *   (no flags)        render the mp4 and the cover
 *   --frame <seconds> write one still, for checking layout
 */
export async function runReel(spec: ReelSpec) {
  const date = new Date().toISOString().slice(0, 10);
  const outDir = path.join(process.cwd(), 'social-out', date);
  mkdirSync(outDir, { recursive: true });

  const total = Math.round(spec.duration * FPS);
  const progressAt = (t: number) => clamp(t / ((total - 1) / FPS));
  const still = (t: number) => renderPng(spec.frame(t, progressAt(t)), REEL);

  const frameArg = process.argv.indexOf('--frame');
  if (frameArg !== -1) {
    const t = Number(process.argv[frameArg + 1]);
    const file = path.join(outDir, `${spec.name}-still-${t.toFixed(1)}.png`);
    writeFileSync(file, await still(t));
    console.log('wrote', file);
    return;
  }

  const coverFile = path.join(outDir, `${spec.name}-kapak.png`);
  writeFileSync(coverFile, await still(spec.coverAt));

  const outFile = path.join(outDir, `${spec.name}.mp4`);
  const ffmpeg = spawn(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '18',
      '-movflags', '+faststart', outFile],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise<void>((resolve, reject) =>
    ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))),
  );

  const started = Date.now();
  for (let i = 0; i < total; i++) {
    const png = await still(i / FPS);
    if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
    if (i % 90 === 0) console.log(`frame ${i}/${total}`);
  }
  ffmpeg.stdin.end();
  await done;
  console.log('wrote', outFile, coverFile, `${Math.round((Date.now() - started) / 1000)}s`);
}
