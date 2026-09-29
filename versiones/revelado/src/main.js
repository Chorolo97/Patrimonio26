/* Revelado — contrato: window.createReel(canvas, cfg) → Promise<{render(t), warnings, logo}>. render(t) es función pura de t. */
window.createReel = async function (canvas, cfg) {
  const warnings = [];
  const RV = window.RV;
  await PBS.loadFonts(cfg.assets + 'fonts/', warnings);
  const audio = await PBS.loadAudioFeatures(cfg.featuresUrl);
  if (audio.missing) warnings.push('Sin rasgos de audio: se usan valores constantes.');
  let logo = null;
  try { logo = await PBS.loadImage(cfg.assets + cfg.logo.file); } catch (e) { warnings.push('FALTA EL LOGO'); }

  // ---------- audio → relojes precalculados ----------
  const N = 1200, FPS = 30;
  const arr = (k, def) => (audio.missing || !audio[k] ? new Array(N).fill(def) : audio[k]);
  const A = { voice: arr('voiceSmooth', 0.45), low: arr('lowSmooth', 0.35), high: arr('highSmooth', 0.4), rms: arr('rmsSmooth', 0.5), cent: arr('centroidSmooth', 0.5), flux: arr('flux', 0) };
  const at = (a, t) => { const f = PBS.clamp(t * FPS, 0, N - 1), i = Math.floor(f), u = f - i; return a[i] * (1 - u) + a[Math.min(N - 1, i + 1)] * u; };
  const avg = (a, t, span) => { let s = 0, n = 0; for (let k = -span / 2; k <= span / 2 + 1e-6; k += 1 / FPS) { s += at(a, t + k); n++; } return s / n; };
  const dv = cfg.development, [g0, g1] = dv.gate;
  const gate = (t) => 1 - (1 - dv.gateFloor) * Math.min(PBS.smooth((t - (g0 - dv.ramp)) / dv.ramp), PBS.smooth((g1 + dv.ramp - t) / dv.ramp));
  const slow = (t) => 1 - 0.6 * PBS.smooth((t - 38.5) / 1.0); // desde 38,5 s el movimiento baja al 40 %
  // W2: el mismo reloj con piso 0,5 en la respiración, para que la gruta no quede en papel mientras el frente la cruza
  const gate2 = (t) => 1 - (1 - dv.gateFloorDev) * (1 - gate(t)) / (1 - dv.gateFloor);
  const Wk = new Float64Array(N + 1), Sk = new Float64Array(N + 1), Mk = new Float64Array(N + 1), W2k = new Float64Array(N + 1);
  for (let k = 0; k < N; k++) {
    const t = k / FPS;
    Wk[k + 1] = Wk[k] + gate(t) * (0.25 + 0.75 * A.voice[k]) / FPS;
    W2k[k + 1] = W2k[k] + gate2(t) * (0.25 + 0.75 * A.voice[k]) / FPS;
    Sk[k + 1] = Sk[k] + (0.3 + A.low[k]) * slow(t) / FPS;
    Mk[k + 1] = Mk[k] + slow(t) / FPS;
  }
  const look = (tab, t) => { if (t <= 0) return t * (tab[1] - tab[0]) * FPS; const f = Math.min(N, t * FPS), i = Math.min(N - 1, Math.floor(f)), u = f - i; return tab[i] * (1 - u) + tab[i + 1] * u; };
  const W = (t) => look(Wk, t), W2 = (t) => look(W2k, t), Sph = (t) => look(Sk, t), Mt = (t) => look(Mk, t);
  // arranques (máximos locales del flujo)
  const onsets = [];
  for (let i = 1; i < N - 1; i++) { const f = A.flux[i]; if (f > cfg.onsetThreshold && f >= A.flux[i - 1] && f >= A.flux[i + 1] && (!onsets.length || i / FPS - onsets[onsets.length - 1] >= cfg.onsetGap)) onsets.push(i / FPS); }
  const surge = (t) => { let s = 0; for (const o of onsets) if (t >= o && t - o < 2) s += Math.exp(-(t - o) / 0.3); return Math.min(1, s); };

  // ---------- fotos, máscaras, distancias ----------
  const photoSrc = { rinconada: cfg.photos.portezuelo, gruta: cfg.photos.gruta };
  const mat = {};
  for (const kind of ['rinconada', 'gruta']) {
    let img = null;
    try { img = await PBS.loadImage(cfg.assets + photoSrc[kind]); } catch (e) { warnings.push('FALTA FOTO ' + photoSrc[kind]); }
    mat[kind] = RV.processPhoto(img, kind, cfg);
    if (/dbg/.test(location.search)) { // superposición de máscaras para revisar polígonos (sólo depuración)
      const M = mat[kind], s = 3, W2 = Math.floor(M.w / s), H2 = Math.floor(M.h / s), c = document.createElement('canvas'); c.width = W2; c.height = H2;
      const g = c.getContext('2d'), id = g.createImageData(W2, H2);
      for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
        const i = y * s * M.w + x * s, k = (y * W2 + x) * 4, L = M.lum[i] * 255, wa = M.water[i] / 255, ro = M.rock[i] / 255, sa = M.sand[i] / 255, sk = M.sky[i] / 255;
        id.data[k] = L * 0.55 + 110 * ro + 100 * sa; id.data[k + 1] = L * 0.55 + 100 * sa + 60 * sk; id.data[k + 2] = L * 0.55 + 120 * wa + 110 * sk; id.data[k + 3] = 255;
      }
      g.putImageData(id, 0, 0);
      (window.__rvDbg = window.__rvDbg || {})[kind] = c.toDataURL('image/png');
    }
  }

  // ---------- GL ----------
  const gl = new PBS.GL(cfg.width, cfg.height), G = gl.gl;
  const triBuf = G.createBuffer();
  G.bindBuffer(G.ARRAY_BUFFER, triBuf);
  G.bufferData(G.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), G.STATIC_DRAW);
  const tex = {};
  for (const kind of ['rinconada', 'gruta']) {
    const ph = gl.texture(mat[kind].photo);
    tex[kind] = { photo: ph, mask: gl.texture(mat[kind].mask) }; mat[kind].photo = null; mat[kind].mask = null;
  }
  // W(t) por cuadro en una textura float 1201×1
  const wData = new Float32Array((N + 1) * 4);
  for (let k = 0; k <= N; k++) { wData[k * 4] = Wk[k]; wData[k * 4 + 1] = Sk[k]; wData[k * 4 + 2] = W2k[k]; }
  const wTex = G.createTexture();
  G.bindTexture(G.TEXTURE_2D, wTex);
  G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MAG_FILTER, G.LINEAR);
  G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_S, G.CLAMP_TO_EDGE); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_WRAP_T, G.CLAMP_TO_EDGE);
  G.texImage2D(G.TEXTURE_2D, 0, G.RGBA32F, N + 1, 1, 0, G.RGBA, G.FLOAT, wData);
  // ruido periódico con mipmaps
  const noiseTex = gl.texture(RV.noiseImage(cfg.seed + 3), { repeat: true });
  G.bindTexture(G.TEXTURE_2D, noiseTex); G.generateMipmap(G.TEXTURE_2D); G.texParameteri(G.TEXTURE_2D, G.TEXTURE_MIN_FILTER, G.LINEAR_MIPMAP_LINEAR);
  const dummy = gl.texture(null, { w: 1, h: 1 });
  const grainTex = gl.texture(RV.grainImage(cfg.seed + 5), { nearest: true, repeat: true });
  // virado: LUT 256×2 (fila 0 copia viva, fila 1 archivo), recalculada por cuadro (calidez de luces y centroide)
  const toneTex = gl.texture(null, { w: 256, h: 2 });
  const toneBuf = new Uint8Array(256 * 2 * 4);
  const luma = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  const T_S = [0.1098, 0.098, 0.0863];
  const T_M0 = [0.4784, 0.4, 0.3137], lm0 = luma(T_M0), T_M = T_M0.map((v) => lm0 + (v - lm0) * 0.72);
  const T_A = [205 / 255, 181 / 255, 148 / 255];
  const sstep = (a, b, x) => PBS.smooth((x - a) / (b - a));
  let toneKey = '';
  function buildTone(hi0, cent0) {
    // cuantizado antes de construir: la LUT depende sólo de la clave (determinista y se reutiliza entre cuadros)
    const hi = hi0.map((v) => Math.round(v * 1024) / 1024), cent = Math.round(cent0 * 256) / 256;
    const key = hi.join(',') + '|' + cent;
    if (key === toneKey) return;
    toneKey = key;
    const ls = luma(T_S), lm = luma(T_M), lh = luma(hi), la = luma(T_A);
    for (let row = 0; row < 2; row++) for (let i = 0; i < 256; i++) {
      const L = i / 255, arch = row;
      let tint = [0, 1, 2].map((c) => (L < lm ? PBS.lerp(T_S[c] / ls, T_M[c] / lm, sstep(0.02, lm, L)) : PBS.lerp(T_M[c] / lm, hi[c] / lh, sstep(lm, lh, L))));
      const w = sstep(0.5, 0.9, L);
      tint[0] *= 1 + 0.02 * cent * w; tint[2] *= 1 - 0.02 * cent * w;
      const am = arch * (0.55 + 0.45 * sstep(0.25, 0.75, L));
      tint = tint.map((v, c) => PBS.lerp(v, T_A[c] / la, am));
      let col = tint.map((v) => L * v);
      const mx = Math.max(...col), mn = Math.min(...col), y = luma(col);
      if (mx - mn > 0.12) col = col.map((v) => y + (v - y) * (0.12 / (mx - mn)));
      for (let c = 0; c < 3; c++) toneBuf[(row * 256 + i) * 4 + c] = Math.round(PBS.clamp(col[c], 0, 1) * 255);
      toneBuf[(row * 256 + i) * 4 + 3] = 255;
    }
    G.bindTexture(G.TEXTURE_2D, toneTex);
    G.texSubImage2D(G.TEXTURE_2D, 0, 0, 0, 256, 2, G.RGBA, G.UNSIGNED_BYTE, toneBuf);
  }

  // ---------- figuras ----------
  const SR = cfg.sizeRule;
  const unitOf = (f, kind) => {
    if (f.size === 'sail') return SR.sailUnit;
    const fy = f.sizeY || f.foot[1];
    const adult = kind === 'gruta' ? (fy - SR.gruta.headY) / 100 : (SR.rinconada.k * (fy - SR.rinconada.y0)) / 100;
    return f.size === 'child' ? adult * SR.child : adult;
  };
  // profundidad en pantalla → perspectiva aérea (luminancia de la plata) y desenfoque de la foto a esa distancia
  const FL = cfg.figureLook;
  const prints = cfg.prints.map((pc) => {
    const kind = pc.photo, figs = cfg.figures.filter((f) => f.print === pc.id);
    const groups = [...new Set(figs.filter((f) => f.group).map((f) => f.group))].sort();
    const list = figs.map((f) => {
      const ys = f.foot[1] * pc.scale, depth = PBS.clamp((FL.yNear - ys) / (FL.yNear - FL.yFar), 0, 1);
      const L = f.pose === 'sail' ? FL.sailL : PBS.lerp(FL.Lnear, FL.Lfar, depth);
      const soft = (f.pose === 'sail' ? FL.sailSoft : PBS.lerp(FL.softNear, FL.softFar, depth)) / pc.scale;
      return { ...f, unit: unitOf(f, kind), L, soft };
    });
    const at = RV.buildFigureAtlas(list, cfg.light[kind]);
    const P = { ...pc, kind, groups, figs: list, men: cfg.meniscus[pc.men] };
    P.figA = at.A ? gl.texture(at.A) : dummy; P.boxA = at.boxA || [-1e5, -1e5, 1, 1];
    P.figB = at.B ? gl.texture(at.B) : dummy; P.boxB = at.boxB || [-1e5, -1e5, 1, 1];
    P.gbox = [0, 1, 2].map((i) => at.groups[groups[i]] || [1e5, 1e5, -1e5, -1e5]); // caja del grupo en el canal i
    return P;
  });
  const byId = Object.fromEntries(prints.map((p) => [p.id, p]));
  // programas especializados por combinación de copias (B nueva/actual, A vieja). La vieja sigue viva hasta que el frente se la lleva.
  const progs = {};
  const optOf = (P) => ({ gruta: P.kind === 'gruta', archive: !!P.archive, foam: !!P.foam, figB: P.groups.length > 0 });
  const progFor = (B, Aold) => {
    const key = B.id + (Aold ? '+' + Aold.id : '');
    if (!progs[key]) progs[key] = gl.program(RV.compositeSource({ b: optOf(B), a: Aold ? { ...optOf(Aold), archive: false, foam: false } : null }));
    return progs[key];
  };
  progFor(byId.P1); progFor(byId.P2, byId.P1); progFor(byId.P2); progFor(byId.P3, byId.P2); progFor(byId.P3);

  // ---------- meniscos: geometría cerrada ----------
  const menGeo = cfg.meniscus.map((m) => {
    const a = (m.dirDeg * Math.PI) / 180, d = [Math.sin(a), -Math.cos(a)];
    let pmax = -1e9;
    for (const [x, y] of [[0, 0], [1080, 0], [0, 1920], [1080, 1920]]) pmax = Math.max(pmax, (x - 540) * d[0] + (y - 1920) * d[1]);
    const tLast = m.t0 + (pmax + m.bow * 1.1 + m.noiseAmp * 1.3 + 12 - m.s0) / m.v; // llegada más tardía en pantalla
    return { ...m, a, pmax, tLast };
  });
  const devEnd = (mg) => { let t = mg.tLast; while (t < 40 && W2(t) - W2(mg.tLast) < mg.induction + 5.3 * mg.tau0) t += 1 / 60; return t; };
  menGeo.forEach((m) => { m.tBleached = m.tLast + 90 / m.v; m.tDone = devEnd(m); });

  // ---------- plata que se suelta: partículas (P3) ----------
  const foamVS = (() => { // gl.program usa un vertex shader fijo: compilamos el nuestro a mano
    const sh = (type, src) => { const s = G.createShader(type); G.shaderSource(s, src); G.compileShader(s); if (!G.getShaderParameter(s, G.COMPILE_STATUS)) throw new Error(G.getShaderInfoLog(s)); return s; };
    const p = G.createProgram(); G.attachShader(p, sh(G.VERTEX_SHADER, RV.VS_FOAM)); G.attachShader(p, sh(G.FRAGMENT_SHADER, RV.FS_FOAM)); G.linkProgram(p);
    if (!G.getProgramParameter(p, G.LINK_STATUS)) throw new Error(G.getProgramInfoLog(p));
    return p;
  })();
  const foam = (() => {
    const F = cfg.foam, M = mat.rinconada, P3 = byId.P3;
    const livingLUT = RV.monotoneLUT(cfg.tone.livingCurve);
    const rnd = PBS.rng(cfg.seed + 101);
    const w = M.w, hw = M.hw, hh = M.hh, dL = M.dLand;
    const dAt = (x, y) => { const X = PBS.clamp(Math.round(x / 2), 0, hw - 1), Y = PBS.clamp(Math.round(y / 2), 0, hh - 1); return dL[Y * hw + X] * 2; };
    const wAt2 = (x, y) => M.water[PBS.clamp(Math.round(y), 0, M.h - 1) * w + PBS.clamp(Math.round(x), 0, w - 1)];
    const avoid = P3.figs.filter((f) => f.pose !== 'sail').map((f) => [f.foot[0] - 40 * f.unit, f.foot[1] - 108 * f.unit, f.foot[0] + 40 * f.unit, f.foot[1] + 6 * f.unit]);
    const inAvoid = (x, y) => avoid.some((b) => x > b[0] && x < b[2] && y > b[1] && y < b[3]);
    // candidatas: granito junto a una orilla verdadera (el agua está debajo de la roca) y el borde de la charca al pie de la roca grande
    const cand = [];
    const scan = (xa, xb, ya, yb, pool) => {
      for (let y = ya; y < yb; y += F.cell) for (let x = xa; x < xb; x += F.cell) {
        const xi = Math.round(x), yi = Math.round(y);
        if (M.rock[yi * w + xi] < 200) continue;
        const d = dAt(x, y);
        if (d < 1 || d > F.band) continue;
        if (!pool && !(wAt2(x, y + d + 6) > 128 && wAt2(x, y - 12) < 60)) continue;
        cand.push([x + (rnd() - 0.5) * F.cell * 0.6, y + (rnd() - 0.5) * F.cell * 0.6, d, pool]);
      }
    };
    scan(F.xMin, 2740, 560, 780, 0);
    scan(2150, 2490, 1290, 1480, 1);
    // curva acumulada de flujo (29,4–39,6 s) para el goteo; ráfagas agrupadas en los arranques 29,40 y 30,63
    const k0 = Math.round(F.t0 * FPS), k1 = Math.round(39.6 * FPS);
    const cum = [0];
    for (let k = k0; k < k1; k++) cum.push(cum[cum.length - 1] + 0.10 + Math.pow(A.flux[k], 4) * 3.0);
    const tot = cum[cum.length - 1];
    const invF = (u) => { const v = u * tot; let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < v) lo = m; else hi = m; } return (k0 + lo + (v - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo])) / FPS; };
    const near = (t0) => { let best = t0; for (const o of onsets) if (Math.abs(o - t0) < 0.25) best = o; return best; };
    const data = [];
    const push = (c, tr) => {
      const [x, y, d] = c;
      const gx = dAt(x + 3, y) - dAt(x - 3, y), gy = dAt(x, y + 3) - dAt(x, y - 3), gl2 = Math.hypot(gx, gy);
      if (gl2 < 1e-3) return;
      const dir = [-gx / gl2, -gy / gl2];
      const v = 9 + 9 * rnd(), life = PBS.clamp((d + 22 + 34 * rnd()) / v, 2.4, 6.5);
      const ex = x + dir[0] * v * life, ey = y + dir[1] * v * life;
      if (inAvoid(x, y) || inAvoid(ex, ey) || inAvoid((x + ex) / 2, (y + ey) / 2)) return;
      const l0 = PBS.clamp((M.lum[Math.round(y) * w + Math.round(x)] - cfg.photoSpec.rinconada.black) / (cfg.photoSpec.rinconada.white - cfg.photoSpec.rinconada.black), 0, 1);
      const Lr = PBS.clamp(livingLUT[Math.round(l0 * 1023)] * 0.8, 0.07, 0.22);
      data.push(x, y, dir[0], dir[1], tr, v, life, d, rnd() * 6.28, 1 + 2 * rnd(), Lr, F.size[0] + (F.size[1] - F.size[0]) * rnd());
    };
    if (cand.length) {
      for (const [ts, nCl] of F.bursts) {
        const t0b = near(ts);
        for (let k = 0; k < nCl; k++) {
          const ctr = cand[Math.floor(rnd() * cand.length)];
          const pool = cand.filter((c) => Math.hypot(c[0] - ctr[0], c[1] - ctr[1]) < F.cluster);
          for (let j = 0; j < F.perCluster && pool.length; j++) push(pool[Math.floor(rnd() * pool.length)], t0b + 0.45 * Math.pow(rnd(), 2));
        }
      }
      for (let j = 0; j < F.trickle; j++) push(cand[Math.floor(rnd() * cand.length)], invF(rnd()));
    }
    const n = data.length / 12;
    const vao = G.createVertexArray(); G.bindVertexArray(vao);
    const buf = G.createBuffer(); G.bindBuffer(G.ARRAY_BUFFER, buf); G.bufferData(G.ARRAY_BUFFER, new Float32Array(data), G.STATIC_DRAW);
    ['aP', 'aQ', 'aR'].forEach((nm, i) => { const l = G.getAttribLocation(foamVS, nm); if (l >= 0) { G.enableVertexAttribArray(l); G.vertexAttribPointer(l, 4, G.FLOAT, false, 48, i * 16); } });
    G.bindVertexArray(null);
    G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    const loc = {}; for (const u of ['uT', 'uS', 'uGeo', 'uBurn', 'uHigh', 'uTone', 'uPass']) loc[u] = G.getUniformLocation(foamVS, u);
    return { n, vao, loc };
  })();
  // liberar memoria de init
  for (const k in mat) { mat[k].lum = null; mat[k].dLand = null; mat[k].dRock = null; mat[k].water = mat[k].rock = mat[k].sand = mat[k].sky = null; }

  const ctx = canvas.getContext('2d');
  const hiFrom = PBS.hex(cfg.tone.hiFrom).map((v) => v / 255), hiTo = PBS.hex(cfg.tone.hiTo).map((v) => v / 255);
  const origin = (P, t) => {
    const k = P.originX; if (k.length === 1 || t <= k[0][0]) return k[0][1];
    const last = k[k.length - 1]; if (t >= last[0]) return last[1];
    return PBS.lerp(k[0][1], last[1], PBS.ease((t - k[0][0]) / (last[0] - k[0][0])));
  };
  const pushAt = (P, t) => (P.push ? PBS.lerp(P.push.from, P.push.to, PBS.ease((t - P.push.t0) / (P.push.t1 - P.push.t0))) : 1);
  const devGroup = (g, t) => { const G0 = cfg.groups[g]; return 1 - Math.exp(-Math.max(0, W(t) - W(G0.start) - dv.induction) / G0.tau0); };
  const slotUniforms = (pre, P, t, isB) => {
    const ms = mat[P.kind];
    const grp = [0, 0, 0, 0];
    P.groups.forEach((g, i) => (grp[i] = isB ? devGroup(g, t) : 1));
    const pc = P.push ? P.push.c : [540, 960];
    return {
      [pre + 'Photo']: tex[P.kind].photo, [pre + 'Mask']: tex[P.kind].mask, [pre + 'FigA']: P.figA, [pre + 'FigB']: P.figB,
      [pre + 'Geo']: [origin(P, t), P.originY, P.scale, pushAt(P, t)], [pre + 'Geo2']: [pc[0], pc[1], ms.w, ms.h],
      [pre + 'BoxA']: P.boxA, [pre + 'BoxB']: P.boxB, [pre + 'Grp']: grp,
      [pre + 'GB1']: P.gbox[0], [pre + 'GB2']: P.gbox[1], [pre + 'GB3']: P.gbox[2],
    };
  };

  function render(t) {
    const frame = Math.round(t * FPS);
    const m1 = menGeo[1], m2 = menGeo[2];
    let B, Aold = null, mg;
    if (t < m1.t0) { B = byId.P1; mg = menGeo[0]; }
    else if (t < m2.t0) { B = byId.P2; mg = m1; if (t < m1.tBleached) Aold = byId.P1; }
    else { B = byId.P3; mg = m2; if (t < m2.tBleached) Aold = byId.P2; }
    const sFront = mg.s0 + mg.v * (t - mg.t0);
    const frontVisible = t >= mg.t0 - 0.05 && sFront < mg.pmax + mg.bow + mg.noiseAmp * 1.3 + 60 ? 1 : 0;
    const mt = Mt(t), S = Sph(t);
    const rinseW = Math.min(PBS.smooth((t - (cfg.rinse.t0 - 0.3)) / 0.3), PBS.smooth((cfg.rinse.t1 + 0.3 - t) / 0.3));
    const ra = t - cfg.rinse.drop;
    const ringR = ra > 0 ? (ra / cfg.rinse.grow) * 1500 : -1e4;
    const ringA = ra > 0 ? cfg.rinse.amp * (1 - PBS.smooth((ra - 1.2) / 1.0)) : 0;
    const Bn = cfg.burn, burnP = PBS.ease((t - Bn.t0) / (Bn.t1 - Bn.t0));
    const warm = PBS.smooth(t / cfg.tone.warmBy);
    const hi = [0, 1, 2].map((i) => hiFrom[i] + (hiTo[i] - hiFrom[i]) * warm);
    const cent = 2 * avg(A.cent, t, 2) - 1;
    buildTone(hi, cent);
    const Fm = cfg.foam;
    const foamGrow = B.foam ? PBS.smooth((t - Fm.t0) / Fm.grow) : 0;
    const seaShade = B.foam ? PBS.smooth((t - Fm.shadeT0) / Fm.shadeDur) : 0;
    const U = {
      uT: mt, uTr: t, uFrame: frame, uWt: W2(t), uS: S, uLow: at(A.low, t), uHigh: at(A.high, t), uRms: at(A.rms, t), uTone: toneTex,
      uWtex: wTex, uNoise: noiseTex, uGrain: grainTex, uGOff: [(frame * 389) % 1024, (frame * 683 + 211) % 1024],
      ...slotUniforms('b', B, t, true),
      ...(Aold ? slotUniforms('a', Aold, t, false) : {}),
      uMen: [mg.t0, mg.s0, mg.v, mg.a], uMen2: [mg.bow, mg.noiseAmp, mg.seed, frontVisible], uMen3: [mg.figFront, mg.tau0, mg.induction, mg.wet],
      uDevAll: t > mg.tDone ? 1 : -1,
      uRinse: [cfg.rinse.wobble * rinseW, ringR, ringA, cfg.rinse.deepen * rinseW],
      uBurn: [burnP, Bn.yFull, Bn.yZero, Bn.density], uBurn2: [t * Bn.drift, Bn.edgeAmp, 0, 0],
      uFoam: [foamGrow, seaShade, 0, 0],
      uSurge: surge(t), uSwashPhase: S * 1.35, uGrottoPhase: S * cfg.grotto.swashRate + 0.4,
    };
    G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    gl.draw(progFor(B, Aold), U);
    // plata → espuma: la plata oscura que se suelta (MIN) y la espuma blanca (MAX); ambos conmutativos → deterministas
    if (B.foam && t >= Fm.t0 && foam.n) {
      G.useProgram(foamVS);
      const L = foam.loc;
      G.uniform1f(L.uT, t); G.uniform1f(L.uS, S); G.uniform4f(L.uGeo, origin(B, t), B.originY, B.scale, 0);
      G.uniform4f(L.uBurn, burnP, Bn.yFull, Bn.yZero, Bn.density); G.uniform1f(L.uHigh, at(A.high, t));
      G.activeTexture(G.TEXTURE0); G.bindTexture(G.TEXTURE_2D, toneTex); G.uniform1i(L.uTone, 0);
      G.enable(G.BLEND);
      G.bindVertexArray(foam.vao);
      G.blendEquation(G.MIN); G.uniform1f(L.uPass, 0); G.drawArrays(G.POINTS, 0, foam.n);
      G.blendEquation(G.MAX); G.uniform1f(L.uPass, 1); G.drawArrays(G.POINTS, 0, foam.n);
      G.bindVertexArray(null);
      G.blendEquation(G.FUNC_ADD); G.disable(G.BLEND);
      G.bindBuffer(G.ARRAY_BUFFER, triBuf);
    }
    ctx.drawImage(gl.canvas, 0, 0);
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
  for (const tw of cfg.warmTimes) render(tw);
  G.finish();
  window.__rv = { W, Sph, onsets, menGeo, foamN: foam.n, prints: prints.map((p) => ({ id: p.id, boxA: p.boxA, boxB: p.boxB, groups: p.groups })) };
  return { warnings, logo: !!logo, render };
};
