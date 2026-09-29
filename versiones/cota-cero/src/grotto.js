/* Vista GRUTA: grabado a partir de gruta_limpia (orientación de las fracturas por tensor de estructura),
 * líneas de corriente equiespaciadas, tono por ancho y segundo juego cruzado; figuras G1–G3 de noche.
 * Canales del lienzo: R talla, G talla ensanchada (+8 %, para el temblor con la voz), B arena, A luz de las figuras. */
(function () {
  const GR = (window.CC_GROTTO = {});
  const U = window.CC_U, S = window.CC_STREAM, F = window.CC_FIG;

  GR.build = async function (cfg, warnings) {
    const W = cfg.width, H = cfg.height, gv = cfg.views.grotto;
    const [ww, wh] = gv.work;
    const t0 = performance.now();
    let L = null;
    try {
      const img = await PBS.loadImage(cfg.assets + cfg.photos.grotto.file);
      const [cx, cy, cw, ch] = cfg.photos.grotto.crop;
      const c = U.canvas(ww, wh), x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(img, cx, cy, cw, ch, 0, 0, ww, wh);
      const d = x.getImageData(0, 0, ww, wh).data;
      L = new Float32Array(ww * wh);
      for (let i = 0; i < ww * wh; i++) L[i] = (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255;
    } catch (e) {
      warnings.push('FALTA FOTO gruta_limpia');
    }
    const nz = PBS.makeNoise(cfg.seed + 31);
    if (!L) { // reserva procedimental: fracturas verticales y boca oscura elíptica
      L = new Float32Array(ww * wh);
      for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
        const e = Math.hypot((x - ww * 0.45) / (ww * 0.22), (y - wh * 0.62) / (wh * 0.26));
        L[y * ww + x] = y > wh * 0.84 ? 0.75 : 0.25 + 0.35 * nz.fbm(x / 30, y / 140) + (e < 1 ? -0.3 : 0);
      }
    }
    // contraste: curva suave, el negro de la cueva queda profundo
    // ecualización del histograma (sobre la luminancia suavizada) mezclada con la lineal: la cueva queda como lo más oscuro
    const Lb = U.boxBlur(L, ww, wh, 2);
    const hist = new Float32Array(256); for (const v of Lb) hist[Math.max(0, Math.min(255, Math.round(v * 255)))]++;
    const cdf = new Float32Array(256); let acc = 0; for (let i = 0; i < 256; i++) { acc += hist[i]; cdf[i] = acc / (ww * wh); }
    let mn = 1, mx = 0; for (const v of Lb) { mn = Math.min(mn, v); mx = Math.max(mx, v); }
    const Lc = new Float32Array(ww * wh);
    for (let i = 0; i < ww * wh; i++) { const lin = (L[i] - mn) / Math.max(0.05, mx - mn); const eq = cdf[Math.max(0, Math.min(255, Math.round(L[i] * 255)))]; Lc[i] = Math.max(0, Math.min(1, eq * 0.75 + lin * 0.25)); }
    const Ls = U.blur(Lc, ww, wh, 2);
    const Lt = U.boxBlur(Lc, ww, wh, 3); // tono local
    // tensor de estructura
    const jxx = new Float32Array(ww * wh), jxy = new Float32Array(ww * wh), jyy = new Float32Array(ww * wh);
    for (let y = 1; y < wh - 1; y++) for (let x = 1; x < ww - 1; x++) {
      const i = y * ww + x, a = (dx, dy) => Ls[i + dy * ww + dx];
      const gx = a(1, -1) + 2 * a(1, 0) + a(1, 1) - a(-1, -1) - 2 * a(-1, 0) - a(-1, 1);
      const gy = a(-1, 1) + 2 * a(0, 1) + a(1, 1) - a(-1, -1) - 2 * a(0, -1) - a(1, -1);
      jxx[i] = gx * gx; jxy[i] = gx * gy; jyy[i] = gy * gy;
    }
    const bxx = U.boxBlur(jxx, ww, wh, 6), bxy = U.boxBlur(jxy, ww, wh, 6), byy = U.boxBlur(jyy, ww, wh, 6);
    // orientación A LO LARGO de los bordes (perpendicular al gradiente dominante), en ángulo doble y muy suavizada
    const c2 = new Float32Array(ww * wh), s2 = new Float32Array(ww * wh);
    for (let i = 0; i < ww * wh; i++) {
      const a = bxx[i] - byy[i], b = 2 * bxy[i], coh = Math.hypot(a, b), tr = bxx[i] + byy[i] + 1e-6;
      // ángulo del gradiente θg = ½atan2(b,a); a lo largo del borde = θg+π/2 → doble: 2θg+π
      const w = (coh / tr) * Math.min(1, tr * 30);
      const ang2 = Math.atan2(b, a) + Math.PI;
      c2[i] = Math.cos(ang2) * w; s2[i] = Math.sin(ang2) * w;
      // sesgo hacia la vertical (diaclasas del granito), dominante donde la estructura es débil
      c2[i] += -0.55; // cos(2·90°) = −1
    }
    const sc2 = U.boxBlur(c2, ww, wh, 14), ss2 = U.boxBlur(s2, ww, wh, 14);
    const k = ww / W; // de salida a trabajo
    const samp = (arr, X, Y) => {
      const fx = X * k - 0.5, fy = Y * k - 0.5, ix = Math.max(0, Math.min(ww - 2, Math.floor(fx))), iy = Math.max(0, Math.min(wh - 2, Math.floor(fy))), u = Math.max(0, Math.min(1, fx - ix)), v = Math.max(0, Math.min(1, fy - iy));
      return arr[iy * ww + ix] * (1 - u) * (1 - v) + arr[iy * ww + ix + 1] * u * (1 - v) + arr[(iy + 1) * ww + ix] * (1 - u) * v + arr[(iy + 1) * ww + ix + 1] * u * v;
    };
    const dirAt = (X, Y, rot) => { const a = Math.atan2(samp(ss2, X, Y), samp(sc2, X, Y)) / 2 + rot; return [Math.cos(a), Math.sin(a)]; };
    const tone = (X, Y) => samp(Lt, X, Y);
    const floorY = H * 0.835;
    const edge = (X, Y) => { const e = Math.min(X, W - X, Y, H - Y); return Math.max(0, Math.min(1, (e - 6) / 70)); };
    const t1 = performance.now();
    // juego principal (paredes): se omite el interior de la cueva y la arena
    const main = S.trace({
      w: W, h: H, dsep: gv.dsep, dtest: gv.dsep * 0.45, step: 2, maxLen: 300, minLen: 18, seedStep: gv.dsep * 1.3, oriented: true,
      field: (X, Y) => (tone(X, Y) < 0.13 || Y > floorY - 6 ? null : dirAt(X, Y, 0)),
    });
    const second = S.trace({
      w: W, h: H, dsep: gv.dsep, dtest: gv.dsep * 0.45, step: 2, maxLen: 140, minLen: 14, seedStep: gv.dsep * 1.3, oriented: true,
      field: (X, Y) => (tone(X, Y) < 0.74 || Y > floorY ? null : dirAt(X, Y, (70 * Math.PI) / 180)),
    });
    const t2 = performance.now();
    const minW = cfg.lines.minWidth, maxW = cfg.lines.maxWidthFrac * gv.dsep;
    const wob = (p) => (nz.n2(p[0] * 0.19, p[1] * 0.19) - 0.5) * 2 * cfg.lines.wobble;
    // tono → ancho: paredes oscuras un juego fino, medias uno ancho, roca iluminada y arena un segundo juego a 70°
    const wMain = (p) => { const tt = tone(p[0], p[1]); if (tt < 0.13) return 0; const w = minW + (maxW - minW) * Math.pow(Math.max(0, (tt - 0.3) / 0.55), 1.1); return (w + wob(p)) * edge(p[0], p[1]); };
    const wSec = (p) => { const tt = tone(p[0], p[1]); if (tt < 0.74) return 0; return (minW + (tt - 0.74) * 5 + wob(p)) * edge(p[0], p[1]); };
    function strokes(mul) {
      const c = U.canvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
      x.fillStyle = '#fff';
      for (const Ln of main) S.drawStroke(x, Ln, (p) => { const w = wMain(p); return w > 0.4 ? Math.max(minW * 0.9, w) * mul : 0; }, 9);
      for (const Ln of second) S.drawStroke(x, Ln, (p) => { const w = wSec(p); return w > 0.4 ? Math.max(minW * 0.9, w) * mul : 0; }, 7);
      return c;
    }
    const cA = strokes(1), cB = strokes(1.08);
    // arena del suelo: punteado y trazos cortos casi horizontales
    const sC = U.canvas(W, H), sx = sC.getContext('2d', { willReadFrequently: true });
    const r = PBS.rng(cfg.seed + 41);
    sx.fillStyle = '#fff'; sx.strokeStyle = '#fff'; sx.lineCap = 'round';
    for (let Y = floorY - 30; Y < H; Y += 7) for (let X = 0; X < W; X += 7) {
      const px = X + r() * 5, py = Y + r() * 5, tt = tone(px, py);
      if (tt < 0.3 || py < floorY - 20 + r() * 30) continue;
      const e = edge(px, py); if (r() > e + 0.1) continue;
      const rad = 1.2 + 0.7 * Math.min(1, (tt - 0.3) / 0.5) + 0.2 * r();
      if (r() < 0.07 && tt > 0.5) { sx.lineWidth = 2.3; sx.beginPath(); const l = 5 + r() * 7; sx.moveTo(px - l / 2, py); sx.lineTo(px + l / 2, py + (r() - 0.5) * 1.5); sx.stroke(); }
      else { sx.beginPath(); sx.arc(px, py, rad, 0, Math.PI * 2); sx.fill(); }
    }
    // figuras de noche: cuerpo = plancha sin tallar, filo de luz, tallas escasas, sombra de contacto
    const figBone = U.canvas(W, H), fb = figBone.getContext('2d', { willReadFrequently: true });
    const figs = [];
    for (const f of cfg.figures.grotto) {
      const adultPx = f.pose === 'standBundle' ? (f.h / 760) * 750 : f.pose === 'childCrouch' ? (f.h / 280) * 750 : (f.h / 460) * 750;
      const fig = F.build(f.pose, f.foot[0], f.foot[1], adultPx, f.facing);
      const n = F.renderNight(fig, { light: [-0.8, -0.6], hatchSp: f.h > 200 ? 11 : 9, band: f.h > 200 ? 12 : 8 });
      figs.push({ fig, n, id: f.id });
    }
    const clearWith = (canvas, fn) => {
      const x = canvas.getContext('2d', { willReadFrequently: true });
      const img = x.getImageData(0, 0, W, H), d = img.data;
      fn(d);
      x.putImageData(img, 0, 0);
    };
    for (const cv of [cA, cB, sC]) clearWith(cv, (d) => {
      for (const { fig, n } of figs) {
        for (let y = 0; y < n.h; y++) for (let x = 0; x < n.w; x++) {
          const X = x + n.x0, Y = y + n.y0; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const j = (Y * W + X) * 4, c = n.clear[y * n.w + x]; d[j + 3] = d[j + 3] * (1 - c);
        }
        // sombra de contacto: elipse sin tallar bajo los pies
        const cx = fig.footX, cy = fig.footY + 2, rx = (fig.bb[2] - fig.bb[0]) * 0.62, ry = Math.max(4, fig.heightPx * 0.045);
        for (let Y = Math.floor(cy - ry - 2); Y <= cy + ry + 2; Y++) for (let X = Math.floor(cx - rx - 2); X <= cx + rx + 2; X++) {
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const e = Math.hypot((X - cx) / rx, (Y - cy) / ry); const a = Math.max(0, Math.min(1, (1 - e) * 4));
          const j = (Y * W + X) * 4; d[j + 3] = d[j + 3] * (1 - a);
        }
      }
    });
    clearWith(figBone, (d) => {
      for (const { fig, n } of figs) {
        for (let y = 0; y < n.h; y++) for (let x = 0; x < n.w; x++) {
          const X = x + n.x0, Y = y + n.y0; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const j = (Y * W + X) * 4, v = Math.max(n.rim[y * n.w + x], n.lit[y * n.w + x]);
          d[j] = d[j + 1] = d[j + 2] = 255; d[j + 3] = Math.max(d[j + 3], Math.round(v * 255));
        }
        // trazo de contacto claro, corto, en la arena por delante de los pies
        const cx = fig.footX, cy = fig.footY + Math.max(5, fig.heightPx * 0.045) + 3, len = (fig.bb[2] - fig.bb[0]) * 0.5;
        for (let Y = Math.floor(cy - 3); Y <= cy + 3; Y++) for (let X = Math.floor(cx - len / 2); X <= cx + len / 2; X++) {
          if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
          const tp = Math.min(1, Math.min(X - (cx - len / 2), cx + len / 2 - X) / 8);
          const a = Math.max(0, Math.min(1, 1.3 * tp - Math.abs(Y - cy) + 0.5));
          const j = (Y * W + X) * 4; d[j] = d[j + 1] = d[j + 2] = 255; d[j + 3] = Math.max(d[j + 3], Math.round(a * 255));
        }
      }
    });
    const A = U.alpha(cA), Bw = U.alpha(cB), Sd = U.alpha(sC), Fb = U.alpha(figBone);
    const t3 = performance.now();
    return {
      data: U.pack8(W, H, A, Bw, Sd, Fb), W, H, figs,
      counts: { main: main.length, second: second.length },
      timing: { prep: t1 - t0, trace: t2 - t1, draw: t3 - t2 },
    };
  };
})();
