/*
 * Figuras vivas: un esqueleto articulado (perfil) con las mismas masas de plata que las siluetas de figures.js,
 * más el barco del interludio, el bote y las aves. Todo es función pura de t (sin estado entre cuadros).
 * Unidades de pose: adulto de pie = 100 (suelo y = 0, y hacia arriba, x hacia adelante).
 * Cada figura viva se dibuja por cuadro en un lienzo crudo opaco: R = cobertura, G = sombra/reflejo, B = marca de «paño claro»
 * (velas); main.js lo convierte en GPU al mismo formato de atlas que las figuras fijas (cobertura, sombra, luz propia, núcleo).
 */
(function () {
  const RV = (window.RV = window.RV || {});
  const TAU = Math.PI * 2;
  const cl = (x, a, b) => Math.max(a, Math.min(b, x));
  const sm = (x) => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
  const lerp = (a, b, u) => a + (b - a) * u;
  // ruido suave determinista 1D (suma de senos inconmensurables)
  const wn = (t, s = 0) => 0.5 * Math.sin(t * 1.13 + s) + 0.3 * Math.sin(t * 2.71 + 1.7 * s + 0.4) + 0.2 * Math.sin(t * 4.33 + 2.9 * s + 1.1);

  // ---------- primitivas ----------
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); g.fill(); }
  function ell(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU); g.fill(); }
  function seg(g, x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    circle(g, x1, y1, r1); circle(g, x2, y2, r2);
    if (d <= Math.abs(r1 - r2) + 1e-6) return;
    const th = Math.atan2(dy, dx), al = Math.acos((r1 - r2) / d);
    g.beginPath();
    g.moveTo(x1 + r1 * Math.cos(th + al), y1 + r1 * Math.sin(th + al));
    g.lineTo(x2 + r2 * Math.cos(th + al), y2 + r2 * Math.sin(th + al));
    g.lineTo(x2 + r2 * Math.cos(th - al), y2 + r2 * Math.sin(th - al));
    g.lineTo(x1 + r1 * Math.cos(th - al), y1 + r1 * Math.sin(th - al));
    g.closePath(); g.fill();
  }
  function chain(g, pts) { for (let i = 0; i < pts.length - 1; i++) seg(g, ...pts[i], ...pts[i + 1]); }
  function blob(g, pts, tension = 1) {
    const n = pts.length, k = tension / 6;
    g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      g.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
    }
    g.closePath(); g.fill();
  }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill(); }
  function line(g, x1, y1, x2, y2, w) { g.save(); g.lineWidth = w; g.lineCap = 'round'; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.restore(); }
  // dos huesos: rodilla (dir = +1 dobla hacia adelante) o codo (dir = −1)
  function ik(h, a, l1, l2, dir) {
    const dx = a[0] - h[0], dy = a[1] - h[1];
    let d = Math.hypot(dx, dy); d = cl(d, Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
    const ang = Math.atan2(dy, dx), c = cl((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const k = ang + dir * Math.acos(c);
    const kn = [h[0] + l1 * Math.cos(k), h[1] + l1 * Math.sin(k)];
    const ea = Math.atan2(a[1] - kn[1], a[0] - kn[0]);
    return [kn, [kn[0] + l2 * Math.cos(ea), kn[1] + l2 * Math.sin(ea)]];
  }

  // ---------- proporciones ----------
  // adulto: cadera 50, rodilla ≈ 27, tobillo 4,4; manto hasta la rodilla. niño (altura propia 100): cadera 40, cabeza grande.
  const PROP = {
    adult: { hipY: 50, l1: 23.6, l2: 22.8, ank: 4.4, rL: [4.4, 3.5, 3.35, 1.95], foot: 8.4, fs: 1, sh: [0.4, 79.5], neck: [[0.2, 80.5, 3.6], [1.4, 86.5, 2.9]], head: [1.6, 93.2], hs: 1, hair: 15,
      cloak: [[-1.5, 86.2], [4.6, 83.4], [7.4, 76], [7.8, 64], [7.2, 52], [8.4, 40], [9.6, 31.6], [4, 30.2], [-3.5, 30.8], [-8.6, 29.2], [-11.2, 27.4], [-10.8, 36], [-10.6, 44], [-9.4, 60], [-8.8, 73], [-6.6, 82.6]],
      ua: 16.5, fa: 15.5, rA: [3.1, 2.6, 2.1] },
    child: { hipY: 40, l1: 16.2, l2: 20.4, ank: 4.8, rL: [4.6 * 1.3, 3.5 * 1.3, 3.1 * 1.3, 2.0 * 1.3], foot: 9.0, fs: 1.3, sh: [0.6, 74], neck: [[0.2, 76, 4.4], [1.2, 81, 3.8]], head: [1.6, 90.6], hs: 1.38, hair: 9,
      cloak: [[-1, 79.6], [5.4, 77.6], [8.6, 71], [9, 58], [10.2, 44], [11, 34.6], [4, 33], [-4, 33.4], [-10.8, 35], [-10.6, 48], [-9.4, 62], [-8.4, 72], [-5.8, 78.2]],
      ua: 15, fa: 14, rA: [4.0, 3.3, 2.8] },
  };

  // cabeza sin rasgos; look: 1 perfil hacia +x, −1 hacia −x, 0 de frente
  function headLive(g, cx, cy, s, rot, look, child) {
    g.save(); g.translate(cx, cy); g.rotate(-rot);
    const al = Math.abs(look);
    if (child) { ell(g, 0, 0, 7.6 * s / 1.38 * (0.9 + 0.1 * al), 9.1 * s / 1.38, -0.1 * look); ell(g, 2.6 * look * s / 1.38, -5.8 * s / 1.38, (2.2 + 2.0 * al) * s / 1.38, 3.4 * s / 1.38, 0.3 * look); }
    else { ell(g, 0, 0, 5.5 * s * (0.9 + 0.1 * al), 6.65 * s, -0.12 * look); ell(g, 2.0 * look * s, -4.3 * s, (1.6 + 1.4 * al) * s, 2.5 * s, 0.3 * look); }
    g.restore();
  }
  // pelo suelto: cae detrás de la cabeza; el viento lleva la punta (wx en unidades locales, + hacia adelante)
  function hairLive(g, cx, cy, len, s, rot, look, wx, child) {
    g.save(); g.translate(cx, cy); g.rotate(-rot);
    const sx = look >= 0 ? 1 : -1, k = 0.45 + 0.55 * Math.abs(look);
    g.scale(sx * k, 1);
    const w = wx * sx / k;
    if (child) {
      blob(g, [[0.3 * s, 6.9 * s], [-5.2 * s / 1.38, 6.2 * s], [-8.8 * s / 1.38, 1.4 * s], [-9.6 * s / 1.38 + 0.4 * w, -8.6 + 0.2 * w * 0.2], [-6.4 * s / 1.38 + 0.8 * w, -11.4], [-3.0 * s / 1.38 + 0.5 * w, -8.0], [-0.6 * s / 1.38, -1.6]], 1);
    } else {
      blob(g, [[1.5 * s, 6.4 * s], [-3.8 * s, 6.2 * s], [-6.6 * s, 1.5 * s], [-7.4 * s + 0.45 * w, -len * 0.45], [-7.6 * s + w, -len + 0.25 * Math.abs(w)], [-4.6 * s + w, -len - 0.6 * s + 0.2 * Math.abs(w)], [-2.4 * s + 0.5 * w, -len * 0.55], [-0.4 * s, -1.0 * s], [2.2 * s, 3.4 * s]], 1);
    }
    g.restore();
  }
  function footDraw(g, ank, toe, s) {
    seg(g, ank[0] - 0.8 * s, ank[1] - 2.2 * s, 1.9 * s, toe[0], toe[1], 1.2 * s);
    ell(g, ank[0] - 0.6 * s, ank[1] - 2.7 * s, 2.3 * s, 1.7 * s);
  }

  /*
   * Esqueleto de perfil. st = {
   *   kind: 'adult'|'child', hip:[x,y], lean (rad, + adelante), legs:[{ank:[x,y], toe:[x,y]} ×2] (la primera es la lejana),
   *   arms:[{hand:[x,y], vis}] (lejano, cercano; sin mano: dentro del manto), head:{rot, look}, wind (unidades locales, + hacia adelante),
   *   flut (fase del flameo), breath, hem:[dxFront, dxBack], opts: {bundle, staff, staffFront, hair}
   * }
   */
  RV.rig = function (g, st) {
    const P = PROP[st.kind || 'adult'], child = st.kind === 'child';
    const hip = st.hip, th = st.lean || 0, c = Math.cos(th), s = Math.sin(th);
    const hipY0 = P.hipY;
    const T = (x, y) => [hip[0] + x * c + (y - hipY0) * s, hip[1] - x * s + (y - hipY0) * c];   // tronco (gira con la inclinación)
    const br = st.breath || 0;
    // piernas: la lejana primero; cadera algo separada en x
    const legs = st.legs.map((L, i) => {
      const hp = [hip[0] + (i ? 1.8 : -2.2) * (child ? 1.1 : 1), hip[1]];
      const [kn, an] = ik(hp, L.ank, P.l1, P.l2, 1);
      return { hp, kn, an, toe: L.toe };
    });
    for (const L of legs) {
      const r = P.rL;
      chain(g, [[L.hp[0], L.hp[1], r[0]], [L.kn[0], L.kn[1], r[1]], [lerp(L.kn[0], L.an[0], 0.45) - 0.5, lerp(L.kn[1], L.an[1], 0.45), r[2]], [L.an[0], L.an[1], r[3]]]);
      footDraw(g, L.an, L.toe, P.fs);
    }
    // manto: arriba acompaña al tronco; abajo (debajo de la cadera) cuelga, se abre con las rodillas y flamea con el viento
    const kx = legs.map((L) => L.kn[0] - hip[0]);
    const kF = Math.max(...kx), kB = Math.min(...kx);
    const hem = st.hem || [0, 0];
    const w = st.wind || 0, fl = st.flut || 0;
    const pts = P.cloak.map(([x, y], i) => {
      if (y >= hipY0 - 6) {
        const u = sm((y - (hipY0 - 6)) / 12);
        let [X, Y] = T(x, y + (y > hipY0 + 20 ? br : 0));
        // transición suave con la falda colgante
        const hx = hip[0] + x, hy = hip[1] + (y - hipY0);
        X = lerp(hx, X, u); Y = lerp(hy, Y, u);
        const flap = (x < 0 ? 1 : 0.35) * w * 0.10 * (1 - u) * (1 + 0.5 * Math.sin(fl + y * 0.12));
        return [X + flap, Y];
      }
      const d = hipY0 - y;                                  // profundidad bajo la cadera
      const front = x > 0;
      let X = hip[0] + x + (front ? Math.max(0, kF - 2.8) * 0.55 + hem[0] : Math.min(0, kB + 4) * 0.55 + hem[1]);
      let Y = hip[1] - d;
      // flameo: la falda se va con el viento, más en el ruedo y del lado de sotavento
      const lee = (x < 0) === (w >= 0) ? 0.6 : 1.0;
      X += w * lee * (0.25 + 0.75 * d / 22) * (0.75 + 0.35 * Math.sin(fl + i * 1.7));
      Y += Math.abs(w) * 0.12 * d / 22 * Math.sin(fl * 1.3 + i);
      if (Y < 1.2) { X -= (1.2 - Y) * 0.55; Y = 1.2; }     // al ras del suelo el manto se apoya y se corre hacia atrás
      return [X, Y];
    });
    blob(g, pts);
    // cuello, cabeza, pelo
    const h = st.head || { rot: 0, look: 1 };
    const n0 = T(P.neck[0][0], P.neck[0][1] + br), n1 = T(P.neck[1][0], P.neck[1][1] + br);
    seg(g, n0[0], n0[1], P.neck[0][2], n1[0], n1[1], P.neck[1][2]);
    const hc = T(P.head[0], P.head[1] + br);
    const hrot = (h.rot || 0) + th * 0.7;
    const look = h.look == null ? 1 : h.look;
    hairLive(g, hc[0], hc[1], (st.opts && st.opts.hair) || P.hair, P.hs, hrot, look, w * 0.55 + 0.6 * Math.sin(fl * 1.1) * Math.abs(w) * 0.15, child);
    headLive(g, hc[0], hc[1], P.hs, hrot, look, child);
    // brazos visibles (fuera del manto)
    (st.arms || []).forEach((A, i) => {
      if (!A || !A.hand) return;
      const shp = T(P.sh[0] + (i ? 1.2 : -1.6), P.sh[1] - 2 + br);
      const [el, wr] = ik(shp, A.hand, P.ua, P.fa, A.elbow || -1);
      chain(g, [[shp[0], shp[1], P.rA[0]], [el[0], el[1], P.rA[1]], [wr[0], wr[1], P.rA[2]]]);
      const ha = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
      ell(g, wr[0] + 1.6 * Math.cos(ha), wr[1] + 1.6 * Math.sin(ha), P.rA[2] * 1.05, P.rA[2] * 1.4, ha + Math.PI / 2);
      A._el = el; A._wr = wr;
    });
    const o = st.opts || {};
    if (o.bundle) { // atado a la cadera, sostenido por el brazo cercano
      const b = T(13.4, 47.6);
      ell(g, b[0], b[1], 5.4, 6.4, 0.25 - th);
    }
    if (o.staff) { // vara vertical al costado (de espaldas) o delante
      const hx = st.staffX != null ? st.staffX : hip[0] + 16.8;
      line(g, hx, -0.5, hx + (st.staffTilt || 0), 109, 2.1);
    }
    if (o.basket) ell(g, hip[0] - 15.5, 2.6, 5.4, 2.8);
    return { legs, T };
  };

  // ---------- marcha ----------
  // fase de un pie en el ciclo (0 = apoyo del talón adelante); S = largo del paso, stance = fracción de apoyo
  function footAt(ph, S, lift, stance, P, fwd = 0.5) {
    ph = ((ph % 1) + 1) % 1;
    if (ph < stance) {
      const u = ph / stance;
      const x = S * fwd - S * u;
      const hr = sm((u - 0.72) / 0.28);                    // el talón se despega al final del apoyo
      const toe = [x + P.foot, 1.25];
      return { ank: [x - hr * 1.2, P.ank + hr * 4.2], toe };
    }
    const u = (ph - stance) / (1 - stance);
    const x = S * (fwd - 1) + S * sm(u);
    const y = P.ank + lift * Math.sin(Math.PI * Math.min(1, u * 1.15)) + (1 - sm(u / 0.25)) * 3.0;
    const a = -0.5 * (1 - sm(u / 0.5)) + 0.18 * sm((u - 0.6) / 0.4);   // punta hacia abajo al despegar, talón primero al llegar
    return { ank: [x, y], toe: [x + P.foot * Math.cos(a) - 0.3, y - 3.15 + P.foot * Math.sin(a)] };
  }
  /* pose de marcha: ph = fase (ciclos), amt = 0 parado … 1 marcha plena; run: carrera corta de niño */
  RV.walkPose = function (kind, ph, amt, o = {}) {
    const P = PROP[kind];
    const run = o.run || 0;
    const S = (kind === 'child' ? 22 : 30) * (1 + 0.3 * run) * amt * (o.stride || 1);
    const stance = lerp(0.6, 0.4, run);
    const fwd = lerp(0.5, 0.3, run);
    const lift = (kind === 'child' ? 5 : 6) * amt * (1 + 1.2 * run);
    const legs = [footAt(ph + 0.5, S, lift, stance, P, fwd), footAt(ph, S, lift, stance, P, fwd)];
    // parado: pies juntos (uno apenas adelantado)
    const rest = [{ ank: [-5.0, P.ank], toe: [-5.0 + P.foot, 1.25] }, { ank: [2.0, P.ank], toe: [2.0 + P.foot, 1.25] }];
    for (let i = 0; i < 2; i++) if (amt < 1) {
      const a = amt;
      legs[i] = { ank: [lerp(rest[i].ank[0], legs[i].ank[0], a), lerp(rest[i].ank[1], legs[i].ank[1], a)], toe: [lerp(rest[i].toe[0], legs[i].toe[0], a), lerp(rest[i].toe[1], legs[i].toe[1], a)] };
    }
    // altura de la cadera: la pierna de apoyo, casi recta, la sostiene (el vaivén sale de la geometría)
    const Lm = P.l1 + P.l2 - 0.35 - 1.2 * run;
    let hy = P.hipY;
    for (let i = 0; i < 2; i++) {
      const L = legs[i], dx = L.ank[0] - (i ? 1.8 : -2.2);
      if (L.ank[1] < P.ank + 1.5) hy = Math.min(hy, L.ank[1] + Math.sqrt(Math.max(1, Lm * Lm - dx * dx)));
    }
    // carrera: fase de vuelo (la cadera sube entre apoyos)
    if (run > 0) hy += run * 1.6 * Math.max(0, Math.sin(TAU * 2 * ph - 1.2));
    return { kind, hip: [0, hy], lean: 0.04 * amt + 0.2 * run, legs, sway: Math.sin(TAU * ph) };
  };
  /* en cuclillas (k = 1) … de pie (k = 0): mismos pies, la cadera baja y se corre atrás, el tronco se inclina */
  RV.squatPose = function (kind, k) {
    const P = PROP[kind];
    const e = sm(k);
    const legs = [{ ank: [lerp(-5, 1.2, e), P.ank], toe: [lerp(-5, 1.2, e) + P.foot, 1.25] }, { ank: [lerp(2, 7.8, e), P.ank], toe: [lerp(2, 7.8, e) + P.foot, 1.25] }];
    return { kind, hip: [lerp(0, -3.0, e), lerp(P.hipY - 0.6, 18.5, e)], lean: lerp(0.02, 0.72, e), legs };
  };

  // ---------- barco (siglo XVIII, dos palos, sin banderas): unidades ≈ px de foto; eslora ≈ 100 ----------
  // o: {set 0 aferradas … 1 velas dadas, pitch (rad), heave}. paint: {body, sail} estilos de relleno.
  RV.drawShip = function (g, o, paint) {
    const set = o.set;
    g.save();
    g.translate(0, o.heave || 0); g.rotate(-(o.pitch || 0));
    g.fillStyle = paint.body;
    // casco: arrufo (sheer) que sube a popa y a proa; alcázar a popa, castillo corto a proa
    blob(g, [[-50, 1.5], [-51.5, 9], [-52, 15.5], [-47, 16.2], [-44.5, 14.2], [-30, 13.2], [-28.5, 11.2], [-10, 9.9], [12, 10.0], [30, 11.0], [36, 11.8], [37, 13.6], [46, 14.6], [49.5, 13.4], [52.5, 9.5], [49, 4], [43, 0.4], [0, -0.3], [-40, 0.2]], 0.35);
    // espejo de popa y regala: pequeñas masas
    poly(g, [[-52.5, 15.5], [-47.5, 16.8], [-47, 15.2], [-52, 14.2]]);
    // bauprés
    line(g, 47, 12.4, 76, 22.5, 1.5);
    line(g, 72, 21.2, 80, 24.4, 0.9);   // botalón
    // palos: trinquete a proa, mayor en el centro (mastelero incluido)
    const FM = [20, 11, 70], MM = [-10, 10, 80];
    for (const [x, y0, top] of [FM, MM]) { line(g, x, y0, x, top * 0.72, 2.0); line(g, x, top * 0.72 - 1, x, top, 1.2); ell(g, x, top * 0.72, 2.6, 0.9); }
    // jarcias: estayes, obenques y brandales (líneas finas)
    const rw = 0.55;
    line(g, FM[0], FM[2], 76, 22.5, rw); line(g, FM[0], FM[2] * 0.72, 49, 13.5, rw);
    line(g, MM[0], MM[2], FM[0], FM[2] * 0.72, rw); line(g, MM[0], MM[2] * 0.72, FM[0] - 1, 14, rw);
    for (const [x, , top] of [FM, MM]) { for (const dx of [-7, -4.5, -2]) line(g, x, top * 0.72, x + dx, 11.5, rw); line(g, x, top, x - 13, 13, rw * 0.9); }
    line(g, MM[0], MM[2] * 0.72, -47, 16, rw);
    // vergas y velas cuadras: dadas (paño panzón) o aferradas (rollo sobre la verga)
    const yards = [[FM[0], FM[2] * 0.66, 15.5, 16], [FM[0], FM[2] * 0.93, 11, 10.5], [MM[0], MM[2] * 0.64, 17.5, 19], [MM[0], MM[2] * 0.93, 12.5, 12]];
    for (const [x, y, half, drop] of yards) {
      g.fillStyle = paint.body;
      line(g, x - half, y, x + half, y, 1.1);
      const h = drop * set;
      if (h > 0.6) {
        g.fillStyle = paint.sail;
        const b = 2.2 * set;                 // panza hacia proa
        g.beginPath(); g.moveTo(x - half + 0.6, y - 0.5);
        g.lineTo(x + half - 0.6, y - 0.5);
        g.quadraticCurveTo(x + half + b * 0.6, y - h * 0.55, x + half - 1.2, y - h);
        g.quadraticCurveTo(x, y - h - 1.4 * set, x - half + 1.2, y - h);
        g.quadraticCurveTo(x - half + b * 0.5, y - h * 0.55, x - half + 0.6, y - 0.5);
        g.closePath(); g.fill();
      }
      g.fillStyle = set < 0.97 ? paint.sail : paint.body;
      ell(g, x, y - 0.3, half * 0.95, 0.6 + 1.1 * (1 - set), 0);   // paño recogido
    }
    // vela de mesana (cangreja) a popa y foque a proa: siguen la misma maniobra
    g.fillStyle = paint.sail;
    if (set > 0.05) {
      g.beginPath(); g.moveTo(MM[0] - 1.5, MM[2] * 0.6); g.lineTo(-36 + 10 * (1 - set), 17 + 30 * set); g.lineTo(-40, 17.5); g.lineTo(MM[0] - 1.5, 17); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(FM[0] + 1.2, FM[2] * 0.7); g.lineTo(FM[0] + 1.2 + 44 * set, 12 + 10 * set); g.lineTo(FM[0] + 1.2 + 16 * set, 12.5); g.closePath(); g.fill();
    }
    g.fillStyle = paint.body;
    line(g, MM[0] - 1.5, 17, -44, 17.5, 0.9);   // botavara
    g.restore();
  };
  // reflejo quebrado y estela, en el canal de sombra (oscurece el agua): el casco invertido y aplastado, cortado en franjas
  RV.drawShipReflection = function (g, o, t, alpha) {
    g.save();
    for (let k = 0; k < 9; k++) {
      const y0 = 0.6 + k * 2.3, y1 = y0 + 1.25 + 0.4 * Math.sin(t * 2.3 + k * 1.9);
      const dx = 1.6 * Math.sin(t * 1.7 + k * 1.3);
      g.save(); g.beginPath(); g.rect(-70, -y1, 160, y1 - y0); g.clip();
      g.translate(dx, 0); g.scale(1, -0.62);
      g.globalAlpha = alpha * (1 - k / 10);
      RV.drawShip(g, { ...o, pitch: -(o.pitch || 0), heave: 0 }, { body: g.fillStyle, sail: g.fillStyle });
      g.restore();
    }
    g.restore();
  };

  // ---------- bote de remos: eslora ≈ 200 u (adulto = 100); dos remeros con sombrero; o.row fase de la palada, o.oars 0 recogidos ----------
  RV.drawBoat = function (g, o) {
    blob(g, [[-100, 17], [-94, 3], [-60, -2], [40, -2], [88, 8], [104, 22], [96, 21], [60, 15], [-20, 14.5], [-80, 16], [-97, 21]], 0.5);
    const ph = o.row || 0, oa = o.oars == null ? 1 : o.oars;
    for (const [x, sgn] of [[-30, 1], [20, 1]]) {
      // remero de espaldas a proa (mira a popa): el cuerpo va y viene con la palada
      const lean = oa * 0.35 * Math.sin(TAU * ph + x);
      const hx = x - 18 * Math.sin(lean), hy = 14 + 34 * Math.cos(lean);
      seg(g, x, 16, 10, hx, hy, 7.5);
      ell(g, hx - 1, hy + 11, 6, 7);
      ell(g, hx - 1, hy + 15.5, 13, 2.2);  // ala del sombrero
      ell(g, hx - 1, hy + 18.5, 6.5, 4);
      // remo: del escálamo al agua; la pala entra y sale
      if (oa > 0.01) {
        const a = TAU * ph + x;
        const bx = x + 8 + lerp(-10, 58 + 26 * Math.cos(a), oa), by = lerp(26, -2 + 10 * Math.max(0, Math.sin(a)), oa);
        line(g, x + 2, 24, bx, by, 2.6);
        ell(g, bx, by - 0.5, 8, 2.4, Math.atan2(by - 24, bx - x - 2));
      }
    }
  };

  // ---------- ave (cuervo o gaviota) de perfil lejano: alas en M que baten; span ≈ 20 u ----------
  RV.drawBird = function (g, flap, gull) {
    const a = Math.sin(flap);               // −1 abajo … 1 arriba
    const up = 5.5 * a, mid = 1.8 * a;
    ell(g, 0, 0, gull ? 3.4 : 3.8, gull ? 1.1 : 1.35, 0);
    ell(g, gull ? 3.5 : 3.9, 0.3, 1.25, 1.05);
    for (const s of [1, -1]) {
      g.beginPath();
      g.moveTo(-1.2, 0.4); g.quadraticCurveTo(s * 3 - 0.5, 1.8 + mid, s * 5.2 - 0.6, 1.2 + mid);
      g.quadraticCurveTo(s * 8 - 1.2, 2 + up, s * 10.5 - 1.6, up + (gull ? -0.3 : 0.6));
      g.quadraticCurveTo(s * 7.2 - 1.2, -0.1 + up * 0.7, s * 4.8 - 0.6, -0.4 + mid * 0.8);
      g.quadraticCurveTo(s * 2.4 - 0.4, -0.3, 1.2, -0.3); g.closePath(); g.fill();
    }
    if (!gull) poly(g, [[-3.4, 0.6], [-6.8, 1.2], [-6.8, -0.8], [-3.4, -0.5]]);   // cola en abanico del cuervo
  };

  RV.LIVE_UTIL = { ik, sm, lerp, cl, wn, blob, seg, chain, ell, line, circle, poly, PROP };
})();
