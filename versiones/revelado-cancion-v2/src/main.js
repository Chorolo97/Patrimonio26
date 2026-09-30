/* Revelado · canción entera — contrato: window.createReel(canvas, cfg) → Promise<{render(t), warnings, logo}>. render(t) es función pura de t. */
/* Carga con sustituto de desarrollo: si falta photos/v2/x o plates/x y cfg.devFallback está activo, usa la copia de desarrollo y lo avisa. */
(window.RV = window.RV || {}).loadAsset = async function (src, cfg, warnings) {
  try { return await PBS.loadImage(src); } catch (e) {
    const fb = cfg.devFallback; if (!fb || !fb.enabled) throw e;
    let alt = null;
    for (const [from, to] of fb.map) if (src.indexOf(from) >= 0) { alt = src.replace(from, to); break; }
    if (!alt) throw e;
    const im = await PBS.loadImage(alt);
    if (warnings) warnings.push('SUSTITUTO DE DESARROLLO: ' + alt);
    return im;
  }
};
window.createReel = async function (canvas, cfg) {
  const warnings = [];
  const RV = window.RV;
  const T0INIT = performance.now();
  const lg = (s) => { if (/log/.test(location.search)) console.log('LOG ' + s + ' @' + ((performance.now() - T0INIT) / 1000).toFixed(1)); };
  await PBS.loadFonts(cfg.assets + 'fonts/', warnings);
  const audio = await PBS.loadAudioFeatures(cfg.featuresUrl);
  const silverFragment = await window.createSilverFragment(cfg);
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
  const onlyKey = (location.search.match(/maskonly=(\w+)/) || [])[1];
  const photoKeys = onlyKey ? [onlyKey] : Object.keys(cfg.photos);
  for (const key of photoKeys) {
    let img = null;
    const psrc = cfg.photos[key].indexOf('plates/') === 0 ? cfg.photos[key] : cfg.assets + cfg.photos[key];   // placas propias (SPEC §9): dentro de la carpeta de la versión
    try { img = await RV.loadAsset(psrc, cfg, warnings); } catch (e) { warnings.push('FALTA FOTO ' + cfg.photos[key]); }
    let mimg = null;
    if (cfg.photoSpec[key].maskFile) { try { mimg = await RV.loadAsset(cfg.photoSpec[key].maskFile, cfg, warnings); } catch (e) { warnings.push('FALTA MÁSCARA ' + cfg.photoSpec[key].maskFile); } }
    lg('foto ' + key + ' cargada');
    mat[key] = RV.processPhoto(img, key, cfg, mimg);
    lg('foto ' + key + ' procesada');
    if (/dbg/.test(location.search)) { // superposición de máscaras y rejilla en px de foto (sólo depuración)
      const M = mat[key], s = Math.max(1, M.tw / 1100), W2c = Math.floor(M.tw / s), H2c = Math.floor(M.th / s), c = document.createElement('canvas'); c.width = W2c; c.height = H2c;
      const g = c.getContext('2d'), id = g.createImageData(W2c, H2c);
      for (let y = 0; y < H2c; y++) for (let x = 0; x < W2c; x++) {
        const i = Math.floor(y * s) * M.tw + Math.floor(x * s), k = (y * W2c + x) * 4, L = M.photo.data[i * 4] * 0.6, wa = M.water[i] / 255, ro = M.rock[i] / 255, sa = M.sand[i] / 255, sk = M.sky[i] / 255;
        id.data[k] = L + 120 * ro + 90 * sa; id.data[k + 1] = L + 90 * sa + 70 * sk; id.data[k + 2] = L + 130 * wa + 110 * sk; id.data[k + 3] = 255;
      }
      g.putImageData(id, 0, 0);
      const sp = cfg.photoSpec[key], f = W2c / sp.w;
      g.font = '12px sans-serif'; g.lineWidth = 1;
      for (let x = 0; x < sp.w; x += 100) { g.strokeStyle = x % 500 ? 'rgba(255,255,0,.25)' : 'rgba(255,255,0,.7)'; g.beginPath(); g.moveTo(x * f, 0); g.lineTo(x * f, H2c); g.stroke(); g.fillStyle = '#ff0'; g.fillText(x, x * f + 2, 11); }
      for (let y = 0; y < sp.h; y += 100) { g.strokeStyle = y % 500 ? 'rgba(255,255,0,.25)' : 'rgba(255,255,0,.7)'; g.beginPath(); g.moveTo(0, y * f); g.lineTo(W2c, y * f); g.stroke(); g.fillStyle = '#ff0'; g.fillText(y, 2, y * f + 11); }
      (window.__rvDbg = window.__rvDbg || {})[key] = c.toDataURL('image/png');
    }
  }
  const only = /maskonly/.test(location.search);
  if (only) return { warnings, logo: false, render() {} };

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
  const fboFA = gl.target(cfg.width, cfg.height, { float: true }), fboFB = gl.target(cfg.width, cfg.height, { float: true });
  const fboFront = gl.target(cfg.width / 2, cfg.height / 2, { float: true });
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
    const liveIds = new Set((cfg.live || []).map((l) => l.id));
    const kind = pc.photo, figs = cfg.figures.filter((f) => f.print === pc.id && !liveIds.has(f.id));
    const gdef = (cfg.groups && cfg.groups[pc.id]) || {};
    const list = figs.map((f) => {
      const ys = (f.foot[1] - pc.cam[0][2]) * pc.scale, depth = PBS.clamp((FL.yNear - ys) / (FL.yNear - FL.yFar), 0, 1);
      const L = f.pose === 'sail' ? FL.sailL : PBS.lerp(FL.Lnear, FL.Lfar, depth);
      const soft = (f.pose === 'sail' ? FL.sailSoft : PBS.lerp(FL.softNear, FL.softFar, depth)) / pc.scale;
      return { ...f, unit: unitOf(f, kind), L, soft };
    });
    const atl = RV.buildFigureAtlas(list, cfg.light[pc.photo], pc.atlasS || 2);
    const P = { ...pc, figs: list, gdef, hasB: list.some((f) => f.group), groupIds: [...new Set(list.filter((f) => f.group).map((f) => f.group))].sort() };
    // figuras vivas (src/vida.js): se dibujan por cuadro en un lienzo crudo y la GPU las convierte al formato del atlas
    P.live = (cfg.live || []).filter((l) => l.print === pc.id).map((l) => {
      const unit = l.unit != null ? l.unit : l.sizeRule ? unitOf({ foot: l.anchor, sizeY: l.sizeY, size: l.kind === 'child' ? 'child' : 'adult' }, kind) : (l.h != null ? l.h / 100 : 1) * (l.kind === 'child' ? SR.child : 1);
      const ys = (l.anchor[1] - pc.cam[0][2]) * pc.scale, depth = PBS.clamp((FL.yNear - ys) / (FL.yNear - FL.yFar), 0, 1);
      const L = l.L != null ? l.L : PBS.lerp(FL.Lnear, FL.Lfar, depth);
      const soft = (l.soft != null ? l.soft : PBS.lerp(FL.softNear, FL.softFar, depth)) / pc.scale;
      const S = l.S || Math.max(0.9, Math.min(2.6, pc.scale * 0.92)), bu = l.box || [-34, -10, 44, 118], um = l.boxUnit || unit;
      const fa = l.facing || 1, bx0 = fa > 0 ? bu[0] : -bu[2], bx1 = fa > 0 ? bu[2] : -bu[0];
      // la caja incluye la sombra proyectada (hacia +x y hacia abajo en la foto, según la luz de la copia)
      const Lt = cfg.light[pc.photo] || cfg.light[pc.id] || { kx: 0.4, ky: 0.1 }, shd = l.script === 'person' || l.script === 'seated' ? 118 : 0;
      const box = [Math.floor(l.anchor[0] + Math.min(bx0 * um, bx0 * um + Math.min(0, Lt.kx) * shd * um)), Math.floor(l.anchor[1] - bu[3] * um), 0, 0];
      box[2] = Math.ceil(l.anchor[0] + bx1 * um + Math.max(0, Lt.kx) * shd * um) - box[0]; box[3] = Math.ceil(l.anchor[1] - bu[1] * um + Math.max(0, Lt.ky) * shd * um) - box[1];
      const W = Math.ceil(box[2] * S), H = Math.ceil(box[3] * S);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const tx = G.createTexture();
      G.bindTexture(G.TEXTURE_2D, tx);
      G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR_MIPMAP_LINEAR); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR);
      G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE);
      return { ...l, unit, L, soft, S, fa, box, W, H, c, g: c.getContext('2d', { willReadFrequently: true }), raw: tx, fbo: gl.target(W, H), light: cfg.light[pc.photo] || cfg.light[pc.id] || { kx: 0.4, ky: 0.1, rim: [1.2, 1.0] }, tDone: null };
    });
    P.figA = atl.A ? gl.texture(atl.A) : dummy; P.boxA = atl.boxA || [-1e5, -1e5, 1, 1];
    P.figB = atl.B ? gl.texture(atl.B) : dummy; P.boxB = atl.boxB || [-1e5, -1e5, 1, 1];
    P.gbox = [1, 2, 3, 4].map((g) => atl.groups[g] || [1e5, 1e5, -1e5, -1e5]);
    P.fx = pc.fx || {};
    prints[pc.id] = P;
  }
  const progs = {};
  const rinsePrints = new Set(cfg.rinse.prints || []);
  // variantes de programa: sólo se compila el código que hace falta (con frente / sin frente, con enjuague, con quemado), porque el código muerto también cuesta
  const progFor = (P, front) => { const key = P.id + (front ? '+F' : ''); return progs[key] || (progs[key] = gl.program(RV.printSource({ kind: P.kind, archive: !!P.archive, front, rinse: rinsePrints.has(P.id) }))); };
  const figProgs = {};
  const figProgFor = (P, front) => { const rinse = rinsePrints.has(P.id), key = (front ? 'F' : 'f') + (rinse ? 'R' : 'r'); return figProgs[key] || (figProgs[key] = gl.program(RV.figSource({ front, rinse }))); };
  let frontProg = null;
  const compProgs = {};
  const compFor = (front, dual, burn) => { const key = (front ? 'F' : 'f') + (dual ? 'D' : 'd') + (burn ? 'B' : 'b'); return compProgs[key] || (compProgs[key] = gl.program(RV.compositeSource({ front, dual, burn }))); };
  lg('atlas listos');

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
    R.nmax = nmax;
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
    const wrap = (text, font, maxW) => { g.font = font; const out = []; for (const part of text.split('\n')) { const words = part.split(' '); let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width <= maxW || !cur) cur = t; else { out.push(cur); cur = w; } } if (cur) out.push(cur); } return out; };
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
        g.fillText(L.t, 500, y);
        y += L.size * 0.18;
      }
    }
    const nr = PBS.rng(cfg.seed + 700 + Math.round(a.t0 * 10)), noise = new Uint8Array(cfg.width * c.height);
    // ruido de nucleación con grumos (blanco + una pasada de suavizado): las letras se «revelan» por granos
    for (let i = 0; i < noise.length; i++) noise[i] = (nr() * 255) | 0;
    return { a, c, g, noise, yTop: a.y, textH: y - 40 + 30, cache: null };
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
  const Z4 = [0, 0, 0, 0];
  const parFor = (P, t) => {
    const f = P.fx;
    switch (P.id) {
      case 'aerea': return [[f.flow || 5, 0, 0, 0], Z4, Z4];
      case 'canal': return [[f.swash || 26, 0, 0, 0], Z4, Z4];
      case 'relieve': return [[PBS.lerp(f.alba.y0, f.alba.y1, PBS.ease(lin(t, f.alba.t0, f.alba.t1))), f.alba.gain, 0, 0], Z4, Z4];
      case 'rompiente': return [[PBS.smooth(lin(t, f.grow.t0, f.grow.t0 + f.grow.dur)), PBS.smooth(lin(t, f.shade.t0, f.shade.t0 + f.shade.dur)), 0, 0], Z4, Z4];
      case 'gruta': return [[f.pop, 0, 0, 0], Z4, Z4];
      case 'carape': return [[f.pop ? f.pop.amp : 0, f.pop ? f.pop.t0 : 0, f.pop ? f.pop.t1 : 0, 0], Z4, Z4];
      case 'estratos': return [[PBS.lerp(f.fog.y0, f.fog.y1, PBS.ease(lin(t, f.fog.t0, f.fog.t1))), f.fog.density * PBS.smooth(lin(t, f.fog.t0, f.fog.t0 + 1.5)), 0, 0], Z4, Z4];
      case 'playa': return [f.tufts[0], f.tufts[1], [f.erode ? PBS.smooth(lin(t, f.erode.t0, f.erode.t1)) * f.erode.max : 0, 0, 0, 0]];
      default: return [Z4, Z4, Z4];
    }
  };

  // cámara viva (src/vida.js, C.motion): paralaje entre planos y barridos de luz, lentos y deterministas
  const MO = cfg.motion || {};
  const plxAt = (P, t) => {
    const m = MO[P.id]; if (!m || !m.plx) return [0, 0, 0, 1];
    const [t0, t1, dx, dy, y0, y1] = m.plx, u = PBS.ease(PBS.clamp((t - t0) / (t1 - t0), 0, 1));
    return [dx * u, dy * u, y0, y1];
  };
  const sweepAt = (P, t) => {
    const m = MO[P.id]; if (!m || !m.sweep) return [0, 0, 1, 0];
    for (const [t0, t1, deg, w, gain] of m.sweep) if (t > t0 && t < t1) {
      const a = deg * Math.PI / 180, u = (t - t0) / (t1 - t0), c = Math.cos(a), s = Math.sin(a);
      const ext = [[0, 0], [1080, 0], [0, 1920], [1080, 1920]].map(([x, y]) => x * c + y * s);
      const lo = Math.min(...ext) - 2 * w, hi = Math.max(...ext) + 2 * w;
      return [PBS.lerp(lo, hi, u), a, w, gain * Math.sin(Math.PI * u) ** 0.5];
    }
    return [0, 0, 1, 0];
  };
  const printU = (P, t, isOld) => {
    const [ox, oy, z] = camAt(P, t), ms = mat[P.photo], c = P.c || [540, 960];
    const [par, par2, par3] = parFor(P, t);
    return { uPhoto: tex[P.photo].photo, uMask: tex[P.photo].mask, geo: [ox, oy, P.scale, z], geo2: [c[0], c[1], ms.w, ms.h], par, par2, par3, uPlx: plxAt(P, t), uSweep: sweepAt(P, t) };
  };
  // caja de fotos → rectángulo de pantalla (tijera) para el pase de figuras
  const screenRect = (P, t, box) => {
    const [ox, oy, z] = camAt(P, t), c = P.c || [540, 960];
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [qx, qy] of [[box[0], box[1]], [box[2], box[1]], [box[0], box[3]], [box[2], box[3]]]) {
      const px = ((qx - ox) * P.scale - c[0]) * z + c[0], py = ((qy - oy) * P.scale - c[1]) * z + c[1];
      x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
    }
    x0 = Math.max(0, Math.floor(x0 - 26)); y0 = Math.max(0, Math.floor(y0 - 26)); x1 = Math.min(cfg.width, Math.ceil(x1 + 26)); y1 = Math.min(cfg.height, Math.ceil(y1 + 26));
    return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
  };
  // ---------- figuras vivas: estado → lienzo crudo → atlas en GPU ----------
  let liveProg = null;
  const groupTravel = (P, g, t) => { const G0 = P.gdef[g]; if (!G0 || !G0.tab) return 0; const f = PBS.clamp(t * FPS, 0, N), i = Math.floor(f), u = f - i; return (G0.tab[i] * (1 - u) + G0.tab[i + 1] * u) * Math.hypot(G0.vel[0], G0.vel[1]); };
  const liveEnv = (P, t) => ({
    t, P, low: at(A.low, t), lowAvg: avg(A.low, t, 1), rms: at(A.rms, t), voice: at(A.voice, t), surge: surge(t), onsets,
    dev: (g) => devGroup(P, g, t), travel: (g, tt = t) => groupTravel(P, g, tt), gOff: (g, tt = t) => groupOffset(P, g, tt), cam: camAt(P, t),
  });
  const liveUpdate = (lv, t) => {
    if (lv.tDone === t) return lv.st;
    const P = lv._P, env = liveEnv(P, t);
    const st = cfg.liveScript[lv.script](lv, t, env, RV);
    lv.st = st; lv.tDone = t;
    if (!st || st.hide) return st;
    const g = lv.g, S = lv.S;
    const LP = window.__lprof, q0 = LP ? performance.now() : 0;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, lv.W, lv.H);
    g.globalCompositeOperation = 'lighten';
    const fx = (lv.anchor[0] - lv.box[0]) * S, fy = (lv.anchor[1] - lv.box[1]) * S;
    const s = (st.unit || lv.unit) * S, fa = lv.fa;
    // sombra (G): proyectada con la luz de la copia, contacto con el suelo; o el reflejo si st.shadow lo dibuja
    g.save();
    if (st.shadow) { g.setTransform(fa * s, 0, 0, -s, fx, fy); st.shadow(g, 'rgb(0,255,0)'); }
    else if (st.draw && !st.noShadow) {
      const Lt = lv.light, hgt = 100 * s;
      const gr = g.createLinearGradient(fx, fy, fx + Lt.kx * hgt, fy + Lt.ky * hgt);
      gr.addColorStop(0, 'rgb(0,108,0)'); gr.addColorStop(0.35, 'rgb(0,67,0)'); gr.addColorStop(1, 'rgb(0,24,0)');
      g.fillStyle = gr; g.setTransform(fa * s, 0, Lt.kx * s, Lt.ky * s, fx, fy); st.draw(g, false);
      const ct = st.contact || [-9, 12], cx0 = ct[0] * fa, cx1 = ct[1] * fa, cxm = (cx0 + cx1) / 2, hw = Math.abs(cx1 - cx0) * 0.5;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.fillStyle = 'rgb(0,128,0)'; g.beginPath(); g.ellipse(fx + cxm * s, fy + 0.3 * s, hw * s * 0.85, Math.max(1.2 * S, 1.5 * s), 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgb(0,42,0)'; g.beginPath(); g.ellipse(fx + cxm * s, fy + 0.6 * s, hw * s * 1.4, Math.max(1.8 * S, 2.2 * s), 0, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    // figura (R) y paño claro (B)
    g.save(); g.setTransform(fa * s, 0, 0, -s, fx, fy); g.fillStyle = '#f00'; if (st.draw) st.draw(g, true); g.restore();
    if (LP) { g.getImageData(0, 0, 1, 1); LP.draw = (LP.draw || 0) + performance.now() - q0; }
    const q1 = LP ? performance.now() : 0;
    G.bindTexture(G.TEXTURE_2D, lv.raw);
    G.pixelStorei(G.UNPACK_FLIP_Y_WEBGL, true);
    G.texImage2D(G.TEXTURE_2D, 0, G.RGBA, G.RGBA, G.UNSIGNED_BYTE, lv.c);
    G.pixelStorei(G.UNPACK_FLIP_Y_WEBGL, false);
    if (LP) { G.finish(); LP.up = (LP.up || 0) + performance.now() - q1; }
    const q2 = LP ? performance.now() : 0;
    G.generateMipmap(G.TEXTURE_2D);
    if (LP) { G.finish(); LP.mip = (LP.mip || 0) + performance.now() - q2; LP.px = (LP.px || 0) + lv.W * lv.H; }
    liveProg = liveProg || gl.program(RV.liveAtlasSource());
    const rl = Math.hypot(lv.light.rim[0], lv.light.rim[1]) || 1, u = st.unit || lv.unit;
    const dsh = 5.5 * s * (st.rimK || 1);
    G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    gl.draw(liveProg, { uRaw: lv.raw, uPx: [1 / lv.W, 1 / lv.H], uSoft: Math.max(0.5, (st.soft || lv.soft) * S), uLitR: 1.6 * s, uCoreR: 4.5 * s * (st.coreK || 1), uShR: st.shR || (1.2 * S + 0.012 * 100 * s),
      uRim: [lv.light.rim[0] / rl * dsh * fa, -lv.light.rim[1] / rl * dsh], uLv: PBS.clamp((st.L || lv.L) / 0.8, 0, 1), uSailLv: PBS.clamp((st.sailL || lv.sailL || lv.L) / 0.8, 0, 1) }, lv.fbo);
    return st;
  };

  // pase de figuras: un dibujo por grupo, recortado a su recuadro; devuelve si hay algo dibujado
  const figPass = (P, t, isOld, common, dualPass, front) => {
    const sets = [];
    const lq0 = window.__prof ? (G.finish(), performance.now()) : 0;
    for (const lv of P.live) {
      lv._P = P;
      const st = liveUpdate(lv, t);
      if (!st || st.hide) continue;
      const g0 = lv.group || 0, off = st.off || [0, 0];
      const go = g0 ? groupOffset(P, g0, t) : [0, 0];
      let devG = st.devG != null ? st.devG : (g0 ? (isOld ? 1 : devGroup(P, g0, t)) : 1);
      if (g0 && devG <= 0.0005) continue;
      const b = lv.box, gb = [b[0], b[1], b[0] + b[2], b[1] + b[3]], o2 = [go[0] + off[0], go[1] + off[1]];
      sets.push({ grp: g0 || st.devG != null ? 1 : 0, tex: lv.fbo.tex, box: b, gb, go: o2, devG, cw: lv.coreW != null ? lv.coreW : 0.78, seed: 31 + (lv.seed || 0), live: 1, foot: lv.anchor[1] + o2[1] + (st.footDy || 0), rect: [gb[0] + o2[0], gb[1] + o2[1], gb[2] + o2[0], gb[3] + o2[1]] });
    }
    if (P.boxA[0] > -1e4) sets.push({ grp: 0, tex: P.figA, box: P.boxA, gb: [0, 0, 0, 0], go: [0, 0], devG: 1, cw: 0.82, seed: 17, rect: [P.boxA[0], P.boxA[1], P.boxA[0] + P.boxA[2], P.boxA[1] + P.boxA[3]] });
    for (const g of P.groupIds) {
      const gb = P.gbox[g - 1], go = groupOffset(P, g, t), devG = isOld ? 1 : devGroup(P, g, t);
      if (devG <= 0.0005) continue;
      sets.push({ grp: g, tex: P.figB, box: P.boxB, gb, go, devG, cw: P.gdef[g] && P.gdef[g].coreW != null ? P.gdef[g].coreW : 0.72, seed: 29, rect: [gb[0] + go[0], gb[1] + go[1], gb[2] + go[0], gb[3] + go[1]] });
    }
    if (window.__prof) { G.finish(); window.__prof.live = (window.__prof.live || 0) + performance.now() - lq0; }
    if (!sets.length) return null;
    const fbo = isOld ? fboFA : fboFB;
    const rects = [];
    G.bindFramebuffer(G.FRAMEBUFFER, fbo.fb); G.disable(G.SCISSOR_TEST); G.clearColor(0, 0, 0, 0); G.clear(G.COLOR_BUFFER_BIT);
    G.enable(G.BLEND); G.blendEquation(G.MAX); G.blendFunc(G.ONE, G.ONE); G.enable(G.SCISSOR_TEST);
    const cam = printU(P, t, isOld);
    const fq0 = window.__prof ? (G.finish(), performance.now()) : 0;
    for (const s of sets) {
      const r = screenRect(P, t, s.rect); if (!r) continue;
      if (window.__prof) { G.finish(); (window.__prof.sets = window.__prof.sets || []).push(r[2] + 'x' + r[3]); }
      rects.push([r[0], r[1], r[0] + r[2], r[1] + r[3]]);
      G.scissor(r[0], cfg.height - r[1] - r[3], r[2], r[3]);
      gl.draw(figProgFor(P, front), { ...common, geo: cam.geo, geo2: cam.geo2, uFig: s.tex, uBox: s.box, uGb: s.gb, uGo: [s.go[0], s.go[1], 0, 0], uDevG: s.devG, uCW: s.cw, uSeed: s.seed, uGrpSet: s.grp ? 1 : 0, uIsOld: isOld ? 1 : 0, uDualPass: dualPass, uLS: s.live ? 0.8 : 0.4, uPlx: cam.uPlx, uPlxFoot: s.foot || 0 }, fbo);
    }
    if (window.__prof) { G.finish(); window.__prof.fig = (window.__prof.fig || 0) + performance.now() - fq0; }
    G.disable(G.SCISSOR_TEST); G.disable(G.BLEND); G.blendEquation(G.FUNC_ADD);
    return rects.length ? [rects.reduce((u, r) => [Math.min(u[0], r[0]), Math.min(u[1], r[1]), Math.max(u[2], r[2]), Math.max(u[3], r[3])])] : null;
  };

  const rectU = (pre, rs) => Object.fromEntries([0, 1, 2, 3, 4].map((i) => [pre + i, rs && rs[i] ? rs[i] : [0, 0, 0, 0]]));
  const syncBuf = new Float32Array(4), syncB8 = new Uint8Array(4);
  const sync = (fl) => { if (fl) G.readPixels(0, 0, 1, 1, G.RGBA, G.FLOAT, syncBuf); else { G.bindFramebuffer(G.FRAMEBUFFER, null); G.readPixels(0, 0, 1, 1, G.RGBA, G.UNSIGNED_BYTE, syncB8); } };
  // quemado local bajo la anotación vigente: sube y baja con la anotación
  const noteBurn = (t) => {
    const S = cfg.noteStyle;
    for (const n of notes) {
      const a = n.a; if (t < a.t0 - 0.05 || t > a.t1 + 0.05) continue;
      const k = PBS.smooth((t - a.t0) / S.reveal) * (1 - PBS.smooth((t - (a.t1 - S.fadeOut)) / S.fadeOut));
      return [n.yTop - 30, n.yTop + n.textH + 10, (a.burn != null ? a.burn : S.burn) * k, S.burnFeather];
    }
    return [0, 0, 0, 1];
  };
  const noteCfg = cfg.noteStyle;
  // durante un relevo con frente, cada pase de copia sólo necesita su lado del frente: se acota con tijera (la mitad del cuadro en promedio)
  const relayRect = (R, t, old) => {
    const s = R.s0 + R.v * (t - R.t0), m = R.nmax + 100, c = old ? s - m : s + m, d0 = R.d[0], d1 = R.d[1];
    const poly = [[0, 0], [1080, 0], [1080, 1920], [0, 1920]], out = [];
    const f = (p) => ((p[0] - 540) * d0 + (p[1] - 1920) * d1 - c) * (old ? 1 : -1);   // >= 0: dentro
    for (let i = 0; i < 4; i++) {
      const a = poly[i], b = poly[(i + 1) % 4], fa = f(a), fb = f(b);
      if (fa >= 0) out.push(a);
      if ((fa >= 0) !== (fb >= 0)) { const u = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
    }
    if (!out.length) return null;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of out) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    x0 = Math.max(0, Math.floor(x0) - 2); y0 = Math.max(0, Math.floor(y0) - 2); x1 = Math.min(1080, Math.ceil(x1) + 2); y1 = Math.min(1920, Math.ceil(y1) + 2);
    return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
  };
  const withRect = (r, fn) => { if (r) { G.enable(G.SCISSOR_TEST); G.scissor(r[0], cfg.height - r[1] - r[3], r[2], r[3]); } fn(); if (r) G.disable(G.SCISSOR_TEST); };
  // plan de un cuadro: relevo vigente, copia nueva y (durante el relevo) la vieja, y qué variantes de programa hacen falta
  const planAt = (t) => {
    let k = 0; for (let i = 0; i < relays.length; i++) if (t >= relays[i].t0) k = i;
    const R = relays[k], Rp = k > 0 ? relays[k - 1] : null;
    const B = prints[R.print], Aold = Rp && t < R.tBleached ? prints[Rp.print] : null;
    const front = t <= R.tDone, burn = t >= cfg.burn.t0 - 0.05;
    return { R, B, Aold, front, burn, key: [B.id, front ? 1 : 0, Aold ? Aold.id : '-', burn ? 1 : 0].join('|') };
  };
  function render(t) {
    const frame = Math.round(t * FPS);
    const { R, B, Aold, front, burn } = planAt(t);
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
      uT: mt, uTr: t, uS: S, uWt: W2(t), uLow: Math.min(1.25, (cfg.lowGain || 1) * at(A.low, t) + (cfg.surgeLow || 0) * sg), uHigh: at(A.high, t), uRms: at(A.rms, t), uWtex: wTex, uNoise: noiseTex, uNW: NW,
      uMen: [R.t0, R.s0, R.v, R.a], uMen2: [R.bow, R.noiseAmp, R.seed, menVisible(R, t) ? 1 : 0], uMen3: [R.figFront, R.tau0, R.induction, R.wet], uMen4: [isLab ? 1 : 0, R.delay || 0, 0, 0],
      uFigTau: R.figTau, uDevAll: front ? -1 : 1,
      uRinse: [rn.wobble * rinseW, ringR, ringA, rn.deepen * rinseW],
      uSurge: sg, uSwashPhase: S * 1.35, uGrottoPhase: S * cfg.grotto.swashRate + 0.4, uOn: onsetInfo(t), uTone: toneTex,
    };
    G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    const prof = window.__prof ? [performance.now()] : null;
    if (front) { frontProg = frontProg || gl.program(RV.frontSource()); gl.draw(frontProg, common, fboFront); common.uFront = fboFront.tex; }
    let hasFA = null;
    const sc = Aold && menVisible(R, t) && R.type === 'menisco';
    if (Aold) { withRect(sc ? relayRect(R, t, true) : null, () => gl.draw(progFor(Aold, true), { ...common, ...printU(Aold, t, true), uIsOld: 1, uDualPass: 1 }, fboA)); hasFA = figPass(Aold, t, true, common, 1, true); }
    if (prof) { sync(true); prof.push(performance.now()); }
    withRect(sc ? relayRect(R, t, false) : null, () => gl.draw(progFor(B, front), { ...common, ...printU(B, t, false), uIsOld: 0, uDualPass: Aold ? 1 : 0 }, fboB));
    const hasFB = figPass(B, t, false, common, Aold ? 1 : 0, front);
    if (prof) { sync(true); prof.push(performance.now()); }
    const sink = isLab ? PBS.smooth((t - R.t0) / (R.dur * 0.5)) : 0;
    const selB = selAmt(B, t), selA = Aold ? selAmt(Aold, t) : 0;
    gl.draw(compFor(front, !!Aold, burn), {
      ...common, uFrame: frame, uDual: Aold ? 1 : 0, uBArch: B.archive ? 1 : 0, uSink: sink, uSelB: selB, uSelA: selA,
      uGrain: grainTex, uPB: fboB.tex, uPA: Aold ? fboA.tex : dummy, uFB: fboFB.tex, uFA: fboFA.tex, uHasFA: hasFA ? 1 : 0, uHasFB: hasFB ? 1 : 0, ...rectU('uRA', hasFA), ...rectU('uRB', hasFB), uGOff: [(frame * 389) % 1024, (frame * 683 + 211) % 1024],
      uBurn: [burnP, Bn.yFull, Bn.yZero, burnDens], uBurn2: [t * Bn.drift, Bn.edgeAmp, burnFeather, 1], uNote: noteBurn(t),
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
    silverFragment(ctx,t);
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
  if (logo && logo.naturalWidth < cfg.logo.width) warnings.push('Logo fuente de ' + logo.naturalWidth + ' px mostrado a ' + cfg.logo.width + ' px.');
  // precalentar cada variante de programa que se usa en algún cuadro (el primer dibujo de cada una compila y enlaza de forma perezosa en SwiftShader)
  lg('antes de precalentar');
  {
    const seen = new Set(), warm = [];
    for (let k = 0; k < N; k++) { const t = k / FPS, p = planAt(t); if (!seen.has(p.key)) { seen.add(p.key); warm.push(t); } }
    for (const tw of warm) { render(tw); G.finish(); }
    lg('precalentado: ' + warm.length + ' variantes');
  }
  // banco de pruebas de rendimiento (sólo depuración): tiempo de un pase de copia con el código modificado por `mod`
  const perfPass = (id, t, mod, n = 3) => {
    const P = prints[id]; let src = RV.printSource({ kind: P.kind, archive: !!P.archive, front: !!(window.__perfFront), rinse: false }); if (mod) src = mod(src);
    const prog = gl.program(src);
    const R = relays.find((r) => r.print === id), rn = cfg.rinse;
    const common = { uT: Mt(t), uTr: t, uS: Sph(t), uWt: W2(t), uLow: at(A.low, t), uHigh: at(A.high, t), uRms: at(A.rms, t), uWtex: wTex, uNoise: noiseTex, uNW: NW, uMen: [R.t0, R.s0, R.v, R.a], uMen2: [R.bow, R.noiseAmp, R.seed, 0], uMen3: [0, 0.45, 0.03, 0], uMen4: [0, 0, 0, 0], uFigTau: 0.3, uDevAll: 1, uRinse: [0, -1e4, 0, 0], uSurge: 0, uSwashPhase: Sph(t) * 1.35, uGrottoPhase: 0.4, uOn: onsetInfo(t), uTone: toneTex, uIsOld: 0, uDualPass: 0 };
    const u = { ...common, ...printU(P, t, false) };
    G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    gl.draw(prog, u, fboB); sync(true);
    const a = performance.now(); for (let i = 0; i < n; i++) { gl.draw(prog, u, fboB); sync(true); } return (performance.now() - a) / n;
  };
  const perfComp = (t, mod, n = 3) => {
    let src = RV.compositeSource({ front: !!window.__perfFront, dual: !!window.__perfDual, burn: false }); if (mod) src = mod(src);
    const prog = gl.program(src);
    render(t);
    const R = relays[relays.length - 1];
    const u = { uT: Mt(t), uTr: t, uS: Sph(t), uWt: W2(t), uRms: at(A.rms, t), uWtex: wTex, uNoise: noiseTex, uNW: NW, uMen: [R.t0, R.s0, R.v, R.a], uMen2: [R.bow, R.noiseAmp, R.seed, window.__perfDual ? 1 : 0], uMen3: [0, 0.45, 0.03, 0], uMen4: [0, 0, 0, 0], uFigTau: 0.3, uDevAll: window.__perfDual ? -1 : 1, uFront: fboFront.tex, ...rectU('uRA', [[0, 0, 1, 1]]), ...rectU('uRB', [[0, 0, 1, 1]]), uRinse: [0, -1e4, 0, 0], uTone: toneTex, uFrame: 5, uDual: 0, uBArch: 0, uSink: 0, uSelB: 0, uSelA: 0, uGrain: grainTex, uPB: fboB.tex, uPA: fboA.tex, uFB: fboFB.tex, uFA: fboFA.tex, uHasFA: 0, uHasFB: 0, uGOff: [0, 0], uBurn: [0, 870, 1010, 1.2], uBurn2: [0, 25, 560, 1] };
    G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    gl.draw(prog, u, null); sync(false);
    const a = performance.now(); for (let i = 0; i < n; i++) { gl.draw(prog, u, null); sync(false); } return (performance.now() - a) / n;
  };
  window.__rv = { perfComp, perfPass, W, Sph, onsets, relays: relays.map((R) => ({ print: R.print, type: R.type, t0: R.t0, tLast: R.tLast, tBleached: R.tBleached, tDone: R.tDone, v: R.v })), shed: shed.map((s) => ({ print: s.sc.print, n: s.n, cand: s.cand })), prints, camAt, initMs: performance.now() - T0INIT, groups: Object.fromEntries(Object.entries(prints).map(([id, P]) => [id, Object.fromEntries(Object.entries(P.gdef).map(([g, d]) => [g, d.start]))])) };
  return { warnings, logo: !!logo, render };
};
