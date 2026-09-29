/*
 * ÚNICO lugar de configuración de «Revelado · canción entera» (Punta Ballena, Santiago Chalar y Santos Inzaurralde).
 * Todos los tiempos (s), textos, recortes y paneos de las fotos y ubicaciones de las figuras están aquí.
 * Coordenadas de máscaras, cámaras y figuras: px de la foto ORIGINAL.
 */
window.REEL_CONFIG = {
  title: 'Revelado · canción entera',
  subtitle: '«Punta Ballena» completa: copias reales en la bandeja de revelado, cada tramo de la letra con su copia.',
  seed: 26051,
  width: 1080, height: 1920, fps: 30, duration: 162.8,
  safeZone: { x0: 100, x1: 900, y0: 250, y1: 1500 },
  assets: '../../shared/assets/',
  featuresUrl: '../../shared/audio/features_cancion_entera.json',
  audio: { src: '../../shared/assets/audio/punta_ballena.mp3', AUDIO_START_SECONDS: 0, fadeIn: 0, fadeOut: 0.8, volume: 1 },
  logo: { file: 'logo/02_logo_uvpb_blanco.png', width: 620 },
  closingAt: 152.0,            // el cierre aparece cuando el cielo ya está quemado
  closing: { y: 300, shadow: 'rgba(10,8,6,0.5)' },

  photos: {
    aerea: 'photos/aerea_punta.jpg', canal: 'photos/clean/canal_espuma.jpg', relieve: 'photos/clean/relieve_sin_bosque.jpg',
    abra: 'photos/clean/abra_al_mar.jpg', yerbal: 'photos/sierras_yerbal.jpg', rompiente: 'photos/clean/rocas_rompiente.jpg',
    rinconada: 'photos/clean/rinconada_limpia.jpg', gruta: 'photos/clean/gruta_limpia.jpg', estratos: 'photos/clean/estratos_gruta.jpg', playa: 'photos/clean/playa_pastos.jpg',
  },
  // w,h: px originales; up: factor de la textura (fotos de baja resolución se suben una vez con filtro de calidad y el grano disimula el resto);
  // black/white: normalización (percentiles medidos); chan: pesos de luminancia; curve: curva viva propia; patches [dx,dy,w,h,pluma,sx,sy]: retoques clonados
  photoSpec: {
    aerea: { w: 988, h: 717, up: 2, black: 0.02, white: 0.92 },
    canal: { dist: false, w: 1415, h: 1815, up: 1, black: 0.14, white: 0.85 },
    relieve: { dist: false, w: 2000, h: 932, up: 1, black: 0.05, white: 0.74, chan: [0.5, 0.42, 0.08] },
    abra: { dist: false, w: 1563, h: 1013, up: 1, black: 0.05, white: 0.82 },
    yerbal: { dist: false, w: 1010, h: 720, up: 2, black: 0.2, white: 0.9, chan: [0.5, 0.42, 0.08] },
    rompiente: { w: 1876, h: 1012, up: 1, black: 0.10, white: 0.78 },
    rinconada: { w: 3030, h: 1710, up: 1, black: 0.20, white: 0.86, patches: [[2388, 1222, 80, 108, 12, 2290, 1222], [2394, 1318, 70, 44, 12, 2474, 1326], [2522, 1240, 60, 104, 12, 2612, 1240], [2430, 1190, 40, 50, 10, 2330, 1190]] },
    gruta: { w: 3015, h: 1730, up: 1, black: 0.13, white: 0.86, dscale: 0.5, landSeed: 'sand', curve: [[0, 0.0], [0.05, 0.035], [0.30, 0.36], [0.50, 0.53], [0.75, 0.70], [0.9, 0.77], [1.0, 0.80]] },
    estratos: { dist: false, w: 1552, h: 1004, up: 1, black: 0.09, white: 0.76 },
    playa: { dist: false, w: 1786, h: 1815, up: 1, black: 0.12, white: 0.83 },
  },

  // Cámaras [t, origen x, origen y, zoom] en px de foto; escala = 1920 / alto de la foto (recorte vertical 9:16 de toda la altura); el paneo es lento (≤ 25 px/s en pantalla)
  // sel: viraje selenio/cobre por copia [t, cantidad]; fx: parámetros propios del tipo; atlasS: resolución del atlas de figuras
  prints: [
    { id: 'aerea', kind: 'aerea', photo: 'aerea', scale: 2.6778, archive: true, cam: [[0, 380, 0, 1], [19.5, 500, 0, 1]], fx: { flow: 5 }, atlasS: 4 },
    { id: 'canal', kind: 'canal', photo: 'canal', scale: 1.0579, c: [300, 1500], cam: [[19.5, 190, 0, 1], [26, 190, 0, 1], [38.5, 190, 0, 1.45]], fx: { swash: 26 } },
    { id: 'relieve', kind: 'relieve', photo: 'relieve', scale: 2.0601, cam: [[38.4, 1000, 0, 1], [51.5, 1120, 0, 1]], fx: { alba: { t0: 38.4, t1: 50.5, y0: -260, y1: 2200, gain: 0.16 } }, atlasS: 4 },
    { id: 'abra', kind: 'abra', photo: 'abra', scale: 1.8954, cam: [[50.5, 250, 0, 1], [63.5, 370, 0, 1]], atlasS: 3 },
    { id: 'yerbal', kind: 'yerbal', photo: 'yerbal', scale: 2.6667, cam: [[62.85, 260, 0, 1], [81.5, 330, 0, 1]], sel: [[73.4, 0], [75.2, 1], [79.4, 1], [80.9, 0]], atlasS: 4 },
    { id: 'rompiente', kind: 'rompiente', photo: 'rompiente', scale: 1.8972, cam: [[80.6, 0, 0, 1], [87, 90, 0, 1]], fx: { grow: { t0: 81.4, dur: 3.2 }, shade: { t0: 80.8, dur: 2.0 } }, atlasS: 3 },
    { id: 'portezuelo', kind: 'portezuelo', photo: 'rinconada', scale: 1.1228, cam: [[86.3, 1650, 0, 1], [111.8, 1690, 0, 1]] },
    { id: 'gruta', kind: 'gruta', photo: 'gruta', scale: 1.1098, c: [540, 1150], cam: [[110.8, 1164, 0, 1.0], [122.4, 1164, 0, 1.035]], fx: { pop: 0.5 } },
    { id: 'estratos', kind: 'estratos', photo: 'estratos', scale: 1.9124, cam: [[121.8, 340, 0, 1], [129, 420, 0, 1]], fx: { fog: { t0: 122.2, t1: 128.2, y0: 80, y1: 1080, density: 0.85 } }, atlasS: 3 },
    { id: 'playa', kind: 'playa', photo: 'playa', scale: 1.0579, cam: [[128.4, 380, 0, 1], [156, 520, 0, 1]], fx: { tufts: [[1100, 1590, 560, 300], [340, 1810, 420, 200]] }, atlasS: 2 },
  ],

  // Secciones: el guion de la canción. Cada sección fija su copia y su tramo de letra; el cambio de copia (relevo) entra en t0 (el frente cruza el centro del cuadro).
  // enter.type 'menisco': frente irregular de revelador (dur = tiempo de cruce, 0,9–1,6 s); 'lab': la copia se sumerge en papel mojado y la nueva sube desde el blanco (sin personas).
  // dirDeg 0: de abajo hacia arriba; 180+: de arriba hacia abajo. figFront: las figuras de la copia nueva nuclean detrás del frente.
  sections: [
    { id: 'intro', t0: 0, t1: 19.5, print: 'aerea', lyric: '(intro de guitarra)', enter: { t0: -0.9, dirDeg: -5, s0: -40, v: 660, bow: 80, noiseAmp: 60, seed: 1.7, figFront: 0, tau0: 0.32, induction: 0.03, wet: 0.4, figTau: 0.55 } },
    { id: 'e1a', t0: 19.5, t1: 26, print: 'canal', lyric: 'Dice que se echó en sus brazos / y el mar se puso a llorar', enter: { type: 'lab', dur: 1.2, tau0: 0.5, induction: 0.02 } },
    { id: 'e1b', t0: 26, t1: 33, print: 'canal', lyric: 'Sierra de Punta Ballena / piedra que se ahogó en el mar' },
    { id: 'e1c', t0: 33, t1: 38.4, print: 'canal', lyric: 'Dice que se echó en sus brazos… (repite)' },
    { id: 'rec1', t0: 38.4, t1: 50.5, print: 'relieve', lyric: 'Camino de mi esteña serranía… refugio de orientales rebeldías', enter: { dur: 1.3, dirDeg: -8, bow: 90, noiseAmp: 60, seed: 5.3, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'rec2', t0: 50.5, t1: 60.6, print: 'abra', lyric: 'Y allá del Yaguarón su lejanía… y zambulló al azul su travesía', enter: { dur: 1.3, dirDeg: -6, bow: 90, noiseAmp: 60, seed: 9.1, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'resp', t0: 60.6, t1: 62.85, print: 'abra', lyric: '(respiro de guitarra: enjuague)' },
    { id: 'e2a', t0: 62.85, t1: 73, print: 'yerbal', lyric: '[?] y piedra arisca / de las sierras del yerbal / Tacuarí de los quileros / y el Guazunambí arachán', enter: { dur: 1.3, dirDeg: 186, bow: 90, noiseAmp: 60, seed: 3.3, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e2b', t0: 73, t1: 80.6, print: 'yerbal', lyric: 'Va en las sierras de Leonardo / sangre del coronillar' },
    { id: 'e2c', t0: 80.6, t1: 86.3, print: 'rompiente', lyric: 'Sierra que se vuelve espuma / y es un jazminero el mar', enter: { dur: 1.2, dirDeg: 6, bow: 80, noiseAmp: 60, seed: 7.7, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'inter', t0: 86.3, t1: 110.8, print: 'portezuelo', lyric: '(interludio de guitarra: la visión de Alejandra)', enter: { dur: 1.4, dirDeg: 184, bow: 90, noiseAmp: 60, seed: 2.9, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e3a', t0: 110.8, t1: 121.8, print: 'gruta', lyric: '[?] de los indios / pororó que veo blanquear', enter: { dur: 1.3, dirDeg: -12, bow: 100, noiseAmp: 60, seed: 5.9, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e3b', t0: 121.8, t1: 128.4, print: 'estratos', lyric: 'Cerrazón, tus aguas altas / que el indio llamó el Aiguá', enter: { dur: 1.3, dirDeg: 184, bow: 90, noiseAmp: 60, seed: 4.1, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e4', t0: 128.4, t1: 139, print: 'playa', lyric: 'Dice que se echó en sus brazos / y el mar se puso a llorar', enter: { dur: 1.4, dirDeg: -4, bow: 80, noiseAmp: 60, seed: 8.3, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'coda', t0: 139, t1: 155.5, print: 'playa', lyric: 'Dice que se echó… / Sierra [?] arena / de tanto llorarle al mar (×3)' },
    { id: 'fin', t0: 155.5, t1: 162.8, print: 'playa', lyric: '(acorde final: cierre sostenido)' },
  ],

  // Anotaciones de archivo (texto en pantalla): palabra (EB Garamond itálica) + glosa (Source Sans 3). y: tope del bloque. h: alto del lienzo del bloque
  noteStyle: { wordSize: 62, glossSize: 42, gloss2Size: 34, gapWordGloss: 10, gapGloss2: 18, maxW: 800, ink: '#efe6d2', shadow: 'rgba(14,10,6,0.62)', shadowBlur: 16, reveal: 1.0, fadeOut: 0.6 },
  annotations: [
    { id: 'creditos', t0: 2.0, t1: 9.0, y: 300, h: 340, word: 'Punta Ballena', wordSize: 66, gloss: 'Santiago Chalar y Santos Inzaurralde · Minas y Abril, 1978' },
    { id: 'yaguaron', t0: 51.0, t1: 57.0, y: 300, h: 340, word: 'Yaguarón', gloss: 'río de la frontera con Brasil; del guaraní yaguá, perro o jaguar' },
    { id: 'yerbal', t0: 63.0, t1: 66.2, y: 300, h: 340, word: 'Sierras del Yerbal', gloss: 'serranía del este; entre las sierras de Aiguá, junto a Coronilla y León' },
    { id: 'tacuari', t0: 66.2, t1: 69.6, y: 300, h: 380, word: 'Tacuarí', gloss: 'río que alude a la tacuara, la caña nativa', gloss2: 'quilero: contrabandista de frontera' },
    { id: 'guazunambi', t0: 69.6, t1: 73.0, y: 300, h: 400, word: 'Guazunambí', gloss: 'cuchilla de Cerro Largo; se interpreta “oreja de venado”', gloss2: 'arachán: así se llama por tradición a la gente de Cerro Largo' },
    { id: 'coronilla', t0: 75.5, t1: 80.0, y: 300, h: 340, word: 'coronilla', gloss: 'árbol nativo del monte serrano, de corteza rojiza' },
    { id: 'aigua', t0: 122.0, t1: 128.0, y: 300, h: 340, word: 'Aiguá', gloss: 'nombre guaraní que se suele traducir “agua que corre”' },
  ],

  // Enjuague en la respiración de guitarra (60,6–62,85): la copia descansa bajo agua quieta; un anillo de ondas desde una gota
  rinse: { t0: 60.6, t1: 62.85, drop: 61.0, center: [620, 760], amp: 3, grow: 1.8, wobble: 1.5, deepen: 0.04 },
  development: { tau0: 0.55, induction: 0.06, gateFloor: 0.12, gateFloorDev: 0.5, gates: [[60.6, 62.85]], ramp: 0.3 },
  slow: { t0: 156, ramp: 1.0, to: 0.4 }, // desde 156 s el movimiento baja al 40 %
  surgeTau: 0.35,
  onsetThreshold: 0.85, onsetGap: 0.4,
  maskBlur: 3,

  tone: {
    Lp: 0.955,
    livingCurve: [[0, 0.0], [0.05, 0.03], [0.30, 0.22], [0.50, 0.55], [0.75, 0.84], [0.84, 0.93], [1.0, 0.955]],
    hiFrom: '#F2EADB', hiTo: '#F4E6CC', warmBy: 30,
    // viraje pardo-rojizo sutil (selenio o cobre): sombras, medios y luces; nunca rojo literal
    selenium: { S: [0.135, 0.098, 0.082], M: [0.56, 0.41, 0.31], H: [0.97, 0.88, 0.76], maxChroma: 0.13 },
  },
  // quemado del cielo (150,5–152,0): tarjeta a mano con borde ancho que ondula y deriva; llega a pleno antes de que aparezca el texto
  burn: { t0: 150.5, t1: 152.0, yFull: 870, yZero: 1010, featherStart: 560, density: 1.2, edgeAmp: 25, drift: 0.012 },
  grotto: { swashRate: 1.9 },
  // plata de las figuras: luminancia según la profundidad en pantalla (perspectiva aérea) y desenfoque de la foto a esa distancia
  figureLook: { yNear: 1800, yFar: 900, Lnear: 0.095, Lfar: 0.125, softNear: 0.8, softFar: 1.5, sailL: 0.2, sailSoft: 1.6 },

  masks: {
    rinconada: {
      sky: [[[980, 0], [1200, 40], [1400, 100], [1600, 180], [1800, 270], [1920, 340], [2000, 405], [2200, 462], [2300, 458], [2400, 478], [2500, 505], [2600, 530], [2700, 555], [2800, 575], [2900, 592], [3030, 603], [3030, 0]]],
      water: [
        [[1740, 712], [1800, 700], [1900, 684], [2000, 668], [2080, 650], [2118, 628], [2130, 612], [2500, 612], [3030, 616], [3030, 990], [2930, 962], [2922, 900], [2880, 830], [2800, 765], [2700, 748], [2600, 718], [2530, 705], [2440, 690], [2340, 668], [2290, 672], [2262, 712], [2220, 734], [2140, 750], [2090, 762], [2000, 760], [1900, 752], [1800, 738]],
        [[2168, 1352], [2240, 1322], [2330, 1328], [2420, 1340], [2474, 1372], [2470, 1420], [2420, 1452], [2320, 1462], [2226, 1452], [2170, 1416]],
      ],
      auto: [{ into: 'water', zone: [[2124, 586], [2800, 586], [3030, 606], [3030, 1000], [2200, 1000], [2124, 780]], seeds: [[2500, 650], [2800, 680], [2950, 900]], lo: 0.665 }],
      rock: [
        [[0, 0], [980, 0], [1200, 40], [1400, 100], [1600, 180], [1800, 270], [1920, 340], [2000, 405], [2060, 420], [2124, 600], [2118, 628], [2080, 650], [1900, 684], [1700, 700], [1500, 706], [1100, 706], [700, 694], [300, 666], [0, 646]],
        [[2000, 405], [2200, 462], [2300, 458], [2400, 478], [2500, 505], [2600, 530], [2700, 555], [2800, 575], [2900, 592], [3030, 603], [3030, 616], [2500, 612], [2130, 612], [2124, 600]],
        [[2085, 1000], [2080, 820], [2090, 762], [2140, 750], [2220, 734], [2262, 712], [2290, 672], [2340, 668], [2440, 690], [2530, 705], [2600, 718], [2700, 748], [2800, 765], [2880, 830], [2922, 900], [2930, 962], [2860, 1060], [2780, 1250], [2700, 1370], [2560, 1372], [2474, 1372], [2420, 1340], [2330, 1328], [2240, 1322], [2168, 1352], [2120, 1150]],
        [[1560, 1196], [1700, 1182], [1790, 1214], [1880, 1252], [1960, 1290], [2004, 1336], [2000, 1420], [1966, 1500], [2020, 1560], [2060, 1640], [2080, 1710], [1560, 1710]],
        [[2120, 1480], [2200, 1452], [2300, 1462], [2360, 1492], [2384, 1560], [2366, 1710], [2112, 1710], [2104, 1580]],
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
      skyBlur: 45,
    },
    aerea: {}, canal: {}, relieve: {}, abra: {}, yerbal: {}, rompiente: {}, estratos: {}, playa: {},
  },

  // Personas y vela. pose: ver src/figures.js. h: altura de un adulto de pie en ese punto (px de foto); sin h se usa sizeRule (Portezuelo y gruta, como en Revelado).
  // group: 0 = sigue la τ de su copia (nuclean con el frente); 1–4 = grupo con su propia hora (groups[print][g]).
  figures: [
    { id: 'I1', print: 'portezuelo', group: 0, pose: 'standP', foot: [1760, 1180], size: 'adult', facing: -1, opts: { backHand: [-18.3, 39] } },
    { id: 'I2', print: 'portezuelo', group: 0, pose: 'childP', foot: [1812, 1172], size: 'child', facing: -1, opts: { hand: [12, 52] } },
    { id: 'I3', print: 'portezuelo', group: 0, pose: 'standB', foot: [2060, 1080], size: 'adult', facing: 1, opts: { staff: 1 } },
    { id: 'I8', print: 'portezuelo', group: 1, pose: 'standP', foot: [1985, 1302], size: 'adult', facing: -1, opts: { staffFront: 1 } },
    { id: 'I5', print: 'portezuelo', group: 1, pose: 'seatRock', foot: [1868, 1292], size: 'adult', facing: 1 },
    { id: 'I6', print: 'portezuelo', group: 2, pose: 'crouch', foot: [2150, 1385], size: 'adult', facing: 1 },
    { id: 'C1', print: 'portezuelo', group: 3, pose: 'colonistP', foot: [1800, 898], size: 'adult', facing: 1, opts: { sack: 1 } },
    { id: 'C2', print: 'portezuelo', group: 3, pose: 'colonistP', foot: [1838, 893], size: 'adult', facing: 1, opts: { stick: 1, coat: 1, brim: 13 } },
    { id: 'S1', print: 'portezuelo', group: 4, pose: 'sail', foot: [2545, 668], size: 'sail', facing: 1 },
    { id: 'G1', print: 'gruta', group: 0, pose: 'seatGround', foot: [1330, 1622], sizeY: 1650, size: 'adult', facing: 1 },
    { id: 'G3', print: 'gruta', group: 0, pose: 'childP', foot: [1478, 1614], size: 'child', facing: 1 },
    { id: 'G2', print: 'gruta', group: 0, pose: 'standQ', foot: [1760, 1655], sizeY: 1650, size: 'adult', facing: -1 },
    // relieve: pequeñas, en el sendero del lomo; caminan despacio hacia la bahía (grupo 1)
    { id: 'R1', print: 'relieve', group: 1, pose: 'standP', foot: [1236, 404], h: 46, size: 'adult', facing: -1 },
    { id: 'R2', print: 'relieve', group: 1, pose: 'standP', foot: [1219, 438], h: 44, size: 'adult', facing: -1, opts: { bundle: 1 } },
    { id: 'R3', print: 'relieve', group: 1, pose: 'childP', foot: [1203, 468], h: 46, size: 'child', facing: -1 },
    // abra: dos personas sobre la roca de la izquierda miran la lejanía
    { id: 'A1', print: 'abra', group: 0, pose: 'standB', foot: [540, 632], h: 56, size: 'adult', facing: 1 },
    { id: 'A2', print: 'abra', group: 0, pose: 'standP', foot: [598, 634], h: 52, size: 'adult', facing: 1 },
    // yerbal: un grupo pequeño recorre la loma
    { id: 'Y1', print: 'yerbal', group: 1, pose: 'standP', foot: [340, 323], h: 34, size: 'adult', facing: 1 },
    { id: 'Y2', print: 'yerbal', group: 1, pose: 'standP', foot: [361, 321], h: 33, size: 'adult', facing: 1, opts: { bundle: 1 } },
    { id: 'Y3', print: 'yerbal', group: 1, pose: 'childP', foot: [379, 319], h: 34, size: 'child', facing: 1 },
    // rompiente: alguien mira la espuma desde la arena
    { id: 'B1', print: 'rompiente', group: 0, pose: 'standP', foot: [170, 962], h: 108, size: 'adult', facing: 1 },
    // estratos: una mayor y un niño sobre la losa clara
    { id: 'E1', print: 'estratos', group: 0, pose: 'seatGround', foot: [300, 850], h: 190, size: 'adult', facing: 1 },
    { id: 'E2', print: 'estratos', group: 0, pose: 'childP', foot: [395, 862], h: 190, size: 'child', facing: -1 },
    // playa: una agachada, un adulto con atado, una mayor sentada; el niño se está revelando; dos colonos lejos
    { id: 'P1', print: 'playa', group: 0, pose: 'seatGround', foot: [780, 1300], h: 190, size: 'adult', facing: 1 },
    { id: 'P2', print: 'playa', group: 0, pose: 'standP', foot: [950, 1170], h: 160, size: 'adult', facing: -1, opts: { bundle: 1 } },
    { id: 'P3', print: 'playa', group: 0, pose: 'crouch', foot: [640, 1470], h: 240, size: 'adult', facing: 1 },
    { id: 'P4', print: 'playa', group: 1, pose: 'childP', foot: [730, 1480], h: 240, size: 'child', facing: -1 },
    { id: 'K1', print: 'playa', group: 2, pose: 'colonistP', foot: [1150, 935], h: 92, size: 'adult', facing: 1, opts: { sack: 1 } },
    { id: 'K2', print: 'playa', group: 2, pose: 'colonistP', foot: [1192, 932], h: 90, size: 'adult', facing: 1, opts: { stick: 1, coat: 1, brim: 13 } },
  ],
  // horas de los grupos (s): start = hora de inicio del revelado del grupo; tau0 = constante; vel = px de foto/s si camina, walk = ventana de marcha
  groups: {
    portezuelo: { 1: { start: 88.9, tau0: 0.8 }, 2: { start: 93.2, tau0: 0.9 }, 3: { start: 97.0, tau0: 1.0 }, 4: { start: 98.4, tau0: 1.0 } },
    relieve: { 1: { start: 41.0, tau0: 0.7, vel: [-2.9, 5.8], walk: [41.8, 50.6], bob: 0.5, step: 0.9 } },
    yerbal: { 1: { start: 62.9, tau0: 0.7, vel: [6, -0.5], walk: [64, 80.4], bob: 0.35, step: 0.9 } },
    playa: { 1: { startAuto: { end: 162.8, dev: 0.7 }, tau0: 1.6, induction: 0, coreW: 0.25 }, 2: { start: 145.0, tau0: 1.4 } },
  },
  sizeRule: { rinconada: { k: 0.34, y0: 600 }, gruta: { headY: 1460 }, child: 0.68, sailUnit: 1.05 },
  light: {
    rinconada: { kx: 0.56, ky: 0.27, rim: [1.5, 1.5] },
    gruta: { kx: 0.10, ky: 0.20, rim: [0.4, 1.8] },
    relieve: { kx: 0.50, ky: 0.15, rim: [1.2, 1.2] },
    abra: { kx: 0.50, ky: 0.20, rim: [1.5, 1.0] },
    yerbal: { kx: 0.40, ky: 0.20, rim: [1.2, 1.2] },
    rompiente: { kx: 0.70, ky: 0.12, rim: [1.5, 1.0] },
    estratos: { kx: 0.30, ky: 0.15, rim: [1.0, 1.5] },
    playa: { kx: 0.50, ky: 0.12, rim: [1.5, 1.0] },
  },

  // plata que se suelta (partículas): granito → espuma (rompiente) y matas → arena (playa)
  shed: [],
};
