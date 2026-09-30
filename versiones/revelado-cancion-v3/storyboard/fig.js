// Siluetas de la familia (adulta, mayor, niño) y de colonos, barco y bote. Unidades: adulto de pie = 100 de alto, pie en (0,0), mira a +x.
(function () {
const P = {};
// Poses: articulaciones [x,y] (y hacia arriba). n=cerca, f=lejos
const base = {
  stand: { head: [1, 91], neck: [0.5, 83], sh: [0, 79], hip: [0, 50], kn: [1.5, 26], an: [0, 3], kf: [-1, 26], af: [-2.5, 3], hn: [3, 50], en: [2, 64], hf: [-3, 50], ef: [-2.5, 64] },
  walk: { head: [3, 90], neck: [2, 82.5], sh: [1.5, 78.5], hip: [0, 49], kn: [7, 27], an: [11, 3], kf: [-3, 26], af: [-11, 5], hn: [-6, 52], en: [-3, 65], hf: [8, 53], ef: [5, 65] },
  look: { head: [2, 91], neck: [1, 83], sh: [0, 79], hip: [0, 50], kn: [3, 26], an: [4, 3], kf: [-2, 26], af: [-5, 3], hn: [5, 51], en: [3, 64], hf: [-2, 51], ef: [-2, 64] },
  point: { head: [2.5, 91], neck: [1, 83], sh: [0.5, 79], hip: [0, 50], kn: [3, 26], an: [5, 3], kf: [-2, 26], af: [-5, 3], hn: [27, 84], en: [13, 74], hf: [-2, 51], ef: [-2, 64] },
  shade: { head: [2, 91], neck: [1, 83], sh: [0.5, 79], hip: [0, 50], kn: [3, 26], an: [4, 3], kf: [-2, 26], af: [-5, 3], hn: [8, 93], en: [11, 78], hf: [-2, 51], ef: [-2, 64] },
  crouch: { head: [19, 52], neck: [15, 47], sh: [12, 44], hip: [-3, 21], kn: [13, 29], an: [5, 2], kf: [10, 27], af: [1, 2], hn: [25, 3], en: [20, 22], hf: [22, 14], ef: [15, 26] },
  seat: { head: [5, 64], neck: [3.5, 56], sh: [2, 52], hip: [-2, 24], kn: [18, 26], an: [17, 2], kf: [16, 24], af: [13, 2], hn: [18, 30], en: [10, 38], hf: [15, 29], ef: [7, 38] },
  kneel: { head: [21, 66], neck: [16, 60], sh: [13, 56], hip: [-3, 30], kn: [13, 25], an: [9, 2], kf: [2, 4], af: [-17, 2], hn: [33, 16], en: [25, 36], hf: [17, 29], ef: [15, 42] },
  sitground: { head: [4, 50], neck: [2, 43], sh: [0, 39], hip: [-4, 8], kn: [15, 26], an: [22, 2], kf: [13, 24], af: [19, 2], hn: [16, 20], en: [9, 25], hf: [14, 21], ef: [7, 27] },
  hand: { head: [1.5, 91], neck: [0.5, 83], sh: [0, 79], hip: [0, 50], kn: [2, 26], an: [2, 3], kf: [-1, 26], af: [-3.5, 3], hn: [3, 50], en: [2, 64], hf: [-9, 47], ef: [-5, 62] },
};
P.base = base;
const cat = (a) => a.map((p) => p.join(',')).join(' ');
function limb(a, b, w, c) { return `<line x1="${a[0]}" y1="${-a[1]}" x2="${b[0]}" y2="${-b[1]}" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`; }
function poly(pts, c) { return `<path d="M${pts.map((p) => p[0] + ' ' + -p[1]).join(' L')} Z" fill="${c}" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>`; }
function smooth(pts, c) { // cerrado, curvas cuadráticas por puntos medios
  const q = pts.map((p) => [p[0], -p[1]]); const n = q.length; let d = '';
  for (let i = 0; i < n; i++) { const a = q[i], b = q[(i + 1) % n], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; d += i === 0 ? `M${m[0]} ${m[1]}` : ''; const nb = q[(i + 1) % n], nn = q[(i + 2) % n]; const m2 = [(nb[0] + nn[0]) / 2, (nb[1] + nn[1]) / 2]; d += ` Q${nb[0]} ${nb[1]} ${m2[0]} ${m2[1]}`; }
  return `<path d="${d} Z" fill="${c}"/>`;
}
// kind: adult | elder | child ; opts: {staff, bundle, hair, cloak}
P.person = function (kind, poseName, o = {}) {
  const J = JSON.parse(JSON.stringify(base[poseName]));
  const c = o.color || '#2a2019';
  // proporciones
  const sc = kind === 'child' ? 1 : 1;
  if (kind === 'elder') { // leve encorvado
    J.head[0] += 2.5; J.head[1] -= 2.5; J.neck[0] += 1.8; J.neck[1] -= 1.5; J.sh[0] += 1; J.sh[1] -= 1;
  }
  let s = '';
  const W = kind === 'child' ? { th: 8.6, sh: 6.6, ua: 5.2, fa: 4.4, hr: 7.8, tw: 13 } : { th: 7.2, sh: 5.2, ua: 4.4, fa: 3.6, hr: 5.6, tw: 12 };
  // pierna lejana, brazo lejano (mismo color: la silueta es plana)
  s += limb(J.hip, J.kf, W.th, c) + limb(J.kf, J.af, W.sh, c) + limb(J.af, [J.af[0] + 4.5, J.af[1] - 2.5], 3, c);
  s += limb(J.sh, J.ef, W.ua, c) + limb(J.ef, J.hf, W.fa, c);
  // torso de perfil: ancho delante/detrás a lo largo del eje cadera→hombro
  const tx = J.sh[0] - J.hip[0], ty = J.sh[1] - J.hip[1], L = Math.hypot(tx, ty), ux = tx / L, uy = ty / L, nx = uy, ny = -ux;
  const k = kind === 'child' ? 1.15 : 1, fem = kind === 'adult' ? 1 : 0.9;
  const prof = [[-0.08, 6.2, 7.2], [0.28, 5.0, 5.6], [0.55, 6.2 * fem + 0.4, 5.4], [0.75, 7.0 * fem, 5.6], [0.95, 5.2, 5.2], [1.08, 2.6, 2.8]];
  const at = (t, off) => [J.hip[0] + ux * L * t + nx * off, J.hip[1] + uy * L * t + ny * off];
  const tor = prof.map(([t, f]) => at(t, f * k)).concat(prof.slice().reverse().map(([t, f, bk]) => at(t, -bk * k)));
  s += smooth(tor, c);
  // prenda
  const kx0 = Math.max(J.kn[0], J.kf[0]), kx1 = Math.min(J.kn[0], J.kf[0]), ky = (J.kn[1] + J.kf[1]) / 2;
  if (!['seat', 'crouch', 'kneel', 'sitground'].includes(poseName)) {
    const len = kind === 'child' ? 0.3 : (kind === 'elder' ? 0.95 : 0.8);
    const wb = at(0.16, -6.4 * k), wf = at(0.16, 5.6 * k), hy = J.hip[1] + (ky - J.hip[1]) * len;
    const hb = [kx1 - 4.5 * k, hy], hf = [kx0 + 4.2 * k, hy];
    const Y = (p) => -p[1];
    const mf = [(wf[0] + hf[0]) / 2 + 1.6, (wf[1] + hf[1]) / 2], mb = [(wb[0] + hb[0]) / 2 - 1.6, (wb[1] + hb[1]) / 2], mh = [(hf[0] + hb[0]) / 2, hy - 1.8];
    s += `<path d="M${wb[0]} ${Y(wb)} L${wf[0]} ${Y(wf)} Q${mf[0]} ${Y(mf)} ${hf[0]} ${Y(hf)} Q${mh[0]} ${Y(mh)} ${hb[0]} ${Y(hb)} Q${mb[0]} ${Y(mb)} ${wb[0]} ${Y(wb)} Z" fill="${c}"/>`;
  } else {
    const tl = J.kn; const hx = J.hip[0], hyy = J.hip[1];
    const dx = tl[0] - hx, dy = tl[1] - hyy, l2 = Math.hypot(dx, dy), px = -dy / l2, py = dx / l2;
    s += smooth([[hx - 6, hyy - 3], [hx - 5, hyy + 7], [hx + px * 5, hyy + py * 5], [tl[0] + px * 4.5 - dx / l2 * 2, tl[1] + py * 4.5 - dy / l2 * 2], [tl[0] - px * 4.5 - dx / l2 * 2, tl[1] - py * 4.5 - dy / l2 * 2], [hx - px * 5, hyy - py * 5 - 1]], c);
  }
  // pierna cercana
  s += limb(J.hip, J.kn, W.th, c) + limb(J.kn, J.an, W.sh, c) + limb(J.an, [J.an[0] + 4.5, J.an[1] - 2.5], 3, c);
  // manto de la mayor: de los hombros a media pierna, cae por la espalda
  if (kind === 'elder' && o.cloak !== false) {
    const sitting = ['seat', 'sitground', 'kneel'].includes(poseName);
    const low = sitting ? [J.hip[0] - 10, Math.max(1, J.hip[1] - 20)] : [J.hip[0] - 9, 14];
    s += smooth([[J.neck[0] - 2.5, J.neck[1] - 1], [J.sh[0] + 5, J.sh[1] - 2], [J.sh[0] + 5.5, J.sh[1] - 16], [J.hip[0] + 5.5, J.hip[1] - 4], [J.hip[0] + 2, sitting ? Math.max(1, J.hip[1] - 4) : 16], [low[0] + 5, low[1] - 1], low, [J.hip[0] - 9.5, J.hip[1] + 4], [J.sh[0] - 8, J.sh[1] - 4]], c);
  }
  // cuello y cabeza
  s += limb(J.sh, J.neck, 4.2, c);
  const hr = W.hr;
  s += `<ellipse cx="${J.head[0]}" cy="${-J.head[1]}" rx="${hr * 0.86}" ry="${hr}" fill="${c}"/>`;
  // pelo: largo y lacio por la espalda (adulta), a los hombros (mayor), corto (niño)
  const hair = o.hair || (kind === 'adult' ? 'long' : kind === 'elder' ? 'mid' : 'short');
  const hx = J.head[0], hy = J.head[1];
  if (hair === 'long') s += smooth([[hx - hr * 0.2, hy + hr * 1.02], [hx - hr * 0.95, hy + hr * 0.5], [hx - hr * 1.25, hy - hr * 1.2], [hx - hr * 1.35, hy - hr * 2.9], [hx - hr * 0.7, hy - hr * 3.1], [hx - hr * 0.35, hy - hr * 1.3], [hx + hr * 0.5, hy + hr * 0.2], [hx + hr * 0.6, hy + hr * 0.85]], c);
  if (hair === 'mid') s += smooth([[hx - hr * 0.1, hy + hr * 1.02], [hx - hr * 0.95, hy + hr * 0.4], [hx - hr * 1.2, hy - hr * 1.6], [hx - hr * 0.3, hy - hr * 1.5], [hx + hr * 0.5, hy + hr * 0.1], [hx + hr * 0.5, hy + hr * 0.85]], c);
  if (hair === 'short') s += smooth([[hx - hr * 0.3, hy + hr * 1.05], [hx - hr * 1.0, hy + hr * 0.3], [hx - hr * 0.95, hy - hr * 0.6], [hx + hr * 0.4, hy + hr * 0.3], [hx + hr * 0.6, hy + hr * 0.9]], c);
  // brazo cercano
  s += limb(J.sh, J.en, W.ua, c) + limb(J.en, J.hn, W.fa, c);
  // objetos
  if (o.staff) { const h = J.hn; s += `<line x1="${h[0] + 1}" y1="${-(h[1] + 22)}" x2="${h[0] + 4}" y2="0" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`; }
  if (o.bundle) s += smooth([[J.sh[0] - 5, J.sh[1] + 2], [J.sh[0] - 12, J.sh[1] - 4], [J.sh[0] - 12, J.sh[1] - 18], [J.sh[0] - 4, J.sh[1] - 20], [J.sh[0] - 3, J.sh[1] - 8]], c);
  if (o.basket) s += `<path d="M${J.hip[0] - 16} 0 Q${J.hip[0] - 16} -9 ${J.hip[0] - 9} -9 L${J.hip[0] - 3} -9 Q${J.hip[0] + 1} -9 ${J.hip[0] + 1} 0 Z" fill="${c}"/>`;
  return { svg: s, J };
};
// figura en pantalla: x,y = pie; h = alto de pantalla que tendría de pie; f = +1 mira a la derecha
P.place = function (kind, pose, x, y, h, f = 1, o = {}) {
  const k = kind === 'child' ? 0.62 : kind === 'elder' ? 0.95 : 1;
  const s = (h * k) / 100;
  const r = P.person(kind, pose, o);
  const sh = o.noShadow ? '' : `<ellipse cx="${x + f * s * 4}" cy="${y + 1}" rx="${s * 18}" ry="${s * 2.4}" fill="${o.shadowColor || 'rgba(30,22,16,.35)'}" filter="url(#soft)"/>`;
  return sh + `<g transform="translate(${x} ${y}) scale(${f * s} ${s})" opacity="${o.opacity || 0.95}">${r.svg}</g>`;
};
// colono: saco largo y sombrero de tres picos; sin armas
P.colonist = function (x, y, h, f = 1, c = '#2a2019') {
  const s = h / 100;
  let g = '';
  g += limb([-2, 50], [-2, 3], 6.5, c) + limb([2, 50], [4, 3], 6.5, c);
  g += smooth([[-7, 80], [7, 80], [10, 50], [12, 28], [-12, 28], [-9, 50]], c); // casaca
  g += limb([0, 78], [0, 84], 4, c) + `<ellipse cx="1" cy="-91" rx="5" ry="6" fill="${c}"/>`;
  g += smooth([[-10, 96], [0, 101], [11, 96], [8, 94], [0, 96], [-7, 94]], c); // tricornio
  g += limb([2, 78], [5, 58], 4, c) + limb([5, 58], [6, 44], 3.5, c);
  return `<g transform="translate(${x} ${y}) scale(${f * s} ${s})" opacity=".92">${g}</g>`;
};
// bergantín del siglo XVIII de dos palos, velas aferradas (fondeado)
P.ship = function (x, y, L, c = '#2a2019', furled = true) {
  const s = L / 100; let g = '';
  g += `<path d="M-50 -8 Q-46 2 -30 4 L38 4 Q48 0 54 -10 L44 -9 L-44 -9 Z" fill="${c}"/>`; // casco
  g += `<path d="M-50 -8 L-52 -16 L-40 -12 Z" fill="${c}"/>`; // popa
  g += `<line x1="44" y1="-9" x2="74" y2="-24" stroke="${c}" stroke-width="1.4"/>`; // bauprés
  for (const [mx, mh] of [[-12, 70], [22, 76]]) {
    g += `<line x1="${mx}" y1="-9" x2="${mx}" y2="${-mh}" stroke="${c}" stroke-width="1.8"/>`;
    for (const [yy, w] of [[-mh * 0.42, 34], [-mh * 0.68, 26], [-mh * 0.9, 18]]) {
      if (furled) g += `<line x1="${mx - w / 2}" y1="${yy}" x2="${mx + w / 2}" y2="${yy}" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    g += `<line x1="${mx}" y1="${-mh}" x2="${mx + 0.2 * (mx > 0 ? 1 : -1)}" y2="${-mh - 6}" stroke="${c}" stroke-width="1"/>`;
  }
  g += `<path d="M-12 -70 L-50 -14 M22 -76 L74 -24 M-12 -70 L22 -76 M22 -76 L44 -10 M-12 -70 L-40 -10" stroke="${c}" stroke-width=".6" fill="none" opacity=".8"/>`; // jarcia
  g += `<path d="M-40 7 L40 7 M-30 11 L30 11 M-18 15 L18 15" stroke="${c}" stroke-width="1.1" opacity=".22"/>`; // reflejo
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity=".9">${g}</g>`;
};
P.boat = function (x, y, L, c = '#2a2019') {
  const s = L / 100;
  return `<g transform="translate(${x} ${y}) scale(${s})" opacity=".9"><path d="M-50 -14 L50 -14 Q44 0 30 2 L-34 2 Q-46 0 -50 -14 Z" fill="${c}"/><line x1="-20" y1="-14" x2="-44" y2="10" stroke="${c}" stroke-width="3"/></g>`;
};
window.FIG = P;
})();
