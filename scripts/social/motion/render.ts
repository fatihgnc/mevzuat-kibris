/**
 * Frame-by-frame renderer for the HTML motion scenes in this folder.
 *
 * Drives the system Chrome over the DevTools protocol (Node's built-in WebSocket, no
 * extra packages): for every frame it calls the page's renderAt(t, progress) and takes
 * a screenshot, then pipes the PNGs into ffmpeg. Each output frame is the average of
 * `subframes` renders spread across the frame interval, i.e. real motion blur.
 *
 *   npx tsx scripts/social/motion/render.ts <scene> <outName> [--frame <t>] [--cover <t>] [--subframes 2]
 *
 *   scene    HTML file in this folder without extension, e.g. "weekly"
 *   outName  base name under social-out/<date>/, e.g. "06-haftalik-ozet-reels"
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const FPS = 30;
const SIZE = { width: 1080, height: 1920 };

const args = process.argv.slice(2);
const [scene, outName] = args;
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
if (!scene || !outName) {
  console.error('usage: render.ts <scene> <outName> [--frame <t>] [--cover <t>] [--subframes <n>]');
  process.exit(1);
}

// --- Minimal CDP client ------------------------------------------------------------

class Cdp {
  private id = 0;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private listeners = new Map<string, Array<(params: any) => void>>();

  private constructor(private ws: WebSocket) {
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result);
      } else if (msg.method) {
        this.listeners.get(msg.method)?.forEach((fn) => fn(msg.params));
      }
    });
  }

  static async connect(url: string) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    return new Cdp(ws);
  }

  send<T = any>(method: string, params: object = {}): Promise<T> {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  once(method: string) {
    return new Promise<any>((resolve) => {
      const list = this.listeners.get(method) ?? [];
      const fn = (params: any) => {
        list.splice(list.indexOf(fn), 1);
        resolve(params);
      };
      list.push(fn);
      this.listeners.set(method, list);
    });
  }

  /** Evaluates an expression in the page and returns its value; throws on page errors. */
  async eval<T = any>(expression: string): Promise<T> {
    const res = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? res.exceptionDetails.text);
    return res.result.value as T;
  }

  close() {
    this.ws.close();
  }
}

async function waitForPage(): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const list = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as Array<{ type: string; webSocketDebuggerUrl: string }>;
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome not listening yet.
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Chrome did not expose a page target');
}

// --- Main --------------------------------------------------------------------------

async function main() {
  const profile = mkdtempSync(path.join(os.tmpdir(), 'mk-motion-'));
  const chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--allow-file-access-from-files',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--force-color-profile=srgb',
    '--disable-gpu-vsync',
    `--window-size=${SIZE.width},${SIZE.height}`,
    'about:blank',
  ]);

  const cdp = await Cdp.connect(await waitForPage());
  try {
    await cdp.send('Page.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { ...SIZE, deviceScaleFactor: 1, mobile: false });
    const loaded = cdp.once('Page.loadEventFired');
    await cdp.send('Page.navigate', { url: pathToFileURL(path.join(__dirname, `${scene}.html`)).href });
    await loaded;
    await cdp.eval('document.fonts.ready.then(() => document.fonts.check("900 40px SS3") && setup())');

    const duration = await cdp.eval<number>('window.DURATION');
    const date = new Date().toISOString().slice(0, 10);
    const outDir = path.join(process.cwd(), 'social-out', date);
    mkdirSync(outDir, { recursive: true });

    const shot = async (t: number, progress: number | null) => {
      await cdp.eval(`renderAt(${t}, ${progress === null ? 'null' : progress})`);
      const { data } = await cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png', fromSurface: true });
      return Buffer.from(data, 'base64');
    };

    const total = Math.round(duration * FPS);
    // Last output frame lands on exactly 1.
    const progressOf = (frame: number) => frame / (total - 1);

    const stillAt = flag('--frame');
    if (stillAt !== undefined) {
      const t = Number(stillAt);
      const file = path.join(outDir, `${outName}-still-${t.toFixed(2)}.png`);
      writeFileSync(file, await shot(t, Math.min(1, t / ((total - 1) / FPS))));
      console.log('wrote', file);
      return;
    }

    const coverAt = Number(flag('--cover') ?? '3');
    const coverFile = path.join(outDir, `${outName}-kapak.png`);
    writeFileSync(coverFile, await shot(coverAt, null));

    const sub = Math.max(1, Number(flag('--subframes') ?? '2'));
    const outFile = path.join(outDir, `${outName}.mp4`);
    // Subframes come in at FPS*sub. tmix averages each subframe with the ones before
    // it; keeping the last subframe of every group gives the average of that group.
    const ffmpeg = spawn(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * sub), '-i', '-',
        '-vf', sub > 1 ? `tmix=frames=${sub},select='eq(mod(n,${sub}),${sub - 1})',setpts=N/${FPS}/TB` : 'null',
        '-r', String(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '18',
        // Live grain makes every frame unique; without a cap the file balloons (~30 Mbps).
        '-maxrate', '10M', '-bufsize', '20M',
        '-preset', 'slow', '-movflags', '+faststart', outFile],
      { stdio: ['pipe', 'inherit', 'inherit'] },
    );
    const done = new Promise<void>((resolve, reject) =>
      ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))),
    );

    const started = Date.now();
    for (let f = 0; f < total; f++) {
      for (let k = 0; k < sub; k++) {
        // Subframes trail the frame time (shutter closes on the frame), so frame 0 and
        // the final frame stay crisp at their exact time.
        const t = (f - (sub - 1 - k) / sub) / FPS;
        const png = await shot(Math.max(0, t), progressOf(f));
        if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once('drain', r));
      }
      if (f % 90 === 0) console.log(`frame ${f}/${total}  ${((Date.now() - started) / 1000).toFixed(0)}s`);
    }
    ffmpeg.stdin.end();
    await done;
    console.log('wrote', outFile, coverFile, `${Math.round((Date.now() - started) / 1000)}s`);
  } finally {
    cdp.close();
    chrome.kill();
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // Chrome may still hold the profile for a moment on Windows; it is in tmp anyway.
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
