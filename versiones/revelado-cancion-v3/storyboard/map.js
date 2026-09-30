// Mapa de línea del este del Uruguay. Coordenadas [lon, lat] aproximadas y reales (grados decimales).
(function () {
const M = {};
const B = { lon0: -55.75, lon1: -52.35, lat0: -31.45, lat1: -35.15, x0: 110, x1: 970, y0: 470 };
const k = Math.cos((33.3 * Math.PI) / 180);
const sx = (B.x1 - B.x0) / ((B.lon1 - B.lon0) * k);
B.y1 = B.y0 + (B.lat0 - B.lat1) * sx;
M.B = B;
M.xy = ([lon, lat]) => [B.x0 + (lon - B.lon0) * k * sx, B.y0 + (B.lat0 - lat) * sx];
// costa del Río de la Plata y del Atlántico, oeste → noreste
M.coast = [[-56.40, -34.86], [-56.05, -34.80], [-55.78, -34.77], [-55.62, -34.78], [-55.47, -34.79], [-55.38, -34.83], [-55.27, -34.87], [-55.22, -34.90], [-55.12, -34.89], [-55.06, -34.90], [-55.04, -34.92], [-55.00, -34.915], [-54.96, -34.94], [-54.95, -34.97], [-54.92, -34.95], [-54.85, -34.92], [-54.75, -34.88], [-54.63, -34.84], [-54.45, -34.77], [-54.30, -34.70], [-54.20, -34.68], [-54.16, -34.66], [-54.05, -34.58], [-53.90, -34.47], [-53.80, -34.42], [-53.77, -34.39], [-53.66, -34.25], [-53.55, -34.07], [-53.46, -33.92], [-53.37, -33.75], [-53.20, -33.56], [-53.00, -33.33], [-52.80, -33.08], [-52.60, -32.82], [-52.42, -32.55], [-52.28, -32.33], [-52.12, -32.08], [-51.90, -31.80], [-51.60, -31.45], [-51.30, -31.10]];
M.merin = [[-52.78, -32.14], [-52.93, -32.30], [-53.06, -32.47], [-53.17, -32.62], [-53.26, -32.79], [-53.38, -32.97], [-53.50, -33.12], [-53.60, -33.27], [-53.62, -33.45], [-53.55, -33.62], [-53.45, -33.70], [-53.38, -33.55], [-53.30, -33.36], [-53.15, -33.16], [-52.98, -32.96], [-52.82, -32.72], [-52.70, -32.50], [-52.62, -32.30], [-52.66, -32.16]];
M.sauce = [[-55.10, -34.80], [-55.06, -34.79], [-55.05, -34.84], [-55.08, -34.86], [-55.11, -34.83]];
M.yaguaron = [[-54.20, -31.52], [-54.05, -31.75], [-53.90, -31.97], [-53.75, -32.13], [-53.62, -32.28], [-53.50, -32.44], [-53.38, -32.57], [-53.18, -32.62]];
M.tacuari = [[-54.42, -32.58], [-54.18, -32.66], [-53.95, -32.72], [-53.72, -32.79], [-53.50, -32.82], [-53.34, -32.82], [-53.25, -32.79]];
// líneas de sierra (se dibujan como trazos cortos)
M.ridges = [
  [[-54.05, -31.75], [-54.25, -32.10], [-54.42, -32.42], [-54.52, -32.72], [-54.62, -33.05], [-54.76, -33.40], [-54.90, -33.75], [-55.05, -34.05], [-55.18, -34.35], [-55.26, -34.60], [-55.30, -34.76]], // Cuchilla Grande
  [[-54.32, -32.42], [-54.12, -32.52], [-53.92, -32.60]], // Guazunambí
  [[-54.58, -32.86], [-54.44, -32.96], [-54.30, -33.06]], // Yerbal / Quebrada de los Cuervos
  [[-55.10, -34.58], [-54.95, -34.44], [-54.80, -34.32], [-54.64, -34.18], [-54.50, -34.06]], // Carapé
  [[-55.10, -34.70], [-55.07, -34.80], [-55.045, -34.895]], // Sierra de la Ballena
];
M.places = {
  centurion: [-53.75, -32.13], melo: [-54.18, -32.37], aigua: [-54.76, -34.20], carape: [-54.90, -34.44], ballena: [-55.04, -34.91],
};
M.route = [[-53.75, -32.13], [-54.02, -32.40], [-54.30, -32.64], [-54.46, -32.93], [-54.62, -33.30], [-54.72, -33.74], [-54.76, -34.20], [-54.90, -34.44], [-55.00, -34.68], [-55.04, -34.905]];
// Catmull-Rom → polilínea densa en pantalla
function spline(pts, n = 16) {
  const P = pts.map(M.xy), out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
    }
  }
  out.push(P[P.length - 1]);
  return out;
}
const d = (pts, close) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L') + (close ? ' Z' : '');
function offset(pts, o) { // desplazamiento normal (ondas de agua)
  return pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [p[0] + (dy / L) * o, p[1] - (dx / L) * o]; });
}
M.svg = function (o = {}) {
  const ink = o.ink || '#2b2119', prog = o.progress == null ? 1 : o.progress;
  let s = '';
  const coast = spline(M.coast, 8);
  // aguada muy tenue sobre el mar y la laguna (el papel apenas más frío), para leer tierra y agua sin rótulos
  const f0 = coast[0], f1 = coast[coast.length - 1];
  s += `<path d="${d(coast)} L1400 ${f1[1]} L1400 2200 L-300 2200 L-300 ${f0[1]} Z" fill="#8a9296" opacity=".10"/>`;
  // agua: líneas de costa repetidas mar adentro, cada vez más tenues
  for (let i = 1; i <= 5; i++) s += `<path d="${d(offset(coast, -i * 9 - i * i * 1.5))}" fill="none" stroke="${ink}" stroke-width="0.9" opacity="${0.26 - i * 0.04}"/>`;
  s += `<path d="${d(coast)}" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round" opacity=".92"/>`;
  const mer = spline(M.merin.concat([M.merin[0]]), 8);
  for (let i = 1; i <= 2; i++) s += `<path d="${d(offset(mer, i * 7))}" fill="none" stroke="${ink}" stroke-width=".8" opacity="${0.2 - i * 0.06}"/>`;
  s += `<path d="${d(mer)}" fill="#8a9296" fill-opacity=".10" stroke="${ink}" stroke-width="1.4" opacity=".85"/>`;
  s += `<path d="${d(spline(M.sauce.concat([M.sauce[0]]), 6))}" fill="none" stroke="${ink}" stroke-width="1" opacity=".7"/>`;
  s += `<path d="${d(spline(M.yaguaron, 10))}" fill="none" stroke="${ink}" stroke-width="1.3" opacity=".8"/>`;
  s += `<path d="${d(spline(M.tacuari, 10))}" fill="none" stroke="${ink}" stroke-width="1.1" opacity=".75"/>`;
  // sierras: pequeños signos de monte (∧) a lo largo de las líneas de cumbre, como en la cartografía antigua
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const r of M.ridges) {
    const pts = spline(r, 30);
    let acc2 = 0, next = 0;
    for (let i = 1; i < pts.length; i++) {
      acc2 += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc2 < next) continue;
      next = acc2 + 11 + rnd() * 6;
      const p = pts[i], w = 5 + rnd() * 5, h = w * (0.7 + rnd() * 0.5), j = (rnd() - 0.5) * 9, x = p[0] + j, y = p[1] + j * 0.3;
      s += `<path d="M${(x - w).toFixed(1)} ${y.toFixed(1)} L${x.toFixed(1)} ${(y - h).toFixed(1)} L${(x + w * 0.9).toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${ink}" stroke-width="1" opacity=".62" stroke-linejoin="round" stroke-linecap="round"/>`;
      s += `<path d="M${(x + 0.5).toFixed(1)} ${(y - h + 2).toFixed(1)} L${(x + w * 0.5).toFixed(1)} ${y.toFixed(1)}" stroke="${ink}" stroke-width=".6" opacity=".35"/>`;
    }
  }
  // camino
  const rt = spline(M.route, 24); let acc = [0];
  for (let i = 1; i < rt.length; i++) acc.push(acc[i - 1] + Math.hypot(rt[i][0] - rt[i - 1][0], rt[i][1] - rt[i - 1][1]));
  const tot = acc[acc.length - 1], lim = tot * prog; const done = rt.filter((p, i) => acc[i] <= lim);
  s += `<path d="${d(rt)}" fill="none" stroke="${o.route || '#6b3f2a'}" stroke-width="1.3" stroke-dasharray="1 7" stroke-linecap="round" opacity=".55"/>`;
  s += `<path d="${d(done)}" fill="none" stroke="${o.route || '#6b3f2a'}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity=".95"/>`;
  s += `<circle cx="${done[done.length-1][0]}" cy="${done[done.length-1][1]}" r="9" fill="none" stroke="${o.route || '#6b3f2a'}" stroke-width="1" opacity=".6"/>`;
  const head = done[done.length - 1];
  // lugares
  const dot = (p, r = 3.4, f = ink) => { const q = M.xy(p); return `<circle cx="${q[0]}" cy="${q[1]}" r="${r}" fill="${f}"/>`; };
  s += dot(M.places.centurion, 3.4) + dot(M.places.aigua, 3.2) + dot(M.places.carape, 2.6) + `<circle cx="${M.xy(M.places.ballena)[0]}" cy="${M.xy(M.places.ballena)[1]}" r="6" fill="none" stroke="${ink}" stroke-width="1.3"/>` + dot(M.places.ballena, 2.8);
  const lab = (p, t, dx, dy, anchor = 'start', it = 1, sz = 25) => { const q = M.xy(p); return `<text x="${q[0] + dx}" y="${q[1] + dy}" font-family="EBG" font-style="${it ? 'italic' : 'normal'}" font-size="${sz}" fill="${ink}" text-anchor="${anchor}" opacity=".9">${t}</text>`; };
  for (const L of o.labels || []) s += lab(...L);
  return { svg: s, head, done, xy: M.xy };
};
window.MAP = M;
})();
