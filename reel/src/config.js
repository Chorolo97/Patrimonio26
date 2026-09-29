/*
 * Punta Ballena, memorias del territorio — Día del Patrimonio 2026
 * ÚNICO LUGAR DE CONFIGURACIÓN: dimensiones, duración, tiempos de escena,
 * textos, tipografías, logo y corte musical. El resto del código lee de aquí.
 */
window.REEL_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 30,
  duration: 40, // segundos

  // Duración de cada fundido entre planos (centrado en el corte), en segundos.
  transition: 0.6,

  // Zona conservadora para textos y logo (guía de composición para la interfaz de Instagram).
  safeZone: { x0: 100, x1: 900, y0: 250, y1: 1500 },

  // Planos: id (ver src/scenes.js), inicio y fin en segundos.
  shots: [
    { id: 'amanecer', start: 0, end: 6 },
    { id: 'orilla', start: 6, end: 14 },
    { id: 'sendero', start: 14, end: 21 },
    { id: 'amplio', start: 21, end: 28 },
    { id: 'roca', start: 28, end: 31.3 },
    { id: 'oleaje', start: 31.3, end: 35 },
    { id: 'cierre', start: 35, end: 40 },
  ],

  fonts: {
    serif: {
      family: 'EB Garamond',
      faces: [
        { src: 'assets/fonts/EBGaramond-latin.woff2', style: 'normal', weight: '400 800' },
        { src: 'assets/fonts/EBGaramond-Italic-latin.woff2', style: 'italic', weight: '400 800' },
      ],
      fallback: 'Georgia, "Times New Roman", serif',
    },
    sans: {
      family: 'Source Sans 3',
      faces: [{ src: 'assets/fonts/SourceSans3-latin.woff2', style: 'normal', weight: '200 900' }],
      fallback: '"Helvetica Neue", Arial, sans-serif',
    },
  },

  // Estilos de texto reutilizables.
  textStyles: {
    // Textos sobre el paisaje: claro con sombra suave.
    scene: { color: '#fbf6ec', shadow: 'rgba(24,22,20,0.62)', shadowBlur: 22, shadowY: 2 },
    // Cierre sobre cielo claro: tinta oscura, sin sombra.
    closing: { color: '#2b2622', shadow: null },
    closingData: { color: '#3d3a2c', shadow: null },
  },

  // Textos. in/out = segundos en que empieza a aparecer / termina de desaparecer.
  // size en px; maxWidth para cortar en líneas (maxLines como límite). «\n» fuerza un salto de línea.
  texts: [
    {
      id: 'titulo', in: 0.7, out: 5.5, y: 470, style: 'scene',
      lines: [
        { text: 'Punta Ballena', font: 'serif', weight: 600, size: 78 },
        { text: 'Memorias del territorio', font: 'serif', weight: 500, italic: true, size: 48, gap: 18 },
      ],
    },
    {
      id: 'presencias', in: 7, out: 12, y: 360, style: 'scene',
      lines: [{ text: 'Presencias indígenas', font: 'serif', weight: 600, size: 70 }],
    },
    {
      id: 'coloniales', in: 14.5, out: 20.5, y: 300, style: 'scene',
      lines: [{ text: 'En tiempos de los primeros pobladores coloniales', font: 'serif', weight: 600, size: 64, maxWidth: 760, maxLines: 3 }],
    },
    {
      id: 'memoria', in: 30, out: 34.5, y: 560, style: 'scene',
      lines: [{ text: 'La memoria sigue viva.', font: 'serif', weight: 600, size: 74 }],
    },
    {
      id: 'cierre', in: 35.2, out: null /* se sostiene hasta el final */, y: 330, style: 'closing',
      lines: [
        { text: 'Día del Patrimonio 2026', font: 'serif', weight: 600, size: 74 },
        { text: 'Raíces indígenas:\npasado, presente y futuro', font: 'sans', weight: 600, size: 46, maxWidth: 760, maxLines: 2, gap: 26, style: 'closingData' },
        { text: '3 y 4 de octubre', font: 'sans', weight: 600, size: 50, gap: 30, style: 'closingData' },
        { logo: true, gap: 62 },
        { text: 'Evocación artística realizada con IA', font: 'sans', weight: 400, size: 34, gap: 60, style: 'closingData' },
      ],
    },
  ],
  textFade: 0.6, // fundido de entrada/salida de textos (s)

  // Logo: imagen independiente, sin redibujar ni recolorear. Se escala respetando proporción.
  logo: {
    color: 'assets/logo/01_logo_uvpb_color.png', // para fondo claro (se usa en el cierre)
    white: 'assets/logo/02_logo_uvpb_blanco.png', // alternativa para fondo oscuro
    use: 'color',
    width: 620, // ancho de dibujo del archivo completo (el contenido visible ocupa ~91 %)
  },

  // Corte musical. El montaje funciona sin audio: si el archivo falta, el reel queda mudo.
  // AUDIO_START_SECONDS: segundo del archivo original donde empieza el fragmento de 40 s.
  // Propuesta 47.8: pausa dentro del tramo hablado; incluye el final del recitado (~60.6 s),
  // el respiro de guitarra y la estrofa cantada siguiente completa (~62.9–86.3 s).
  // Elegido por análisis de señal, NO por escucha de la letra: verificar al oído.
  audio: {
    src: 'assets/audio/punta_ballena.mp3',
    AUDIO_START_SECONDS: 47.8,
    fadeIn: 0.4,
    fadeOut: 1.5,
    volume: 1.0,
  },

  // Iluminación general y colores base (ver también personajes en src/figures.js).
  look: {
    wind: 1, // dirección del viento en pantalla (+1 hacia la derecha)
    light: -1, // lado de la luz principal (-1 izquierda)
  },
};
