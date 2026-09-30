/*
 * Revisión técnica y cuadros de control de Revelado v2.
 *   node versiones/revelado-cancion-v2/tools/review.js
 *   node versiones/revelado-cancion-v2/tools/review.js --performance-png
 * TIMES=1,65,87 permite una pasada corta sin añadir todos los relevos.
 * Playwright se resuelve normalmente por NODE_PATH del runtime de trabajo.
 * CHROMIUM permite indicar su ejecutable; no se descarga ningún navegador.
 * No exporta video. Todas las llamadas a frameAt son SECUENCIALES en una página.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { performance } = require('perf_hooks');
const { serve } = require('../../../tools/serve');

const VERSION = path.resolve(__dirname, '..');
const ROOT = path.resolve(VERSION, '../..');
const OUT = path.join(ROOT, 'out', 'revelado-cancion-v2', 'review');
const REPORT = path.join(OUT, 'review-report.json');
const INIT_TIMEOUT_MS = 8 * 60 * 1000;
const FRAME_TIMEOUT_MS = 60 * 1000;
const EXPECTED_SAFE = { x0: 100, x1: 900, y0: 250, y1: 1500 };
const BASE_TIMES = [0, .5, 1, 5, 15, 22, 30, 44, 53, 65, 71, 74, 77, 82, 85,
  87, 89, 92, 102, 108, 114, 118.5, 122, 130, 138.84, 141, 145, 150, 154, 158, 162.7667];
const FEATURES = ['voiceSmooth', 'lowSmooth', 'highSmooth', 'rmsSmooth', 'centroidSmooth', 'flux'];
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const round = (n) => Math.round(n * 1000) / 1000;
const report = {
  version: 'revelado-cancion-v2', startedAt: new Date().toISOString(), status: 'running',
  checks: [], errors: [], warnings: [], assets: [], console: [], networkErrors: [], frames: [],
  visualReview: {
    status: 'requires-human-inspection',
    checks: ['Continuidad indígena desde su primera aparición, incluso en los relevos',
      'Colonos posteriores, separados y sin interacción', 'Anatomía y ausencia de estereotipos',
      'Coherencia de copias, grano, virado y revelado', 'Espuma en 84,18–90,28 s y arena en 138,84–152,18 s',
      'Lectura del cierre y logo intacto en celular'],
    note: 'Una captura o un conteo de figuras no demuestra continuidad visual ni calidad artística.'
  }
};

function check(name, passed, detail) {
  report.checks.push({ name, passed: !!passed, detail });
  if (!passed) report.errors.push(name);
}
function saveReport() {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
}
async function bounded(promise, ms, label) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}: límite de ${ms / 1000} s`)), ms);
    })]);
  } finally { clearTimeout(timer); }
}
function localAsset(label, relative) {
  const absolute = path.resolve(VERSION, relative);
  const inside = path.relative(ROOT, absolute);
  const contained = inside !== '..' && !inside.startsWith('..' + path.sep) && !path.isAbsolute(inside);
  const exists = contained && fs.existsSync(absolute) && fs.statSync(absolute).isFile();
  const asset = { label, path: inside.split(path.sep).join('/'), exists };
  if (exists) { const data = fs.readFileSync(absolute); asset.bytes = data.length; asset.sha256 = sha256(data); }
  report.assets.push(asset);
  check(`asset: ${label}`, exists && asset.bytes > 0, asset.path);
  return exists ? absolute : null;
}

function preflight() {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const file of ['src/config.js', 'src/v2.js']) {
    const filename = path.join(VERSION, file);
    const source = fs.readFileSync(filename, 'utf8');
    vm.runInContext(source, sandbox, { filename, timeout: 10000 });
    report.assets.push({ label: 'config-source', path: `versiones/revelado-cancion-v2/${file}`, sha256: sha256(source) });
  }
  // FONTS se obtiene del contrato compartido, no de una lista de nombres supuestos.
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'shared/lib/core.js'), 'utf8'), sandbox,
    { filename: 'shared/lib/core.js', timeout: 10000 });
  const cfg = JSON.parse(JSON.stringify(sandbox.window.REEL_CONFIG));
  const fonts = JSON.parse(JSON.stringify(sandbox.window.PBS.FONTS));
  report.config = { width: cfg.width, height: cfg.height, fps: cfg.fps, duration: cfg.duration,
    totalFrames: Math.round(cfg.duration * cfg.fps), safeZone: cfg.safeZone, closingAt: cfg.closingAt,
    audio: cfg.audio, annotationCenterX: 500 };
  check('format: 1080×1920, 30 fps, 162.8 s / 4884 frames', cfg.width === 1080 && cfg.height === 1920 &&
    cfg.fps === 30 && Math.abs(cfg.duration - 162.8) < 1e-6 && Math.round(cfg.duration * cfg.fps) === 4884, report.config);
  check('safe zone: x 100–900, y 250–1500', Object.entries(EXPECTED_SAFE).every(([k, v]) => cfg.safeZone[k] === v), cfg.safeZone);
  check('audio: complete song from 0 s', cfg.audio.AUDIO_START_SECONDS === 0, cfg.audio.AUDIO_START_SECONDS);
  for (const [key, src] of Object.entries(cfg.photos)) localAsset(`photo:${key}`, src.startsWith('plates/') ? src : cfg.assets + src);
  for (const [key, spec] of Object.entries(cfg.photoSpec)) if (spec.maskFile) localAsset(`mask:${key}`, spec.maskFile);
  localAsset('logo', cfg.assets + cfg.logo.file);
  localAsset('audio', cfg.audio.src);
  for (const font of Object.values(fonts)) for (const [file] of font.faces) localAsset(`font:${file}`, cfg.assets + 'fonts/' + file);
  const featurePath = localAsset('audio-features', cfg.featuresUrl);
  if (featurePath) {
    const data = JSON.parse(fs.readFileSync(featurePath, 'utf8'));
    const total = Math.round(cfg.duration * cfg.fps);
    report.audioFeatures = { fps: data.fps, frames: data.frames, duration: data.duration, start: data.start,
      arrays: Object.fromEntries(FEATURES.map((k) => [k, Array.isArray(data[k]) ? data[k].length : null])) };
    check('audio features: rate, duration, start and full coverage', data.fps === cfg.fps && data.frames === total &&
      Math.abs(data.duration - cfg.duration) < 1e-6 && data.start === 0 &&
      FEATURES.every((k) => Array.isArray(data[k]) && data[k].length === total && data[k].every(Number.isFinite)), report.audioFeatures);
  }
  return { cfg, fonts };
}

// Captura las métricas de fillText realmente utilizado por main.js/closing.js.
// La instrumentación es de lectura; conserva argumentos y resultado originales.
function installTextRecorder() {
  const original = CanvasRenderingContext2D.prototype.fillText;
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  const ids = new WeakMap(), seen = new Set();
  let next = 1;
  window.__reviewTextDraws = [];
  window.__reviewLogoDraws = [];
  CanvasRenderingContext2D.prototype.drawImage = function (image) {
    const result = originalDrawImage.apply(this, arguments);
    if (image instanceof HTMLImageElement && /\/assets\/logo\//.test(image.src) && arguments.length === 5) {
      const [, x, y, width, height] = arguments;
      const key = JSON.stringify(['logo', x, y, width, height]);
      if (!seen.has(key)) {
        seen.add(key);
        const tr = this.getTransform();
        window.__reviewLogoDraws.push({ src: image.src, x, y, width, height,
          naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight,
          transform: [tr.a, tr.b, tr.c, tr.d, tr.e, tr.f] });
      }
    }
    return result;
  };
  CanvasRenderingContext2D.prototype.fillText = function (text, x, y, maxWidth) {
    const result = arguments.length > 3 ? original.call(this, text, x, y, maxWidth) : original.call(this, text, x, y);
    if (!ids.has(this.canvas)) ids.set(this.canvas, next++);
    const key = JSON.stringify([ids.get(this.canvas), text, x, y, this.font, this.shadowBlur, this.textAlign]);
    if (!seen.has(key)) {
      seen.add(key);
      const m = this.measureText(String(text)), tr = this.getTransform();
      window.__reviewTextDraws.push({ canvas: ids.get(this.canvas), width: this.canvas.width, height: this.canvas.height,
        text: String(text), x, y, font: this.font, align: this.textAlign, baseline: this.textBaseline,
        shadowBlur: this.shadowBlur, advance: m.width,
        ink: { left: x - m.actualBoundingBoxLeft, right: x + m.actualBoundingBoxRight,
          top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent },
        transform: [tr.a, tr.b, tr.c, tr.d, tr.e, tr.f] });
    }
    return result;
  };
}

async function measureTypography(page) {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const C = window.REEL_CONFIG, S = C.noteStyle;
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
    const wrap = (text, font) => {
      ctx.font = font;
      const lines = [];
      for (const paragraph of String(text).split('\n')) {
        let current = '';
        for (const word of paragraph.split(' ')) {
          const candidate = current ? current + ' ' + word : word;
          if (!current || ctx.measureText(candidate).width <= S.maxW) current = candidate;
          else { lines.push(current); current = word; }
        }
        if (current) lines.push(current);
      }
      return lines;
    };
    const draws = window.__reviewTextDraws;
    const groups = new Map();
    for (const r of draws) if (r.width === C.width && r.height < C.height && r.shadowBlur === 0) {
      if (!groups.has(r.canvas)) groups.set(r.canvas, []);
      groups.get(r.canvas).push(r);
    }
    const annotations = (C.annotations || []).map((a) => {
      const first = wrap(a.word, PBS.font('serif', a.wordSize || S.wordSize, 500, true))[0];
      const rows = [...groups.values()].find((g) => g[0].height === (a.h || 420) && g.some((r) => r.text === first)) || [];
      const lines = rows.map((r) => ({ ...r, ink: { ...r.ink, top: r.ink.top + a.y, bottom: r.ink.bottom + a.y } }));
      return { id: a.id, t0: a.t0, t1: a.t1, centerX: 500, expectedTitleStart: first, lines,
        found: !!rows.length, centered: rows.length > 0 && rows.every((r) => r.x === 500 && r.align === 'center'),
        withinSafe: lines.length > 0 && lines.every((r) => r.ink.left >= C.safeZone.x0 && r.ink.right <= C.safeZone.x1 &&
          r.ink.top >= C.safeZone.y0 && r.ink.bottom <= C.safeZone.y1 && r.transform.join(',') === '1,0,0,1,0,0'),
        canvasNotClipped: rows.length > 0 && rows.every((r) => r.ink.top >= 0 && r.ink.bottom <= (a.h || 420)) };
    });
    const fontFaces = [...document.fonts].map((f) => ({ family: f.family, style: f.style, status: f.status }));
    const closingDraws = draws.filter((r) => r.width === C.width && r.height === C.height);
    return { annotations, fontFaces, closingText: PBS.CLOSING_TEXT, closingDraws, logoDraws: window.__reviewLogoDraws,
      canvas: { width: document.getElementById('frame').width, height: document.getElementById('frame').height } };
  });
}

async function main() {
  let server, browser;
  fs.mkdirSync(OUT, { recursive: true });
  try {
    const { cfg, fonts } = preflight();
    if (report.errors.length) throw new Error('Falla el preflight; no se inicia un render con material ausente.');
    let chromium;
    try { ({ chromium } = require('playwright')); }
    catch (e) { throw new Error('No se encontró Playwright. Configurar NODE_PATH con node_modules del runtime de trabajo. ' + e.message); }
    server = await serve(ROOT);
    const url = `http://127.0.0.1:${server.address().port}/versiones/revelado-cancion-v2/render.html?log`;
    const launch = { headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox'] };
    if (process.env.CHROMIUM) launch.executablePath = process.env.CHROMIUM;
    browser = await chromium.launch(launch);
    report.runtime = { node: process.version, chromium: browser.version(), executable: process.env.CHROMIUM || 'Playwright default', url };
    const page = await browser.newPage({ viewport: { width: cfg.width, height: cfg.height }, deviceScaleFactor: 1 });
    await page.addInitScript(installTextRecorder);
    page.on('pageerror', (error) => { report.errors.push('pageerror: ' + error.message); });
    page.on('console', (message) => {
      report.console.push({ type: message.type(), text: message.text() });
      if (message.type() === 'warning') report.warnings.push(message.text());
      if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')) report.errors.push('console: ' + message.text());
      if (message.text().startsWith('LOG ')) console.log(message.text());
    });
    page.on('requestfailed', (request) => {
      if (!request.url().endsWith('/favicon.ico')) report.networkErrors.push({ url: request.url(), failure: request.failure() });
    });
    page.on('response', (response) => {
      if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) report.networkErrors.push({ url: response.url(), status: response.status() });
    });
    const initStart = performance.now();
    await bounded((async () => {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: INIT_TIMEOUT_MS });
      report.ready = await page.evaluate(() => window.reelReady);
    })(), INIT_TIMEOUT_MS, 'Inicialización');
    report.initMs = round(performance.now() - initStart);
    report.warnings.push(...(report.ready.warnings || []));
    check('ready: intact logo available', report.ready.logo === true, report.ready);
    const missingWarnings = (report.ready.warnings || []).filter((w) => /FALTA|no cargada|Sin rasgos de audio/i.test(w));
    check('ready: no missing photos, masks, fonts, logo or features', missingWarnings.length === 0, missingWarnings);
    const currentCfg = await page.evaluate(() => window.REEL_CONFIG);
    // createReel completa groups.startAuto y precalcula groups.tab en el objeto
    // compartido. Ese estado derivado no debe invalidar la configuración editorial.
    const immutableKeys = ['width', 'height', 'fps', 'duration', 'seed', 'safeZone', 'assets',
      'photos', 'photoSpec', 'featuresUrl', 'audio', 'logo', 'sections', 'annotations',
      'noteStyle', 'closingAt', 'closing'];
    const changedKeys = immutableKeys.filter((key) => JSON.stringify(currentCfg[key]) !== JSON.stringify(cfg[key]));
    check('browser editorial config matches preflight (excluding derived groups)', changedKeys.length === 0,
      { compared: immutableKeys, changed: changedKeys, excludedDerivedState: 'groups.start and groups.tab' });
    if (report.errors.length) throw new Error('Inicialización con errores; se detiene antes de capturar.');

    const relays = cfg.sections.filter((section, i, all) => i > 0 && section.print !== all[i - 1].print).map((s) => s.t0);
    const customTimes = process.env.TIMES ? process.env.TIMES.split(',').map(Number) : null;
    if (customTimes && customTimes.some((t) => !Number.isFinite(t) || t < 0 || t >= cfg.duration))
      throw new Error('TIMES debe contener segundos válidos separados por comas, entre 0 y duration.');
    const requestedTimes = customTimes || [...BASE_TIMES, ...relays.flatMap((t) => [t - .2, t, t + .2])];
    const times = [...new Set(requestedTimes
      .filter((t) => t >= 0 && t < cfg.duration).map((t) => Number(t.toFixed(4))))].sort((a, b) => a - b);
    report.capturePlan = { mode: customTimes ? 'custom-times-spot-check' : 'full-control-frames-and-relays', times,
      coversAllRequestedControlFrames: customTimes === null };
    report.relayCenters = relays;
    async function capture(t, filename) {
      const start = performance.now();
      const b64 = await bounded(page.evaluate((tt) => window.frameAt(tt), t), FRAME_TIMEOUT_MS, `Cuadro ${t}`);
      const bytes = Buffer.from(b64, 'base64');
      check(`PNG signature: ${filename}`, bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])));
      check(`PNG dimensions: ${filename}`, bytes.readUInt32BE(16) === cfg.width && bytes.readUInt32BE(20) === cfg.height);
      fs.writeFileSync(path.join(OUT, filename), bytes);
      const item = { time: t, file: filename, bytes: bytes.length, sha256: sha256(bytes), captureMs: round(performance.now() - start) };
      report.frames.push(item);
      return item;
    }
    // No Promise.all: frameAt llama render(t) y luego toBlob sobre el mismo canvas.
    for (const t of times) {
      await capture(t, `t${t.toFixed(4).padStart(8, '0')}.png`);
      console.log(`Revisión ${report.frames.length}/${times.length}: ${t.toFixed(4)} s`);
      saveReport();
    }
    const before = await capture(87, 'determinism_87_before.png');
    await capture(145, 'determinism_145_between.png');
    const after = await capture(87, 'determinism_87_after.png');
    report.determinism = { sequence: [87, 145, 87], before: before.sha256, after: after.sha256, identical: before.sha256 === after.sha256 };
    check('determinism: SHA256 PNG at 87 s before/after 145 s', report.determinism.identical, report.determinism);

    const pngPerformance = process.argv.includes('--performance-png');
    const performanceSamples = [];
    const total = Math.round(cfg.duration * cfg.fps);
    for (let f = total - 10; f < total; f++) {
      const ms = await bounded(page.evaluate(async ({ t, png }) => {
        const started = performance.now();
        if (png) await window.frameAt(t);
        else {
          window.reel.render(t);
          // Forzar la materialización del canvas evita medir sólo comandos encolados.
          document.getElementById('frame').getContext('2d').getImageData(0, 0, 1, 1);
        }
        return performance.now() - started;
      }, { t: f / cfg.fps, png: pngPerformance }), FRAME_TIMEOUT_MS, `Rendimiento cuadro ${f}`);
      performanceSamples.push({ frame: f, time: f / cfg.fps, ms: round(ms) });
    }
    const sorted = performanceSamples.map((s) => s.ms).sort((a, b) => a - b);
    report.performance = { mode: pngPerformance ? 'render + PNG + base64' : 'render + canvas pixel readback (without PNG)',
      samples: performanceSamples, minMs: sorted[0], medianMs: round((sorted[4] + sorted[5]) / 2),
      meanMs: round(sorted.reduce((a, b) => a + b, 0) / sorted.length), p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], maxMs: sorted[sorted.length - 1],
      scope: 'Sólo los diez cuadros finales; no certifica el máximo del reel completo.' };
    if (!pngPerformance) check('performance: final ten rendered frames ≤ 600 ms each', report.performance.maxMs <= 600, report.performance);

    report.typography = await measureTypography(page);
    for (const font of Object.values(fonts)) for (const [, style] of font.faces)
      check(`loaded font: ${font.family} ${style}`, report.typography.fontFaces.some((f) => f.family.replaceAll('"', '') === font.family && f.style === style && f.status === 'loaded'));
    for (const annotation of report.typography.annotations) {
      check(`annotation ${annotation.id}: drawn, centered at 500 and inside safe zone`, annotation.found && annotation.centered && annotation.withinSafe && annotation.canvasNotClipped, annotation);
    }
    check('closing: exact required wording, no AI note', report.typography.closingText.title === 'Día del Patrimonio 2026' &&
      report.typography.closingText.motto === 'Raíces indígenas:\npasado, presente y futuro' &&
      report.typography.closingText.date === '3 y 4 de octubre' && !report.typography.closingText.note, report.typography.closingText);
    check('closing: all measured text ink within safe zone', report.typography.closingDraws.length > 0 && report.typography.closingDraws.every((r) =>
      r.ink.left >= cfg.safeZone.x0 && r.ink.right <= cfg.safeZone.x1 && r.ink.top >= cfg.safeZone.y0 && r.ink.bottom <= cfg.safeZone.y1), report.typography.closingDraws);
    check('logo: measured within safe zone and source aspect ratio intact', report.typography.logoDraws.length > 0 &&
      report.typography.logoDraws.every((r) => r.x >= cfg.safeZone.x0 && r.x + r.width <= cfg.safeZone.x1 &&
        r.y >= cfg.safeZone.y0 && r.y + r.height <= cfg.safeZone.y1 &&
        Math.abs(r.width / r.height - r.naturalWidth / r.naturalHeight) < 1e-6 && r.transform.join(',') === '1,0,0,1,0,0'), report.typography.logoDraws);
    check('network: no failed assets', report.networkErrors.length === 0, report.networkErrors);
    const unsafeWarnings = report.warnings.filter((w) => /zona segura/i.test(w));
    check('layout: no safe-zone warnings from renderer', unsafeWarnings.length === 0, unsafeWarnings);
    report.renderer = await page.evaluate(() => ({ initMs: window.__rv && window.__rv.initMs, relays: window.__rv && window.__rv.relays }));
  } catch (error) {
    report.errors.push(error.stack || error.message || String(error));
    console.error(error.message || error);
  } finally {
    if (browser) await browser.close().catch((e) => report.errors.push('browser close: ' + e.message));
    if (server) await new Promise((resolve) => server.close(resolve));
    report.warnings = [...new Set(report.warnings)];
    report.errors = [...new Set(report.errors)];
    report.status = report.errors.length ? 'failed' : report.capturePlan && report.capturePlan.mode === 'custom-times-spot-check'
      ? 'spot-check-passed-visual-review-required' : 'technical-checks-passed-visual-review-required';
    report.finishedAt = new Date().toISOString();
    saveReport();
    console.log(`${report.status}: ${REPORT}`);
    if (report.errors.length) process.exitCode = 1;
  }
}

main();
