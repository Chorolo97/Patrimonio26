/* Líneas de corriente equiespaciadas (Jobard–Lefer) con rejilla hash, RK2 de paso fijo, y dibujo de trazos afinados. */
(function () {
  const S = (window.CC_STREAM = {});

  // o: {w, h, dsep, dtest, step, maxLen, minLen, field(x,y) → [dx,dy]|null, stop(x,y,p0) → bool, seeds:[[x,y]], seedStep}
  S.trace = function (o) {
    const { w, h, dsep, dtest, step } = o;
    const maxLen = o.maxLen || 1e9, minLen = o.minLen || 0;
    const cs = dsep, gw = Math.ceil(w / cs) + 1, gh = Math.ceil(h / cs) + 1;
    const grid = new Array(gw * gh);
    const lines = [];
    const cellOf = (x, y) => Math.floor(y / cs) * gw + Math.floor(x / cs);
    function near(x, y, d, lineId, lineIdx) {
      const cx = Math.floor(x / cs), cy = Math.floor(y / cs), d2 = d * d;
      const r = Math.ceil(d / cs);
      for (let j = cy - r; j <= cy + r; j++) for (let i = cx - r; i <= cx + r; i++) {
        if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
        const c = grid[j * gw + i]; if (!c) continue;
        for (let k = 0; k < c.length; k += 4) {
          if (c[k + 2] === lineId && Math.abs(c[k + 3] - lineIdx) < (d / step) * 2 + 3) continue;
          const dx = c[k] - x, dy = c[k + 1] - y; if (dx * dx + dy * dy < d2) return true;
        }
      }
      return false;
    }
    function add(x, y, id, idx) { const k = cellOf(x, y); (grid[k] || (grid[k] = [])).push(x, y, id, idx); }
    function dirAt(x, y, ref) {
      const v = o.field(x, y); if (!v) return null;
      let [dx, dy] = v; const n = Math.hypot(dx, dy); if (n < 1e-9) return null; dx /= n; dy /= n;
      if (ref && dx * ref[0] + dy * ref[1] < 0) { dx = -dx; dy = -dy; } // campos de orientación (sin signo)
      return [dx, dy];
    }
    function integrate(x, y, sign, id) {
      const pts = [];
      let len = 0, prev = null;
      const d0 = dirAt(x, y, null); if (!d0) return pts;
      prev = [d0[0] * sign, d0[1] * sign];
      const start = [x, y];
      for (let it = 0; it < 4000; it++) {
        const a = o.oriented ? dirAt(x, y, prev) : (() => { const v = dirAt(x, y, null); return v && [v[0] * sign, v[1] * sign]; })();
        if (!a) break;
        const mx = x + a[0] * step * 0.5, my = y + a[1] * step * 0.5;
        const b = o.oriented ? dirAt(mx, my, a) : (() => { const v = dirAt(mx, my, null); return v && [v[0] * sign, v[1] * sign]; })();
        if (!b) break;
        const nx = x + b[0] * step, ny = y + b[1] * step;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) break;
        if (o.stop && o.stop(nx, ny, start)) break;
        if (near(nx, ny, dtest, id, -1)) break;
        len += step; if (len > maxLen / 2 && o.symmetric !== false) break;
        x = nx; y = ny; prev = b; pts.push([x, y]);
      }
      return pts;
    }
    const queue = [];
    function tryLine(sx, sy) {
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;
      if (!o.field(sx, sy)) return;
      if (near(sx, sy, dsep, -1, 0)) return;
      const id = lines.length;
      const f = integrate(sx, sy, 1, id), b = integrate(sx, sy, -1, id);
      const pts = b.reverse().concat([[sx, sy]], f);
      if ((pts.length - 1) * step < minLen) return;
      pts.forEach((p, i) => add(p[0], p[1], id, i));
      lines.push(pts);
      queue.push(id);
    }
    const seeds = o.seeds || [];
    if (!o.seeds) { const ss = o.seedStep || dsep * 2; for (let y = ss / 2; y < h; y += ss) for (let x = ss / 2; x < w; x += ss) seeds.push([x, y]); }
    let si = 0;
    while (si < seeds.length || queue.length) {
      if (queue.length) {
        const id = queue.shift(), L = lines[id];
        for (let i = 0; i < L.length; i += 2) {
          const p = L[i], q = L[Math.min(L.length - 1, i + 1)], pp = L[Math.max(0, i - 1)];
          let tx = q[0] - pp[0], ty = q[1] - pp[1]; const n = Math.hypot(tx, ty) || 1; tx /= n; ty /= n;
          tryLine(p[0] - ty * dsep, p[1] + tx * dsep);
          tryLine(p[0] + ty * dsep, p[1] - tx * dsep);
        }
      } else { const s = seeds[si++]; tryLine(s[0], s[1]); }
    }
    return lines;
  };

  // Trazo afinado: ancho por vértice widthAt(p, u∈[0,1]) → polígono relleno. taper en px en cada punta.
  S.drawStroke = function (ctx, pts, widthAt, taper = 6) {
    if (pts.length < 2) return;
    const n = pts.length, L = [0];
    for (let i = 1; i < n; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = L[n - 1] || 1;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m;
      const tp = Math.min(1, Math.min(L[i], tot - L[i]) / Math.max(0.5, Math.min(taper, tot / 2)));
      const wv = Math.max(0, widthAt(p, L[i] / tot)) * (0.35 + 0.65 * Math.sqrt(tp));
      left.push([p[0] - ty * wv / 2, p[1] + tx * wv / 2]); right.push([p[0] + ty * wv / 2, p[1] - tx * wv / 2]);
    }
    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i][0], left[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath(); ctx.fill();
  };
})();
