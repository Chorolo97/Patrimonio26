/*
 * Vida: qué hace cada persona, el barco, el bote y las aves en cada copia (función pura de t).
 * Las figuras listadas en C.live reemplazan a las siluetas fijas del mismo id (se dibujan con el esqueleto de src/live.js).
 * Relato: el territorio está habitado desde el alba; caminar la sierra, mirar la lejanía del Yaguarón, juntar en el río y la costa;
 * en el interludio llega un barco y dos colonos desembarcan aparte mientras la vida indígena sigue; en la coda la sierra se hace arena
 * y el niño que se sigue revelando mira el mar.
 * Coordenadas: px de la foto original. anchor = punto de apoyo (pie o línea de flotación). h = altura de un adulto de pie ahí.
 */
(() => {
const C = window.REEL_CONFIG;
const cl = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (x) => { x = cl(x, 0, 1); return x * x * (3 - 2 * x); };
const lerp = (a, b, u) => a + (b - a) * u;
const TAU = Math.PI * 2;
// ventana suave: 0 antes de a, 1 entre a+r y b−r, 0 después de b
const win = (t, a, b, r = 0.8) => sm((t - a) / r) * sm((b - t) / r);
// curva por claves [[t, v], ...] con tramos suaves
const keys = (k, t) => { if (t <= k[0][0]) return k[0][1]; for (let i = 0; i < k.length - 1; i++) if (t < k[i + 1][0]) return lerp(k[i][1], k[i + 1][1], sm((t - k[i][0]) / (k[i + 1][0] - k[i][0]))); return k[k.length - 1][1]; };
// trayecto por claves [[t, x, y], ...] (px de foto, relativos al anclaje) con velocidad suave; devuelve [x, y, distancia recorrida]
const path = (k, t) => {
  let d = 0;
  for (let i = 0; i < k.length - 1; i++) {
    const [t0, x0, y0] = k[i], [t1, x1, y1] = k[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
    if (t < t1 || i === k.length - 2) { const u = sm((t - t0) / (t1 - t0)); return [lerp(x0, x1, u), lerp(y0, y1, u), d + L * u, (t > t0 && t < t1) ? 1 : 0]; }
    d += L;
  }
  return [k[0][1], k[0][2], 0, 0];
};
// viento de cada copia: dirección en pantalla (+1 hacia la derecha) × intensidad; ráfagas lentas + los graves de la música
const WIND = { portezuelo: 1, playa: 1, relieve: -1, abra: 1, yaguaron: -1, quebrada: 1, tacuari: 1, cerrito: -1, yerbal: 1, rompiente: 1, carape: 1, estratos: 1, gruta: 1, canal: 1 };
const windAt = (print, t, env) => {
  const g = 0.55 + 0.25 * Math.sin(t * 0.37 + print.length) + 0.2 * Math.sin(t * 0.91 + 1.3 * print.length);
  return (WIND[print] || 1) * (2.2 + 2.6 * g + 2.0 * (env ? env.low : 0.3));
};

// ---------- persona: combina marcha, reposo, gestos y mirada ----------
// lv: {kind, opts, walk:{g} | route:[[t,dx,dy]...], point:[[t0,t1,dirX,dirY]], look:[[t,v]...], squat:[[t,k]...], gather:{t0,t1,period},
//      arm:[...], run:[[t0,t1]] , seat:1}
function person(lv, t, env, RV) {
  const kind = lv.kind || 'adult', U = RV.LIVE_UTIL;
  const wind = windAt(lv.print, t, env) * (lv.facing || 1) * (lv.windK || 1);
  const flut = t * (4.2 + 0.7 * Math.sin(lv.anchor[0])) + lv.anchor[0] * 0.01;
  const breath = 0.35 * Math.sin(t * TAU / (kind === 'child' ? 2.8 : 4.2) + lv.anchor[1]);
  let st, off = [0, 0], moving = 0;
  const unitPx = lv.unit;   // px de foto por unidad de pose
  if (lv.walk || lv.route) {
    let dist, amt;
    if (lv.walk) {
      dist = env.travel(lv.walk.g); const d2 = env.travel(lv.walk.g, t - 0.2);
      amt = cl((dist - d2) / 0.2 / (lv.walk.v || 1), 0, 1);
    } else {
      const p = path(lv.route, t), p2 = path(lv.route, t - 0.2);
      off = [p[0], p[1]]; dist = p[2];
      amt = cl((p[2] - p2[2]) / 0.2 / (lv.routeV || 1), 0, 1);
    }
    moving = amt;
    const run = lv.runK ? lv.runK * amt : 0;
    const S = (kind === 'child' ? 22 : 30) * (1 + 0.3 * run) * (lv.stride || 1);
    // el pie de apoyo retrocede S (unidades) durante la fracción de apoyo del ciclo: el cuerpo avanza S/apoyo por ciclo (sin patinar)
    const stance = lerp(0.6, 0.4, run);
    const ph = (dist / unitPx) * stance / Math.max(1e-3, S) + (lv.phase || 0);
    st = RV.walkPose(kind, ph, sm(amt * 1.4), { run, stride: lv.stride || 1 });
    const sw = st.sway;
    if (!lv.opts || (!lv.opts.bundle && !lv.opts.staff)) st.arms = [null, { hand: [st.hip[0] + 4 + 6 * amt * Math.sin(ph * TAU + Math.PI) * (1 + run), 45 + 3 * run - (kind === 'child' ? 8 : 0)] }];
    st.head = { rot: -0.03 + 0.02 * sw * amt, look: 1 };
  } else if (lv.squat || lv.gather) {
    const k = lv.squat ? keys(lv.squat, t) : 1;
    st = RV.squatPose(kind, k);
    // juntar: la mano baja al agua o a la arena, levanta algo y lo lleva al atado; pausa; otra vez
    let hand = null;
    if (lv.gather && k > 0.5) {
      const G = lv.gather, ph = ((t - G.t0) / G.period) % 1;
      const reach = sm(ph / 0.35) * (1 - sm((ph - 0.55) / 0.3));
      const gx = st.hip[0] + lerp(15, 31 + (G.far || 0), reach), gy = lerp(26, 6.5 + 1.2 * Math.sin(t * 5) * reach, reach);
      hand = [gx, gy];
      st.hip[1] += 0.8 * reach; st.lean += 0.1 * reach;
    } else if (k > 0.3) hand = [st.hip[0] + 18, lerp(40, 22, k)];
    st.arms = [null, hand ? { hand, elbow: -1 } : null];
    st.head = { rot: lerp(0, 0.5, k) - (lv.squatLookUp ? keys(lv.squatLookUp, t) : 0), look: 1 };
    st.opts = { ...(lv.opts || {}), basket: k > 0.5 ? 1 : 0 };
  } else {
    st = RV.walkPose(kind, 0, 0);
  }
  st.opts = st.opts || lv.opts || {};
  st.kind = kind; st.wind = wind * (1 - 0.3 * moving) + (moving ? -2.2 * moving : 0); st.flut = flut; st.breath = breath;
  if (lv.look) st.head = { ...(st.head || {}), look: keys(lv.look, t) };
  if (lv.nod) st.head = { ...(st.head || {}), rot: (st.head ? st.head.rot : 0) + keys(lv.nod, t) };
  if (!st.head) st.head = { rot: 0, look: 1 };
  // señalar hacia la lejanía: el brazo cercano sube despacio, se sostiene y baja
  if (lv.point) for (const [a, b, dx, dy] of lv.point) {
    const w = win(t, a, b, 1.1);
    if (w > 0.001) {
      const sh = [st.hip[0] + 1.5, 76];
      const rest = [st.hip[0] + 6, 46];
      const tgt = [sh[0] + dx * 30, sh[1] + dy * 30];
      st.arms = [st.arms ? st.arms[0] : null, { hand: [lerp(rest[0], tgt[0], w), lerp(rest[1], tgt[1], w)], elbow: -1 }];
      st.head.rot = (st.head.rot || 0) - 0.12 * w * dy;
    }
  }
  const o0 = st.opts || lv.opts || {};
  if (o0.staff && !(st.arms && st.arms[1])) st.arms = [null, { hand: [st.hip[0] + (lv.staffX != null ? lv.staffX : 16.8) - 1.2 * Math.sign(lv.staffX || 1), 63 - (50 - st.hip[1]) * 0.6], elbow: -1 }];
  if (o0.bundle && !(st.arms && st.arms[1])) st.arms = [null, { hand: [st.hip[0] + 12.4, 53.8 - (50 - st.hip[1]) * 0.6], elbow: -1 }];
  if (lv.hold) st.arms = [st.arms ? st.arms[0] : null, { hand: [st.hip[0] + lv.hold[0], lv.hold[1] - (50 - st.hip[1]) * 0.5], elbow: -1 }];
  if (o0.staff) st.staffX = st.hip[0] + (lv.staffX != null ? lv.staffX : 16.8);
  const contact = lv.squat || lv.gather ? [-7, 16] : [-9, 12];
  return {
    off, contact,
    draw: (g) => RV.rig(g, st),
  };
}

// persona sentada (mayor): el cuerpo quieto, la cabeza gira hacia lo que pasa; el manto flamea
function seated(lv, t, env, RV) {
  const U = RV.LIVE_UTIL;
  const wind = windAt(lv.print, t, env) * (lv.facing || 1);
  const look = lv.look ? keys(lv.look, t) : 1, nod = lv.nod ? keys(lv.nod, t) : 0;
  const br = 0.3 * Math.sin(t * TAU / 4.6 + lv.anchor[0]);
  const flut = t * 4.4 + lv.anchor[0] * 0.01;
  const rock = lv.rock ? 1 : 0;
  const draw = (g) => {
    const y0 = rock ? 16 : 0;          // sobre piedra: la cadera a y = 16
    // piernas
    if (rock) {
      U.chain(g, [[1.5, 19.5, 5.0], [20.5, 23.8, 3.9], [21.6, 12, 3.3], [21.8, 4.2, 2.0]]); U.seg(g, 21.2, 2.2, 1.9, 29.8, 1.2, 1.2); U.ell(g, 21.2, 1.7, 2.3, 1.7);
      U.chain(g, [[-0.5, 18.5, 5.0], [17.2, 22.4, 3.8], [17.4, 11, 3.2], [17.2, 4.2, 1.95]]); U.seg(g, 16.6, 2.2, 1.9, 25.2, 1.2, 1.2);
    } else {
      U.chain(g, [[1, 8.6, 5.4], [17.6, 27.6, 4.0], [22.4, 14, 3.4], [24.2, 4.2, 2.0]]); U.seg(g, 23.6, 2.2, 1.9, 32.2, 1.2, 1.2); U.ell(g, 23.4, 1.7, 2.3, 1.7);
      U.chain(g, [[-1, 8.2, 5.2], [14.6, 25.2, 3.9], [19.8, 12.4, 3.3], [21.2, 4.2, 1.95]]); U.seg(g, 20.6, 2.2, 1.9, 28.8, 1.2, 1.2);
    }
    // manto: el borde de atrás y el ruedo se mueven con el viento
    const w = wind, f = (i, k) => w * k * (0.7 + 0.4 * Math.sin(flut + i * 1.9));
    const back = rock
      ? [[3.6, 50.6 + br], [9.6, 48.8 + br], [11.6, 42.6], [10.6, 33], [8.4, 24], [5, 17.4], [-3, 15.4], [-10.6 + f(1, .25), 15.2], [-13.4 + f(2, .35), 17.2], [-12.2 + f(3, .3), 26], [-9.6 + f(4, .2), 36], [-5.6 + f(5, .1), 44.6], [-1.2, 49.4 + br]]
      : [[3.4, 51.6 + br], [9.2, 49.8 + br], [10.6, 43], [9.4, 33], [6.6, 21], [4, 10], [-1, 3.6], [-8.6 + f(1, .2), 0.8], [-12.2 + f(2, .35), 0.6 + Math.abs(w) * 0.1], [-11.8 + f(3, .35), 8], [-10.2 + f(4, .25), 22], [-7.4 + f(5, .15), 36], [-3, 48.6 + br]];
    U.blob(g, back);
    const hx = rock ? 8.4 : 7.8, hy = (rock ? 59.0 : 59.6) + br;
    U.seg(g, hx - 2.8, hy - 11, 3.6, hx - 1, hy - 6.4, 3.0);
    const rot = (rock ? 0.14 : 0.12) + nod;
    // pelo y cabeza con giro
    g.save(); g.translate(hx, hy); g.rotate(-rot);
    const sx = look >= 0 ? 1 : -1, k = 0.45 + 0.55 * Math.abs(look), ww = w * 0.5 * sx / k;
    g.save(); g.scale(sx * k, 1);
    U.blob(g, [[1.5, 6.4], [-3.8, 6.2], [-6.6, 1.5], [-7.4 + 0.45 * ww, -6.3], [-7.6 + ww, -14 + 0.25 * Math.abs(ww)], [-4.6 + ww, -14.6], [-2.4 + 0.5 * ww, -7.7], [-0.4, -1.0], [2.2, 3.4]], 1);
    g.restore();
    U.ell(g, 0, 0, 5.5 * (0.9 + 0.1 * Math.abs(look)), 6.65, -0.12 * look);
    U.ell(g, 2.0 * look, -4.3, 1.6 + 1.4 * Math.abs(look), 2.5, 0.3 * look);
    g.restore();
    // brazo a la rodilla (o levantado para señalar)
    if (rock) { U.chain(g, [[8.2, 45 + br, 2.9], [13.2, 33.4, 2.5], [19.4, 27.4, 2.1]]); U.ell(g, 20.6, 27.2, 2.6, 2.1, -0.3); }
    else { U.chain(g, [[7.8, 45.4 + br, 2.9], [11.6, 34.4, 2.5], [17.2, 30.6, 2.1]]); U.ell(g, 18.6, 30.4, 2.5, 2.2, -0.2); }
  };
  return { off: [0, 0], contact: rock ? [14, 31] : [-14, 33], draw };
}

// ---------- barco: llega por la derecha, fondea y aferra el paño; cabecea sobre la marejada ----------
function ship(lv, t, env, RV) {
  const a = lv.arrive, u = cl((t - a[0]) / (a[1] - a[0]), 0, 1);
  const e = 1 - Math.pow(1 - u, 2.2);                 // frena al fondear
  const dx = lerp(a[2], 0, e);
  const v = Math.abs(a[2]) / (a[1] - a[0]) * 2.2 * Math.pow(1 - u, 1.2) * (u < 1 ? 1 : 0);   // px/s
  const set = keys(lv.sails, t);
  const sw = 0.6 + 0.8 * env.lowAvg;
  const pitch = sw * (0.022 * Math.sin(t * TAU / 5.3) + 0.01 * Math.sin(t * TAU / 2.7 + 1.1)) + 0.012 * env.surge;
  const heave = sw * (0.7 * Math.sin(t * TAU / 4.1 + 0.6) + 0.35 * Math.sin(t * TAU / 2.3));
  const o = { set, pitch, heave };
  const paintF = { body: '#f00', sail: '#f0f' };
  return {
    off: [dx, 0], unit: lv.unit, L: lv.L, sailL: lv.sailL, noShadow: 1, coreK: 0.35, rimK: 0.3, shR: 1.2 * lv.S,
    draw: (g, fig) => RV.drawShip(g, o, fig ? paintF : { body: g.fillStyle, sail: g.fillStyle }),
    shadow: (g, col) => {
      g.fillStyle = 'rgb(0,120,0)';
      RV.drawShipReflection(g, o, t, 1);
      // estela: trazos oscuros que quedan detrás de la popa mientras navega
      const k = cl(v / 25, 0, 1);
      if (k > 0.02) for (let i = 0; i < 7; i++) {
        const x0 = -54 - i * 11 * (0.6 + k), w = 9 + 3 * Math.sin(t * 3 + i);
        g.fillStyle = `rgb(0,${Math.round(150 * k * (1 - i / 7))},0)`;
        g.beginPath(); g.ellipse(x0, -0.8 - 0.35 * i, w, 0.7, 0, 0, TAU); g.fill();
      }
      // ondas de la proa al fondear: la marejada contra el casco
      g.fillStyle = 'rgb(0,70,0)'; g.beginPath(); g.ellipse(0, -0.4, 50, 0.9, 0, 0, TAU); g.fill();
    },
  };
}

// ---------- bote de remos: se acerca a la orilla (crece con la perspectiva), varado queda quieto ----------
function boat(lv, t, env, RV) {
  const p = path(lv.route, t);
  const y = lv.anchor[1] + p[1];
  const unit = Math.max(0.06, lv.hor[1] * (y - lv.hor[0]) / 100);   // perspectiva: altura de una persona ∝ (y − horizonte)
  const rowing = win(t, lv.route[0][0] - 1, lv.route[lv.route.length - 1][0] - 0.2, 0.6);
  const bob = 0.5 * Math.sin(t * 2.1) * (1 - sm((t - lv.route[lv.route.length - 1][0]) / 0.6));
  const o = { row: t * 0.75, oars: rowing };
  return {
    off: [p[0], p[1]], unit, noShadow: 1, rimK: 0.4,
    draw: (g) => { g.save(); g.translate(0, bob); RV.drawBoat(g, o); g.restore(); },
    shadow: (g) => {
      g.save(); g.scale(1, -0.5); g.globalAlpha = 0.5; RV.drawBoat(g, o); g.restore();
      g.fillStyle = 'rgb(0,90,0)'; g.beginPath(); g.ellipse(0, -1, 110, 3, 0, 0, TAU); g.fill();
    },
  };
}

// ---------- ave: cruza el cielo con aleteo y planeo ----------
function bird(lv, t, env, RV) {
  const [t0, t1] = lv.span;
  if (t < t0 - 0.1 || t > t1 + 0.1) return { hide: 1 };
  const u = (t - t0) / (t1 - t0);
  const x = lerp(lv.from[0], lv.to[0], u), y = lerp(lv.from[1], lv.to[1], u) + lv.arc * Math.sin(Math.PI * u) + 3 * Math.sin(t * 1.7 + lv.seed);
  const glide = sm((Math.sin(t * 0.9 + lv.seed * 2) - 0.2) / 0.5);          // tramos de planeo
  const flap = (t * lv.hz * TAU + lv.seed) * 1;
  const f = lerp(flap, 0.35 + 0.15 * Math.sin(t * 2 + lv.seed), glide * (lv.gull ? 0.8 : 0.5));
  return { off: [x, y], noShadow: 1, coreK: 0.5, rimK: 0.2, draw: (g) => RV.drawBird(g, f, lv.gull) };
}

C.liveScript = { person, seated, ship, boat, bird };

// ---------- elenco ----------
const L = [];
const add = (o) => L.push(o);

// Portezuelo (90,28–110,2): la vida sigue; llega un barco, un bote desembarca a dos colonos aparte
add({ id: 'S1', print: 'portezuelo', script: 'ship', group: 4, anchor: [2378, 719], unit: 0.95, facing: -1, box: [-62, -24, 84, 86], S: 2,
  arrive: [91.6, 100.6, 250], sails: [[91, 1], [100.2, 1], [102.8, 0.12]], L: 0.19, sailL: 0.56, soft: 1.5, coreW: 0.55 });
add({ id: 'B2', print: 'portezuelo', script: 'boat', group: 5, anchor: [2078, 806], facing: -1, box: [-112, -26, 112, 72], boxUnit: 0.56, S: 2,
  hor: [695, 1.01 * 100 / 203], route: [[100.9, 250, -84], [105.4, 0, 0]], L: 0.16, soft: 1.2 });
// una niña lleva de la mano a la persona adulta hacia la orilla para ver el barco
add({ id: 'I1', print: 'portezuelo', script: 'person', kind: 'adult', anchor: [1760, 1180], facing: 1, sizeRule: 1, hold: [16, 41],
  route: [[102.6, 0, 0], [108.6, 74, 10]], routeV: 12, phase: 0.3 });
add({ id: 'I2', print: 'portezuelo', script: 'person', kind: 'child', anchor: [1812, 1172], facing: 1, sizeRule: 1, hold: [-12, 52],
  route: [[102.6, 0, 0], [108.6, 74, 10]], routeV: 12, look: [[97.6, 1], [98.6, -1], [101.8, -1], [102.6, 1]], nod: [[97.6, 0], [98.6, 0.2], [101.8, 0.2], [102.6, 0]] });
add({ id: 'I3', print: 'portezuelo', script: 'person', kind: 'adult', anchor: [2060, 1080], facing: 1, sizeRule: 1, opts: { staff: 1 }, staffX: -15,
  point: [[95.6, 100.8, 0.86, 0.42]] });
add({ id: 'I5', print: 'portezuelo', script: 'seated', group: 1, rock: 1, anchor: [1868, 1292], facing: -1, sizeRule: 1,
  look: [[96.6, 1], [97.8, -1], [102.5, -1], [103.6, 0.6]] });
add({ id: 'I6', print: 'portezuelo', script: 'person', group: 2, kind: 'adult', anchor: [2150, 1385], facing: 1, sizeRule: 1,
  gather: { t0: 96.4, period: 3.4 }, squat: [[96, 1], [104.2, 1], [105.4, 0], [107.6, 0], [108.8, 1]], opts: {} });
add({ id: 'I8', print: 'portezuelo', script: 'person', group: 1, kind: 'adult', anchor: [1985, 1302], facing: -1, sizeRule: 1, opts: { staff: 1 }, staffX: 14,
  look: [[99.5, 1], [100.8, -0.8], [106, -0.8], [107.2, 1]] });

// Canal (19,06–40): al alba ya hay gente sobre la roca, mirando el mar
add({ id: 'N1', print: 'canal', script: 'person', kind: 'adult', anchor: [392, 348], h: 78, facing: 1, look: [[30, 1], [31.5, 0.3], [35, 0.3], [36.5, 1]] });
add({ id: 'N2', print: 'canal', script: 'person', kind: 'child', anchor: [432, 356], h: 78, facing: 1, nod: [[24, 0], [25, -0.25], [28, -0.25], [29, 0]], look: [[24, 1], [25, -1], [28, -1], [29, 1]] });

// Relieve (40–50,4, «Camino de mi esteña»): tres personas bajan en fila por el sendero del lomo
for (const [id, kind, x, y, ph, opts] of [['R1', 'adult', 488, 300, 0, {}], ['R3', 'child', 466, 290, 0.37, {}], ['R2', 'adult', 443, 280, 0.61, { bundle: 1 }]])
  add({ id, print: 'relieve', script: 'person', group: 1, kind, anchor: [x, y], h: 33, facing: 1, walk: { g: 1, v: 8.1 }, phase: ph, opts });

// Yaguarón (50,4–55,3): un niño corre unos pasos hasta la persona adulta; cuervos cruzan el cielo
add({ id: 'J1', print: 'yaguaron', script: 'person', kind: 'adult', anchor: [1680, 1860], h: 100, facing: -1,
  look: [[53.2, 1], [54.0, -1]], nod: [[53.2, 0], [54.1, 0.16]], hold: null });
add({ id: 'J2', print: 'yaguaron', script: 'person', kind: 'child', anchor: [1728, 1868], h: 110, facing: -1, runK: 1, stride: 1.1,
  route: [[51.9, 150, 14], [53.9, 0, 0]], routeV: 60, look: [[54, 1], [54.6, 1]], nod: [[53.9, 0], [54.5, -0.22]] });
[[50.5, 54.6, [-80, 560], [2050, 470], -40, 2.6, 0], [50.9, 55.2, [-60, 640], [2060, 600], -60, 2.4, 1.3], [51.3, 55.3, [-120, 530], [1990, 520], -30, 2.8, 2.1],
 [51.6, 55.3, [-40, 720], [1900, 650], -50, 2.3, 3.7], [52.2, 55.3, [2050, 610], [300, 540], -40, 2.5, 4.4], [52.8, 55.3, [-60, 760], [1500, 700], -30, 2.7, 5.2]]
  .forEach(([a, b, from, to, arc, hz, seed], i) => add({ id: 'Kc' + i, print: 'yaguaron', script: 'bird', anchor: [0, 0], unit: 1.25 + 0.2 * (i % 3), facing: to[0] > from[0] ? 1 : -1,
    box: [-14, -6, 14, 8], S: 2, span: [a, b], from, to, arc, hz, seed, L: 0.1, soft: 0.7, coreW: 0.3 }));

// Abra (55,3–62,5): desde la roca, alguien señala la lejanía; gaviotas sobre el mar
add({ id: 'A2', print: 'abra', script: 'person', kind: 'adult', anchor: [598, 634], h: 52, facing: 1, point: [[56.0, 59.6, 0.9, 0.3]] });
[[55.6, 60.8, [1300, 420], [700, 470], -25, 1.7, 0.4, 1], [56.4, 61.2, [1400, 470], [820, 430], -18, 1.5, 2.2, 1], [57.2, 61.5, [380, 380], [950, 420], -20, 1.6, 3.1, 1]]
  .forEach(([a, b, from, to, arc, hz, seed], i) => add({ id: 'Kg' + i, print: 'abra', script: 'bird', anchor: [0, 0], unit: 0.85, facing: to[0] > from[0] ? 1 : -1,
    box: [-14, -6, 14, 8], S: 2, span: [a, b], from, to, arc, hz, seed, gull: 1, L: 0.16, soft: 0.8, coreW: 0.3 }));

// Quebrada (62,5–69,9): el grupo camina el borde de la sierra
for (const [id, kind, x, y, ph, opts] of [['Q1', 'adult', 1190, 1500, 0.1, {}], ['Q2', 'adult', 1156, 1518, 0.55, { bundle: 1 }], ['Q3', 'child', 1124, 1534, 0.3, {}]])
  add({ id, print: 'quebrada', script: 'person', kind, anchor: [x, y], h: 102, facing: 1, route: [[63.3, -120, -6], [69.4, 0, 0]], routeV: 20, phase: ph, opts });

// Tacuarí (69,9–72,8): junto al río alguien junta en la orilla; el resto mira el agua
add({ id: 'U1', print: 'tacuari', script: 'person', kind: 'adult', anchor: [300, 1440], h: 150, facing: 1, look: [[70.8, 1], [71.6, 0.4]] });
add({ id: 'U2', print: 'tacuari', script: 'person', kind: 'adult', anchor: [372, 1462], h: 146, facing: 1, opts: { bundle: 1 } });
add({ id: 'U3', print: 'tacuari', script: 'person', kind: 'child', anchor: [445, 1478], h: 150, facing: 1, nod: [[70.4, 0], [71.2, -0.2]] });
add({ id: 'U4', print: 'tacuari', script: 'person', kind: 'adult', anchor: [982, 1437], h: 118, facing: 1, gather: { t0: 69.6, period: 2.6, far: 4 }, squat: [[69, 1]] });

// Guazunambí (72,8–75,6): alguien señala la cuchilla lejana
add({ id: 'V1', print: 'cerrito', script: 'person', kind: 'adult', anchor: [760, 1140], h: 115, facing: 1, point: [[73.4, 76.2, 0.95, 0.22]] });
add({ id: 'V2', print: 'cerrito', script: 'person', kind: 'adult', anchor: [800, 1152], h: 112, facing: 1, opts: { bundle: 1 } });
add({ id: 'V3', print: 'cerrito', script: 'person', kind: 'child', anchor: [838, 1160], h: 115, facing: 1, look: [[73.8, 1], [74.6, -1], [75.2, 1]] });

// Sierras (75,6–83,6): el grupo recorre la loma
for (const [id, kind, x, y, ph, opts] of [['Y1', 'adult', 550, 630, 0.05, {}], ['Y3', 'child', 528, 623, 0.4, {}], ['Y2', 'adult', 506, 615, 0.62, { bundle: 1 }]])
  add({ id, print: 'yerbal', script: 'person', group: 1, kind, anchor: [x, y], h: 44, facing: 1, walk: { g: 1, v: 5.5 }, phase: ph, opts });

// Rompiente (83,6–90,3): alguien mira la espuma, el viento le lleva el manto
add({ id: 'B1', print: 'rompiente', script: 'person', kind: 'adult', anchor: [170, 962], h: 108, facing: 1, windK: 1.5, nod: [[85, 0], [86, 0.08], [88, 0.08], [89, 0]] });

// Carapé (110,2–117,5): la mayor sentada gira la cabeza hacia el grupo
add({ id: 'W1', print: 'carape', script: 'person', kind: 'adult', anchor: [700, 1340], h: 182, facing: 1 });
add({ id: 'W2', print: 'carape', script: 'person', kind: 'adult', anchor: [754, 1354], h: 174, facing: 1, opts: { bundle: 1 } });
add({ id: 'W3', print: 'carape', script: 'person', kind: 'child', anchor: [806, 1364], h: 182, facing: 1, look: [[113, 1], [113.8, -1], [115.5, -1], [116.3, 1]] });
add({ id: 'W4', print: 'carape', script: 'seated', anchor: [990, 1424], h: 195, facing: -1, look: [[111.8, 1], [112.8, -0.2], [115, -0.2], [116, 1]], nod: [[111.8, 0], [112.8, -0.1]] });

// Estratos (117,5–120,6) y gruta (120,6–124,5): la mayor gira hacia el niño
add({ id: 'E1', print: 'estratos', script: 'seated', anchor: [300, 850], h: 190, facing: 1, look: [[118.2, 1], [119.2, 0.2]] });
add({ id: 'E2', print: 'estratos', script: 'person', kind: 'child', anchor: [395, 862], h: 190, facing: -1, nod: [[118.6, 0], [119.4, -0.12]] });
add({ id: 'G1', print: 'gruta', script: 'seated', anchor: [610, 2040], h: 160, facing: 1, look: [[121.2, 1], [122.4, 0.3]] });

// Playa (124,5–162,8): la vida sigue mientras la sierra se hace arena; el niño que se revela mira el mar
add({ id: 'P1', print: 'playa', script: 'seated', anchor: [780, 1300], h: 190, facing: 1, look: [[127, 1], [128.4, -0.4], [133, -0.4], [134.4, 1], [146, 1], [147.4, -1], [152, -1]], nod: [[146, 0], [147.4, 0.12]] });
add({ id: 'P2', print: 'playa', script: 'person', kind: 'adult', anchor: [950, 1170], h: 160, facing: -1, opts: { bundle: 1 }, route: [[128.6, 90, -18], [134.2, 0, 0]], routeV: 16 });
add({ id: 'P3', print: 'playa', script: 'person', kind: 'adult', anchor: [640, 1470], h: 240, facing: 1, gather: { t0: 125, period: 3.8 },
  squat: [[125, 1], [134.6, 1], [136, 0], [141, 0], [142.6, 1], [150, 1], [151.6, 0]], squatLookUp: [[0, 0]] });
add({ id: 'P4', print: 'playa', script: 'person', group: 1, kind: 'child', anchor: [730, 1480], h: 240, facing: -1, look: [[140, 1], [141.5, -1]], nod: [[150, 0], [152, -0.14]] });
C.live = L;
// Portezuelo: los colonos aparecen junto al bote varado, lejos y aparte de las personas indígenas
for (const [id, x, y] of [['C1', 2006, 829], ['C2', 2040, 833]]) { const f = C.figures.find((f) => f.id === id); f.foot = [x, y]; f.h = 64; f.facing = -1; }
// ---------- cámara viva: empuje lento (≤ 7 %), paralaje entre planos y barridos de luz; nada de zoom rápido ni giros ----------
// plx: [t0, t1, dx, dy (px de foto que se corre lo cercano), y lejano, y cercano]; sweep: [[t0, t1, ángulo°, ancho px, ganancia]]
const cam = (id, k) => { const p = C.prints.find((p) => p.id === id); p.cam = k; };
cam('aerea', [[0, 370, 0, 1], [19.06, 486, 0, 1.05]]);
cam('relieve', [[40, 298, 0, 1], [50.42, 326, 0, 1.06]]);
cam('yaguaron', [[50.42, 842, 0, 1], [55.28, 866, 0, 1.04]]);
cam('abra', [[50.42, 250, 0, 1], [62.5, 368, 0, 1.04]]);
cam('quebrada', [[62.0, 380, 0, 1], [70.5, 446, 0, 1.05]]);
cam('tacuari', [[69.4, 60, 0, 1], [73.4, 112, 0, 1.04]]);
cam('cerrito', [[72.3, 330, 0, 1], [76.4, 384, 0, 1.04]]);
cam('yerbal', [[75.14, 255, 0, 1], [84.1, 334, 0, 1.05]]);
cam('rompiente', [[83.1, 0, 0, 1], [91, 64, 0, 1.03]]);
cam('portezuelo', [[89.78, 1648, 0, 1], [111.4, 1694, 0, 1.06]]);
cam('carape', [[109.6, 330, 0, 1], [118.0, 404, 0, 1.05]]);
cam('estratos', [[117.0, 150, 0, 1], [121.2, 204, 0, 1.03]]);
cam('playa', [[124.0, 380, 0, 1], [152.2, 506, 0, 1.045], [156, 520, 0, 1.045]]);
C.motion = {
  aerea: { sweep: [[4, 17, 20, 420, 0.07]] },
  canal: { sweep: [[23, 33, 12, 380, 0.09]] },
  relieve: { plx: [40, 50.4, -9, 0, 60, 717] },
  yaguaron: { plx: [50.4, 55.3, -12, 0, 700, 1920], sweep: [[50.6, 55.3, -8, 360, 0.06]] },
  abra: { plx: [55.3, 62.5, -16, 0, 540, 1013] },
  quebrada: { plx: [62.0, 70.5, -14, 0, 700, 1920], sweep: [[63.5, 69.8, 18, 420, 0.1]] },
  tacuari: { plx: [69.4, 73.4, -12, 0, 950, 1920] },
  cerrito: { plx: [72.3, 76.4, -12, 0, 950, 1920], sweep: [[72.6, 75.8, 10, 380, 0.1]] },
  yerbal: { plx: [75.1, 84.1, -8, 0, 200, 720] },
  portezuelo: { plx: [89.8, 111.4, -18, 0, 700, 1710], sweep: [[92, 100.5, 14, 460, 0.07], [103, 110, 14, 460, 0.06]] },
  carape: { plx: [109.6, 118, -14, 0, 950, 1920], sweep: [[110.6, 117.2, 16, 420, 0.1]] },
  playa: { plx: [124, 152, -16, 0, 820, 1815], sweep: [[126, 136.5, 8, 460, 0.07]] },
};
// el agua y el pasto responden más a los graves y a los golpes medidos de la canción
C.lowGain = 1.22; C.surgeLow = 0.3;
C.prints.find((p) => p.id === 'aerea').fx.flow = 6.5;
C.prints.find((p) => p.id === 'canal').fx.swash = 32;

// Portezuelo: los sellos de la postal («R. O. DEL U.» y el sello redondo) se reemplazan por cielo limpio clonado de abajo/al costado,
// hasta el borde superior, para que ninguna inscripción aparezca con el empuje o el paralaje de cámara.
C.photoSpec.rinconada.patches = [[2400, 0, 440, 62, 12, 2400, 66, 1], [2380, 0, 120, 40, 10, 2380, 70, 1], [2760, 190, 270, 270, 16, 2480, 190]];
// Coda: la mata se deshace en granos que el viento arrastra; al terminar sólo queda arena (sin mancha gris)
C.prints.find((p) => p.id === 'playa').fx.erode = { t0: 139.2, t1: 150.6, max: 1 };
C.shed.push({ print: 'playa', mode: 'dark', t0: 139.2, t1: 156.0, fadeEnd: 1.8, region: [760, 960, 1760, 1600], cell: 6, lumMax: 0.3, wind: [1, -0.1], turn: 40,
  bursts: [[142.0, 4], [144.6, 4], [146.5, 4], [148.5, 4], [150.0, 3]], cluster: 60, perCluster: 18, trickle: 900, size: [5, 9], speed: [38, 80], reach: [200, 360], life: [2.6, 5],
  fan: 0.55, swirl: [1, 3], turnPx: 60, pale: 0.6, darken: 0.6, Lmin: 0.10, Lmax: 0.24, seedOff: 7 });
C.shed.push({ print: 'playa', mode: 'dark', t0: 140.0, t1: 156.0, fadeEnd: 1.8, region: [200, 1420, 560, 1810], cell: 6, lumMax: 0.3, wind: [1, -0.12], turn: 40,
  bursts: [[145.2, 3], [148.0, 3]], cluster: 45, perCluster: 14, trickle: 300, size: [5, 8], speed: [34, 70], reach: [160, 300], life: [2.6, 5],
  fan: 0.5, swirl: [1, 3], turnPx: 50, pale: 0.6, darken: 0.6, Lmin: 0.10, Lmax: 0.24, seedOff: 11 });

// grupos que caminan: la marcha articulada reemplaza el vaivén vertical
Object.assign(C.groups.relieve[1], { vel: [6.3, 4.8], walk: [41.6, 50.2], bob: 0, ramp: 1.2 });
Object.assign(C.groups.yerbal[1], { vel: [5.2, -0.3], walk: [76.6, 83.4], bob: 0, ramp: 1.2 });
Object.assign(C.groups.portezuelo, { 3: { start: 105.2, tau0: 0.9 }, 4: { start: 91.4, tau0: 0.9 }, 5: { start: 100.7, tau0: 0.5 } });
// las siluetas fijas reemplazadas ya no se dibujan desde el atlas; el viejo velero diminuto se retira
C.figures = C.figures.filter((f) => f.id !== 'S1');
})();
