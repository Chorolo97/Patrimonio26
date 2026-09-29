/* Vista PLANTA: lienzos estáticos (noche y día) con hachuras por línea de máxima pendiente, trama cruzada del acantilado,
 * punteado de arena y puntadas del sendero. Canales: R hachura, G sendero, B arena, A posición a lo largo del sendero. */
(function () {
  const P = (window.CC_PLAN = {});
  const U = window.CC_U, S = window.CC_STREAM;

  P.frame = function (cfg) {
    const v = cfg.views.plan, W = cfg.width, H = cfg.height;
    const mpp = v.widthM / W;
    const x0 = v.center[0] - (W / 2) * mpp, yTop = v.center[1] + (H / 2) * mpp;
    return {
      mpp, x0, yTop, W, H,
      toWorld: (X, Y) => [x0 + X * mpp, yTop - Y * mpp],
      toScreen: (x, y) => [(x - x0) / mpp, (yTop - y) / mpp],
    };
  };

  P.build = function (cfg, terr, rng) {
    const fr = P.frame(cfg), hv = cfg.views.hachure, W = cfg.width, H = cfg.height;
    const os = cfg.views.plan.overscan, CW = Math.round(W * os), CH = Math.round(H * os);
    const mpp = fr.mpp;
    const t0 = performance.now();
    // gradiente del relieve en px de pantalla (h en m)
    const e = 1.2;
    const grad = (X, Y) => {
      const [x, y] = fr.toWorld(X, Y);
      const gx = (terr.h(x + e, y) - terr.h(x - e, y)) / (2 * e), gy = (terr.h(x, y + e) - terr.h(x, y - e)) / (2 * e);
      return [gx, gy];
    };
    const slopeDeg = (gx, gy) => Math.atan(Math.hypot(gx, gy)) * 57.2958;
    const band = (X, Y) => { const [x, y] = fr.toWorld(X, Y); return Math.floor(terr.h(x, y) / 25); };
    // hachuras: línea de máxima pendiente (−∇h), cortadas en cada curva de 25 m
    const fall = S.trace({
      w: W, h: H, dsep: hv.dsep, dtest: hv.dtest, step: hv.step, maxLen: 400, minLen: hv.minLen, seedStep: hv.dsep * 1.5,
      field: (X, Y) => { const [x, y] = fr.toWorld(X, Y); if (terr.h(x, y) < 0.6) return null; const [gx, gy] = grad(X, Y); if (slopeDeg(gx, gy) < hv.minSlopeDeg) return null; return [-gx, gy]; },
    });
    // trazos de hachura de largo muy variable (8–60 px), separados por mellas cortas
    const rs = PBS.rng(cfg.seed + 19);
    const fallCut = [];
    for (const L of fall) {
      let i = 0;
      while (i < L.length - 1) {
        const n = Math.max(3, Math.round((hv.minLen + Math.pow(rs(), 0.7) * (hv.maxLen - hv.minLen)) / hv.step));
        const seg = L.slice(i, i + n + 1); if (seg.length >= 4) fallCut.push(seg);
        i += n + 2 + Math.round(rs() * 2);
      }
    }
    // trama cruzada en el acantilado (sigue la curva de nivel)
    const cliffAt = (X, Y) => { const [gx, gy] = grad(X, Y); const [x, y] = fr.toWorld(X, Y); return terr.h(x, y) >= 0.4 && slopeDeg(gx, gy) >= 7 && gx > Math.abs(gy) * 0.6; };
    const cross = S.trace({
      w: W, h: H, dsep: 8, dtest: 4, step: hv.step, maxLen: 120, minLen: 14, seedStep: 5,
      oriented: true,
      field: (X, Y) => { if (!cliffAt(X, Y)) return null; const [gx, gy] = grad(X, Y); return [gy, gx]; },
    });
    // tercer juego (diagonal) en lo más hondo del acantilado
    const third = S.trace({
      w: W, h: H, dsep: 10, dtest: 5, step: hv.step, maxLen: 50, minLen: 10, seedStep: 6,
      oriented: true,
      field: (X, Y) => { if (!cliffAt(X, Y)) return null; const [gx, gy] = grad(X, Y); const a = Math.atan2(gx, gy) + 0.8; return [Math.cos(a), Math.sin(a)]; },
    });
    // noche: fracturas finas a lo largo de la pendiente en el acantilado (la pared queda como un filo claro)
    const frac = S.trace({
      w: W, h: H, dsep: 13, dtest: 6, step: hv.step, maxLen: 40, minLen: 10, seedStep: 7,
      field: (X, Y) => { if (!cliffAt(X, Y)) return null; const [gx, gy] = grad(X, Y); return [-gx, gy]; },
    });
    const t1 = performance.now();
    // sombreado
    const az = (hv.sunAz * Math.PI) / 180, el = (hv.sunEl * Math.PI) / 180;
    const sunD = [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];
    const sunN = [Math.cos((25 * Math.PI) / 180), 0.0, Math.sin((25 * Math.PI) / 180)]; // cielo del este antes del alba
    const lam = (gx, gy, L) => { const n = Math.hypot(gx, gy, 1); return (-gx * L[0] - gy * L[1] + L[2]) / n; };
    const minW = cfg.lines.minWidth, maxW = cfg.lines.maxWidthFrac * hv.dsep;
    const widthDay = (X, Y) => {
      const [gx, gy] = grad(X, Y), sl = slopeDeg(gx, gy), l = lam(gx, gy, sunD);
      // tono por la luz (sol del ESE, 12°): caras al oeste anchas, laderas del este finas
      const k = Math.max(0, Math.min(1, (0.36 - l) / 0.6));
      return Math.max(2.9, (3.0 + (maxW - 3.0) * k) * (0.82 + 0.18 * Math.min(1, sl / hv.slopeFull)));
    };
    const widthNight = (X, Y) => {
      const [gx, gy] = grad(X, Y), sl = slopeDeg(gx, gy), l = lam(gx, gy, sunN);
      // noche (lógica de línea blanca): las caras del este, que reciben el cielo del alba, se tallan anchas; el oeste queda sin tallar
      const k = (l - 0.47) / 0.3;
      return k < 0 ? 0 : (minW + (maxW - 1 - minW) * Math.min(1, k)) * (0.8 + 0.2 * Math.min(1, sl / hv.slopeFull));
    };
    // ruido fijo de "sangrado" de tinta ±0,35 px
    const nz = PBS.makeNoise(cfg.seed + 11);
    const wob = (p) => (nz.n2(p[0] * 0.21, p[1] * 0.21) - 0.5) * 2 * cfg.lines.wobble;
    const segLen = (L) => { let a = 0; for (let i = 1; i < L.length; i++) a += Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); return a; };
    function hatchCanvas(widthFn, day) {
      const c = U.canvas(CW, CH), x = c.getContext('2d', { willReadFrequently: true });
      x.scale(os, os); x.fillStyle = '#fff';
      // tono: ancho primero; afinado fuerte en las puntas (≈ 40 % del largo)
      fallCut.forEach((L) => {
        const m = L[Math.floor(L.length / 2)], w0 = widthFn(m[0], m[1]);
        if (w0 < 1.0) return;
        S.drawStroke(x, L, (p) => { const w = widthFn(p[0], p[1]); return w < 0.8 ? 0 : Math.min(maxW, Math.max(minW, w)) + wob(p); }, Math.max(4, segLen(L) * 0.4));
      });
      if (day) {
        for (const L of cross) S.drawStroke(x, L, (p) => 3.4 + wob(p), 6);
        for (const L of third) S.drawStroke(x, L, (p) => 2.4 + wob(p), 5);
      } else {
        for (const L of frac) S.drawStroke(x, L, (p) => 2.2 + wob(p) * 0.4, Math.max(3, segLen(L) * 0.35));
      }
      return U.alpha(c);
    }
    let hachDay = hatchCanvas(widthDay, true), hachNight = hatchCanvas(widthNight, false);
    const t2 = performance.now();
    // arena: rejilla hash de 7 px, radio por tono (≥ 1,2 px)
    const sc = U.canvas(CW, CH), sx = sc.getContext('2d', { willReadFrequently: true });
    sx.scale(os, os); sx.fillStyle = '#fff';
    const r = PBS.rng(cfg.seed + 5);
    for (let Y = 0; Y < H; Y += 7) for (let X = 0; X < W; X += 7) {
      const px = X + r() * 5, py = Y + r() * 5, rr = r();
      const [x, y] = fr.toWorld(px, py);
      const m = terr.sandAt(x, y); if (m < 0.35 || terr.h(x, y) <= 0.05) continue;
      if (rr > m * 1.4) continue;
      const wet = Math.max(0, 1 - Math.max(0, -terr.D(x, y)) / 22);
      const rad = 1.2 + 0.55 * wet + 0.25 * r();
      sx.beginPath(); sx.arc(px, py, rad, 0, Math.PI * 2); sx.fill();
    }
    // plataforma de la punta: 5–8 bloques de 8–14 px con canto firme y dos o tres tallas dentro
    {
      const tipS = fr.toScreen(cfg.world.tip[0], cfg.world.tip[1]), placed = [];
      sx.strokeStyle = '#fff'; sx.lineCap = 'round';
      for (let tries = 0; tries < 400 && placed.length < 7; tries++) {
        const a = r() * Math.PI * 2, rr = 6 + r() * 42, bx = tipS[0] + Math.cos(a) * rr, by = tipS[1] + Math.sin(a) * rr * 0.8;
        const [wx, wy] = fr.toWorld(bx, by); if (terr.h(wx, wy) < 0.2 || terr.D(wx, wy) > -2) continue;
        const R = 4 + r() * 3; if (placed.some((q) => Math.hypot(q[0] - bx, q[1] - by) < q[2] + R + 3)) continue;
        placed.push([bx, by, R]);
        const rot = r() * Math.PI, ry = R * (0.65 + 0.25 * r());
        sx.lineWidth = 2.3; sx.beginPath(); sx.ellipse(bx, by, R, ry, rot, 0, Math.PI * 2); sx.stroke();
        sx.save(); sx.beginPath(); sx.ellipse(bx, by, R, ry, rot, 0, Math.PI * 2); sx.clip(); sx.lineWidth = 2.2;
        for (let k = -1; k <= 1; k++) { const o = k * 4.2; sx.beginPath(); sx.moveTo(bx - R + o, by - R); sx.lineTo(bx + o + R * 0.2, by + R); sx.stroke(); }
        sx.restore();
      }
    }
    const sand = U.alpha(sc);
    // pradera: punteado muy ralo y matas de monte bajo (racimos de puntos), fijos
    const gc = U.canvas(CW, CH), gx2 = gc.getContext('2d', { willReadFrequently: true });
    gx2.scale(os, os); gx2.fillStyle = '#fff';
    const nzg = PBS.makeNoise(cfg.seed + 9);
    for (let Y = 0; Y < H; Y += 9) for (let X = 0; X < W; X += 9) {
      const px = X + r() * 7, py = Y + r() * 7, [x, y] = fr.toWorld(px, py);
      const hh = terr.h(x, y), sd = terr.sandAt(x, y), rk = terr.rockAt(x, y);
      if (hh < 1.2 || sd > 0.2 || rk > 0.3 || hh > 20) continue;
      const [gxx, gyy] = grad(px, py); if (slopeDeg(gxx, gyy) > 4) continue;
      const dens = 0.1 + 0.25 * Math.max(0, nzg.fbm(x / 260, y / 260, 3) - 0.45);
      if (r() > dens) continue;
      gx2.beginPath(); gx2.arc(px, py, 1.2 + 0.2 * r(), 0, Math.PI * 2); gx2.fill();
    }
    for (let k = 0; k < 900; k++) { // monte: racimos en derivas
      const px = r() * W, py = r() * H, [x, y] = fr.toWorld(px, py);
      const hh = terr.h(x, y); if (hh < 1.5 || hh > 30 || terr.sandAt(x, y) > 0.1 || terr.rockAt(x, y) > 0.2) continue;
      { const [ga, gb] = grad(px, py); if (slopeDeg(ga, gb) > 6) continue; }
      if (nzg.fbm(x / 300 + 3, y / 300, 3) < 0.47) continue;
      const n = 5 + Math.floor(r() * 6);
      for (let j = 0; j < n; j++) { const a = r() * 6.28, rr = 2 + r() * 7; gx2.beginPath(); gx2.arc(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.7, 1.25 + 0.3 * r(), 0, Math.PI * 2); gx2.fill(); }
    }
    const grass = U.alpha(gc);
    // sendero antiguo: puntadas ocres de 6×3 px cada 11 px, serpenteo ±15 m
    const tc = U.canvas(CW, CH), tx = tc.getContext('2d', { willReadFrequently: true });
    tx.scale(os, os);
    const path = P.trailPath(cfg, terr);
    const scr = path.map((p) => fr.toScreen(p[0], p[1]));
    const acc = [0]; for (let i = 1; i < scr.length; i++) acc.push(acc[i - 1] + Math.hypot(scr[i][0] - scr[i - 1][0], scr[i][1] - scr[i - 1][1]));
    const tot = acc[acc.length - 1];
    let seg = 0;
    for (let s = 3; s < tot; s += 12) {
      while (seg < scr.length - 2 && acc[seg + 1] < s) seg++;
      const u = (s - acc[seg]) / Math.max(1e-6, acc[seg + 1] - acc[seg]);
      const a = scr[seg], b = scr[seg + 1];
      const px = a[0] + (b[0] - a[0]) * u, py = a[1] + (b[1] - a[1]) * u;
      if (px < -10 || py < -10 || px > W + 10 || py > H + 10) continue;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const v = Math.round((s / tot) * 250) + 4;
      tx.save(); tx.translate(px, py); tx.rotate(ang); tx.fillStyle = `rgb(${v},${v},${v})`;
      tx.beginPath(); if (tx.roundRect) tx.roundRect(-3.5, -1.75, 7, 3.5, 1.6); else tx.rect(-3.5, -1.75, 7, 3.5); tx.fill(); tx.restore();
    }
    const td = tx.getImageData(0, 0, CW, CH).data;
    const trailA = new Float32Array(CW * CH), trailP = new Float32Array(CW * CH);
    for (let i = 0; i < CW * CH; i++) { trailA[i] = td[i * 4 + 3] / 255; trailP[i] = td[i * 4 + 3] > 0 ? td[i * 4] / 255 : 0; }
    const t3 = performance.now();
    for (let i = 0; i < CW * CH; i++) { hachDay[i] = Math.max(hachDay[i], grass[i]); hachNight[i] = Math.max(hachNight[i], grass[i] * 0.85); }
    return {
      CW, CH, fr,
      night: U.pack8(CW, CH, hachNight, trailA, sand, trailP),
      day: U.pack8(CW, CH, hachDay, trailA, sand, trailP),
      counts: { fall: fall.length, cut: fallCut.length, cross: cross.length, third: third.length, frac: frac.length },
      timing: { trace: t1 - t0, draw: t2 - t1, sandTrail: t3 - t2 },
    };
  };

  // Sendero: polilínea de config con serpenteo de ±15 m (fijo, con semilla)
  P.trailPath = function (cfg, terr) {
    const W = cfg.world, nz = PBS.makeNoise(cfg.seed + 23);
    const out = [];
    for (let i = 0; i < W.trail.length - 1; i++) {
      const a = W.trail[i], b = W.trail[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.ceil(L / 8));
      const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L;
      for (let k = 0; k < n; k++) {
        const u = k / n, x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u;
        const m = (nz.fbm(x / 140, y / 140, 3) - 0.5) * 2 * W.trailMeander * 1.6;
        out.push([x - ty * m, y + tx * m]);
      }
    }
    out.push(W.trail[W.trail.length - 1]);
    return out;
  };
})();
