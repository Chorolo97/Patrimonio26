/* Tomas, reparto y estado de las figuras por cuadro (todo en forma cerrada de t). */
(function () {
  const LR = (window.LR = window.LR || {});
  const D2R = Math.PI / 180;

  LR.makeScene = function (cfg, clock) {
    const shots = cfg.shots.map((s) => ({ ...s, f0: Math.round(s.t0 * cfg.fps), f1: Math.round(s.t1 * cfg.fps) }));
    const az = cfg.sun.azimuth * D2R, toSun = [Math.sin(az), Math.cos(az)], sDir = [-toSun[0], -toSun[1]], perp = [-sDir[1], sDir[0]];

    function shotAt(t) {
      const f = Math.round(t * cfg.fps);
      for (let i = shots.length - 1; i >= 0; i--) if (f >= shots[i].f0) return shots[i];
      return shots[0];
    }
    function xform(s, t) {
      const tau = PBS.clamp(t - s.t0, 0, s.t1 - s.t0), th = s.theta * D2R;
      const push = 1 + (s.push - 1) * (tau / (s.t1 - s.t0));
      const mpp = s.W / 1080 / push;
      const RX = [Math.cos(th), -Math.sin(th)], UY = [Math.sin(th), Math.cos(th)];
      const ox = -s.drift[0] * tau, oy = -s.drift[1] * tau; // desplazamiento de cámara en px (y hacia abajo)
      const cx = s.center[0] + (RX[0] * ox - UY[0] * oy) * (s.W / 1080), cy = s.center[1] + (RX[1] * ox - UY[1] * oy) * (s.W / 1080);
      return { cx, cy, mpp, th, RX, UY };
    }
    const toWorld = (X, sx, sy) => [X.cx + (X.RX[0] * (sx - 540) + X.UY[0] * (960 - sy)) * X.mpp, X.cy + (X.RX[1] * (sx - 540) + X.UY[1] * (960 - sy)) * X.mpp];
    const toScreen = (X, p) => { const rx = p[0] - X.cx, ry = p[1] - X.cy; return [540 + (rx * X.RX[0] + ry * X.RX[1]) / X.mpp, 960 - (rx * X.UY[0] + ry * X.UY[1]) / X.mpp]; };

    // ---- sendero: Catmull-Rom con serpenteo ----
    const noise = PBS.makeNoise(cfg.seed + 7);
    function trailDense(step) {
      const P = cfg.world.trail, out = [];
      for (let i = 0; i < P.length - 1; i++) {
        const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
        const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), n = Math.max(2, Math.ceil(len / 1));
        for (let k = 0; k < n; k++) {
          const u = k / n, u2 = u * u, u3 = u2 * u;
          const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
          out.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1])]);
        }
      }
      out.push(P[P.length - 1].slice());
      // longitud de arco y serpenteo lateral
      let s = 0; const res = [];
      for (let i = 0; i < out.length; i++) {
        if (i) s += Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]);
        const a = out[Math.max(0, i - 1)], b = out[Math.min(out.length - 1, i + 1)];
        let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
        const m = cfg.world.trailMeander * (0.55 * Math.sin(s / 95 + 1.3) + 0.45 * (noise.fbm(s / 40, 3.3, 3) - 0.5) * 2.2);
        res.push({ p: [out[i][0] - dy * m, out[i][1] + dx * m], s });
      }
      // remuestreo uniforme
      const R = [];
      let j = 0;
      for (let t = 0; t <= s; t += step) {
        while (j < res.length - 2 && res[j + 1].s < t) j++;
        const u = (t - res[j].s) / Math.max(1e-6, res[j + 1].s - res[j].s);
        R.push([res[j].p[0] + (res[j + 1].p[0] - res[j].p[0]) * u, res[j].p[1] + (res[j + 1].p[1] - res[j].p[1]) * u]);
      }
      return R;
    }
    const trailFine = trailDense(2), trailCoarse = trailDense(7);
    // arco del sendero (para figuras que caminan sobre él)
    const trailS = [0]; for (let i = 1; i < trailFine.length; i++) trailS.push(trailS[i - 1] + Math.hypot(trailFine[i][0] - trailFine[i - 1][0], trailFine[i][1] - trailFine[i - 1][1]));
    function trailAtS(s) {
      s = PBS.clamp(s, 0, trailS[trailS.length - 1]);
      let lo = 0, hi = trailS.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (trailS[m] <= s) lo = m; else hi = m; }
      const u = (s - trailS[lo]) / Math.max(1e-6, trailS[hi] - trailS[lo]);
      const a = trailFine[lo], b = trailFine[hi];
      const d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1;
      return { p: [a[0] + d[0] * u, a[1] + d[1] * u], dir: [d[0] / l, d[1] / l] };
    }
    function nearestTrailS(p) { let best = 1e9, bs = 0; for (let i = 0; i < trailFine.length; i++) { const d = Math.hypot(trailFine[i][0] - p[0], trailFine[i][1] - p[1]); if (d < best) { best = d; bs = trailS[i]; } } return bs; }

    // ---- reparto: posiciones en el mundo ----
    const cast = {};
    for (const s of shots) {
      const X = xform(s, s.t0);
      cast[s.id] = (cfg.cast[s.id] || []).map((c) => {
        const o = { ...c, shot: s.id };
        if (c.at) o.foot = toWorld(X, c.at[0], c.at[1]);
        if (c.world) o.foot = c.world.slice();
        if (c.path) o.pathW = c.path.map((q) => toWorld(X, q[0], q[1]));
        if (c.trailAt != null) { const sc = nearestTrailS([s.center[0], s.center[1]]); o.s0 = sc + c.trailAt; }
        return o;
      });
    }
    // roca del niño (S8) y asiento de la anciana: rocas explícitas en el horneado de la punta
    const rocks = [];
    const s8 = shots.find((s) => s.id === 'S8');
    const eChild = clock.elev(cfg.childRock.onset);
    for (const c of cast.S8 || []) {
      if (c.childRock) {
        const Lsh = cfg.childRock.h / Math.tan(eChild * D2R);
        c.rock = [c.foot[0] + toSun[0] * (Lsh * 0.93 + 0.2), c.foot[1] + toSun[1] * (Lsh * 0.93 + 0.2), cfg.childRock.r, cfg.childRock.h];
        rocks.push(c.rock);
      } else if (c.rock) {
        const fa = c.face * D2R, fw = [Math.sin(fa), Math.cos(fa)];
        rocks.push([c.foot[0] - fw[0] * 0.32, c.foot[1] - fw[1] * 0.32, 0.62, 0.48]);
      }
    }

    return { shots, shotAt, xform, toWorld, toScreen, trailFine, trailCoarse, trailAtS, cast, rocks, toSun, sDir, perp, s8 };
  };

  // ---- estado de figuras en t ----
  // distancia recorrida con parada suavizada: v0 constante hasta ts, frena en d segundos (integral cerrada de smoothstep)
  function walkDist(t, t0, v0, ts, d) {
    if (t <= t0) return 0;
    const x = PBS.clamp((t - ts) / d, 0, 1);
    return v0 * (Math.min(t, ts) - t0) + v0 * d * (x - (x * x * x - x * x * x * x / 2));
  }
  function walkSpeed(t, t0, v0, ts, d) { if (t < t0) return 0; const x = PBS.clamp((t - ts) / d, 0, 1); return v0 * (1 - x * x * (3 - 2 * x)); }

  LR.figureStates = function (cfg, SC, clock, atlas, shot, t, litAt) {
    const list = SC.cast[shot.id] || [];
    const out = [];
    for (const c of list) {
      let foot = c.foot ? c.foot.slice() : null, face = typeof c.face === 'number' ? c.face : 0, moving = 0;
      let silA = c.sil[0], silB = c.sil[1] || c.sil[0], wB = 0;
      if (c.s0 != null) { // camina por el sendero hacia el sur
        const stopT = 12.55, dEase = 1.1;
        const s = c.s0 + walkDist(t, shot.t0 - 3, c.v, stopT, dEase) - walkDist(shot.t0, shot.t0 - 3, c.v, stopT, dEase);
        const tp = SC.trailAtS(s);
        const side = [-tp.dir[1], tp.dir[0]];
        foot = [tp.p[0] + side[0] * (c.lat || 0), tp.p[1] + side[1] * (c.lat || 0)];
        face = Math.atan2(tp.dir[0], tp.dir[1]) / (Math.PI / 180);
        moving = walkSpeed(t, shot.t0 - 3, c.v, stopT, dEase) / c.v;
        // al detenerse cambia a una silueta de pie (fundido 1 s)
        const standMap = { iP_walk_elder: 'iP_elder_a', iP_walk_staff: 'iP_staff_a', iP_walk_child: 'iP_child_a', iP_walk_bundle: 'iP_bundle_a', iP_walk_adult: 'iP_adult_a' };
        silB = standMap[silA] || silA; wB = PBS.smooth((t - (stopT + dEase * 0.55)) / 1.0);
      } else if (c.pathW) { // camina por una polilínea de pantalla (S6)
        const P = c.pathW; let total = 0; const seg = [];
        for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); seg.push(l); total += l; }
        const dEase = 1.2, ts = c.stop - dEase * 0.5;
        const s = Math.min(total, walkDist(t, shot.t0 - 4, c.v, ts, dEase) - walkDist(shot.t0, shot.t0 - 4, c.v, ts, dEase));
        let acc = 0, i = 0; while (i < seg.length - 1 && acc + seg[i] < s) { acc += seg[i]; i++; }
        const u = (s - acc) / seg[i];
        foot = [P[i][0] + (P[i + 1][0] - P[i][0]) * u, P[i][1] + (P[i + 1][1] - P[i][1]) * u];
        face = Math.atan2(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]) / (Math.PI / 180);
        moving = walkSpeed(t, shot.t0 - 4, c.v, ts, dEase) / c.v;
        wB = PBS.smooth((t - c.stop + 0.3) / 1.0);
      } else if (c.sil.length > 1 && c.swap) { // cambio de apoyo cada 6–9 s con fundido de 1 s
        const off = (c.id.charCodeAt(1) * 1.37) % c.swap;
        const k = (t + off) / c.swap, idx = Math.floor(k) % 2, fr = (k - Math.floor(k)) * c.swap;
        const cur = idx, prev = 1 - idx;
        const w = PBS.smooth(fr / 1.0);
        // mezcla prev→cur; expresada como A + wB·(B−A)
        wB = cur === 1 ? w : 1 - w;
      }
      const a = atlas.index[silA] || atlas.index[c.sil[0]], b = atlas.index[silB] || a;
      const k = c.H / a.refH;
      const hF = litAt.height(foot);
      let lit = litAt.lit(foot, t, hF, c);
      // perfil: invertir para que el frente de la silueta mire hacia donde camina/mira
      const fr = face * Math.PI / 180, fw = [Math.sin(fr), Math.cos(fr)];
      const isProfile = /^iP_|^cP_/.test(silA);
      const flip = isProfile ? (fw[0] * SC.perp[0] + fw[1] * SC.perp[1] < 0 ? 1 : 0) : (c.flipBack ? 1 : 0);
      const pose = c.pose === 'crouch' ? 2 : c.pose === 'seat' ? 3 : moving > 0.05 ? 1 : 0;
      out.push({ id: c.id, foot, hF, k, colA: a.col + a.row * atlas.cols, colB: b.col + b.row * atlas.cols, wB, flip, moving, lit, face: fr, Hrel: c.H / k, body: c.child ? 0.72 : 1, pose, isCol: c.kind === 'col' ? 1 : 0 });
    }
    return out;
  };
})();
