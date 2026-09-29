/* Figuras: siluetas Bézier (Catmull-Rom → cúbicas) en un canon de 7,5 cabezas (niño 5,5 y 0,65 de la altura adulta).
 * Unidades: adulto = 750 (cabeza 100). y hacia ARRIBA desde los pies, x hacia donde mira la figura (+x).
 * Cada parte lleva su dirección de talla (hatch): lin (ángulo), fan (abanico desde un ápice), arc (arcos alrededor de un centro).
 * Sin rostros, sin miembros articulados, sin ciclos de marcha. */
(function () {
  const F = (window.CC_FIG = {});

  // ---------- poses ----------
  // Cada parte: {pts, closed, poly, hatch, z}
  const P = {};

  // Adulto de pie con manto, peso en la pierna de atrás. opts: bundle (atado a la cadera), staff (bastón vertical)
  P.stand = function (o = {}) {
    const parts = [];
    // piernas desnudas (debajo del manto): pantorrillas llenas, tobillos finos
    parts.push({ name: 'legB', pts: [[-58, 236], [-4, 236], [-2, 190], [-6, 120], [-14, 58], [-16, 26], [-4, 14], [34, 8], [38, 0], [-52, 0], [-50, 18], [-50, 60], [-62, 130], [-66, 190]], hatch: { lin: 92 } });
    parts.push({ name: 'legF', pts: [[4, 236], [52, 236], [56, 180], [60, 120], [62, 64], [66, 30], [74, 14], [118, 10], [122, 0], [38, 0], [34, 26], [28, 70], [18, 130], [8, 190]], hatch: { lin: 84 } });
    // manto de cuero: trapecio desde los hombros hasta la rodilla, sin flecos
    parts.push({ name: 'mantle', edge: true, pts: [[-24, 652], [-64, 640], [-92, 612], [-106, 560], [-114, 470], [-122, 380], [-130, 300], [-138, 226], [-100, 212], [-50, 220], [0, 206], [48, 216], [96, 204], [116, 214], [112, 300], [108, 380], [112, 440], [104, 500], [98, 560], [84, 612], [56, 640], [26, 650]], hatch: { fan: [-10, 1150] } });
    // cabeza (tres cuartos de espalda: sin rasgos)
    // pelo suelto que cae sobre la espalda hasta media espalda
    parts.push({ name: 'hair', edge: true, pts: [[-2, 760], [30, 756], [48, 738], [20, 736], [-4, 712], [-18, 672], [-30, 628], [-40, 574], [-50, 524], [-66, 494], [-86, 500], [-96, 548], [-94, 610], [-78, 672], [-60, 724], [-34, 752]], hatch: { lin: 98 } });
    parts.push({ name: 'head', pts: [[14, 752], [46, 738], [58, 706], [54, 670], [40, 646], [14, 636], [-16, 644], [-38, 672], [-40, 714], [-20, 744]], hatch: { lin: 100 } });
    if (o.bundle) parts.push({ name: 'bundle', edge: true, pts: [[-104, 460], [-150, 444], [-180, 396], [-180, 334], [-156, 300], [-116, 300], [-100, 350], [-98, 414]], hatch: { arc: [-140, 376] } });
    if (o.staff) {
      parts.push({ name: 'staff', poly: true, pts: [[134, -2], [148, -2], [150, 808], [136, 808]], hatch: { lin: 90 } });
      parts.push({ name: 'arm', edge: true, pts: [[84, 520], [110, 512], [146, 500], [158, 480], [144, 462], [106, 470], [84, 486]], hatch: { lin: 12 } });
    }
    return { parts, h: 760 };
  };

  // Anciano sentado, rodillas arriba, bastón cruzado sobre las rodillas.
  P.seated = function () {
    const parts = [];
    parts.push({ name: 'shin', pts: [[82, 230], [140, 226], [158, 170], [176, 90], [186, 34], [192, 14], [244, 10], [248, 0], [136, 0], [134, 24], [124, 80], [104, 150], [86, 200]], hatch: { lin: 72 } });
    parts.push({ name: 'mantle', edge: true, pts: [[-2, 350], [-50, 336], [-90, 300], [-114, 240], [-128, 160], [-138, 80], [-142, 0], [-40, 0], [20, 14], [60, 70], [96, 160], [120, 226], [96, 246], [62, 276], [44, 316], [26, 344]], hatch: { fan: [-20, 900] } });
    parts.push({ name: 'hair', edge: true, pts: [[16, 460], [48, 452], [62, 436], [32, 428], [10, 404], [-2, 370], [-14, 340], [-34, 314], [-58, 318], [-64, 360], [-50, 414], [-24, 450]], hatch: { lin: 104 } });
    parts.push({ name: 'head', pts: [[34, 450], [64, 432], [76, 400], [70, 368], [48, 350], [18, 348], [-6, 362], [-18, 392], [-8, 426]], hatch: { lin: 110 } });
    // bastón en reposo: cruza las rodillas en diagonal (≈27°) y baja hacia atrás; no asoma hacia delante
    parts.push({ name: 'staff', poly: true, pts: [[136, 252], [146, 238], [-150, 86], [-160, 100]], hatch: { lin: 27 } });
    parts.push({ name: 'hand', pts: [[66, 268], [96, 256], [110, 232], [94, 218], [66, 226], [56, 248]], hatch: { lin: 30 } });
    return { parts, h: 460 };
  };

  // En cuclillas: niño mirando la arena, o adulto recogiendo con una mano en la arena.
  P.crouch = function (o = {}) {
    const parts = [];
    if (o.child) {
      // niño: 5,5 cabezas (cabeza ≈ 89 u); agachado ≈ 280 u
      parts.push({ name: 'legs', pts: [[-40, 118], [30, 150], [70, 150], [84, 110], [80, 50], [86, 16], [120, 10], [122, 0], [-40, 0], [-56, 20], [-62, 60]], hatch: { lin: 80 } });
      parts.push({ name: 'mantle', edge: true, pts: [[10, 212], [-30, 204], [-66, 172], [-84, 120], [-82, 66], [-62, 34], [-20, 40], [24, 70], [60, 104], [66, 150], [52, 186], [34, 206]], hatch: { fan: [0, 700] } });
      parts.push({ name: 'arm', edge: true, pts: [[40, 176], [68, 168], [98, 110], [118, 40], [138, 16], [132, 2], [106, 4], [96, 30], [74, 96], [44, 146]], hatch: { lin: 68 } });
      parts.push({ name: 'hair', edge: true, pts: [[66, 280], [96, 274], [84, 262], [62, 244], [44, 214], [30, 190], [12, 178], [0, 196], [8, 236], [30, 268]], hatch: { lin: 120 } });
      parts.push({ name: 'head', pts: [[80, 272], [110, 256], [120, 224], [110, 194], [84, 180], [56, 186], [40, 208], [42, 244], [56, 264]], hatch: { lin: 120 } });
      return { parts, h: 280 };
    }
    // adulto recogiendo en la orilla
    parts.push({ name: 'legs', pts: [[-50, 180], [40, 220], [96, 206], [110, 150], [106, 80], [112, 24], [156, 14], [160, 0], [-50, 0], [-74, 30], [-78, 100]], hatch: { lin: 80 } });
    parts.push({ name: 'mantle', edge: true, pts: [[40, 362], [-16, 350], [-76, 306], [-110, 232], [-118, 150], [-104, 76], [-66, 50], [-4, 74], [56, 116], [100, 170], [112, 226], [100, 286], [74, 334]], hatch: { fan: [-10, 1000] } });
    parts.push({ name: 'arm', edge: true, pts: [[84, 246], [118, 232], [150, 160], [176, 60], [198, 26], [196, 6], [162, 8], [148, 44], [120, 136], [86, 196]], hatch: { lin: 70 } });
    parts.push({ name: 'hair', edge: true, pts: [[108, 412], [144, 404], [130, 392], [104, 370], [84, 334], [60, 300], [32, 270], [8, 262], [0, 292], [22, 344], [58, 390]], hatch: { lin: 140 } });
    parts.push({ name: 'head', pts: [[126, 404], [160, 384], [172, 346], [160, 310], [130, 294], [98, 300], [80, 328], [82, 368], [100, 394]], hatch: { lin: 130 } });
    return { parts, h: 412 };
  };

  // Colono de pie, tres cuartos de perfil (mira hacia +x), peso en la pierna de atrás: UNA silueta continua para el cuerpo
  // (chaqueta que se abre en la cadera, calzones, botas; piernas en una sola masa con una rendija bajo la rodilla).
  // Sombrero de ala plana (≈ 2 × la cabeza) algo inclinada y copa baja. opts: bundle (atado colgando a la espalda), stick
  P.colon = function (o = {}) {
    const parts = [];
    parts.push({ name: 'body', pts: [
      [100, 0], [102, 14], [64, 24], [56, 70], [52, 160], [50, 220], [56, 290], [60, 346], [80, 368], [70, 420], [64, 470], [74, 540],
      [70, 596], [44, 634], [20, 648], [-18, 648], [-50, 634], [-68, 600], [-74, 530], [-68, 456], [-80, 398], [-92, 350], [-58, 344],
      [-46, 300], [-50, 220], [-46, 150], [-40, 60], [-46, 14], [-40, 0], [22, 0], [26, 14], [4, 26], [8, 150], [30, 26], [34, 0]], hatch: { fan: [0, 1100] } });
    parts.push({ name: 'arm', pts: [[18, 602], [44, 596], [56, 530], [52, 460], [44, 404], [24, 398], [18, 454], [14, 540]], hatch: { lin: 94 } });
    parts.push({ name: 'head', pts: [[12, 742], [44, 730], [58, 698], [50, 664], [22, 648], [-14, 652], [-34, 676], [-34, 712], [-16, 734]], hatch: { lin: 100 } });
    // ala plana inclinada ≈ 3°, más ancha hacia delante; copa baja
    parts.push({ name: 'brim', poly: true, pts: [[-84, 716], [104, 726], [108, 734], [100, 740], [-86, 731], [-92, 723]], hatch: { lin: 3 } });
    parts.push({ name: 'crown', pts: [[-40, 726], [-42, 752], [-26, 768], [8, 772], [36, 766], [46, 748], [44, 730]], hatch: { lin: 90 } });
    if (o.bundle) parts.push({ name: 'bundle', pts: [[-46, 616], [-78, 622], [-116, 586], [-134, 516], [-128, 452], [-98, 434], [-70, 462], [-60, 540]], hatch: { arc: [-96, 526] } });
    if (o.stick) {
      parts.push({ name: 'armF', pts: [[26, 604], [54, 592], [80, 520], [106, 446], [98, 424], [74, 432], [46, 508], [16, 566]], hatch: { lin: 70 } });
      parts.push({ name: 'stick', poly: true, pts: [[98, 440], [110, 440], [150, 0], [138, 0]], hatch: { lin: 85 } });
      parts.push({ name: 'hand', pts: [[84, 452], [110, 458], [118, 436], [104, 420], [84, 426]], hatch: { lin: 10 } });
    }
    return { parts, h: 772 };
  };

  // ---------- geometría ----------
  function crPath(pts, closed, tf) {
    const q = pts.map(tf);
    const p = new Path2D();
    const n = q.length;
    p.moveTo(q[0][0], q[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = q[(i - 1 + n) % n], p1 = q[i], p2 = q[(i + 1) % n], p3 = q[(i + 2) % n];
      const t = 1 / 6;
      p.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t, p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t, p2[0], p2[1]);
    }
    if (closed) p.closePath();
    return p;
  }
  function polyPath(pts, tf) { const p = new Path2D(); pts.map(tf).forEach((v, i) => (i ? p.lineTo(v[0], v[1]) : p.moveTo(v[0], v[1]))); p.closePath(); return p; }

  const POSES = {
    standBundle: () => P.stand({ bundle: true }),
    standStaff: () => P.stand({ staff: true }),
    stand: () => P.stand({}),
    elderSeated: () => P.seated(),
    childCrouch: () => P.crouch({ child: true }),
    gather: () => P.crouch({}),
    colonBundle: () => P.colon({ bundle: true }),
    colonStick: () => P.colon({ stick: true }),
  };
  // escala de cada pose en relación con la altura de un ADULTO de pie (750 u)
  F.poses = Object.keys(POSES);
  F.pose = (name) => POSES[name]();

  // Construye la figura en coordenadas de lienzo. adultPx: altura en px de un adulto de pie a esa distancia.
  F.build = function (pose, footX, footY, adultPx, facing = 1) {
    const g = F.pose(pose);
    const s = adultPx / 750;
    const tf = (p) => [footX + facing * p[0] * s, footY - p[1] * s];
    const parts = g.parts.map((pt) => {
      const path = pt.poly ? polyPath(pt.pts, tf) : crPath(pt.pts, true, tf);
      const hatch = {};
      if (pt.hatch.lin != null) { const a = (pt.hatch.lin * Math.PI) / 180; hatch.dir = [facing * Math.cos(a), -Math.sin(a)]; }
      if (pt.hatch.fan) hatch.apex = tf(pt.hatch.fan);
      if (pt.hatch.arc) hatch.center = tf(pt.hatch.arc);
      const xs = pt.pts.map((p) => tf(p)[0]), ys = pt.pts.map((p) => tf(p)[1]);
      return { name: pt.name, edge: !!pt.edge, path, hatch, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
    });
    const bb = parts.reduce((b, p) => [Math.min(b[0], p.bb[0]), Math.min(b[1], p.bb[1]), Math.max(b[2], p.bb[2]), Math.max(b[3], p.bb[3])], [1e9, 1e9, -1e9, -1e9]);
    return { pose, parts, bb, s, footX, footY, facing, heightPx: g.h * s };
  };

  // Dibuja las líneas de talla de una parte (recortadas a la parte) en ctx. spacing/width en px.
  F.hatchPart = function (ctx, part, spacing, width, color, filter) {
    ctx.save();
    ctx.clip(part.path);
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
    const [x0, y0, x1, y1] = part.bb;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + spacing;
    const h = part.hatch;
    const lines = [];
    if (h.apex) {
      // abanico: líneas desde el ápice (pliegues del manto que caen de los hombros)
      const [ax, ay] = h.apex;
      const d0 = Math.hypot(cx - ax, cy - ay);
      const ang0 = Math.atan2(cy - ay, cx - ax);
      const dA = spacing / Math.max(1, d0);
      const n = Math.ceil((R * 1.4) / spacing);
      for (let i = -n; i <= n; i++) { const a = ang0 + i * dA; lines.push([[ax, ay], [ax + Math.cos(a) * (d0 + R * 2), ay + Math.sin(a) * (d0 + R * 2)]]); }
    } else if (h.center) {
      const [ccx, ccy] = h.center;
      for (let r = spacing * 0.6; r < R * 2; r += spacing) lines.push({ arc: [ccx, ccy, r] });
    } else {
      const [dx, dy] = h.dir; const nx = -dy, ny = dx;
      const n = Math.ceil(R / spacing);
      for (let i = -n; i <= n; i++) { const ox = cx + nx * i * spacing, oy = cy + ny * i * spacing; lines.push([[ox - dx * R, oy - dy * R], [ox + dx * R, oy + dy * R]]); }
    }
    for (const L of lines) {
      if (filter && !filter(L)) continue;
      ctx.beginPath();
      if (L.arc) ctx.arc(L.arc[0], L.arc[1], L.arc[2], 0, Math.PI * 2);
      else { ctx.moveTo(L[0][0], L[0][1]); ctx.lineTo(L[1][0], L[1][1]); }
      ctx.stroke();
    }
    ctx.restore();
    return lines;
  };

  // Máscara de silueta (unión de partes) en un lienzo del tamaño dado.
  F.silhouette = function (fig, w, h, dilate = 0) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    for (const p of fig.parts) { x.fill(p.path); if (dilate > 0) { x.strokeStyle = '#fff'; x.lineWidth = dilate * 2; x.lineJoin = 'round'; x.stroke(p.path); } }
    return c;
  };
})();

