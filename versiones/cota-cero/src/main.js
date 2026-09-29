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
  const onsetUniforms = (t) => {
    const past = onsets.filter((o) => o.t <= t).slice(-8);
    while (past.length < 8) past.unshift({ t: -100, A: 0 });
    return { on0: past.slice(0, 4).map((o) => o.t), on1: past.slice(4).map((o) => o.t), am0: past.slice(0, 4).map((o) => o.A), am1: past.slice(4).map((o) => o.A) };
  };
  const at = (k, t) => (audio.missing ? 0.4 : audio.at(k, t));

  // ---------- GL y mundo ----------
  const G = new PBS.GL(cfg.width, cfg.height);
  const gl = G.gl;
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const draw = (prog, u, target) => { gl.bindVertexArray(null); gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf); G.draw(prog, u, target); };

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
      bake: terr.bakeTex, aux: terr.auxTex, hach: day ? hachDay : hachNight, ext,
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
      { text: T.note, font: 'sans', size: 34, weight: 400, gap: 60 },
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
  const obOnsets = onsets.filter((o) => o.t >= 20.5);
  const E = ov.echo, echoS0 = Sof(cfg.timeline.echoes);
  function obliqueUniforms(t) {
    const hY = OB.horizonAt(cfg, t);
    const past = obOnsets.filter((o) => o.t <= t).slice(-4);
    while (past.length < 4) past.unshift({ t: -100, A: 0 });
    const S = Sof(t), low = at('lowSmooth', t);
    const eOn = t >= cfg.timeline.echoes;
    return {
      land: landB.tex, stat: statTex, dyn: dynTex,
      yOff: cam.ybh - hY, ybh: cam.ybh, BH: cam.BH, f: cam.f, cz: cam.C[2], t, S, low, wmul: 0.9 + 0.2 * at('rmsSmooth', t),
      skyK: 1 - (1 - cfg.closing.skyMin) * PBS.smooth((t - cfg.closing.skyFadeFrom) / 0.8),
      echoFront: eOn ? E.front * PBS.smooth((t - cfg.timeline.echoes) / (cfg.timeline.echoFull - cfg.timeline.echoes)) : 0,
      echoPhase: E.speed * (S - echoS0), echoAmp: eOn ? 1 - 0.3 * PBS.smooth((t - cfg.closingAt) / 5) : 0,
      swash: ov.sea.swashM * (0.5 + 0.5 * Math.sin(S * 2.1)) * (0.6 + 0.8 * low) * decay(t),
      closeK: PBS.smooth((t - cfg.closingAt) / 0.8), decayK: decay(t),
      tipB: [tipB[0], tipB[1]], shipBox: obFig.shipBox, shipBob: Math.sin(t * 1.3) * 1.0 * decay(t),
      on0: past.map((o) => o.t), am0: past.map((o) => Math.min(6, o.A * rp.bigGain)),
      r0: closeRects[0], r1: closeRects[1], r2: closeRects[2], r3: closeRects[3], r4: closeRects[4],
      skyP: [ov.sky.spacing, ov.sky.topW, ov.sky.clouds[0][0], ov.sky.clouds[1][0]],
      seaP: [ov.sea.dlog, ov.sea.waveAmp, 0, ov.sea.swellFrom], echoP: [E.aspect, E.rho0, E.lambda, E.gap],
      ...palU,
    };
  }

  function grottoUniforms(t) {
    const gv = cfg.views.grotto;
    const v = at('voiceSmooth', t);
    return { gro: groTex, zc: gv.center, zoom: ramp(t, gv.push), shim: PBS.clamp((v - 0.15) / 0.3, 0, 1), boneMul: 1 + 0.04 * PBS.clamp((v - 0.33) / 0.2, -1, 1), t, ...palU };
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
  function halfBox(dir, pos, sign, margin) {
    const W = cfg.width, H = cfg.height, corners = [[0, 0], [W, 0], [W, H], [0, H]];
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
    const m = o.amp + 6;
    gl.enable(gl.SCISSOR_TEST);
    let b = halfBox(o.dir, o.pos, 1, m); gl.scissor(b[0], b[1], b[2], b[3]); if (b[2] > 0 && b[3] > 0) views[A](t, tA);
    b = halfBox(o.dir, o.pos, -1, m); gl.scissor(b[0], b[1], b[2], b[3]); if (b[2] > 0 && b[3] > 0) views[B](t, tB);
    gl.disable(gl.SCISSOR_TEST);
    draw(progFront, { ta: tA.tex, tb: tB.tex, ...o }, null);
  }
  function renderGL(t) {
    const m1 = Fz.M1.t, m2 = Fz.M2.t;
    if (t < m1[0]) return views.planNight(t, null);
    if (t < m1[1]) {
      // diagonal: de abajo-derecha hacia arriba-izquierda
      const d = [-0.62, -0.78], n = Math.hypot(d[0], d[1]), dir = [d[0] / n, d[1] / n];
      const f0 = dir[0] * 1080 + dir[1] * 1920 - 60, f1 = 60;
      const p = PBS.ease((t - m1[0]) / (m1[1] - m1[0]));
      return frontPass(t, 'planNight', 'grotto', { dir, pos: f0 + (f1 - f0) * p, amp: Fz.M1.noise, feather: Fz.M1.feather, lineW: Fz.M1.line, nscale: 90, seed: 3, lineCol: palU.cLand });
    }
    if (t < m2[0]) return views.grotto(t, null);
    if (t < m2[1]) {
      const p = PBS.smooth((t - Fz.M2.dur[0]) / (Fz.M2.dur[1] - Fz.M2.dur[0]));
      const dir = [-1, 0], f0 = -1080 - 90, f1 = 90;
      return frontPass(t, 'grotto', 'planDay', { dir, pos: f0 + (f1 - f0) * p, amp: Fz.M2.noise, feather: Fz.M2.feather, lineW: Fz.M2.line, nscale: 150, seed: 7, lineCol: palU.cOchre });
    }
    const m3 = Fz.M3.t;
    if (t < m3[0]) return views.planDay(t, null);
    if (t < m3[1]) {
      const p = PBS.ease((t - m3[0]) / (m3[1] - m3[0]));
      const dir = [0, -1], f0 = -1920 - 70, f1 = 70;
      return frontPass(t, 'planDay', 'oblique', { dir, pos: f0 + (f1 - f0) * p, amp: Fz.M3.noise, feather: Fz.M3.feather, lineW: Fz.M3.line, nscale: 120, seed: 11, lineCol: palU.cGranite });
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
