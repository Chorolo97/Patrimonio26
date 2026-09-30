// Especificación de cada cuadro del guion gráfico v3. x,y = pie de la figura (px de pantalla); h = alto de un adulto de pie ahí.
const F = window.FIG;
const INK = '#2a2019';
// la familia: A adulta, M mayor, N niño (siempre los mismos)
const fam = (parts) => parts.map(([k, pose, x, y, h, f, o]) => F.place(k, pose, x, y, h, f, o || {})).join('');
window.FRAMES = {
  // I · EL MAR (0–40,42): la copia aérea se revela desde abajo; arriba sigue el papel
  mar: {
    bg: 'bg_mar.png',
    overlay: () => fam([
      ['elder', 'look', 792, 902, 64, 1, { staff: 1 }],
      ['adult', 'shade', 818, 900, 66, 1],
      ['child', 'look', 842, 904, 66, 1],
    ]),
    text: { top: 262, word: 'Punta Ballena', gloss: 'Santiago Chalar · Santos Inzaurralde · 1978' },
  },
  // II · LA SERRANÍA (40,42–62,52): mapa de línea, camino desde el Yaguarón hasta Punta Ballena
  mapa: {
    bg: 'bg_paper.png', grain: 0.35,
    overlay: () => {
      const m = MAP.svg({
        progress: 0.66,
        labels: [
          [MAP.places.centurion, 'Yaguarón', 14, -12, 'start'],
          [[-53.72, -32.79], 'Tacuarí', 0, 30, 'middle'],
          [MAP.places.aigua, 'Aiguá', 14, 8, 'start'],
          [MAP.places.ballena, 'Punta Ballena', -14, 40, 'middle'],
        ],
      });
      const D = m.done, at = (k) => D[Math.max(0, D.length - 1 - k)];
      // la familia camina sobre la línea (diminuta, en la tinta del mapa): niño delante, adulta, mayor detrás
      return m.svg + fam([
        ['child', 'walk', at(0)[0] + 16, at(0)[1] + 8, 40, -1, { noShadow: 1 }],
        ['adult', 'walk', at(0)[0] + 30, at(0)[1] + 8, 40, -1, { noShadow: 1 }],
        ['elder', 'walk', at(0)[0] + 46, at(0)[1] + 8, 38, -1, { noShadow: 1, staff: 1 }],
      ]);
    },
    text: { top: 262, word: 'Serranía', gloss: 'de las sierras del este hasta el mar' },
  },
  // III · LOS RÍOS (62,52–84,18): orilla del Tacuarí
  rios: {
    bg: 'bg_tacuari.png',
    overlay: () => fam([
      ['elder', 'sitground', 420, 1500, 240, 1],
      ['child', 'look', 572, 1470, 245, 1],
      ['adult', 'kneel', 690, 1448, 245, 1],
    ]),
    veil: { y: 400, a: .55 },
    text: { top: 300, word: 'Tacuarí', gloss: 'río de la cuenca de la Laguna Merín' },
  },
  // IV · ESPUMA (84,18–90,28): la sierra se vuelve espuma
  espuma: {
    bg: 'bg_espuma.png',
    overlay: () => fam([
      ['elder', 'look', 318, 606, 92, 1, { staff: 1 }],
      ['adult', 'look', 350, 602, 96, 1],
      ['child', 'look', 380, 606, 96, 1],
    ]),
    text: { top: 262, word: 'Espuma', gloss: 'la sierra que se vuelve espuma' },
  },
  // V · EL BARCO (90,28–110,48): llegan otros por el mar; la familia sigue en su tierra
  barco: {
    bg: 'bg_barco.png',
    overlay: () => F.ship(770, 816, 104) + F.boat(372, 928, 32) + F.colonist(402, 931, 36, -1) + F.colonist(417, 933, 37, -1) + fam([
      ['elder', 'stand', 120, 1340, 285, 1, { staff: 1 }],
      ['child', 'hand', 196, 1348, 285, 1],
      ['adult', 'look', 300, 1332, 285, 1],
    ]),
    text: { top: 246, word: 'Horizonte', gloss: 'llegan otros por el mar; ellos siguen aquí' },
  },
  // VI · CARAPÉ / AIGUÁ (110,48–132)
  carape: {
    bg: 'bg_carape.png',
    overlay: () => fam([
      ['child', 'look', 430, 1262, 215, -1],
      ['adult', 'point', 520, 1250, 215, -1],
      ['elder', 'look', 600, 1262, 215, -1, { staff: 1 }],
    ]),
    veil: { y: 400, a: .6 },
    text: { top: 300, word: 'Carapé', gloss: 'sierra de Maldonado y Lavalleja' },
  },
  // VII · ARENA (132–146): sierra deshecha en arena
  arena: {
    bg: 'bg_arena.png',
    overlay: () => {
      let s = '', seed = 11; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      // granos de granito que el viento suelta desde la derecha y arrastra hacia la familia
      for (let i = 0; i < 520; i++) { const u = r(), x = 1080 - u * 760 + (r() - .5) * 60, y = 1330 - u * 190 + (r() - .5) * (60 + 200 * (1 - u)), rr = (0.6 + r() * 2.2) * (0.5 + 0.8 * (1 - u)); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr.toFixed(2)}" fill="${INK}" opacity="${((0.3 + r() * 0.5) * (0.35 + 0.65 * (1 - u))).toFixed(2)}"/>`; }
      return s + fam([
        ['elder', 'walk', 360, 1180, 170, 1, { staff: 1 }],
        ['adult', 'walk', 440, 1172, 170, 1],
        ['child', 'walk', 505, 1170, 170, 1],
      ]);
    },
    text: { top: 300, word: 'Arena', gloss: 'sierra deshecha en arena' },
  },
};
// VII-b · HOY (≈146–152,18): la copia se revela en color; ilustración original (no foto)
FRAMES.hoy = {
  bg: 'bg_hoy.png', grain: 0.12,
  overlay: () => fam([
    ['elder', 'look', 596, 1584, 72, -1, { staff: 1, shadowColor: 'rgba(20,30,20,.35)' }],
    ['adult', 'look', 560, 1600, 74, -1, { shadowColor: 'rgba(20,30,20,.35)' }],
    ['child', 'look', 518, 1614, 76, -1, { shadowColor: 'rgba(20,30,20,.35)' }],
  ]),
  text: { top: 262, word: 'Hoy', gloss: 'la misma costa; las raíces siguen aquí', color: '#23303a', gcolor: '#3b4a52' },
};
// CIERRE (152,18–162,8): la parte alta vuelve a papel; datos y logo original en color
FRAMES.cierre = {
  bg: 'bg_hoy.png', grain: 0.12,
  overlay: () => `<defs><linearGradient id="pp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F1EBDD" stop-opacity="1"/><stop offset=".40" stop-color="#F1EBDD" stop-opacity="1"/><stop offset=".47" stop-color="#F1EBDD" stop-opacity=".85"/><stop offset=".60" stop-color="#F1EBDD" stop-opacity="0"/></linearGradient>
    <filter id="wave" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.012" numOctaves="3" seed="9"/><feDisplacementMap in="SourceGraphic" scale="120" xChannelSelector="R" yChannelSelector="G"/></filter></defs>
    <rect x="-100" y="-100" width="1280" height="2120" fill="url(#pp)" filter="url(#wave)"/>` + FRAMES.hoy.overlay(),
  html: `<div class="tx" style="top:300px">
    <div class="w" style="font-size:72px;color:#2a2019;font-weight:500">Día del Patrimonio 2026</div>
    <div class="g" style="font-size:44px;color:#3d342b;letter-spacing:.02em;white-space:normal;line-height:1.2;margin-top:34px;font-weight:500">Raíces indígenas:<br>pasado, presente y futuro</div>
    <div class="g" style="font-size:48px;color:#3d342b;letter-spacing:.03em;margin-top:30px;font-weight:600">3 y 4 de octubre</div>
    <img src="file:///home/user/Patrimonio26/shared/assets/logo/01_logo_uvpb_color.png" style="width:560px;margin-top:64px">
  </div>`,
};
