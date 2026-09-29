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
  closingAt: 150.5,            // el cierre aparece cuando el cielo ya está quemado (SPEC §3: sostenido desde ≈150,5 s)
  closing: { y: 300, shadow: 'rgba(10,8,6,0.5)' },

  photos: {
    aerea: 'photos/aerea_punta.jpg', canal: 'photos/clean/canal_espuma.jpg', relieve: 'photos/clean/relieve_sin_bosque.jpg',
    abra: 'photos/clean/abra_al_mar.jpg', yerbal: 'photos/sierras_yerbal.jpg', rompiente: 'photos/clean/rocas_rompiente.jpg',
    rinconada: 'photos/clean/rinconada_limpia.jpg', gruta: 'photos/clean/gruta_limpia.jpg', estratos: 'photos/clean/estratos_gruta.jpg', playa: 'photos/clean/playa_pastos.jpg',
    // placas propias (SPEC §9): paisajes procedurales generados una vez (plates/make_plates.sh), dentro de esta carpeta
    quebrada: 'plates/quebrada.jpg', tacuari: 'plates/tacuari.jpg', cerrito: 'plates/cerrito.jpg', carape: 'plates/carape.jpg',
  },
  // w,h: px originales; up: factor de la textura (fotos de baja resolución se suben una vez con filtro de calidad y el grano disimula el resto);
  // black/white: normalización (percentiles medidos); chan: pesos de luminancia; curve: curva viva propia; patches [dx,dy,w,h,pluma,sx,sy]: retoques clonados
  photoSpec: {
    aerea: { w: 988, h: 717, up: 2, preblur: 0.5, black: 0.0, white: 0.94, curve: [[0, 0.02], [0.06, 0.10], [0.2, 0.26], [0.4, 0.48], [0.6, 0.66], [0.8, 0.83], [0.92, 0.91], [1.0, 0.95]] },
    canal: { dist: false, w: 1415, h: 1815, up: 1, black: 0.14, white: 0.85 },
    relieve: { dist: false, w: 2000, h: 932, up: 1, preblur: 1.4, black: 0.05, white: 0.68, chan: [0.5, 0.42, 0.08], curve: [[0, 0.02], [0.08, 0.10], [0.3, 0.30], [0.5, 0.52], [0.75, 0.78], [0.9, 0.88], [1.0, 0.93]],
      erase: [{ pts: [[1722, 0], [1719, 5], [1712, 10], [1699, 18], [1684, 28], [1672, 42], [1664, 59], [1656, 78], [1646, 94], [1634, 110], [1621, 125], [1607, 139], [1593, 153], [1579, 165], [1566, 178], [1552, 191], [1538, 203], [1522, 213], [1504, 223], [1486, 229], [1467, 231], [1448, 229], [1429, 229], [1411, 231], [1393, 235], [1375, 238], [1358, 236], [1342, 236], [1327, 242], [1317, 253], [1312, 269], [1308, 288], [1300, 306], [1287, 321], [1275, 336], [1264, 351], [1256, 366], [1251, 382], [1249, 398], [1249, 414], [1249, 432], [1244, 450], [1233, 466], [1220, 481], [1208, 496], [1196, 510], [1184, 523], [1171, 536], [1157, 548], [1144, 561], [1132, 574], [1119, 588], [1107, 602], [1095, 615], [1083, 629], [1072, 644], [1060, 659], [1050, 675], [1041, 691], [1032, 704], [1023, 717], [1013, 732], [1003, 748], [994, 766], [986, 782], [979, 799], [973, 816], [966, 833], [960, 851], [955, 869], [949, 888], [942, 906], [938, 919], [936, 931]], hw: 7, fe: 9 }] },
    abra: { dist: false, w: 1563, h: 1013, up: 1, black: 0.05, white: 0.82 },
    yerbal: { dist: false, w: 1010, h: 720, up: 2, black: 0.2, white: 0.9, chan: [0.5, 0.42, 0.08] },
    rompiente: { w: 1876, h: 1012, up: 1, black: 0.10, white: 0.78 },
    rinconada: { w: 3030, h: 1710, up: 1, black: 0.20, white: 0.86, patches: [[2388, 1222, 80, 108, 12, 2290, 1222], [2394, 1318, 70, 44, 12, 2474, 1326], [2522, 1240, 60, 104, 12, 2612, 1240], [2430, 1190, 40, 50, 10, 2330, 1190]] },
    gruta: { w: 3015, h: 1730, up: 1, black: 0.13, white: 0.86, dscale: 0.5, landSeed: 'sand', soften: [[1640, 800, 1800, 960, 4, 50]], curve: [[0, 0.0], [0.05, 0.035], [0.30, 0.36], [0.50, 0.53], [0.75, 0.70], [0.9, 0.77], [1.0, 0.80]] },
    estratos: { dist: false, w: 1552, h: 1004, up: 1, black: 0.09, white: 0.76 },
    playa: { dist: false, w: 1786, h: 1815, up: 1, black: 0.12, white: 0.83 },
    quebrada: { dist: false, w: 1500, h: 1920, up: 1, black: 0.09, white: 0.93, maskFile: 'plates/quebrada_mask.png' },
    tacuari: { dist: false, w: 1700, h: 1920, up: 1, black: 0.02, white: 0.94, maskFile: 'plates/tacuari_mask.png' },
    cerrito: { dist: false, w: 1700, h: 1920, up: 1, black: 0.16, white: 0.98, maskFile: 'plates/cerrito_mask.png' },
    carape: { dist: false, w: 1700, h: 1920, up: 1, black: 0.17, white: 0.98, maskFile: 'plates/carape_mask.png' },
  },

  // Cámaras [t, origen x, origen y, zoom] en px de foto; escala = 1920 / alto de la foto (recorte vertical 9:16 de toda la altura); el paneo es lento (≤ 25 px/s en pantalla)
  // sel: viraje selenio/cobre por copia [t, cantidad]; fx: parámetros propios del tipo; atlasS: resolución del atlas de figuras
  prints: [
    { id: 'aerea', kind: 'aerea', photo: 'aerea', scale: 2.6778, archive: true, cam: [[0, 380, 0, 1], [19.06, 500, 0, 1]], fx: { flow: 5 }, atlasS: 4 },
    { id: 'canal', kind: 'canal', photo: 'canal', scale: 1.0579, c: [300, 1500], cam: [[19.06, 190, 0, 1], [26.14, 190, 0, 1], [40.4, 190, 0, 1.45]], fx: { swash: 26 } },
    { id: 'relieve', kind: 'relieve', photo: 'relieve', scale: 2.0601, cam: [[40.0, 800, 0, 1], [50.6, 890, 0, 1]], fx: { alba: { t0: 40.0, t1: 50.4, y0: -260, y1: 2200, gain: 0.16 } }, atlasS: 4 },
    { id: 'abra', kind: 'abra', photo: 'abra', scale: 1.8954, cam: [[50.42, 250, 0, 1], [62.5, 370, 0, 1]], atlasS: 3 },
    // placas propias (SPEC §9): escala 1 (1920 px de alto); el paneo recorre la placa
    { id: 'quebrada', kind: 'quebrada', photo: 'quebrada', scale: 1.0, cam: [[62.0, 380, 0, 1], [70.5, 440, 0, 1]], atlasS: 3 },
    { id: 'tacuari', kind: 'tacuari', photo: 'tacuari', scale: 1.0, cam: [[69.4, 60, 0, 1], [73.4, 110, 0, 1]], atlasS: 3 },
    { id: 'cerrito', kind: 'cerrito', photo: 'cerrito', scale: 1.0, cam: [[72.3, 330, 0, 1], [76.4, 380, 0, 1]], atlasS: 3 },
    { id: 'yerbal', kind: 'yerbal', photo: 'yerbal', scale: 2.6667, cam: [[75.14, 255, 0, 1], [84.1, 330, 0, 1]], sel: [[75.6, 0], [77.0, 1], [81.5, 1], [83.4, 0]], atlasS: 4 },
    { id: 'rompiente', kind: 'rompiente', photo: 'rompiente', scale: 1.8972, cam: [[83.1, 0, 0, 1], [91, 60, 0, 1]], fx: { grow: { t0: 84.2, dur: 4.0 }, shade: { t0: 83.7, dur: 2.0 } }, atlasS: 3 },
    { id: 'portezuelo', kind: 'portezuelo', photo: 'rinconada', scale: 1.1228, cam: [[89.78, 1650, 0, 1], [111.4, 1690, 0, 1]] },
    { id: 'carape', kind: 'carape', photo: 'carape', scale: 1.0, cam: [[109.6, 330, 0, 1], [118.0, 400, 0, 1]], fx: { pop: { amp: 0.55, t0: 113.6, t1: 117.6 } }, atlasS: 3 },
    { id: 'estratos', kind: 'estratos', photo: 'estratos', scale: 1.9124, cam: [[117.0, 150, 0, 1], [121.2, 200, 0, 1]], fx: { fog: { t0: 117.5, t1: 120.4, y0: 80, y1: 1080, density: 0.85 } }, atlasS: 3 },
    { id: 'gruta', kind: 'gruta', photo: 'gruta', scale: 1.1098, c: [540, 1150], cam: [[120.1, 1164, 0, 1.0], [125.0, 1164, 0, 1.035]], fx: { pop: 0.5 } },
    { id: 'playa', kind: 'playa', photo: 'playa', scale: 1.0579, cam: [[124.0, 380, 0, 1], [156, 520, 0, 1]], fx: { tufts: [[1130, 1585, 620, 330], [400, 1800, 400, 190]], erode: { t0: 146.0, t1: 152.0, max: 0.9 } }, atlasS: 2 },
  ],

  // Secciones: el guion de la canción. Cada sección fija su copia y su tramo de letra; el cambio de copia (relevo) entra en t0 (el frente cruza el centro del cuadro).
  // enter.type 'menisco': frente irregular de revelador (dur = tiempo de cruce, 0,9–1,6 s); 'lab': la copia se sumerge en papel mojado y la nueva sube desde el blanco (sin personas).
  // dirDeg 0: de abajo hacia arriba; 180+: de arriba hacia abajo. figFront: las figuras de la copia nueva nuclean detrás del frente.
  sections: [
    { id: 'intro', t0: 0, t1: 19.06, print: 'aerea', lyric: '(intro de guitarra)', enter: { t0: -0.9, dirDeg: -5, s0: -40, v: 660, bow: 80, noiseAmp: 60, seed: 1.7, figFront: 0, tau0: 0.32, induction: 0.03, wet: 0.4, figTau: 0.55 } },
    { id: 'e1a', t0: 19.06, t1: 26.14, print: 'canal', lyric: 'Dice que se echó…', enter: { type: 'lab', dur: 1.2, tau0: 0.5, induction: 0.02 } },
    { id: 'e1b', t0: 26.14, t1: 33.42, print: 'canal', lyric: 'Sierra de Punta Ballena…' },
    { id: 'e1c', t0: 33.42, t1: 40.0, print: 'canal', lyric: 'Dice que se echó… (repite)' },
    { id: 'rec1', t0: 40.0, t1: 50.42, print: 'relieve', lyric: 'Camino de mi esteña…', enter: { dur: 0.9, dirDeg: -8, bow: 90, noiseAmp: 60, seed: 5.3, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'rec2', t0: 50.42, t1: 60.86, print: 'abra', lyric: 'Y allá del Yaguarón…', enter: { dur: 1.3, dirDeg: -6, bow: 90, noiseAmp: 60, seed: 9.1, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'resp', t0: 60.86, t1: 62.52, print: 'abra', lyric: '(respiro de guitarra: enjuague)' },
    { id: 'e2a', t0: 62.52, t1: 69.9, print: 'quebrada', lyric: '[?] y piedra arisca…', enter: { dur: 1.0, dirDeg: 4, bow: 90, noiseAmp: 60, seed: 3.3, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e2b', t0: 69.9, t1: 72.8, print: 'tacuari', lyric: 'Tacuarí de los quileros…', enter: { dur: 0.9, dirDeg: 8, bow: 80, noiseAmp: 60, seed: 6.1, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e2c', t0: 72.8, t1: 75.64, print: 'cerrito', lyric: '…y el Guazunambí…', enter: { dur: 0.9, dirDeg: -170, bow: 80, noiseAmp: 60, seed: 2.2, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e2d', t0: 75.64, t1: 83.6, print: 'yerbal', lyric: 'Va en las sierras…', enter: { dur: 1.0, dirDeg: 12, bow: 90, noiseAmp: 60, seed: 4.4, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e2e', t0: 83.6, t1: 90.28, print: 'rompiente', lyric: 'Sierra que se vuelve…', enter: { dur: 1.1, dirDeg: 6, bow: 80, noiseAmp: 60, seed: 7.7, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'inter', t0: 90.28, t1: 110.2, print: 'portezuelo', lyric: '(interludio de guitarra)', enter: { dur: 1.2, dirDeg: 184, bow: 90, noiseAmp: 60, seed: 2.9, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e3a', t0: 110.2, t1: 117.5, print: 'carape', lyric: 'Carapé…', enter: { dur: 1.2, dirDeg: -12, bow: 100, noiseAmp: 60, seed: 5.9, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e3b', t0: 117.5, t1: 120.6, print: 'estratos', lyric: 'Cerrazón…', enter: { dur: 1.1, dirDeg: -4, bow: 90, noiseAmp: 60, seed: 4.1, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e3c', t0: 120.6, t1: 124.5, print: 'gruta', lyric: '…que el indio llamó…', enter: { dur: 1.0, dirDeg: -4, bow: 90, noiseAmp: 60, seed: 3.7, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'e4', t0: 124.5, t1: 138.84, print: 'playa', lyric: 'Dice que se echó…', enter: { dur: 1.4, dirDeg: 184, bow: 80, noiseAmp: 60, seed: 8.3, figFront: 1, tau0: 0.45, induction: 0.03 } },
    { id: 'coda', t0: 138.84, t1: 155.5, print: 'playa', lyric: 'Sierra deshecha… (coda)' },
    { id: 'fin', t0: 155.5, t1: 162.8, print: 'playa', lyric: '(acorde final: cierre sostenido)' },
  ],

  // Anotaciones de archivo (texto en pantalla): palabra (EB Garamond itálica) + glosa (Source Sans 3). y: tope del bloque. h: alto del lienzo del bloque
  noteStyle: { wordSize: 62, glossSize: 42, gloss2Size: 38, gapWordGloss: 10, gapGloss2: 18, maxW: 800, ink: '#efe6d2', shadow: 'rgba(12,8,4,0.7)', shadowBlur: 22, reveal: 1.0, fadeOut: 0.6, burn: 0.24, burnFeather: 170 },
  // \n = salto de línea manual; burn: quemado local propio de la anotación (sobre roca oscura hace falta más)
  annotations: [
    { id: 'creditos', t0: 2.0, t1: 9.0, y: 300, h: 340, word: 'Punta Ballena', wordSize: 64, gloss: 'Santiago Chalar y Santos Inzaurralde', gloss2: 'Minas y Abril, 1978' },
    { id: 'yaguaron', t0: 50.6, t1: 55.2, y: 300, h: 400, word: 'Yaguarón', gloss: 'río de la frontera con Brasil;\ndel guaraní yaguá, perro o jaguar' },
    { id: 'yerbal', t0: 63.0, t1: 68.3, y: 300, h: 400, word: 'Sierras del Yerbal', gloss: 'serranía del este; entre las sierras\nde Aiguá, junto a Coronilla y León' },
    { id: 'tacuari', t0: 69.5, t1: 72.8, y: 300, h: 380, word: 'Tacuarí', gloss: 'río que alude a la tacuara, la caña nativa', gloss2: 'quilero: contrabandista de frontera' },
    { id: 'guazunambi', t0: 72.8, t1: 76.1, y: 300, h: 420, word: 'Guazunambí', gloss: 'cuchilla de Cerro Largo;\nse interpreta “oreja de venado”', gloss2: 'arachán: así se llama por tradición\na la gente de Cerro Largo' },
    { id: 'coronilla', t0: 79.6, t1: 83.6, y: 300, h: 380, word: 'coronilla', gloss: 'árbol nativo del monte serrano,\nde corteza rojiza' },
    { id: 'carape', t0: 111.5, t1: 117.0, y: 300, h: 380, word: 'Carapé', gloss: 'sierra de Maldonado y Lavalleja;\nse suele traducir “bajo”', burn: 0.3 },
    { id: 'aigua', t0: 120.8, t1: 126.0, y: 300, h: 380, word: 'Aiguá', gloss: 'nombre guaraní que se suele traducir\n“agua que corre”', burn: 0.32 },
  ],

  // Enjuague en la respiración de guitarra (60,86–62,0; el relevo a la quebrada empieza en 62,02): la copia descansa bajo agua quieta; un anillo de ondas desde una gota
  rinse: { prints: ['abra'], t0: 60.86, t1: 62.0, drop: 61.2, center: [620, 760], amp: 3, grow: 1.8, wobble: 1.5, deepen: 0.04 },
  development: { tau0: 0.55, induction: 0.06, gateFloor: 0.12, gateFloorDev: 0.5, gates: [[60.86, 62.0]], ramp: 0.3 },
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
  // quemado del cielo (148,0–150,5; SPEC §3): tarjeta a mano con borde ancho que ondula y deriva; llega a pleno antes de que aparezca el texto
  burn: { t0: 148.0, t1: 150.5, yFull: 870, yZero: 1010, featherStart: 560, density: 1.2, edgeAmp: 25, drift: 0.012 },
  grotto: { swashRate: 1.9 },
  // plata de las figuras: luminancia según la profundidad en pantalla (perspectiva aérea) y desenfoque de la foto a esa distancia
  figureLook: { yNear: 1800, yFar: 900, Lnear: 0.095, Lfar: 0.125, softNear: 0.8, softFar: 1.0, sailL: 0.2, sailSoft: 1.6 },

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
    aerea: {
      sky: [[[0, 0], [988, 0], [988, 42], [700, 44], [450, 50], [220, 54], [150, 42], [60, 38], [0, 46]]],
      auto: [{ into: 'water', zone: [[0, 190], [300, 205], [600, 205], [700, 195], [800, 180], [900, 160], [988, 140], [988, 717], [0, 717]], seeds: [[100, 400], [850, 300], [600, 650], [40, 300]], lo: 0.2 }],
      rockRest: true,
    },
    canal: {
      auto: [
        { into: 'sky', zone: [[0, 0], [1415, 0], [1415, 458], [0, 458]], seeds: [[700, 100], [1200, 200]], lo: 0.5 },
        { into: 'water', zone: [[500, 440], [560, 500], [640, 600], [690, 700], [700, 900], [700, 1000], [650, 1080], [560, 1130], [500, 1230], [430, 1350], [420, 1480], [330, 1490], [270, 1560], [270, 1600], [340, 1610], [450, 1650], [620, 1780], [640, 1815], [1415, 1815], [1415, 440]], seeds: [[900, 520], [1000, 900], [800, 1300], [900, 1600]], lo: 0.3 },
      ],
      rockRest: true,
    },
    relieve: { water: [[[0, 0], [560, 0], [420, 60], [330, 120], [290, 170], [290, 230], [330, 300], [380, 340], [380, 420], [330, 480], [300, 560], [290, 600], [330, 640], [280, 700], [290, 800], [280, 932], [0, 932]]], rockRest: true },
    abra: {
      auto: [
        { into: 'sky', zone: [[200, 0], [205, 150], [215, 300], [250, 405], [300, 415], [330, 470], [335, 548], [1345, 548], [1345, 0]], seeds: [[700, 150], [1000, 300]], lo: 0.35 },
        { into: 'water', zone: [[335, 548], [1350, 548], [1350, 1013], [325, 1013], [335, 900], [345, 800], [330, 700]], seeds: [[700, 580], [450, 900], [1000, 700], [1200, 850]], lo: 0.3 },
      ],
      rockRest: true,
    },
    yerbal: { auto: [{ into: 'sky', zone: [[0, 0], [1010, 0], [1010, 200], [0, 200]], seeds: [[500, 40], [100, 40], [900, 40]], lo: 0.55 }], rockRest: true },
    rompiente: {
      auto: [
        { into: 'sky', zone: [[0, 0], [1876, 0], [1876, 428], [1300, 425], [900, 428], [0, 425]], seeds: [[500, 100], [1500, 100]], lo: 0.45 },
        // el mar de la izquierda y el de atrás: el borde con la roca sale de la foto (el polígono sólo acota la zona)
        { into: 'water', zone: [[0, 428], [560, 428], [612, 455], [655, 480], [625, 510], [606, 540], [584, 572], [560, 604], [530, 640], [516, 656], [410, 648], [396, 690], [380, 730], [356, 764], [342, 800], [312, 846], [296, 885], [312, 906], [420, 914], [600, 917], [652, 920], [652, 937], [420, 942], [300, 962], [0, 977]], seeds: [[100, 700], [200, 850], [300, 500], [100, 450]], lo: 0.27 },
        { into: 'water', zone: [[560, 428], [1400, 428], [1400, 470], [1000, 490], [880, 500], [700, 472], [640, 472]], seeds: [[800, 450], [1200, 450]], lo: 0.27 },
      ],
      rock: [[[0, 505], [60, 495], [120, 500], [160, 510], [210, 545], [250, 570], [240, 600], [200, 610], [120, 595], [60, 610], [0, 600]]],
      sand: [[[0, 975], [300, 960], [420, 940], [650, 935], [690, 915], [900, 925], [1150, 930], [1300, 935], [1400, 890], [1460, 880], [1500, 900], [1600, 800], [1700, 790], [1876, 760], [1876, 1012], [0, 1012]]],
      rockWins: true, rockRest: true,
    },
    estratos: { water: [[[655, 700], [700, 690], [760, 700], [810, 740], [850, 790], [900, 830], [1000, 860], [1000, 900], [820, 890], [700, 850], [650, 800]]], rockRest: true },
    playa: { sky: [[[0, 0], [1786, 0], [1786, 806], [0, 806]]], water: [[[0, 806], [1786, 806], [1786, 880], [1000, 884], [0, 880]]] },
    quebrada: {}, tacuari: {}, cerrito: {}, carape: {},   // las máscaras de las placas propias vienen de plates/*_mask.png
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
    // relieve: en el sendero del lomo, sobre la ladera clara; caminan despacio hacia la bahía (grupo 1)
    { id: 'R1', print: 'relieve', group: 1, pose: 'standP', foot: [1030, 430], h: 62, size: 'adult', facing: -1 },
    { id: 'R2', print: 'relieve', group: 1, pose: 'standP', foot: [1012, 462], h: 60, size: 'adult', facing: -1, opts: { bundle: 1 } },
    { id: 'R3', print: 'relieve', group: 1, pose: 'childP', foot: [995, 490], h: 62, size: 'child', facing: -1 },
    // abra: dos personas sobre la roca de la izquierda miran la lejanía
    { id: 'A1', print: 'abra', group: 0, pose: 'standB', foot: [540, 632], h: 56, size: 'adult', facing: 1 },
    { id: 'A2', print: 'abra', group: 0, pose: 'standP', foot: [598, 634], h: 52, size: 'adult', facing: 1 },
    // placas propias (SPEC §9): las personas nuclean con el frente (grupo 0)
    { id: 'Q1', print: 'quebrada', group: 0, pose: 'standP', foot: [1080, 1500], h: 104, size: 'adult', facing: -1 },
    { id: 'Q2', print: 'quebrada', group: 0, pose: 'standP', foot: [1114, 1520], h: 100, size: 'adult', facing: -1, opts: { bundle: 1 } },
    { id: 'Q3', print: 'quebrada', group: 0, pose: 'childP', foot: [1148, 1536], h: 100, size: 'child', facing: -1 },
    { id: 'U1', print: 'tacuari', group: 0, pose: 'standP', foot: [300, 1440], h: 150, size: 'adult', facing: 1 },
    { id: 'U2', print: 'tacuari', group: 0, pose: 'standP', foot: [372, 1462], h: 146, size: 'adult', facing: 1, opts: { bundle: 1 } },
    { id: 'U3', print: 'tacuari', group: 0, pose: 'childP', foot: [445, 1478], h: 150, size: 'child', facing: 1 },
    { id: 'U4', print: 'tacuari', group: 0, pose: 'crouch', foot: [170, 1504], h: 140, size: 'adult', facing: 1 },
    { id: 'V1', print: 'cerrito', group: 0, pose: 'standP', foot: [760, 1140], h: 115, size: 'adult', facing: 1 },
    { id: 'V2', print: 'cerrito', group: 0, pose: 'standP', foot: [800, 1152], h: 112, size: 'adult', facing: 1, opts: { bundle: 1 } },
    { id: 'V3', print: 'cerrito', group: 0, pose: 'childP', foot: [838, 1160], h: 115, size: 'child', facing: 1 },
    { id: 'W1', print: 'carape', group: 0, pose: 'standP', foot: [700, 1340], h: 182, size: 'adult', facing: 1 },
    { id: 'W2', print: 'carape', group: 0, pose: 'standP', foot: [754, 1354], h: 174, size: 'adult', facing: 1, opts: { bundle: 1 } },
    { id: 'W3', print: 'carape', group: 0, pose: 'childP', foot: [806, 1364], h: 182, size: 'child', facing: 1 },
    { id: 'W4', print: 'carape', group: 0, pose: 'seatGround', foot: [990, 1424], h: 195, size: 'adult', facing: -1 },
    // yerbal: un grupo pequeño recorre la loma clara
    { id: 'Y1', print: 'yerbal', group: 1, pose: 'standP', foot: [478, 446], h: 62, size: 'adult', facing: 1 },
    { id: 'Y2', print: 'yerbal', group: 1, pose: 'standP', foot: [504, 444], h: 60, size: 'adult', facing: 1, opts: { bundle: 1 } },
    { id: 'Y3', print: 'yerbal', group: 1, pose: 'childP', foot: [530, 443], h: 62, size: 'child', facing: 1 },
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
    portezuelo: { 1: { start: 92.4, tau0: 0.8 }, 2: { start: 96.4, tau0: 0.9 }, 3: { start: 99.0, tau0: 1.0 }, 4: { start: 100.4, tau0: 1.0 } },
    relieve: { 1: { start: 41.0, tau0: 0.7, vel: [-2.9, 5.8], walk: [41.8, 50.4], bob: 0.5, step: 0.9 } },
    yerbal: { 1: { start: 75.2, tau0: 0.6, vel: [5, -0.4], walk: [76.4, 83.4], bob: 0.35, step: 0.9 } },
    playa: { 1: { startAuto: { end: 162.8, dev: 0.85 }, tau0: 1.6, induction: 0, coreW: 0.85 }, 2: { start: 145.0, tau0: 1.4 } },
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
    quebrada: { kx: 0.40, ky: 0.12, rim: [1.2, 1.0] },
    tacuari: { kx: 0.20, ky: 0.08, rim: [1.0, 1.0] },
    cerrito: { kx: 0.50, ky: 0.10, rim: [1.5, 1.0] },
    carape: { kx: 0.55, ky: 0.12, rim: [1.5, 1.0] },
  },

  // plata que se suelta (partículas): granito → espuma (rompiente) y matas → arena (playa)
  shed: [
    // granito → espuma (83,6–90 s): granos grandes de plata que salen del borde y caen como encaje sobre el agua
    { print: 'rompiente', mode: 'edge', t0: 84.2, t1: 89.6, fadeEnd: 0.8, region: [0, 430, 700, 940], cell: 5, band: 9, bursts: [[85.0, 4], [86.7, 4]], cluster: 60, perCluster: 30, trickle: 480, size: [7, 12], speed: [8, 20], reach: [30, 70], life: [2.8, 5.0], fan: 0.9, swirl: [1, 2], turnPx: 12, pale: 0.98, darken: 1.5, Lmin: 0.30, Lmax: 0.55 },
    // sierra deshecha en arena (138,84–155 s): granos que se sueltan de la mata y quedan como arena; ráfagas en 146,5 · 148,5 · 150
    { print: 'playa', mode: 'dark', t0: 138.84, t1: 155.0, fadeEnd: 1.5, region: [300, 960, 1750, 1810], cell: 7, lumMax: 0.30, wind: [1, -0.12], turn: 40, bursts: [[146.5, 5], [148.5, 5], [150.0, 4]], cluster: 55, perCluster: 24, trickle: 1100, size: [7, 13], speed: [22, 55], reach: [110, 220], life: [3.5, 7], fan: 0.5, swirl: [1, 3], turnPx: 70, pale: 0.55, darken: 0.55, Lmin: 0.10, Lmax: 0.2 },
  ],
};
