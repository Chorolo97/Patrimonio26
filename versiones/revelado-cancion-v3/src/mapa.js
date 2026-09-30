/*
 * II · Serranía: mapa de línea del este del Uruguay que se dibuja solo, sobre papel. Coordenadas [lon, lat] reales aproximadas
 * (las mismas del guion gráfico, storyboard/map.js). El camino baja desde el Yaguarón por las sierras hasta Punta Ballena.
 */
(function () {
  const M = (window.MAPA = {});
  const B = { lon0: -55.75, lon1: -52.35, lat0: -31.45, lat1: -35.15, x0: 110, x1: 970, y0: 470 };
  const k = Math.cos((33.3 * Math.PI) / 180), sx = (B.x1 - B.x0) / ((B.lon1 - B.lon0) * k);
  const xy = ([lon, lat]) => [B.x0 + (lon - B.lon0) * k * sx, B.y0 + (B.lat0 - lat) * sx];
  M.xy = xy;
  const coast = [[-56.40, -34.86], [-56.05, -34.80], [-55.78, -34.77], [-55.62, -34.78], [-55.47, -34.79], [-55.38, -34.83], [-55.27, -34.87], [-55.22, -34.90], [-55.12, -34.89], [-55.06, -34.90], [-55.04, -34.92], [-55.00, -34.915], [-54.96, -34.94], [-54.95, -34.97], [-54.92, -34.95], [-54.85, -34.92], [-54.75, -34.88], [-54.63, -34.84], [-54.45, -34.77], [-54.30, -34.70], [-54.20, -34.68], [-54.16, -34.66], [-54.05, -34.58], [-53.90, -34.47], [-53.80, -34.42], [-53.77, -34.39], [-53.66, -34.25], [-53.55, -34.07], [-53.46, -33.92], [-53.37, -33.75], [-53.20, -33.56], [-53.00, -33.33], [-52.80, -33.08], [-52.60, -32.82], [-52.42, -32.55], [-52.28, -32.33], [-52.12, -32.08], [-51.90, -31.80], [-51.60, -31.45], [-51.30, -31.10]];
  const merin = [[-52.78, -32.14], [-52.93, -32.30], [-53.06, -32.47], [-53.17, -32.62], [-53.26, -32.79], [-53.38, -32.97], [-53.50, -33.12], [-53.60, -33.27], [-53.62, -33.45], [-53.55, -33.62], [-53.45, -33.70], [-53.38, -33.55], [-53.30, -33.36], [-53.15, -33.16], [-52.98, -32.96], [-52.82, -32.72], [-52.70, -32.50], [-52.62, -32.30], [-52.66, -32.16]];
  const sauce = [[-55.10, -34.80], [-55.06, -34.79], [-55.05, -34.84], [-55.08, -34.86], [-55.11, -34.83]];
  const yaguaron = [[-54.20, -31.52], [-54.05, -31.75], [-53.90, -31.97], [-53.75, -32.13], [-53.62, -32.28], [-53.50, -32.44], [-53.38, -32.57], [-53.18, -32.62]];
  const tacuari = [[-54.42, -32.58], [-54.18, -32.66], [-53.95, -32.72], [-53.72, -32.79], [-53.50, -32.82], [-53.34, -32.82], [-53.25, -32.79]];
  const ridges = [
    [[-54.05, -31.75], [-54.25, -32.10], [-54.42, -32.42], [-54.52, -32.72], [-54.62, -33.05], [-54.76, -33.40], [-54.90, -33.75], [-55.05, -34.05], [-55.18, -34.35], [-55.26, -34.60], [-55.30, -34.76]], // Cuchilla Grande
    [[-54.32, -32.42], [-54.12, -32.52], [-53.92, -32.60]], // Guazunambí
    [[-54.58, -32.86], [-54.44, -32.96], [-54.30, -33.06]], // Yerbal / Quebrada de los Cuervos
    [[-55.10, -34.58], [-54.95, -34.44], [-54.80, -34.32], [-54.64, -34.18], [-54.50, -34.06]], // Carapé
    [[-55.10, -34.70], [-55.07, -34.80], [-55.045, -34.895]], // Sierra de la Ballena
  ];
  const P = { centurion: [-53.75, -32.13], aigua: [-54.76, -34.20], carape: [-54.90, -34.44], ballena: [-55.04, -34.91] };
  const routeLL = [[-53.75, -32.13], [-54.02, -32.40], [-54.30, -32.64], [-54.46, -32.93], [-54.62, -33.30], [-54.72, -33.74], [-54.76, -34.20], [-54.90, -34.44], [-55.00, -34.68], [-55.04, -34.905]];

  function spline(pts, n = 16) {
    const Q = pts.map(xy), out = [];
    for (let i = 0; i < Q.length - 1; i++) {
      const p0 = Q[Math.max(0, i - 1)], p1 = Q[i], p2 = Q[i + 1], p3 = Q[Math.min(Q.length - 1, i + 2)];
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out.push(Q[Q.length - 1]);
    return out;
  }
  function offset(pts, o) {
    return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [p[0] + (dy / L) * o, p[1] - (dx / L) * o]; });
  }
  function line(pts) { const acc = [0]; for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, acc, L: acc[acc.length - 1] }; }
  // punto a una fracción del largo
  M.pointAt = (ln, f) => {
    const d = PBS.clamp(f, 0, 1) * ln.L; let i = 1;
    while (i < ln.acc.length - 1 && ln.acc[i] < d) i++;
    const u = (d - ln.acc[i - 1]) / Math.max(1e-6, ln.acc[i] - ln.acc[i - 1]);
    const a = ln.pts[i - 1], b = ln.pts[i];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, Math.atan2(b[1] - a[1], b[0] - a[0])];
  };
  function stroke(g, ln, f, w, alpha, dash) {
    if (f <= 0 || alpha <= 0) return;
    const d = Math.min(1, f) * ln.L;
    g.save(); g.globalAlpha *= alpha; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
    if (dash) g.setLineDash(dash);
    g.beginPath(); g.moveTo(ln.pts[0][0], ln.pts[0][1]);
    for (let i = 1; i < ln.pts.length; i++) {
      if (ln.acc[i] <= d) g.lineTo(ln.pts[i][0], ln.pts[i][1]);
      else { const p = M.pointAt(ln, f); g.lineTo(p[0], p[1]); break; }
    }
    g.stroke(); g.restore();
  }
  // geometría precalculada
  const C = spline(coast, 8);
  const L = {
    coast: line(C), waves: [1, 2, 3, 4, 5].map((i) => line(offset(C, -i * 9 - i * i * 1.5))),
    merin: line(spline(merin.concat([merin[0]]), 8)), sauce: line(spline(sauce.concat([sauce[0]]), 6)),
    yaguaron: line(spline(yaguaron, 10)), tacuari: line(spline(tacuari, 10)), route: line(spline(routeLL, 24)),
  };
  L.merinW = [1, 2].map((i) => line(offset(L.merin.pts, i * 7)));
  // signos de sierra (∧) a lo largo de las cumbres, con orden de aparición
  const marks = [];
  { let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    ridges.forEach((r, ri) => { const pts = spline(r, 30); let acc = 0, next = 0; const n0 = marks.length;
      for (let i = 1; i < pts.length; i++) {
        acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        if (acc < next) continue; next = acc + 11 + rnd() * 6;
        const p = pts[i], w = 5 + rnd() * 5, h = w * (0.7 + rnd() * 0.5), j = (rnd() - 0.5) * 9;
        marks.push({ x: p[0] + j, y: p[1] + j * 0.3, w, h, ri });
      }
      for (let i = n0; i < marks.length; i++) marks[i].u = (i - n0) / Math.max(1, marks.length - n0 - 1);
    }); }
  M.route = L.route;
  M.P = P;

  // o: {t, ink, route, fade (0..1 hundirse en el papel)}. Devuelve la punta del camino {x, y, ang, f}
  M.draw = function (g, t, o = {}) {
    const ink = o.ink || '#2b2119', rc = o.routeColor || '#6b3f2a';
    const S = PBS.smooth, E = PBS.ease;
    const u = (a, b) => E((t - a) / (b - a));
    g.save();
    g.globalAlpha = 1 - (o.fade || 0);
    g.strokeStyle = ink; g.fillStyle = ink;
    // aguada muy tenue sobre el mar (el papel apenas más frío)
    const wa = u(41.2, 45.5);
    if (wa > 0) {
      g.save(); g.globalAlpha *= 0.10 * wa; g.fillStyle = '#8a9296';
      g.beginPath(); g.moveTo(C[0][0], C[0][1]); for (const p of C) g.lineTo(p[0], p[1]);
      g.lineTo(1400, C[C.length - 1][1]); g.lineTo(1400, 2200); g.lineTo(-300, 2200); g.lineTo(-300, C[0][1]); g.closePath(); g.fill(); g.restore();
    }
    stroke(g, L.coast, u(40.7, 45.2), 1.8, 0.92);
    L.waves.forEach((w, i) => stroke(g, w, u(41.4 + i * 0.35, 45.8 + i * 0.35), 0.9, 0.26 - (i + 1) * 0.04));
    const mf = u(43.0, 46.8);
    if (mf > 0.999) { g.save(); g.globalAlpha *= 0.10; g.fillStyle = '#8a9296'; g.beginPath(); L.merin.pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.fill(); g.restore(); }
    L.merinW.forEach((w, i) => stroke(g, w, u(43.6, 47.2), 0.8, 0.2 - (i + 1) * 0.06));
    stroke(g, L.merin, mf, 1.4, 0.85);
    stroke(g, L.sauce, u(45.2, 46.4), 1, 0.7);
    stroke(g, L.yaguaron, u(44.0, 47.6), 1.3, 0.8);
    stroke(g, L.tacuari, u(44.8, 48.0), 1.1, 0.75);
    // sierras: los signos aparecen en orden a lo largo de cada cumbre
    const rt = [[45.0, 49.4], [46.2, 48.2], [46.6, 48.6], [47.0, 49.6], [47.6, 49.8]];
    g.lineJoin = 'round'; g.lineCap = 'round';
    for (const m of marks) {
      const [a, b] = rt[m.ri], k = S((t - (a + (b - a) * m.u)) / 0.5);
      if (k <= 0) continue;
      g.save(); g.globalAlpha *= 0.62 * k; g.lineWidth = 1;
      g.beginPath(); g.moveTo(m.x - m.w, m.y); g.lineTo(m.x, m.y - m.h * k); g.lineTo(m.x + m.w * 0.9, m.y); g.stroke();
      g.globalAlpha *= 0.55; g.lineWidth = 0.6; g.beginPath(); g.moveTo(m.x + 0.5, m.y - m.h * k + 2); g.lineTo(m.x + m.w * 0.5, m.y); g.stroke();
      g.restore();
    }
    // lugares
    const dot = (p, r, a) => { if (a <= 0) return; const q = xy(p); g.save(); g.globalAlpha *= a; g.beginPath(); g.arc(q[0], q[1], r, 0, 7); g.fill(); g.restore(); };
    dot(P.centurion, 3.4, S((t - 47.6) / 0.6)); dot(P.aigua, 3.2, S((t - 48.2) / 0.6)); dot(P.carape, 2.6, S((t - 48.5) / 0.6));
    const bq = xy(P.ballena), ba = S((t - 48.8) / 0.6);
    if (ba > 0) { g.save(); g.globalAlpha *= ba; g.lineWidth = 1.3; g.beginPath(); g.arc(bq[0], bq[1], 6, 0, 7); g.stroke(); g.beginPath(); g.arc(bq[0], bq[1], 2.8, 0, 7); g.fill(); g.restore(); }
    // camino: el trazado pendiente es punteado; el recorrido, una línea sepia que avanza
    const f = o.route == null ? 0 : o.route;
    g.save(); g.strokeStyle = rc;
    stroke(g, L.route, 1, 1.3, 0.55 * S((t - 48.6) / 1.2), [1, 7]);
    stroke(g, L.route, f, 2.6, 0.95);
    g.restore();
    const head = M.pointAt(L.route, f);
    // anillo que se abre en el agua al llegar
    const rk = (t - (o.ringAt || 60.4)) / 2.2;
    if (rk > 0 && rk < 1) { g.save(); g.strokeStyle = rc; g.globalAlpha *= 0.7 * (1 - rk); g.lineWidth = 1.2; g.beginPath(); g.ellipse(bq[0], bq[1] + 4, 8 + 40 * E(rk), (8 + 40 * E(rk)) * 0.55, 0, 0, 7); g.stroke(); g.restore(); }
    // nombres (EB Garamond itálica 25 px)
    const lab = (p, s, dx, dy, al, a) => { if (a <= 0) return; const q = xy(p); g.save(); g.globalAlpha *= 0.9 * a; g.font = PBS.font('serif', 25, 400, true); g.textAlign = al; g.textBaseline = 'alphabetic'; g.fillText(s, q[0] + dx, q[1] + dy); g.restore(); };
    lab(P.centurion, 'Yaguarón', 14, -12, 'left', S((t - 50.4) / 0.8));
    lab([-53.72, -32.79], 'Tacuarí', 0, 30, 'center', S((t - 52.2) / 0.8));
    lab(P.aigua, 'Aiguá', 14, 8, 'left', S((t - 56.4) / 0.8));
    lab(P.ballena, 'Punta Ballena', -14, 40, 'center', S((t - 59.4) / 0.8));
    g.restore();
    return { x: head[0], y: head[1], ang: head[2], f };
  };
})();
