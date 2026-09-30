/*
 * Punta Ballena v3 · un camino, una familia, siete capítulos (ver GUION.md).
 * Único lugar de tiempos y textos. Tiempos en segundos de la canción (audio desde 0).
 */
window.REEL_CONFIG = {
  title: 'Punta Ballena · v3',
  subtitle: 'Un camino, una familia, siete capítulos · onda lenta de revelado',
  seed: 26053,
  width: 1080, height: 1920, fps: 30, duration: 162.8,
  safeZone: { x0: 100, x1: 900, y0: 250, y1: 1500 },
  assets: '../../shared/assets/',
  plates: 'plates/',
  featuresUrl: '../../shared/audio/features_cancion_entera.json',
  audio: { src: '../../shared/assets/audio/punta_ballena.mp3', AUDIO_START_SECONDS: 0, fadeIn: 0, fadeOut: 0.8, volume: 1 },
  logo: { file: 'logo/01_logo_uvpb_color.png', width: 560 },

  // capítulos: [id, desde, hasta]. Se solapan sólo durante la onda de revelado que los une.
  scenes: [
    ['mar', -1, 41.1],
    ['mapa', 39.5, 62.9],
    ['tacuari', 61.2, 85.0],
    ['espuma', 83.5, 91.2],
    ['barco', 89.7, 111.3],
    ['carape', 109.8, 132.8],
    ['arena', 131.3, 148.9],
    ['hoy', 146.0, 163],
  ],
  // la única transición: una onda lenta e irregular que revela la copia siguiente de abajo hacia arriba (1,5–2,9 s)
  waves: { mapa: [39.5, 41.1, 3], tacuari: [61.2, 62.9, 5], espuma: [83.5, 85.0, 7], barco: [89.7, 91.2, 9], carape: [109.8, 111.3, 13], arena: [131.3, 132.8, 17], hoy: [146.0, 148.9, 19] },

  // una palabra por capítulo (EB Garamond 116 px) y una glosa (Source Sans 3, 36 px, +0,06 em), centradas en x = 540
  words: [
    { t0: -0.5, t1: 9.0, top: 262, word: 'Punta Ballena', gloss: 'Santiago Chalar · Santos Inzaurralde · 1978' },
    { t0: 41.4, t1: 48.0, top: 262, word: 'Serranía', gloss: 'de las sierras del este hasta el mar' },
    { t0: 69.9, t1: 75.0, top: 300, word: 'Tacuarí', gloss: 'río de la cuenca de la Laguna Merín', veil: 0.55 },
    { t0: 84.6, t1: 89.5, top: 262, word: 'Espuma', gloss: 'la sierra que se vuelve espuma', veil: 0.35 },
    { t0: 92.0, t1: 98.0, top: 246, word: 'Horizonte', gloss: 'llegan otros por el mar; ellos siguen aquí', veil: 0.3 },
    { t0: 111.0, t1: 117.0, top: 300, word: 'Carapé', gloss: 'sierra de Maldonado y Lavalleja', veil: 0.6 },
    { t0: 120.8, t1: 126.0, top: 300, word: 'Aiguá', gloss: 'arroyo y valle del norte de Maldonado', veil: 0.6 },
    { t0: 133.0, t1: 140.0, top: 300, word: 'Arena', gloss: 'sierra deshecha en arena', veil: 0.3 },
    { t0: 147.9, t1: 151.6, top: 262, word: 'Hoy', gloss: 'la misma costa; las raíces siguen aquí', color: '#23303a', gcolor: '#3b4a52' },
  ],
  closing: { t0: 152.18, wave: [152.18, 154.6], text: 153.1, y: 300, calm: 156 },
};