/* ---------- Render de figuras para los lienzos estáticos (se hace una sola vez en el inicio) ---------- */
(function () {
  const F = window.CC_FIG, U = window.CC_U;

  // Líneas de talla de una parte (sin dibujar): [{a:[x,y], b:[x,y]} | {arc:[cx,cy,r]}]
  function partLines(part, spacing) {
    const [x0, y0, x1, y1] = part.bb;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + spacing;
    const h = part.hatch, L = [];
    if (h.apex) {
      const [ax, ay] = h.apex, d0 = Math.hypot(cx - ax, cy - ay), ang0 = Math.atan2(cy - ay, cx - ax), dA = spacing / Math.max(1, d0 + (y1 - y0) * 0.25);
      const n = Math.ceil((R * 1.6) / spacing);
      for (let i = -n; i <= n; i++) { const a = ang0 + i * dA; L.push({ a: [ax, ay], b: [ax + Math.cos(a) * (d0 + R * 2), ay + Math.sin(a) * (d0 + R * 2)], m: [ax + Math.cos(a) * d0, ay + Math.sin(a) * d0] }); }
    } else if (h.center) {
      for (let r = spacing * 0.55; r < R * 2; r += spacing) L.push({ arc: [h.center[0], h.center[1], r], m: [h.center[0], h.center[1] - r] });
    } else {
      const [dx, dy] = h.dir, nx = -dy, ny = dx, n = Math.ceil(R / spacing);
      for (let i = -n; i <= n; i++) { const ox = cx + nx * i * spacing, oy = cy + ny * i * spacing; L.push({ a: [ox - dx * R, oy - dy * R], b: [ox + dx * R, oy + dy * R], m: [ox, oy] }); }
    }
    return L;
  }
  function strokeLine(x, l) { x.beginPath(); if (l.arc) x.arc(l.arc[0], l.arc[1], l.arc[2], 0, Math.PI * 2); else { x.moveTo(l.a[0], l.a[1]); x.lineTo(l.b[0], l.b[1]); } x.stroke(); }

  // DÍA: tinta = max(núcleo, talla), anillo de separación (solo por fuera de la silueta UNIDA: nunca hilos de papel dentro),
  // sombra proyectada en trazos paralelos a su eje y trazo de contacto.
  // o: {spacing, width, erode, ring, shadow:{len, shear}, dyn, order:'sweep'|'outline'|'future'}
  // Tiempos (0..1 del tallado): hTime (talla y contorno), cTime (núcleo), mTime (máscara/papel).
  F.renderDay = function (fig, o = {}) {
    const sp = o.spacing || 7, lw = o.width || 3.2, er = o.erode != null ? o.erode : fig.heightPx < 150 ? 3 : 5;
    const pad = Math.ceil(fig.heightPx * (o.shadow ? 1.5 : 0.15) + 40);
    const x0 = Math.floor(fig.bb[0] - pad), y0 = Math.floor(fig.bb[1] - 30), w = Math.ceil(fig.bb[2] - fig.bb[0] + pad * 2), h = Math.ceil(fig.bb[3] - fig.bb[1] + 30 + pad);
    const mk = () => { const c = U.canvas(w, h); const x = c.getContext('2d', { willReadFrequently: true }); x.translate(-x0, -y0); return [c, x]; };
    // silueta
    const [sc, sx] = mk(); sx.fillStyle = '#fff'; for (const p of fig.parts) sx.fill(p.path);
    const sil = U.alpha(sc);
    const inside = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) inside[i] = sil[i] > 0.5 ? 1 : 0;
    // transformadas de distancia solo en el recuadro de la silueta (+10 px)
    const bx0 = Math.max(0, Math.floor(fig.bb[0] - x0 - 10)), by0 = Math.max(0, Math.floor(fig.bb[1] - y0 - 10));
    const bw = Math.min(w - bx0, Math.ceil(fig.bb[2] - fig.bb[0] + 20)), bh = Math.min(h - by0, Math.ceil(fig.bb[3] - fig.bb[1] + 20));
    const cin = new Uint8Array(bw * bh), cinv = new Uint8Array(bw * bh);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { const v = inside[(y + by0) * w + x + bx0]; cin[y * bw + x] = v; cinv[y * bw + x] = 1 - v; }
    const dOutC = U.edt(cinv, bw, bh), dInC = U.edt(cin, bw, bh);
    const core = new Float32Array(w * h), mask = new Float32Array(w * h), outl = new Float32Array(w * h), dIn = new Float32Array(w * h).fill(99);
    const ringW = o.ring != null ? o.ring : 1.5;
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
      const i = (y + by0) * w + x + bx0, c = y * bw + x;
      core[i] = inside[i] ? Math.max(0, Math.min(1, dOutC[c] - er + 0.5)) : 0;
      mask[i] = inside[i] ? 1 : Math.max(0, Math.min(1, ringW + 0.5 - dInC[c] + 0.5));
      outl[i] = inside[i] ? Math.max(0, Math.min(1, 2.6 - dOutC[c] + 0.5)) : 0;
      dIn[i] = inside[i] ? 0 : dInC[c];
    }
    // talla por partes (recortada a la parte)
    const lines = [];
    for (const p of fig.parts) for (const l of partLines(p, sp)) lines.push({ l, part: p });
    const fb = fig.bb, fw = Math.max(1, fb[2] - fb[0]), fh = Math.max(1, fb[3] - fb[1]);
    const sweep = (m) => ((m[0] - fb[0]) / fw) * 0.45 + ((m[1] - fb[1]) / fh) * 0.55;
    const fromFeet = (m) => 1 - (m[1] - fb[1]) / fh;
    lines.forEach((L) => (L.o = Math.max(0, Math.min(1, sweep(L.l.m)))));
    const [hc, hx] = mk();
    const [tc, tx] = mk();
    hx.lineWidth = tx.lineWidth = lw; hx.lineCap = tx.lineCap = 'butt';
    hx.strokeStyle = '#000';
    const order = o.order || 'sweep';
    const win = { sweep: { h: [0, 0.75], c: [0.75, 1], m: [0.12, 0.87] }, outline: { k: [0, 0.25], c: [0.2, 0.7], h: [0.55, 1] }, future: { k: [0, 0.22], h: [0.18, 0.6], c: [0.45, 1] } }[order];
    const lerpW = (wd, u) => wd[0] + (wd[1] - wd[0]) * Math.max(0, Math.min(1, u));
    for (const p of fig.parts) {
      const mine = lines.filter((L) => L.part === p).sort((a, b) => a.o - b.o);
      hx.save(); hx.clip(p.path); hx.beginPath();
      for (const L of mine) { const l = L.l; if (l.arc) { hx.moveTo(l.arc[0] + l.arc[2], l.arc[1]); hx.arc(l.arc[0], l.arc[1], l.arc[2], 0, Math.PI * 2); } else { hx.moveTo(l.a[0], l.a[1]); hx.lineTo(l.b[0], l.b[1]); } }
      hx.stroke(); hx.restore();
      if (o.dyn) {
        tx.save(); tx.clip(p.path);
        for (const L of mine) {
          const u = p.tw ? p.tw[0] + (p.tw[1] - p.tw[0]) * L.o : lerpW(win.h, L.o);
          const v = Math.round(Math.min(1, u) * 254) + 1; tx.strokeStyle = `rgb(${v},${v},${v})`; strokeLine(tx, L.l);
        }
        tx.restore();
      }
    }
    const hatch = U.alpha(hc);
    let hTime = null, cTime = null, mTime = null;
    if (o.dyn) {
      const td = tc.getContext('2d').getImageData(0, 0, w, h).data;
      hTime = new Float32Array(w * h); cTime = new Float32Array(w * h); mTime = new Float32Array(w * h);
      // centro para el contorno a buril (recorre la silueta por ángulo, empezando por los pies)
      const ccx = (fb[0] + fb[2]) / 2, ccy = fb[1] + fh * 0.55;
      const angT = (X, Y) => { let a = Math.atan2(X - ccx, Y - ccy) / (2 * Math.PI); if (a < 0) a += 1; return a; };
      // tiempo por parte (barco y bote): cada parte en su ventana, de abajo arriba
      const partAt = new Int16Array(w * h).fill(-1);
      if (fig.parts.some((p) => p.tw)) {
        const [pc, px2] = mk();
        fig.parts.forEach((p, k) => { px2.fillStyle = `rgb(${k + 1},0,0)`; px2.fill(p.path); });
        const pd = pc.getContext('2d').getImageData(0, 0, w, h).data;
        for (let i = 0; i < w * h; i++) if (pd[i * 4 + 3] > 127) partAt[i] = pd[i * 4] - 1;
      }
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, X = x + x0, Y = y + y0;
        hTime[i] = td[i * 4 + 3] > 8 ? (td[i * 4] - 1) / 254 : 1;
        const pk = partAt[i];
        if (pk >= 0 && fig.parts[pk].tw) {
          const tw = fig.parts[pk].tw, pb = fig.parts[pk].bb, u = 1 - (Y - pb[1]) / Math.max(1, pb[3] - pb[1]);
          cTime[i] = tw[0] + (tw[1] - tw[0]) * Math.max(0, Math.min(1, u)); mTime[i] = Math.max(0, cTime[i] - 0.02);
          continue;
        }
        if (order === 'sweep') {
          const s = Math.max(0, Math.min(1, sweep([X, Y])));
          cTime[i] = lerpW(win.c, s); mTime[i] = Math.min(0.97, lerpW(win.m, s));
        } else {
          const ka = lerpW(win.k, angT(X, Y));
          const cu = order === 'future' ? fromFeet([X, Y]) : Math.max(0, Math.min(1, sweep([X, Y])));
          cTime[i] = lerpW(win.c, cu); mTime[i] = ka;
          if (outl[i] > 0.02) hTime[i] = Math.min(hTime[i], ka);
        }
      }
    }
    // sombra proyectada hacia la cámara (el sol está detrás de la sierra): silueta reflejada, estirada y cizallada,
    // tallada con trazos paralelos a su eje (7,5 px, 3 → 2,2 px); segundo juego solo junto a los pies; termina acortando trazos.
    let shadow = null;
    if (o.shadow) {
      const [shc, shx] = mk();
      const fx = fig.footX, fy = fig.footY, L = o.shadow.len, S = o.shadow.shear;
      shx.transform(1, 0, 0, 1, fx, fy); shx.transform(1, 0, S, L, 0, 0); shx.transform(1, 0, 0, -1, -fx, fy);
      shx.fillStyle = '#fff'; for (const p of fig.parts) shx.fill(p.path);
      const sa = U.alpha(shc);
      const [xc, xx] = mk(); xx.strokeStyle = '#000'; xx.lineCap = 'round';
      const Lpx = fig.heightPx * L * Math.hypot(S, 1), ax = [S / Math.hypot(S, 1), 1 / Math.hypot(S, 1)], nx = [-ax[1], ax[0]];
      const rs = PBS.rng(Math.round(fx * 7 + fy));
      const halfW = (fb[2] - fb[0]) * 0.5 + fig.heightPx * 0.2 + 20;
      const set = (dir, spc, from, to, w0, w1) => {
        const nn = [-dir[1], dir[0]];
        for (let off = -halfW * 1.6; off <= halfW * 1.6; off += spc) {
          const endU = to * (0.72 + 0.28 * rs()), o2 = off + (rs() - 0.5) * 1.2;
          const bx = fx + nn[0] * o2, by = fy + nn[1] * o2;
          const n = 12;
          for (let k = 0; k < n; k++) {
            const u0 = from + ((endU - from) * k) / n, u1 = from + ((endU - from) * (k + 1)) / n;
            xx.lineWidth = w0 + (w1 - w0) * (k / (n - 1));
            xx.beginPath(); xx.moveTo(bx + dir[0] * u0 * Lpx, by + dir[1] * u0 * Lpx); xx.lineTo(bx + dir[0] * u1 * Lpx, by + dir[1] * u1 * Lpx); xx.stroke();
          }
        }
      };
      set(ax, 7.5, -0.1, 1.0, 3.0, 2.2);
      const a2 = Math.atan2(ax[1], ax[0]) + 0.62, ax2 = [Math.cos(a2), Math.sin(a2)];
      set(ax2, 9, -0.1, 0.3, 2.4, 2.2);
      const xa = U.alpha(xc);
      shadow = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) shadow[i] = Math.min(1, sa[i] * xa[i] * 1.15) * (1 - mask[i]);
    }
    // trazo de contacto bajo los pies
    const [cc, cx2] = mk();
    cx2.fillStyle = '#fff';
    const cw = (fb[2] - fb[0]) * (o.contactW || 0.62), cy0 = fig.footY + 1.5;
    cx2.beginPath(); cx2.ellipse(fig.footX + fig.facing * (fb[2] - fb[0]) * 0.04, cy0, cw / 2, Math.max(1.6, fig.heightPx * 0.012), 0, 0, Math.PI * 2); cx2.fill();
    const contact = U.alpha(cc);
    const gap = new Float32Array(w * h);
    const ink = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) { ink[i] = Math.max(core[i], hatch[i] * (inside[i] ? 1 : 0), o.dyn && order !== 'sweep' ? outl[i] : 0); ink[i] = Math.max(ink[i], contact[i]); }
    return { x0, y0, w, h, sil, ink, core, hatch, gap, mask, shadow, contact, hTime, cTime, mTime, inside, outl, dIn };
  };

  // NOCHE (gruta): cuerpo = plancha sin tallar; filo de luz de 2 px del lado iluminado; 2–4 tallas claras; contacto.
  F.renderNight = function (fig, o = {}) {
    const light = o.light || [-0.75, -0.66];
    const pad = 24;
    const x0 = Math.floor(fig.bb[0] - pad), y0 = Math.floor(fig.bb[1] - pad), w = Math.ceil(fig.bb[2] - fig.bb[0] + pad * 2), h = Math.ceil(fig.bb[3] - fig.bb[1] + pad * 2);
    const mk = () => { const c = U.canvas(w, h); const x = c.getContext('2d'); x.translate(-x0, -y0); return [c, x]; };
    const [sc, sx] = mk(); sx.fillStyle = '#fff'; for (const p of fig.parts) sx.fill(p.path);
    const sil = U.alpha(sc);
    const inside = new Uint8Array(w * h), inv = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) { inside[i] = sil[i] > 0.5 ? 1 : 0; inv[i] = 1 - inside[i]; }
    const dOut = U.edt(inv, w, h), dIn = U.edt(inside, w, h);
    // lado iluminado: distancia al exterior medida desplazando hacia la luz
    const [lc, lx] = mk(); lx.translate(-light[0] * (o.rim || 2.4), -light[1] * (o.rim || 2.4)); lx.fillStyle = '#fff'; for (const p of fig.parts) lx.fill(p.path);
    const shifted = U.alpha(lc);
    const clear = new Float32Array(w * h), rim = new Float32Array(w * h), lit = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      clear[i] = inside[i] ? 1 : Math.max(0, Math.min(1, (o.halo || 8) - dIn[i]));
      rim[i] = inside[i] ? Math.max(0, sil[i] - shifted[i]) : 0;
    }
    // tallas interiores escasas del lado de la luz
    const [hc, hx] = mk(); hx.strokeStyle = '#000'; hx.lineWidth = o.hatchW || 2.2; hx.lineCap = 'round';
    for (const p of fig.parts) {
      if (p.name === 'staff' || p.name === 'stick') continue;
      hx.save(); hx.clip(p.path);
      for (const l of partLines(p, o.hatchSp || 9)) strokeLine(hx, l);
      hx.restore();
    }
    const hatch = U.alpha(hc);
    const band = o.band || 9;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!inside[i]) continue;
      // cercanía al borde iluminado: comparar la distancia al exterior con la del punto desplazado hacia la luz
      const xs = Math.round(x + light[0] * band), ys = Math.round(y + light[1] * band);
      const outLit = xs < 0 || ys < 0 || xs >= w || ys >= h || !inside[ys * w + xs];
      if (outLit && dOut[i] > 3.2) lit[i] = hatch[i] * Math.max(0, Math.min(1, (band - dOut[i]) / 3 + 0.3));
    }
    return { x0, y0, w, h, sil, clear, rim, lit, inside };
  };
})();
