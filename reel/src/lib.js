/* Utilidades deterministas: azar con semilla, ruido, color y pinceles. */
(function () {
  const PB = (window.PB = window.PB || {});

  PB.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  PB.makeNoise = function (seed) {
    const r = PB.rng(seed);
    const perm = new Uint8Array(512);
    const base = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [base[i], base[j]] = [base[j], base[i]];
    }
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    const val = new Float32Array(256);
    for (let i = 0; i < 256; i++) val[i] = r();
    function n2(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
      const X = xi & 255, Y = yi & 255;
      const a = val[perm[perm[X] + Y]], b = val[perm[perm[X + 1] + Y]];
      const c = val[perm[perm[X] + Y + 1]], d = val[perm[perm[X + 1] + Y + 1]];
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    }
    function fbm(x, y, oct = 4) {
      let s = 0, amp = 0.5, f = 1, norm = 0;
      for (let i = 0; i < oct; i++) {
        s += amp * n2(x * f + i * 17.3, y * f - i * 9.1);
        norm += amp;
        amp *= 0.5;
        f *= 2.03;
      }
      return s / norm;
    }
    return { n2, fbm };
  };

  PB.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  PB.lerp = (a, b, t) => a + (b - a) * t;
  PB.smooth = (t) => { t = PB.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  PB.ease = (t) => { t = PB.clamp(t, 0, 1); return 0.5 - 0.5 * Math.cos(Math.PI * t); };

  // ---- Color ----
  const hexCache = new Map();
  PB.hex = function (h) {
    if (Array.isArray(h)) return h;
    let c = hexCache.get(h);
    if (!c) {
      const s = h.replace('#', '');
      c = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
      hexCache.set(h, c);
    }
    return c;
  };
  PB.mix = (a, b, t) => { a = PB.hex(a); b = PB.hex(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  PB.shade = (a, k) => { a = PB.hex(a); return [a[0] * k, a[1] * k, a[2] * k]; };
  PB.css = (c, alpha = 1) => { c = PB.hex(c); return `rgba(${PB.clamp(c[0] | 0, 0, 255)},${PB.clamp(c[1] | 0, 0, 255)},${PB.clamp(c[2] | 0, 0, 255)},${alpha})`; };
  PB.jitter = (c, r, amt) => { c = PB.hex(c); const k = 1 + (r() - 0.5) * 2 * amt; const h = (r() - 0.5) * amt * 30; return [c[0] * k + h, c[1] * k, c[2] * k - h]; };

  // ---- Curvas ----
  // Interpolación Hermite monótona de y(x) sobre puntos de control ordenados por x.
  PB.interpY = function (ctrl, x) {
    const n = ctrl.length;
    if (x <= ctrl[0][0]) return ctrl[0][1];
    if (x >= ctrl[n - 1][0]) return ctrl[n - 1][1];
    let i = 0;
    while (x > ctrl[i + 1][0]) i++;
    const p1 = ctrl[i], p2 = ctrl[i + 1];
    const p0 = ctrl[Math.max(0, i - 1)], p3 = ctrl[Math.min(n - 1, i + 2)];
    const h = p2[0] - p1[0];
    const m1 = (p2[1] - p0[1]) / Math.max(1, p2[0] - p0[0]);
    const m2 = (p3[1] - p1[1]) / Math.max(1, p3[0] - p1[0]);
    const u = (x - p1[0]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * h * m1 + (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * h * m2;
  };

  // Perfil y(x) con rugosidad orgánica. Devuelve función con .pts
  PB.profile = function (ctrl, o = {}) {
    const { rough = 0, freq = 0.008, fine = 0, seed = 1, x0 = -160, x1 = 1240, step = 3 } = o;
    const N = PB.makeNoise(seed);
    const pts = [];
    for (let x = x0; x <= x1; x += step) {
      let y = PB.interpY(ctrl, x);
      y += rough * (N.fbm(x * freq, 3.7, 4) - 0.5) * 2;
      y += fine * (N.n2(x * 0.09, 11.3) - 0.5) * 2;
      pts.push([x, y]);
    }
    const f = (x) => {
      const i = (x - x0) / step;
      const i0 = PB.clamp(Math.floor(i), 0, pts.length - 2);
      const u = PB.clamp(i - i0, 0, 1);
      return pts[i0][1] * (1 - u) + pts[i0 + 1][1] * u;
    };
    f.pts = pts;
    f.minY = Math.min(...pts.map((p) => p[1]));
    return f;
  };

  PB.pathBelow = function (ctx, f, yBottom) {
    const p = f.pts;
    ctx.beginPath();
    ctx.moveTo(p[0][0], yBottom);
    for (const q of p) ctx.lineTo(q[0], Math.min(q[1], yBottom));
    ctx.lineTo(p[p.length - 1][0], yBottom);
    ctx.closePath();
  };

  PB.pathSmooth = function (ctx, pts, closed = true) {
    const n = pts.length;
    ctx.beginPath();
    if (!closed) {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < n - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
      }
      ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
      return;
    }
    const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
    }
    ctx.closePath();
  };

  // ---- Pinceles ----
  // Trazos cortos semitransparentes dentro del recorte actual.
  PB.strokes = function (ctx, o) {
    const r = PB.rng(o.seed || 1);
    const [x0, y0, x1, y1] = o.box;
    const cols = o.cols.map(PB.hex);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < o.n; i++) {
      const x = x0 + r() * (x1 - x0);
      const y = y0 + r() * (y1 - y0);
      if (o.test && !o.test(x, y)) continue;
      const depth = o.persp ? PB.clamp((y - y0) / (y1 - y0), 0, 1) : 0.5;
      const pk = o.persp ? 0.35 + 0.9 * depth : 1;
      const len = PB.lerp(o.len[0], o.len[1], r()) * pk;
      const w = PB.lerp(o.width[0], o.width[1], r()) * pk;
      const ang = PB.lerp(o.ang[0], o.ang[1], r());
      const c = PB.jitter(cols[Math.floor(r() * cols.length)], r, o.jit == null ? 0.06 : o.jit);
      ctx.globalAlpha = PB.lerp(o.alpha[0], o.alpha[1], r());
      ctx.strokeStyle = PB.css(c);
      ctx.lineWidth = w;
      const dx = Math.cos(ang) * len * 0.5, dy = Math.sin(ang) * len * 0.5;
      const bend = (r() - 0.5) * len * (o.bend || 0.15);
      ctx.beginPath();
      ctx.moveTo(x - dx, y - dy);
      ctx.quadraticCurveTo(x - dy * 0 + bend * Math.sin(ang), y + bend * Math.cos(ang), x + dx, y + dy);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Manchas redondeadas (follaje, liquen, estipple).
  PB.dabs = function (ctx, o) {
    const r = PB.rng(o.seed || 1);
    const [x0, y0, x1, y1] = o.box;
    const cols = o.cols.map(PB.hex);
    ctx.save();
    for (let i = 0; i < o.n; i++) {
      const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0);
      if (o.test && !o.test(x, y)) continue;
      const rad = PB.lerp(o.r[0], o.r[1], r());
      ctx.globalAlpha = PB.lerp(o.alpha[0], o.alpha[1], r());
      ctx.fillStyle = PB.css(PB.jitter(cols[Math.floor(r() * cols.length)], r, o.jit == null ? 0.06 : o.jit));
      ctx.beginPath();
      ctx.ellipse(x, y, rad, rad * (o.flat || 0.8), (r() - 0.5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  // Texturas compartidas (se generan una sola vez y se reutilizan en todas las capas).
  let _tex = null;
  PB.textures = function () {
    if (_tex) return _tex;
    const N = PB.makeNoise(4242);
    // Moteado de baja frecuencia (variación pictórica del color).
    const mw = 420, mh = 760;
    const mot = document.createElement('canvas');
    mot.width = mw; mot.height = mh;
    const mc = mot.getContext('2d');
    const img = mc.createImageData(mw, mh);
    for (let y = 0; y < mh; y++) {
      for (let x = 0; x < mw; x++) {
        const v = N.fbm(x / 38, y / 30, 4) - 0.5;
        const i = (y * mw + x) * 4;
        const c = v > 0 ? 255 : 0;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = c;
        img.data[i + 3] = Math.min(255, Math.abs(v) * 2 * 255 * 0.55);
      }
    }
    mc.putImageData(img, 0, 0);
    // Grano fino de papel/lienzo.
    const gs = 256;
    const gr = document.createElement('canvas');
    gr.width = gr.height = gs;
    const gc = gr.getContext('2d');
    const gi = gc.createImageData(gs, gs);
    const r = PB.rng(99);
    for (let i = 0; i < gs * gs; i++) {
      const v = r();
      const c = v > 0.5 ? 255 : 0;
      gi.data[i * 4] = gi.data[i * 4 + 1] = gi.data[i * 4 + 2] = c;
      gi.data[i * 4 + 3] = Math.abs(v - 0.5) * 2 * 30;
    }
    gc.putImageData(gi, 0, 0);
    _tex = { mottle: mot, grain: gr };
    return _tex;
  };

  // Aplica moteado + grano solo sobre lo ya pintado en la capa.
  PB.texturize = function (canvas, seed = 1, amt = 0.16, grainAmt = 1) {
    const T = PB.textures();
    const ctx = canvas.getContext('2d');
    const r = PB.rng(seed);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = amt;
    const sx = r() * 120, sy = r() * 200;
    ctx.drawImage(T.mottle, sx, sy, 300, 540, 0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = grainAmt;
    ctx.fillStyle = ctx.createPattern(T.grain, 'repeat');
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  };

  // Capa pintada en coordenadas de cuadro, con margen para desplazamientos.
  PB.layer = function (W, y0, y1, M = 90) {
    const c = document.createElement('canvas');
    c.width = W + 2 * M;
    c.height = Math.ceil(y1 - y0) + 2 * M;
    const ctx = c.getContext('2d');
    ctx.translate(M, M - y0);
    return { canvas: c, ctx, ox: -M, oy: y0 - M, M };
  };
})();
