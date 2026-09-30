/*
 * La familia (A adulta, M mayor, N niño) y lo que hace en cada capítulo: función pura de t.
 * Se apoya en el esqueleto articulado de la v2 (src/live.js, copiado sin cambios) y adapta las rutinas de src/vida.js de la v2
 * (persona que camina, junta, señala, gira la cabeza; persona sentada). Coordenadas en px de cuadro; y del pie = suelo.
 * lv: {kind:'adult'|'elder'|'child', at:[x,y] (pie), h (alto de un adulto de pie en ese lugar), facing ±1, ...programa}
 */
(function () {
  const F = (window.FAM = {});
  const cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const sm = (x) => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, u) => a + (b - a) * u;
  const TAU = Math.PI * 2;
  const win = (t, a, b, r = 0.8) => sm((t - a) / r) * sm((b - t) / r);
  const keys = (k, t) => { if (!k) return 0; if (t <= k[0][0]) return k[0][1]; for (let i = 0; i < k.length - 1; i++) if (t < k[i + 1][0]) return lerp(k[i][1], k[i + 1][1], sm((t - k[i][0]) / (k[i + 1][0] - k[i][0]))); return k[k.length - 1][1]; };
  // trayecto por claves [[t, x, y], ...] en px de cuadro (absolutos): [x, y, distancia recorrida]
  const path = (k, t) => {
    let d = 0;
    for (let i = 0; i < k.length - 1; i++) {
      const [t0, x0, y0] = k[i], [t1, x1, y1] = k[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
      if (t < t1 || i === k.length - 2) { const u = sm((t - t0) / (t1 - t0)); return [lerp(x0, x1, u), lerp(y0, y1, u), d + L * u]; }
      d += L;
    }
    return [k[0][1], k[0][2], 0];
  };
  F.util = { cl, sm, lerp, win, keys, path };
  // proporciones: la mayor un poco más baja y encorvada; el niño 0,62 del adulto
  const SIZE = { adult: 1, elder: 0.95, child: 0.62 };
  // viento del capítulo (dirección en pantalla × intensidad): ráfagas lentas + los graves de la música
  F.wind = (dir, t, env, k = 1) => dir * k * (2.0 + 2.2 * (0.55 + 0.25 * Math.sin(t * 0.37 + dir) + 0.2 * Math.sin(t * 0.91 + 1.3))) + dir * k * 1.6 * (env ? env.low : 0.3);

  // ---------- persona de pie / caminando / en cuclillas ----------
  function person(lv, t, env, RV) {
    if (!lv.at) lv = { ...lv, at: lv.route ? [lv.route[0][1], lv.route[0][2]] : [0, 0] };
    const kind = lv.kind === 'child' ? 'child' : 'adult';
    const unit = lv.h * SIZE[lv.kind] / 100;
    const wind = (lv.wind || 0) * (lv.facing || 1);
    const flut = t * (4.2 + 0.7 * Math.sin(lv.at[0])) + lv.at[0] * 0.01;
    const breath = 0.35 * Math.sin(t * TAU / (kind === 'child' ? 2.8 : 4.2) + lv.at[1]);
    let st, pos = lv.at.slice(), moving = 0;
    const track = lv.route ? (tt) => path(lv.route, tt) : lv.track;
    if (track) {
      const p = track(t), p2 = track(t - 0.2);
      pos = [p[0], p[1]];
      const amt = cl((p[2] - p2[2]) / 0.2 / (lv.routeV || 1), 0, 1);
      moving = amt;
      const S = (kind === 'child' ? 22 : 30) * (lv.stride || 1);
      const ph = (p[2] / unit) * 0.6 / S * (lv.cadence || 1) + (lv.phase || 0);   // el pie de apoyo retrocede S en el 60 % del ciclo: sin patinar
      st = RV.walkPose(kind, ph, sm(amt * 1.4), { stride: lv.stride || 1 });
      const free = !lv.opts || (!lv.opts.bundle && !lv.opts.staff);
      if (free) st.arms = [null, { hand: [st.hip[0] + 4 + 6 * amt * Math.sin(ph * TAU + Math.PI), 45 - (kind === 'child' ? 8 : 0)] }];
      st.head = { rot: -0.03 + 0.02 * st.sway * amt, look: 1 };
    } else if (lv.squat || lv.gather) {
      const k = lv.squat ? keys(lv.squat, t) : 1;
      st = RV.squatPose(kind, k);
      let hand = null;
      if (lv.gather && k > 0.5) {   // juntar agua: la mano baja al río, la levanta a la boca del cuenco; pausa; otra vez
        const G = lv.gather, ph = (((t - G.t0) / G.period) % 1 + 1) % 1;
        const reach = sm(ph / 0.35) * (1 - sm((ph - 0.55) / 0.3));
        hand = [st.hip[0] + lerp(24, 31 + (G.far || 0), reach), lerp(16, 4.5 + 1.2 * Math.sin(t * 5) * reach, reach)];
        st.hip[1] += 0.8 * reach; st.lean += 0.1 * reach;
      } else if (k > 0.3) hand = [st.hip[0] + 24, lerp(40, 16, k)];
      st.arms = [null, hand ? { hand, elbow: -1 } : null];
      st.head = { rot: lerp(0, lv.headRot == null ? 0.5 : lv.headRot, k), look: 1 };
    } else {
      st = RV.walkPose(kind, 0, 0);
    }
    st.opts = { ...(lv.opts || {}) };
    if (lv.kind === 'elder') { st.lean = (st.lean || 0) + 0.1; st.opts.hair = 10; }
    if (lv.kind === 'adult') st.opts.hair = st.opts.hair || 22;
    st.kind = kind; st.wind = wind * (1 - 0.3 * moving) - 2.2 * moving; st.flut = flut; st.breath = breath;
    if (!st.head) st.head = { rot: 0, look: 1 };
    if (lv.look) st.head.look = keys(lv.look, t);
    if (lv.nod) st.head.rot = (st.head.rot || 0) + keys(lv.nod, t);
    if (lv.kind === 'elder') st.head.rot += 0.12;
    // señalar la lejanía: el brazo cercano sube despacio, se sostiene y baja
    if (lv.point) for (const [a, b, dx, dy] of lv.point) {
      const w = win(t, a, b, 1.1);
      if (w > 0.001) {
        const sh = [st.hip[0] + 1.5, 76], rest = [st.hip[0] + 6, 46], tgt = [sh[0] + dx * 30, sh[1] + dy * 30];
        st.arms = [st.arms ? st.arms[0] : null, { hand: [lerp(rest[0], tgt[0], w), lerp(rest[1], tgt[1], w)], elbow: -1 }];
        st.head.rot -= 0.12 * w * dy;
      }
    }
    // hacerse sombra con la mano sobre los ojos
    if (lv.shade) {
      const w = lv.shade === true ? 1 : keys(lv.shade, t);
      if (w > 0.001) st.arms = [st.arms ? st.arms[0] : null, { hand: [lerp(st.hip[0] + 6, st.hip[0] + 7.5, w), lerp(46, 92.5, w)], elbow: -1 }];
    }
    const o0 = st.opts;
    if (o0.staff && !(st.arms && st.arms[1])) st.arms = [null, { hand: [st.hip[0] + (lv.staffX != null ? lv.staffX : 16.8) - 1.2 * Math.sign(lv.staffX || 1), 63 - (50 - st.hip[1]) * 0.6], elbow: -1 }];
    if (lv.hold) st.arms = [lv.holdFar ? { hand: [st.hip[0] + lv.hold[0], lv.hold[1]], elbow: -1 } : (st.arms ? st.arms[0] : null),
      lv.holdFar ? (st.arms ? st.arms[1] : null) : { hand: [st.hip[0] + lv.hold[0], lv.hold[1] - (50 - st.hip[1]) * 0.5], elbow: -1 }];
    if (o0.staff) st.staffX = st.hip[0] + (lv.staffX != null ? lv.staffX : 16.8);
    return { pos, unit, contact: lv.squat || lv.gather ? [-7, 16] : [-9, 12], draw: (g) => RV.rig(g, st) };
  }

  // ---------- persona sentada en el suelo (la mayor): el cuerpo quieto, la cabeza gira; el manto flamea ----------
  function seated(lv, t, env, RV) {
    const U = RV.LIVE_UTIL, unit = lv.h * SIZE.elder / 100;
    const wind = (lv.wind || 0) * (lv.facing || 1);
    const look = lv.look ? keys(lv.look, t) : 1, nod = lv.nod ? keys(lv.nod, t) : 0;
    const br = 0.3 * Math.sin(t * TAU / 4.6 + lv.at[0]);
    const flut = t * 4.4 + lv.at[0] * 0.01;
    const draw = (g) => {
      U.chain(g, [[1, 8.6, 5.4], [17.6, 27.6, 4.0], [22.4, 14, 3.4], [24.2, 4.2, 2.0]]); U.seg(g, 23.6, 2.2, 1.9, 32.2, 1.2, 1.2); U.ell(g, 23.4, 1.7, 2.3, 1.7);
      U.chain(g, [[-1, 8.2, 5.2], [14.6, 25.2, 3.9], [19.8, 12.4, 3.3], [21.2, 4.2, 1.95]]); U.seg(g, 20.6, 2.2, 1.9, 28.8, 1.2, 1.2);
      const w = wind, f = (i, k) => w * k * (0.7 + 0.4 * Math.sin(flut + i * 1.9));
      U.blob(g, [[3.4, 51.6 + br], [9.2, 49.8 + br], [10.6, 43], [9.4, 33], [6.6, 21], [4, 10], [-1, 3.6], [-8.6 + f(1, .2), 0.8], [-12.2 + f(2, .35), 0.6 + Math.abs(w) * 0.1], [-11.8 + f(3, .35), 8], [-10.2 + f(4, .25), 22], [-7.4 + f(5, .15), 36], [-3, 48.6 + br]]);
      const hx = 7.8, hy = 59.6 + br;
      U.seg(g, hx - 2.8, hy - 11, 3.6, hx - 1, hy - 6.4, 3.0);
      const rot = 0.16 + nod;
      g.save(); g.translate(hx, hy); g.rotate(-rot);
      const sx = look >= 0 ? 1 : -1, k = 0.45 + 0.55 * Math.abs(look), ww = w * 0.5 * sx / k;
      g.save(); g.scale(sx * k, 1);
      U.blob(g, [[1.5, 6.4], [-3.8, 6.2], [-6.6, 1.5], [-7.4 + 0.45 * ww, -4.3], [-7.6 + ww, -9 + 0.25 * Math.abs(ww)], [-4.6 + ww, -9.6], [-2.4 + 0.5 * ww, -5.2], [-0.4, -1.0], [2.2, 3.4]], 1);
      g.restore();
      U.ell(g, 0, 0, 5.5 * (0.9 + 0.1 * Math.abs(look)), 6.65, -0.12 * look);
      U.ell(g, 2.0 * look, -4.3, 1.6 + 1.4 * Math.abs(look), 2.5, 0.3 * look);
      g.restore();
      U.chain(g, [[7.8, 45.4 + br, 2.9], [11.6, 34.4, 2.5], [17.2, 30.6, 2.1]]); U.ell(g, 18.6, 30.4, 2.5, 2.2, -0.2);
    };
    return { pos: lv.at.slice(), unit, contact: [-14, 33], draw };
  }

  // colono (sólo en V, lejos): casaca larga y tricornio; sin armas. Unidades: alto 100, pie en (0,0), y hacia arriba.
  F.colonist = function (g, U, sway) {
    U.seg(g, -2, 50, 3.4, -2 - sway, 3, 2.6); U.seg(g, 2, 50, 3.4, 4 + sway, 3, 2.6);
    U.blob(g, [[-7, 80], [7, 80], [10, 50], [12, 28], [-12, 28], [-9, 50]], 0.8);
    U.seg(g, 0, 78, 2.2, 0, 84, 2.2); U.ell(g, 1, 91, 5, 6);
    U.blob(g, [[-10, 96], [0, 101], [11, 96], [8, 94], [0, 96], [-7, 94]], 0.6);
    U.seg(g, 2, 78, 2, 5, 58, 1.8); U.seg(g, 5, 58, 1.8, 6, 44, 1.6);
  };

  // dibuja una figura: sombra proyectada (la misma silueta inclinada, muy tenue), sombra de contacto y la silueta en tinta plana
  F.draw = function (ctx, lv, t, env, RV, paint) {
    const st = (lv.seated ? seated : person)(lv, t, env, RV);
    const [x, y] = st.pos, s = st.unit, fa = lv.facing || 1;
    const a = lv.alpha == null ? 1 : lv.alpha;
    if (a <= 0.001) return st;
    ctx.save();
    ctx.globalAlpha = a;
    const sh = paint.shadow || 'rgba(30,22,16,0.22)';
    if (paint.cast) {   // sombra proyectada sobre el suelo, con la luz de la copia
      ctx.save(); ctx.fillStyle = sh; ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([fa * s, 0, paint.cast[0] * s, paint.cast[1] * s, x, y])));
      ctx.globalAlpha = a * (paint.castA || 0.55); st.draw(ctx); ctx.restore();
    }
    const ct = st.contact, cx = (ct[0] + ct[1]) / 2 * fa * s, hw = Math.abs(ct[1] - ct[0]) * 0.5 * s;
    ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(x + cx, y + 0.4 * s, hw * 1.25, Math.max(1.4, 2.4 * s), 0, 0, TAU); ctx.fill();
    ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([fa * s, 0, 0, -s, x, y])));
    ctx.fillStyle = paint.ink || '#2a2019'; ctx.strokeStyle = paint.ink || '#2a2019';
    st.draw(ctx);
    ctx.restore();
    return st;
  };
})();
