/*
 * Revelado — material fotográfico: luminancia normalizada, curva «viva», máscaras rasterizadas y campos de distancia.
 * Textura de foto (RGBA8): R = L0 normalizada, G = distancia en tierra al agua (px foto; gruta: distancia a la arena / 2),
 *                          B = distancia en el agua a la roca (px foto), A = L viva (curva de tono aplicada).
 * Textura de máscaras (RGBA8, desenfoque 3 px): R agua, G roca, B arena, A cielo (rinconada) o boca (gruta).
 */
(function () {
  const RV = (window.RV = window.RV || {});

  // interpolación monótona (Fritsch–Carlson) → LUT
  RV.monotoneLUT = function (pts, n = 1024) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), m = pts.length;
    const d = [], s = [];
    for (let i = 0; i < m - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    s[0] = d[0]; s[m - 1] = d[m - 2];
    for (let i = 1; i < m - 1; i++) s[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < m - 1; i++) {
      if (d[i] === 0) { s[i] = s[i + 1] = 0; continue; }
      const a = s[i] / d[i], b = s[i + 1] / d[i], h = a * a + b * b;
      if (h > 9) { const t = 3 / Math.sqrt(h); s[i] = t * a * d[i]; s[i + 1] = t * b * d[i]; }
    }
    const lut = new Float32Array(n);
    for (let k = 0; k < n; k++) {
      const x = k / (n - 1);
      let i = 0; while (i < m - 2 && x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = Math.min(1, Math.max(0, (x - xs[i]) / h));
      const t2 = t * t, t3 = t2 * t;
      lut[k] = (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * s[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * s[i + 1];
    }
    return lut;
  };

  // Transformada de distancia euclídea exacta (Felzenszwalb) sobre una rejilla: f = 0 en semillas, INF fuera
  function edt1d(f, n, d, v, z) {
    let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  }
  RV.edt = function (seed, w, h) { // seed: Uint8Array (1 = semilla). Devuelve Float32Array de distancias
    const INF = 1e12, N = Math.max(w, h);
    const g = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = seed[i] ? 0 : INF;
    const f = new Float32Array(N), d = new Float32Array(N), v = new Int32Array(N), z = new Float32Array(N + 1);
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; edt1d(f, h, d, v, z); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; edt1d(f, w, d, v, z); for (let x = 0; x < w; x++) g[y * w + x] = Math.sqrt(d[x]); }
    return g;
  };

  function rasterMask(w, h, polys, blur, up) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h;
    const g2 = c2.getContext('2d');
    g2.fillStyle = '#fff';
    for (const poly of polys) { g2.beginPath(); poly.forEach((p, i) => (i ? g2.lineTo(p[0] * up, p[1] * up) : g2.moveTo(p[0] * up, p[1] * up))); g2.closePath(); g2.fill(); }
    if (blur > 0) g.filter = `blur(${blur * up}px)`;
    g.drawImage(c2, 0, 0);
    const d = g.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = d[i * 4 + 3];
    return out;
  }
  // caja envolvente (px de textura) de un polígono en px de foto
  function polyBox(poly, up, w, h) {
    let x0 = w, y0 = h, x1 = 0, y1 = 0;
    for (const [x, y] of poly) { x0 = Math.min(x0, x * up); y0 = Math.min(y0, y * up); x1 = Math.max(x1, x * up); y1 = Math.max(y1, y * up); }
    return [Math.max(0, Math.floor(x0)), Math.max(0, Math.floor(y0)), Math.min(w - 1, Math.ceil(x1)), Math.min(h - 1, Math.ceil(y1))];
  }

  /*
   * Procesa una foto. kind: clave de cfg.photoSpec. Devuelve {photo: ImageData, mask: ImageData, w, h (px originales), tw, th (px de textura), ...}
   * Las coordenadas de config (polígonos, semillas, parches) van en px de la foto ORIGINAL; spec.up ≥ 1 sube la resolución de la textura.
   * Si img es null → sustituto procedural (granito fbm, arena plana, franja de mar).
   * Textura de foto (RGBA8): R = L0, G = distancia en tierra al agua (px foto × dscale), B = distancia en el agua a la roca (px foto × dscale), A = L viva.
   */
  RV.processPhoto = function (img, kind, cfg) {
    const pc = cfg.photoSpec[kind];
    const up = pc.up || 1, w = pc.w, h = pc.h, tw = Math.round(w * up), th = Math.round(h * up);
    const c = document.createElement('canvas'); c.width = tw; c.height = th;
    const g = c.getContext('2d', { willReadFrequently: true });
    let lum = new Float32Array(tw * th);
    const ch = pc.chan || [0.299, 0.587, 0.114];
    if (img) {
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, tw, th);
      const d = g.getImageData(0, 0, tw, th).data;
      for (let i = 0; i < tw * th; i++) lum[i] = (ch[0] * d[i * 4] + ch[1] * d[i * 4 + 1] + ch[2] * d[i * 4 + 2]) / 255;
    }
    const M = cfg.masks[kind] || {};
    const blur = cfg.maskBlur;
    const water = rasterMask(tw, th, M.water || [], blur, up);
    const rock = rasterMask(tw, th, M.rock || [], blur, up);
    const sky = rasterMask(tw, th, M.sky || [], M.skyBlur || blur, up);
    let sand = M.sand ? rasterMask(tw, th, M.sand, blur, up) : null;
    // regiones automáticas: el borde se toma de la foto (región clara/oscura conectada a una semilla, dentro de una zona)
    if (img) for (const Z of M.auto || []) {
      const zone = rasterMask(tw, th, [Z.zone], 0, up);
      const [x0, y0, x1, y1] = polyBox(Z.zone, up, tw, th);
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1, lb = new Float32Array(bw * bh), R = 2;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        let s = 0, n = 0;
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const X = x0 + x + dx, Y = y0 + y + dy; if (X >= 0 && Y >= 0 && X < tw && Y < th) { s += lum[Y * tw + X]; n++; } }
        lb[y * bw + x] = s / n;
      }
      const lo = Z.lo != null ? Z.lo : -1, hi = Z.hi != null ? Z.hi : 2;
      const F = new Uint8Array(bw * bh), st = [];
      for (const [sx, sy] of Z.seeds) st.push((Math.round(sy * up) - y0) * bw + (Math.round(sx * up) - x0));
      while (st.length) {
        const i = st.pop(); if (i < 0 || i >= bw * bh || F[i]) continue;
        const x = i % bw, y = (i / bw) | 0;
        if (lb[i] < lo || lb[i] > hi || zone[(y + y0) * tw + x + x0] < 128) continue;
        F[i] = 1;
        if (x > 0) st.push(i - 1); if (x < bw - 1) st.push(i + 1); if (y > 0) st.push(i - bw); if (y < bh - 1) st.push(i + bw);
      }
      const c1 = document.createElement('canvas'); c1.width = bw; c1.height = bh;
      const g1 = c1.getContext('2d'), id = g1.createImageData(bw, bh);
      for (let i = 0; i < bw * bh; i++) id.data[i * 4 + 3] = F[i] ? 255 : 0;
      g1.putImageData(id, 0, 0);
      const c2 = document.createElement('canvas'); c2.width = bw; c2.height = bh;
      const g2 = c2.getContext('2d', { willReadFrequently: true }); g2.filter = `blur(${blur * 0.7 * up}px)`; g2.drawImage(c1, 0, 0);
      const fb = g2.getImageData(0, 0, bw, bh).data;
      const tgt = Z.into === 'sky' ? sky : Z.into === 'rock' ? rock : Z.into === 'sand' ? (sand = sand || new Uint8Array(tw * th)) : water;
      const others = [water, rock, sky].concat(sand ? [sand] : []).filter((a) => a !== tgt);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const i = (y + y0) * tw + x + x0; if (zone[i] < 128) continue;
        const v = fb[(y * bw + x) * 4 + 3];
        tgt[i] = Math.max(tgt[i], v);
        if (Z.carve !== false) for (const o of others) o[i] = Math.min(o[i], 255 - v);
      }
    }
    if (!sand) { sand = new Uint8Array(tw * th); for (let i = 0; i < tw * th; i++) sand[i] = Math.max(0, 255 - water[i] - rock[i] - sky[i]); }
    if (M.rockMinus) for (let i = 0; i < tw * th; i++) rock[i] = Math.max(0, 255 - sand[i] - sky[i]);
    if (!img) { // sustituto procedural
      const nz = PBS.makeNoise(cfg.seed + 7);
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
        const i = y * tw + x, gr = nz.fbm(x / (60 * up), y / (60 * up), 5);
        let L = 0.62 + 0.04 * nz.fbm(x / (200 * up), y / (30 * up), 3);
        L = L * (1 - rock[i] / 255) + (0.25 + 0.45 * gr) * (rock[i] / 255);
        L = L * (1 - water[i] / 255) + 0.8 * (water[i] / 255);
        L = L * (1 - sky[i] / 255) + 0.84 * (sky[i] / 255);
        lum[i] = 0.2 + L * 0.66;
      }
    }
    // retoques: parches clonados [dx,dy,sx,sy,w,h,pluma] (px de foto)
    for (const r of pc.patches || []) {
      const [dx, dy, pw, ph, feather, sx, sy] = r.map((v, i) => (i === 4 ? v : v));
      const X0 = Math.round(dx * up), Y0 = Math.round(dy * up), SX = Math.round(sx * up), SY = Math.round(sy * up), PW = Math.round(pw * up), PH = Math.round(ph * up), FE = feather * up;
      for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) {
        const ex = Math.min(x, PW - 1 - x) / FE, ey = Math.min(y, PH - 1 - y) / FE;
        const a = Math.min(1, Math.min(ex, ey)); const aa = a * a * (3 - 2 * a);
        const di = (Y0 + y) * tw + X0 + x, si = (SY + y) * tw + SX + x;
        lum[di] = lum[di] * (1 - aa) + lum[si] * aa;
      }
    }
    // suavizados locales: [x0,y0,x1,y1,radio,pluma] (px de foto): mezcla con una copia desenfocada (disimula rasgos de pareidolia)
    for (const r of pc.soften || []) {
      const [ax, ay, bx, by, rad, fe] = r;
      const X0 = Math.max(0, Math.round((ax - fe) * up)), Y0 = Math.max(0, Math.round((ay - fe) * up)), X1 = Math.min(tw - 1, Math.round((bx + fe) * up)), Y1 = Math.min(th - 1, Math.round((by + fe) * up));
      const bw = X1 - X0 + 1, bh = Y1 - Y0 + 1, cc = document.createElement('canvas'); cc.width = bw; cc.height = bh;
      const cg = cc.getContext('2d', { willReadFrequently: true }), id = cg.createImageData(bw, bh);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const v = Math.max(0, Math.min(255, lum[(Y0 + y) * tw + X0 + x] * 255)); const k = (y * bw + x) * 4; id.data[k] = id.data[k + 1] = id.data[k + 2] = v; id.data[k + 3] = 255; }
      cg.putImageData(id, 0, 0);
      const c3 = document.createElement('canvas'); c3.width = bw; c3.height = bh;
      const g3 = c3.getContext('2d', { willReadFrequently: true }); g3.filter = `blur(${rad * up}px)`; g3.drawImage(cc, 0, 0);
      const bd = g3.getImageData(0, 0, bw, bh).data;
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        const px = (X0 + x) / up, py = (Y0 + y) / up;
        const ex = Math.min(px - (ax - fe), (bx + fe) - px) / fe, ey = Math.min(py - (ay - fe), (by + fe) - py) / fe;
        const a = Math.max(0, Math.min(1, Math.min(ex, ey))), aa = a * a * (3 - 2 * a);
        const i = (Y0 + y) * tw + X0 + x; lum[i] = lum[i] * (1 - aa) + (bd[(y * bw + x) * 4] / 255) * aa;
      }
    }
    const lut = RV.monotoneLUT(pc.curve || cfg.tone.livingCurve);
    const bp = pc.black, wp = pc.white, ds = pc.dscale || 1;
    // distancias a media resolución de la textura (px de textura ×2 → px de foto ×2/up)
    const hw = Math.ceil(tw / 2), hh = Math.ceil(th / 2), dconv = 2 / up;
    const needD = pc.dist !== false;
    let dLand = null, dRock = null;
    if (needD) {
      const seedW = new Uint8Array(hw * hh), seedR = new Uint8Array(hw * hh);
      for (let y = 0; y < hh; y++) for (let x = 0; x < hw; x++) {
        const i = Math.min(th - 1, y * 2) * tw + Math.min(tw - 1, x * 2);
        seedW[y * hw + x] = pc.landSeed === 'sand' ? sand[i] > 127 : water[i] > 127;
        seedR[y * hw + x] = rock[i] > 127;
      }
      dLand = RV.edt(seedW, hw, hh); dRock = RV.edt(seedR, hw, hh);
    }
    const photo = new ImageData(tw, th), pd = photo.data;
    const mask = new ImageData(tw, th), md = mask.data;
    for (let y = 0; y < th; y++) {
      const hy = Math.min(hh - 1, y >> 1);
      for (let x = 0; x < tw; x++) {
        const i = y * tw + x, k = i * 4, hi = hy * hw + Math.min(hw - 1, x >> 1);
        let L0 = (lum[i] - bp) / (wp - bp); L0 = L0 < 0 ? 0 : L0 > 1 ? 1 : L0;
        pd[k] = Math.round(L0 * 255);
        if (needD) { pd[k + 1] = Math.min(255, Math.round(dLand[hi] * dconv * ds)); pd[k + 2] = Math.min(255, Math.round(dRock[hi] * dconv * ds)); }
        pd[k + 3] = Math.round(lut[Math.round(L0 * 1023)] * 255);
        md[k] = water[i]; md[k + 1] = rock[i]; md[k + 2] = sand[i]; md[k + 3] = sky[i];
      }
    }
    return { photo, mask, w, h, tw, th, water, rock, sand, sky, dLand, dRock, hw, hh, lum, up };
  };

  // Grano: 1024² periódico. R ruido blanco; G grano fino (≈1,5 px); B grumos de archivo (≈2,3 px); A grumos de figura (≈2,6 px)
  RV.grainImage = function (seed, N = 1024) {
    const r = PBS.rng(seed);
    const img = new ImageData(N, N), d = img.data;
    const white = () => { const a = new Float32Array(N * N); for (let i = 0; i < N * N; i++) a[i] = r(); return a; };
    const blur = (a, s) => { // gaussiana separable periódica
      const k = [], R = Math.ceil(s * 2.5); let sum = 0;
      for (let i = -R; i <= R; i++) { const v = Math.exp(-(i * i) / (2 * s * s)); k.push(v); sum += v; }
      for (let i = 0; i < k.length; i++) k[i] /= sum;
      const b = new Float32Array(N * N), c = new Float32Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (let i = -R; i <= R; i++) v += a[y * N + ((x + i + N) & (N - 1))] * k[i + R]; b[y * N + x] = v; }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let v = 0; for (let i = -R; i <= R; i++) v += b[((y + i + N) & (N - 1)) * N + x] * k[i + R]; c[y * N + x] = v; }
      // normalizar a desviación comparable al blanco (σ ≈ 0,289) centrado en 0,5
      let m = 0, q = 0; for (let i = 0; i < N * N; i++) { m += c[i]; q += c[i] * c[i]; } m /= N * N; const sd = Math.sqrt(q / (N * N) - m * m);
      for (let i = 0; i < N * N; i++) c[i] = Math.min(1, Math.max(0, 0.5 + ((c[i] - m) / sd) * 0.2));
      return c;
    };
    const w0 = white(), g1 = blur(white(), 0.75), g2 = blur(white(), 1.15), g3 = blur(white(), 1.35);
    for (let i = 0; i < N * N; i++) { d[i * 4] = w0[i] * 255; d[i * 4 + 1] = g1[i] * 255; d[i * 4 + 2] = g2[i] * 255; d[i * 4 + 3] = g3[i] * 255; }
    return img;
  };

  // Textura de ruido periódica (valor, varias octavas por canal), 512², con mipmaps
  RV.noiseImage = function (seed, N = 512) {
    const r = PBS.rng(seed);
    const img = new ImageData(N, N), d = img.data;
    const chans = [[8, 5], [32, 4], [4, 3], [64, 2]]; // [celdas base, octavas]
    const grids = {};
    const grid = (n) => { if (!grids[n]) { const a = new Float32Array(n * n); for (let i = 0; i < n * n; i++) a[i] = r(); grids[n] = a; } return grids[n]; };
    const vn = (x, y, n) => { const a = grid(n); const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      const X0 = ((xi % n) + n) % n, Y0 = ((yi % n) + n) % n, X1 = (X0 + 1) % n, Y1 = (Y0 + 1) % n;
      const A = a[Y0 * n + X0], B = a[Y0 * n + X1], C = a[Y1 * n + X0], D = a[Y1 * n + X1];
      return A + (B - A) * u + (C - A) * v + (A - B - C + D) * u * v; };
    const vals = chans.map(() => new Float32Array(N * N));
    chans.forEach(([base, oct], ci) => {
      let mn = 1e9, mx = -1e9;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let s = 0, amp = 1, tot = 0, n = base;
        for (let o = 0; o < oct; o++) { s += amp * vn((x / N) * n + o * 0.37, (y / N) * n + o * 0.61, n); tot += amp; amp *= 0.5; n *= 2; }
        s /= tot; vals[ci][y * N + x] = s; mn = Math.min(mn, s); mx = Math.max(mx, s);
      }
      const a = vals[ci];
      for (let i = 0; i < N * N; i++) d[i * 4 + ci] = Math.round(((a[i] - mn) / (mx - mn)) * 255);
    });
    return img;
  };
})();
