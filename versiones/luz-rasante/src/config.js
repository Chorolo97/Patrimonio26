/* «Luz rasante» — ÚNICO lugar de configuración de esta versión (metros, x este, y norte, nivel del mar 0). */
window.REEL_CONFIG = {
  title: 'Luz rasante',
  subtitle: 'Una alborada cenital sobre la Sierra de la Ballena',
  seed: 26031,
  width: 1080, height: 1920, fps: 30, duration: 40,
  safeZone: { x0: 100, x1: 900, y0: 250, y1: 1500 },
  assets: '../../shared/assets/',
  featuresUrl: '../../shared/audio/features.json',
  audio: { src: '../../shared/assets/audio/punta_ballena.mp3', AUDIO_START_SECONDS: 47.8, fadeIn: 0.4, fadeOut: 1.5, volume: 1 },
  logo: { file: 'logo/02_logo_uvpb_blanco.png', width: 620 },
  closingAt: 35.0,
  closing: { calmK: 0.8, y: 320, shadow: 'rgba(5,8,14,0.5)', scrim: 0.72, scrimBox: [40, 250, 1040, 900], scrimFeather: 260 },
  photos: { graniteA: 'photos/clean/gruta_limpia.jpg', graniteB: 'photos/clean/rinconada_limpia.jpg', grass: 'photos/clean/relieve_sin_bosque.jpg' },

  world: {
    // lomo de la sierra: de tierra adentro a la punta, con alturas de cresta
    spine: [[-420, 3300], [-260, 2500], [-110, 1700], [10, 1000], [70, 420], [55, 60], [40, -40]],
    crest: [95, 88, 74, 62, 46, 18, 0],
    Ww: [35, 55],              // ancho del paredón oeste (m)
    We: [250, 420],            // ancho de la ladera este (m)
    plateau: 22,               // media meseta hacia el este (m)
    notches: [[180, 12, 8], [330, 9, 7], [520, 14, 10], [760, 11, 7]], // grutas: [y, ancho, fondo]
    knoll: { x: 270, y: 962, rx: 27, ry: 82, h: 2.4 },   // loma granítica al ESE del cuadro S4
    // medialunas de arena: círculo (centro, radio), extremos y ancho
    beachW: { c: [-1892.7, 522.5], R: 1844.5, a: [-220, 1300], b: [-1400, 2300], width: [30, 55] },
    beachE: { c: [2171.5, -737.6], R: 2336.2, a: [330, 700], b: [1500, 1500], width: [32, 60] },
    tip: { a: [64, 150], b: [44, -6], r: 26, c: [42, -12], rx: 29, ry: 22 },   // plataforma granítica de la punta
    // sendero viejo: por la cresta desde el norte hasta (60,420) y baja por la ladera este a (330,760)
    trail: [[-330, 2700], [-250, 2450], [-170, 2050], [-100, 1700], [-45, 1400], [0, 1060], [30, 820], [55, 560], [60, 420], [120, 470], [200, 560], [270, 660], [330, 760]],
    trailMeander: 15, trailWidth: 0.85,
    ship: { x: 675, y: 845, heading: 58, len: 18, beam: 5, masts: [15.5, 12.5] },   // fondeado a ~200 m de la playa este
    boat: { x: 583, y: 980.5, heading: 312, len: 5, beam: 1.5 },   // varado justo sobre la resaca
    // manchas de monte (zonas donde crecen matas oscuras): [cx, cy, rx, ry, densidad]
    monte: [[216, 958, 10, 8, 0.25], [150, 900, 40, 30, 0.35], [205, 1180, 60, 40, 0.4], [120, 640, 50, 40, 0.4], [-160, 2100, 120, 90, 0.35], [320, 1250, 90, 50, 0.3], [-60, 1900, 60, 80, 0.3], [260, 420, 40, 60, 0.3], [-420, 2450, 140, 100, 0.35]],
    monteExtra: [[236.7, 973.4, 0.95, 1.3, 4.1], [234.1, 972.0, 0.6, 0.85, 7.7], [237.9, 975.2, 0.45, 0.6, 2.2]],
    big: { x0: -1700, y0: -700, size: 3400, res: 2048 },
    tipBake: { cx: 40, cy: -20, size: 160, res: 1024 },
    // S8: granito de la punta a 2.6 cm/texel (bloques almohadillados entre diaclasas maestras, bolas, pozas)
    cap: { x0: 26.9, y0: -48.3, size: 26.2, res: 1024, coastY: -33.7,
      pools: [[47.87, -25.0, 1.0, 0.62, 0.4], [32.78, -30.74, 1.15, 0.7, 2.1], [42.22, -23.24, 0.7, 0.45, 1.2], [31.76, -23.52, 0.75, 0.5, 0.3]] },
    joints: { azA: 20, azB: 110, S: 9.0, jitter: 0.6, gaps: 0.3 },
  },

  sun: { azimuth: 96, e0: 0.4, e1: 6.8, humanMinElev: 2.3, humanElev: 20, nearElev: 20, rampLow: -2.0,
    // humanElev: elevación dirigida de las sombras humanas en tomas cercanas (sombra ≈ 2.75×altura: se lee como persona);
    // nearElev: la misma para matas y microsombras del pasto (coherencia en el campo cercano). El terreno usa el sol real e(t).
    // horizonte lejano dirigido (grados) en función de la altura del terreno: [h, grados]
    hzFar: [[-5, 1.62], [0, 1.58], [20, 1.46], [40, 1.36], [46, 1.24], [48, 1.1], [50, 0.9], [52, 0.68], [54, 0.45], [56, 0.25], [60, 0.0], [75, -0.3], [100, -0.6]],
    penumbra: 0.15,
    colors: [[1.0, [1.0, 0.55, 0.30]], [2.5, [1.0, 0.66, 0.40]], [4.0, [1.0, 0.75, 0.50]], [6.0, [1.0, 0.82, 0.62]], [7.0, [1.0, 0.86, 0.70]]],
    intensity: 3.0, sky: [0.38, 0.46, 0.58],
  },
  clock: { gateFloor: 0.15, gate: [12.8, 15.05], ramp: 0.3, base: 0.55, gain: 0.9 },
  onsets: { threshold: 0.85, minGap: 0.4 },

  palette: {
    olive: '#6F6B3C', ochre: '#B08A4A', straw: '#C9B48A',
    monteA: '#4F5236', monteB: '#3C3F2A',
    graniteA: '#3A3C3F', graniteB: '#4A4C4F', graniteC: '#6B6A66', lichenA: '#8C8A70', lichenB: '#A39C7A', lip: '#B89A78',
    sandDry: '#CDB892', sandWet: '#8F7F66',
    seaDeep: '#2E4452', seaMid: '#3E5563', seaShallow: '#5F7A86', foam: '#F1EEE6',
    closingSea: '#223140',
    hide: '#735C44', hair: '#3A2D22', skin: '#7A5238', hat: '#4A4036', jacket: '#4A4842', shirt: '#8E877A',
    hull: '#2E241C', deck: '#54483A', sail: '#CFC6B0',
  },
  grade: { saturation: 0.8, exposure: 1.0, lowSunBoost: 0.7, shadowTint: '#1B2433', shadowAmt: 0.42, warm: 0.05, grain: 0.03, vignette: 0.05 },

  // Tomas cenitales. center (m), W (m = 1080 px), theta (grados: dirección "arriba" respecto del norte, horario),
  // drift (px/s en pantalla), push (factor de escala final).
  shots: [
    { id: 'S1', t0: 0.00, t1: 4.97, center: [32, 760], W: 15, theta: 0, drift: [0, -6], push: 1.02, fx: ['MICRO', 'FIG', 'CLUMPS', 'BAND', 'TRAILSEG', 'NOWATER', 'NOROCK', 'NOSAND'] },
    { id: 'S2', t0: 4.97, t1: 10.53, center: [200, 1050], W: 1600, theta: 25, drift: [0, 0], push: 1.04, fx: ['CLUMPS'] },
    { id: 'S3', t0: 10.53, t1: 15.07, center: [-60, 1480], W: 16, theta: 20, drift: [0, 8], push: 1.0, fx: ['MICRO', 'FIG', 'CLUMPS', 'TRAILSEG', 'NOWATER', 'NOROCK', 'NOSAND'] },
    { id: 'S4', t0: 15.07, t1: 22.23, center: [240, 978], W: 17, theta: 0, drift: [-4, 0], push: 1.02, fx: ['MICRO', 'FIG', 'CLUMPS', 'NOWATER', 'NOROCK', 'NOSAND'] },
    { id: 'S5', t0: 22.23, t1: 27.30, eh: 'true', center: [630, 945], W: 185, theta: -12, drift: [-8, 0], push: 1.0, fx: ['SHIP', 'BOAT', 'FIG', 'CLUMPS', 'SWELL'] },
    { id: 'S6', t0: 27.30, t1: 30.63, center: [571.6, 971.9], W: 22, theta: 35, drift: [0, 4], push: 1.0, fx: ['MICRO', 'RIPPLE', 'FOOT', 'BOAT', 'FIG', 'NOROCK'] },
    { id: 'S7', t0: 30.63, t1: 34.70, center: [40, 18], W: 150, theta: 180, drift: [0, 0], push: 1.03, fx: ['TIP', 'JOINTS', 'LACE', 'NOSAND'] },
    { id: 'S8', t0: 34.70, t1: 40.01, center: [40, -40], W: 20, theta: 180, drift: [0, 0], push: 1.0, fx: ['TIP', 'CAP', 'TIPONLY', 'JOINTS', 'LACE', 'FIG', 'NOGRASS', 'NOSAND', 'CALM'] },
  ],

  // Escena S1: franja iluminada centrada en la cresta que se ensancha con el reloj del alba (d = distancia al lomo, este +)
  crestBand: { a: [10, 1000], b: [70, 420], dW0: -4.3, dW1: -7.2, dE0: 2.3, dE1: 6.5, bulgeY: 752, bulgeSigma: 7, bulgeW: 0, bulgeW1: 0, jag: 0.35 },
  // Escena S4: sombra dirigida de la loma (terminador que barre el cuadro)
  // Escena S4: la loma es un grupo de bolas de granito al borde derecho; su sombra (largo hb·K(t)) se retira hacia ellas.
  // Escena S8: roca-asiento. (La roca del niño se ubica sola respecto del niño: ver childRock.)
  boulders: {
    S4: { K: [15.07, 17.8, 4.9, 0.0], list: [
      // masa de la loma (fuera de cuadro, solo sombra): frente ancho y ondulado que se retira hasta detrás de las bolas
      { at: [1450, 980], r: 4.0, Rb: 26, hb: 3.1, hidden: 1, jag: 1.6 },
      // bolas visibles en grupos irregulares (no una fila), algunas cortadas por el borde
      { at: [950, 120], r: 2.3, hb: 3.0 }, { at: [830, 300], r: 1.2, hb: 1.7 }, { at: [910, 430], r: 1.6, hb: 2.2 },
      { at: [985, 760], r: 2.1, hb: 3.0 }, { at: [880, 905], r: 1.0, hb: 1.3 }, { at: [775, 1010], r: 0.45, hb: 0.5 },
      { at: [860, 1330], r: 1.7, hb: 2.4 }, { at: [955, 1440], r: 2.2, hb: 2.9 }, { at: [775, 1520], r: 0.7, hb: 0.9 },
      { at: [935, 1800], r: 2.0, hb: 2.6 }, { at: [825, 1905], r: 1.1, hb: 1.5 } ] },
  },
  // Escena S8: roca cuya sombra descubre al niño en el golpe 37.80
  childRock: { onset: 37.8, r: 0.85, h: 0.45, dist: 4.3, side: 0.1, cover: 0.7, after: -0.5, lead: 0.03, dur: 0.3 },
  lace: { t0: 30.63, grow: 33.0, R: 60, cell: 1.7, calmBelow: 6.5 },

  // Personas: posiciones en píxeles de pantalla de la toma (al inicio de la toma), convertidas a mundo al iniciar.
  // sil: celdas del atlas (A/B = variantes de peso), face: acimut hacia donde mira el cuerpo (visto desde arriba).
  cast: {
    S1: [
      { id: 'I1', kind: 'ind', H: 1.70, sil: ['iF_staff_a', 'iF_staff_b'], at: [826, 600], face: 280, swap: 7.0 },
      { id: 'I2', kind: 'ind', H: 1.63, sil: ['iB_bundle_a', 'iB_bundle_b'], at: [790, 1075], face: 100, swap: 8.3 },
      { id: 'I3', kind: 'ind', H: 1.12, child: 1, sil: ['iF_child_a', 'iF_child_b'], at: [850, 1255], face: 250, swap: 6.4 },
    ],
    // grupo que camina junto: dos adultos casi a la par, el niño entre ellos y un poco adelante, la anciana atrás con el bastón,
    // otra persona fuera del sendero. trailAt: metros a lo largo del sendero (+ = más al sur/adelante); lat: metros al costado.
    S3: [
      { id: 'I4', kind: 'ind', H: 1.58, sil: ['iP_walk_elder'], trailAt: -4.6, lat: 0.5, face: 'path', v: 0.35 },
      { id: 'I1', kind: 'ind', H: 1.70, sil: ['iP_walk_staff'], trailAt: 0.0, lat: -0.55, face: 'path', v: 0.35 },
      { id: 'I2', kind: 'ind', H: 1.63, sil: ['iP_walk_bundle'], trailAt: 1.05, lat: 0.6, face: 'path', v: 0.35, turn: 26 },
      { id: 'I3', kind: 'ind', H: 1.12, child: 1, sil: ['iP_walk_child'], trailAt: 1.95, lat: 0.05, face: 'path', v: 0.35 },
      { id: 'I5', kind: 'ind', H: 1.67, sil: ['iP_walk_adult'], trailAt: 4.3, lat: -2.2, face: 'path', v: 0.35 },
    ],
    S4: [
      { id: 'I5', kind: 'ind', H: 1.67, sil: ['iB_bundle_a', 'iB_bundle_b'], at: [390, 520], face: 280, swap: 7.5 },
      { id: 'I3', kind: 'ind', H: 1.12, child: 1, pose: 'crouch', sil: ['iP_crouch_child'], at: [300, 1520], face: 190 },
      { id: 'I6', kind: 'ind', H: 1.64, pose: 'seat', sil: ['iP_seat_knees'], at: [655, 700], face: 15 },
      { id: 'I7', kind: 'ind', H: 1.68, pose: 'seat', sil: ['iF_seat'], at: [630, 1175], face: 265 },
    ],
    // S5: plano lejano con el sol real (sombras de 20–25 m: líneas de persona). Colonos junto al bote; recolectoras a >120 m por la orilla.
    S5: [
      { id: 'C1', kind: 'col', H: 1.70, sil: ['cB_stand_bundle_a'], world: [581.5, 983.8], face: 320 },
      { id: 'C2', kind: 'col', H: 1.68, sil: ['cB_stand_stick_a'], world: [584.2, 983.0], face: 300 },
      { id: 'I8', kind: 'ind', H: 1.62, pose: 'crouch', sil: ['iP_crouch'], world: [681, 1061.5], face: 130 },
      { id: 'I9', kind: 'ind', H: 1.10, child: 1, sil: ['iP_child_a'], world: [687.5, 1066], face: 20, flip: 1 },
      { id: 'I10', kind: 'ind', H: 1.66, sil: ['iP_bundle_a'], world: [674.5, 1071], face: 40, flip: 1 },
    ],
    // S6: θ 35 pone la orilla casi vertical (mar a la derecha). Colonos arriba (suben desde el bote), grupo indígena abajo, a >28 m.
    S6: [
      { id: 'C1', kind: 'col', H: 1.70, sil: ['cB_walk_bundle', 'cB_stand_bundle_a'], pathWorld: [[578.4, 985.6], [576.5, 987.5]], v: 0.38, stop: 29.4, face: 'path' },
      { id: 'C2', kind: 'col', H: 1.68, sil: ['cB_walk_stick', 'cB_stand_stick_a'], pathWorld: [[580.8, 984.1], [578.8, 986.3]], v: 0.36, stop: 29.3, face: 'path' },
      { id: 'I8', kind: 'ind', H: 1.62, pose: 'crouch', sil: ['iP_crouch'], world: [563.59, 962.59], face: 130 },
      { id: 'I9', kind: 'ind', H: 1.10, child: 1, sil: ['iP_child_a', 'iP_child_b'], world: [560.53, 962.49], face: 25, swap: 6.2 },
      { id: 'I10', kind: 'ind', H: 1.66, sil: ['iP_bundle_a', 'iP_bundle_b'], world: [562.14, 965.84], face: 350, swap: 7.7 },
    ],
    // S8: personas en reposo sobre roca abierta, en distintas orientaciones; el niño en la sombra de una roca hasta 37.80.
    // (Los colonos no aparecen en el cierre: ver notas.)
    S8: [
      { id: 'I4', kind: 'ind', H: 1.58, pose: 'seat', sil: ['iP_seat_rock'], at: [560, 1430], face: 350, rock: 1 },
      { id: 'I6', kind: 'ind', H: 1.64, pose: 'crouch', sil: ['iP_crouch'], at: [195, 1790], face: 115 },
      { id: 'I5', kind: 'ind', H: 1.67, sil: ['iP_bundle_a', 'iP_bundle_b'], at: [250, 1515], face: 5, swap: 8.3 },
      { id: 'I11', kind: 'ind', H: 1.08, child: 1, sil: ['iF_child_a', 'iF_child_b'], at: [800, 1700], face: 70, swap: 99, childRock: 1 },
    ],
  },
  // tiempos de registro de rendimiento
  perfTimes: [2, 8, 14, 20, 32, 38],
  reviewTimes: [0, 2.5, 6, 9.5, 12, 14.5, 16, 20, 24.5, 28.5, 32, 34, 36.5, 39.9],
};
