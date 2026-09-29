/* Cota cero — contrato: window.createReel(canvas, cfg) → Promise<{render(t), warnings, logo}>. render(t) es función pura de t. */
window.createReel = async function (canvas, cfg) {
  const warnings = [];
  const T0 = performance.now();
  await PBS.loadFonts(cfg.assets + 'fonts/', warnings);
  const ctx = canvas.getContext('2d');
  if (window.CC_DEBUG.mode === 'figures') return { warnings, logo: true, render() { window.CC_DEBUG.figureSheet(ctx, cfg); } };

  const audio = await PBS.loadAudioFeatures(cfg.featuresUrl);
  if (audio.missing) warnings.push('Sin rasgos de audio: se usan constantes.');
  let logo = null;
  try { logo = await PBS.loadImage(cfg.assets + cfg.logo.file); } catch (e) { warnings.push('FALTA EL LOGO'); }
  const rng = PBS.rng(cfg.seed);
  const U = window.CC_U, SH = window.CC_SH;
  const timings = {};

  // ---------- audio: fases, pesos y golpes (todo tabulado en el inicio) ----------
  const N = cfg.fps * cfg.duration;
  const feat = (k, i) => (audio.missing ? (k.startsWith('low') ? 0.5 : k.startsWith('rms') ? 0.5 : 0.4) : audio[k][Math.max(0, Math.min(audio[k].length - 1, i))]);
  const decay = (t) => 1 - (1 - cfg.sea.decayTo) * PBS.smooth((t - cfg.markers.decay) / 1.5);
  const Sarr = new Float32Array(N + 2), SEarr = new Float32Array(N + 2);
  for (let i = 1; i <= N + 1; i++) {
    const r = (cfg.sea.base + feat('lowSmooth', i - 1)) / cfg.fps;
    Sarr[i] = Sarr[i - 1] + r;
    SEarr[i] = SEarr[i - 1] + r * decay((i - 1) / cfg.fps);
  }
  const lookup = (arr, t) => { const f = PBS.clamp(t * cfg.fps, 0, N), i = Math.floor(f), u = f - i; return arr[i] * (1 - u) + arr[Math.min(N + 1, i + 1)] * u; };
  const Sof = (t) => lookup(SEarr, t);
  let onsets = [];
  if (!audio.missing) {
    const fl = audio.flux; let last = -1e9;
    for (let i = 1; i < fl.length - 1; i++) if (fl[i] > cfg.onsetThreshold && fl[i] >= fl[i - 1] && fl[i] >= fl[i + 1] && (i - last) / cfg.fps >= cfg.onsetMinGap) { onsets.push({ t: i / cfg.fps, a: fl[i] }); last = i; }
  }
  if (onsets.length < 6) onsets = cfg.onsetsFallback.map((t) => ({ t, a: 1 }));
  const rp = cfg.ripple;
  onsets.forEach((o) => { o.A = (rp.maxPx / rp.bigGain) * o.a * (Math.abs(o.t - rp.bigAt) < 0.05 ? rp.bigGain : 1); });
  // solo los golpes activos (los anillos viven 7 s): como mucho 4 a la vez
  const onsetUniforms = (t) => {
    const past = onsets.filter((o) => o.t <= t && t - o.t < 7).slice(-4);
    while (past.length < 4) past.unshift({ t: -100, A: 0 });
    return { on0: past.map((o) => o.t), am0: past.map((o) => o.A) };
  };
  const at = (k, t) => (audio.missing ? 0.4 : audio.at(k, t));

  // ---------- GL y mundo ----------
  const G = new PBS.GL(cfg.width, cfg.height);
  const gl = G.gl;
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const draw = (prog, u, target) => { gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); G.draw(prog, u, target); };

  // ruido fijo en texturas (se calcula una vez)
  const nzS = G.target(cfg.width, cfg.height);
  draw(G.program(SH.noiseScreen), {}, nzS);
  let t1 = performance.now();
  const terr = window.CC_TERRAIN.build(G, cfg, rng);
  timings.terrain = performance.now() - t1; timings.terrainParts = terr.timing;

  t1 = performance.now();
  const plan = window.CC_PLAN.build(cfg, terr, rng);
  const hachNight = U.rawTexture(G, plan.night, plan.CW, plan.CH);
  const hachDay = U.rawTexture(G, plan.day, plan.CW, plan.CH);
  timings.plan = performance.now() - t1; timings.planParts = plan.timing; timings.planCounts = plan.counts;

  t1 = performance.now();
  const gro = await window.CC_GROTTO.build(cfg, warnings);
  const groTex = U.rawTexture(G, gro.data, gro.W, gro.H);
  timings.grotto = performance.now() - t1; timings.grottoParts = gro.timing; timings.grottoCounts = gro.counts;
  const progGro = G.program(SH.grotto);
  const progFront = G.program(SH.front);
  const tA = G.target(cfg.width, cfg.height), tB = G.target(cfg.width, cfg.height);

  const tip = cfg.world.tip;
  const progPlan = G.program(SH.plan.replace('${TIPX}', tip[0].toFixed(1)).replace('${TIPY}', tip[1].toFixed(1)));
  const fr = plan.fr;
  const tipPx = fr.toScreen(tip[0], tip[1]);
  const P = cfg.palette, c3 = (h) => PBS.hex(h).map((v) => v / 255);
  const palU = {
    cPlate: c3(P.night.plate), cLand: c3(P.night.land), cSea: c3(P.night.sea), cFoam: c3(P.night.foam), cTrail: c3(P.night.trail),
    cPaper: c3(P.day.paper), cGranite: c3(P.day.granite), cGrass: c3(P.day.grass), cSand: c3(P.day.sand), cSeaD: c3(P.day.sea), cOchre: c3(P.day.ochre),
    toothAmt: P.night.tooth, grainAmt: P.day.grain, toneAmt: P.day.tone,
  };
  const ext = cfg.world.extent;
  const ramp = (t, [a, b, v0, v1]) => v0 + (v1 - v0) * PBS.ease((t - a) / (b - a));

  function planUniforms(t, day) {
    const pv = cfg.views.plan;
    const zoom = day ? ramp(t, pv.pull) : ramp(t, pv.push);
    const em = cfg.timeline.emerge;
    const E = day ? 200 : 95 * PBS.ease((t - em[0]) / (em[1] - em[0]));
    return {
      bake: terr.bakeTex, aux: terr.auxTex, hach: day ? hachDay : hachNight, nzS: nzS.tex, ext,
      fr: [fr.x0, fr.yTop, fr.mpp, zoom], tipPx, t, S: Sof(t), E: t < em[0] && !day ? -10 : E, day: day ? 1 : 0,
      wmul: 0.9 + 0.2 * at('rmsSmooth', t), low: at('lowSmooth', t), cen: audio.missing ? 0.5 : PBS.clamp(audio.avg('centroidSmooth', t, 2), 0, 1),
      ringOpen: day ? 1 : PBS.smooth((t - em[0]) / (em[1] - em[0])), trailProg: day ? 1.01 : PBS.clamp((t - cfg.timeline.trailCut[0]) / (cfg.timeline.trailCut[1] - cfg.timeline.trailCut[0]), 0, 1.01),
      landOn: day || t >= em[0] ? 1 : 0,
      ...onsetUniforms(t), ...palU,
    };
  }

  // ---------- OBLICUA ----------
  t1 = performance.now();
  const OB = window.CC_OBL, ov = cfg.views.oblique;
  const cam = OB.camera(cfg);
  const landB = OB.buildLand(G, cfg, terr, cam).render(draw);
  const obFig = OB.buildFigures(cfg, cam, cfg.seed);
  const statTex = U.rawTexture(G, obFig.stat, cfg.width, cam.BH);
  const dynTex = U.rawTexture(G, obFig.dyn, cfg.width, cam.BH);
  const progObl = G.program(SH.oblique(OB.waterGLSL()));
  const nzB = G.target(cfg.width, cam.BH);
  draw(G.program(SH.noiseBuf), { BH: cam.BH }, nzB);
  const rtop = OB.ridgeTop(cfg, terr, cam);
  timings.oblique = performance.now() - t1; timings.obliqueParts = { land: landB.ms, figs: obFig.ms };
  timings.ridgeTopAtClosing = +(rtop.top - (cam.ybh - ov.horizon[1][1])).toFixed(1);
  if (timings.ridgeTopAtClosing < 902) warnings.push('La cresta supera y = 900 en el cierre (' + timings.ridgeTopAtClosing + ').');
  const tipB = cam.project(tip[0], tip[1], 0);
  // rectángulos del bloque de cierre (misma maquetación que PBS.drawBlock)
  const closeRects = (() => {
    const T = PBS.CLOSING_TEXT, y0 = cfg.closing.y;
    const items = [
      { text: T.title, font: 'serif', size: 74, weight: 600 },
      { text: T.motto, font: 'sans', size: 46, weight: 600, gap: 26, maxWidth: 760 },
      { text: T.date, font: 'sans', size: 50, weight: 600, gap: 30 },
      { logo: true, gap: 62 },
      ...(T.note ? [{ text: T.note, font: 'sans', size: 34, weight: 400, gap: 60 }] : []),
    ];
    let y = y0, maxW = 0; const rows = [];
    for (const it of items) {
      y += it.gap || 0;
      if (it.logo) { const lw = cfg.logo.width, lh = logo ? lw * (logo.naturalHeight / logo.naturalWidth) : 98; rows.push({ w: lw, y0: y, y1: y + lh }); y += lh; maxW = Math.max(maxW, lw); continue; }
      ctx.font = PBS.font(it.font, it.size, it.weight);
      const lines = String(it.text).split('\n');
      let wmax = 0; for (const l of lines) wmax = Math.max(wmax, ctx.measureText(l).width);
      const hgt = it.size * 1.16 * lines.length;
      rows.push({ w: wmax, y0: y, y1: y + hgt }); y += hgt; maxW = Math.max(maxW, wmax);
    }
    const cx = PBS.clamp(540, PBS.SAFE.x0 + maxW / 2, PBS.SAFE.x1 - maxW / 2);
    timings.closingBlock = { top: y0, bottom: +y.toFixed(1), cx };
    return rows.map((r) => [cx - r.w / 2, r.y0, cx + r.w / 2, r.y1]);
  })();
  const obOnsets = onsets.filter((o) => o.t >= 19.0);
  const E = ov.echo, echoS0 = Sof(cfg.timeline.echoes);
  const blk = timings.closingBlock;
  function obliqueUniforms(t) {
    const hY = OB.horizonAt(cfg, t);
    const past = obOnsets.filter((o) => o.t <= t).slice(-4);
    while (past.length < 4) past.unshift({ t: -100, A: 0 });
    const S = Sof(t), low = at('lowSmooth', t);
    const eOn = t >= cfg.timeline.echoes;
    return {
      land: landB.tex, stat: statTex, dyn: dynTex, nzS: nzS.tex, nzB: nzB.tex,
      yOff: cam.ybh - hY, ybh: cam.ybh, BH: cam.BH, f: cam.f, cz: cam.C[2], t, S, low, wmul: 0.9 + 0.2 * at('rmsSmooth', t),
      echoFront: E.front, echoT0: cfg.timeline.echoes, echoLeft: E.left,
      echoPhase: E.speed * (S - echoS0), echoAmp: eOn ? 1 : 0,
      swash: ov.sea.swashM * (0.5 + 0.5 * Math.sin(S * 2.1)) * (0.6 + 0.8 * low) * decay(t),
      closeK: PBS.smooth((t - cfg.closingAt) / 0.8), decayK: decay(t),
      clearK: PBS.clamp((t - cfg.closing.skyFadeFrom) / (cfg.closingAt - cfg.closing.skyFadeFrom), 0, 1),
      clr: [blk.cx, (blk.top + blk.bottom) / 2, cfg.closing.clearTo, 160],
      tipB: [tipB[0], tipB[1]], shipBox: obFig.shipBox, shipBob: Math.sin(t * 1.3) * 1.0 * decay(t),
      on0: past.map((o) => o.t), am0: past.map((o) => Math.min(6, o.A * rp.bigGain)),
      skyP: [ov.sky.spacing, ov.sky.topW, 0, 0],
      seaP: [ov.sea.dlog, ov.sea.waveAmp, 0, ov.sea.swellFrom], echoP: [E.aspect, E.rho0, E.lambda, E.gap],
      ...palU,
    };
  }

  function grottoUniforms(t) {
    const gv = cfg.views.grotto;
    const v = at('voiceSmooth', t);
    return { gro: groTex, nzS: nzS.tex, zc: gv.center, zoom: ramp(t, gv.push), shim: PBS.clamp((v - 0.15) / 0.3, 0, 1), boneMul: 1 + 0.04 * PBS.clamp((v - 0.33) / 0.2, -1, 1), t, ...palU };
  }
  // Vistas: función de t → dibuja en un target (o en pantalla con null)
  const views = {
    planNight: (t, tg) => draw(progPlan, planUniforms(t, false), tg),
    planDay: (t, tg) => draw(progPlan, planUniforms(t, true), tg),
    grotto: (t, tg) => draw(progGro, grottoUniforms(t), tg),
    oblique: (t, tg) => draw(progObl, obliqueUniforms(t), tg),
  };
  const Fz = cfg.fronts;
  // Recorte (scissor) de cada capa a su semiplano + margen: fuera de él la capa no se lee (el borde es nítido).
  function halfBox(dir, pos, sign, margin, sy0 = 0, sy1 = cfg.height) {
    const W = cfg.width, H = cfg.height, corners = [[0, sy0], [W, sy0], [W, sy1], [0, sy1]];
    const val = (p) => sign * (p[0] * dir[0] + p[1] * dir[1] - pos) + margin; // ≥ 0 dentro
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4], va = val(a), vb = val(b);
      if (va >= 0) pts.push(a);
      if ((va >= 0) !== (vb >= 0)) { const u = va / (va - vb); pts.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
    }
    if (!pts.length) return [0, 0, 0, 0];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(W, Math.ceil(Math.max(...xs)));
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H, Math.ceil(Math.max(...ys)));
    return [x0, H - y1, x1 - x0, y1 - y0]; // coordenadas GL (origen abajo)
  }
  function frontPass(t, A, B, o) {
    const m = o.oct[0] + o.oct[2] + o.oct2[0] + o.oct2[2] + (o.burr || 0) + 12;
    // cada capa solo donde puede verse: recorte por franjas horizontales (un frente diagonal ya no cubre dos cuadros enteros)
    gl.enable(gl.SCISSOR_TEST);
    const NS = Math.abs(o.dir[0]) > 0.3 ? 8 : 1;
    for (const [sign, V, tg] of [[1, A, tA], [-1, B, tB]]) for (let k = 0; k < NS; k++) {
      const b = halfBox(o.dir, o.pos, sign, m, (cfg.height * k) / NS, (cfg.height * (k + 1)) / NS);
      if (b[2] > 0 && b[3] > 0) { gl.scissor(b[0], b[1], b[2], b[3]); views[V](t, tg); }
    }
    gl.disable(gl.SCISSOR_TEST);
    draw(progFront, { ta: tA.tex, tb: tB.tex, burr: 0, ...o }, null);
  }
  const nrm = (v) => { const n = Math.hypot(v[0], v[1]); return [v[0] / n, v[1] / n]; };
  // extensión de dot(px, dir) sobre el cuadro
  const span = (dir) => { const v = [[0, 0], [1080, 0], [0, 1920], [1080, 1920]].map((p) => p[0] * dir[0] + p[1] * dir[1]); return [Math.min(...v), Math.max(...v)]; };
  function renderGL(t) {
    const m1 = Fz.M1.t, m2 = Fz.M2.t, m3 = Fz.M3.t;
    if (t < m1[0]) return views.planNight(t, null);
    if (t < m1[1]) {
      // diagonal: de abajo-derecha hacia arriba-izquierda
      const dir = nrm([-0.62, -0.78]), [lo, hi] = span(dir), mg = 150;
      const p = PBS.ease((t - m1[0]) / (m1[1] - m1[0]));
      return frontPass(t, 'planNight', 'grotto', { dir, pos: lo - mg + (hi - lo + 2 * mg) * p, oct: [80, 400, 20, 60], oct2: [5, 11, 30, 520], lineW: Fz.M1.line, seed: 3, lineCol: palU.cLand });
    }
    if (t < m2[0]) return views.grotto(t, null);
    if (t < m2[1]) {
      // alba: de derecha a izquierda (este → oeste) y apenas en diagonal hacia abajo, como luz rasante;
      // avanza durante todo el respiro (tramos a velocidad constante) y pasa por la gente de la gruta al final (≈ 14,85 s)
      const K = Fz.M2.keys; let p = 1; for (let i = 0; i < K.length - 1; i++) if (t < K[i + 1][0]) { const a = K[i], b = K[i + 1], v = (t - a[0]) / (b[0] - a[0]); p = a[1] + (b[1] - a[1]) * v; break; }
      const dir = nrm([-1, 0.22]), [lo, hi] = span(dir), mg = 260;
      return frontPass(t, 'grotto', 'planDay', { dir, pos: lo - mg + (hi - lo + 2 * mg) * p, oct: [120, 520, 32, 70], oct2: [7, 12, 80, 610], lineW: 3.8, seed: 7, lineCol: palU.cOchre, burr: 38 });
    }
    if (t < m3[0]) return views.planDay(t, null);
    if (t < m3[1]) {
      const p = PBS.ease((t - m3[0]) / (m3[1] - m3[0]));
      const dir = [0, -1], [lo, hi] = span(dir), mg = 140;
      return frontPass(t, 'planDay', 'oblique', { dir, pos: lo - mg + (hi - lo + 2 * mg) * p, oct: [60, 400, 15, 55], oct2: [4, 11, 26, 380], lineW: Fz.M3.line, seed: 11, lineCol: palU.cGranite });
    }
    return views.oblique(t, null);
  }

  // avisos del cierre (una sola vez) y nota del logo
  {
    const sc = document.createElement('canvas'); sc.width = cfg.width; sc.height = cfg.height;
    const r = PBS.drawClosing(sc.getContext('2d'), cfg.closingAt + 2, { t0: cfg.closingAt, dark: false, logo, logoWidth: cfg.logo.width, y: cfg.closing.y, ink: cfg.closing.ink, ink2: cfg.closing.ink2 });
    for (const w of r.warnings || []) if (!warnings.includes(w)) warnings.push(w);
    warnings.push('Logo 441 px ampliado a 620: pedir versión vectorial o PNG grande');
  }
  {
    const tw = performance.now();
    gl.enable(gl.SCISSOR_TEST); gl.scissor(0, 0, 1, 1);
    for (const [v, tt] of [['planNight', 1], ['planDay', 16], ['grotto', 10], ['oblique', 25]]) views[v](tt, tA);
    draw(progFront, { ta: tA.tex, tb: tB.tex, dir: [1, 0], pos: 0, oct: [0, 1, 0, 1], oct2: [0, 1, 0, 1], lineW: 2, seed: 1, lineCol: [0, 0, 0], burr: 0 }, tB);
    gl.disable(gl.SCISSOR_TEST);
    const px1 = new Uint8Array(4); gl.bindFramebuffer(gl.FRAMEBUFFER, tB.fb); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px1); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    timings.warm = performance.now() - tw;
  }
  timings.init = performance.now() - T0;
  console.log('cota-cero init', JSON.stringify(timings));
  const reel = {
    warnings, logo: !!logo, _gl: gl, timings, _dbg: { obFig },
    render(t) {
      renderGL(t);
      ctx.drawImage(G.canvas, 0, 0);
      PBS.drawClosing(ctx, t, { t0: cfg.closingAt, dark: false, logo, logoWidth: cfg.logo.width, y: cfg.closing.y, ink: cfg.closing.ink, ink2: cfg.closing.ink2 });
    },
  };
  return reel;
};
