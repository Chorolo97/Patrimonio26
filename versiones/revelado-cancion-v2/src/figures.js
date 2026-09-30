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

  // Adulto de pie de perfil con manto hasta la rodilla. o: {backHand:[x,y], armLoose, staffFront, hair}
  P.standP = function (ctx, o = {}) {
    // piernas (una apenas adelantada; sin marcha)
    legP(ctx, -2.8, 33, -4.2, 26, -5.6, 4.4);
    legP(ctx, 2.2, 33, 2.8, 26.5, 2.0, 4.4);
    // manto (el ruedo quiebra el contorno: una punta cae más baja atrás)
    blob(ctx, [[-1.5, 86.2], [4.6, 83.4], [7.4, 76], [7.8, 64], [7.2, 52], [8.4, 40], [9.6, 31.6], [4, 30.2], [-3.5, 30.8], [-8.6, 29.2], [-11.2, 27.4], [-10.8, 36], [-10.6, 44], [-9.4, 60], [-8.8, 73], [-6.6, 82.6]]);
    // cuello y cabeza
    seg(ctx, 0.2, 80.5, 3.6, 1.4, 86.5, 2.9);
    headP(ctx, 1.6, 93.2, 1, 0.05);
    hairP(ctx, 1.6, 93.2, o.hair || 15, 1, 0.05);
    if (o.backHand) { // brazo que sale del manto por delante y baja a la mano del niño
      const [hx, hy] = o.backHand;
      const sx = hx < 0 ? -6.5 : 5.2;
      chain(ctx, [[sx, 74, 3.1], [(sx + hx) / 2 + (hx < 0 ? -1.5 : 1.2), (74 + hy) / 2 + 1, 2.6], [hx, hy, 2.0]]);
      ell(ctx, hx + (hx < 0 ? -0.6 : 0.4), hy - 1.8, 2.2, 2.9, hx < 0 ? 0.3 : -0.2);
    }
    if (o.armLoose) { // brazo suelto, separado del cuerpo por una luz
      chain(ctx, [[6.4, 76, 3.1], [9.6, 62, 2.6], [10.4, 50, 2.1]]);
      ell(ctx, 10.5, 47.6, 2.1, 3.0, 0.1);
    }
    if (o.bundle) { // atado sostenido a la cadera: el brazo baja por delante y la mano lo sujeta
      chain(ctx, [[6.0, 75, 3.0], [10.0, 63, 2.5], [12.0, 55, 2.1]]);
      ell(ctx, 13.4, 47.6, 5.4, 6.4, 0.25);
      ell(ctx, 12.4, 53.8, 2.5, 3.0, 0.1);
    }
    if (o.staffFront) { // vara recta sostenida vertical delante del cuerpo
      stick(ctx, 14.2, -0.5, 14.2, 108, 2.1);
      chain(ctx, [[6.2, 75, 3.0], [11.4, 66.5, 2.5], [13.2, 63.6, 2.2]]);
      ell(ctx, 13.9, 63.4, 2.4, 3.2);
    }
  };

  // Adulto de pie de espaldas (mira hacia el agua), manto, pelo largo, vara vertical opcional a un costado
  P.standB = function (ctx, o = {}) {
    legB(ctx, -4.4, 33, -4.7, 24, -4.9);
    legB(ctx, 4.3, 33, 4.8, 24.5, 5.4);
    blob(ctx, [[0, 86.6], [7.6, 85], [11.4, 81.6], [12.1, 72], [12.2, 56], [12.8, 42], [13.4, 30.6], [6, 29.4], [0, 30.4], [-6.4, 28.6], [-12.4, 27.2], [-12.4, 44], [-11.8, 58], [-11.8, 73], [-11, 81.8], [-7.4, 85.2]]);
    seg(ctx, 0, 82, 3.8, 0, 87, 3.4);
    ell(ctx, 0.6, 93.3, 5.5, 6.7, 0.08);
    blob(ctx, [[0, 100.1], [4.9, 98.2], [6.3, 92], [6.6, 83], [5.6, 75.4], [0, 74.2], [-5.6, 75.2], [-6.6, 83], [-6.3, 92], [-4.9, 98.2]]);
    // mano izquierda visible, suelta junto al manto
    chain(ctx, [[-11.6, 60, 2.5], [-13.2, 52, 2.1]]); ell(ctx, -13.4, 49.8, 2.0, 2.8);
    if (o.staff) {
      stick(ctx, 16.8, -0.5, 16.8, 109, 2.1);
      chain(ctx, [[11.2, 72, 3], [14.6, 63, 2.3]]);
      ell(ctx, 16.6, 62.4, 2.5, 3.1);
    }
  };

  // Adulto de tres cuartos, brazos sueltos, apenas girado hacia el agua
  P.standQ = function (ctx, o = {}) {
    legB(ctx, -4.8, 33, -5.6, 24, -6.2);
    legP(ctx, 3.4, 33, 4.6, 26, 4.2, 4.4, 1, 0.7);
    blob(ctx, [[0.8, 86.6], [7.6, 85], [10.8, 81], [11.2, 70], [10.6, 56], [11.6, 42], [12.6, 31.4], [5.4, 29.8], [-1, 30.4], [-7.2, 28.4], [-12.2, 27.6], [-11.8, 42], [-11, 58], [-11.2, 73], [-10.2, 81.6], [-6.6, 85.4]]);
    seg(ctx, 0.6, 82, 3.8, 1.0, 87, 3.3);
    headP(ctx, 1.6, 93.3, 1, 0.02);
    hairP(ctx, 1.2, 93.3, 16, 1.1, 0.02);
    // brazos sueltos a ambos lados, con luz entre brazo y manto
    chain(ctx, [[10.2, 78, 3.1], [13.6, 64, 2.6], [14.4, 52.5, 2.1]]); ell(ctx, 14.5, 50.2, 2.1, 3.0, 0.1);
    chain(ctx, [[-10, 78, 3.1], [-13.4, 64, 2.6], [-14, 53, 2.1]]); ell(ctx, -14.1, 50.6, 2.1, 3.0, -0.1);
  };

  // Mayor sentado sobre una piedra baja (perfil): muslo visible casi horizontal, rodillas altas, mano sobre la rodilla,
  // el manto cae por detrás y forma una espalda legible. Asiento a y = 16 (se apoya en el contorno de la piedra).
  P.seatRock = function (ctx) {
    // piernas: muslo, rodilla, canilla vertical hasta el pie en el suelo (luz bajo el muslo)
    chain(ctx, [[1.5, 19.5, 5.0], [20.5, 23.8, 3.9], [21.6, 12, 3.3], [21.8, 4.2, 2.0]]);
    seg(ctx, 21.2, 2.2, 1.9, 29.8, 1.2, 1.2); ell(ctx, 21.2, 1.7, 2.3, 1.7);
    chain(ctx, [[-0.5, 18.5, 5.0], [17.2, 22.4, 3.8], [17.4, 11, 3.2], [17.2, 4.2, 1.95]]);
    seg(ctx, 16.6, 2.2, 1.9, 25.2, 1.2, 1.2);
    // torso y manto: la espalda cae hasta la piedra por detrás
    blob(ctx, [[3.6, 50.6], [9.6, 48.8], [11.6, 42.6], [10.6, 33], [8.4, 24], [5, 17.4], [-3, 15.4], [-10.6, 15.2], [-13.4, 17.2], [-12.2, 26], [-9.6, 36], [-5.6, 44.6], [-1.2, 49.4]]);
    seg(ctx, 5.6, 48, 3.6, 7.4, 52.6, 3.0);
    headP(ctx, 8.4, 59.0, 1, 0.14);
    hairP(ctx, 8.4, 59.0, 14, 1, 0.14);
    // brazo: codo suelto, mano apoyada sobre la rodilla (muesca de la mano sobre la rodilla)
    chain(ctx, [[8.2, 45, 2.9], [13.2, 33.4, 2.5], [19.4, 27.4, 2.1]]);
    ell(ctx, 20.6, 27.2, 2.6, 2.1, -0.3);
  };

  // Mayor sentado en la arena: rodillas altas, manos sobre la rodilla, manto que cae por detrás hasta el suelo
  P.seatGround = function (ctx) {
    // piernas: muslo largo hasta la rodilla alta, canilla bajando al pie adelantado; luz entre muslo, canilla y suelo
    chain(ctx, [[1, 8.6, 5.4], [17.6, 27.6, 4.0], [22.4, 14, 3.4], [24.2, 4.2, 2.0]]);
    seg(ctx, 23.6, 2.2, 1.9, 32.2, 1.2, 1.2); ell(ctx, 23.4, 1.7, 2.3, 1.7);
    chain(ctx, [[-1, 8.2, 5.2], [14.6, 25.2, 3.9], [19.8, 12.4, 3.3], [21.2, 4.2, 1.95]]);
    seg(ctx, 20.6, 2.2, 1.9, 28.8, 1.2, 1.2);
    // torso casi erguido; el manto cae detrás en una curva hasta el suelo
    blob(ctx, [[3.4, 51.6], [9.2, 49.8], [10.6, 43], [9.4, 33], [6.6, 21], [4, 10], [-1, 3.6], [-8.6, 0.8], [-12.2, 0.6], [-11.8, 8], [-10.2, 22], [-7.4, 36], [-3, 48.6]]);
    seg(ctx, 5, 48.6, 3.6, 6.8, 53.2, 3.0);
    headP(ctx, 7.8, 59.6, 1, 0.12);
    hairP(ctx, 7.8, 59.6, 14, 1, 0.12);
    // antebrazo hacia la rodilla, las manos juntas sobre ella
    chain(ctx, [[7.8, 45.4, 2.9], [11.6, 34.4, 2.5], [17.2, 30.6, 2.1]]);
    ell(ctx, 18.6, 30.4, 2.5, 2.2, -0.2);
  };

  // Agachado recogiendo, en cuclillas profundas (perfil): espalda en diagonal, una rodilla adelantada,
  // el antebrazo baja hasta el agua con la mano marcada; luces entre las piernas y entre brazo y rodilla.
  // k: 1 adulto; niño con cabeza mayor (o.child)
  function squat(ctx, o) {
    const c = o.child ? 1 : 0, hs = c ? 1.3 : 1;
    // pierna lejana (algo atrás) y cercana (rodilla adelantada)
    chain(ctx, [[-4.2, 16.6, 5.4], [8.6, 27.8, 3.8], [3.2, 14, 3.2], [1.2, 4.2, 1.95]]);
    seg(ctx, 0.4, 2.2, 1.9, 8.8, 1.2, 1.2); ell(ctx, 0.2, 1.7, 2.3, 1.7);
    chain(ctx, [[-2.4, 15.6, 5.4], [13.4, 25.8, 3.8], [9.6, 13, 3.2], [7.8, 4.2, 1.95]]);
    seg(ctx, 7.0, 2.2, 1.9, 15.4, 1.2, 1.2); ell(ctx, 7.0, 1.7, 2.3, 1.7);
    // espalda diagonal con el manto; el ruedo cuelga en punta detrás de la cadera
    blob(ctx, [[12.6, 45.6], [16.4, 43.2], [16.8, 38.4], [13.6, 33], [7.4, 27], [1.6, 20.4], [-3, 14.4], [-7.6, 9.6], [-10.4, 8.8], [-10.2, 14], [-8.8, 20.6], [-4.4, 30], [2.4, 38.6], [7.6, 43.6]], 0.9);
    seg(ctx, 15.2, 43.4, 3.4 * hs * 0.9, 18.2, 46.4, 2.9 * hs * 0.9);
    headP(ctx, 21.0, 47.6, hs, 0.72);
    hairP(ctx, 21.0, 47.6, c ? 9 : 12, hs, 0.72);
    // brazo que llega al agua delante de la rodilla (luz entre brazo y rodilla)
    chain(ctx, [[16.4, 40.4, 3.0], [20.8, 26, 2.5], [22.4, 9.6, 2.0]]);
    ell(ctx, 22.8, 7.0, 2.1, 2.9, 0.15); ell(ctx, 21.2, 7.8, 1.2, 1.6, 0.6); // mano y pulgar
    // el otro antebrazo descansa sobre la rodilla
    chain(ctx, [[13.2, 40, 2.8], [14.8, 31.4, 2.4], [17.6, 28.2, 2.0]]);
    if (o.basket) ell(ctx, -15.5, 2.6, 5.4, 2.8); // atado apoyado en el suelo, al costado
  }
  P.crouch = function (ctx, o = {}) { squat(ctx, { ...o, child: 0, basket: 1 }); };

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
    else { chain(ctx, [[5.6, 73, 4], [10.2, 60, 3.3], [11.4, 49, 2.8]]); ell(ctx, 11.6, 46.4, 2.9, 3.6, 0.1); }
  };

  // Niño en cuclillas mirando la arena (altura del niño de pie = 100): mismas líneas que el adulto, cabeza mayor
  P.childCrouch = function (ctx) {
    ctx.save(); ctx.scale(1.28, 1.28); squat(ctx, { child: 1 }); ctx.restore();
  };

  // Colono de perfil: sombrero de ala ancha, chaqueta, calzón y botas. o: {sack, stick, coat, brim}
  P.colonistP = function (ctx, o = {}) {
    // botas y calzón
    chain(ctx, [[-2.2, 50, 4.6], [-4.8, 27, 3.8], [-6.6, 14, 3.4], [-7.6, 4.2, 2.9]]);
    seg(ctx, -8.4, 2.4, 2.4, 0.6, 1.4, 1.5); ell(ctx, -8.2, 2.0, 2.9, 2.0);
    chain(ctx, [[2.4, 50, 4.6], [4.4, 27, 3.8], [4.6, 14, 3.4], [4.8, 4.2, 2.9]]);
    seg(ctx, 4.0, 2.4, 2.4, 13.4, 1.4, 1.5); ell(ctx, 4.2, 2.0, 2.9, 2.0);
    // chaqueta (o casaca larga) de hombros a cadera, recta
    const hem = o.coat ? 36 : 45;
    blob(ctx, [[-1, 85.4], [5.6, 83.6], [8.2, 77], [8.2, 64], [8.8, hem + 2], [9.4, hem], [-9.6, hem], [-9.0, hem + 2], [-8.6, 64], [-8.8, 77], [-6.6, 83.8]], 0.6);
    seg(ctx, 0.2, 82, 3.4, 0.8, 87.4, 3.0);
    headP(ctx, 1.2, 93.0, 0.97, 0.03);
    // sombrero: ala ancha (≥ 1,8 × la cabeza) y copa baja
    const brim = o.brim || 12.4;
    ell(ctx, 1.4, 97.8, brim, 1.7, -0.03);
    blob(ctx, [[-4.6, 98.4], [-4.4, 102.6], [-2.0, 104.4], [4.2, 104.4], [6.4, 102.6], [6.6, 98.4]], 0.6);
    // brazos
    if (o.sack) {
      // brazo atrás sube a sujetar la bolsa sobre el hombro; la bolsa asoma por detrás de la espalda
      chain(ctx, [[3, 80, 3.1], [6.6, 72.6, 2.6], [4.4, 86.0, 2.2]]);
      blob(ctx, [[3.4, 88.4], [-2.6, 89.6], [-9.6, 85.0], [-13.4, 78.6], [-12.6, 74.2], [-8.4, 76.2], [-2.4, 82.4]]);
      chain(ctx, [[5.4, 79, 3.1], [7.8, 65, 2.6], [8.6, 54, 2.2]]); ell(ctx, 8.8, 51.6, 2.2, 2.9);
    } else {
      chain(ctx, [[-4.4, 79, 3.1], [-7.4, 65, 2.6], [-7.6, 54, 2.2]]); ell(ctx, -7.7, 51.6, 2.2, 2.9);
      chain(ctx, [[5.4, 79, 3.1], [10.6, 67, 2.6], [15.4, 60.4, 2.2]]); ell(ctx, 16.2, 59.6, 2.2, 2.8);
    }
    if (o.stick) stick(ctx, 16.6, 62.5, 18.2, -0.4, 2.1);
  };

  // Vela pequeña lejana (unidades ≈ px de foto; altura total ≈ 26)
  P.sail = function (ctx) {
    blob(ctx, [[-9.6, 1.6], [10.2, 2.0], [8.0, -1.1], [-7.6, -1.2]], 0.2);
    stick(ctx, 0.6, 1, 1.2, 15, 1.1);
    // vela latina: una antena inclinada y un paño triangular algo panzón
    stick(ctx, -6.2, 5.6, 8.0, 26.0, 1.0);
    ctx.beginPath(); ctx.moveTo(-5.4, 6.2); ctx.lineTo(7.6, 25.4); ctx.quadraticCurveTo(10.6, 12.5, 8.6, 2.8); ctx.closePath(); ctx.fill();
  };

  // metadatos por pose: extensión del contacto con el suelo (unidades) para la sombra de contacto
  const CONTACT = {
    standP: [-9, 12], standB: [-8.5, 9.5], standQ: [-9, 10], seatRock: [14, 31], seatGround: [-14, 33], crouch: [-7, 16],
    childP: [-9, 11], childCrouch: [-13, 21], colonistP: [-9.5, 12], sail: [0, 0],
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
   * Construye el atlas de figuras de una copia (px de foto × S).
   * figs: [{pose, foot:[x,y], unit, facing, group, opts, L (luminancia de la plata a esa profundidad), soft (desenfoque en px de foto)}]
   * light: {kx, ky} proyección de la sombra por unidad de altura; rim: [dx,dy] dirección opuesta a la luz (modelado).
   * Canales: R cobertura (antialias + desenfoque de la profundidad), G densidad de sombra (proyectada + contacto),
   *          B luminancia propia de la figura /0,4 (perspectiva aérea + lado iluminado), A núcleo (orden de nucleación).
   * Devuelve {A, B, boxA, boxB, groups:{g:[x0,y0,x1,y1]}}: A = figuras que siguen la τ de la copia, B = grupos con inicio propio.
   */
  RV.buildFigureAtlas = function (figs, light, S = 2) {
    const out = { groups: {} };
    for (const part of ['A', 'B']) {
      const list = figs.filter((f) => (part === 'A' ? !f.group : !!f.group));
      if (!list.length) { out[part] = null; continue; }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      const ext = (f) => {
        const u = f.unit, h = (f.pose === 'sail' ? 30 : 112) * u, w = (f.pose === 'sail' ? 14 : 48) * u;
        return [f.foot[0] - w - 8, f.foot[1] - h - 8, f.foot[0] + w + Math.max(0, light.kx) * h + 10, f.foot[1] + light.ky * h + (f.pose === 'sail' ? 14 : 12)];
      };
      for (const f of list) {
        const e = ext(f);
        x0 = Math.min(x0, e[0]); y0 = Math.min(y0, e[1]); x1 = Math.max(x1, e[2]); y1 = Math.max(y1, e[3]);
        if (f.group) { const g = out.groups[f.group] || [1e9, 1e9, -1e9, -1e9]; out.groups[f.group] = [Math.min(g[0], e[0]), Math.min(g[1], e[1]), Math.max(g[2], e[2]), Math.max(g[3], e[3])]; }
      }
      x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
      const W = Math.ceil((x1 - x0) * S), H = Math.ceil((y1 - y0) * S);
      const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#fff'; return [c, g]; };
      const [cCov, gCov] = mk(W, H), [cSh, gSh] = mk(W, H), [cLum, gLum] = mk(W, H), [cLit, gLit] = mk(W, H), [cCore, gCore] = mk(W, H);
      const rl = Math.hypot(light.rim[0], light.rim[1]) || 1, rdx = light.rim[0] / rl, rdy = light.rim[1] / rl;
      const blurDraw = (dst, src, px, alpha = 1) => { dst.save(); dst.filter = px > 0.05 ? `blur(${px}px)` : 'none'; dst.globalAlpha = alpha; dst.drawImage(src, 0, 0); dst.restore(); };
      for (const f of list) {
        // cada figura se dibuja en su propio mosaico local (con margen para los desenfoques) y se suma al atlas: el costo no depende del tamaño del atlas
        const e = ext(f), s = f.unit * S, sail = f.pose === 'sail';
        const mg = Math.ceil(3.2 * Math.max(4.5 * s, 3 * S, (f.soft || 0.5) * S, 2.5 * S));
        const lx0 = Math.floor((e[0] - x0) * S - mg), ly0 = Math.floor((e[1] - y0) * S - mg), lw = Math.ceil((e[2] - e[0]) * S + 2 * mg), lh = Math.ceil((e[3] - e[1]) * S + 2 * mg);
        const [lCov, kCov] = mk(lw, lh), [lSh, kSh] = mk(lw, lh), [lLum, kLum] = mk(lw, lh), [lLit, kLit] = mk(lw, lh), [lCore, kCore] = mk(lw, lh), [lTmp, kTmp] = mk(lw, lh);
        const tmp = (fn) => { kTmp.save(); kTmp.setTransform(1, 0, 0, 1, 0, 0); kTmp.globalCompositeOperation = 'source-over'; kTmp.clearRect(0, 0, lw, lh); kTmp.fillStyle = '#fff'; fn(kTmp); kTmp.restore(); return lTmp; };
        const fx = (f.foot[0] - x0) * S - lx0, fy = (f.foot[1] - y0) * S - ly0, fa = f.facing || 1;
        const M = [fa * s, 0, 0, -s, fx, fy];
        // cobertura con el desenfoque de la foto a esa profundidad
        blurDraw(kCov, tmp((g) => RV.drawPose(g, f, M)), (f.soft || 0.5) * S);
        // luminancia propia (gris uniforme, dilatado por el desenfoque para que el borde no tome ceros)
        const Lv = Math.round(PBS.clamp((f.L || 0.1) / 0.4, 0, 1) * 255);
        kLum.save(); kLum.filter = `blur(${3 * S}px)`; const c1 = tmp((g) => { g.fillStyle = `rgb(${Lv},${Lv},${Lv})`; RV.drawPose(g, f, M); });
        kLum.drawImage(c1, 0, 0); kLum.drawImage(c1, 0, 0); kLum.drawImage(c1, 0, 0); kLum.restore();
        // lado iluminado: la figura menos la figura corrida en dirección opuesta a la luz (≈ 25 % del ancho del cuerpo)
        const dsh = (sail ? 2.5 : 5.5) * s;
        const lit = tmp((g) => { RV.drawPose(g, f, M); g.globalCompositeOperation = 'destination-out'; RV.drawPose(g, f, [M[0], 0, 0, M[3], fx + rdx * dsh, fy + rdy * dsh]); });
        blurDraw(kLit, lit, 1.6 * s);
        // núcleo: cobertura muy desenfocada (el torso y la cabeza nuclean antes que los bordes y las extremidades)
        blurDraw(kCore, tmp((g) => RV.drawPose(g, f, M)), 4.5 * s);
        if (sail) {
          kSh.save(); kSh.filter = `blur(${0.8 * S}px)`; kSh.globalAlpha = 0.4; kSh.fillRect(fx - 1.2 * s, fy + 1.5 * s, 2.2 * s, 9 * s); kSh.restore();
        } else {
          // sombra proyectada: pegada a los pies, se aclara y ablanda con la distancia
          const hgt = 100 * s;
          const cast = tmp((g) => {
            RV.drawPose(g, f, [fa * s, 0, light.kx * s, light.ky * s, fx, fy]);
            g.globalCompositeOperation = 'destination-in';
            const gr = g.createLinearGradient(fx, fy, fx + light.kx * hgt, fy + light.ky * hgt);
            gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.62)'); gr.addColorStop(1, 'rgba(255,255,255,0.22)');
            g.fillStyle = gr; g.fillRect(0, 0, lw, lh);
          });
          blurDraw(kSh, cast, 1.2 * S + 0.012 * hgt, 0.42);
          // oclusión de contacto: banda aplanada bajo el apoyo (+0,6 D) y un halo oscuro amplio (+0,2 D)
          const c = CONTACT[f.pose] || [-8, 8];
          const cx0 = c[0] * fa, cx1 = c[1] * fa, cxm = (cx0 + cx1) / 2, hw = Math.abs(cx1 - cx0) * 0.5;
          const con = tmp((g) => { g.beginPath(); g.ellipse(fx + cxm * s, fy + 0.3 * s, hw * s * 0.85, Math.max(1.2 * S, 1.5 * s), 0, 0, Math.PI * 2); g.fill(); });
          blurDraw(kSh, con, 1.4 * S, 0.5);
          const amb = tmp((g) => { g.beginPath(); g.ellipse(fx + cxm * s, fy + 0.6 * s, hw * s * 1.4, Math.max(1.8 * S, 2.2 * s), 0, 0, Math.PI * 2); g.fill(); });
          blurDraw(kSh, amb, 2.5 * S, 0.16);
        }
        gCov.drawImage(lCov, lx0, ly0); gSh.drawImage(lSh, lx0, ly0); gLum.drawImage(lLum, lx0, ly0); gLit.drawImage(lLit, lx0, ly0); gCore.drawImage(lCore, lx0, ly0);
      }
      const cov = gCov.getImageData(0, 0, W, H).data, sh = gSh.getImageData(0, 0, W, H).data, lum = gLum.getImageData(0, 0, W, H).data;
      const lit = gLit.getImageData(0, 0, W, H).data, core = gCore.getImageData(0, 0, W, H).data;
      const img = new ImageData(W, H), d = img.data;
      for (let i = 0; i < W * H; i++) {
        const k = i * 4;
        d[k] = cov[k + 3];
        d[k + 1] = sh[k + 3];
        const Lb = lum[k + 3] > 0 ? lum[k] : 64;
        d[k + 2] = Math.min(255, Lb + Math.round((lit[k + 3] / 255) * (0.055 / 0.4) * 255));
        d[k + 3] = Math.min(255, Math.round(core[k + 3] * 1.1));
      }
      out[part] = img;
      out['box' + part] = [x0, y0, x1 - x0, y1 - y0];
    }
    return out;
  };
})();
