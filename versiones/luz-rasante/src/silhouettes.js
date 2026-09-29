/* Atlas de siluetas (Canvas2D al iniciar). Cada celda 128×512 cubre 1.1 m × 2.2 m (pies abajo, y = altura).
   Siluetas vistas desde el sol: frente/espalda o perfil. Canon 7.5 cabezas (niño 5.5). Sin rasgos, sin adornos. */
(function () {
  const LR = (window.LR = window.LR || {});
  const CW = 128, CH = 512, WM = 1.1, HM = 2.2, COLS = 16;

  function mk(ctx) {
    const P = {
      E(cx, cy, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(cx, cy, Math.max(rx, 1e-3), Math.max(ry, 1e-3), rot, 0, Math.PI * 2); ctx.fill(); },
      // polígono suavizado (curvas cuadráticas por puntos medios)
      S(pts) {
        const n = pts.length; ctx.beginPath();
        const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        let s = m(pts[n - 1], pts[0]); ctx.moveTo(s[0], s[1]);
        for (let i = 0; i < n; i++) { const c = pts[i], e = m(c, pts[(i + 1) % n]); ctx.quadraticCurveTo(c[0], c[1], e[0], e[1]); }
        ctx.closePath(); ctx.fill();
      },
      // polígono de vértices duros
      Pg(pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); },
      // miembro cónico por una cadena de puntos [x,y,ancho]
      L(ch) {
        const left = [], right = [];
        for (let i = 0; i < ch.length; i++) {
          const a = ch[Math.max(0, i - 1)], b = ch[Math.min(ch.length - 1, i + 1)];
          let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
          const w = ch[i][2] / 2; left.push([ch[i][0] - dy * w, ch[i][1] + dx * w]); right.push([ch[i][0] + dy * w, ch[i][1] - dx * w]);
        }
        P.Pg(left.concat(right.reverse()));
        P.E(ch[0][0], ch[0][1], ch[0][2] / 2, ch[0][2] / 2); P.E(ch[ch.length - 1][0], ch[ch.length - 1][1], ch[ch.length - 1][2] / 2, ch[ch.length - 1][2] / 2);
      },
      R(x0, y0, x1, y1) { ctx.fillRect(x0, y0, x1 - x0, y1 - y0); },
    };
    return P;
  }

  // ---------- indígena de frente / espalda ----------
  function indFront(P, o) {
    const H = o.H, hu = H / (o.child ? 5.5 : 7.5), sh = o.w === 'b' ? 0.022 : 0; // desplazamiento de peso
    const headY = H - 0.5 * hu, hrx = 0.37 * hu, hry = 0.52 * hu;
    const shY = H - 1.42 * hu, knee = 0.27 * H, hemY = o.child ? 0.42 * H : knee + 0.05;
    const mw = o.child ? 0.2 : 0.255; // media anchura del manto
    // piernas
    const lx = -0.082 + sh * 0.5, rx = 0.082 + sh * 1.8, fy = 0.012;
    const legW = o.child ? 0.085 : 0.1;
    P.L([[lx, hemY + 0.05, legW * 1.1], [lx - 0.004, knee, legW], [lx - 0.01, 0.06, legW * 0.6]]);
    P.L([[rx - 0.02, hemY + 0.05, legW * 1.1], [rx, knee - (o.w === 'b' ? 0.01 : 0), legW], [rx + (o.w === 'b' ? 0.03 : 0.01), 0.06, legW * 0.6]]);
    P.E(lx - 0.012, fy + 0.02, 0.05, 0.028); P.E(rx + (o.w === 'b' ? 0.03 : 0.01), fy + 0.02, 0.05, 0.028);
    // manto de cuero: de los hombros a la rodilla, borde irregular sin flecos
    const t = sh;
    const k = mw / 0.255;
    P.S([[-0.07, H - 1.12 * hu], [0.07, H - 1.12 * hu], [0.2 * k, shY + 0.035], [0.25 * k, shY - 0.03], [0.255 * k + t * 0.3, shY - 0.14], [mw + 0.004 + t, H * 0.6], [mw - 0.025 + t * 1.4, hemY + 0.03],
      [mw * 0.4 + t, hemY - 0.012], [-mw * 0.3 + t, hemY + 0.01], [-mw + 0.015 + t * 0.6, hemY + 0.05], [-mw - 0.006 + t * 0.4, H * 0.62], [-0.255 * k + t * 0.2, shY - 0.14], [-0.25 * k, shY - 0.03], [-0.2 * k, shY + 0.035]]);
    // cuello y cabeza
    P.L([[0, H - 0.9 * hu, 0.1], [0, H - 1.25 * hu, 0.12]]);
    P.E(0, headY, hrx, hry);
    // pelo suelto: cae a los costados del cuello hasta los hombros (o más, por la espalda)
    const hl = o.hair === 'long' ? 2.4 : 1.55;
    P.S([[-hrx - 0.01, headY + 0.02], [-hrx - 0.018, headY - 0.5 * hu], [-0.105, H - hl * hu], [-0.06, H - (hl - 0.1) * hu], [0.06, H - (hl - 0.08) * hu], [0.108, H - hl * hu + 0.01], [hrx + 0.02, headY - 0.5 * hu], [hrx + 0.01, headY + 0.02], [0, H + 0.008]]);
    if (o.view === 'back' && o.hair === 'long') P.S([[-0.12, shY], [0.12, shY], [0.1, H - 2.9 * hu], [-0.1, H - 2.95 * hu]]);
    // bastón vertical (más alto que la persona) con antebrazo saliendo del manto
    if (o.staff) {
      const sx = o.staff * (mw + 0.07);
      P.L([[o.staff * (mw - 0.03), H * 0.61, 0.07], [sx, H * 0.6, 0.06]]);
      P.E(sx, H * 0.6, 0.038, 0.045);
      P.L([[sx, 0.0, 0.05], [sx, H + (o.elder ? 0.16 : 0.12), 0.044]]);
    }
    // atado a la cadera
    if (o.bundle === 'hip') {
      const bx = -(mw + 0.07);
      P.E(bx, H * 0.5, 0.1, 0.13, 0.12);
      P.L([[bx + 0.02, H * 0.58, 0.02], [-mw + 0.02, H * 0.64, 0.02]]);
    }
  }

  // ---------- indígena de perfil (mira hacia +x) ----------
  function indProfile(P, o) {
    const H = o.H, hu = H / (o.child ? 5.5 : 7.5);
    const lean = o.elder ? 0.07 : 0.0;
    const headX = 0.02 + lean, headY = H - 0.5 * hu - (o.elder ? 0.035 : 0);
    const shY = H - 1.4 * hu, knee = 0.27 * H, hemY = o.child ? 0.42 * H : knee + 0.06;
    // piernas
    if (o.walk) {
      const st = o.child ? 0.75 : 1;
      P.L([[0.02, 0.5 * H, 0.13], [0.09 * st, knee, 0.1], [0.19 * st, 0.07, 0.065]]);
      P.L([[0.17 * st, 0.05, 0.05], [0.29 * st, 0.018, 0.035]]);
      P.L([[-0.02, 0.5 * H, 0.13], [-0.07 * st, knee + 0.01, 0.1], [-0.2 * st, 0.11, 0.06]]);
      P.L([[-0.2 * st, 0.1, 0.05], [-0.11 * st, 0.015, 0.035]]);
    } else {
      const b = o.w === 'b';
      P.L([[0.0, 0.5 * H, 0.14], [0.02 + (b ? 0.03 : 0), knee, 0.105], [0.0 + (b ? 0.05 : 0.01), 0.07, 0.065]]);
      P.L([[-0.01, 0.5 * H, 0.13], [-0.02, knee, 0.1], [-0.035, 0.07, 0.065]]);
      P.L([[-0.07, 0.03, 0.05], [0.1, 0.02, 0.04]]);
      if (b) P.L([[0.0, 0.03, 0.05], [0.14, 0.02, 0.04]]);
    }
    // manto (pliega hacia atrás al caminar)
    const back = o.walk ? -0.03 : 0;
    const d = o.child ? 0.95 : 1.28;
    P.S([[0.045 + lean * 0.6, H - 1.32 * hu], [0.1 * d + lean * 0.8, shY - 0.04], [0.135 * d + lean * 0.5, H * 0.62], [0.13 * d, hemY + 0.03], [0.07, hemY - 0.01],
      [-0.08, hemY + 0.005], [-0.175 * d + back, hemY + 0.03], [-0.16 * d + back * 0.6, H * 0.6], [-0.13 * d + lean * 0.3, shY - 0.06], [-0.06 + lean * 0.3, H - 1.1 * hu]]);
    // cabeza y cuello
    P.L([[headX - 0.015, headY - 0.3 * hu, 0.085], [lean * 0.5 - 0.01, H - 1.35 * hu, 0.1]]);
    P.E(headX + 0.005, headY + 0.01, 0.47 * hu, 0.5 * hu, -0.12);
    // pelo suelto por la espalda
    const hl = o.hair === 'long' ? 2.7 : 1.7;
    P.S([[headX + 0.02, H + 0.01 - (o.elder ? 0.035 : 0)], [headX - 0.075, headY + 0.38 * hu], [headX - 0.125, headY - 0.1 * hu], [-0.14 + lean * 0.5, H - hl * 0.7 * hu], [-0.145 + lean * 0.3, H - hl * hu],
      [-0.09 + lean * 0.3, H - (hl - 0.12) * hu], [headX - 0.075, headY - 0.6 * hu], [headX - 0.06, headY]]);
    // bastón
    if (o.staff) {
      const sx = o.walk ? 0.27 : 0.25;
      P.L([[0.08 + lean, H * 0.66, 0.075], [sx - 0.02, H * 0.61, 0.065]]);
      P.E(sx, H * 0.61, 0.04, 0.045);
      P.L([[sx + (o.walk ? 0.02 : 0), 0.0, 0.05], [sx, H + (o.elder ? 0.16 : 0.1), 0.044]]);
    } else if (!o.child) {
      // brazo bajo el manto: antebrazo visible
      P.L([[0.07, H * 0.63, 0.07], [0.12, H * 0.5, 0.06]]);
    }
    if (o.bundle === 'back') { P.E(-0.2, H - 2.35 * hu, 0.105, 0.17, 0.15); P.L([[-0.15, H - 1.6 * hu, 0.02], [0.08, H - 2.4 * hu, 0.02]]); }
    if (o.bundle === 'hip') { P.E(-0.16, H * 0.46, 0.1, 0.13, 0.2); }
  }

  // ---------- indígena agachada recolectando (perfil) ----------
  function indCrouch(P, o) {
    const s = o.H / 1.64;
    const q = (x, y) => [x * s, y * s];
    P.L([q(-0.05, 0.4).concat(0.15 * s), q(0.22, 0.42).concat(0.12 * s), q(0.18, 0.06).concat(0.08 * s)]); // muslo+pierna delantera
    P.L([q(-0.08, 0.38).concat(0.14 * s), q(0.1, 0.36).concat(0.11 * s), q(0.02, 0.05).concat(0.075 * s)]);
    P.L([q(0.16, 0.03).concat(0.05 * s), q(0.27, 0.02).concat(0.04 * s)]);
    P.L([q(-0.02, 0.05).concat(0.05 * s), q(-0.1, 0.03).concat(0.04 * s)]);
    // torso inclinado con manto
    P.S([q(-0.2, 0.2), q(-0.18, 0.5), q(-0.06, 0.8), q(0.08, 0.9), q(0.2, 0.86), q(0.22, 0.72), q(0.1, 0.5), q(0.0, 0.3)]);
    // cabeza baja y pelo colgando
    P.E(0.25 * s, 0.93 * s, 0.1 * s, 0.11 * s, -0.5);
    P.S([q(0.18, 1.02), q(0.12, 0.96), q(0.1, 0.8), q(0.16, 0.74), q(0.22, 0.8), q(0.29, 0.99)]);
    // brazo que baja a tomar algo del suelo
    P.L([q(0.14, 0.8).concat(0.075 * s), q(0.3, 0.42).concat(0.06 * s), q(0.44, 0.06).concat(0.05 * s)]);
    P.E(0.45 * s, 0.04 * s, 0.045 * s, 0.035 * s);
  }

  // ---------- sentada con rodillas arriba (perfil) ----------
  function indSeatKnees(P, o) {
    const s = o.H / 1.64, q = (x, y) => [x * s, y * s];
    P.S([q(-0.28, 0.0), q(-0.22, 0.35), q(-0.16, 0.72), q(-0.06, 0.86), q(0.06, 0.84), q(0.18, 0.62), q(0.3, 0.55), q(0.36, 0.45), q(0.4, 0.2), q(0.44, 0.0)]);
    P.L([q(0.38, 0.1).concat(0.08 * s), q(0.47, 0.02).concat(0.05 * s)]);
    P.E(-0.04 * s, 0.98 * s, 0.1 * s, 0.115 * s, -0.1);
    P.S([q(-0.02, 1.1), q(-0.13, 1.02), q(-0.17, 0.78), q(-0.1, 0.74), q(-0.05, 0.86), q(0.03, 1.02)]);
  }
  // ---------- sentada de frente ----------
  function indSeatFront(P, o) {
    const s = o.H / 1.64, q = (x, y) => [x * s, y * s];
    P.S([q(-0.36, 0.0), q(-0.3, 0.3), q(-0.24, 0.68), q(-0.13, 0.8), q(0.13, 0.8), q(0.24, 0.68), q(0.3, 0.3), q(0.36, 0.0)]);
    P.E(-0.17 * s, 0.5 * s, 0.1 * s, 0.07 * s); P.E(0.17 * s, 0.5 * s, 0.1 * s, 0.07 * s);
    P.L([q(0, 0.82).concat(0.1 * s), q(0, 0.9).concat(0.09 * s)]);
    P.E(0, 0.99 * s, 0.08 * s, 0.115 * s);
    P.S([q(-0.1, 0.99), q(-0.12, 0.84), q(-0.14, 0.74), q(0.14, 0.74), q(0.12, 0.84), q(0.1, 0.99), q(0, 1.115)]);
  }
  // ---------- anciana/o sentado en una roca con bastón (perfil) ----------
  function indSeatRock(P, o) {
    const s = o.H / 1.58, q = (x, y) => [x * s, y * s];
    P.L([q(-0.02, 0.5).concat(0.15 * s), q(0.28, 0.52).concat(0.12 * s)]); // muslo
    P.L([q(0.28, 0.52).concat(0.11 * s), q(0.32, 0.26).concat(0.1 * s), q(0.33, 0.06).concat(0.065 * s)]);
    P.L([q(0.3, 0.03).concat(0.05 * s), q(0.43, 0.02).concat(0.04 * s)]);
    P.S([q(-0.2, 0.42), q(-0.19, 0.8), q(-0.12, 1.08), q(0.04, 1.16), q(0.16, 1.02), q(0.2, 0.7), q(0.24, 0.5), q(0.0, 0.42)]);
    P.E(0.1 * s, 1.25 * s, 0.1 * s, 0.115 * s, -0.25);
    P.S([q(0.12, 1.37), q(0.0, 1.3), q(-0.05, 1.08), q(0.02, 1.02), q(0.08, 1.14), q(0.18, 1.33)]);
    P.L([q(0.12, 0.98).concat(0.07 * s), q(0.36, 0.84).concat(0.06 * s)]);
    P.E(0.38 * s, 0.84 * s, 0.04 * s, 0.045 * s);
    P.L([[0.39 * s, 0.0, 0.05], [0.38 * s, 1.7 * s, 0.044]]);
  }

  // ---------- colono de espaldas (sombrero de ala, chaqueta corta, calzón, botas) ----------
  function colBack(P, o) {
    const H = o.H, hu = H / 7.5, w = o.w || 'a';
    const walk = !!o.walk;
    const lx = walk ? -0.1 : (w === 'b' ? -0.075 : -0.09), rx = walk ? 0.12 : (w === 'b' ? 0.12 : 0.09);
    const knee = 0.28 * H, hip = H - 3.9 * hu;
    // piernas: calzón hasta la rodilla y botas
    P.L([[lx * 0.8, hip + 0.05, 0.14], [lx, knee + 0.03, 0.125]]);
    P.L([[lx, knee + 0.04, 0.11], [lx, 0.07, 0.095]]);
    P.L([[rx * 0.8, hip + 0.05, 0.14], [rx, knee + 0.02, 0.125]]);
    P.L([[rx, knee + 0.03, 0.11], [rx + (walk ? 0.01 : 0), walk ? 0.12 : 0.07, 0.095]]);
    P.E(lx, 0.035, 0.06, 0.04); P.E(rx + (walk ? 0.01 : 0), walk ? 0.085 : 0.035, 0.06, 0.04);
    // chaqueta: hombros cuadrados, cintura, faldón corto
    P.S([[-0.06, H - 1.12 * hu], [0.06, H - 1.12 * hu], [0.2, H - 1.33 * hu], [0.215, H - 1.62 * hu], [0.165, H - 2.3 * hu], [0.155, H - 3.0 * hu], [0.2, hip - 0.02],
      [0.0, hip + 0.01], [-0.2, hip - 0.02], [-0.155, H - 3.0 * hu], [-0.165, H - 2.3 * hu], [-0.215, H - 1.62 * hu], [-0.2, H - 1.33 * hu]]);
    // brazos separados del torso
    const swing = walk ? 0.03 : 0;
    P.L([[-0.205, H - 1.5 * hu, 0.095], [-0.235 - swing, H - 2.6 * hu, 0.08], [-0.245 - swing, H - 3.55 * hu, 0.068]]);
    P.L([[0.205, H - 1.5 * hu, 0.095], [0.235 + swing, H - 2.6 * hu, 0.08], [0.25 + swing, H - 3.55 * hu, 0.068]]);
    P.E(-0.25 - swing, H - 3.72 * hu, 0.038, 0.05); P.E(0.255 + swing, H - 3.72 * hu, 0.038, 0.05);
    // cuello, cabeza, coleta
    P.L([[0, H - 0.9 * hu, 0.095], [0, H - 1.25 * hu, 0.11]]);
    P.E(0, H - 0.55 * hu, 0.075, 0.47 * hu);
    P.L([[0, H - 0.9 * hu, 0.035], [0, H - 1.35 * hu, 0.03]]);
    // sombrero: copa + ala ancha (≥ 1.8× la cabeza), ala levemente caída
    const by = H - 0.1 * hu;
    P.S([[-0.085, by], [-0.078, by + 0.075], [-0.05, by + 0.105], [0.05, by + 0.105], [0.078, by + 0.075], [0.085, by]]);
    P.S([[-0.225, by - 0.022], [-0.2, by + 0.004], [-0.1, by + 0.016], [0.1, by + 0.016], [0.2, by + 0.004], [0.225, by - 0.022], [0.19, by - 0.018], [0.0, by - 0.012], [-0.19, by - 0.018]]);
    // atado al hombro
    if (o.bundle) { P.E(0.2, H - 1.75 * hu, 0.11, 0.16, -0.25); P.L([[0.12, H - 1.3 * hu, 0.03], [0.2, H - 2.4 * hu, 0.03]]); }
    // bastón de caminar (más corto que la persona)
    if (o.stick) { P.L([[0.26 + swing, H - 3.72 * hu, 0.026], [0.34, 0.0, 0.024]]); }
  }

  const DEFS = {
    iF_staff_a: (P) => indFront(P, { H: 1.7, view: 'back', hair: 'long', staff: 1, w: 'a' }),
    iF_staff_b: (P) => indFront(P, { H: 1.7, view: 'back', hair: 'long', staff: 1, w: 'b' }),
    iB_bundle_a: (P) => indFront(P, { H: 1.65, view: 'back', hair: 'long', bundle: 'hip', w: 'a' }),
    iB_bundle_b: (P) => indFront(P, { H: 1.65, view: 'back', hair: 'long', bundle: 'hip', w: 'b' }),
    iP_staff_a: (P) => indProfile(P, { H: 1.7, hair: 'long', staff: 1, w: 'a' }),
    iP_staff_b: (P) => indProfile(P, { H: 1.7, hair: 'long', staff: 1, w: 'b' }),
    iP_child_a: (P) => indProfile(P, { H: 1.12, child: 1, hair: 'short', w: 'a' }),
    iP_child_b: (P) => indProfile(P, { H: 1.12, child: 1, hair: 'short', w: 'b' }),
    iF_child_a: (P) => indFront(P, { H: 1.1, child: 1, hair: 'short', w: 'a' }),
    iF_child_b: (P) => indFront(P, { H: 1.1, child: 1, hair: 'short', w: 'b' }),
    iP_walk_elder: (P) => indProfile(P, { H: 1.58, elder: 1, hair: 'short', staff: 1, walk: 1 }),
    iP_walk_staff: (P) => indProfile(P, { H: 1.7, hair: 'long', staff: 1, walk: 1 }),
    iP_walk_child: (P) => indProfile(P, { H: 1.12, child: 1, hair: 'short', walk: 1 }),
    iP_walk_bundle: (P) => indProfile(P, { H: 1.64, hair: 'short', bundle: 'back', walk: 1 }),
    iP_walk_adult: (P) => indProfile(P, { H: 1.67, hair: 'long', walk: 1 }),
    iP_elder_a: (P) => indProfile(P, { H: 1.58, elder: 1, hair: 'short', staff: 1, w: 'a' }),
    iP_adult_a: (P) => indProfile(P, { H: 1.67, hair: 'long', w: 'a' }),
    iP_bundle_a: (P) => indProfile(P, { H: 1.66, hair: 'long', bundle: 'back', w: 'a' }),
    iP_bundle_b: (P) => indProfile(P, { H: 1.66, hair: 'long', bundle: 'back', w: 'b' }),
    iP_crouch: (P) => indCrouch(P, { H: 1.64 }),
    iP_crouch_child: (P) => indCrouch(P, { H: 1.12 }),
    iP_seat_knees: (P) => indSeatKnees(P, { H: 1.64 }),
    iF_seat: (P) => indSeatFront(P, { H: 1.66 }),
    iP_seat_rock: (P) => indSeatRock(P, { H: 1.58 }),
    cB_walk_bundle: (P) => colBack(P, { H: 1.7, walk: 1, bundle: 1 }),
    cB_walk_stick: (P) => colBack(P, { H: 1.68, walk: 1, stick: 1 }),
    cB_stand_bundle_a: (P) => colBack(P, { H: 1.7, bundle: 1, w: 'a' }),
    cB_stand_bundle_b: (P) => colBack(P, { H: 1.7, bundle: 1, w: 'b' }),
    cB_stand_stick_a: (P) => colBack(P, { H: 1.68, stick: 1, w: 'a' }),
    cB_stand_stick_b: (P) => colBack(P, { H: 1.68, stick: 1, w: 'b' }),
  };
  // altura de referencia con la que se dibujó cada celda (para escalar a la altura real de cada figura)
  const REFH = { iF_staff: 1.7, iB_bundle: 1.65, iP_staff: 1.7, iP_child: 1.12, iF_child: 1.1, iP_walk_elder: 1.58, iP_walk_staff: 1.7, iP_walk_child: 1.12, iP_walk_bundle: 1.64, iP_walk_adult: 1.67, iP_elder: 1.58, iP_adult: 1.67, iP_bundle: 1.66, iP_crouch: 1.64, iP_crouch_child: 1.12, iP_seat_knees: 1.64, iF_seat: 1.66, iP_seat_rock: 1.58, cB_walk_bundle: 1.7, cB_walk_stick: 1.68, cB_stand_bundle: 1.7, cB_stand_stick: 1.68 };

  LR.buildAtlas = function (G) {
    const names = Object.keys(DEFS);
    const rows = Math.ceil(names.length / COLS);
    const cv = document.createElement('canvas'); cv.width = CW * COLS; cv.height = CH * rows;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cv.width, cv.height);
    const index = {};
    names.forEach((n, i) => {
      const c = i % COLS, r = Math.floor(i / COLS);
      ctx.save();
      ctx.beginPath(); ctx.rect(c * CW + 1, r * CH + 1, CW - 2, CH - 2); ctx.clip();
      ctx.setTransform(CW / WM, 0, 0, -CH / HM, c * CW + CW / 2, r * CH + CH);
      ctx.fillStyle = '#fff';
      DEFS[n](mk(ctx));
      ctx.restore();
      const base = n.replace(/_[ab]$/, '');
      index[n] = { col: c, row: r, refH: REFH[base] || REFH[n] || 1.65 };
    });
    const tex = G.texture(cv, {});
    LR.mip(G, tex);
    return { tex, index, cols: COLS, rows, canvas: cv, WM, HM };
  };
})();
