/* «Luz rasante» — contrato: window.createReel(canvas, cfg) → Promise<{ render(t), warnings, logo }>. render(t) es determinista. */
window.createReel = async function (canvas, cfg) {
  const warnings = [];
  const D2R = Math.PI / 180;
  await PBS.loadFonts(cfg.assets + 'fonts/', warnings);
  const audio = await PBS.loadAudioFeatures(cfg.featuresUrl);
  if (audio.missing) warnings.push('Sin rasgos de audio: reloj del alba lineal.');
  let logo = null;
  try { logo = await PBS.loadImage(cfg.assets + cfg.logo.file); } catch (e) { warnings.push('FALTA EL LOGO'); }

  const G = new PBS.GL(cfg.width, cfg.height);
  const gl = G.gl;
  const clock = LR.makeClock(cfg, audio);
  const SC = LR.makeScene(cfg, clock);

  // ---- horneados ----
  const bk = await LR.bake(G, cfg, { trailPts: SC.trailFine, rocks: SC.rocks });
  const photo = await LR.photoDetail(G, cfg, warnings);
  const atlas = LR.buildAtlas(G);
  const ovl = LR.makeOverlay(G, cfg, atlas, bk);
  LR._debug = { bk, SC, clock, atlas, G };

  // muestreo de terreno en JS (para saber si una persona o una mata está al sol)
  const TBk = cfg.world.tipBake;
  const inTip = (p) => Math.abs(p[0] - TBk.cx) < TBk.size * 0.46 && Math.abs(p[1] - TBk.cy) < TBk.size * 0.46;
  const height = (p) => (inTip(p) ? LR.sampleData(bk.tip, bk.tip.data, bk.tip.N, p[0], p[1], 0) : LR.sampleData(bk.big, bk.big.data, bk.big.N, p[0], p[1], 0));
  const horizon = (p) => (inTip(p) ? LR.sampleData(bk.tip, bk.tip.hzData, bk.tip.N, p[0], p[1], 0) : LR.sampleData(bk.big, bk.big.hzData, bk.big.NH, p[0], p[1], 0));
  const bigCh = (p, ch) => LR.sampleData(bk.big, bk.big.data, bk.big.N, p[0], p[1], ch);
  // bolas de granito con sombra de largo dirigido (loma de S4, roca del niño y asiento de S8)
  const boulders = LR.makeBoulders(cfg, SC, clock);
  const bShadow = (p, t, shot) => { let o = 0; for (const b of boulders[shot.id] || []) o = Math.max(o, LR.boulderOcc(b, p, b.L(t), SC)); return o; };
  const CB = cfg.crestBand;
  const bandK = (t) => clock.D(t) / Math.max(1e-6, clock.D(4.97));
  const bandAt = (t) => [CB.dW0 + (CB.dW1 - CB.dW0) * bandK(t), CB.dE0 + (CB.dE1 - CB.dE0) * bandK(t), CB.bulgeW + (CB.bulgeW1 - CB.bulgeW) * bandK(t)];
  const bandBulge = (p, t) => bandAt(t)[2] * Math.exp(-0.5 * Math.pow((p[1] - CB.bulgeY) / CB.bulgeSigma, 2));
  const bandD = (p) => { const bx = CB.b[0] - CB.a[0], by = CB.b[1] - CB.a[1], L = Math.hypot(bx, by); return ((bx * (p[1] - CB.a[1]) - by * (p[0] - CB.a[0])) / L); };
  const litAt = {
    height,
    lit(p, t, h, c, lift = 1.3, noB = false) {
      const e = clock.elev(t);
      const hz = Math.max(horizon(p) - 0.6 * lift / 1.3, LR.pwl(cfg.sun.hzFar, h + lift)); // luz sobre el torso, no en los pies
      let l = PBS.smooth((e - hz + cfg.sun.penumbra) / (2 * cfg.sun.penumbra));
      const shot = SC.shotAt(t);
      if (boulders[shot.id] && !noB) l *= 1 - bShadow(p, t, shot);
      if (shot.id === 'S1') { const B = bandAt(t), bu = bandBulge(p, t); const d = bandD(p); l *= (1 - PBS.smooth((d - B[1] + 0.3) / 0.6)) * PBS.smooth((d - (B[0] - bu) + 0.3) / 0.6); }
      return l;
    },
  };
  // ---- matas de monte: lista fija generada al iniciar ----
  const clumps = [];
  {
    const rnd = PBS.rng(cfg.seed + 101);
    for (const z of cfg.world.monte) {
      const nC = Math.round(z[4] * Math.PI * z[2] * z[3] / 49);
      for (let i = 0; i < nC * 3 && clumps.length < 4000; i++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
        const p = [z[0] + Math.cos(a) * r * z[2], z[1] + Math.sin(a) * r * z[3]];
        const rad = 0.5 + 1.1 * rnd() * rnd(), hh = (0.7 + 0.9 * rnd()) * Math.min(rad, 1.4), sd = rnd() * 10;
        if (rnd() > 1 / 3) continue;
        if (bigCh(p, 1) > 0.4 || bigCh(p, 2) > 0.2 || bigCh(p, 3) < 6) continue;
        clumps.push([p[0], p[1], rad, hh, sd]);
      }
    }
    for (const x of cfg.world.monteExtra || []) clumps.push([x[0], x[1], x[2], x[3], x[4] || 3.3]);
  }

  // ---- programas ----
  const progs = {};
  const progFor = (fx) => { const k = fx.join(','); if (!progs[k]) progs[k] = G.program(LR.worldFS(cfg, atlas, fx)); return progs[k]; };
  for (const sh of cfg.shots) progFor(sh.fx);
  const ctx = canvas.getContext('2d');

  // cierre: avisos una sola vez
  {
    const cv = document.createElement('canvas'); cv.width = cfg.width; cv.height = cfg.height;
    const r = PBS.drawClosing(cv.getContext('2d'), cfg.closingAt + 3, { t0: cfg.closingAt, dark: true, logo, logoWidth: cfg.logo.width, y: cfg.closing.y, shadow: cfg.closing.shadow });
    for (const w of r.warnings || []) warnings.push(w);
    if (logo && logo.naturalWidth < cfg.logo.width) warnings.push(`Logo ${logo.naturalWidth} px ampliado a ${cfg.logo.width}: pedir versión vectorial o PNG grande`);
  }
  const smooth = PBS.smooth;
  const uTrail = new Float32Array(12 * 4);
  const sD = SC.sDir, pp = SC.perp;
  const add2 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];

  function render(t) {
    t = PBS.clamp(t, 0, cfg.duration);
    const shot = SC.shotAt(t);
    const X = SC.xform(shot, t);
    const e = clock.elev(t);
    // elevación cercana (personas, matas, microsombras) dirigida; en tomas lejanas, el sol real
    const eh = shot.eh === 'true' ? Math.max(e, cfg.sun.humanMinElev) : cfg.sun.humanElev;
    const en = shot.W > 150 ? e : cfg.sun.nearElev;
    const voice = clock.voice(t), cen = clock.centroid(t), rms = clock.rms(t), low = clock.low(t), high = clock.high(t);
    // fase del mar; desde 38.5 el movimiento se calma
    let sea = clock.sea(t);
    if (t > 38.5) { const s0 = clock.sea(38.5); sea = s0 + (sea - s0) * (1 - 0.45 * smooth((t - 38.5) / 1.5)); }
    const sc = LR.sunColor(cfg, e);
    const temp = 1 + 0.03 * (cen - 0.5) * 2;
    const sunCol = [sc[0], sc[1] * (1 + (temp - 1) * 0.5), sc[2] * temp];
    const sunI = cfg.sun.intensity * smooth((e - cfg.sun.rampLow) / (2.0 - cfg.sun.rampLow)) * (1 + 0.06 * (voice - 0.5));
    const sunC = sunCol.map((v) => v * sunI);
    const skyK = 0.30 + 0.25 * smooth(e / 6);
    const sky = cfg.sun.sky.map((v) => v * skyK);
    const close = shot.W <= 150 ? 1 : 0;
    const fx = shot.fx;
    const tipOn = fx.includes('TIP') ? 1 : 0;
    // viento en las matas: brillo de agudos + ráfagas en golpes de S4
    let gust = 0; for (const o of [15.67, 18.77, 19.9]) if (t >= o) gust = Math.max(gust, Math.exp(-(t - o) / 0.7) * smooth((t - o) / 0.15));
    const sway = Math.min(1.2, 0.35 + 0.85 * high) * (shot.id === 'S3' && t > 12.8 && t < 15.05 ? 0.6 : 1) + gust * 1.0;
    const gustPh = clock.sea(t) * 0.5 + gust;

    // ---- capa de objetos ----
    ovl.begin(X);
    const pad = 3 * X.mpp;
    const frameR = Math.hypot(540, 960) * X.mpp;
    const inView = (p, r) => Math.hypot(p[0] - X.cx, p[1] - X.cy) < frameR + r;
    const figs = LR.figureStates(cfg, SC, clock, atlas, shot, t, litAt);
    for (const F of figs.slice(0, 12)) {
      const Lm = (atlas.HM * F.k) / Math.tan(eh * D2R) + 1;
      const cW = atlas.WM * F.k;
      const p4 = [F.foot[0], F.foot[1], F.hF, F.k], p5 = [F.colA, F.colB, F.wB, F.flip], p6 = [F.moving, F.lit, F.face, F.Hrel], p7 = [F.body, F.pose, F.isCol, 0];
      if (F.lit > 0.001) ovl.add('ov', 0, add2(F.foot, sD, (Lm - 0.6) / 2), sD.map((v) => v * ((Lm + 0.6) / 2 + pad)), pp.map((v) => v * (cW / 2 + pad)), p4, p5, p6, p7);
      ovl.add('ob', 1, F.foot, [0.62 + pad, 0], [0, 0.62 + pad], p4, p5, p6, p7);
    }
    if (fx.includes('CLUMPS') && shot.W < 600) {
      const tanE = Math.tan(en * D2R);
      for (const c of clumps) {
        if (!inView(c, 30)) continue;
        // nunca junto a una persona (las dos elevaciones no se comparan lado a lado)
        if (shot.W < 150 && figs.some((F) => Math.hypot(F.foot[0] - c[0], F.foot[1] - c[1]) < 3 + c[2])) continue;
        const Lt = Math.min(c[3] / Math.max(tanE, 0.005), 9 * c[2]) + c[2];
        const lt = litAt.lit(c, t, bigCh(c, 0), null, c[3] * 0.7);
        const o = add2(c, sD, (Lt - 1.4 * c[2]) / 2);
        const A = sD.map((v) => v * ((Lt + 1.4 * c[2]) / 2 + pad)), B = pp.map((v) => v * (1.6 * c[2] + pad));
        ovl.add('ov', 2, o, A, B, [c[0], c[1], c[2], c[3]], [c[4], lt, 0, 0]);
        ovl.add('ob', 2, o, A, B, [c[0], c[1], c[2], c[3]], [c[4], lt, 0, 0]);
      }
    }
    for (const b of boulders[shot.id] || []) {
      if (!inView(b.p, 40)) continue;
      const Lb = b.L(t), R = Math.max(b.r, b.Rb || 0) * 1.15 + (b.jag || 0);
      const lt = litAt.lit(b.p, t, bigCh(b.p, 0), null, b.hb, true);
      const o = add2(b.p, sD, Lb / 2), A = sD.map((v) => v * (Lb / 2 + R * 1.3 + pad)), B = pp.map((v) => v * (R * 1.3 + pad));
      const P2 = [b.p[0], b.p[1], b.r, b.hb], P3 = [Lb, b.seed, b.asp, b.ang], P4 = [lt, b.hidden ? 1 : 0, b.Rb || 0, b.jag || 0];
      ovl.add('ov', 6, o, A, B, P2, P3, P4); ovl.add('ob', 6, o, A, B, P2, P3, P4);
    }
    const tanE = Math.tan(e * D2R);
    if (fx.includes('BOAT')) {
      const Bo = cfg.world.boat, bp = [Bo.x, Bo.y];
      const lt = litAt.lit(bp, t, bigCh(bp, 0), null, 0.6);
      const L2 = 0.175 / tanE;
      const o = add2(bp, sD, L2), A = sD.map((v) => v * (L2 + 3)), B = pp.map((v) => v * 3);
      const P2 = [Bo.x, Bo.y, Bo.heading * D2R, lt];
      ovl.add('ov', 3, o, A, B, P2); ovl.add('ob', 3, o, A, B, P2);
    }
    if (fx.includes('SHIP')) {
      const Sh = cfg.world.ship, spos = [Sh.x, Sh.y];
      const bob = Math.sin(sea * 1.9) * 0.3, roll = Math.sin(sea * 1.3 + 0.7) * 0.022 + Math.sin(sea * 2.9) * 0.008;
      const Lm = (Sh.masts[0] + 1) / tanE / 2;
      const o = add2(spos, sD, Lm), A = sD.map((v) => v * (Lm + 14)), B = pp.map((v) => v * 14);
      const P2 = [Sh.x, Sh.y, Sh.heading * D2R, 1], P3 = [roll, 0, Sh.masts[0] + bob, Sh.masts[1] + bob];
      ovl.add('ov', 4, o, A, B, P2, P3); ovl.add('ob', 4, o, A, B, P2, P3);
    }
    if (fx.includes('FOOT')) {
      // huellas: del bote hacia cada colono; a lo largo de la orilla para el grupo indígena
      const Bt = cfg.world.boat, paths = [];
      for (const F of figs) {
        const c = SC.cast[shot.id].find((q) => q.id === F.id);
        if (!c) continue;
        if (c.pathW) {
          paths.push([[Bt.x + (F.id === 'C1' ? -0.8 : 0.9), Bt.y + 1.2], c.pathW[0], 1]);
          paths.push([c.pathW[0], [F.foot[0] - 0.3 * Math.sin(F.face), F.foot[1] - 0.3 * Math.cos(F.face)], 1]);
        } else if (c.id === 'I10' || c.id === 'I8') {
          const dir = [Math.sin(46 * D2R), Math.cos(46 * D2R)];
          paths.push([[F.foot[0] - dir[0] * 16, F.foot[1] - dir[1] * 16 + (c.id === 'I8' ? -1.5 : 1)], [F.foot[0] - dir[0] * 0.6, F.foot[1] - dir[1] * 0.6], 0.8]);
        }
      }
      let k = 0;
      for (const [a, b, depth] of paths) {
        const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]); if (L < 0.2) continue;
        const u = [d[0] / L, d[1] / L], pr = [-u[1], u[0]];
        for (let s = 0.18, j = 0; s < L; s += 0.36, j++) {
          const side = j % 2 ? -1 : 1, jit = ((j * 7919 + k * 31) % 97) / 97 - 0.5;
          const c = [a[0] + u[0] * s + pr[0] * side * 0.11 + jit * 0.03, a[1] + u[1] * s + pr[1] * side * 0.11 - jit * 0.02];
          if (!inView(c, 1)) continue;
          ovl.add('ov', 5, c, [0.24, 0], [0, 0.24], [c[0], c[1], u[0], u[1]], [0.13, 0.055, jit, depth]);
        }
        k++;
      }
    }
    // sendero cercano: tramos de 7 m dentro del cuadro (solo tomas con TRAILSEG)
    uTrail.fill(0); let nT = 0;
    if (fx.includes('TRAILSEG')) {
      const pts = SC.trailCoarse;
      for (let i = 0; i < pts.length - 1 && nT < 9; i++) {
        const a = pts[i], b = pts[i + 1];
        const sa = SC.toScreen(X, a), sb = SC.toScreen(X, b);
        const out = (q) => q[0] < -60 || q[0] > 1140 || q[1] < -60 || q[1] > 1980;
        if (out(sa) && out(sb)) continue;
        uTrail.set([a[0], a[1], b[0], b[1]], nT * 4); nT++;
      }
    }
    const hasOV = ovl.count() > 0;
    ovl.draw({ photo, uXf: [X.cx, X.cy, X.mpp, X.th], uE: e, uEh: eh, uEn: en, tip: tipOn, sunC, sky, far: shot.W > 150 ? 1 : 0 });
    // encaje
    const lc = cfg.lace;
    const laceR = shot.id === 'S8' ? lc.R : lc.R * PBS.ease((t - lc.t0) / (lc.grow - lc.t0));
    const laceW = 1 + 0.3 * (2 * low - 1);
    const flash = clock.pulse(t, 0.55, 30.6, 40);
    const drift = (sea - clock.sea(lc.t0)) * 0.55;

    const pWorld = progFor(hasOV ? fx.concat(['OV']) : fx);
    gl.useProgram(pWorld); { const l = gl.getUniformLocation(pWorld, 'uTrail'); if (l) gl.uniform4fv(l, uTrail); }
    const U = {
      tBake: bk.big.tex, tNorm: bk.big.norm, tHz: bk.big.hz, tTip: bk.tip.tex, tTipN: bk.tip.norm, tTipHz: bk.tip.hz, tDet: bk.det, tWave: bk.wave, tPhoto: photo, tAtlas: atlas.tex, tOV: ovl.OV.tex, tOB: ovl.OB.tex, tVor: bk.vor,
      uXf: [X.cx, X.cy, X.mpp, X.th], uT: t, uE: e, uEh: eh, uEn: en, uSunI: sunI, uSunC: sunCol, uSky: sky,
      uSea: sea, uLow: low, uHigh: high, uSway: sway, uGust: gustPh,
      uFlags: [close, tipOn, 0, 0], uFlags2: [0, tipOn, shot.id === 'S8' ? 1 : 0, 0],
      uLace: [laceR, laceW, flash, drift],
      uCalm: [1320, 0, 0, 0], uNTrail: nT, uOvBox: ovl.screenBox(), uBand: [CB.a[0], CB.a[1], CB.b[0], CB.b[1]], uBandL: [bandAt(t)[0], bandAt(t)[1], CB.jag, 0], uBand2: [CB.bulgeY, CB.bulgeSigma, bandAt(t)[2], 0], uLip: shot.id === 'S7' ? 1 : 0, uMacS: shot.W > 300 ? 420 : shot.W > 150 ? 110 : 60, uCalmK: cfg.closing.calmK,
    };
    // gradación (en el mismo pase)
    const cl = cfg.closing, ca = smooth((t - cfg.closingAt) / 0.8);
    U.uExp = cfg.grade.exposure * (1 + cfg.grade.lowSunBoost * (1 - smooth(e / 2.2))) * (1 + 0.04 * (rms - 0.5) * 2);
    U.uSeed = Math.round(t * cfg.fps) % 997; U.uGrain = cfg.grade.grain; U.uScrim = ca > 0 ? 1 - ca * (1 - cl.scrim) : 0; U.uBox = cl.scrimBox; U.uFeather = cl.scrimFeather;
    U.uDbg = window.LR_DBG || [0, 0, 0, 0];
    G.draw(pWorld, U, null);
    ctx.clearRect(0, 0, cfg.width, cfg.height);
    ctx.drawImage(G.canvas, 0, 0);
    PBS.drawClosing(ctx, t, { t0: cfg.closingAt, dark: true, logo, logoWidth: cfg.logo.width, y: cl.y, shadow: cl.shadow });
  }

  return { warnings, logo: !!logo, render };
};
