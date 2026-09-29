/*
 * Revelado — siluetas autorales (Bézier y cápsulas ahusadas) y atlas de figuras.
 * Unidades de pose: altura de un adulto de pie = 100 (canon 7,5 cabezas; niños 5,5), x hacia adelante, y hacia arriba, suelo y = 0.
 * Sin rostros, sin detalle interior, sin animación: sólo la masa de plata.
 */
(function () {
  const RV = (window.RV = window.RV || {});

  // ---------- primitivas (cada una se rellena por separado: unión por superposición) ----------
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill(); }
  // cápsula ahusada entre dos círculos (tangentes exteriores)
  function seg(ctx, x1, y1, r1, x2, y2, r2) {
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy);
    circle(ctx, x1, y1, r1); circle(ctx, x2, y2, r2);
    if (d <= Math.abs(r1 - r2) + 1e-6) return;
    const th = Math.atan2(dy, dx), al = Math.acos((r1 - r2) / d);
    ctx.beginPath();
    ctx.moveTo(x1 + r1 * Math.cos(th + al), y1 + r1 * Math.sin(th + al));
    ctx.lineTo(x2 + r2 * Math.cos(th + al), y2 + r2 * Math.sin(th + al));
    ctx.lineTo(x2 + r2 * Math.cos(th - al), y2 + r2 * Math.sin(th - al));
    ctx.lineTo(x1 + r1 * Math.cos(th - al), y1 + r1 * Math.sin(th - al));
    ctx.closePath(); ctx.fill();
  }
  // cadena de cápsulas: [[x,y,r],...]
  function chain(ctx, pts) { for (let i = 0; i < pts.length - 1; i++) seg(ctx, ...pts[i], ...pts[i + 1]); }
  // polígono cerrado suavizado (Catmull-Rom → Bézier); tension 0 = recto
  function blob(ctx, pts, tension = 1) {
    const n = pts.length;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const k = tension / 6;
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
    }
    ctx.closePath(); ctx.fill();
  }
  function stick(ctx, x1, y1, x2, y2, w) { seg(ctx, x1, y1, w / 2, x2, y2, w / 2); }

  // ---------- partes comunes ----------
  // pierna de perfil: cadera, rodilla, pantorrilla, tobillo; pie hacia +x
  function legP(ctx, hx, hy, kx, ky, ax, ay, s = 1, foot = 1) {
    chain(ctx, [[hx, hy, 4.4 * s], [kx, ky, 3.5 * s], [ax - 0.9 * s, (ky + ay) * 0.55, 3.35 * s], [ax, ay, 1.95 * s]]);
    if (foot) { seg(ctx, ax - 0.8 * s, ay - 2.2 * s, 1.9 * s, ax + 8.4 * s * foot, 1.25 * s, 1.2 * s); ell(ctx, ax - 0.6 * s, 1.7 * s, 2.3 * s, 1.7 * s); }
  }
  // pierna de espaldas (talón visible)
  function legB(ctx, hx, hy, kx, ky, ax, s = 1, boot = 0) {
    const ra = boot ? 3.2 : 2.05;
    chain(ctx, [[hx, hy, 4.6 * s], [kx, ky, 3.7 * s], [(kx + ax) / 2, ky * 0.62, (boot ? 3.7 : 3.55) * s], [ax, 4.2 * s, ra * s]]);
    ell(ctx, ax, 2.0 * s, (boot ? 3.6 : 2.6) * s, (boot ? 2.2 : 1.9) * s);
  }
  // cabeza de perfil (sin rasgos: apenas mentón), mirando a +x; rot inclina hacia adelante
  function headP(ctx, cx, cy, s = 1, rot = 0) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-rot);
    ell(ctx, 0, 0, 5.5 * s, 6.65 * s, -0.12);
    ell(ctx, 2.0 * s, -4.3 * s, 3.0 * s, 2.5 * s, 0.3); // mandíbula
    ctx.restore();
  }
  // pelo suelto de perfil: de la coronilla hacia la nuca y los hombros (lado −x)
  function hairP(ctx, cx, cy, len, s = 1, rot = 0) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-rot);
    blob(ctx, [[1.5 * s, 6.4 * s], [-3.8 * s, 6.2 * s], [-6.6 * s, 1.5 * s], [-7.4 * s, -len * 0.45], [-7.6 * s, -len], [-4.6 * s, -len - 0.6 * s], [-2.4 * s, -len * 0.55], [-0.4 * s, -1.0 * s], [2.2 * s, 3.4 * s]], 1);
    ctx.restore();
  }

  // ---------- poses ----------
  const P = {};

  // Adulto de pie de perfil con manto hasta la rodilla. o: {backHand:[x,y], frontBundle, backBundle, staffFront, hair}
  P.standP = function (ctx, o = {}) {
    // piernas (una apenas adelantada; sin marcha)
    legP(ctx, -2.8, 33, -4.2, 26, -5.6, 4.4);
    legP(ctx, 2.2, 33, 2.8, 26.5, 2.0, 4.4);
    // manto
    blob(ctx, [[-1.5, 86.2], [4.6, 83.4], [7.4, 76], [7.8, 64], [7.2, 52], [8.4, 40], [9.6, 30.6], [4, 29.2], [-3.5, 29.8], [-10.2, 31.4], [-10.6, 44], [-9.4, 60], [-8.8, 73], [-6.6, 82.6]]);
    // cuello y cabeza
    seg(ctx, 0.2, 80.5, 3.6, 1.4, 86.5, 2.9);
    headP(ctx, 1.6, 93.2, 1, 0.05);
    hairP(ctx, 1.6, 93.2, o.hair || 15, 1, 0.05);
    if (o.backHand) { // brazo que sale del manto por detrás y baja (p.ej. a la mano del niño)
      const [hx, hy] = o.backHand;
      chain(ctx, [[-6.5, 74, 3.2], [(-6.5 + hx) / 2 - 1.5, (74 + hy) / 2 + 1, 2.6], [hx, hy, 2.0]]);
      ell(ctx, hx - 0.6, hy - 1.6, 2.3, 2.9, 0.3);
    }
    if (o.backArm) chain(ctx, [[-7, 70, 3], [-9.3, 58, 2.5], [-9.8, 50.5, 2.1]]);
    if (o.frontBundle) { // antebrazo que sale del manto por delante y sostiene un atado contra la cadera
      chain(ctx, [[5.5, 63, 2.9], [9.8, 55.5, 2.3]]);
      blob(ctx, [[8.4, 56.4], [12.8, 55.2], [15.4, 49], [15, 41], [11.6, 36.4], [7.4, 38], [6.6, 46]]);
    }
    if (o.backBundle) { // atado colgado de la mano del lado de atrás
      chain(ctx, [[-7.5, 70, 3], [-10.4, 58, 2.5], [-11.2, 51.5, 2.1]]);
      blob(ctx, [[-9.2, 52.6], [-13.6, 52.4], [-16.6, 46], [-16, 38], [-12, 34.6], [-8.4, 37], [-8.2, 45]]);
    }
    if (o.staffFront) { // vara recta sostenida vertical delante del cuerpo
      stick(ctx, 13.6, -0.5, 13.6, 110, 2.2);
      chain(ctx, [[6.2, 66, 2.9], [11.4, 63.6, 2.3]]);
      ell(ctx, 13.4, 64.2, 2.5, 3.1);
    }
  };

  // Adulto de pie de espaldas (mira hacia el agua), manto, pelo largo, vara vertical opcional a un costado
  P.standB = function (ctx, o = {}) {
    legB(ctx, -4.4, 33, -4.7, 24, -4.9);
    legB(ctx, 4.3, 33, 4.8, 24.5, 5.4);
    blob(ctx, [[0, 86.6], [7.6, 85], [11.4, 81.6], [12.1, 72], [12.2, 56], [12.8, 42], [13.4, 30.6], [6, 29.4], [0, 30.4], [-6.4, 29.6], [-13, 31.2], [-12.4, 44], [-11.8, 58], [-11.8, 73], [-11, 81.8], [-7.4, 85.2]]);
    seg(ctx, 0, 82, 3.8, 0, 87, 3.4);
    ell(ctx, 0, 93.3, 5.5, 6.7);
    // pelo que cae sobre la espalda
    blob(ctx, [[0, 100.1], [4.9, 98.2], [6.3, 92], [6.6, 83], [5.6, 75.4], [0, 74.2], [-5.6, 75.2], [-6.6, 83], [-6.3, 92], [-4.9, 98.2]]);
    if (o.staff) {
      stick(ctx, 16.2, -0.5, 16.2, 109, 2.2);
      chain(ctx, [[10.8, 70, 3], [14.2, 61, 2.3]]);
      ell(ctx, 16, 60.6, 2.5, 3.1);
    }
  };

  // Mayor sentado sobre una piedra baja, de perfil, inclinado hacia adelante, antebrazos sobre las rodillas
  P.seatRock = function (ctx) {
    // piedra baja: caderas a y≈15, rodillas algo más altas; torso casi erguido, manos sobre las rodillas
    legP(ctx, 2.5, 15.5, 18.6, 25.6, 19.4, 4.4);
    legP(ctx, 0.5, 14.8, 16.2, 24.4, 15.6, 4.4);
    blob(ctx, [[5.6, 50.4], [11.8, 48.6], [14.6, 44.2], [15.2, 38.4], [17.2, 33.4], [21.4, 29.6], [20.8, 25.4], [12.4, 18.8], [4, 13.6], [-4.8, 9.6], [-8.4, 10.6], [-9, 20], [-7, 32], [-3.2, 42], [1.4, 48]]);
    seg(ctx, 9.6, 47, 3.6, 11.6, 51.2, 3.0);
    headP(ctx, 13.4, 56.2, 1, 0.22);
    hairP(ctx, 13.4, 56.2, 13, 1, 0.22);
    chain(ctx, [[12.6, 41.6, 2.9], [16.8, 34.2, 2.5], [21.4, 30.2, 2.1]]);
    ell(ctx, 22.8, 29.6, 2.7, 2.3, -0.2);
  };

  // Mayor sentado en la arena, rodillas altas, vara atravesada sobre las rodillas (perfil)
  P.seatGround = function (ctx) {
    ell(ctx, -3, 8.6, 10.6, 8.6);
    chain(ctx, [[0, 10, 5.4], [17.4, 26.2, 4.1], [21, 16, 3.5], [24.4, 4.4, 2.0]]);
    seg(ctx, 23.6, 2.3, 1.9, 32.4, 1.25, 1.2);
    chain(ctx, [[-2, 9.4, 5], [14.2, 23.6, 3.9], [18.4, 13.6, 3.3], [21, 4.4, 1.9]]);
    blob(ctx, [[3, 51.2], [9.4, 49.6], [11.6, 42.8], [11.4, 33], [8, 20], [3, 13], [-6, 3.2], [-14.6, 2.2], [-15.2, 14], [-12.4, 30], [-7.6, 43], [-2.6, 49.6]]);
    seg(ctx, 5, 47, 3.6, 6.8, 51.8, 3.0);
    headP(ctx, 7.6, 58.2, 1, 0.16);
    hairP(ctx, 7.6, 58.2, 13.5, 1, 0.16);
    chain(ctx, [[8, 44, 2.9], [14.6, 34.6, 2.5], [19.4, 30.6, 2.1]]);
    ell(ctx, 20.2, 30.2, 2.4, 2.7);
    stick(ctx, -16, 25.6, 29.5, 33.8, 2.1);
  };

  // Adulto agachado recogiendo (perfil): pies planos, rodillas altas, un brazo hasta el suelo
  P.crouch = function (ctx, o = {}) {
    // pierna lejana y cercana
    chain(ctx, [[-5.4, 18, 6.2], [9.6, 30.4, 4.2], [4.8, 16, 3.4], [2.6, 4.4, 2.0]]);
    seg(ctx, 1.8, 2.3, 1.9, 10.6, 1.25, 1.2); ell(ctx, 1.9, 1.7, 2.3, 1.7);
    chain(ctx, [[-4, 16.4, 6], [12.2, 27.6, 4.0], [7.8, 14, 3.3], [6, 4.4, 1.95]]);
    seg(ctx, 5.2, 2.3, 1.9, 13.8, 1.25, 1.2);
    // manto sobre la espalda hasta la cadera, ceñido
    blob(ctx, [[9.4, 46.2], [14.8, 44.8], [16.8, 40], [14.2, 34.6], [7.4, 29.4], [-0.6, 24.4], [-7.4, 17.4], [-11.4, 15.8], [-11.6, 22], [-7.6, 32.4], [0.4, 41.6]]);
    seg(ctx, 14.2, 43.4, 3.6, 17.4, 46.4, 3.0);
    headP(ctx, 20.4, 47.2, 1, 0.95);
    hairP(ctx, 20.4, 47.2, 12, 1, 0.95);
    // brazo que llega al agua / suelo delante de los pies
    chain(ctx, [[14.5, 38.6, 3], [19.4, 26.6, 2.6], [21.6, 11.2, 2.1]]);
    ell(ctx, 22.2, 9.4, 2.5, 3.0, 0.2);
    // el otro brazo descansa sobre la rodilla
    chain(ctx, [[11.5, 38, 2.9], [14.6, 32.4, 2.4], [15.4, 30.4, 2.1]]);
  };

  // Niño de pie de perfil (5,5 cabezas; altura del niño = 100)
  P.childP = function (ctx, o = {}) {
    const s = 1.3; // grosores relativos al tamaño propio
    chain(ctx, [[-2.6, 40, 4.6 * s], [-3.2, 25, 3.5 * s], [-4.2, 13, 3.1 * s], [-4.8, 4.8, 2.0 * s]]);
    seg(ctx, -5.6, 2.6, 1.9 * s, 3.4, 1.4, 1.3 * s); ell(ctx, -5.4, 2.0, 2.4 * s, 1.8 * s);
    chain(ctx, [[2.6, 40, 4.6 * s], [3, 25, 3.5 * s], [2.4, 13, 3.1 * s], [2.2, 4.8, 2.0 * s]]);
    seg(ctx, 1.4, 2.6, 1.9 * s, 10.6, 1.4, 1.3 * s); ell(ctx, 1.6, 2.0, 2.4 * s, 1.8 * s);
    blob(ctx, [[-1, 79.6], [5.4, 77.6], [8.6, 71], [9, 58], [10.2, 44], [11, 34.6], [4, 33], [-4, 33.4], [-10.8, 35], [-10.6, 48], [-9.4, 62], [-8.4, 72], [-5.8, 78.2]]);
    seg(ctx, 0.2, 76, 4.4, 1.2, 81, 3.8);
    ctx.save(); ctx.translate(1.6, 90.6); ell(ctx, 0, 0, 7.6, 9.1, -0.1); ell(ctx, 2.6, -5.8, 4.2, 3.4, 0.3); ctx.restore();
    blob(ctx, [[2, 99.6], [-5.2, 98.6], [-8.8, 92], [-9.6, 82], [-6.4, 79.2], [-3, 82.6], [-0.6, 89]]);
    if (o.hand) { const [hx, hy] = o.hand; chain(ctx, [[4.4, 72, 4.0], [(4.4 + hx) / 2 + 1, (72 + hy) / 2 - 2, 3.4], [hx, hy, 2.8]]); ell(ctx, hx + 0.6, hy - 0.8, 3.0, 3.3); }
    else chain(ctx, [[3.4, 72, 4], [5.6, 58, 3.3], [6.4, 47, 2.8]]);
  };

  // Niño agachado mirando la arena (altura del niño de pie = 100)
  P.childCrouch = function (ctx) {
    const s = 1.3;
    chain(ctx, [[-6.4, 21, 7.2], [11, 35.6, 5.0], [6, 18, 4.2], [3.4, 5.2, 2.5]]);
    seg(ctx, 2.4, 2.6, 2.4, 13.4, 1.5, 1.6); ell(ctx, 2.4, 2.1, 2.9, 2.1);
    chain(ctx, [[-4.6, 19.4, 7], [14.2, 32.6, 4.9], [9.4, 16.6, 4.0], [7.4, 5.2, 2.4]]);
    seg(ctx, 6.4, 2.6, 2.4, 17.2, 1.5, 1.6);
    blob(ctx, [[8.6, 55], [16.4, 52.4], [19.2, 45], [16.6, 37.6], [8, 33], [-2.4, 27], [-11.6, 16], [-15, 17.6], [-13.4, 30], [-7, 42], [1, 51.4]]);
    seg(ctx, 15.6, 50.6, 4.4, 19.6, 55, 3.8);
    ctx.save(); ctx.translate(23.6, 57.2); ctx.rotate(-0.9); ell(ctx, 0, 0, 7.6, 9.1, -0.1); ell(ctx, 2.6, -5.8, 4.2, 3.4, 0.3); ctx.restore();
    ctx.save(); ctx.translate(23.6, 57.2); ctx.rotate(-0.9); blob(ctx, [[2, 9.0], [-5.2, 8.0], [-8.8, 1.4], [-9.6, -8.6], [-6.4, -11.4], [-3, -8], [-0.6, -1.6]]); ctx.restore();
    chain(ctx, [[16.6, 44.6, 3.6], [22.6, 30.6, 3.2], [24.4, 14.4, 2.7]]);
    ell(ctx, 25, 12.4, 3.1, 3.6, 0.2);
    chain(ctx, [[13, 44, 3.5], [18.4, 33, 3.0], [21.2, 22.6, 2.6]]);
  };

  // Colono de espaldas: sombrero de ala ancha, chaqueta, calzón y botas. o: {sack, stick, coat}
  P.colonist = function (ctx, o = {}) {
    legB(ctx, -4.5, 50, -4.8, 26, -5.0, 1, 1);
    legB(ctx, 4.5, 50, 5.1, 26.5, 5.6, 1, 1);
    // calzón hasta la rodilla (más ancho que la bota)
    blob(ctx, [[-9.4, 52], [9.4, 52], [9.8, 40], [9.2, 29.4], [6.6, 27.4], [2.2, 29], [0, 38], [-2.2, 29], [-6.6, 27.4], [-9.4, 29.4], [-9.8, 40]]);
    const hem = o.coat ? 38 : 47.5;
    blob(ctx, [[0, 85.6], [7.6, 84.4], [11.2, 82.2], [11.2, 72], [10.6, 60], [11.6, hem], [0, hem - 1.2], [-11.6, hem], [-10.6, 60], [-11.2, 72], [-11.2, 82.2], [-7.6, 84.4]], 0.7);
    seg(ctx, 0, 83, 3.4, 0, 87.6, 3.0);
    ell(ctx, 0, 93.0, 5.3, 6.5);
    // sombrero: ala ≥ 1,8 × ancho de cabeza, copa redondeada
    const brim = o.brim || 11.4;
    ell(ctx, 0, 97.2, brim, 2.0);
    blob(ctx, [[-5.4, 97.4], [-5.0, 101.8], [-2.6, 103.6], [2.6, 103.6], [5.0, 101.8], [5.4, 97.4]], 0.6);
    // brazos
    if (o.sack) {
      chain(ctx, [[-11, 80, 3.2], [-12.3, 66, 2.8], [-12.6, 53.5, 2.4]]); ell(ctx, -12.7, 51, 2.4, 3.0);
      chain(ctx, [[10.6, 80, 3.2], [15.2, 71, 2.8], [11.6, 84.2, 2.4]]);
      blob(ctx, [[3, 86.8], [8.6, 92.4], [15.8, 92.4], [19.8, 87.4], [17.6, 81], [11, 81.6]]);
    } else {
      chain(ctx, [[-11, 80, 3.2], [-12.3, 66, 2.8], [-12.6, 53.5, 2.4]]); ell(ctx, -12.7, 51, 2.4, 3.0);
      chain(ctx, [[10.8, 80, 3.2], [14.6, 66, 2.8], [16.6, 55, 2.4]]); ell(ctx, 16.8, 53.2, 2.4, 3.0);
    }
    if (o.stick) stick(ctx, 17.0, 58.5, 21.4, -0.4, 2.3);
  };

  // Vela pequeña lejana (unidades ≈ px de foto; altura total ≈ 22)
  P.sail = function (ctx) {
    blob(ctx, [[-8.6, 1.3], [9.2, 1.7], [7.2, -0.9], [-6.8, -1.0]], 0.2);
    stick(ctx, 0.6, 1, 0.9, 13, 1.0);
    // vela latina: una antena inclinada y un paño triangular
    stick(ctx, -5.5, 5.2, 7.2, 22.5, 0.9);
    ctx.beginPath(); ctx.moveTo(-4.8, 5.8); ctx.lineTo(6.8, 21.8); ctx.quadraticCurveTo(8.8, 11, 7.6, 2.6); ctx.closePath(); ctx.fill();
  };

  // metadatos por pose: extensión del contacto con el suelo (unidades) para la sombra de contacto
  const CONTACT = {
    standP: [-9, 12], standB: [-8.5, 9.5], seatRock: [-9, 26], seatGround: [-12, 30], crouch: [-9, 15],
    childP: [-9, 11], childCrouch: [-12, 19], colonist: [-9.5, 10], sail: [0, 0],
  };

  RV.POSES = P;

  // Dibuja una pose con transformación (u,v)→(ox + f·s·u + kx·s·v, oy − s·v·ky) (ky=1: figura, ky<0: sombra proyectada)
  RV.drawPose = function (ctx, fig, m) {
    ctx.save();
    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
    P[fig.pose](ctx, fig.opts || {});
    ctx.restore();
  };

  /*
   * Construye el atlas de figuras de una copia.
   * figs: [{id, pose, foot:[x,y], unit (px de foto por unidad), facing (+1 derecha, −1 izquierda), group (0 = τ de la copia, 1..3 grupos con inicio propio), opts}]
   * light: {kx, ky} proyección de la sombra (desplazamiento por unidad de altura), rim: [dx,dy] hacia la luz.
   * Devuelve {A: ImageData, B: ImageData|null, boxA, boxB} con R cobertura, G sombra (proyectada+contacto), B borde iluminado, A grupo.
   */
  RV.buildFigureAtlas = function (figs, light, S = 2) {
    const out = {};
    for (const part of ['A', 'B']) {
      const list = figs.filter((f) => (part === 'A' ? !f.group : !!f.group));
      if (!list.length) { out[part] = null; continue; }
      // caja en px de foto
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const f of list) {
        const u = f.unit, h = (f.pose === 'sail' ? 24 : 112) * u;
        const w = (f.pose === 'sail' ? 12 : 45) * u;
        const shx = Math.max(0, light.kx) * h, shy = light.ky * h;
        x0 = Math.min(x0, f.foot[0] - w - 6); x1 = Math.max(x1, f.foot[0] + w + shx + 8);
        y0 = Math.min(y0, f.foot[1] - h - 6); y1 = Math.max(y1, f.foot[1] + shy + 10);
      }
      x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
      const W = Math.ceil((x1 - x0) * S), H = Math.ceil((y1 - y0) * S);
      const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; return [c, g]; };
      const [cCov, gCov] = mk(), [cCast, gCast] = mk(), [cCon, gCon] = mk(), [cRim, gRim] = mk(), [cId, gId] = mk();
      for (const f of list) {
        const fx = (f.foot[0] - x0) * S, fy = (f.foot[1] - y0) * S, s = f.unit * S, fa = f.facing || 1;
        // figura
        RV.drawPose(gCov, f, [fa * s, 0, 0, -s, fx, fy]);
        // sombra proyectada sobre el suelo
        if (f.pose !== 'sail') RV.drawPose(gCast, f, [fa * s, 0, light.kx * s, light.ky * s, fx, fy]);
        // sombra de contacto: elipse 1,4× el apoyo
        const c = CONTACT[f.pose] || [-8, 8];
        const cx0 = c[0] * fa, cx1 = c[1] * fa, cxm = (cx0 + cx1) / 2, hw = Math.abs(cx1 - cx0) * 0.62;
        if (hw > 0) { gCon.beginPath(); gCon.ellipse(fx + cxm * s, fy + 0.6 * s, hw * s, Math.max(1.4 * S, hw * 0.15 * s), 0, 0, Math.PI * 2); gCon.fill(); }
        // grupo (rectángulo dilatado, los grupos están lejos entre sí)
        if (f.group) {
          const h = (f.pose === 'sail' ? 26 : 115) * s, w = (f.pose === 'sail' ? 14 : 48) * s;
          const gv = (f.slot || 1) * 60; gId.fillStyle = `rgb(${gv},${gv},${gv})`;
          gId.fillRect(fx - w, fy - h, 2 * w + Math.max(0, light.kx) * h, h + light.ky * h + 12 * S);
        }
      }
      // borde iluminado: por figura, cobertura menos la cobertura desplazada hacia la luz
      const [cTmp, gTmp] = mk();
      for (const f of list) {
        const fx = (f.foot[0] - x0) * S, fy = (f.foot[1] - y0) * S, s = f.unit * S, fa = f.facing || 1, k = f.rim || 1;
        gTmp.globalCompositeOperation = 'source-over'; gTmp.clearRect(0, 0, W, H);
        RV.drawPose(gTmp, f, [fa * s, 0, 0, -s, fx, fy]);
        gTmp.globalCompositeOperation = 'destination-out';
        RV.drawPose(gTmp, f, [fa * s, 0, 0, -s, fx + light.rim[0] * S * k, fy + light.rim[1] * S * k]);
        gRim.drawImage(cTmp, 0, 0);
      }
      // desenfoques
      const blurred = (src, px) => { const [c, g] = mk(); g.filter = `blur(${px}px)`; g.drawImage(src, 0, 0); return g.getImageData(0, 0, W, H).data; };
      const cov = blurred(cCov, 0.55 * S);
      const cast = blurred(cCast, 4 * S);
      const con = blurred(cCon, 3 * S);
      const rim = blurred(cRim, 0.5 * S);
      const id = gId.getImageData(0, 0, W, H).data;
      const img = new ImageData(W, H), d = img.data;
      for (let i = 0; i < W * H; i++) {
        const k = i * 4;
        d[k] = cov[k + 3];
        d[k + 1] = Math.min(255, (0.30 * cast[k + 3] + 0.55 * con[k + 3]) / 0.85);
        d[k + 2] = rim[k + 3];
        d[k + 3] = part === 'B' ? id[k] : 0;
      }
      out[part] = img;
      out['box' + part] = [x0, y0, x1 - x0, y1 - y0];
    }
    return out;
  };
})();
