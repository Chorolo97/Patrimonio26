/* ÚNICO lugar de configuración de «Revelado». Coordenadas de máscaras y figuras en px de la foto limpia. */
window.REEL_CONFIG = {
  title: 'Revelado',
  subtitle: 'Dos copias reales en la bandeja de revelado: lo más denso aparece primero.',
  seed: 26031,
  width: 1080, height: 1920, fps: 30, duration: 40,
  safeZone: { x0: 100, x1: 900, y0: 250, y1: 1500 },
  assets: '../../shared/assets/',
  featuresUrl: '../../shared/audio/features.json',
  audio: { src: '../../shared/assets/audio/punta_ballena.mp3', AUDIO_START_SECONDS: 47.8, fadeIn: 0.4, fadeOut: 1.5, volume: 1 },
  logo: { file: 'logo/02_logo_uvpb_blanco.png', width: 620 },
  closingAt: 35.2,
  closing: { y: 300, shadow: 'rgba(10,8,6,0.5)' },

  photos: { portezuelo: 'photos/clean/rinconada_limpia.jpg', gruta: 'photos/clean/gruta_limpia.jpg' },
  // negro/blanco de la normalización (percentiles medidos) y retoques clonados [dx,dy,sx,sy,w,h,pluma]
  photoSpec: {
    rinconada: { w: 3030, h: 1710, black: 0.20, white: 0.86, patches: [[2388, 1222, 80, 108, 12, 2290, 1222], [2394, 1318, 70, 44, 12, 2474, 1326], [2522, 1240, 60, 104, 12, 2612, 1240], [2430, 1190, 40, 50, 10, 2330, 1190]] },
    gruta: { w: 3015, h: 1730, black: 0.13, white: 0.86, patches: [],
      // curva propia de la gruta: medios de la pared levantados, arena comprimida (con textura, no papel)
      curve: [[0, 0.0], [0.05, 0.035], [0.30, 0.36], [0.50, 0.53], [0.75, 0.70], [0.9, 0.77], [1.0, 0.80]] },
  },

  // Copias: origen del recorte (px foto) con claves [t, x]; escala; empuje (1 → push) sobre un centro en pantalla
  prints: [
    { id: 'P1', photo: 'rinconada', originX: [[0, 1250], [12.8, 1600]], originY: 0, scale: 1.1228, push: null, men: 0, archive: true },
    { id: 'P2', photo: 'gruta', originX: [[14.25, 1164]], originY: 0, scale: 1.1098, push: { t0: 14.25, t1: 24.6, from: 1.0, to: 1.035, c: [540, 1150] }, men: 1 },
    { id: 'P3', photo: 'rinconada', originX: [[22.23, 1760], [35, 1700]], originY: 0, scale: 1.1228, push: null, men: 2, foam: true },
  ],

  // Meniscos (exactamente 3). dirDeg: inclinación respecto de la vertical; s0 y v en px de pantalla.
  // figFront: las figuras de la copia nueva nuclean en la banda detrás de la cresta; tau0/induction: revelado del fondo;
  // wet: el papel mojado se ve más hondo enseguida (sólo la postal de archivo)
  meniscus: [
    { t0: -0.9, dirDeg: -5, s0: -40, v: 660, bow: 80, noiseAmp: 60, seed: 1.7, figFront: 0, tau0: 0.32, induction: 0.03, wet: 0.4 },
    { t0: 14.25, dirDeg: -12, s0: -90, v: 760, bow: 100, noiseAmp: 60, seed: 5.3, figFront: 1, tau0: 0.45, induction: 0.03, wet: 0 },
    { t0: 22.23, dirDeg: 7, s0: -90, v: 820, bow: 90, noiseAmp: 60, seed: 9.1, figFront: 1, tau0: 0.45, induction: 0.03, wet: 0 },
  ],

  development: { tau0: 0.55, induction: 0.06, gateFloor: 0.12, gateFloorDev: 0.5, gate: [12.8, 15.05], ramp: 0.3 },

  tone: {
    Lp: 0.955,
    livingCurve: [[0, 0.0], [0.05, 0.03], [0.30, 0.22], [0.50, 0.55], [0.75, 0.84], [0.84, 0.93], [1.0, 0.955]],
    hiFrom: '#F2EADB', hiTo: '#F4E6CC', warmBy: 30,
  },
  // quemado: tarjeta a mano con borde ancho (140 px) que ondula ±25 px y deriva; llega a pleno antes de que aparezca el texto
  burn: { t0: 33.6, t1: 35.0, yFull: 870, yZero: 1010, density: 1.2, edgeAmp: 25, drift: 0.012 },
  grotto: { swashRate: 1.9 },
  // plata de las figuras: luminancia según la profundidad en pantalla (perspectiva aérea) y desenfoque de la foto a esa distancia
  figureLook: { yNear: 1800, yFar: 900, Lnear: 0.095, Lfar: 0.14, softNear: 0.8, softFar: 1.5, sailL: 0.2, sailSoft: 1.6 },
  warmTimes: [0.4, 14.7, 16.4, 22.6, 27, 31],
  rinse: { t0: 12.8, t1: 15.05, drop: 13.1, center: [620, 760], amp: 3, grow: 1.8, wobble: 1.5, deepen: 0.04 },
  foam: { t0: 29.4, grow: 3.2, shadeT0: 28.6, shadeDur: 2.0, cell: 3.0, xMin: 1745, size: [5, 7],
    bursts: [[29.4, 3], [30.63, 3]], cluster: 60, perCluster: 26, trickle: 260,
    // orilla verdadera (px de foto): pie del acantilado y de la sierra lejana; la roca está arriba y el agua abajo
    waterline: [[1700, 716], [1800, 700], [1900, 684], [2000, 668], [2080, 650], [2118, 630], [2135, 613], [2400, 611], [2750, 613], [3030, 616]] },
  onsetThreshold: 0.85, onsetGap: 0.4,
  maskBlur: 3,

  masks: {
    rinconada: {
      sky: [[[980, 0], [1200, 40], [1400, 100], [1600, 180], [1800, 270], [1920, 340], [2000, 405], [2200, 462], [2300, 458], [2400, 478], [2500, 505], [2600, 530], [2700, 555], [2800, 575], [2900, 592], [3030, 603], [3030, 0]]],
      water: [
        // mar: del pie del acantilado al pie de la sierra lejana y sobre la roca grande
        [[1740, 712], [1800, 700], [1900, 684], [2000, 668], [2080, 650], [2118, 628], [2130, 612], [2500, 612], [3030, 616], [3030, 990], [2930, 962], [2922, 900], [2880, 830], [2800, 765], [2700, 748], [2600, 718], [2530, 705], [2440, 690], [2340, 668], [2290, 672], [2262, 712], [2220, 734], [2140, 750], [2090, 762], [2000, 760], [1900, 752], [1800, 738]],
        // agua al pie de la roca grande (charca de marea con espuma)
        [[2168, 1352], [2240, 1322], [2330, 1328], [2420, 1340], [2474, 1372], [2470, 1420], [2420, 1452], [2320, 1462], [2226, 1452], [2170, 1416]],
      ],
      // zona donde el borde agua/roca se toma de la foto (mar claro conectado)
      autoWater: { zone: [[2124, 586], [2800, 586], [3030, 606], [3030, 1000], [2200, 1000], [2124, 780]], seeds: [[2500, 650], [2800, 680], [2950, 900]], lo: 0.665 },
      rock: [
        // acantilado
        [[0, 0], [980, 0], [1200, 40], [1400, 100], [1600, 180], [1800, 270], [1920, 340], [2000, 405], [2060, 420], [2124, 600], [2118, 628], [2080, 650], [1900, 684], [1700, 700], [1500, 706], [1100, 706], [700, 694], [300, 666], [0, 646]],
        // sierra lejana (promontorio)
        [[2000, 405], [2200, 462], [2300, 458], [2400, 478], [2500, 505], [2600, 530], [2700, 555], [2800, 575], [2900, 592], [3030, 603], [3030, 616], [2500, 612], [2130, 612], [2124, 600]],
        // roca grande
        [[2085, 1000], [2080, 820], [2090, 762], [2140, 750], [2220, 734], [2262, 712], [2290, 672], [2340, 668], [2440, 690], [2530, 705], [2600, 718], [2700, 748], [2800, 765], [2880, 830], [2922, 900], [2930, 962], [2860, 1060], [2780, 1250], [2700, 1370], [2560, 1372], [2474, 1372], [2420, 1340], [2330, 1328], [2240, 1322], [2168, 1352], [2120, 1150]],
        // rocas del primer plano (izquierda) y roca oscura bajo la charca
        [[1560, 1196], [1700, 1182], [1790, 1214], [1880, 1252], [1960, 1290], [2004, 1336], [2000, 1420], [1966, 1500], [2020, 1560], [2060, 1640], [2080, 1710], [1560, 1710]],
        [[2120, 1480], [2200, 1452], [2300, 1462], [2360, 1492], [2384, 1560], [2366, 1710], [2112, 1710], [2104, 1580]],
        // rocas sueltas de la orilla
        [[1780, 730], [1830, 722], [1862, 745], [1855, 782], [1790, 786]],
        [[1870, 772], [1930, 762], [1978, 790], [1975, 835], [1890, 840]],
      ],
    },
    gruta: {
      sky: [[[1330, 400], [1620, 340], [1900, 380], [2000, 700], [1990, 1440], [1420, 1452], [1330, 1100]]],
      sand: [[[1120, 1730], [1125, 1610], [1190, 1520], [1260, 1470], [1360, 1452], [1700, 1450], [1990, 1446], [2010, 1520], [1990, 1600], [1960, 1660], [2000, 1730]]],
      water: [],
      rock: [[[0, 0], [3015, 0], [3015, 1730], [0, 1730]]],
      rockMinus: true,
      skyBlur: 45, // la boca se oscurece con un borde muy suave (no un polígono)
    },
  },

  // Personas y vela. pose: ver src/figures.js. unit: px de foto por unidad de pose (adulto de pie = 100).
  // group: 0 = sigue la τ de su copia; 1 colonos (26,4 s, τ0 1,0); 2 vela (27,3 s); 3 niño I7 (35,8 s, τ0 1,6); 4 = I3 en P1 (1,2 s)
  figures: [
    { id: 'I1', print: 'P1', group: 0, pose: 'standP', foot: [1760, 1180], size: 'adult', facing: -1, opts: { backHand: [-18.3, 39] } },
    { id: 'I2', print: 'P1', group: 0, pose: 'childP', foot: [1812, 1172], size: 'child', facing: -1, opts: { hand: [12, 52] } },
    { id: 'I3', print: 'P1', group: 4, pose: 'standB', foot: [2060, 1080], size: 'adult', facing: 1, opts: { staff: 1 } },
    { id: 'G1', print: 'P2', group: 0, pose: 'seatGround', foot: [1330, 1622], sizeY: 1650, size: 'adult', facing: 1 },
    { id: 'G3', print: 'P2', group: 0, pose: 'childP', foot: [1478, 1614], size: 'child', facing: 1 },
    { id: 'G2', print: 'P2', group: 0, pose: 'standQ', foot: [1760, 1655], sizeY: 1650, size: 'adult', facing: -1 },
    { id: 'I3b', print: 'P3', group: 0, pose: 'standB', foot: [2060, 1080], size: 'adult', facing: 1, opts: { staff: 1 } },
    { id: 'I8', print: 'P3', group: 0, pose: 'standP', foot: [1985, 1302], size: 'adult', facing: -1, opts: { staffFront: 1 } },
    { id: 'I5', print: 'P3', group: 0, pose: 'seatRock', foot: [1868, 1292], size: 'adult', facing: 1 },
    { id: 'I6', print: 'P3', group: 0, pose: 'crouch', foot: [2150, 1385], size: 'adult', facing: 1 },
    { id: 'I7', print: 'P3', group: 3, pose: 'childP', foot: [2230, 1330], size: 'child', facing: -1 },
    { id: 'C1', print: 'P3', group: 1, pose: 'colonistP', foot: [1830, 862], size: 'adult', facing: 1, opts: { sack: 1 } },
    { id: 'C2', print: 'P3', group: 1, pose: 'colonistP', foot: [1866, 855], size: 'adult', facing: 1, opts: { stick: 1, coat: 1, brim: 13 } },
    { id: 'S1', print: 'P3', group: 2, pose: 'sail', foot: [2520, 628], size: 'sail', facing: 1 },
  ],
  groups: { 1: { start: 26.4, tau0: 1.0 }, 2: { start: 27.3, tau0: 1.0 }, 3: { start: 35.8, tau0: 1.6 }, 4: { start: 1.2, tau0: 0.5 } },
  sizeRule: { rinconada: { k: 0.34, y0: 600 }, gruta: { headY: 1460 }, child: 0.68, sailUnit: 1.05 },
  light: {
    rinconada: { kx: 0.56, ky: 0.27, rim: [1.5, 1.5] },
    gruta: { kx: 0.10, ky: 0.20, rim: [0.4, 1.8] },
  },
};
