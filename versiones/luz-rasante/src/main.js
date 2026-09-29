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
  const bk = await LR.bake(G, cfg, { trailPts: SC.trailFine, capRocks: SC.rocks });
  const photo = await LR.photoDetail(G, cfg, warnings);
  const atlas = LR.buildAtlas(G);
  const ovl = LR.makeOverlay(G, cfg, atlas, bk);
  LR._debug = { bk, SC, clock, atlas, G };

  // muestreo de terreno en JS (para saber si una persona o una mata está al sol)
  const TBk = cfg.world.tipBake;
  const inTip = (p) => Math.abs(p[0] - TBk.cx) < TBk.size * 0.46 && Math.abs(p[1] - TBk.cy) < TBk.size * 0.46;
  const CPk = bk.cap, inCap = (p) => CPk && p[0] > CPk.x0 + 0.3 && p[0] < CPk.x0 + CPk.size - 0.3 && p[1] > CPk.y0 + 0.3 && p[1] < CPk.y0 + CPk.size - 0.3;
  const height = (p) => (inCap(p) ? LR.sampleData(CPk, CPk.data, CPk.N, p[0], p[1], 0) : inTip(p) ? LR.sampleData(bk.tip, bk.tip.data, bk.tip.N, p[0], p[1], 0) : LR.sampleData(bk.big, bk.big.data, bk.big.N, p[0], p[1], 0));
  const horizon = (p) => (inCap(p) ? LR.sampleData(CPk, CPk.hzData, CPk.N, p[0], p[1], 0) : inTip(p) ? LR.sampleData(bk.tip, bk.tip.hzData, bk.tip.N, p[0], p[1], 0) : LR.sampleData(bk.big, bk.big.hzData, bk.big.NH, p[0], p[1], 0));
  const bigCh = (p, ch) => LR.sampleData(bk.big, bk.big.data, bk.big.N, p[0], p[1], ch);
  // bolas de granito con sombra de largo dirigido (loma de S4, roca del niño y asiento de S8)
  const boulders = LR.makeBoulders(cfg, SC, clock);
  const knB = boulders.S4 ? LR.bakeKnoll(G, cfg, boulders.S4, SC) : null;
  LR._debug.knB = knB;
  const bShadow = (p, t, shot) => { let o = 0; for (const b of boulders[shot.id] || []) o = Math.max(o, LR.boulderOcc(b, p, b.L(t), SC)); return o; };
  const CB = cfg.crestBand;
  // el golpe de 1.70 da un pequeño escalón de luz
  const bandK = (t) => clock.D(t) / Math.max(1e-6, clock.D(4.97)) + 0.07 * PBS.smooth((t - 1.7) / 0.25) * (1 - PBS.smooth((t - 1.7) / 3.2));
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
  LR._debug.litAt = litAt;

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
    if (shot.id === 'S8') {
      // en el golpe del niño el resto casi se detiene 1 s (el ojo va a él); desde 38.8 el movimiento se calma
      const f0 = 37.7, f1 = 38.8;
      sea -= 0.85 * (clock.sea(PBS.clamp(t, f0, f1)) - clock.sea(f0)) + 0.45 * (clock.sea(Math.max(t, f1)) - clock.sea(f1));
    }
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
    if (fx.includes('CLUMPS') && shot.W <= 150) {
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
        const Rc = c[2] * 1.5 + pad; ovl.add('ob', 2, c, [Rc, 0], [0, Rc], [c[0], c[1], c[2], c[3]], [c[4], lt, 0, 0]);
      }
    }
    const bl = boulders[shot.id] || [];
    const mass = bl.find((b) => b.hidden);
    for (const b of bl) {
      if (!inView(b.p, 40)) continue;
      if (shot.id === 'S4' && knB) continue;   // S4: la loma está horneada (sombreador de mundo)
      const Lb = b.L(t), jag = b.jag || 0;
      // la sombra de una bola que queda entera dentro de la sombra de la masa no se dibuja (ahorro)
      let covered = false;
      if (mass && !b.hidden) {
        const rx = b.p[0] - mass.p[0], ry = b.p[1] - mass.p[1];
        const a = rx * sD[0] + ry * sD[1], bb = rx * pp[0] + ry * pp[1], Rm = mass.Rb * 0.9;
        if (Math.abs(bb) < Rm) { const fr = Math.sqrt(1 - (bb / Rm) ** 2) * (mass.r + mass.L(t)) - 1.3 * jag - 1.2; covered = a + b.r + Lb < fr; }
      }
      const lt = litAt.lit(b.p, t, bigCh(b.p, 0), null, b.hb, true);
      const Rp = Math.max(b.r, b.Rb || 0) * 1.08 + pad;
      const o = add2(b.p, sD, (Lb + jag) / 2), A = sD.map((v) => v * (b.r + (Lb + jag) / 2 + 0.6 + pad)), B = pp.map((v) => v * Rp);
      const P2 = [b.p[0], b.p[1], b.r, b.hb], P3 = [Lb, b.seed, b.asp, b.ang], P4 = [lt, b.hidden ? 1 : 0, b.Rb || 0, b.jag || 0];
      if (!covered && !b.hidden) ovl.add('ov', 6, o, A, B, P2, P3, P4);
      if (!b.hidden) { const Rb2 = b.r * 1.3 + pad; ovl.add('ob', 6, b.p, [Rb2, 0], [0, Rb2], P2, P3, P4); }
    }
    const tanE = Math.tan(e * D2R);
    if (fx.includes('BOAT')) {
      const Bo = cfg.world.boat, bp = [Bo.x, Bo.y];
      const lt = litAt.lit(bp, t, bigCh(bp, 0), null, 0.6);
      const L2 = 0.6 / Math.tan((shot.W > 150 ? Math.max(e, 0.6) : en) * D2R) / 2;
      const o = add2(bp, sD, L2), A = sD.map((v) => v * (L2 + 3.2)), B = pp.map((v) => v * 3.2);
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
      // huellas: pares escalonados a lo largo del recorrido real de cada colono desde el bote (se desvanecen hacia el bote);
      // y a lo largo de la orilla para el grupo indígena
      const Bt = cfg.world.boat, paths = [];
      const hb = Bt.heading * D2R, bf = [Math.sin(hb), Math.cos(hb)];
      for (const F of figs) {
        const c = SC.cast[shot.id].find((q) => q.id === F.id);
        if (!c) continue;
        if (c.pathW) {
          const a0 = [Bt.x + bf[0] * (F.id === 'C1' ? 1.0 : 0.2) + bf[1] * 0.9, Bt.y + bf[1] * (F.id === 'C1' ? 1.0 : 0.2) - bf[0] * 0.9];
          paths.push({ a: a0, b: [F.foot[0] - 0.35 * Math.sin(F.face), F.foot[1] - 0.35 * Math.cos(F.face)], bend: F.id === 'C1' ? 0.9 : -0.6, depth: 1, seed: F.id === 'C1' ? 3 : 7 });
        } else if (c.id === 'I10' || c.id === 'I8') {
          const dir = [Math.sin(215 * D2R), Math.cos(215 * D2R)];
          paths.push({ a: [F.foot[0] + dir[0] * 14, F.foot[1] + dir[1] * 14 + (c.id === 'I8' ? -1.0 : 0.6)], b: [F.foot[0] + dir[0] * 0.5, F.foot[1] + dir[1] * 0.5], bend: 0.7, depth: 0.7, seed: c.id === 'I8' ? 11 : 13 });
        }
      }
      for (const P of paths) {
        const d = [P.b[0] - P.a[0], P.b[1] - P.a[1]], L = Math.hypot(d[0], d[1]); if (L < 0.3) continue;
        const u0 = [d[0] / L, d[1] / L], n0 = [-u0[1], u0[0]];
        const ctrl = [(P.a[0] + P.b[0]) / 2 + n0[0] * P.bend, (P.a[1] + P.b[1]) / 2 + n0[1] * P.bend];
        const bez = (u) => [(1 - u) * (1 - u) * P.a[0] + 2 * u * (1 - u) * ctrl[0] + u * u * P.b[0], (1 - u) * (1 - u) * P.a[1] + 2 * u * (1 - u) * ctrl[1] + u * u * P.b[1]];
        let s = 0.2, j = 0;
        while (s < L && j < 60) {
          const h1 = ((j * 7919 + P.seed * 131) % 997) / 997, h2 = ((j * 104729 + P.seed * 71) % 991) / 991;
          const u = s / L, pt = bez(u), pt2 = bez(Math.min(1, u + 0.01));
          let dv = [pt2[0] - pt[0], pt2[1] - pt[1]]; const dl = Math.hypot(dv[0], dv[1]) || 1; dv = [dv[0] / dl, dv[1] / dl];
          const side = j % 2 ? -1 : 1, nx = [-dv[1], dv[0]];
          const c = [pt[0] + nx[0] * side * (0.1 + 0.03 * h1), pt[1] + nx[1] * side * (0.1 + 0.03 * h1)];
          const dep = P.depth * (0.35 + 0.65 * u) * (0.75 + 0.25 * h2);
          if (inView(c, 1)) ovl.add('ov', 7, c, [0.2, 0], [0, 0.2], [c[0], c[1], dv[0], dv[1]], [0.13, 0.058, 0, dep]);
          s += 0.34 + 0.1 * h2; j++;
        }
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
    ovl.draw({ photo, tipTex: fx.includes('CAP') && bk.cap ? bk.cap : bk.tip, uXf: [X.cx, X.cy, X.mpp, X.th], uE: e, uEh: eh, uEn: en, tip: tipOn, sunC, sky, far: shot.W > 150 ? 1 : 0 });
    // encaje
    const lc = cfg.lace;
    const laceR = shot.id === 'S8' ? lc.R : lc.R * PBS.ease((t - lc.t0) / (lc.grow - lc.t0));
    const laceW = 1 + 0.3 * (2 * low - 1);
    const flash = clock.pulse(t, 0.55, 30.6, 37.6);
    const drift = (sea - clock.sea(lc.t0)) * 0.55;

    const pWorld = progFor(hasOV ? fx.concat(['OV']) : fx);
    const tipT = fx.includes('CAP') && bk.cap ? bk.cap : bk.tip;
    gl.useProgram(pWorld); { const l = gl.getUniformLocation(pWorld, 'uTrail'); if (l) gl.uniform4fv(l, uTrail); }
    const U = {
      tBake: bk.big.tex, tNorm: bk.big.norm, tHz: bk.big.hz, tTip: tipT.tex, tTipN: tipT.norm, tTipHz: tipT.hz, uTipE: [tipT.x0, tipT.y0, tipT.size, 0], uCell: shot.id === 'S7' ? 5.4 : cfg.lace.cell, tJ: fx.includes('CAP') && bk.cap ? bk.cap.jt : bk.joints.tex, uJE: fx.includes('CAP') && bk.cap ? bk.cap.jx : bk.joints.ext, tDet: bk.det, tWave: bk.wave, tPhoto: photo, tAtlas: atlas.tex, tOV: ovl.OV.tex, tOB: ovl.OB.tex, tVor: bk.vor,
      uXf: [X.cx, X.cy, X.mpp, X.th], uT: t, uE: e, uEh: eh, uEn: en, uSunI: sunI, uSunC: sunCol, uSky: sky,
      uSea: sea, uLow: low, uHigh: high, uSway: sway, uGust: gustPh,
      uFlags: [close, tipOn, 0, 0], uFlags2: [0, tipOn, shot.id === 'S8' ? 1 : 0, 0],
      uLace: [laceR, laceW, flash, drift],
      uCalm: [1040, 0, 0, 0], uNTrail: nT, uOvBox: ovl.screenBox(), uBand: [CB.a[0], CB.a[1], CB.b[0], CB.b[1]], uBandL: [bandAt(t)[0], bandAt(t)[1], CB.jag, 0], uBand2: [CB.bulgeY, CB.bulgeSigma, bandAt(t)[2], 0], uLip: shot.id === 'S7' ? 1 : 0, uMacS: shot.W > 300 ? 420 : shot.W > 150 ? 110 : 60, uCalmK: cfg.closing.calmK,
    };
    // gradación (en el mismo pase)
    const cl = cfg.closing, ca = smooth((t - cfg.closingAt) / 0.8);
    U.uExp = cfg.grade.exposure * (1 + cfg.grade.lowSunBoost * (1 - smooth(e / 2.2))) * (1 + 0.04 * (rms - 0.5) * 2);
    U.uSeed = Math.round(t * cfg.fps) % 997; U.uGrain = cfg.grade.grain; U.uScrim = ca > 0 ? 1 - ca * (1 - cl.scrim) : 0; U.uBox = cl.scrimBox; U.uFeather = cl.scrimFeather;
    U.uDbg = window.LR_DBG || [0, 0, 0, 0];
    U.tMonte = bk.monte;
    U.tKnA = knB ? knB.a : bk.det; U.tKnB = knB ? knB.b : bk.det; U.uKnE = knB && shot.id === 'S4' ? knB.ext : [0, 0, 0, 0];
    U.uMass = mass ? [mass.p[0], mass.p[1], mass.r, mass.Rb] : [0, 0, 1, 1];
    U.uMass2 = mass ? [mass.L(t), mass.seed, mass.jag, 1] : [0, 0, 0, 0];
    G.draw(pWorld, U, null);
    ctx.clearRect(0, 0, cfg.width, cfg.height);
    ctx.drawImage(G.canvas, 0, 0);
    PBS.drawClosing(ctx, t, { t0: cfg.closingAt, dark: true, logo, logoWidth: cfg.logo.width, y: cl.y, shadow: cl.shadow });
  }

  // precalentar: compilar y ejecutar una vez cada variante de programa por toma (evita el primer cuadro lento de cada toma)
  for (const sh of cfg.shots) render(Math.min(sh.t1 - 0.05, sh.t0 + 0.1));
  G.gl.finish();

  return { warnings, logo: !!logo, render };
};
