/*
 * Exporta el reel a MP4 H.264 renderizando cada cuadro en Chromium sin interfaz (Playwright) y codificando con ffmpeg.
 *   node tools/export.js                 → out/reel_mudo.mp4
 *   node tools/export.js --audio         → además out/reel_con_audio.mp4 (si existe el archivo de audio)
 *   node tools/export.js --stills 1,9,17 → solo cuadros sueltos en out/stills/
 * Variables: FFMPEG (ruta a ffmpeg con libx264), WORKERS (páginas en paralelo).
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const { serve } = require('./serve');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'out');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true) : null; };

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = await serve(path.join(ROOT, 'reel'));
  const url = `http://127.0.0.1:${server.address().port}/render.html`;
  const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const cfg = await (async () => {
    const p = await browser.newPage();
    await p.goto(url);
    const c = await p.evaluate(() => window.REEL_CONFIG);
    await p.close();
    return c;
  })();
  const nWorkers = parseInt(process.env.WORKERS || '3', 10);
  const pages = [];
  for (let i = 0; i < nWorkers; i++) {
    const p = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height } });
    p.on('pageerror', (e) => console.error('Error en página:', e.message));
    await p.goto(url);
    const info = await p.evaluate(() => window.reelReady);
    if (i === 0) {
      if (info.warnings.length) console.warn('Avisos:\n - ' + info.warnings.join('\n - '));
      if (!info.logo) { console.error('FALTA EL LOGO: se detiene la exportación (no se genera un reemplazo).'); process.exit(2); }
    }
    pages.push(p);
  }

  const stills = opt('--stills');
  if (stills) {
    const dir = path.join(OUT, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    const times = String(stills).split(',').map(Number);
    await Promise.all(times.map(async (t, i) => {
      const p = pages[i % pages.length];
      const b64 = await p.evaluate((tt) => window.frameAt(tt), t);
      fs.writeFileSync(path.join(dir, `t${t.toFixed(2).padStart(5, '0')}.png`), Buffer.from(b64, 'base64'));
    }));
    console.log(`Cuadros sueltos en ${dir}`);
    await browser.close(); server.close();
    return;
  }

  const total = Math.round(cfg.duration * cfg.fps);
  const video = path.join(OUT, 'reel_mudo.mp4');
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'png', '-framerate', String(cfg.fps), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-maxrate', '9M', '-bufsize', '18M', '-tune', 'film', '-pix_fmt', 'yuv420p', '-r', String(cfg.fps),
    '-frames:v', String(total), '-movflags', '+faststart', video], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg terminó con código ' + c)))));

  // Render en paralelo con reordenamiento para escribir los cuadros en orden.
  const ready = new Map();
  let next = 0, issued = 0;
  const t0 = Date.now();
  const write = async () => {
    while (ready.has(next)) {
      const buf = ready.get(next);
      ready.delete(next);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      next++;
      if (next % 60 === 0) console.log(`  ${next}/${total} cuadros (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    }
  };
  await Promise.all(pages.map(async (p) => {
    while (issued < total) {
      const f = issued++;
      const b64 = await p.evaluate((tt) => window.frameAt(tt), f / cfg.fps);
      ready.set(f, Buffer.from(b64, 'base64'));
      while (ready.size > 24 && !ready.has(next)) await new Promise((r) => setTimeout(r, 5));
      await write();
    }
  }));
  await write();
  ff.stdin.end();
  await ffDone;
  console.log(`Video mudo: ${video}`);

  if (opt('--audio')) {
    const A = cfg.audio;
    const src = path.join(ROOT, 'reel', A.src);
    if (!fs.existsSync(src)) console.warn(`Audio no encontrado (${A.src}); solo se entrega la versión muda.`);
    else {
      const withAudio = path.join(OUT, 'reel_con_audio.mp4');
      const fadeOutStart = (cfg.duration - A.fadeOut).toFixed(3);
      await new Promise((res, rej) => {
        const p = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-i', video, '-ss', String(A.AUDIO_START_SECONDS), '-t', String(cfg.duration), '-i', src,
          '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', `afade=t=in:st=0:d=${A.fadeIn},afade=t=out:st=${fadeOutStart}:d=${A.fadeOut},volume=${A.volume}`,
          '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(cfg.duration), '-movflags', '+faststart', withAudio], { stdio: 'inherit' });
        p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg (audio) terminó con código ' + c))));
      });
      console.log(`Video con audio: ${withAudio}`);
    }
  }
  await browser.close();
  server.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
