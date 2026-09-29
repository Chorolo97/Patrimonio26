/*
 * Planos del reel. Cada plano se pinta una vez en capas (cielo, sierra, ladera, agua, orilla, roca, primer plano)
 * y se anima con desplazamientos diferenciales suaves, agua ondulando, pasto oscilando y personajes.
 * Evocación artística del territorio antes de sus transformaciones modernas (sin forestación, caminos ni edificios).
 */
(function () {
  const PB = (window.PB = window.PB || {});
  const W = 1080;
  const WN = PB.makeNoise(777); // ondulación de las crestas

  // Paleta común: azul grisáceo del agua, verde oliva apagado, ocre, piedra y luz cálida.
  const P = {
    olive: '#6f7446', oliveD: '#565c38', oliveL: '#8a8a55', ochre: '#a8935a', ochreL: '#bfa76c', straw: '#c4b07a',
    shrub: '#4a5334', shrubL: '#66704a', shrubD: '#394128',
    stone: '#8d8577', stoneL: '#b3a996', stoneD: '#57504a', lichen: '#a88f55',
    sand: '#cdb893', sandL: '#dcc9a3', sandD: '#b4a07c', wet: '#9d9179',
    water: '#6d8592', waterD: '#566e7b', waterL: '#a6b5b9', waterFar: '#9fb0b6',
    foam: '#f3efe4', haze: '#c9cbc2',
  };
  PB.PALETTE = P;

  // ---------------- Pintores ----------------
  // Perfil con tramos anulados (el terreno no existe donde pred(x) es verdadero).
  function masked(f, pred) {
    const pts = f.pts.map(([x, y]) => [x, pred(x) ? 4000 : y]);
    const g = (x) => (pred(x) ? 4000 : f(x));
    g.pts = pts;
    g.minY = Math.min(...pts.map((q) => q[1]));
    return g;
  }
  function freeLayer(y0, y1, paint, seed) {
    const L = PB.layer(W, y0, y1);
    paint(L.ctx);
    PB.texturize(L.canvas, seed, 0.1, 1);
    return L;
  }
  function skyLayer(y1, o) {
    const L = PB.layer(W, 0, y1);
    const ctx = L.ctx, M = L.M;
    const span = y1 + 2 * M;
    const g = ctx.createLinearGradient(0, -M, 0, y1 + M);
    for (const [y, c] of o.stops) g.addColorStop(PB.clamp((y + M) / span, 0, 1), c);
    ctx.fillStyle = g;
    ctx.fillRect(-M, -M, W + 2 * M, span);
    if (o.sun) {
      const s = o.sun;
      const rg = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      rg.addColorStop(0, PB.css(s.col, s.a));
      rg.addColorStop(0.3, PB.css(s.col, s.a * 0.5));
      rg.addColorStop(1, PB.css(s.col, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(-M, -M, W + 2 * M, span);
    }
    for (const b of o.clouds || []) {
      PB.strokes(ctx, { n: b.n, box: [-M, b.y - b.h / 2, W + M, b.y + b.h / 2], cols: b.cols, alpha: b.alpha || [0.03, 0.12], len: b.len || [90, 300], width: b.width || [6, 20], ang: [-0.035, 0.035], seed: b.seed, bend: 0.04, jit: 0.02 });
    }
    PB.texturize(L.canvas, o.seed || 3, 0.06, 0.5);
    return L;
  }

  function landLayer(f, yB, o) {
    const L = PB.layer(W, f.minY - 8, yB, o.margin || 90);
    const ctx = L.ctx, M = L.M;
    PB.pathBelow(ctx, f, o.ext === false ? yB : yB + M);
    const g = ctx.createLinearGradient(0, f.minY, 0, o.gradEnd || yB);
    for (const [k, c] of o.grad) g.addColorStop(k, c);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.save();
    ctx.clip();
    const test = (x, y) => y > f(x) + 1;
    let sd = o.seed || 1;
    for (const s of o.strokes || []) PB.strokes(ctx, Object.assign({ box: [-M, f.minY, W + M, yB + M], test, seed: sd++ }, s));
    if (o.paint) o.paint(ctx, f, L);
    ctx.restore();
    if (o.rim) {
      ctx.save();
      ctx.beginPath();
      let pen = false;
      for (const [x, y] of f.pts) {
        if (y > yB) { pen = false; continue; }
        if (pen) ctx.lineTo(x, y + o.rim.off); else ctx.moveTo(x, y + o.rim.off);
        pen = true;
      }
      ctx.strokeStyle = PB.css(o.rim.col, o.rim.a);
      ctx.lineWidth = o.rim.w;
      ctx.stroke();
      ctx.restore();
    }
    if (o.fringe) {
      const r = PB.rng(sd + 50);
      ctx.save();
      ctx.lineCap = 'round';
      const fr = o.fringe;
      for (let x = -M; x < W + M; x += fr.step) {
        const y = f(x) + 1.5;
        if (y > yB) continue;
        const n = 1 + Math.floor(r() * 3);
        for (let k = 0; k < n; k++) {
          const xx = x + r() * fr.step, len = fr.len[0] + r() * (fr.len[1] - fr.len[0]);
          ctx.globalAlpha = 0.5 + r() * 0.5;
          ctx.strokeStyle = PB.css(PB.jitter(fr.cols[Math.floor(r() * fr.cols.length)], r, 0.08));
          ctx.lineWidth = fr.w * (0.6 + r() * 0.8);
          ctx.beginPath();
          ctx.moveTo(xx, y + 2);
          ctx.lineTo(xx + (r() - 0.3) * len * 0.5, y - len);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    if (o.after) o.after(ctx, f, L);
    if (o.erase) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      o.erase.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    PB.texturize(L.canvas, sd + 7, o.mottle == null ? 0.13 : o.mottle, 1);
    return L;
  }

  function waterLayer(y0, y1, o) {
    const L = PB.layer(W, y0, y1, 90);
    const ctx = L.ctx, M = L.M;
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    for (const [k, c] of o.grad) g.addColorStop(k, c);
    ctx.fillStyle = g;
    ctx.fillRect(-M, y0, W + 2 * M, y1 - y0 + M);
    const r = PB.rng(o.seed || 5);
    ctx.save();
    ctx.lineCap = 'round';
    const lights = (o.lights || [P.waterL, '#b9c3c4']).map(PB.hex);
    const darks = (o.darks || [P.waterD, '#5f7582']).map(PB.hex);
    for (let i = 0; i < (o.n || 2600); i++) {
      const d = Math.pow(r(), 0.85);
      const y = y0 + 2 + d * (y1 - y0);
      const len = PB.lerp(18, 170, d) * (0.4 + r());
      const w = PB.lerp(0.6, 3.4, d) * (0.7 + r() * 0.6);
      const x = -M + r() * (W + 2 * M);
      const light = r() < (o.lightRatio || 0.55);
      ctx.globalAlpha = PB.lerp(0.1, 0.38, r()) * (light ? 1 : 0.9);
      ctx.strokeStyle = PB.css(PB.jitter(light ? lights[Math.floor(r() * lights.length)] : darks[Math.floor(r() * darks.length)], r, 0.04));
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + (r() - 0.5) * 1.2);
      ctx.stroke();
    }
    if (o.glint) {
      const gl = o.glint;
      for (let i = 0; i < gl.n; i++) {
        const d = Math.pow(r(), 0.9);
        const y = y0 + 2 + d * (y1 - y0) * (gl.depth || 1);
        const spread = PB.lerp(gl.s0 || 12, gl.s1 || 160, d);
        const gx = gl.x + (r() + r() + r() - 1.5) * spread;
        ctx.globalAlpha = PB.lerp(0.15, 0.6, r()) * (1 - d * 0.5);
        ctx.strokeStyle = PB.css(gl.col || '#f4e4c0');
        ctx.lineWidth = PB.lerp(0.8, 3, d);
        ctx.beginPath();
        ctx.moveTo(gx, y);
        ctx.lineTo(gx + PB.lerp(6, 40, d) * (0.5 + r()), y);
        ctx.stroke();
      }
    }
    ctx.restore();
    PB.texturize(L.canvas, (o.seed || 5) + 3, 0.07, 0.6);
    return L;
  }

  // Contorno de roca: aristas rectas con esquinas apenas redondeadas (piedra facetada, no canto rodado).
  function rockPath(ctx, pts) {
    const n = pts.length;
    const cut = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n], cur = pts[i], next = pts[(i + 1) % n];
      const p1 = cut(cur, prev, 0.18), p2 = cut(cur, next, 0.18);
      if (i === 0) ctx.moveTo(p1[0], p1[1]);
      else ctx.lineTo(p1[0], p1[1]);
      ctx.quadraticCurveTo(cur[0], cur[1], p2[0], p2[1]);
    }
    ctx.closePath();
  }

  function paintRock(ctx, pts, o = {}) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const base = o.base || P.stone, light = o.light || P.stoneL, dark = o.dark || P.stoneD;
    const lit = o.lit || -1;
    ctx.save();
    rockPath(ctx, pts);
    const g = ctx.createLinearGradient(lit < 0 ? x0 : x1, y0, lit < 0 ? x1 : x0, y1);
    g.addColorStop(0, light);
    g.addColorStop(0.45, base);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    const area = (x1 - x0) * (y1 - y0);
    const ang = o.strata == null ? -0.35 : o.strata;
    PB.strokes(ctx, { n: Math.min(1400, area / 260), box: [x0, y0, x1, y1], cols: [light, base, dark, base], alpha: [0.12, 0.34], len: [8, 38], width: [2, 6], ang: [ang - 0.18, ang + 0.18], seed: o.seed || 3, jit: 0.07 });
    // grietas siguiendo la estratificación
    const r = PB.rng((o.seed || 3) + 11);
    ctx.lineCap = 'round';
    const nc = Math.max(2, Math.floor(area / 9000));
    for (let i = 0; i < nc; i++) {
      const cx = x0 + r() * (x1 - x0), cy = y0 + r() * (y1 - y0);
      const len = 30 + r() * Math.min(260, (x1 - x0) * 0.8);
      ctx.globalAlpha = 0.25 + r() * 0.3;
      ctx.strokeStyle = PB.css(PB.shade(dark, 0.8));
      ctx.lineWidth = 1 + r() * 2.2;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(ang) * len / 2, cy - Math.sin(ang) * len / 2);
      ctx.quadraticCurveTo(cx + (r() - 0.5) * 12, cy + (r() - 0.5) * 12, cx + Math.cos(ang) * len / 2, cy + Math.sin(ang) * len / 2);
      ctx.stroke();
    }
    // planos facetados: el lado hacia la luz más claro
    ctx.globalAlpha = 1;
    for (let f = 0; f < 2 + Math.floor(r() * 2); f++) {
      const tx = PB.lerp(x0, x1, 0.25 + r() * 0.5), bx = tx + (r() - 0.5) * (x1 - x0) * 0.5;
      const kx = PB.lerp(tx, bx, 0.5) + (r() - 0.5) * 30, ky = PB.lerp(y0, y1, 0.35 + r() * 0.3);
      const side = lit < 0 ? x0 - 5 : x1 + 5;
      ctx.beginPath();
      ctx.moveTo(tx, y0 - 5); ctx.lineTo(kx, ky); ctx.lineTo(bx, y1 + 5); ctx.lineTo(side, y1 + 5); ctx.lineTo(side, y0 - 5); ctx.closePath();
      ctx.fillStyle = PB.css(f % 2 ? light : PB.mix(light, base, 0.5), 0.16);
      ctx.fill();
      ctx.strokeStyle = PB.css(PB.shade(dark, 0.9), 0.35);
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(tx, y0 - 5); ctx.lineTo(kx, ky); ctx.lineTo(bx, y1 + 5); ctx.stroke();
    }
    // oclusión en la base
    const og = ctx.createLinearGradient(0, y0 + (y1 - y0) * 0.55, 0, y1);
    og.addColorStop(0, 'rgba(40,34,28,0)');
    og.addColorStop(1, `rgba(40,34,28,${o.occ == null ? 0.35 : o.occ})`);
    ctx.fillStyle = og;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (o.lichen) PB.dabs(ctx, { n: o.lichen, box: [x0, y0, x0 + (x1 - x0), y0 + (y1 - y0) * 0.6], cols: [P.lichen, '#9c9468'], r: [1.5, 4.5], alpha: [0.25, 0.55], seed: (o.seed || 3) + 5 });
    if (o.wet) {
      const wg = ctx.createLinearGradient(0, y1 - o.wet, 0, y1);
      wg.addColorStop(0, 'rgba(45,52,55,0)');
      wg.addColorStop(1, 'rgba(45,52,55,0.45)');
      ctx.fillStyle = wg;
      ctx.fillRect(x0, y1 - o.wet, x1 - x0, o.wet);
    }
    ctx.restore();
    // borde superior iluminado y contorno suave
    ctx.save();
    rockPath(ctx, pts);
    ctx.strokeStyle = 'rgba(38,31,26,0.3)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }

  function paintShrub(ctx, x, y, rad, seed, o = {}) {
    const r = PB.rng(seed);
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#2c3020';
    ctx.beginPath();
    ctx.ellipse(x + rad * 0.15, y + rad * 0.05, rad * 1.1, rad * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    const cols = (o.cols || [P.shrubD, P.shrub, P.shrubL]).map(PB.hex);
    const n = 10 + Math.floor(rad * 0.9);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r());
      const px = x + Math.cos(a) * d * rad, py = y - rad * 0.55 + Math.sin(a) * d * rad * 0.55;
      const top = PB.clamp((y - py) / rad, 0, 1);
      const ci = Math.min(2, Math.floor(top * 2.2 + r() * 0.8));
      ctx.globalAlpha = 0.65 + r() * 0.35;
      ctx.fillStyle = PB.css(PB.jitter(cols[ci], r, 0.07));
      const rr = rad * (0.22 + r() * 0.25);
      ctx.beginPath();
      ctx.ellipse(px, py, rr, rr * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // toques de luz lateral
    const lit = o.lit || -1;
    for (let i = 0; i < n / 3; i++) {
      const px = x + lit * rad * (0.2 + r() * 0.6), py = y - rad * (0.5 + r() * 0.5);
      ctx.globalAlpha = 0.25 + r() * 0.3;
      ctx.fillStyle = PB.css(PB.jitter(o.light || '#8b8e5c', r, 0.05));
      ctx.beginPath();
      ctx.arc(px, py, rad * (0.1 + r() * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Sendero: huella de paso gastada, más ancha hacia el espectador.
  function paintTrail(ctx, pts, w0, w1, seed) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const n = pts.length;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n - 1; i++) {
        const k = i / (n - 1);
        ctx.strokeStyle = pass === 0 ? 'rgba(150,132,96,0.55)' : 'rgba(205,188,146,0.55)';
        ctx.lineWidth = PB.lerp(w0, w1, k) * (pass === 0 ? 1.25 : 0.6);
        ctx.beginPath();
        ctx.moveTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
        ctx.stroke();
      }
    }
    const r = PB.rng(seed);
    for (let i = 0; i < n * 5; i++) {
      const k = r() * (n - 1), i0 = Math.floor(k), u = k - i0;
      const a = pts[i0], b = pts[Math.min(n - 1, i0 + 1)];
      const x = PB.lerp(a[0], b[0], u), y = PB.lerp(a[1], b[1], u);
      const w = PB.lerp(w0, w1, k / (n - 1));
      ctx.globalAlpha = 0.35 + r() * 0.4;
      ctx.strokeStyle = PB.css(PB.jitter(r() < 0.5 ? P.olive : P.ochre, r, 0.08));
      ctx.lineWidth = 1 + r() * 2;
      const yy = y + (r() < 0.5 ? -1 : 1) * w * (0.35 + r() * 0.2);
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x + (r() - 0.5) * 4, yy - 3 - r() * w * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }
  const polyY = (pts) => (x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) return PB.lerp(pts[i][1], pts[i + 1][1], (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]));
    return pts[pts.length - 1][1];
  };

  // Pasto animado (primer plano): hojas agrupadas por color para dibujar rápido.
  function makeBlades(seed, n, place, o) {
    const r = PB.rng(seed);
    const groups = o.cols.map((c) => ({ col: PB.css(c), w: 0, blades: [] }));
    for (let i = 0; i < n; i++) {
      const p = place(r);
      if (!p) continue;
      const g = groups[Math.floor(r() * groups.length)];
      const sc = p.s || 1;
      g.blades.push({ x: p.x, y: p.y, len: PB.lerp(o.len[0], o.len[1], r()) * sc, lean: (r() - 0.35) * 0.5, ph: r() * 6.28, sp: 0.8 + r() * 0.7, amp: (2 + r() * 4) * sc });
    }
    groups.forEach((g, i) => (g.w = o.w[0] + (o.w[1] - o.w[0]) * (i / Math.max(1, groups.length - 1))));
    return groups;
  }
  function drawBlades(ctx, t, groups, wind = 1) {
    ctx.save();
    ctx.lineCap = 'round';
    for (const g of groups) {
      ctx.strokeStyle = g.col;
      ctx.lineWidth = g.w;
      ctx.beginPath();
      for (const b of g.blades) {
        const sway = (Math.sin(t * b.sp + b.ph + b.x * 0.012) * 0.6 + Math.sin(t * 0.5 + b.x * 0.004) * 0.4) * b.amp + wind * b.amp * 0.6;
        const tx = b.x + b.lean * b.len + sway, ty = b.y - b.len * (1 - Math.abs(sway) / (b.len * 4));
        ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(b.x + b.lean * b.len * 0.3, b.y - b.len * 0.55, tx, ty);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // Lámina de agua que sube y baja sobre la arena con borde de espuma.
  function drawSwash(ctx, t, o) {
    const { line, x0 = -100, x1 = W + 100, amp, period = 6.5, seed = 1, down = 1 } = o;
    const ph = (t / period) * Math.PI * 2 + seed;
    const reach = 0.5 + 0.5 * Math.sin(ph);
    const edge = [];
    for (let x = x0; x <= x1; x += 12) {
      const e = line(x) + down * amp * (0.25 + 0.75 * reach) * (0.75 + 0.25 * Math.sin(x * 0.011 + seed * 3 + t * 0.2));
      edge.push([x, e]);
    }
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x0, line(x0) - down * 6);
    for (let x = x0; x <= x1; x += 12) ctx.lineTo(x, line(x) - down * 6);
    for (let i = edge.length - 1; i >= 0; i--) ctx.lineTo(edge[i][0], edge[i][1]);
    ctx.closePath();
    ctx.fillStyle = PB.css(o.sheet || '#8fa2a6', 0.5);
    ctx.fill();
    // borde de espuma: banda suave + línea principal irregular + línea secundaria rota
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const w = o.w || 3;
    const path = (dy) => { ctx.beginPath(); edge.forEach(([x, y], i) => (i ? ctx.lineTo(x, y + dy) : ctx.moveTo(x, y + dy))); };
    path(0);
    ctx.strokeStyle = PB.css(P.foam, 0.12 + 0.14 * reach);
    ctx.lineWidth = w * 4.5;
    ctx.stroke();
    ctx.strokeStyle = PB.css(P.foam, 0.5 + 0.35 * reach);
    ctx.lineWidth = w;
    ctx.setLineDash([90, 5, 34, 3, 140, 7, 55, 4, 20, 6]);
    ctx.lineDashOffset = -t * 5 + seed * 37;
    ctx.stroke();
    path(-down * w * 2.4);
    ctx.strokeStyle = PB.css(P.foam, 0.06 + 0.16 * reach);
    ctx.lineWidth = w * 0.5;
    ctx.setLineDash([10, 34, 24, 46, 6, 28]);
    ctx.lineDashOffset = t * 3 + seed * 11;
    ctx.stroke();
    ctx.restore();
  }

  // Destellos del agua que titilan.
  function makeGlints(seed, n, place) {
    const r = PB.rng(seed);
    const g = [];
    for (let i = 0; i < n; i++) { const p = place(r); if (p) g.push({ ...p, ph: r() * 6.28, sp: 0.8 + r() * 1.6, len: p.len || 6 + r() * 16 }); }
    return g;
  }
  function drawGlints(ctx, t, glints, col = '#f6ead0') {
    ctx.save();
    ctx.strokeStyle = PB.css(col);
    ctx.lineCap = 'round';
    for (const g of glints) {
      const a = Math.pow(Math.max(0, Math.sin(t * g.sp + g.ph)), 3) * g.a;
      if (a < 0.02) continue;
      ctx.globalAlpha = a;
      ctx.lineWidth = g.w;
      const dx = Math.sin(t * 0.7 + g.ph) * 3;
      ctx.beginPath();
      ctx.moveTo(g.x + dx, g.y);
      ctx.lineTo(g.x + dx + g.len, g.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Textura de ola: cara oscura al frente, cresta blanca y espuma en encaje por detrás (generada una vez).
  function foamTexture(w, h, seed, o = {}) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const N = PB.makeNoise(seed);
    const fc = PB.hex(P.foam), dc = PB.hex('#465e6c');
    const yc = h * (o.center || 0.3), trail = o.trail || 0.4, amt = o.alpha || 1;
    for (let x = 0; x < w; x++) {
      const wob = (N.fbm(x / 90, 3.3, 3) - 0.5) * h * 0.12;
      const fadeX = PB.smooth(Math.min(x, w - x) / 160);
      for (let y = 0; y < h; y++) {
        const d = (y - yc - wob) / h;
        const crest = Math.exp(-Math.pow(d / 0.035, 2)) * (0.6 + 0.4 * N.n2(x / 18, y / 7));
        const behind = d > 0 ? Math.exp(-d / trail) : 0;
        const lace = PB.smooth((N.fbm(x / 58, y / 20, 4) - 0.42) / 0.16) * (0.35 + 0.65 * PB.smooth((N.fbm(x / 13 + 50, y / 8, 3) - 0.36) / 0.28));
        const foam = Math.max(crest, behind * lace * 0.85) * fadeX * amt;
        const face = d < 0 ? Math.exp(-Math.pow(d / 0.1, 2)) * 0.32 * fadeX * (o.face == null ? 1 : o.face) : 0;
        const i = (y * w + x) * 4;
        const useFoam = foam >= face;
        const col = useFoam ? fc : dc;
        img.data[i] = col[0];
        img.data[i + 1] = col[1];
        img.data[i + 2] = col[2];
        img.data[i + 3] = PB.clamp((useFoam ? foam : face) * 255, 0, 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  // ---------------- Plano genérico ----------------
  function makeShot(id, start, end, T, cam, items) {
    return {
      id, start, end, cam, items,
      t0: start - T / 2, t1: end + T / 2,
      draw(ctx, t) {
        const u = PB.clamp((t - this.t0) / (this.t1 - this.t0), 0, 1);
        const cx = PB.lerp(cam.from[0], cam.to[0], u), cy = PB.lerp(cam.from[1], cam.to[1], u), z = PB.lerp(cam.from[2], cam.to[2], u);
        const tau = t - start;
        for (const it of items) {
          const p = it.p == null ? 1 : it.p;
          const s = 1 + (z - 1) * p;
          ctx.setTransform(s, 0, 0, s, 540 * (1 - s) + cx * p, 960 * (1 - s) + cy * p);
          if (it.L && !it.water) ctx.drawImage(it.L.canvas, it.L.ox, it.L.oy);
          else if (it.water) drawWaterStrips(ctx, it, t);
          if (it.fn) it.fn(ctx, t, tau);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      },
    };
  }
  function drawWaterStrips(ctx, it, t) {
    const L = it.L, c = L.canvas, sh = 4;
    const y0 = it.y0, y1 = L.oy + c.height;
    for (let y = y0; y < y1; y += sh) {
      const d = PB.clamp((y - y0) / (it.depth || 600), 0, 1);
      const env = 0.55 + 0.45 * Math.sin(y * 0.0043 + t * 0.35 + (it.seed || 0));
      const off = (it.amp || 3) * d * env * (Math.sin(y * 0.06 + t * 1.7) * 0.65 + Math.sin(y * 0.017 - t * 0.9) * 0.35);
      const sy = y - L.oy;
      const hh = Math.min(sh, c.height - sy);
      if (hh <= 0) break;
      ctx.drawImage(c, 0, sy, c.width, hh, L.ox + off, y, c.width, hh);
    }
  }

  const figure = (id, H, x, y, dir, pose, t, extra = {}) => ({ id, H, x, y, dir, pose, t, ...extra });
  function drawFigures(ctx, list, shared) {
    for (const f of list) PB.drawFigure(ctx, PB.CHARACTERS[f.id], f.pose, Object.assign({ H: f.H, x: f.x, y: f.y, dir: f.dir, t: f.t, seed: f.seed || 0 }, shared, f.o || {}));
  }
  // Caminante sobre una línea de suelo: devuelve figura lista para dibujar.
  function walker(id, t, o) {
    const tr = PB.walkTrack(t, o);
    const x = o.x0 + o.dir * tr.s;
    const sN = PB.clamp(tr.v / Math.max(1, tr.vmax), 0, 1);
    const pose = PB.pose.walk(tr.s / o.H, sN, t, { step: o.step || 0.27, phase: o.phase || 0, lean: o.lean, look: o.look, seed: o.seed, armSwing: o.armSwing });
    return figure(id, o.H, x, o.ground(x), o.dir, pose, t, { seed: o.seed, o: o.fo });
  }
  PB.walker = walker;

  // ---------------- Planos ----------------
  PB.buildShots = function (cfg) {
    const T = cfg.transition;
    // Geometría compartida de la punta rocosa (diagonal que continúa en el oleaje).
    const E = { a: [-200, 1100], b: [760, 430] };
    const Ed = [(E.b[0] - E.a[0]) / Math.hypot(E.b[0] - E.a[0], E.b[1] - E.a[1]), (E.b[1] - E.a[1]) / Math.hypot(E.b[0] - E.a[0], E.b[1] - E.a[1])];
    const En = [Ed[1], -Ed[0]]; // normal hacia la roca (arriba-izquierda)
    const Eang = Math.atan2(Ed[1], Ed[0]);

    const builders = { amanecer, orilla, sendero, amplio, roca, oleaje, cierre };
    return cfg.shots.map((s) => {
      if (!builders[s.id]) throw new Error('Plano desconocido: ' + s.id);
      const b = builders[s.id](s);
      return makeShot(s.id, s.start, s.end, T, b.cam, b.items);
    });

    // 00–06 Amanecer sobre lomas bajas, pradera y costa. Grupo indígena lejano en la playa.
    function amanecer() {
      const sky = skyLayer(1010, {
        seed: 11,
        stops: [[0, '#5c6b7a'], [330, '#7c8794'], [640, '#aaa6a4'], [860, '#d8c09f'], [990, '#efd3a3']],
        sun: { x: 800, y: 1000, r: 520, col: '#f7dcaa', a: 0.75 },
        clouds: [
          { y: 250, h: 70, n: 90, cols: ['#8792a0', '#9aa2ad'], seed: 3, alpha: [0.05, 0.16] },
          { y: 600, h: 110, n: 130, cols: ['#c4b3a6', '#b8aca8', '#d9c1a4'], seed: 4, alpha: [0.05, 0.16] },
          { y: 860, h: 60, n: 90, cols: ['#e8cfa6', '#d4b99a'], seed: 5, alpha: [0.06, 0.2] },
        ],
      });
      const sea = waterLayer(996, 1330, {
        seed: 12, n: 1600,
        grad: [[0, '#c9c3b2'], [0.15, '#a3adaf'], [0.6, '#7f929b'], [1, '#6f8591']],
        lights: ['#c8c8bd', '#b6bdbb'],
        glint: { x: 800, n: 520, s0: 18, s1: 150, col: '#f8e2b4' },
      });
      const ridge = PB.profile([[-160, 890], [60, 872], [250, 885], [430, 930], [560, 980], [640, 1000], [700, 1004]], { rough: 10, fine: 2, seed: 21 });
      const sierra = landLayer(masked(ridge, (x) => x > 700), 1007, {
        seed: 22, ext: false,
        grad: [[0, '#7b817c'], [1, '#6f746c']],
        strokes: [{ n: 700, cols: ['#848a82', '#6f766e', '#8d8e84'], alpha: [0.1, 0.25], len: [10, 40], width: [2, 4], ang: [-0.2, 0.2] }],
        rim: { off: 1, col: '#e9c99a', a: 0.35, w: 2 },
        after(ctx) {
          // islotes y punta rocosa
          paintRock(ctx, [[640, 1002], [660, 990], [690, 988], [712, 998], [705, 1004]], { base: '#6d716b', light: '#8b8c83', dark: '#555a56', seed: 7, occ: 0.1 });
          paintRock(ctx, [[735, 1002], [748, 995], [764, 997], [770, 1004]], { base: '#6d716b', light: '#8b8c83', dark: '#555a56', seed: 8, occ: 0.1 });
        },
        mottle: 0.1,
      });
      // Playa curva y pradera que baja hacia ella
      const beachTop = PB.profile([[-160, 1300], [200, 1290], [520, 1270], [800, 1246], [1240, 1225]], { rough: 3, seed: 31 });
      const beach = landLayer(beachTop, 1400, {
        seed: 32,
        grad: [[0, '#a09986'], [0.18, '#d6c198'], [1, '#c9b48d']],
        strokes: [{ n: 900, cols: [P.sand, P.sandL, P.sandD], alpha: [0.1, 0.3], len: [8, 30], width: [1, 3], ang: [-0.08, 0.08] }],
        mottle: 0.1,
      });
      const pradTop = PB.profile([[-160, 1330], [150, 1318], [420, 1335], [700, 1310], [950, 1282], [1240, 1275]], { rough: 8, fine: 2, seed: 41 });
      const pradera = landLayer(pradTop, 1760, {
        seed: 42,
        grad: [[0, '#8d8a58'], [0.35, '#7c7c4b'], [1, '#666a40']],
        strokes: [
          { n: 2600, cols: [P.olive, P.oliveL, P.ochre, P.straw], alpha: [0.12, 0.35], len: [10, 42], width: [1.5, 4], ang: [-0.35, 0.2], persp: true },
          { n: 900, cols: [P.ochreL, '#d1bb84'], alpha: [0.08, 0.22], len: [14, 50], width: [1, 3], ang: [-0.2, 0.1], persp: true },
        ],
        rim: { off: 1, col: '#e3c992', a: 0.4, w: 2 },
        fringe: { step: 6, len: [3, 8], w: 1.4, cols: [P.oliveL, P.ochre] },
        paint(ctx, f) {
          const r = PB.rng(43);
          for (let i = 0; i < 16; i++) {
            const x = -40 + r() * 1160, y = f(x) + 40 + r() * 330;
            paintShrub(ctx, x, y, 12 + r() * 18 * (0.5 + (y - 1300) / 400), 100 + i, { lit: 1, light: '#9a9463' });
          }
        },
      });
      const nearTop = PB.profile([[-160, 1640], [150, 1600], [380, 1625], [640, 1668], [900, 1650], [1240, 1618]], { rough: 14, fine: 3, seed: 51 });
      const near = landLayer(nearTop, 1920, {
        seed: 52,
        grad: [[0, '#7d7a4a'], [1, '#55593a']],
        strokes: [{ n: 2400, cols: [P.olive, P.oliveD, P.ochre, P.straw], alpha: [0.15, 0.4], len: [16, 60], width: [2, 6], ang: [-1.9, -1.2] }],
        fringe: { step: 5, len: [6, 18], w: 2, cols: [P.oliveL, P.ochre, P.straw] },
        after(ctx) {
          paintRock(ctx, [[-60, 1760], [30, 1700], [150, 1690], [230, 1740], [250, 1830], [-60, 1860]], { seed: 53, lit: 1, lichen: 30 });
          paintRock(ctx, [[860, 1790], [930, 1735], [1040, 1728], [1130, 1780], [1140, 1880], [860, 1880]], { seed: 54, lit: 1, lichen: 26 });
        },
      });
      const blades = makeBlades(55, 360, (r) => { const x = -60 + r() * 1200; return { x, y: nearTop(x) + 4 + r() * 60, s: 1 }; }, { cols: ['#8a8452', '#a0935e', '#6c6d42', '#b7a56e'], len: [18, 46], w: [1.6, 2.6] });
      const beachLine = (x) => beachTop(x) + 22;
      return {
        cam: { from: [0, 18, 1.0], to: [0, -18, 1.04] },
        items: [
          { L: sky, p: 0.15 },
          { L: sea, water: true, y0: 996, amp: 1.6, depth: 300, p: 0.3 },
          { L: sierra, p: 0.3 },
          { L: beach, p: 0.55 },
          {
            p: 0.55, fn(ctx, t, tau) {
              drawSwash(ctx, t, { line: (x) => beachTop(x) + 2, amp: 5, period: 5.5, w: 1.6, down: 1, seed: 2 });
              const H = 66, g = (x) => beachLine(x);
              drawFigures(ctx, [
                walker('ind3', tau, { t0: -1, t1: 7.5, dist: 150, x0: 520, dir: -1, H, ground: g, seed: 3, startMoving: true }),
                walker('ind1', tau, { t0: -1, t1: 7.5, dist: 150, x0: 575, dir: -1, H, ground: g, seed: 1, phase: 0.3, startMoving: true }),
                walker('ind2', tau, { t0: -1, t1: 7.5, dist: 150, x0: 622, dir: -1, H: 68, ground: (x) => g(x) + 2, seed: 2, phase: 0.65, startMoving: true }),
              ], { light: 1, wind: 1, haze: 0.18, hazeCol: '#c9bfae' });
            },
          },
          { L: pradera, p: 0.6 },
          { L: near, p: 1 },
          { p: 1, fn: (ctx, t) => drawBlades(ctx, t, blades) },
        ],
      };
    }

    // Cielo y agua compartidos por los planos de orilla (misma luz).
    function morningSky(y1, seed) {
      return skyLayer(y1, {
        seed,
        stops: [[0, '#687b89'], [Math.min(420, y1 * 0.55), '#8b9ba5'], [y1 * 0.85, '#c1c3ba'], [y1, '#ddd3bd']],
        sun: { x: -160, y: 120, r: 900, col: '#f3dcb0', a: 0.35 },
        clouds: [
          { y: y1 * 0.3, h: 80, n: 110, cols: ['#9aa6ae', '#a8b0b4', '#b9b7ae'], seed: seed + 1, alpha: [0.05, 0.14] },
          { y: y1 * 0.72, h: 90, n: 120, cols: ['#d4cfc0', '#c7c5bb'], seed: seed + 2, alpha: [0.05, 0.16] },
        ],
      });
    }

    // 06–14 Plano medio abierto: tres adultos indígenas junto al agua.
    function orilla(s) {
      const sky = morningSky(780, 61);
      const farR = PB.profile([[640, 790], [760, 772], [880, 752], [1000, 736], [1240, 722]], { rough: 5, seed: 62, x0: 600 });
      const far = landLayer(masked(farR, (x) => x < 700), 781, {
        seed: 63, ext: false, grad: [[0, '#8f9a98'], [1, '#879290']],
        strokes: [{ n: 300, cols: ['#98a19e', '#86908e'], alpha: [0.1, 0.2], len: [8, 26], width: [1.5, 3], ang: [-0.2, 0.2] }],
        rim: { off: 1, col: '#e9dcc0', a: 0.3, w: 1.5 }, mottle: 0.05,
        after(ctx) { paintRock(ctx, [[640, 792], [668, 780], [700, 778], [712, 792]], { base: '#7f8886', light: '#99a09b', dark: '#6d7573', seed: 64, occ: 0.05 }); },
      });
      const sea = waterLayer(780, 1480, {
        seed: 65, n: 3000,
        grad: [[0, '#b9c1bf'], [0.05, '#9fb0b5'], [0.45, '#7a8f99'], [0.85, '#6f8690'], [1, '#7f9290']],
        glint: { x: 200, n: 380, s0: 30, s1: 220, col: '#f3e6c8', depth: 0.9 },
      });
      const shore = PB.profile([[-160, 1412], [200, 1404], [540, 1410], [860, 1400], [1240, 1392]], { rough: 4, seed: 66 });
      const sand = landLayer(shore, 1920, {
        seed: 67,
        grad: [[0, '#8f8c80'], [0.07, '#a39a84'], [0.14, '#c9b58f'], [1, '#bea984']],
        gradEnd: 1900,
        strokes: [
          { n: 2600, cols: [P.sand, P.sandL, P.sandD, '#bfae8a'], alpha: [0.1, 0.3], len: [6, 26], width: [1, 3.5], ang: [-0.12, 0.12], persp: true },
        ],
        paint(ctx, f) {
          // arena húmeda con reflejo del cielo
          ctx.save();
          const g = ctx.createLinearGradient(0, 1404, 0, 1480);
          g.addColorStop(0, 'rgba(160,170,168,0.55)');
          g.addColorStop(1, 'rgba(160,170,168,0)');
          ctx.fillStyle = g;
          ctx.fillRect(-100, 1395, 1300, 90);
          ctx.restore();
          PB.dabs(ctx, { n: 260, box: [-80, 1480, 1160, 1900], cols: ['#8d8474', '#a39a88', '#6f685d'], r: [1.5, 5], alpha: [0.35, 0.8], seed: 68, test: (x, y) => y > f(x) + 60 });
        },
        after(ctx) {
          paintRock(ctx, [[-80, 1700], [40, 1660], [150, 1680], [230, 1760], [240, 1880], [-80, 1900]], { seed: 69, lichen: 24 });
          paintRock(ctx, [[830, 1720], [900, 1650], [1010, 1630], [1120, 1660], [1160, 1800], [860, 1830]], { seed: 70, lichen: 30 });
          paintRock(ctx, [[760, 1800], [800, 1776], [850, 1790], [846, 1826], [770, 1830]], { seed: 71 });
        },
      });
      const blades = makeBlades(72, 240, (r) => {
        const side = r() < 0.5;
        const x = side ? -60 + r() * 330 : 780 + r() * 400;
        const y = side ? 1650 + r() * 60 - (x < 150 ? 0 : 20) : 1640 + r() * 40;
        return { x, y, s: 0.9 };
      }, { cols: ['#8a8452', '#a0935e', '#77764a', '#b9a770'], len: [16, 40], w: [1.4, 2.4] });
      const glints = makeGlints(73, 120, (r) => ({ x: 60 + r() * 320 + (r() - 0.5) * 200, y: 800 + Math.pow(r(), 1.3) * 560, a: 0.7, w: 1.5 + r() * 1.5 }));
      const i3 = { t0: -0.2, t1: 4.6, dist: 250, x0: 1010, dir: -1, H: 244, ground: (x) => 1492 + (x - 760) * 0.01, seed: 3, look: -0.05, startMoving: true, stop: true };
      return {
        cam: { from: [-10, 0, 1.0], to: [14, -8, 1.035] },
        items: [
          { L: sky, p: 0.12 },
          { L: sea, water: true, y0: 780, amp: 3.2, depth: 600, p: 0.4, seed: 1 },
          { L: far, p: 0.3 },
          { p: 0.4, fn: (ctx, t) => drawGlints(ctx, t, glints) },
          { L: sand, p: 1 },
          {
            p: 1, fn(ctx, t, tau) {
              drawSwash(ctx, t, { line: (x) => shore(x) + 1, amp: 26, period: 6.8, w: 3, seed: 1 });
              // I3 camina hacia el grupo y se detiene; luego espera mirando el horizonte.
              let f3;
              if (tau < i3.t1) f3 = walker('ind3', tau, i3);
              else {
                const end = walker('ind3', i3.t1, i3);
                const st = PB.pose.stand(tau, { seed: 3, look: -0.1 });
                const k = PB.smooth((tau - i3.t1) / 0.9);
                f3 = { ...end, pose: PB.blendPose(end.pose, st, k), t: tau };
              }
              drawFigures(ctx, [
                figure('ind1', 250, 300, 1466, 1, PB.pose.crouch(tau, { seed: 1 }), tau, { seed: 1 }),
                figure('ind2', 248, 575, 1522, -1, PB.pose.stand(tau, { seed: 2, look: 0.12, armA: 0.1 }), tau, { seed: 2 }),
                f3,
              ], { light: -1, wind: 1 });
            },
          },
          { p: 1, fn: (ctx, t) => drawBlades(ctx, t, blades) },
        ],
      };
    }

    // 14–21 Mismo paisaje y luz, mirando hacia la ladera: colonos por el sendero, indígenas junto al agua.
    function ladera(o) {
      const ridge = PB.profile(o.ridge, { rough: 9, fine: 2, seed: o.seed });
      const sierra = landLayer(ridge, o.slopeTopMax + 60, {
        seed: o.seed + 1, erase: o.ridgeErase, grad: [[0, '#7f8878'], [1, '#77805f']],
        strokes: [{ n: 700, cols: ['#86907e', '#727c69', '#8f9580'], alpha: [0.1, 0.22], len: [10, 34], width: [1.5, 3.5], ang: [-0.25, 0.25] }],
        rim: { off: 1, col: '#e6dcbf', a: 0.3, w: 1.6 },
        fringe: { step: 7, len: [2, 5], w: 1.2, cols: ['#7f8878'] },
        paint(ctx, f) {
          const r = PB.rng(o.seed + 2);
          for (let i = 0; i < 18; i++) { const x = -60 + r() * 1200; paintShrub(ctx, x, f(x) + 14 + r() * 40, 7 + r() * 7, 200 + i, { cols: ['#56604a', '#626c52', '#737a5c'], light: '#8a8f72' }); }
        },
        mottle: 0.08,
      });
      const slopeTop = PB.profile(o.slope, { rough: 12, fine: 2, seed: o.seed + 3 });
      const trail = o.trail;
      const slope = landLayer(slopeTop, o.slopeBottom, {
        seed: o.seed + 4,
        grad: [[0, '#8b8a5a'], [0.5, '#7c7c4c'], [1, '#8e8558']],
        strokes: [
          { n: 3200, cols: [P.olive, P.oliveL, P.ochre, P.straw, '#7a7d4d'], alpha: [0.12, 0.34], len: [10, 40], width: [1.5, 4.5], ang: [-0.45, 0.25], persp: true },
          { n: 800, cols: [P.ochreL, '#cdb680'], alpha: [0.08, 0.22], len: [14, 44], width: [1, 3], ang: [-0.3, 0.1], persp: true },
        ],
        rim: { off: 1, col: '#e0cd98', a: 0.35, w: 2 },
        fringe: { step: 6, len: [3, 8], w: 1.4, cols: [P.oliveL, P.ochre] },
        paint(ctx, f) {
          const r = PB.rng(o.seed + 5);
          // afloramientos de roca y monte bajo en hondonadas
          for (const rk of o.rocks) paintRock(ctx, rk, { seed: o.seed + rk[0][0], lichen: 14, lit: -1 });
          for (let i = 0; i < o.shrubs; i++) {
            const x = -40 + r() * 1160, y = f(x) + 30 + r() * (o.slopeBottom - f(x) - 60);
            if (Math.abs(y - trail.y(x)) < 26) continue;
            paintShrub(ctx, x, y, 10 + r() * 16 * (0.6 + (y - 700) / 900), 300 + i, { light: '#98945f' });
          }
          paintTrail(ctx, trail.pts, trail.w0, trail.w1, o.seed + 6);
        },
      });
      return { ridge, sierra, slopeTop, slope };
    }

    function sendero(s) {
      const sky = morningSky(600, 81);
      const trailPts = [[1200, 1002], [1000, 990], [800, 1004], [600, 1022], [400, 1016], [200, 1030], [0, 1052], [-160, 1060]].reverse();
      const trail = { pts: trailPts, y: polyY(trailPts), w0: 9, w1: 12 };
      const lad = ladera({
        seed: 90,
        ridge: [[-160, 580], [100, 548], [300, 530], [520, 548], [760, 575], [1000, 590], [1240, 600]],
        slope: [[-160, 690], [150, 668], [400, 690], [700, 720], [950, 740], [1240, 752]],
        slopeTopMax: 760, slopeBottom: 1360, trail, shrubs: 26,
        rocks: [
          [[80, 860], [120, 835], [175, 840], [196, 870], [150, 884], [90, 882]],
          [[880, 1150], [930, 1120], [1000, 1122], [1040, 1160], [980, 1178], [900, 1176]],
          [[520, 790], [548, 775], [580, 780], [590, 798], [530, 802]],
        ],
      });
      const beachTop = PB.profile([[-160, 1320], [300, 1312], [700, 1325], [1240, 1318]], { rough: 5, seed: 95 });
      const beach = landLayer(beachTop, 1560, {
        seed: 96,
        grad: [[0, '#b3a57f'], [0.4, '#cbb68e'], [0.85, '#a79a80'], [1, '#98917f']],
        strokes: [{ n: 1800, cols: [P.sand, P.sandL, P.sandD], alpha: [0.1, 0.3], len: [6, 24], width: [1, 3], ang: [-0.1, 0.1], persp: true }],
        fringe: { step: 5, len: [4, 12], w: 1.8, cols: [P.oliveL, P.ochre, P.olive] },
        paint(ctx) { PB.dabs(ctx, { n: 140, box: [-80, 1330, 1160, 1500], cols: ['#8d8474', '#a39a88', '#6f685d'], r: [1.2, 4], alpha: [0.35, 0.8], seed: 97 }); },
      });
      const waterTop = 1512;
      const sea = waterLayer(waterTop, 1920, {
        seed: 98, n: 1600,
        grad: [[0, '#9aa8a6'], [0.2, '#7e929a'], [1, '#6a808b']],
        glint: { x: 120, n: 140, s0: 60, s1: 200, col: '#efe2c4' },
      });
      const glints = makeGlints(99, 70, (r) => ({ x: -40 + r() * 600, y: 1530 + r() * 380, a: 0.6, w: 2 + r() * 2, len: 10 + r() * 24 }));
      const shoreLine = (x) => waterTop + Math.sin(x * 0.006) * 3;
      const blades = makeBlades(100, 160, (r) => { const x = -60 + r() * 1200; return { x, y: 1334 + r() * 30, s: 0.7 }; }, { cols: ['#8a8452', '#a0935e', '#77764a'], len: [12, 30], w: [1.2, 2] });
      const tr = (x) => trail.y(x) + 3;
      return {
        cam: { from: [8, 6, 1.0], to: [-12, -6, 1.035] },
        items: [
          { L: sky, p: 0.12 },
          { L: lad.sierra, p: 0.3 },
          { L: lad.slope, p: 0.5 },
          {
            p: 0.5, fn(ctx, t, tau) {
              // Dos pobladores coloniales recorren el sendero del segundo plano (sin gesto de conquista).
              drawFigures(ctx, [
                walker('col1', tau, { t0: -0.5, t1: 8, dist: 610, x0: 1150, dir: -1, H: 168, ground: tr, seed: 11, startMoving: true, lean: 0.07 }),
                walker('col2', tau, { t0: -0.5, t1: 8, dist: 610, x0: 1265, dir: -1, H: 164, ground: tr, seed: 12, phase: 0.4, startMoving: true, armSwing: 0.45, lean: 0.06 }),
              ], { light: -1, wind: 1, haze: 0.12, hazeCol: '#c5c8bb' });
            },
          },
          { L: beach, p: 0.8 },
          { p: 0.8, fn: (ctx, t) => drawBlades(ctx, t, blades) },
          { L: sea, water: true, y0: waterTop, amp: 3.5, depth: 400, p: 1, seed: 2 },
          {
            p: 1, fn(ctx, t, tau) {
              drawGlints(ctx, t, glints);
              drawSwash(ctx, t, { line: (x) => shoreLine(x) + 4, amp: 22, period: 7.2, w: 3, down: -1, seed: 4, sheet: '#9aa9a8' });
              // Las personas indígenas continúan junto al agua, en primer plano.
              const k = PB.smooth((tau - 3.2) / 2.2);
              const p1 = PB.blendPose(PB.pose.crouch(tau + 8, { seed: 1 }), PB.pose.stand(tau, { seed: 1, look: -0.06 }), k);
              drawFigures(ctx, [
                figure('ind1', 226, 250, 1540, 1, p1, tau, { seed: 1 }),
                figure('ind2', 228, 470, 1552, -1, PB.pose.stand(tau + 8, { seed: 2, look: 0.05 }), tau, { seed: 2 }),
                figure('ind3', 226, 850, 1545, -1, PB.pose.stand(tau + 8, { seed: 3, look: -0.1 }), tau, { seed: 3 }),
              ], { light: -1, wind: 1 });
            },
          },
        ],
      };
    }

    // 21–28 Plano amplio compartido: el grupo indígena por la orilla; los colonos a distancia en la ladera.
    function amplio(s) {
      const sky = morningSky(560, 111);
      const trailPts = [[-160, 896], [100, 880], [300, 872], [520, 884], [760, 902], [980, 912], [1240, 930]];
      const trail = { pts: trailPts, y: polyY(trailPts), w0: 7, w1: 8 };
      const lad = ladera({
        seed: 120,
        ridge: [[-160, 520], [150, 490], [380, 478], [620, 508], [820, 548], [1000, 566], [1240, 572]],
        slope: [[-160, 640], [200, 622], [520, 650], [800, 686], [1000, 712], [1240, 730]],
        slopeTopMax: 700, slopeBottom: 1240, trail, shrubs: 34,
        rocks: [
          [[40, 760], [70, 742], [112, 748], [124, 770], [60, 776]],
          [[700, 1080], [740, 1058], [800, 1062], [826, 1092], [720, 1100]],
          [[960, 800], [990, 782], [1030, 786], [1040, 806], [970, 810]],
        ],
      });
      const beachTop = PB.profile([[-160, 1196], [300, 1186], [700, 1200], [1240, 1192]], { rough: 5, seed: 125 });
      const beach = landLayer(beachTop, 1420, {
        seed: 126,
        grad: [[0, '#b3a57f'], [0.5, '#cbb68e'], [0.85, '#a89c82'], [1, '#9a9382']],
        strokes: [{ n: 1500, cols: [P.sand, P.sandL, P.sandD], alpha: [0.1, 0.3], len: [5, 20], width: [1, 2.6], ang: [-0.1, 0.1], persp: true }],
        fringe: { step: 5, len: [3, 9], w: 1.5, cols: [P.oliveL, P.ochre, P.olive] },
      });
      const waterTop = 1392;
      const sea = waterLayer(waterTop, 1920, {
        seed: 127, n: 2200,
        grad: [[0, '#9aa8a6'], [0.15, '#80949b'], [1, '#697f8a']],
        glint: { x: 160, n: 200, s0: 60, s1: 260, col: '#efe2c4' },
      });
      const rocks = freeLayer(1680, 1920, (ctx) => {
        paintRock(ctx, [[-80, 1760], [20, 1700], [140, 1712], [210, 1790], [190, 1900], [-80, 1920]], { seed: 129, wet: 60, lichen: 10 });
        paintRock(ctx, [[900, 1800], [960, 1740], [1060, 1730], [1160, 1790], [1160, 1920], [920, 1920]], { seed: 130, wet: 60, lichen: 10 });
      }, 128);
      const glints = makeGlints(131, 90, (r) => ({ x: -40 + r() * 700, y: 1410 + Math.pow(r(), 1.2) * 480, a: 0.6, w: 2 + r() * 2, len: 10 + r() * 26 }));
      const shoreLine = (x) => waterTop + Math.sin(x * 0.005 + 1) * 3;
      const gB = (x) => waterTop - 14 + Math.sin(x * 0.005 + 1) * 3;
      const trG = (x) => trail.y(x) + 2;
      return {
        cam: { from: [-14, 0, 1.0], to: [14, -10, 1.03] },
        items: [
          { L: sky, p: 0.1 },
          { L: lad.sierra, p: 0.3 },
          { L: lad.slope, p: 0.5 },
          {
            p: 0.5, fn(ctx, t, tau) {
              drawFigures(ctx, [
                walker('col1', tau, { t0: -0.5, t1: 7.5, dist: 330, x0: 760, dir: -1, H: 152, ground: trG, seed: 11, startMoving: true, lean: 0.07 }),
                walker('col2', tau, { t0: -0.5, t1: 7.5, dist: 330, x0: 860, dir: -1, H: 148, ground: trG, seed: 12, phase: 0.4, startMoving: true, armSwing: 0.45, lean: 0.06 }),
              ], { light: -1, wind: 1, haze: 0.2, hazeCol: '#c5c8bb' });
            },
          },
          { L: beach, p: 0.75 },
          { L: sea, water: true, y0: waterTop, amp: 3.2, depth: 400, p: 0.9, seed: 3 },
          {
            p: 0.9, fn(ctx, t, tau) {
              drawGlints(ctx, t, glints);
              drawSwash(ctx, t, { line: (x) => shoreLine(x) + 3, amp: 16, period: 6.4, w: 2.4, down: -1, seed: 6, sheet: '#9aa9a8' });
              drawFigures(ctx, [
                walker('ind3', tau, { t0: -0.5, t1: 7.5, dist: 470, x0: 1000, dir: -1, H: 186, ground: gB, seed: 3, startMoving: true }),
                walker('ind1', tau, { t0: -0.5, t1: 7.5, dist: 470, x0: 1085, dir: -1, H: 182, ground: (x) => gB(x) + 4, seed: 1, phase: 0.33, startMoving: true }),
                walker('ind2', tau, { t0: -0.5, t1: 7.5, dist: 470, x0: 1175, dir: -1, H: 188, ground: (x) => gB(x) + 1, seed: 2, phase: 0.7, startMoving: true }),
              ], { light: -1, wind: 1, haze: 0.05, hazeCol: '#c5c8bb' });
            },
          },
          { L: rocks, p: 1 },
        ],
      };
    }

    function rockWedge(shift, seed) {
      const a = [E.a[0] + shift[0], E.a[1] + shift[1]], b = [E.b[0] + shift[0], E.b[1] + shift[1]];
      const crestY = (x) => PB.interpY([[-400, 300], [0, 322], [300, 352], [560, 392], [760, 426]], x - shift[0]) + shift[1];
      const L = PB.layer(W, 250, 1500);
      const ctx = L.ctx;
      const r = PB.rng(seed);
      const N = PB.makeNoise(seed);
      const segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // borde costero orgánico (ruido de baja frecuencia, sin escalones)
      const edge = [];
      for (let k = 0; k <= 60; k++) {
        const u = k / 60;
        const j = (N.fbm(u * 5, 1.7, 3) - 0.5) * 70 + (N.n2(u * 40, 5.1) - 0.5) * 8;
        edge.push([PB.lerp(a[0], b[0], u) + En[0] * j, PB.lerp(a[1], b[1], u) + En[1] * j]);
      }
      const poly = [];
      for (let x = -400; x <= b[0]; x += 20) poly.push([x, crestY(x)]);
      for (let k = edge.length - 1; k >= 0; k--) poly.push(edge[k]);
      poly.push([-400, 1600]);
      const shape = () => { ctx.beginPath(); poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
      ctx.save();
      shape();
      const g = ctx.createLinearGradient(0, 300, 500, 1200);
      g.addColorStop(0, '#6f6a55');
      g.addColorStop(1, '#4f4a43');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.clip();
      PB.strokes(ctx, { n: 1500, box: [-200, 260, 900, 1400], cols: ['#6b6650', '#7a7358', '#5b574a'], alpha: [0.15, 0.35], len: [8, 30], width: [2, 5], ang: [Eang - 0.3, Eang + 0.3], seed: seed + 1 });
      // estratos inclinados paralelos a la diagonal, con fracturas transversales
      let off = 20;
      let k = 0;
      while (off < 560) {
        const wdt = 34 + r() * 46;
        const band = (o0, o1, jitter) => {
          const pts = [];
          for (let q = -0.3; q <= 1.25; q += 0.025) {
            const n0 = (N.fbm(q * 7 + k, 2.2, 2) - 0.5) * jitter;
            pts.push([a[0] + Ed[0] * q * segLen + En[0] * (o0 + n0), a[1] + Ed[1] * q * segLen + En[1] * (o0 + n0)]);
          }
          const back = [];
          for (let q = 1.25; q >= -0.3; q -= 0.025) {
            const n1 = (N.fbm(q * 7 + k + 0.5, 4.4, 2) - 0.5) * jitter;
            back.push([a[0] + Ed[0] * q * segLen + En[0] * (o1 + n1), a[1] + Ed[1] * q * segLen + En[1] * (o1 + n1)]);
          }
          return pts.concat(back);
        };
        const pts = band(off, off + wdt, 18);
        const tone = PB.jitter(['#8f8676', '#a39987', '#7b7366', '#998f7d'][k % 4], r, 0.07);
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.closePath();
        ctx.fillStyle = PB.css(tone);
        ctx.fill();
        // cara superior iluminada del estrato y sombra inferior
        const top = pts.slice(pts.length / 2).reverse();
        ctx.strokeStyle = 'rgba(214,202,178,0.45)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        top.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
        ctx.strokeStyle = 'rgba(40,34,30,0.5)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        pts.slice(0, pts.length / 2).forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
        // fracturas transversales
        for (let q = r() * 0.08; q < 1.2; q += 0.05 + r() * 0.09) {
          const cx = a[0] + Ed[0] * q * segLen + En[0] * off, cy = a[1] + Ed[1] * q * segLen + En[1] * off;
          ctx.strokeStyle = 'rgba(45,38,33,0.45)';
          ctx.lineWidth = 1.2 + r() * 1.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + En[0] * wdt * (0.7 + r() * 0.4) + Ed[0] * (r() - 0.5) * 10, cy + En[1] * wdt * (0.7 + r() * 0.4) + Ed[1] * (r() - 0.5) * 10);
          ctx.stroke();
        }
        off += wdt;
        k++;
      }
      PB.strokes(ctx, { n: 2600, box: [-200, 260, 900, 1400], cols: [P.stone, P.stoneL, P.stoneD, '#9b917f'], alpha: [0.1, 0.3], len: [8, 34], width: [2, 5], ang: [Eang - 0.15, Eang + 0.15], seed: seed + 1 });
      PB.dabs(ctx, { n: 200, box: [-200, 300, 800, 1200], cols: [P.lichen, '#9c9468'], r: [1.5, 4.5], alpha: [0.25, 0.5], seed: seed + 2 });
      // algunos bloques sueltos junto al agua
      for (let i = 0; i < 9; i++) {
        const u = 0.02 + r() * 0.9, d = 10 + r() * 40, sc = 1 - u * 0.5;
        const cx = a[0] + Ed[0] * u * segLen + En[0] * d, cy = a[1] + Ed[1] * u * segLen + En[1] * d;
        const rx = (40 + r() * 50) * sc, ry = (22 + r() * 22) * sc;
        const pts = [];
        for (let j = 0; j < 7; j++) {
          const th = (j / 7) * Math.PI * 2 + r() * 0.4, rr = 0.75 + r() * 0.4;
          const lx = Math.cos(th) * rx * rr, ly = Math.sin(th) * ry * rr;
          pts.push([cx + Ed[0] * lx - En[0] * ly, cy + Ed[1] * lx - En[1] * ly]);
        }
        paintRock(ctx, pts, { seed: seed + 30 + i, strata: Eang, lit: -1, occ: 0.4, wet: 20 });
      }
      // manto de pasto en la cumbre
      ctx.beginPath();
      for (let x = -400; x <= b[0] + 10; x += 12) ctx.lineTo(x, crestY(x) - 2);
      for (let x = b[0]; x >= -400; x -= 12) ctx.lineTo(x, crestY(x) + PB.clamp((b[0] - x) * 0.2, 6, 130) + (N.n2(x * 0.02, 9) - 0.5) * 24);
      ctx.closePath();
      ctx.fillStyle = '#7b7b4c';
      ctx.fill();
      ctx.save();
      ctx.clip();
      PB.strokes(ctx, { n: 1400, box: [-200, 260, 800, 520], cols: [P.olive, P.oliveL, P.ochre, P.straw], alpha: [0.15, 0.4], len: [8, 30], width: [1.5, 4], ang: [-0.5, 0.2], seed: seed + 3 });
      ctx.restore();
      for (let k = 0; k < 7; k++) { const x = -60 + r() * 520; paintShrub(ctx, x, crestY(x) + 40 + r() * 50, 9 + r() * 10, seed + 60 + k, { light: '#98945f' }); }
      // banda húmeda oscura junto al agua
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(36,42,44,0.5)';
      ctx.lineWidth = 34;
      ctx.beginPath();
      edge.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.stroke();
      ctx.restore();
      ctx.save();
      shape();
      ctx.strokeStyle = 'rgba(40,33,28,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      PB.texturize(L.canvas, seed + 9, 0.12, 1);
      return { L, edge, crestY, a, b };
    }

    function seaShot(seed, glintX) {
      return {
        sky: skyLayer(430, {
          seed, stops: [[0, '#71838f'], [250, '#98a5ab'], [430, '#d8d2c0']],
          sun: { x: -100, y: 100, r: 700, col: '#f3dcb0', a: 0.3 },
          clouds: [{ y: 200, h: 90, n: 110, cols: ['#a3adb2', '#b3b7b3'], seed: seed + 1 }],
        }),
        sea: waterLayer(418, 1920, {
          seed: seed + 2, n: 4200,
          grad: [[0, '#b6bfbd'], [0.04, '#98a9ae'], [0.35, '#7a8f99'], [1, '#5f7784']],
          glint: { x: glintX, n: 260, s0: 30, s1: 240, col: '#f1e3c4', depth: 0.6 },
        }),
      };
    }

    // 28–31 Roca: la punta rocosa desciende en diagonal hacia el mar; las figuras salen por el encuadre.
    function roca(s) {
      const { sky, sea } = seaShot(141, 260);
      const wedge = rockWedge([0, 0], 150);
      const foamA = foamTexture(2400, 200, 151, { center: 0.25, trail: 0.25, face: 0 });
      foamA.center = 0.25;
      const ledge = (x) => 660 - (x - 380) * 0.36;
      const crestG = (x) => wedge.crestY(x) + 4;
      return {
        cam: { from: [0, 0, 1.0], to: [-150, -40, 1.02] },
        items: [
          { L: sky, p: 0.15 },
          { L: sea, water: true, y0: 418, amp: 3.5, depth: 900, p: 0.7, seed: 4 },
          {
            p: 1, fn(ctx, t) {
              // espuma que rompe contra el borde de la roca
              drawFoamLine(ctx, t, foamA, E.a, E.b, 0.95, 1, 14);
            },
          },
          { L: wedge.L, p: 1 },
          {
            p: 1, fn(ctx, t, tau) {
              drawFigures(ctx, [
                walker('col2', tau, { t0: -0.5, t1: 4, dist: 250, x0: 150, dir: -1, H: 112, ground: crestG, seed: 12, phase: 0.4, startMoving: true, armSwing: 0.45 }),
                walker('col1', tau, { t0: -0.5, t1: 4, dist: 250, x0: 230, dir: -1, H: 114, ground: crestG, seed: 11, startMoving: true }),
              ], { light: -1, wind: 1, haze: 0.2, hazeCol: '#c5c8bb' });
              drawFigures(ctx, [
                walker('ind3', tau, { t0: -0.5, t1: 4, dist: 420, x0: 190, dir: -1, H: 196, ground: ledge, seed: 3, startMoving: true }),
                walker('ind1', tau, { t0: -0.5, t1: 4, dist: 420, x0: 270, dir: -1, H: 192, ground: (x) => ledge(x) + 4, seed: 1, phase: 0.33, startMoving: true }),
                walker('ind2', tau, { t0: -0.5, t1: 4, dist: 420, x0: 355, dir: -1, H: 198, ground: (x) => ledge(x) + 2, seed: 2, phase: 0.7, startMoving: true }),
              ], { light: -1, wind: 1 });
            },
          },
        ],
      };
    }

    // Ola/espuma a lo largo de una diagonal (a→b), desplazada según la normal, con ondulación orgánica.
    // Se recorta bajo el horizonte para no invadir el cielo.
    function drawFoamLine(ctx, t, tex, a, b, alpha, scaleY, offN, drift = 0, horizon = 422) {
      const len = 2600;
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const breathe = Math.sin(t * 1.05 + drift) * 7;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-400, horizon, 2000, 2000);
      ctx.clip();
      ctx.translate(mid[0] - En[0] * (offN + breathe), mid[1] - En[1] * (offN + breathe));
      ctx.rotate(Eang);
      ctx.globalAlpha = alpha;
      const S = 26, srcW = tex.width - 300, sx0 = (((t * 12 + drift) % 300) + 300) % 300;
      const hh = tex.height * scaleY, top = -hh * (tex.center || 0.3);
      for (let i = 0; i < S; i++) {
        const u = i / S;
        const wob = (WN.fbm(u * 3.2 + drift * 0.01, t * 0.08 + drift, 3) - 0.5) * 70 * scaleY;
        ctx.drawImage(tex, sx0 + u * srcW, 0, srcW / S + 1, tex.height, -len / 2 + u * len, top + wob, len / S + 1.5, hh);
      }
      ctx.restore();
    }

    // 31–35 Oleaje: la diagonal de la roca continúa en líneas de espuma blanca sobre el azul.
    function oleaje(s) {
      const { sky, sea } = seaShot(161, 300);
      const shift = [-150, -40];
      const wedge = rockWedge(shift, 170);
      const texs = [foamTexture(2400, 220, 171, { center: 0.25, trail: 0.3, face: 0 }), foamTexture(2400, 300, 172, { center: 0.3, trail: 0.45, alpha: 0.95, face: 0.6 }), foamTexture(2400, 260, 173, { center: 0.3, trail: 0.35, alpha: 0.85, face: 0.6 })];
      texs[0].center = 0.25; texs[1].center = 0.3; texs[2].center = 0.3;
      const a = wedge.a, b = wedge.b;
      const crests = [
        { off: 14, tex: 0, sy: 1.0, alpha: 0.95, speed: 0 },
        { off: 190, tex: 1, sy: 1.1, alpha: 0.9, speed: 16 },
        { off: 430, tex: 2, sy: 1.3, alpha: 0.82, speed: 20 },
        { off: 700, tex: 1, sy: 1.55, alpha: 0.78, speed: 24 },
        { off: 1040, tex: 2, sy: 1.8, alpha: 0.72, speed: 28 },
      ];
      return {
        cam: { from: [0, 0, 1.0], to: [-120, -50, 1.035] },
        items: [
          { L: sky, p: 0.15 },
          { L: sea, water: true, y0: 418, amp: 4, depth: 900, p: 0.7, seed: 5 },
          {
            p: 0.95, fn(ctx, t, tau) {
              for (const c of crests) {
                const o = c.off - c.speed * tau;
                const fade = c.speed ? PB.smooth((c.off - c.speed * tau) / 90) : 1;
                drawFoamLine(ctx, t, texs[c.tex], a, b, c.alpha * fade, c.sy, o, c.off);
              }
            },
          },
          { L: wedge.L, p: 1 },
        ],
      };
    }

    // 35–40 Cierre: paisaje sereno con las tres personas indígenas presentes, mirando el mar.
    function cierre(s) {
      const sky = skyLayer(1140, {
        seed: 181,
        stops: [[0, '#b3c0c5'], [380, '#ccd3d0'], [780, '#e5e1d2'], [1140, '#f0e6d0']],
        sun: { x: 540, y: 520, r: 700, col: '#fbf4e6', a: 0.5 },
        clouds: [{ y: 1000, h: 80, n: 90, cols: ['#e7dcc6', '#d9d6ca'], seed: 182, alpha: [0.04, 0.1] }],
      });
      const farR = PB.profile([[-160, 1050], [100, 1058], [300, 1086], [450, 1112], [560, 1132], [600, 1140]], { rough: 6, seed: 183 });
      const far = landLayer(masked(farR, (x) => x > 596), 1141, {
        seed: 184, ext: false, grad: [[0, '#9ca5a1'], [1, '#95a09c']],
        strokes: [{ n: 300, cols: ['#a3aba7', '#929c98'], alpha: [0.1, 0.2], len: [8, 26], width: [1.5, 3], ang: [-0.2, 0.2] }],
        rim: { off: 1, col: '#f5e9cf', a: 0.4, w: 1.5 }, mottle: 0.04,
        after(ctx) { paintRock(ctx, [[606, 1140], [626, 1130], [650, 1131], [660, 1141]], { base: '#8c9591', light: '#a7ada8', dark: '#7b8480', seed: 185, occ: 0.05 }); },
      });
      const sea = waterLayer(1140, 1640, {
        seed: 186, n: 2200,
        grad: [[0, '#cfd1c7'], [0.05, '#b1bdbe'], [0.5, '#8d9fa6'], [1, '#7b8f99']],
        lights: ['#c8cfcd', '#d7d9d0'],
        glint: { x: 560, n: 260, s0: 20, s1: 180, col: '#f8eed8', depth: 0.8 },
      });
      const shelfTop = PB.profile([[-160, 1590], [200, 1572], [480, 1548], [620, 1536], [760, 1544], [900, 1530], [1240, 1520]], { rough: 10, fine: 3, seed: 187 });
      const shelf = landLayer(shelfTop, 1920, {
        seed: 188,
        grad: [[0, '#a2978a'], [0.5, '#877e72'], [1, '#6a625a']],
        strokes: [{ n: 2200, cols: [P.stone, P.stoneL, P.stoneD, '#a89e8b'], alpha: [0.14, 0.36], len: [10, 44], width: [2, 6], ang: [-0.3, 0.05] }],
        rim: { off: 1, col: '#e9dcc2', a: 0.45, w: 2 },
        paint(ctx, f) {
          const r = PB.rng(189);
          ctx.lineCap = 'round';
          for (let i = 0; i < 14; i++) {
            const x = -100 + r() * 1300, y = f(x) + 30 + r() * 300;
            ctx.strokeStyle = 'rgba(52,44,38,0.35)';
            ctx.lineWidth = 1.5 + r() * 2;
            ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 60, y - 10 + r() * 20, x + 120 + r() * 120, y - 20 + r() * 30); ctx.stroke();
          }
          PB.dabs(ctx, { n: 120, box: [-100, 1530, 1180, 1800], cols: [P.lichen, '#9c9468'], r: [1.5, 4], alpha: [0.2, 0.45], seed: 190 });
          paintRock(ctx, [[-80, 1640], [20, 1600], [150, 1606], [230, 1660], [220, 1740], [-80, 1760]], { seed: 194, lichen: 20 });
          paintRock(ctx, [[300, 1700], [360, 1668], [450, 1672], [490, 1720], [420, 1760], [310, 1752]], { seed: 195, lichen: 12 });
          paintRock(ctx, [[880, 1690], [950, 1640], [1060, 1636], [1150, 1690], [1150, 1790], [900, 1780]], { seed: 196, lichen: 18 });
          // pasto entre las rocas
          PB.strokes(ctx, { n: 500, box: [-100, 1520, 1180, 1700], cols: [P.olive, P.oliveL, P.ochre], alpha: [0.3, 0.6], len: [6, 18], width: [1.5, 3], ang: [-1.9, -1.3], seed: 191, test: (x, y) => y < f(x) + 70 });
        },
      });
      const blades = makeBlades(192, 180, (r) => { const x = -60 + r() * 1200; return { x, y: shelfTop(x) + 6 + r() * 20, s: 0.8 }; }, { cols: ['#8a8452', '#a0935e', '#77764a', '#b9a770'], len: [12, 30], w: [1.3, 2.2] });
      const glints = makeGlints(193, 110, (r) => ({ x: 560 + (r() + r() - 1) * 260, y: 1150 + Math.pow(r(), 1.3) * 420, a: 0.75, w: 1.2 + r() * 1.6, len: 6 + r() * 18 }));
      const swl = (x) => shelfTop(x) + 8;
      return {
        cam: { from: [0, 8, 1.0], to: [0, -4, 1.02] },
        items: [
          { L: sky, p: 0.1 },
          { L: sea, water: true, y0: 1140, amp: 2.2, depth: 500, p: 0.35, seed: 6 },
          { L: far, p: 0.25 },
          { p: 0.35, fn: (ctx, t) => drawGlints(ctx, t, glints) },
          { p: 0.8, fn: (ctx, t) => drawSwash(ctx, t, { line: (x) => swl(x) - 12, amp: 10, period: 7, w: 2.2, down: -1, seed: 9, sheet: '#aab6b4' }) },
          { L: shelf, p: 0.8 },
          { p: 0.8, fn: (ctx, t) => drawBlades(ctx, t, blades) },
          {
            p: 0.8, fn(ctx, t, tau) {
              const tt = tau + 30;
              drawFigures(ctx, [
                figure('ind2', 176, 640, swl(640) - 2, -1, PB.pose.stand(tt, { seed: 2, look: -0.12 }), tt, { seed: 2 }),
                figure('ind1', 170, 728, swl(728) + 2, -1, PB.pose.stand(tt, { seed: 1, look: -0.15 }), tt, { seed: 1 }),
                figure('ind3', 174, 815, swl(815) - 1, -1, PB.pose.stand(tt, { seed: 3, look: -0.1, armA: 0.12 }), tt, { seed: 3 }),
              ], { light: -1, wind: 1 });
            },
          },
        ],
      };
    }
  };
})();
