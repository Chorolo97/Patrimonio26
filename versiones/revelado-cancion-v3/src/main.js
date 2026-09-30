/*
 * Punta Ballena v3 · motor (Canvas 2D). window.createReel(canvas, cfg) → { render(t), warnings, logo }.
 * render(t) es función pura de t (sin estado entre cuadros): copias viradas fijas con empuje ≤ 7 %, la familia en tinta plana,
 * una palabra por capítulo y una sola transición: la onda lenta de revelado.
 */
(function () {
  const TAU = Math.PI * 2;
  const W = 1080, H = 1920;
  const INK = '#2a2019';
  // lienzos en memoria de CPU (Skia raster): en Chromium sin GPU es mucho más rápido que el camino acelerado emulado
  const CTX2D = { willReadFrequently: true };
  const cl = PBS.clamp, S = PBS.smooth, E = PBS.ease, lerp = PBS.lerp;
  const win = (t, a, b, f = 0.8) => S((t - a) / f) * S((b - t) / f);

  window.createReel = async function (canvas, cfg) {
    const warnings = [];
    const ctx = canvas.getContext('2d', CTX2D);
    await PBS.loadFonts(cfg.assets + 'fonts/', warnings);
    const A = await PBS.loadAudioFeatures(cfg.featuresUrl);
    if (A.missing) warnings.push('Rasgos de audio no disponibles: la espuma y el viento no respiran con la música.');
    const I = {};
    const need = { mar: 'mar.jpg', papel: 'papel.jpg', tacuari: 'tacuari.jpg', espuma: 'espuma.jpg', espumaLuz: 'espuma_luz.png', barco: 'barco.jpg', carape: 'carape.jpg', arena: 'arena.jpg', hoy: 'hoy.png' };
    await Promise.all(Object.entries(need).map(async ([k, f]) => {
      try { I[k] = await PBS.loadImage(cfg.plates + f); } catch (e) { warnings.push('Falta la copia ' + f + ' (python3 tools/prepare.py y tools/peninsula.py).'); }
    }));
    let shape = null;
    try { shape = await (await fetch(cfg.plates + 'hoy_shape.json')).json(); } catch (e) { warnings.push('Falta plates/hoy_shape.json'); }
    let logo = null;
    try { logo = await PBS.loadImage(cfg.assets + cfg.logo.file); } catch (e) { warnings.push('FALTA EL LOGO ' + cfg.logo.file); }
    const RV = window.RV, U = RV.LIVE_UTIL;
    // caja de tinta del logo (columnas con alfa), para centrar lo dibujado
    let logoBox = null;
    if (logo) { const c = document.createElement('canvas'); c.width = logo.naturalWidth; c.height = logo.naturalHeight; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(logo, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, x1 = -1;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
      if (x1 > x0) logoBox = [x0, x1 + 1]; }

    // ---------------- lienzos auxiliares ----------------
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const bufB = mk(W, H), gB = bufB.getContext('2d', CTX2D);
    const bufM = mk(W, H), gM = bufM.getContext('2d', CTX2D);
    // grano: una teja de ruido gris que se corre cada cuadro (determinista por número de cuadro)
    const GT = 384, grainC = mk(GT, GT);
    { const g = grainC.getContext('2d', CTX2D), id = g.createImageData(GT, GT), r = PBS.rng(cfg.seed);
      for (let i = 0; i < GT * GT; i++) { const v = 128 + (r() + r() + r() - 1.5) * 70; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
      g.putImageData(id, 0, 0); }
    const grainPat = ctx.createPattern(grainC, 'repeat');

    // ---------------- onda de revelado ----------------
    // campo v(x, y) = base (posición vertical) + ruido fbm que deriva despacio; se revela donde v < frente.
    const MW = 180, MH = 320;
    const waveC = { mask: mk(MW, MH), tint: mk(MW, MH) };
    const noiseCache = {};
    const noiseField = (seed) => {
      if (noiseCache[seed]) return noiseCache[seed];
      const N = PBS.makeNoise(seed), a = new Float32Array(MW * MH), b = new Float32Array(MW * MH);
      for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
        a[y * MW + x] = N.fbm(x / 30, y / 16, 4);
        b[y * MW + x] = N.fbm(x / 9 + 40, y / 9 - 17, 3);
      }
      return (noiseCache[seed] = { a, b });
    };
    const maskCanvases = {};
    // p: 0 → nada revelado, 1 → todo. dir 'up' (de abajo hacia arriba) o 'down'. o: {amp, soft, seed, tint}
    function waveMask(key, p, dir, o, t) {
      const mc = maskCanvases[key] || (maskCanvases[key] = { m: mk(MW, MH), k: mk(MW, MH) });
      const nf = noiseField(o.seed || 1);
      const amp = o.amp == null ? 0.34 : o.amp, soft = o.soft == null ? 0.035 : o.soft;
      const e = -soft + p * (1 + 2 * soft);
      const gm = mc.m.getContext('2d', CTX2D), gk = mc.k.getContext('2d', CTX2D);
      const im = gm.createImageData(MW, MH), ik = gk.createImageData(MW, MH);
      const drift = Math.sin(t * 0.7) * 0.03, tk = o.tint == null ? 0.16 : o.tint;
      for (let y = 0; y < MH; y++) {
        const base = dir === 'up' ? 1 - y / (MH - 1) : y / (MH - 1);
        for (let x = 0; x < MW; x++) {
          const i = y * MW + x;
          const n = nf.a[i] * 0.78 + nf.b[i] * 0.22 + drift * Math.sin(x * 0.05 + t * 0.9);
          const v = base * (1 - amp) + amp * n;
          const d = (v - e) / soft;
          const a = d <= -1 ? 1 : d >= 1 ? 0 : 0.5 - 0.5 * Math.sin(d * Math.PI / 2);
          im.data[i * 4 + 3] = a * 255;
          // borde de revelador: la copia recién tocada por el líquido queda un poco más densa (tinta, no luz)
          const band = Math.exp(-d * d * 0.8) * (d > -2.2 ? 1 : 0);
          ik.data[i * 4] = 42; ik.data[i * 4 + 1] = 32; ik.data[i * 4 + 2] = 25; ik.data[i * 4 + 3] = band * tk * 255 * (p > 0.001 && p < 0.999 ? 1 : 0);
        }
      }
      gm.putImageData(im, 0, 0); gk.putImageData(ik, 0, 0);
      return mc;
    }
    // dibuja fn en un búfer y lo pone sobre g sólo donde la onda ya pasó
    function revealed(g, buf, fn, key, p, dir, o, t) {
      if (p <= 0) return;
      if (p >= 1 && !o.keepTint) { fn(g); return; }
      const gb = buf.getContext('2d', CTX2D);
      gb.setTransform(1, 0, 0, 1, 0, 0); gb.globalCompositeOperation = 'source-over'; gb.globalAlpha = 1; gb.clearRect(0, 0, W, H);
      fn(gb);
      const mc = waveMask(key, p, dir, o, t);
      gb.setTransform(1, 0, 0, 1, 0, 0); gb.globalCompositeOperation = 'destination-in';
      gb.imageSmoothingEnabled = true; gb.imageSmoothingQuality = 'high';
      gb.drawImage(mc.m, 0, 0, W, H);
      gb.globalCompositeOperation = 'source-over';
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(buf, 0, 0);
      if (o.tint !== 0) { g.imageSmoothingEnabled = true; g.drawImage(mc.k, 0, 0, W, H); }
      g.restore();
    }

    // ---------------- utilidades de dibujo ----------------
    const env = (t) => ({ low: A.at('lowSmooth', t), rms: A.at('rmsSmooth', t), flux: A.at('fluxSmooth', t) });
    const cam = (g, fx, fy, z) => g.setTransform(z, 0, 0, z, fx - fx * z, fy - fy * z);
    const plate = (g, img) => { if (img) g.drawImage(img, 0, 0, W, H); else { g.fillStyle = '#8a7a66'; g.fillRect(0, 0, W, H); } };
    const paper = (g) => { g.setTransform(1, 0, 0, 1, 0, 0); if (I.papel) g.drawImage(I.papel, 0, 0); else { g.fillStyle = '#F1EBDD'; g.fillRect(0, 0, W, H); } };
    const fam = (g, list, t, paint) => { for (const lv of list) FAM.draw(g, lv, t, env(t), RV, paint || { cast: [0.45, 0.16] }); };
    const veil = (g, y, a) => {
      if (a <= 0.001) return;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      const gr = g.createRadialGradient(540, y, 0, 540, y, 520);
      gr.addColorStop(0, `rgba(242,234,219,${a})`); gr.addColorStop(0.55, `rgba(242,234,219,${a * 0.6})`); gr.addColorStop(1, 'rgba(242,234,219,0)');
      g.fillStyle = gr; g.translate(540, y); g.scale(1, 230 / 520); g.translate(-540, -y); g.fillRect(0, y - 520, W, 1040); g.restore();
    };
    // palabra + glosa centradas EXACTAMENTE en x = 540, ancho máximo 720 (la letra se achica si no entra)
    const fitFont = (g, kind, size, weight, italic, text, ls, maxW) => {
      let s = size;
      for (;;) { g.font = PBS.font(kind, s, weight, italic); g.letterSpacing = (ls * s) + 'px'; const w = g.measureText(text).width - ls * s; if (w <= maxW || s <= 20) return { s, w }; s -= 1; }
    };
    // centra la TINTA (caja real de los glifos, incluido el espaciado) exactamente en x = 540
    const inkCentre = (g, s, y) => { g.textAlign = 'left'; const m = g.measureText(s); g.fillText(s, 540 - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, y); g.textAlign = 'center'; };
    function word(g, wd, t, dbg) {
      const a = win(t, wd.t0, wd.t1, 0.9);
      if (a <= 0.001) return;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      if (wd.veil) veil(g, wd.top + 70, wd.veil * a);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const rise = (1 - E((t - wd.t0) / 1.4)) * 8;
      const f1 = fitFont(g, 'serif', wd.size || 116, 400, false, wd.word, 0.01, 720);
      const base1 = wd.top + f1.s * 0.74 + rise;
      g.globalAlpha = a; g.fillStyle = wd.color || INK;
      // con letterSpacing el navegador suma el espacio también detrás de la última letra: se compensa medio espacio
      if (dbg && dbg.noText) { g.restore(); return; }
      inkCentre(g, wd.word, base1);
      if (wd.gloss) {
        const f2 = fitFont(g, 'sans', 36, 400, false, wd.gloss, 0.06, 720);
        g.globalAlpha = a * 0.95; g.fillStyle = wd.gcolor || '#4b3e33';
        inkCentre(g, wd.gloss, base1 + 26 + f1.s * 0.24 + f2.s * 0.72);
      }
      g.restore();
    }
    const wordsAt = (g, t, dbg) => { for (const wd of cfg.words) if (t > wd.t0 - 0.1 && t < wd.t1 + 0.1) word(g, wd, t, dbg); };

    // ---------------- capítulos ----------------
    const SC = {};
    const wind = (d, k = 1) => (t) => FAM.wind(d, t, env(t), k);

    // I · El mar (0–40,42): la copia aérea se revela desde abajo; arriba sigue el papel. En el verso 1 la cámara baja hacia la familia.
    const famMar = (t) => { const w = FAM.wind(1, t, env(t), 0.9); return [
      { kind: 'elder', at: [786, 903], h: 74, facing: 1, opts: { staff: 1 }, wind: w, look: [[0, 1]] },
      { kind: 'adult', at: [815, 900], h: 76, facing: 1, wind: w, shade: [[0, 1], [22, 1], [23.2, 0], [30, 0], [31.2, 1]] },
      { kind: 'child', at: [846, 905], h: 76, facing: 1, wind: w, look: [[24, 1], [25, -1], [27.5, -1], [28.5, 1]], nod: [[24, 0], [25, 0.15], [27.5, 0.15], [28.5, 0]] },
    ]; };
    SC.mar = (g, t) => {
      paper(g);
      const z = 1 + 0.07 * E((t - 19.06) / (40.4 - 19.06));
      const p = 0.5 + 0.2 * E((t + 0.6) / 7.0);
      revealed(g, bufM, (gg) => { cam(gg, 815, 900, z); plate(gg, I.mar); }, 'marRev', p, 'up', { amp: 0.16, soft: 0.1, seed: 11, tint: 0.08, keepTint: 1 }, t);
      cam(g, 815, 900, z);
      const fa = S((t - 1.2) / 2.5);
      fam(g, famMar(t).map((l) => ({ ...l, alpha: fa })), t, { cast: [0.55, 0.12], shadow: 'rgba(24,18,14,0.3)' });
      g.setTransform(1, 0, 0, 1, 0, 0);
    };

    // II · Serranía (40,42–62,52): el mapa se dibuja; el camino avanza del Yaguarón a Punta Ballena y la familia camina en su punta
    const routeF = (t) => E((t - 50.4) / (60.5 - 50.4));
    SC.mapa = (g, t) => {
      paper(g);
      const fade = S((t - 60.9) / 1.0) * 0.7;
      const head = MAPA.draw(g, t, { route: routeF(t), fade, ringAt: 60.3 });
      const L = MAPA.route.L;
      const fa = S((t - 48.4) / 1.0) * (1 - fade);
      // los tres caminan uno al lado del otro junto a la punta de la línea (el niño adelante, sobre la línea)
      const mk1 = (kind, dx, dy, ph, opts) => {
        const track = (tt) => { const f = Math.max(0, routeF(tt)); const q = MAPA.pointAt(MAPA.route, f); return [q[0] + dx, q[1] + 5 + dy, f * L]; };
        return { kind, h: 54, facing: -1, track, routeV: 9, cadence: 0.4, phase: ph, opts, wind: -1.5, alpha: fa };
      };
      fam(g, [mk1('elder', 40, -4, 0.6, { staff: 1 }), mk1('adult', 22, -2, 0.3), mk1('child', 4, 0, 0)], t, { ink: '#2b2119', shadow: 'rgba(43,33,25,0.18)' });
    };

    // III · Los ríos (62,52–84,18): orilla del Tacuarí. A junta agua, N la mira y luego mira el río, M descansa en la barranca.
    SC.tacuari = (g, t) => {
      const z = 1 + 0.04 * E((t - 61.2) / 23);
      cam(g, 560, 1440, z); plate(g, I.tacuari);
      const w = FAM.wind(1, t, env(t), 0.7);
      fam(g, [
        { kind: 'elder', seated: 1, at: [412, 1502], h: 250, facing: 1, wind: w, look: [[62, 1], [70, 1], [71.2, 0.4], [76, 0.4], [77.2, 1]], nod: [[70, 0], [71.2, -0.08]] },
        { kind: 'child', at: [566, 1474], h: 250, facing: 1, wind: w, look: [[62, 1], [72.5, 1], [73.6, 0.5], [79, 0.5], [80, 1]], nod: [[62, 0.14], [72.5, 0.14], [73.6, -0.06], [79, -0.06], [80, 0.14]] },
        { kind: 'adult', at: [690, 1450], h: 250, facing: 1, wind: w, squat: [[60, 0.82]], headRot: 0.28, gather: { t0: 63.2, period: 4.2, far: 9 } },
      ], t, { cast: [0.6, 0.1], shadow: 'rgba(24,18,14,0.28)' });
      g.setTransform(1, 0, 0, 1, 0, 0);
    };

    // IV · Espuma (84,18–90,28): sólo se mueve la espuma, que crece con los golpes de la canción
    SC.espuma = (g, t) => {
      const z = 1 + 0.03 * E((t - 83.5) / 7.7);
      cam(g, 540, 900, z); plate(g, I.espuma);
      if (I.espumaLuz) {
        const e = env(t), en = cl(0.25 + 0.9 * e.low + 0.6 * e.flux, 0, 1.4);
        const grow = S((t - 84.2) / 4.5);
        g.save(); g.globalCompositeOperation = 'screen';
        g.globalAlpha = cl(0.1 + 0.45 * en * (0.4 + 0.6 * grow), 0, 0.75);
        const sy = 1 + 0.025 * en * grow; g.translate(540, 1920); g.scale(1 + 0.01 * en, sy); g.translate(-540, -1920);
        g.drawImage(I.espumaLuz, 0, -30 * grow * en);
        g.restore();
      }
      const w = FAM.wind(1, t, env(t), 1.2);
      fam(g, [
        { kind: 'elder', at: [314, 607], h: 100, facing: 1, opts: { staff: 1 }, wind: w },
        { kind: 'adult', at: [348, 603], h: 102, facing: 1, wind: w, nod: [[84, 0.1]] },
        { kind: 'child', at: [381, 607], h: 102, facing: 1, wind: w, nod: [[84, 0.18]] },
      ], t, { cast: [0.4, 0.1], shadow: 'rgba(24,18,14,0.3)' });
      g.setTransform(1, 0, 0, 1, 0, 0);
    };

    // V · Horizonte (90,28–110,48): un bergantín entra lejos y fondea; un bote llega a la playa; dos colonos quedan aparte.
    SC.barco = (g, t) => {
      const z = 1 + 0.05 * E((t - 89.7) / 21.6);
      cam(g, 520, 1000, z); plate(g, I.barco);
      const e = env(t);
      // barco: llega por la derecha, frena al fondear, aferra el paño; cabecea
      const u = cl((t - 91.6) / 9.0, 0, 1), ee = 1 - Math.pow(1 - u, 2.2);
      const sx = lerp(1180, 772, ee), sa = S((t - 91.6) / 1.2);
      const set = 1 - 0.9 * S((t - 100.2) / 2.6);
      const pitch = 0.018 * Math.sin(t * TAU / 5.3) + 0.008 * Math.sin(t * TAU / 2.7 + 1.1);
      const heave = 0.7 * Math.sin(t * TAU / 4.1 + 0.6);
      g.save(); g.globalAlpha = sa * 0.92;
      const su = 0.98;
      g.save(); g.translate(sx, 818); g.scale(-su, -su); g.fillStyle = 'rgba(42,32,25,0.35)';
      RV.drawShipReflection(g, { set, pitch, heave }, t, 0.5); g.restore();
      g.save(); g.translate(sx, 818); g.scale(-su, -su); g.fillStyle = INK;
      RV.drawShip(g, { set, pitch, heave }, { body: INK, sail: 'rgba(92,78,64,0.95)' }); g.restore();
      g.restore();
      // bote de remos: del costado del barco a la orilla (crece con la perspectiva), varado queda quieto
      const bu = S((t - 100.9) / 4.5), ba = S((t - 100.6) / 0.6);
      if (ba > 0) {
        const bx = lerp(740, 372, bu), by = lerp(826, 926, bu), bs = lerp(0.1, 0.19, bu);
        const rowing = 1 - S((t - 105.0) / 0.6), bob = 0.6 * Math.sin(t * 2.1) * rowing;
        g.save(); g.globalAlpha = ba * 0.92; g.translate(bx, by + bob); g.scale(-bs, -bs); g.fillStyle = INK;
        RV.drawBoat(g, { row: t * 0.75, oars: rowing }); g.restore();
      }
      // colonos junto al bote, lejos y aparte; no miran a la familia
      const ca = S((t - 105.2) / 1.0);
      if (ca > 0) for (const [x, y, h, ph] of [[402, 931, 38, 0], [419, 933, 39, 1.3]]) {
        g.save(); g.globalAlpha = ca * 0.92; g.translate(x, y); g.scale(h / 100, -h / 100); g.fillStyle = INK;
        FAM.colonist(g, U, 0.3 * Math.sin(t * 0.8 + ph)); g.restore();
      }
      const w = FAM.wind(1, t, e, 0.8);
      fam(g, [
        { kind: 'elder', at: [122, 1342], h: 290, facing: 1, opts: { staff: 1 }, staffX: 17, wind: w, look: [[90, 1]] },
        { kind: 'child', at: [200, 1350], h: 290, facing: 1, wind: w, hold: [-19, 44], holdFar: 1, look: [[90, 1], [101, 1], [102, -1], [104.5, -1], [105.5, 1]], nod: [[90, -0.05]] },
        { kind: 'adult', at: [304, 1334], h: 290, facing: 1, wind: w, nod: [[90, -0.02], [100, -0.02], [101, 0.04]] },
      ], t, { cast: [0.6, 0.12], shadow: 'rgba(24,18,14,0.3)' });
      g.setTransform(1, 0, 0, 1, 0, 0);
    };

    // VI · Carapé / Aiguá (110,48–132): mirando la lejanía serrana; A señala, N mira donde señala, M se apoya en el bastón
    SC.carape = (g, t) => {
      const z = 1 + 0.05 * E((t - 109.8) / 23);
      cam(g, 520, 1100, z); plate(g, I.carape);
      // bruma lenta entre los dos nombres (117,8–120,8)
      const mist = win(t, 117.4, 121.4, 1.6);
      if (mist > 0) {
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
        for (let i = 0; i < 3; i++) {
          const y = 700 + i * 170 + 20 * Math.sin(t * 0.3 + i), x = ((t - 117) * (18 + i * 6) + i * 300) % 1400 - 200;
          const gr = g.createRadialGradient(x, y, 0, x, y, 520);
          gr.addColorStop(0, `rgba(240,233,219,${0.32 * mist})`); gr.addColorStop(1, 'rgba(240,233,219,0)');
          g.fillStyle = gr; g.save(); g.translate(x, y); g.scale(1.6, 0.35); g.translate(-x, -y); g.fillRect(x - 520, y - 520, 1040, 1040); g.restore();
        }
        g.restore(); cam(g, 520, 1100, z);
      }
      const w = FAM.wind(-1, t, env(t), 0.8);
      fam(g, [
        { kind: 'child', at: [432, 1262], h: 220, facing: -1, wind: w, nod: [[110, 0], [112.8, 0], [113.8, 0.22], [118.5, 0.22], [119.5, 0.05], [122.4, 0.05], [123.4, 0.22], [127, 0.22], [128, 0]] },
        { kind: 'adult', at: [522, 1250], h: 220, facing: -1, wind: w, point: [[112.4, 118.6, 0.92, 0.36], [122.2, 127.4, 0.95, 0.3]] },
        { kind: 'elder', at: [604, 1262], h: 220, facing: -1, opts: { staff: 1 }, wind: w },
      ], t, { cast: [-0.55, 0.12], shadow: 'rgba(24,18,14,0.28)' });
      g.setTransform(1, 0, 0, 1, 0, 0);
    };

    // VII · Arena (132–152): la familia camina hacia el mar; desde 138,84 el viento suelta granos de granito
    const grains = (() => { const r = PBS.rng(771), a = [];
      for (let i = 0; i < 900; i++) a.push({ tb: 138.84 + Math.pow(r(), 0.8) * 12, x: 760 + r() * 360, y: 1250 + r() * 330, v: 60 + r() * 90, lift: 10 + r() * 50, life: 2.5 + r() * 3.5, r: 0.7 + r() * 1.9, ph: r() * TAU, a: 0.35 + r() * 0.5 });
      return a; })();
    SC.arena = (g, t) => {
      const z = 1 + 0.045 * E((t - 131.3) / 17.6);
      cam(g, 480, 1160, z); plate(g, I.arena);
      if (t > 138.8) {
        g.save(); g.fillStyle = INK; const e = env(t);
        for (const p of grains) {
          const age = t - p.tb; if (age < 0 || age > p.life) continue;
          const k = age / p.life, gust = 1 + 0.4 * e.low;
          const x = p.x - p.v * age * gust - 20 * age * age, y = p.y - p.lift * Math.sin(Math.min(1, k * 1.5) * Math.PI) * 0.6 + 8 * Math.sin(age * 3 + p.ph) - 14 * age;
          g.globalAlpha = p.a * S(k / 0.12) * S((1 - k) / 0.3);
          g.beginPath(); g.ellipse(x, y, p.r * 1.3, p.r * 0.8, 0.3, 0, TAU); g.fill();
        }
        g.restore();
      }
      const w = FAM.wind(1, t, env(t), 1.1);
      const walk = (x0, x1, y0, y1) => [[132.0, x0, y0], [146.5, x1, y1]];
      fam(g, [
        { kind: 'elder', route: walk(250, 470, 1192, 1166), routeV: 12, h: 172, facing: 1, opts: { staff: 1 }, phase: 0.6, wind: w },
        { kind: 'adult', route: walk(330, 550, 1184, 1158), routeV: 12, h: 172, facing: 1, phase: 0.2, wind: w },
        { kind: 'child', route: walk(398, 618, 1180, 1154), routeV: 12, h: 172, facing: 1, phase: 0.0, wind: w },
      ], t, { cast: [0.7, 0.1], shadow: 'rgba(24,18,14,0.26)' });
      g.setTransform(1, 0, 0, 1, 0, 0);
    };

    // VII-b · Hoy (146–162,8): la misma punta en color (ilustración original, forma trazada de la referencia); el niño mira el mar.
    const stand = [648, 1676];   // roca firme en la punta (a > 26 px del agua en el trazado)
    SC.hoy = (g, t) => {
      const C = cfg.closing;
      const calm = t < C.calm ? 1 : 0.4;
      const tz = t < C.calm ? t : C.calm + (t - C.calm) * 0.4;
      const z = 1 + 0.035 * E((tz - 146) / 16);
      cam(g, stand[0], stand[1], z); plate(g, I.hoy);
      const w = FAM.wind(-1, t, env(t), 0.8 * calm);
      fam(g, [
        { kind: 'elder', at: [stand[0] - 38, stand[1] - 6], h: 80, facing: 1, opts: { staff: 1 }, wind: w },
        { kind: 'adult', at: [stand[0] - 8, stand[1] - 2], h: 80, facing: 1, wind: w },
        { kind: 'child', at: [stand[0] + 28, stand[1] + 10], h: 80, facing: 1, wind: w, nod: [[146, 0.12]] },
      ], t, { ink: '#1f2528', cast: [0.5, 0.14], shadow: 'rgba(15,25,20,0.3)' });
      g.setTransform(1, 0, 0, 1, 0, 0);
      // cierre: una onda irregular lleva la mitad superior de vuelta al papel; la punta, el mar y la familia siguen abajo
      const pc = 0.56 * E((t - C.wave[0]) / (C.wave[1] - C.wave[0]));
      if (pc > 0) revealed(g, bufM, (gg) => paper(gg), 'cierre', pc, 'down', { amp: 0.14, soft: 0.022, seed: 23, tint: 0.06, keepTint: 1 }, tz);
    };

    // ---------------- cierre: datos y logo original en color, centrados en x = 540 ----------------
    function closing(g, t) {
      const C = cfg.closing, a = S((t - C.text) / 1.1);
      if (a <= 0) return;
      const T = PBS.CLOSING_TEXT;
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      const rise = (1 - E((t - C.text) / 1.6)) * 8;
      let y = C.y + rise;
      g.globalAlpha = a;
      const f1 = fitFont(g, 'serif', 72, 500, false, T.title, 0, 720);
      g.fillStyle = INK; inkCentre(g, T.title, y + f1.s * 0.74); y += f1.s * 0.74 + 30;
      g.fillStyle = '#3d342b';
      for (const ln of T.motto.split('\n')) { const f = fitFont(g, 'sans', 44, 500, false, ln, 0.02, 720); y += f.s * 0.95; inkCentre(g, ln, y); y += f.s * 0.28; }
      y += 22;
      const f3 = fitFont(g, 'sans', 48, 600, false, T.date, 0.03, 720); y += f3.s * 0.95; inkCentre(g, T.date, y);
      y += 58;
      if (logo) {
        const lw = cfg.logo.width, lh = lw * logo.naturalHeight / logo.naturalWidth;
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.letterSpacing = '0px';
        // el PNG tiene margen transparente desigual (contenido x 29–431 de 441): se centra el dibujo, no la caja
        const cx = logoBox ? (logoBox[0] + logoBox[1]) / 2 / logo.naturalWidth : 0.5;
        g.drawImage(logo, Math.round(540 - lw * cx), Math.round(y), lw, lh);
      }
      g.restore();
    }

    // ---------------- composición ----------------
    const sceneAt = (id) => cfg.scenes.find((s) => s[0] === id);
    function drawScene(g, id, t) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      SC[id](g, t);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.restore();
    }
    function render(t, dbg) {
      t = cl(t, 0, cfg.duration);
      const active = cfg.scenes.filter((s) => t >= s[1] && t < s[2]).map((s) => s[0]);
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      drawScene(ctx, active[0], t);
      if (active.length > 1) {
        const id = active[1], wv = cfg.waves[id];
        const p = E((t - wv[0]) / (wv[1] - wv[0]));
        revealed(ctx, bufB, (gg) => drawScene(gg, id, t), 'tr', p, 'up', { amp: 0.16, soft: 0.03, seed: wv[2], tint: 0.16 }, t);
      }
      // grano común (se corre cada cuadro)
      const fr = Math.round(t * cfg.fps), r = PBS.rng(fr * 7919 + 13);
      ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = t > 146.5 ? 0.35 : 0.55;
      ctx.translate(-Math.floor(r() * GT), -Math.floor(r() * GT)); ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W + GT, H + GT); ctx.restore();
      // tipografía (sobre el grano, nítida)
      wordsAt(ctx, t, dbg);
      if (dbg && dbg.noText) return;
      closing(ctx, t);
    }
    render(0);
    return { render, warnings, logo: !!logo, shape };
  };
})();
