/* Revelado · canción entera — contrato: window.createReel(canvas, cfg) → Promise<{render(t), warnings, logo}>. render(t) es función pura de t. */
window.createReel = async function (canvas, cfg) {
  const warnings = [];
  const RV = window.RV;
  const T0INIT = performance.now();
  const lg = (s) => { if (/log/.test(location.search)) console.log('LOG ' + s + ' @' + ((performance.now() - T0INIT) / 1000).toFixed(1)); };
  await PBS.loadFonts(cfg.assets + 'fonts/', warnings);
  const audio = await PBS.loadAudioFeatures(cfg.featuresUrl);
  if (audio.missing) warnings.push('Sin rasgos de audio: se usan valores constantes.');
  let logo = null;
  try { logo = await PBS.loadImage(cfg.assets + cfg.logo.file); } catch (e) { warnings.push('FALTA EL LOGO'); }

  // ---------- audio → relojes precalculados ----------
  const FPS = cfg.fps, N = Math.round(cfg.duration * FPS);
  const arr = (k, def) => (audio.missing || !audio[k] ? new Array(N).fill(def) : audio[k]);
  const A = { voice: arr('voiceSmooth', 0.45), low: arr('lowSmooth', 0.35), high: arr('highSmooth', 0.4), rms: arr('rmsSmooth', 0.5), cent: arr('centroidSmooth', 0.5), flux: arr('flux', 0) };
  const NA = A.voice.length;
  const at = (a, t) => { const f = PBS.clamp(t * FPS, 0, NA - 1), i = Math.floor(f), u = f - i; return a[i] * (1 - u) + a[Math.min(NA - 1, i + 1)] * u; };
  const avg = (a, t, span) => { let s = 0, n = 0; for (let k = -span / 2; k <= span / 2 + 1e-6; k += 1 / FPS) { s += at(a, t + k); n++; } return s / n; };
  const dv = cfg.development;
  const gate = (t) => { let g = 1; for (const [g0, g1] of dv.gates) g = Math.min(g, 1 - (1 - dv.gateFloor) * Math.min(PBS.smooth((t - (g0 - dv.ramp)) / dv.ramp), PBS.smooth((g1 + dv.ramp - t) / dv.ramp))); return g; };
  const slow = (t) => 1 - (1 - cfg.slow.to) * PBS.smooth((t - cfg.slow.t0) / cfg.slow.ramp); // al final el movimiento baja al 40 %
  // W2: el mismo reloj con piso 0,5 en la respiración, para que la copia nueva no quede en papel mientras el frente la cruza
  const gate2 = (t) => 1 - (1 - dv.gateFloorDev) * (1 - gate(t)) / (1 - dv.gateFloor);
  const Wk = new Float64Array(N + 1), Sk = new Float64Array(N + 1), Mk = new Float64Array(N + 1), W2k = new Float64Array(N + 1);
  for (let k = 0; k < N; k++) {
    const t = k / FPS, vs = A.voice[Math.min(k, NA - 1)], lo = A.low[Math.min(k, NA - 1)];
    Wk[k + 1] = Wk[k] + gate(t) * (0.25 + 0.75 * vs) / FPS;
    W2k[k + 1] = W2k[k] + gate2(t) * (0.25 + 0.75 * vs) / FPS;
    Sk[k + 1] = Sk[k] + (0.3 + lo) * slow(t) / FPS;
    Mk[k + 1] = Mk[k] + slow(t) / FPS;
  }
  const look = (tab, t) => { if (t <= 0) return t * (tab[1] - tab[0]) * FPS; const f = Math.min(N, t * FPS), i = Math.min(N - 1, Math.floor(f)), u = f - i; return tab[i] * (1 - u) + tab[i + 1] * u; };
  const W = (t) => look(Wk, t), W2 = (t) => look(W2k, t), Sph = (t) => look(Sk, t), Mt = (t) => look(Mk, t);
  // arranques (máximos locales del flujo): los «golpes medidos»
  const onsets = [];
  for (let i = 1; i < NA - 1; i++) { const f = A.flux[i]; if (f > cfg.onsetThreshold && f >= A.flux[i - 1] && f >= A.flux[i + 1] && (!onsets.length || i / FPS - onsets[onsets.length - 1] >= cfg.onsetGap)) onsets.push(i / FPS); }
  const onsetInfo = (t) => { // último y anterior arranque ≤ t: [t, índice, t, índice]
    let lo = 0, hi = onsets.length; while (lo < hi) { const m = (lo + hi) >> 1; if (onsets[m] <= t) lo = m + 1; else hi = m; }
    const i = lo - 1;
    return [i >= 0 ? onsets[i] : -1, i, i >= 1 ? onsets[i - 1] : -1, i - 1];
  };
  const surge = (t) => { let s = 0; for (let i = Math.max(0, onsetInfo(t)[1] - 3); i < onsets.length && onsets[i] <= t; i++) if (t - onsets[i] < 2.4) s += Math.exp(-(t - onsets[i]) / cfg.surgeTau); return Math.min(1, s); };

  // ---------- fotos, máscaras, distancias ----------
  const mat = {};
  const shedPrints = new Set((cfg.shed || []).map((s) => s.print));
  const photoKeys = Object.keys(cfg.photos);
  for (const key of photoKeys) {
    let img = null;
    try { img = await PBS.loadImage(cfg.assets + cfg.photos[key]); } catch (e) { warnings.push('FALTA FOTO ' + cfg.photos[key]); }
    lg('foto ' + key + ' cargada');
    mat[key] = RV.processPhoto(img, key, cfg);
    lg('foto ' + key + ' procesada');
    if (/dbg/.test(location.search)) { // superposición de máscaras para revisar polígonos (sólo depuración)
      const M = mat[key], s = Math.max(1, Math.round(M.tw / 900)), W2c = Math.floor(M.tw / s), H2c = Math.floor(M.th / s), c = document.createElement('canvas'); c.width = W2c; c.height = H2c;
      const g = c.getContext('2d'), id = g.createImageData(W2c, H2c);
      for (let y = 0; y < H2c; y++) for (let x = 0; x < W2c; x++) {
        const i = y * s * M.tw + x * s, k = (y * W2c + x) * 4, L = M.photo.data[i * 4] * 0.55, wa = M.water[i] / 255, ro = M.rock[i] / 255, sa = M.sand[i] / 255, sk = M.sky[i] / 255;
        id.data[k] = L + 110 * ro + 100 * sa; id.data[k + 1] = L + 100 * sa + 60 * sk; id.data[k + 2] = L + 120 * wa + 110 * sk; id.data[k + 3] = 255;
      }
      g.putImageData(id, 0, 0);
      (window.__rvDbg = window.__rvDbg || {})[key] = c.toDataURL('image/png');
    }
  }

  // ---------- GL ----------
  lg('fotos listas');
  const gl = new PBS.GL(cfg.width, cfg.height), G = gl.gl;
  const triBuf = G.createBuffer();
  G.bindBuffer(G.ARRAY_BUFFER, triBuf);
  G.bufferData(G.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), G.STATIC_DRAW);
  const tex = {};
  for (const key of photoKeys) {
    tex[key] = { photo: gl.texture(mat[key].photo), mask: gl.texture(mat[key].mask) };
    mat[key].photo = null; mat[key].mask = null;
  }
  const NW = N + 1;
  const wData = new Float32Array(NW * 4);
  for (let k = 0; k <= N; k++) { wData[k * 4] = Wk[k]; wData[k * 4 + 1] = Sk[k]; wData[k * 4 + 2] = W2k[k]; }
  const wTex = G.createTexture();
  G.bindTexture(G.TEXTURE_2D, wTex);
  G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR);
  G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE);
  G.texImage2D(G.TEXTURE_2D, 0, G.RGBA32F, NW, 1, 0, G.RGBA, G.FLOAT, wData);
  const noiseTex = gl.texture(RV.noiseImage(cfg.seed + 3), { repeat: true });
  G.bindTexture(G.TEXTURE_2D, noiseTex); G.generateMipmap(G.TEXTURE_2D); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR_MIPMAP_LINEAR);
  const dummy = gl.texture(null, { w: 1, h: 1 });
  const grainTex = gl.texture(RV.grainImage(cfg.seed + 5), { nearest: true, repeat: true });
  const fboA = gl.target(cfg.width, cfg.height, { float: true }), fboB = gl.target(cfg.width, cfg.height, { float: true });
  // virado: LUT 256×3 (fila 0 copia viva, fila 1 archivo, fila 2 selenio), recalculada por cuadro (calidez de luces y centroide)
  const toneTex = gl.texture(null, { w: 256, h: 3 });
  const toneBuf = new Uint8Array(256 * 3 * 4);
  const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const T_S = [0.1098, 0.098, 0.0863];
  const T_M0 = [0.4784, 0.4, 0.3137], lm0 = luma(T_M0), T_M = T_M0.map((v) => lm0 + (v - lm0) * 0.72);
  const T_A = [205 / 255, 181 / 255, 148 / 255];
  const SEL = cfg.tone.selenium; // {S, M, H}: sombras, medios y luces del viraje cálido pardo-rojizo (sutil)
  const sstep = (a, b, x) => PBS.smooth((x - a) / (b - a));
  let toneKey = '';
  function buildTone(hi0, cent0) {
    const hi = hi0.map((v) => Math.round(v * 1024) / 1024), cent = Math.round(cent0 * 256) / 256;
    const key = hi.join(',') + '|' + cent;
    if (key === toneKey) return;
    toneKey = key;
    const ls = luma(T_S), lm = luma(T_M), lh = luma(hi), la = luma(T_A);
    const sS = luma(SEL.S), sM = luma(SEL.M), sH = luma(SEL.H);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 256; i++) {
      const L = i / 255, arch = row === 1 ? 1 : 0;
      let tint;
      if (row === 2) tint = [0, 1, 2].map((c) => (L < sM ? PBS.lerp(SEL.S[c] / sS, SEL.M[c] / sM, sstep(0.02, sM, L)) : PBS.lerp(SEL.M[c] / sM, SEL.H[c] / sH, sstep(sM, sH, L))));
      else tint = [0, 1, 2].map((c) => (L < lm ? PBS.lerp(T_S[c] / ls, T_M[c] / lm, sstep(0.02, lm, L)) : PBS.lerp(T_M[c] / lm, hi[c] / lh, sstep(lm, lh, L))));
      const w = sstep(0.5, 0.9, L);
      if (row !== 2) { tint[0] *= 1 + 0.02 * cent * w; tint[2] *= 1 - 0.02 * cent * w; }
      const am = arch * (0.55 + 0.45 * sstep(0.25, 0.75, L));
      tint = tint.map((v, c) => PBS.lerp(v, T_A[c] / la, am));
      let col = tint.map((v) => L * v);
      const mx = Math.max(...col), mn = Math.min(...col), y = luma(col), lim = row === 2 ? SEL.maxChroma : 0.12;
      if (mx - mn > lim) col = col.map((v) => y + (v - y) * (lim / (mx - mn)));
      for (let c = 0; c < 3; c++) toneBuf[(row * 256 + i) * 4 + c] = Math.round(PBS.clamp(col[c], 0, 1) * 255);
      toneBuf[(row * 256 + i) * 4 + 3] = 255;
    }
    G.bindTexture(G.TEXTURE_2D, toneTex);
    G.texSubImage2D(G.TEXTURE_2D, 0, 0, 0, 256, 3, G.RGBA, G.UNSIGNED_BYTE, toneBuf);
  }

  lg('texturas listas');
  // ---------- figuras ----------
  const SR = cfg.sizeRule;
  const unitOf = (f, kind) => {
    if (f.pose === 'sail') return f.u || SR.sailUnit;
    let adult;
    if (f.h != null) adult = f.h / 100;
    else adult = kind === 'gruta' ? ((f.sizeY || f.foot[1]) - SR.gruta.headY) / 100 : (SR.rinconada.k * ((f.sizeY || f.foot[1]) - SR.rinconada.y0)) / 100;
    return f.size === 'child' ? adult * SR.child : adult;
  };
  const FL = cfg.figureLook;
  const prints = {};
  for (const pc of cfg.prints) {
    const kind = pc.photo, figs = cfg.figures.filter((f) => f.print === pc.id);
    const gdef = (cfg.groups && cfg.groups[pc.id]) || {};
    const list = figs.map((f) => {
      const ys = (f.foot[1] - pc.cam[0][2]) * pc.scale, depth = PBS.clamp((FL.yNear - ys) / (FL.yNear - FL.yFar), 0, 1);
      const L = f.pose === 'sail' ? FL.sailL : PBS.lerp(FL.Lnear, FL.Lfar, depth);
      const soft = (f.pose === 'sail' ? FL.sailSoft : PBS.lerp(FL.softNear, FL.softFar, depth)) / pc.scale;
      return { ...f, unit: unitOf(f, kind), L, soft };
    });
    const atl = RV.buildFigureAtlas(list, cfg.light[pc.photo], pc.atlasS || 2);
    const P = { ...pc, figs: list, gdef, hasB: list.some((f) => f.group), groupIds: [...new Set(list.filter((f) => f.group).map((f) => f.group))].sort() };
    P.figA = atl.A ? gl.texture(atl.A) : dummy; P.boxA = atl.boxA || [-1e5, -1e5, 1, 1];
    P.figB = atl.B ? gl.texture(atl.B) : dummy; P.boxB = atl.boxB || [-1e5, -1e5, 1, 1];
    P.gbox = [1, 2, 3, 4].map((g) => atl.groups[g] || [1e5, 1e5, -1e5, -1e5]);
    P.fx = pc.fx || {};
    prints[pc.id] = P;
  }
  const progs = {};
  const progFor = (P) => progs[P.id] || (progs[P.id] = gl.program(RV.printSource({ kind: P.kind, archive: !!P.archive, groups: P.groupIds })));
  lg('atlas listos');
  const compProg = gl.program(RV.compositeSource());

  // ---------- secciones y relevos ----------
  const secs = cfg.sections;
  const relays = [];
  secs.forEach((s, i) => {
    if (i > 0 && s.print === secs[i - 1].print) return;
    const e = s.enter || {}, isFirst = i === 0;
    const a = ((e.dirDeg || 0) * Math.PI) / 180, d = [Math.sin(a), -Math.cos(a)];
    let pmin = 1e9, pmax = -1e9, perpMax = 0;
    for (const [x, y] of [[0, 0], [1080, 0], [0, 1920], [1080, 1920]]) { const pr = (x - 540) * d[0] + (y - 1920) * d[1], pp = (x - 540) * -d[1] + (y - 1920) * d[0]; pmin = Math.min(pmin, pr); pmax = Math.max(pmax, pr); perpMax = Math.max(perpMax, Math.abs(pp)); }
    const R = { print: s.print, sec: s, type: e.type || 'menisco', a, d, pmin, pmax, bow: e.bow || 80, noiseAmp: e.noiseAmp || 60, seed: e.seed || 1, figFront: e.figFront || 0, tau0: e.tau0 || 0.45, induction: e.induction != null ? e.induction : 0.03, wet: e.wet || 0, figTau: e.figTau || 0.3, dur: e.dur || 1.2 };
    const nmax = 1.25 * R.noiseAmp + R.bow * Math.pow(perpMax / 540, 2);
    if (R.type === 'lab') {
      R.t0 = s.t0 - R.dur / 2; R.delay = R.dur * 0.5; R.s0 = 0; R.v = 1; R.tLast = R.t0 + R.delay + 0.5; R.tBleached = R.t0 + R.dur + 0.05;
    } else if (e.s0 != null) { // primer menisco: ya está cruzando en el cuadro 0
      R.t0 = e.t0; R.s0 = e.s0; R.v = e.v; R.tLast = R.t0 + (pmax + nmax + 12 - R.s0) / R.v; R.tBleached = R.tLast + 130 / R.v;
    } else {
      R.t0 = s.t0 - R.dur / 2; R.s0 = pmin - 1.25 * R.noiseAmp; R.v = (pmax + nmax + 12 - R.s0) / R.dur;
      R.tLast = R.t0 + R.dur; R.tBleached = R.tLast + 130 / R.v;
    }
    relays.push(R);
  });
  const devEnd = (R) => { let t = R.tLast; while (t < cfg.duration && W2(t) - W2(R.tLast) < R.induction + 5.3 * R.tau0) t += 1 / 60; return t; };
  relays.forEach((R) => { R.tDone = devEnd(R); });
  // el frente se ve mientras cruza el cuadro
  const menVisible = (R, t) => (R.type === 'menisco' && t >= R.t0 - 0.05 && t < R.tLast + 0.3);

  lg('relevos listos');
  // ---------- plata que se suelta: partículas ----------
  const foamVS = (() => {
    const sh = (type, src) => { const s = G.createShader(type); G.shaderSource(s, src); G.compileShader(s); if (!G.getShaderParameter(s, G.COMPILE_STATUS)) throw new Error(G.getShaderInfoLog(s)); return s; };
    const p = G.createProgram(); G.attachShader(p, sh(G.VERTEX_SHADER, RV.VS_FOAM)); G.attachShader(p, sh(G.FRAGMENT_SHADER, RV.FS_FOAM)); G.linkProgram(p);
    if (!G.getProgramParameter(p, G.LINK_STATUS)) throw new Error(G.getProgramInfoLog(p));
    return p;
  })();
  const livingLUT = RV.monotoneLUT(cfg.tone.livingCurve);
  const shed = (cfg.shed || []).map((sc) => {
    const P = prints[sc.print], M = mat[P.photo], spec = cfg.photoSpec[P.photo];
    const rnd = PBS.rng(cfg.seed + 101 + (sc.seedOff || 0));
    const up = M.up, tw = M.tw, hw = M.hw, hh = M.hh, dconv = 2 / up;
    const lumAt = (x, y) => M.lum[Math.round(y * up) * tw + Math.round(x * up)];
    const cand = [];
    const reg = sc.region || [0, 0, spec.w, spec.h];
    if (sc.mode === 'edge') {
      // granito junto al agua: la dirección va hacia el agua (menos el gradiente de la distancia a ella)
      const dAt = (x, y) => M.dLand[PBS.clamp(Math.round((y * up) / 2), 0, hh - 1) * hw + PBS.clamp(Math.round((x * up) / 2), 0, hw - 1)] * dconv;
      for (let y = reg[1]; y < reg[3]; y += sc.cell) for (let x = reg[0]; x < reg[2]; x += sc.cell) {
        const xx = x + (rnd() - 0.5) * sc.cell, yy = y + (rnd() - 0.5) * sc.cell;
        if (M.rock[Math.round(yy * up) * tw + Math.round(xx * up)] < 200) continue;
        const d0 = dAt(xx, yy);
        if (d0 > sc.band) continue;
        let gx = dAt(xx + 3, yy) - dAt(xx - 3, yy), gy = dAt(xx, yy + 3) - dAt(xx, yy - 3);
        let gl_ = Math.hypot(gx, gy);
        if (gl_ < 0.05) { gx = 0; gy = -1; gl_ = 1; }
        cand.push([xx, yy, -gx / gl_, -gy / gl_, d0]);
      }
    } else {
      // roca oscura (matas): granos que el viento arrastra a lo largo del suelo
      for (let y = reg[1]; y < reg[3]; y += sc.cell) for (let x = reg[0]; x < reg[2]; x += sc.cell) {
        const xx = x + (rnd() - 0.5) * sc.cell, yy = y + (rnd() - 0.5) * sc.cell;
        const l = lumAt(xx, yy);
        if (l > sc.lumMax) continue;
        cand.push([xx, yy, sc.wind[0], sc.wind[1], sc.turn * (0.5 + rnd())]);
      }
    }
    // curva acumulada del flujo para el goteo; ráfagas agrupadas en los arranques
    const k0 = Math.round(sc.t0 * FPS), k1 = Math.round(sc.t1 * FPS), cum = [0];
    for (let k = k0; k < k1; k++) cum.push(cum[cum.length - 1] + 0.10 + Math.pow(A.flux[Math.min(k, NA - 1)], 4) * 3.0);
    const tot = cum[cum.length - 1];
    const invF = (u) => { const v = u * tot; let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < v) lo = m; else hi = m; } return (k0 + lo + (v - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo])) / FPS; };
    const near = (t0) => { let best = t0; for (const o of onsets) if (Math.abs(o - t0) < 0.25) best = o; return best; };
    const avoid = P.figs.map((f) => [f.foot[0] - 44 * f.unit, f.foot[1] - 112 * f.unit, f.foot[0] + 44 * f.unit, f.foot[1] + 8 * f.unit]);
    const inAvoid = (x, y) => avoid.some((b) => x > b[0] && x < b[2] && y > b[1] && y < b[3]);
    const data = [];
    const push = (c, tr) => {
      const [x, y, dx, dy, d0] = c;
      const ang = Math.atan2(dy, dx) + (rnd() - 0.5) * sc.fan, dir = [Math.cos(ang), Math.sin(ang)];
      const v = sc.speed[0] + (sc.speed[1] - sc.speed[0]) * rnd(), life = PBS.clamp((d0 + sc.reach[0] + sc.reach[1] * rnd()) / v, sc.life[0], sc.life[1]);
      const ex = x + dir[0] * v * life, ey = y + dir[1] * v * life;
      if (inAvoid(x, y) || inAvoid(ex, ey) || inAvoid((x + ex) / 2, (y + ey) / 2)) return;
      const l0 = PBS.clamp((lumAt(x, y) - spec.black) / (spec.white - spec.black), 0, 1);
      const Lr = PBS.clamp(livingLUT[Math.round(l0 * 1023)] * (sc.darken || 0.8), sc.Lmin || 0.07, sc.Lmax || 0.22);
      data.push(x, y, dir[0], dir[1], tr, v, life, d0, rnd() * 6.28, sc.swirl[0] + sc.swirl[1] * rnd(), Lr, sc.size[0] + (sc.size[1] - sc.size[0]) * rnd());
    };
    if (cand.length) {
      for (const [ts, nCl] of sc.bursts || []) {
        const t0b = near(ts);
        for (let k = 0; k < nCl; k++) {
          const ctr = cand[Math.floor(rnd() * cand.length)];
          const pool = cand.filter((c) => Math.hypot(c[0] - ctr[0], c[1] - ctr[1]) < sc.cluster);
          for (let j = 0; j < sc.perCluster && pool.length; j++) push(pool[Math.floor(rnd() * pool.length)], t0b + 0.45 * Math.pow(rnd(), 2));
        }
      }
      for (let j = 0; j < sc.trickle; j++) push(cand[Math.floor(rnd() * cand.length)], invF(rnd()));
    }
    const n = data.length / 12;
    const vao = G.createVertexArray(); G.bindVertexArray(vao);
    const buf = G.createBuffer(); G.bindBuffer(G.ARRAY_BUFFER, buf); G.bufferData(G.ARRAY_BUFFER, new Float32Array(data), G.STATIC_DRAW);
    ['aP', 'aQ', 'aR'].forEach((nm, i) => { const l = G.getAttribLocation(foamVS, nm); if (l >= 0) { G.enableVertexAttribArray(l); G.vertexAttribPointer(l, 4, G.FLOAT, false, 48, i * 16); } });
    G.bindVertexArray(null);
    G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    const loc = {}; for (const u of ['uT', 'uS', 'uGeo', 'uGeo2', 'uBurn', 'uSh', 'uHigh', 'uTone', 'uPass', 'uPale']) loc[u] = G.getUniformLocation(foamVS, u);
    return { sc, n, vao, loc, cand: cand.length };
  });
  // liberar memoria de init
  for (const k in mat) { mat[k].lum = null; mat[k].dLand = null; mat[k].dRock = null; mat[k].water = mat[k].rock = mat[k].sand = mat[k].sky = null; }

  // ---------- capas 2D: anotaciones de archivo ----------
  const notes = (cfg.annotations || []).map((a) => {
    const c = document.createElement('canvas'); c.width = cfg.width; c.height = a.h || 420;
    const g = c.getContext('2d', { willReadFrequently: true });
    const lines = [];
    const wrap = (text, font, maxW) => { g.font = font; const words = text.split(' '), out = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = w; } } if (cur) out.push(cur); return out; };
    const S = cfg.noteStyle;
    if (a.word) lines.push(...wrap(a.word, PBS.font('serif', a.wordSize || S.wordSize, 500, true), S.maxW).map((t) => ({ t, font: PBS.font('serif', a.wordSize || S.wordSize, 500, true), size: a.wordSize || S.wordSize, gap: 0 })));
    if (a.gloss) lines.push(...wrap(a.gloss, PBS.font('sans', S.glossSize, 400), S.maxW).map((t, i) => ({ t, font: PBS.font('sans', S.glossSize, 400), size: S.glossSize, gap: i ? 0 : S.gapWordGloss })));
    if (a.gloss2) lines.push(...wrap(a.gloss2, PBS.font('sans', S.gloss2Size, 400), S.maxW).map((t, i) => ({ t, font: PBS.font('sans', S.gloss2Size, 400), size: S.gloss2Size, gap: i ? 0 : S.gapGloss2 })));
    let y = 0;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = S.ink;
    g.shadowColor = S.shadow; g.shadowBlur = S.shadowBlur; g.shadowOffsetY = 2;
    // sombra + tinta: dos pasadas para que la sombra no se lleve el borde de la letra
    for (const pass of [0, 1]) {
      y = 40;
      for (const L of lines) {
        y += L.gap + L.size * 0.98;
        g.font = L.font;
        if (pass === 0) { g.shadowColor = S.shadow; g.shadowBlur = S.shadowBlur; g.fillStyle = S.ink; } else { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.fillStyle = S.ink; }
        g.fillText(L.t, 540, y);
        y += L.size * 0.18;
      }
    }
    const nr = PBS.rng(cfg.seed + 700 + Math.round(a.t0 * 10)), noise = new Uint8Array(cfg.width * c.height);
    // ruido de nucleación con grumos (blanco + una pasada de suavizado): las letras se «revelan» por granos
    for (let i = 0; i < noise.length; i++) noise[i] = (nr() * 255) | 0;
    return { a, c, g, noise, yTop: a.y, cache: null };
  });
  const noteScratch = document.createElement('canvas'); noteScratch.width = cfg.width; noteScratch.height = 420;
  const noteG = noteScratch.getContext('2d');
  function drawNote(ctx, n, t) {
    const a = n.a, fadeIn = cfg.noteStyle.reveal, fadeOut = cfg.noteStyle.fadeOut;
    if (t < a.t0 || t > a.t1) return;
    const prog = PBS.clamp((t - a.t0) / fadeIn, 0, 1), out = 1 - PBS.smooth((t - (a.t1 - fadeOut)) / fadeOut);
    const h = n.c.height;
    if (prog >= 1) { ctx.save(); ctx.globalAlpha = out; ctx.drawImage(n.c, 0, n.yTop); ctx.restore(); return; }
    // densidad que sube: cada grano de la letra aparece cuando la densidad supera su umbral
    noteG.clearRect(0, 0, cfg.width, 420);
    const src = n.g.getImageData(0, 0, cfg.width, h), d = src.data, nz = n.noise, dens = Math.pow(prog, 1.1);
    for (let i = 0, k = 3; i < nz.length; i++, k += 4) {
      const al = d[k]; if (!al) continue;
      const th = nz[i] / 255, v = PBS.clamp((dens * 1.25 - th) / 0.25, 0, 1);
      d[k] = al * v;
    }
    noteG.putImageData(src, 0, 0);
    ctx.save(); ctx.globalAlpha = out; ctx.drawImage(noteScratch, 0, 0, cfg.width, h, 0, n.yTop, cfg.width, h); ctx.restore();
  }

  // ---------- cámara, grupos, parámetros por tipo ----------
  const ctx = canvas.getContext('2d');
  const hiFrom = PBS.hex(cfg.tone.hiFrom).map((v) => v / 255), hiTo = PBS.hex(cfg.tone.hiTo).map((v) => v / 255);
  const camAt = (P, t) => {
    const k = P.cam;
    if (k.length === 1 || t <= k[0][0]) return k[0].slice(1);
    const last = k[k.length - 1]; if (t >= last[0]) return last.slice(1);
    let i = 0; while (i < k.length - 2 && t > k[i + 1][0]) i++;
    const u0 = (t - k[i][0]) / (k[i + 1][0] - k[i][0]), u = 0.5 * u0 + 0.5 * PBS.ease(u0);
    return [1, 2, 3].map((j) => PBS.lerp(k[i][j], k[i + 1][j], u));
  };
  // arranque automático de un grupo: la fecha se calcula para que al final esté al % pedido
  for (const id in prints) {
    const gd = prints[id].gdef;
    for (const g in gd) if (gd[g].startAuto) {
      const sa = gd[g].startAuto, target = PBS.clamp(sa.dev, 0.01, 0.99), tau = gd[g].tau0, ind = gd[g].induction != null ? gd[g].induction : dv.induction;
      const need = ind - tau * Math.log(1 - target), wEnd = W(sa.end);
      let lo = 0, hi = sa.end; for (let it = 0; it < 40; it++) { const m = (lo + hi) / 2; if (wEnd - W(m) > need) lo = m; else hi = m; }
      gd[g].start = (lo + hi) / 2;
    }
  }
  const devGroup = (P, g, t) => { const G0 = P.gdef[g]; if (!G0) return 1; return 1 - Math.exp(-Math.max(0, W(t) - W(G0.start) - (G0.induction != null ? G0.induction : dv.induction)) / G0.tau0); };
  // recorrido de los grupos que caminan: tabla acumulada por cuadro con arranque y parada suaves (rampas de 1,4 s); nadie patina
  for (const id in prints) {
    const gd = prints[id].gdef;
    for (const g in gd) if (gd[g].vel) {
      const w = gd[g].walk || [gd[g].start, cfg.duration], rp = gd[g].ramp || 1.4, tab = new Float32Array(N + 2);
      for (let k = 0; k <= N; k++) { const t = k / FPS, sp = PBS.smooth((t - w[0]) / rp) * PBS.smooth((w[1] - t) / rp); tab[k + 1] = tab[k] + sp / FPS; }
      gd[g].tab = tab;
    }
  }
  const groupOffset = (P, g, t) => {
    const G0 = P.gdef[g]; if (!G0 || !G0.vel) return [0, 0];
    const f = PBS.clamp(t * FPS, 0, N), i = Math.floor(f), u = f - i, s = G0.tab[i] * (1 - u) + G0.tab[i + 1] * u;
    const w = G0.walk || [G0.start, cfg.duration];
    const bob = G0.bob ? G0.bob * Math.abs(Math.sin(Math.PI * (G0.step || 0.9) * (t - w[0]))) * PBS.smooth((t - w[0]) / 1.4) * PBS.smooth((w[1] - t) / 1.4) : 0;
    return [G0.vel[0] * s, G0.vel[1] * s - bob];
  };
  const selAmt = (P, t) => { const k = P.sel; if (!k) return 0; if (t <= k[0][0]) return k[0][1]; const l = k[k.length - 1]; if (t >= l[0]) return l[1]; let i = 0; while (i < k.length - 2 && t > k[i + 1][0]) i++; return PBS.lerp(k[i][1], k[i + 1][1], PBS.smooth((t - k[i][0]) / (k[i + 1][0] - k[i][0]))); };
  const lin = (t, a, b) => PBS.clamp((t - a) / (b - a), 0, 1);
  const parFor = (P, t) => {
    const f = P.fx;
    switch (P.id) {
      case 'aerea': return [[f.flow || 5, 0, 0, 0], [0, 0, 0, 0]];
      case 'canal': return [[f.swash || 26, 0, 0, 0], [0, 0, 0, 0]];
      case 'relieve': return [[PBS.lerp(f.alba.y0, f.alba.y1, PBS.ease(lin(t, f.alba.t0, f.alba.t1))), f.alba.gain, 0, 0], [0, 0, 0, 0]];
      case 'rompiente': return [[PBS.smooth(lin(t, f.grow.t0, f.grow.t0 + f.grow.dur)), PBS.smooth(lin(t, f.shade.t0, f.shade.t0 + f.shade.dur)), 0, 0], [0, 0, 0, 0]];
      case 'gruta': return [[f.pop, 0, 0, 0], [0, 0, 0, 0]];
      case 'estratos': return [[PBS.lerp(f.fog.y0, f.fog.y1, PBS.ease(lin(t, f.fog.t0, f.fog.t1))), f.fog.density * PBS.smooth(lin(t, f.fog.t0, f.fog.t0 + 1.5)), 0, 0], [0, 0, 0, 0]];
      case 'playa': return [f.tufts[0], f.tufts[1]];
      default: return [[0, 0, 0, 0], [0, 0, 0, 0]];
    }
  };

  const printU = (P, t, isOld) => {
    const [ox, oy, z] = camAt(P, t), ms = mat[P.photo], c = P.c || [540, 960];
    const grp = [0, 1, 2, 3].map((i) => (isOld ? 1 : (P.gdef[i + 1] ? devGroup(P, i + 1, t) : 0)));
    const go = [1, 2, 3, 4].map((g) => [...groupOffset(P, g, t), 0, 0]);
    const [par, par2] = parFor(P, t);
    // caja unión de los grupos (ya desplazados): fuera de ella no se busca ninguna figura
    let gU = [1e5, 1e5, -1e5, -1e5];
    [1, 2, 3, 4].forEach((g, i) => { const b = P.gbox[i]; if (b[0] > b[2]) return; gU = [Math.min(gU[0], b[0] + go[i][0]), Math.min(gU[1], b[1] + go[i][1]), Math.max(gU[2], b[2] + go[i][0]), Math.max(gU[3], b[3] + go[i][1])]; });
    return {
      uPhoto: tex[P.photo].photo, uMask: tex[P.photo].mask, uFigA: P.figA, uFigB: P.figB,
      geo: [ox, oy, P.scale, z], geo2: [c[0], c[1], ms.w, ms.h], boxA: P.boxA, boxB: P.boxB, grp,
      gcw: [1, 2, 3, 4].map((g) => (P.gdef[g] && P.gdef[g].coreW != null ? P.gdef[g].coreW : 0.72)),
      gb1: P.gbox[0], gb2: P.gbox[1], gb3: P.gbox[2], gb4: P.gbox[3], go1: go[0], go2: go[1], go3: go[2], go4: go[3], gU, par, par2,
    };
  };

  const syncBuf = new Float32Array(4), syncB8 = new Uint8Array(4);
  const sync = (fl) => { if (fl) G.readPixels(0, 0, 1, 1, G.RGBA, G.FLOAT, syncBuf); else { G.bindFramebuffer(G.FRAMEBUFFER, null); G.readPixels(0, 0, 1, 1, G.RGBA, G.UNSIGNED_BYTE, syncB8); } };
  const noteCfg = cfg.noteStyle;
  function render(t) {
    const frame = Math.round(t * FPS);
    let k = 0; for (let i = 0; i < relays.length; i++) if (t >= relays[i].t0) k = i;
    const R = relays[k], Rp = k > 0 ? relays[k - 1] : null;
    const B = prints[R.print], Aold = Rp && t < R.tBleached ? prints[Rp.print] : null;
    const mt = Mt(t), S = Sph(t);
    const rn = cfg.rinse, rinseW = Math.min(PBS.smooth((t - (rn.t0 - 0.3)) / 0.3), PBS.smooth((rn.t1 + 0.3 - t) / 0.3));
    const ra = t - rn.drop;
    const ringR = ra > 0 ? (ra / rn.grow) * 1500 : -1e4;
    const ringA = ra > 0 ? rn.amp * (1 - PBS.smooth((ra - 1.2) / 1.0)) : 0;
    const Bn = cfg.burn, burnP = PBS.ease((t - Bn.t0) / (Bn.t1 - Bn.t0));
    const burnFeather = PBS.lerp(Bn.featherStart, Bn.yZero - Bn.yFull, burnP), burnDens = Bn.density * PBS.smooth(burnP / 0.35);
    const warm = PBS.smooth(t / cfg.tone.warmBy);
    const hi = [0, 1, 2].map((i) => hiFrom[i] + (hiTo[i] - hiFrom[i]) * warm);
    buildTone(hi, 2 * avg(A.cent, t, 2) - 1);
    const sg = surge(t);
    const isLab = R.type === 'lab';
    const common = {
      uT: mt, uTr: t, uS: S, uWt: W2(t), uLow: at(A.low, t), uHigh: at(A.high, t), uRms: at(A.rms, t), uWtex: wTex, uNoise: noiseTex, uNW: NW,
      uMen: [R.t0, R.s0, R.v, R.a], uMen2: [R.bow, R.noiseAmp, R.seed, menVisible(R, t) ? 1 : 0], uMen3: [R.figFront, R.tau0, R.induction, R.wet], uMen4: [isLab ? 1 : 0, R.delay || 0, 0, 0],
      uFigTau: R.figTau, uDevAll: t > R.tDone ? 1 : -1,
      uRinse: [rn.wobble * rinseW, ringR, ringA, rn.deepen * rinseW],
      uSurge: sg, uSwashPhase: S * 1.35, uGrottoPhase: S * cfg.grotto.swashRate + 0.4, uOn: onsetInfo(t), uTone: toneTex,
    };
    G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    const prof = window.__prof ? [performance.now()] : null;
    if (Aold) gl.draw(progFor(Aold), { ...common, ...printU(Aold, t, true), uIsOld: 1, uDualPass: 1 }, fboA);
    if (prof) { sync(true); prof.push(performance.now()); }
    gl.draw(progFor(B), { ...common, ...printU(B, t, false), uIsOld: 0, uDualPass: Aold ? 1 : 0 }, fboB);
    if (prof) { sync(true); prof.push(performance.now()); }
    const sink = isLab ? PBS.smooth((t - R.t0) / (R.dur * 0.5)) : 0;
    const selB = selAmt(B, t), selA = Aold ? selAmt(Aold, t) : 0;
    gl.draw(compProg, {
      ...common, uFrame: frame, uDual: Aold ? 1 : 0, uBArch: B.archive ? 1 : 0, uSink: sink, uSelB: selB, uSelA: selA,
      uGrain: grainTex, uPB: fboB.tex, uPA: Aold ? fboA.tex : dummy, uGOff: [(frame * 389) % 1024, (frame * 683 + 211) % 1024],
      uBurn: [burnP, Bn.yFull, Bn.yZero, burnDens], uBurn2: [t * Bn.drift, Bn.edgeAmp, burnFeather, 1],
    });
    if (prof) { sync(false); prof.push(performance.now()); }
    // plata → espuma (y roca → arena): dos pases conmutativos
    for (const sh of shed) {
      const sc = sh.sc, P = prints[sc.print];
      if (P !== B || !sh.n || t < sc.t0 || t > sc.t1) continue;
      const [ox, oy, z] = camAt(P, t), c = P.c || [540, 960];
      G.useProgram(foamVS);
      const L = sh.loc;
      G.uniform1f(L.uT, t); G.uniform1f(L.uS, S); G.uniform4f(L.uGeo, ox, oy, P.scale, z); G.uniform4f(L.uGeo2, c[0], c[1], 0, 0);
      G.uniform4f(L.uBurn, burnP, Bn.yFull, burnFeather, burnDens); G.uniform1f(L.uHigh, at(A.high, t));
      G.uniform4f(L.uSh, sc.turnPx, sc.t1, sc.fadeEnd, 0); G.uniform1f(L.uPale, sc.pale);
      G.activeTexture(G.TEXTURE0); G.bindTexture(G.TEXTURE_2D, toneTex); G.uniform1i(L.uTone, 0);
      G.enable(G.BLEND);
      G.bindVertexArray(sh.vao);
      G.blendEquation(G.MIN); G.uniform1f(L.uPass, 0); G.drawArrays(G.POINTS, 0, sh.n);
      G.blendEquation(G.MAX); G.uniform1f(L.uPass, 1); G.drawArrays(G.POINTS, 0, sh.n);
      G.bindVertexArray(null);
      G.blendEquation(G.FUNC_ADD); G.disable(G.BLEND);
      G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    }
    if (prof) { sync(false); prof.push(performance.now()); }
    ctx.drawImage(gl.canvas, 0, 0);
    if (prof) { ctx.getImageData(0, 0, 1, 1); prof.push(performance.now()); window.__prof.last = prof.slice(1).map((v, i) => Math.round(v - prof[i])); }
    for (const n of notes) drawNote(ctx, n, t);
    PBS.drawClosing(ctx, t, { t0: cfg.closingAt, dark: true, logo, logoWidth: cfg.logo.width, y: cfg.closing.y, shadow: cfg.closing.shadow });
  }

  // avisos del cierre: se miden una vez en un lienzo aparte
  {
    const c = document.createElement('canvas'); c.width = cfg.width; c.height = cfg.height;
    const r = PBS.drawClosing(c.getContext('2d'), cfg.closingAt + 2, { t0: cfg.closingAt, dark: true, logo, logoWidth: cfg.logo.width, y: cfg.closing.y, shadow: cfg.closing.shadow });
    for (const w of r.warnings || []) warnings.push(w);
  }
  if (logo) warnings.push('Logo 441 px ampliado a 620: pedir versión vectorial o PNG grande');
  // precalentar cada programa (el primer dibujo de cada uno compila y enlaza de forma perezosa en SwiftShader)
  const warm = [...new Set(relays.map((R) => R.t0 + 0.4).concat(relays.map((R) => R.tBleached + 0.3)))].sort((a, b) => a - b);
  lg('antes de precalentar');
  for (const tw of warm) { render(Math.max(0, tw)); G.finish(); lg('precalentado ' + tw.toFixed(1)); }
  G.finish();
  // banco de pruebas de rendimiento (sólo depuración): tiempo de un pase de copia con el código modificado por `mod`
  const perfPass = (id, t, mod, n = 3) => {
    const P = prints[id]; let src = RV.printSource({ kind: P.kind, archive: !!P.archive, groups: P.groupIds }); if (mod) src = mod(src);
    const prog = gl.program(src);
    const R = relays.find((r) => r.print === id), rn = cfg.rinse;
    const common = { uT: Mt(t), uTr: t, uS: Sph(t), uWt: W2(t), uLow: at(A.low, t), uHigh: at(A.high, t), uRms: at(A.rms, t), uWtex: wTex, uNoise: noiseTex, uNW: NW, uMen: [R.t0, R.s0, R.v, R.a], uMen2: [R.bow, R.noiseAmp, R.seed, 0], uMen3: [0, 0.45, 0.03, 0], uMen4: [0, 0, 0, 0], uFigTau: 0.3, uDevAll: 1, uRinse: [0, -1e4, 0, 0], uSurge: 0, uSwashPhase: Sph(t) * 1.35, uGrottoPhase: 0.4, uOn: onsetInfo(t), uTone: toneTex, uIsOld: 0, uDualPass: 0 };
    const u = { ...common, ...printU(P, t, false) };
    G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    gl.draw(prog, u, fboB); sync(true);
    const a = performance.now(); for (let i = 0; i < n; i++) { gl.draw(prog, u, fboB); sync(true); } return (performance.now() - a) / n;
  };
  window.__rv = { perfPass, W, Sph, onsets, relays: relays.map((R) => ({ print: R.print, type: R.type, t0: R.t0, tLast: R.tLast, tBleached: R.tBleached, tDone: R.tDone, v: R.v })), shed: shed.map((s) => ({ print: s.sc.print, n: s.n, cand: s.cand })), prints, camAt, initMs: performance.now() - T0INIT, groups: Object.fromEntries(Object.entries(prints).map(([id, P]) => [id, Object.fromEntries(Object.entries(P.gdef).map(([g, d]) => [g, d.start]))])) };
  return { warnings, logo: !!logo, render };
};
