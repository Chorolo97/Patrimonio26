/* ÚNICO lugar de configuración de «Cota cero». Todo lo ajustable vive aquí. */
window.REEL_CONFIG = {
  title: 'Cota cero',
  subtitle: 'Una plancha grabada que se mueve: la línea de costa de Punta Ballena se vuelve espuma',
  seed: 20261003,
  width: 1080, height: 1920, fps: 30, duration: 40,
  safeZone: { x0: 100, x1: 900, y0: 250, y1: 1500 },
  assets: '../../shared/assets/',
  featuresUrl: '../../shared/audio/features.json',
  audio: { src: '../../shared/assets/audio/punta_ballena.mp3', AUDIO_START_SECONDS: 47.8, fadeIn: 0.4, fadeOut: 1.5, volume: 1 },
  logo: { file: 'logo/01_logo_uvpb_color.png', width: 620 },
  closingAt: 35.0,
  closing: { y: 290, ink: '#22211F', ink2: '#3A362E', skyFadeFrom: 34.2, clearTo: 884 },
  photos: { grotto: { file: 'photos/clean/gruta_limpia.jpg', crop: [1164, 0, 973, 1730] } },

  palette: {
    night: { plate: '#16202E', land: '#E6DDC8', sea: '#8FA3AE', foam: '#F2ECDF', trail: '#B8863B', tooth: 0.025 },
    day: { paper: '#ECE4D2', granite: '#22211F', grass: '#5E5B40', sand: '#6E604A', sea: '#4E6773', ochre: '#B8863B', grain: 0.03, tone: 0.015 },
  },
  lines: { spacing: 14, jitter: 0.12, minWidth: 2.2, maxWidthFrac: 0.55, wobble: 0.35, stippleMin: 2.4 },

  markers: { breath: [12.8, 15.05], stanza: 15.05, decay: 38.5 },
  onsetThreshold: 0.85, onsetMinGap: 0.4,
  onsetsFallback: [1.70, 4.97, 7.03, 7.63, 8.07, 10.53, 15.07, 15.67, 18.77, 19.17, 19.90, 22.23, 26.40, 27.30, 29.40, 30.63, 37.80, 38.53],
  sea: { base: 0.3, decayTo: 0.3 },
  ripple: { cPlan: 170, cWorld: 40, tau: 2.2, maxPx: 6, bigAt: 15.07, bigGain: 1.8 },

  world: {
    extent: [-1700, -700, 1700, 2700],
    bakeRes: 2048, edtRes: 1024,
    spine: [[-420, 3300], [-260, 2500], [-110, 1700], [10, 1000], [70, 420], [55, 60], [40, -40]],
    crest: [95, 88, 74, 62, 46, 18, 0],
    Ww: [44, 62], We: [250, 420], plateau: [40, 90], drop: 6,
    notches: [{ y: 180, w: 11, d: 8 }, { y: 330, w: 14, d: 9 }, { y: 520, w: 9, d: 7 }, { y: 760, w: 13, d: 10 }],
    // Costa de las bahías: la playa oeste (Portezuelo) pasa por los pies de la cámara oblicua.
    westBeach: [[-150, 1262], [-330, 1330], [-470, 1378], [-640, 1450], [-900, 1640], [-1150, 1900], [-1400, 2300], [-1600, 2750]],
    eastBeach: [[250, 640], [330, 700], [560, 820], [820, 960], [1100, 1150], [1350, 1360], [1500, 1500], [1760, 1700]],
    lomas: { amp: [5, 25], fromY: 1800 },
    seaFloor: [-2, -12],
    trail: [[-330, 2800], [-240, 2400], [-160, 2000], [-95, 1650], [-35, 1300], [10, 1000], [45, 700], [60, 420], [120, 470], [190, 560], [250, 650], [300, 715], [330, 760]],
    trailMeander: 15,
    tip: [40, -40],
  },

  views: {
    plan: { center: [40, 900], widthM: 1500, overscan: 1.1, push: [2.8, 7.6, 1.0, 1.05], pull: [15.05, 19.0, 1.05, 1.0] },
    contours: { step: 5, major: 25, majorExtra: 0.8, fadeFw: 1 / 6 },
    hachure: { dsep: 12, dtest: 5.5, step: 1.5, minLen: 8, maxLen: 60, minSlopeDeg: 3, wMin: 0.9, wMax: 4.2, slopeFull: 40, sunAz: 96, sunEl: 12 },
    grotto: { push: [7.6, 15.0, 1.0, 1.03], center: [540, 1100], dsep: 13, work: [540, 960] },
    oblique: {
      // cámara baja sobre la arena de Portezuelo, cerca de la sierra: la pared oeste llena el tercio superior izquierdo
      cam: [-250, 1315, 2.3], tipX: 660, fovDeg: 50, focal: 2059, k: 1.4,
      // inclinación: quieta hasta el golpe de 22,23 s y luego lineal (≈1,3 px/cuadro) hasta el encuadre del cierre
      horizon: [[22.23, 740], [35.0, 1247]], horizonEase: 0.02, bufH: 2440, bufHorizon: 1247, mesh: 512,
      contourStep: 3, near: 120, box: [-330, -200, 700, 1250],
      sky: { spacing: 14, topW: 2.6, clouds: [[360, 70], [700, 60]] },
      sea: { dlog: 0.056, waveAmp: 5, swashM: 3, swellFrom: 160 },
      echo: { aspect: 3.0, rho0: 54, lambda: 0.26, speed: 0.62, gap: 7, front: 0.3, left: 260 },
    },
  },

  fronts: {
    M1: { t: [7.6, 8.6], noise: 20, feather: 35, line: 2 },
    M2: { t: [12.8, 15.05], keys: [[12.8, 0], [13.1, 0.11], [14.9, 0.77], [15.05, 1.0]], line: 3.8 },
    M3: { t: [18.0, 19.0], noise: 16, feather: 40, line: 2.5 },
  },

  timeline: { emerge: [0.2, 2.8], trailCut: [2.8, 3.5], ringsOpen: [0.2, 2.8], echoes: 32.5, echoFull: 35.0 },

  figures: {
    grotto: [
      { id: 'G2', pose: 'standBundle', foot: [948, 1846], h: 283, facing: -1 },
      { id: 'G3', pose: 'childCrouch', foot: [292, 1832], h: 125, facing: 1 },
      { id: 'G1', pose: 'elderSeated', foot: [150, 1840], h: 190, facing: 1 },
    ],
    oblique: [
      { id: 'O4', pose: 'elderSeated', d: 12.5, x: 150, facing: 1, rock: true },
      { id: 'O1', pose: 'standBundle', d: 13.5, x: 360, facing: -1 },
      { id: 'O2', pose: 'childCrouch', d: 14, x: 455, facing: -1 },
      { id: 'O3', pose: 'gather', d: 17.2, x: 585, facing: 1 },
      { id: 'O5', pose: 'standStaff', d: 18.0, x: 700, facing: -1 },
      // colonos: tres cuartos, mirando tierra adentro (izquierda); se tallan contorno → núcleo → trama
      { id: 'C1', pose: 'colonBundle', d: 24, x: 905, facing: -1, cut: [24.6, 25.8], order: 'outline' },
      { id: 'C2', pose: 'colonStick', d: 24, x: 985, facing: -1, cut: [25.2, 26.4], order: 'outline' },
      // O6 (futuro): contorno a buril, luego la trama en diagonal y el núcleo desde los pies; ≈70 % a los 40 s
      { id: 'O6', pose: 'childCrouch', d: 14.8, x: 262, facing: 1, cut: [37.8, 40.0], cutEnd: 0.7, order: 'future', clearShadows: true },
    ],
    boat: { d: 27, x: 1046, cut: [24.6, 25.4] },
    ship: { x: 930, at: 22.23, dur: 0.9, hull: 56 },
  },
};
