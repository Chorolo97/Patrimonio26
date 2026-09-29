/*
 * Personajes imaginados, ilustración de detalle limitado (sin rostros ni manos en primer plano).
 * Tres adultos indígenas y dos pobladores coloniales. Mismo vestuario y proporciones en todos los planos.
 * Vestuario PROVISIONAL de boceto: formas textiles simples y colores naturales, sin adornos inventados.
 * Tonos de piel dentro de un mismo rango para todos: los grupos NO se distinguen por la piel.
 */
(function () {
  const PB = (window.PB = window.PB || {});

  PB.CHARACTERS = {
    // Indígenas: manto de tejido/cuero liso sobre túnica, colores tierra mates.
    ind1: { kind: 'ind', skin: '#9d7054', hair: '#2a221d', hairStyle: 'long', mantle: '#86673f', tunic: '#b09671' },
    ind2: { kind: 'ind', skin: '#a27658', hair: '#2b231f', hairStyle: 'shoulder', mantle: '#5d5044', tunic: '#998a6d' },
    ind3: { kind: 'ind', skin: '#976b4f', hair: '#261f1a', hairStyle: 'tied', mantle: '#7a5a47', tunic: '#a79275' },
    // Pobladores coloniales: camisa, calzón a la rodilla, medias, sombrero de ala sobria, bulto sencillo.
    col1: { kind: 'col', skin: '#a3785b', hair: '#3a2c22', shirt: '#d3c9b4', breeches: '#5a4a3b', stock: '#b3aa98', shoe: '#2e2721', hat: '#3b332c', bundle: 'back', bundleCol: '#9a8464' },
    col2: { kind: 'col', skin: '#9f7457', hair: '#46382b', shirt: '#bfb49c', breeches: '#4d4a45', stock: '#a69f8d', shoe: '#2b251f', hat: '#4a4037', bundle: 'hand', bundleCol: '#8c775a' },
  };

  // Proporciones en unidades de altura (H = 1).
  const D = {
    torso: 0.335, shoulderAt: 0.3, headOff: 0.088, headR: 0.064,
    thigh: 0.245, shin: 0.24, ankleH: 0.035, footLen: 0.075,
    upperArm: 0.165, foreArm: 0.15,
  };
  PB.FIG_DIM = D;

  const TAU = Math.PI * 2;
  const ik = (h, f, a, b) => {
    let dx = f[0] - h[0], dy = f[1] - h[1];
    let d = Math.hypot(dx, dy);
    const maxd = a + b - 1e-4;
    if (d > maxd) { const k = maxd / d; dx *= k; dy *= k; d = maxd; }
    const phi = Math.atan2(dy, dx);
    const al = Math.acos(PB.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
    const ang = phi - al;
    return { knee: [h[0] + a * Math.cos(ang), h[1] + a * Math.sin(ang)], ankle: [h[0] + dx, h[1] + dy] };
  };

  // ---- Poses (coordenadas locales: suelo en y=0, hacia adelante +x, arriba -y, unidades de H) ----
  PB.pose = {
    stand(t, o = {}) {
      const s = o.seed || 0;
      const sway = Math.sin(t * 0.55 + s) * 0.006;
      const breathe = Math.sin(t * 1.5 + s * 2) * 0.0035;
      return {
        hip: [sway, -0.505 + breathe * 0.3],
        lean: (o.lean || 0.02) + Math.sin(t * 0.4 + s) * 0.008,
        headTilt: (o.look || 0) + Math.sin(t * 0.35 + s * 3) * 0.03,
        feet: [[0.05 + (o.stance || 0), 0], [-0.045, 0]],
        arms: [
          { a: (o.armA != null ? o.armA : 0.07) + Math.sin(t * 0.7 + s) * 0.02, e: o.armE != null ? o.armE : 0.14 },
          { a: -0.05 + Math.sin(t * 0.6 + s + 1) * 0.015, e: 0.16 },
        ],
        breathe,
      };
    },

    // s: distancia recorrida (en H). speedN: velocidad normalizada 0..1 (para brazos y balanceo).
    walk(s, speedN, t, o = {}) {
      const step = o.step || 0.27;
      const sf = 0.62, cycle = 2 * step, lift = 0.045;
      const feet = [];
      for (let leg = 0; leg < 2; leg++) {
        const off = leg * 0.5 + (o.phase || 0);
        const u = s / cycle + off;
        const k = Math.floor(u), ph = u - k;
        const P = (k - off + sf / 2) * cycle;
        let fx, fy = 0;
        if (ph < sf) fx = P;
        else {
          const q = (ph - sf) / (1 - sf);
          fx = P + cycle * PB.ease(q);
          fy = -Math.sin(Math.PI * q) * lift;
        }
        feet.push([fx - s, fy]);
      }
      const u0 = s / cycle + (o.phase || 0);
      const bob = 0.012 * speedN * Math.cos(TAU * 2 * (u0 - sf / 2));
      const maxd = sf * step;
      const sw = 0.34 * speedN * (o.armSwing == null ? 1 : o.armSwing);
      return {
        hip: [0, -0.5 - bob],
        lean: (o.lean || 0.05) * (0.5 + 0.5 * speedN) + 0.01,
        headTilt: (o.look || 0) + Math.sin(t * 0.5 + (o.seed || 0)) * 0.02,
        feet,
        arms: [
          { a: -sw * feet[0][0] / maxd + 0.03, e: 0.15 + 0.2 * Math.max(0, -feet[0][0] / maxd) * speedN },
          { a: -sw * feet[1][0] / maxd + 0.03, e: 0.15 + 0.2 * Math.max(0, -feet[1][0] / maxd) * speedN },
        ],
        breathe: 0,
      };
    },

    // Agacharse en la orilla: una rodilla en el suelo, mano hacia el agua con un gesto pequeño.
    crouch(t, o = {}) {
      const s = o.seed || 0;
      const g = Math.sin(t * 1.1 + s);
      return {
        hip: [0, -0.27 + Math.sin(t * 1.3 + s) * 0.004],
        lean: 0.62 + g * 0.02,
        headTilt: 0.22 + Math.sin(t * 0.5 + s) * 0.05,
        feet: [[0.16, 0], [-0.26, 0]],
        arms: [
          { a: 0.36 + g * 0.07, e: 0.12 + Math.sin(t * 1.1 + s + 0.8) * 0.06 },
          { a: 0.38, e: 0.95 },
        ],
        breathe: 0,
        crouch: true,
      };
    },
  };

  // Interpolación entre dos poses (para incorporarse lentamente, etc.).
  PB.blendPose = function (a, b, k) {
    const L = (x, y) => x + (y - x) * k;
    const P = (p, q) => [L(p[0], q[0]), L(p[1], q[1])];
    return {
      hip: P(a.hip, b.hip), lean: L(a.lean, b.lean), headTilt: L(a.headTilt, b.headTilt),
      feet: [P(a.feet[0], b.feet[0]), P(a.feet[1], b.feet[1])],
      arms: [{ a: L(a.arms[0].a, b.arms[0].a), e: L(a.arms[0].e, b.arms[0].e) }, { a: L(a.arms[1].a, b.arms[1].a), e: L(a.arms[1].e, b.arms[1].e) }],
      breathe: L(a.breathe || 0, b.breathe || 0),
      crouch: k < 0.5 ? a.crouch : b.crouch,
    };
  };

  function skeleton(p) {
    const S = {};
    const ax = Math.sin(p.lean), ay = -Math.cos(p.lean);
    const hip = p.hip;
    S.axis = [ax, ay];
    S.perp = [-ay, ax];
    S.hip = hip;
    S.neck = [hip[0] + ax * D.torso, hip[1] + ay * D.torso];
    S.sh = [hip[0] + ax * D.shoulderAt, hip[1] + ay * D.shoulderAt - (p.breathe || 0)];
    const ht = p.lean * 0.6 + p.headTilt;
    S.head = [S.neck[0] + Math.sin(ht) * D.headOff, S.neck[1] - Math.cos(ht) * D.headOff];
    S.headAng = ht;
    S.legs = [0, 1].map((i) => {
      const hj = [hip[0] + (i === 0 ? 0.012 : -0.012), hip[1]];
      const f = p.feet[i];
      const r = ik(hj, [f[0], f[1] - D.ankleH], D.thigh, D.shin);
      return { hip: hj, knee: r.knee, ankle: r.ankle, ground: f[1] };
    });
    S.arms = [0, 1].map((i) => {
      const a = p.arms[i];
      const sh = [S.sh[0] + (i === 0 ? 0.018 : -0.022), S.sh[1] + 0.012];
      const el = [sh[0] + Math.sin(a.a) * D.upperArm, sh[1] + Math.cos(a.a) * D.upperArm];
      const hd = [el[0] + Math.sin(a.a + a.e) * D.foreArm, el[1] + Math.cos(a.a + a.e) * D.foreArm];
      return { sh, el, hand: hd };
    });
    return S;
  }
  // Punto en coordenadas del torso (u: hacia adelante, v: hacia arriba desde la cadera).
  const tp = (S, u, v) => [S.hip[0] + S.perp[0] * u + S.axis[0] * v, S.hip[1] + S.perp[1] * u + S.axis[1] * v];

  // ---- Dibujo ----
  PB.drawFigure = function (ctx, ch, pose, o) {
    const H = o.H, dir = o.dir || 1, t = o.t || 0;
    const haze = o.haze || 0, hazeCol = o.hazeCol || '#c9c6bc';
    const windL = (o.wind == null ? 1 : o.wind) * dir; // viento en coordenadas locales
    const lightL = (o.light == null ? -1 : o.light) * dir;
    const seed = o.seed || 0;
    const C = (hex, k = 1, a = 1) => PB.css(PB.mix(PB.shade(hex, k), hazeCol, haze), a);
    const S = skeleton(pose);

    ctx.save();
    ctx.translate(o.x, o.y);
    // Sombra proyectada suave sobre el suelo
    if (o.shadow !== false) {
      ctx.save();
      ctx.scale(H, H * 0.22);
      const sx = (pose.hip[0]) * dir - lightL * dir * 0.08;
      const g = ctx.createRadialGradient(sx, 0, 0, sx, 0, 0.26);
      g.addColorStop(0, `rgba(35,30,24,${0.26 * (1 - haze)})`);
      g.addColorStop(1, 'rgba(35,30,24,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, 0, 0.26, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.scale(dir * H, H);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const edge = `rgba(34,26,20,${0.38 * (1 - haze * 0.8)})`;
    const ew = 0.009;

    const limb = (pts, w, col) => {
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.strokeStyle = edge; ctx.lineWidth = w + ew; ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    };
    const limbSeg = (a, b, w, col) => limb([a, b], w, col);
    const poly = (pts, fill, smooth = false, stroke = true) => {
      if (smooth) PB.pathSmooth(ctx, pts, true);
      else { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); }
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = edge; ctx.lineWidth = ew * 0.8; ctx.stroke(); }
    };
    const lg = (base, x0, x1) => {
      // Gradiente lateral: lado iluminado más claro.
      const g = ctx.createLinearGradient(x0, 0, x1, 0);
      const lit = C(base, 1.1), dark = C(base, 0.8);
      if (lightL < 0) { g.addColorStop(0, lit); g.addColorStop(1, dark); } else { g.addColorStop(0, dark); g.addColorStop(1, lit); }
      return g;
    };
    const foot = (L, col) => {
      const a = L.ankle;
      const gy = Math.min(0, L.ground);
      const toeY = Math.max(a[1] + 0.02, gy - 0.006);
      ctx.beginPath();
      ctx.moveTo(a[0] - 0.022, a[1] - 0.004);
      ctx.quadraticCurveTo(a[0] - 0.026, toeY + 0.006, a[0] - 0.01, toeY + 0.006);
      ctx.lineTo(a[0] + D.footLen - 0.012, toeY + 0.006);
      ctx.quadraticCurveTo(a[0] + D.footLen + 0.004, toeY - 0.004, a[0] + 0.03, a[1] + 0.006);
      ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = ew * 0.7; ctx.stroke();
    };
    const head = (skinK = 1) => {
      const h = S.head, R = D.headR;
      limbSeg(S.neck, [h[0] - 0.005, h[1] + R * 0.6], 0.044, C(ch.skin, 0.9 * skinK));
      const g = ctx.createRadialGradient(h[0] + lightL * 0.025, h[1] - 0.02, R * 0.1, h[0], h[1], R * 1.1);
      g.addColorStop(0, C(ch.skin, 1.1));
      g.addColorStop(1, C(ch.skin, 0.84));
      ctx.beginPath();
      ctx.ellipse(h[0], h[1], R * 0.92, R, S.headAng * 0.5, 0, TAU);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = edge; ctx.lineWidth = ew * 0.8; ctx.stroke();
    };
    const hairCap = (short) => {
      const h = S.head, R = D.headR, a0 = S.headAng;
      const P = (ang, rr = 1.04) => [h[0] + Math.cos(ang + a0) * R * rr, h[1] + Math.sin(ang + a0) * R * rr];
      ctx.beginPath();
      const s0 = P(-1.25);
      ctx.moveTo(s0[0], s0[1]);
      for (let k = 0; k <= 12; k++) { const ang = -1.25 - (k / 12) * (Math.PI - 1.25 + (short ? 0.9 : 1.3)); const q = P(ang, 1.08); ctx.lineTo(q[0], q[1]); }
      const e = P(short ? 2.2 : 1.9, 0.55);
      ctx.lineTo(e[0], e[1]);
      ctx.quadraticCurveTo(h[0] - R * 0.25, h[1] - R * 0.3, s0[0], s0[1]);
      ctx.closePath();
      ctx.fillStyle = C(ch.hair, 1); ctx.fill();
    };

    const hairBack = (len) => {
      const h = S.head, R = D.headR;
      const flut = Math.sin(t * 2.2 + seed) * 0.012 + 0.018;
      const tipY = S.neck[1] + len;
      const tipX = S.neck[0] - 0.055;
      const wx = windL * (0.01 + flut) * (len > 0.08 ? 1.3 : 0.7);
      const pts = [
        [h[0] - R * 0.2, h[1] - R * 1.0],
        [h[0] - R * 1.05, h[1] - R * 0.3],
        [h[0] - R * 1.05 + wx * 0.3, h[1] + R * 0.8],
        [tipX + wx, tipY],
        [S.neck[0] - 0.015 + wx * 0.5, tipY - 0.01],
        [h[0] - R * 0.15, h[1] + R * 0.7],
      ];
      poly(pts, C(ch.hair, 1), true, false);
    };

    const L0 = S.legs[0], L1 = S.legs[1], A0 = S.arms[0], A1 = S.arms[1];

    if (ch.kind === 'ind') {
      // Brazo y pierna lejanos
      limbSeg(A1.sh, A1.el, 0.05, C(ch.mantle, 0.72));
      limb([A1.el, A1.hand], 0.041, C(ch.skin, 0.78));
      limb([L1.hip, L1.knee, L1.ankle], 0.056, C(ch.skin, 0.8));
      foot(L1, C(ch.skin, 0.62));
      if (ch.hairStyle === 'long') hairBack(0.17);
      else if (ch.hairStyle === 'shoulder') hairBack(0.06);
      // Pierna cercana
      limb([L0.hip, L0.knee, L0.ankle], 0.058, C(ch.skin, 0.95));
      foot(L0, C(ch.skin, 0.72));
      // Túnica (torso + falda hasta la rodilla)
      const kf = L0.knee, kb = L1.knee;
      const hemY = Math.min(-0.012, Math.max(kf[1], kb[1]) + 0.04);
      const tunic = [tp(S, -0.055, 0.31), tp(S, 0.05, 0.31), tp(S, 0.066, 0.2), tp(S, 0.058, 0.05),
        [Math.max(kf[0], S.hip[0] + 0.06) + 0.03, Math.min(-0.012, kf[1] + 0.035)],
        [(kf[0] + kb[0]) / 2, hemY + 0.01],
        [Math.min(kb[0], S.hip[0] - 0.05) - 0.03, Math.min(-0.012, kb[1] + 0.035)],
        tp(S, -0.062, 0.05)];
      poly(tunic, lg(ch.tunic, -0.1, 0.1), true);
      // Manto sobre hombros y espalda, abierto al frente; el borde trasero se mueve con el viento
      const fl = Math.sin(t * 2.1 + seed) * 0.5 + 0.5, fl2 = Math.sin(t * 3.3 + seed * 1.7);
      const wb = windL * (0.012 + 0.018 * fl);
      const mHemY = Math.min(-0.01, Math.max(kf[1], kb[1]) + 0.07);
      const mantle = [
        tp(S, -0.035, 0.338), tp(S, 0.03, 0.332), tp(S, 0.072, 0.295), tp(S, 0.066, 0.2), tp(S, 0.048, 0.06),
        [Math.max(kf[0], S.hip[0]) - 0.005, Math.min(-0.01, kf[1] + 0.06)],
        [(kf[0] + kb[0]) / 2 - 0.02 + wb * 0.6, mHemY + fl2 * 0.006],
        [Math.min(kb[0], S.hip[0]) - 0.08 + wb, mHemY - 0.02 + fl2 * 0.008],
        [...(() => { const q = tp(S, -0.092, 0.06); return [q[0] + wb * 0.6, q[1]]; })()],
        tp(S, -0.082, 0.2), tp(S, -0.062, 0.3),
      ];
      poly(mantle, lg(ch.mantle, -0.12, 0.08), true);
      // Pliegues discretos del manto
      ctx.strokeStyle = C(ch.mantle, 0.72, 0.55); ctx.lineWidth = 0.006;
      ctx.beginPath();
      const f1 = tp(S, -0.03, 0.26), f2 = tp(S, -0.05, 0.05);
      ctx.moveTo(f1[0], f1[1]); ctx.quadraticCurveTo(f2[0], f2[1], (kb[0] + S.hip[0]) / 2 - 0.05 + wb * 0.5, mHemY - 0.03);
      ctx.stroke();
      // Brazo cercano: parte superior cubierta por el manto, antebrazo y mano visibles
      limbSeg(A0.sh, A0.el, 0.056, C(ch.mantle, 0.95));
      limb([A0.el, A0.hand], 0.043, C(ch.skin, 0.96));
      ctx.beginPath(); ctx.arc(A0.hand[0], A0.hand[1], 0.022, 0, TAU); ctx.fillStyle = C(ch.skin, 0.95); ctx.fill();
      head();
      hairCap(false);
      if (ch.hairStyle === 'tied') {
        const h = S.head;
        ctx.beginPath(); ctx.ellipse(h[0] - D.headR * 1.05, h[1] + D.headR * 0.35, 0.024, 0.02, 0, 0, TAU);
        ctx.fillStyle = C(ch.hair, 1); ctx.fill();
      }
    } else {
      // Poblador colonial
      limb([A1.sh, A1.el, A1.hand], 0.05, C(ch.shirt, 0.74));
      ctx.beginPath(); ctx.arc(A1.hand[0], A1.hand[1], 0.02, 0, TAU); ctx.fillStyle = C(ch.skin, 0.75); ctx.fill();
      // pierna lejana: calzón hasta la rodilla, media, zapato
      limbSeg(L1.hip, L1.knee, 0.078, C(ch.breeches, 0.78));
      limbSeg([L1.knee[0], L1.knee[1] + 0.012], L1.ankle, 0.052, C(ch.stock, 0.78));
      foot(L1, C(ch.shoe, 0.9));
      if (ch.bundle === 'back') {
        const b = tp(S, -0.1, 0.2);
        const sw = Math.sin(t * 2.4 + seed) * 0.006;
        ctx.beginPath(); ctx.ellipse(b[0] + sw, b[1], 0.075, 0.1, pose.lean - 0.25, 0, TAU);
        ctx.fillStyle = C(ch.bundleCol, 0.95); ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = ew * 0.8; ctx.stroke();
        ctx.strokeStyle = C(ch.bundleCol, 0.7); ctx.lineWidth = 0.007;
        ctx.beginPath(); ctx.moveTo(b[0] - 0.06, b[1] - 0.03); ctx.quadraticCurveTo(b[0], b[1] + 0.01, b[0] + 0.055, b[1] - 0.05); ctx.stroke();
      }
      limbSeg(L0.hip, L0.knee, 0.08, C(ch.breeches, 0.98));
      limbSeg([L0.knee[0], L0.knee[1] + 0.012], L0.ankle, 0.054, C(ch.stock, 0.98));
      foot(L0, C(ch.shoe, 1.05));
      // cadera del calzón
      poly([tp(S, -0.064, 0.1), tp(S, 0.06, 0.1), tp(S, 0.066, -0.03), tp(S, -0.068, -0.03)], lg(ch.breeches, -0.1, 0.1), true);
      // camisa
      const shirt = [tp(S, -0.05, 0.305), tp(S, -0.022, 0.335), tp(S, 0.024, 0.33), tp(S, 0.055, 0.3), tp(S, 0.066, 0.2), tp(S, 0.056, 0.08), tp(S, 0.062, 0.05), tp(S, -0.064, 0.05), tp(S, -0.06, 0.2)];
      poly(shirt, lg(ch.shirt, -0.1, 0.08), true);
      ctx.strokeStyle = C(ch.shirt, 0.75, 0.6); ctx.lineWidth = 0.005;
      const c1 = tp(S, 0.01, 0.32), c2 = tp(S, 0.03, 0.22);
      ctx.beginPath(); ctx.moveTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke();
      if (ch.bundle === 'back') {
        const s1 = tp(S, 0.035, 0.3), s2 = tp(S, 0.055, 0.1);
        ctx.strokeStyle = C('#6e5b44', 1); ctx.lineWidth = 0.011;
        ctx.beginPath(); ctx.moveTo(s1[0], s1[1]); ctx.lineTo(s2[0], s2[1]); ctx.stroke();
      }
      // brazo cercano con manga
      limb([A0.sh, A0.el, A0.hand], 0.053, C(ch.shirt, 0.97));
      ctx.beginPath(); ctx.arc(A0.hand[0], A0.hand[1], 0.021, 0, TAU); ctx.fillStyle = C(ch.skin, 0.95); ctx.fill();
      if (ch.bundle === 'hand') {
        const hd = A0.hand;
        const sw = Math.sin(t * 2.6 + seed) * 0.012;
        ctx.save();
        ctx.translate(hd[0], hd[1] + 0.008);
        ctx.rotate(-sw * 3);
        ctx.beginPath(); ctx.ellipse(0, 0.06, 0.045, 0.058, 0, 0, TAU);
        ctx.fillStyle = C(ch.bundleCol, 0.95); ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = ew * 0.8; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-0.012, 0.004); ctx.lineTo(0, 0.012); ctx.lineTo(0.014, 0.002);
        ctx.strokeStyle = C(ch.bundleCol, 0.72); ctx.lineWidth = 0.008; ctx.stroke();
        ctx.restore();
      }
      head();
      hairCap(true);
      // sombrero de ala sobria
      const h = S.head, R = D.headR, a0 = S.headAng;
      ctx.save();
      ctx.translate(h[0] + 0.004, h[1] - R * 0.55);
      ctx.rotate(a0 * 0.8);
      ctx.beginPath();
      ctx.moveTo(-0.052, 0.004); ctx.quadraticCurveTo(-0.054, -0.06, -0.004, -0.064);
      ctx.quadraticCurveTo(0.05, -0.062, 0.054, 0.004); ctx.closePath();
      ctx.fillStyle = C(ch.hat, 1.05); ctx.fill(); ctx.strokeStyle = edge; ctx.lineWidth = ew * 0.8; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0.004, 0.004, 0.108, 0.02, 0, 0, TAU);
      ctx.fillStyle = C(ch.hat, 0.9); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  };

  // Recorrido de caminata: distancia s(t) en px. Sin «startMoving» arranca suave; con «stop» se detiene suave en t1.
  // Sin «stop» sigue caminando a velocidad constante (atraviesa el encuadre).
  PB.walkTrack = function (t, o) {
    const T = o.t1 - o.t0, a = Math.min(o.accel == null ? 0.8 : o.accel, T / 2);
    const as = o.startMoving ? 0 : a, ae = o.stop ? a : 0;
    const vmax = o.dist / (T - as / 2 - ae / 2);
    const tt = t - o.t0;
    let s, v;
    if (tt < 0) { s = o.startMoving ? vmax * tt : 0; v = o.startMoving ? vmax : 0; }
    else if (tt < as) { s = 0.5 * vmax * tt * tt / as; v = vmax * tt / as; }
    else if (tt <= T - ae) { s = 0.5 * vmax * as + vmax * (tt - as); v = vmax; }
    else if (tt <= T) { const r = T - tt; s = o.dist - 0.5 * vmax * r * r / ae; v = vmax * r / ae; }
    else if (o.stop) { s = o.dist; v = 0; }
    else { s = o.dist + vmax * (tt - T); v = vmax; }
    return { s, v, vmax };
  };
})();
