/* Vista OBLICUA desde la playa de Portezuelo: cámara, G-buffer del relieve (malla GL con lectura de textura en vértices),
 * grabado estático de la tierra en un búfer 1080×2200 que luego se desplaza (inclinación = desplazamiento),
 * y lienzos estáticos de figuras (O1–O5) y de las figuras que se tallan con el tiempo (barco, colonos y bote, O6). */
(function () {
  const OB = (window.CC_OBL = {});
  const U = window.CC_U, F = window.CC_FIG;

  OB.camera = function (cfg) {
    const o = cfg.views.oblique, [cx, cy, cz] = o.cam, tip = cfg.world.tip;
    const aTip = Math.atan2(tip[1] - cy, tip[0] - cx);
    const a = aTip + (o.yawOffsetDeg * Math.PI) / 180;
    const Fw = [Math.cos(a), Math.sin(a)], R = [Fw[1], -Fw[0]];
    const f = o.focal, ybh = o.bufHorizon, k = o.k;
    return {
      C: [cx, cy, cz], F: Fw, R, f, ybh, k, W: cfg.width, BH: o.bufH,
      // mundo (x, y, h sin exagerar) → búfer (x, y) y profundidad
      project(x, y, h) { const vx = x - cx, vy = y - cy, d = vx * Fw[0] + vy * Fw[1]; return [540 + (f * (vx * R[0] + vy * R[1])) / d, ybh - (f * (k * h - cz)) / d, d]; },
      // píxel del búfer bajo el horizonte → punto del plano del mar (y = 0)
      ground(xb, yb) { const d = (f * cz) / (yb - ybh), l = ((xb - 540) * d) / f; return [cx + Fw[0] * d + R[0] * l, cy + Fw[1] * d + R[1] * l, d]; },
    };
  };
  // horizonte en pantalla en el tiempo t: casi lineal con arranque y final suaves (≥ 0,4 px/cuadro en el tramo central)
  OB.horizonAt = function (cfg, t) {
    const [[t0, y0], [t1, y1]] = cfg.views.oblique.horizon;
    const u = PBS.clamp((t - t0) / (t1 - t0), 0, 1), e = 0.06;
    let s;
    if (u < e) s = (u * u) / (2 * e); else if (u > 1 - e) s = 1 - ((1 - u) * (1 - u)) / (2 * e); else s = u - e / 2;
    s /= 1 - e;
    return y0 + (y1 - y0) * PBS.clamp(s, 0, 1);
  };

  const meshVS = `#version 300 es
precision highp float;
in vec2 g;
uniform sampler2D bake; uniform vec4 ext, box; uniform vec2 C, Fw, R; uniform float f, ybh, k, cz, BH;
out vec4 v;
void main(){
  vec2 w = mix(box.xy, box.zw, g);
  vec2 bu = (w - ext.xy)/(ext.zw - ext.xy);
  float h = texture(bake, bu).r;
  float z = k*max(h, 0.);
  vec2 d2 = w - C; float d = dot(d2, Fw), l = dot(d2, R);
  float xs = 540. + f*l/d, ys = ybh - f*(z - cz)/d;
  float near = 60., far = 6000.;
  float zn = (d - near)/(far - near)*2. - 1.;
  gl_Position = vec4((xs/1080.*2. - 1.)*d, (1. - ys/BH*2.)*d, zn*d, d);
  v = vec4(h, d, w);
}`;
  const meshFS = `#version 300 es
precision highp float;
in vec4 v; out vec4 o;
void main(){ o = v; }`;

  // Grabado estático de la tierra: R tinta granito, G tinta pasto, B ocre (sendero), A máscara de tierra
  function landFS(cfg) {
    const tr = cfg.world.trail;
    const segs = tr.slice(0, -1).map((p, i) => `seg(w, vec2(${p[0].toFixed(1)},${p[1].toFixed(1)}), vec2(${tr[i + 1][0].toFixed(1)},${tr[i + 1][1].toFixed(1)}), acc, best, bs); acc += ${Math.hypot(tr[i + 1][0] - p[0], tr[i + 1][1] - p[1]).toFixed(1)};`).join('\n  ');
    const notches = cfg.world.notches.map((q) => `notch = max(notch, exp(-pow((w.y - ${q.y.toFixed(1)})/${(q.w * 0.9).toFixed(1)}, 2.)));`).join('\n  ');
    return window.CC_SH.common + `
uniform sampler2D gb, bake; uniform vec4 ext; uniform vec2 texel; uniform float k, BH;
uniform vec3 sunD;
void seg(vec2 p, vec2 a, vec2 b, float acc, inout float best, inout float bs){
  vec2 ab = b - a; float L = length(ab); float t = clamp(dot(p - a, ab)/(L*L), 0., 1.); float d = length(p - a - ab*t);
  if (d < best) { best = d; bs = acc + t*L; }
}
void main(){
  vec2 px = vec2(uv.x*1080., (1. - uv.y)*BH);
  vec4 g = texture(gb, uv);
  float h = g.r, d = g.g; vec2 w = g.ba;
  float landM = step(1., d)*smoothstep(.02, .25, h);
  // bordes por salto de profundidad (perfil de la cresta contra el cielo, cantos del acantilado)
  float dj = 0.;
  for (int i = 0; i < 4; i++) {
    vec2 off = (i == 0 ? vec2(1.3, 0.) : i == 1 ? vec2(-1.3, 0.) : i == 2 ? vec2(0., 1.3) : vec2(0., -1.3))*texel;
    vec4 q = texture(gb, uv + off);
    float dq = q.g < 1. ? 1e5 : q.g;
    float lq = step(1., q.g)*step(.02, q.r);
    float jump = abs(dq - d)/max(d, 1.);
    dj = max(dj, landM*(step(.035, jump) + (1. - lq)));
  }
  if (d < 1.) { o = vec4(0.); return; }
  // normal del relieve (con exageración) desde la textura del mundo
  vec2 bu = (w - ext.xy)/(ext.zw - ext.xy);
  vec2 e = vec2(1.7, 0.);
  vec4 B = texture(bake, bu);
  float hx = texture(bake, bu + e.xy/(ext.zw - ext.xy)).r - texture(bake, bu - e.xy/(ext.zw - ext.xy)).r;
  float hy = texture(bake, bu + e.yx/(ext.zw - ext.xy)).r - texture(bake, bu - e.yx/(ext.zw - ext.xy)).r;
  vec3 n = normalize(vec3(-k*hx/(2.*e.x), -k*hy/(2.*e.x), 1.));
  float lam = dot(n, sunD);
  float slope = degrees(acos(clamp(n.z, 0., 1.)));
  float rock = B.g;
  float shade = clamp(.55 - lam*2.2, 0., 1.);       // 0 = luz rasante en lo alto, 1 = cara oeste en sombra
  // curvas cada 3 m con nivel de detalle: nunca a menos de 13 px
  float Fh = h/3.;
  float fw = max(fwidth(Fh), 1e-5);
  float lod = max(0., log2(fw*13.));
  float L0 = floor(lod), fr = lod - L0;
  float s0 = exp2(L0), s1 = exp2(L0 + 1.);
  float wob = (vnoise(px/9.) - .5)*.7;
  float hw = mix(1.1, 3.0, shade*shade)*mix(1., .8, smoothstep(0., 1., fr)) + wob*.5;
  float c0 = lineCov(isoDist(Fh/s0), hw), c1 = lineCov(isoDist(Fh/s1), hw);
  // diaclasas: las curvas del granito se interrumpen a trechos (fracturas), fijo en el mundo
  float joint = smoothstep(.18, .3, vnoise(vec2(w.x + w.y*.3, h*6.)/vec2(7., 1.3)));
  float cont = mix(c0, c1, smoothstep(.55, 1., fr))*landM*mix(1., joint, rock);
  // trama cruzada en caras empinadas en sombra (60° y 120° de pantalla, 13 px)
  float steep = smoothstep(56., 68., slope)*smoothstep(.9, 1., shade);
  vec2 a1 = vec2(cos(radians(60.)), sin(radians(60.))), a2 = vec2(cos(radians(120.)), sin(radians(120.)));
  float hwX = mix(.2, 1.35, steep);
  float x1 = lineCov(abs(fract(dot(px, vec2(-a1.y, a1.x))/13. + .5) - .5)*13., hwX)*step(.05, steep)*step(.55, vnoise(w/6. + 5.));
  float deep = smoothstep(52., 64., slope)*smoothstep(.95, 1., shade);
  float x2 = lineCov(abs(fract(dot(px, vec2(-a2.y, a2.x))/13. + .5) - .5)*13., mix(.2, 1.2, deep))*step(.05, deep);
  float cross = x1*landM; x2;
  // grutas: cuñas oscuras al pie del acantilado
  float notch = 0.;
  ${notches}
  notch *= (1. - smoothstep(4., 14., h))*step(.5, rock + shade)*landM;
  float nC = smoothstep(.35, .55, notch);
  // sendero: línea de puntos ocre a lo largo de la cresta
  float best = 1e9, bs = 0., acc = 0.;
  ${segs}
  float dotP = fract(bs*2059./(d*11.));
  float trail = (1. - smoothstep(3.5, 6.5, best))*lineCov(abs(dotP - .5)*11., 1.9)*landM*step(.5, 1. - nC);
  float outline = lineCov(0., 1.25)*min(dj, 1.);
  float granite = max(max(cont*mix(.35, 1., rock), cross), max(nC, outline));
  float grass = cont*(1. - rock)*(1. - step(.5, granite));
  o = vec4(granite, grass, trail, landM);
}`;
  }

  OB.buildLand = function (G, cfg, terr, cam) {
    const gl = G.gl, W = cfg.width, BH = cam.BH, o = cfg.views.oblique;
    const t0 = performance.now();
    // programa de malla propio
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, meshVS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, meshFS));
    gl.bindAttribLocation(prog, 0, 'g');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    const N = o.mesh;
    const verts = new Float32Array(N * N * 2);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { verts[(j * N + i) * 2] = i / (N - 1); verts[(j * N + i) * 2 + 1] = j / (N - 1); }
    const idx = new Uint32Array((N - 1) * (N - 1) * 6);
    let q = 0;
    for (let j = 0; j < N - 1; j++) for (let i = 0; i < N - 1; i++) { const a = j * N + i; idx[q++] = a; idx[q++] = a + 1; idx[q++] = a + N; idx[q++] = a + 1; idx[q++] = a + N + 1; idx[q++] = a + N; }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    // G-buffer RGBA32F + profundidad
    const gt = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, gt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, BH, 0, gl.RGBA, gl.FLOAT, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, gt, 0);
    const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, BH);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    gl.viewport(0, 0, W, BH);
    gl.clearColor(-100, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LESS);
    gl.useProgram(prog);
    const U1 = (n) => gl.getUniformLocation(prog, n);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, terr.bakeTex); gl.uniform1i(U1('bake'), 0);
    const ext = cfg.world.extent, box = o.box;
    gl.uniform4fv(U1('ext'), ext); gl.uniform4fv(U1('box'), box);
    gl.uniform2fv(U1('C'), cam.C.slice(0, 2)); gl.uniform2fv(U1('Fw'), cam.F); gl.uniform2fv(U1('R'), cam.R);
    gl.uniform1f(U1('f'), cam.f); gl.uniform1f(U1('ybh'), cam.ybh); gl.uniform1f(U1('k'), cam.k); gl.uniform1f(U1('cz'), cam.C[2]); gl.uniform1f(U1('BH'), BH);
    gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0);
    gl.disable(gl.DEPTH_TEST);
    gl.bindVertexArray(null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0, 0, 0, 0);
    // grabado de la tierra
    const tgt = G.target(W, BH);
    const az = (cfg.views.hachure.sunAz * Math.PI) / 180, el = (cfg.views.hachure.sunEl * Math.PI) / 180;
    const lp = G.program(landFS(cfg));
    return {
      render(draw) {
        draw(lp, { gb: gt, bake: terr.bakeTex, ext, texel: [1 / W, 1 / BH], k: cam.k, BH, sunD: [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)] }, tgt);
        gl.deleteBuffer(vb); gl.deleteBuffer(ib); gl.deleteVertexArray(vao); gl.deleteRenderbuffer(rb); gl.deleteFramebuffer(fb);
        return { tex: tgt.tex, gbuf: gt, ms: performance.now() - t0 };
      },
    };
  };

  // Cumbre visible más alta (px de búfer) para verificar que en el cierre toda la sierra queda bajo y = 900.
  OB.ridgeTop = function (cfg, terr, cam) {
    const [x0, y0, x1, y1] = cfg.world.extent, R = terr.R, cell = (x1 - x0) / R;
    let top = 1e9, at = null;
    for (let Y = 0; Y < R; Y += 1) for (let X = 0; X < R; X += 1) {
      const h = terr.H[Y * R + X]; if (h < 3) continue;
      const wx = x0 + (X + 0.5) * cell, wy = y0 + (Y + 0.5) * cell;
      const [xs, ys, d] = cam.project(wx, wy, h); if (d < 50 || xs < -2 || xs > 1082) continue;
      if (ys < top) { top = ys; at = [wx, wy, h, xs]; }
    }
    return { top, at };
  };

  // ---------------- figuras (lienzos estáticos en coordenadas de búfer) ----------------
  const tEnc = (t) => Math.max(1, Math.min(255, Math.round(((t - 20) / 20) * 254) + 1));

  OB.buildFigures = function (cfg, cam, seed) {
    const W = cfg.width, BH = cam.BH, fc = cfg.figures;
    const t0 = performance.now();
    const statInk = new Float32Array(W * BH), statMask = new Float32Array(W * BH);
    const dyn = new Uint8Array(W * BH * 4); // R talla, G tiempo talla, B núcleo, A tiempo núcleo
    const dynMaskT = new Float32Array(W * BH); // tiempo (codificado 0..1) de la máscara dinámica
    const dynBoxes = [];
    const put = (arr, o, src, fn) => { for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const X = x + o.x0, Y = y + o.y0; if (X < 0 || Y < 0 || X >= W || Y >= BH) continue; const v = src[y * o.w + x]; if (v > 0) fn(Y * W + X, v, y * o.w + x); } };
    const figs = [];
    const adultAt = (d) => (cam.f * 1.7) / d;
    for (const f of fc.oblique) {
      const footY = cam.ybh + (cam.f * cam.C[2]) / f.d + (f.rock ? (0.0 * cam.f) / f.d : 0);
      const lift = f.rock ? (0.3 * cam.f) / f.d : 0;
      const fig = F.build(f.pose, f.x, footY - lift, adultAt(f.d), f.facing);
      figs.push({ f, fig, footY, lift });
    }
    // roca baja bajo O4
    const rockParts = [];
    for (const { f, fig, footY, lift } of figs) if (f.rock) {
      const s = adultAt(f.d) / 750, cx = f.x + 10 * s, w = 150 * s, hh = lift + 4;
      const p = new Path2D();
      p.moveTo(cx - w, footY); p.bezierCurveTo(cx - w * 0.95, footY - hh * 0.9, cx - w * 0.4, footY - hh * 1.05, cx + w * 0.1, footY - hh);
      p.bezierCurveTo(cx + w * 0.6, footY - hh * 0.98, cx + w * 1.05, footY - hh * 0.6, cx + w * 1.08, footY); p.closePath();
      rockParts.push({ name: 'rock', edge: true, path: p, hatch: { dir: [Math.cos(0.15), -Math.sin(0.15)] }, bb: [cx - w, footY - hh, cx + w * 1.08, footY] });
    }
    for (const r of rockParts) { const O4 = figs.find((q) => q.f.rock); O4.fig.parts.unshift(r); O4.fig.bb = [Math.min(O4.fig.bb[0], r.bb[0]), O4.fig.bb[1], Math.max(O4.fig.bb[2], r.bb[2]), Math.max(O4.fig.bb[3], r.bb[3])]; O4.fig.footY = O4.footY; }
    // bote varado (se talla con los colonos)
    const bt = fc.boat;
    const bs = adultAt(bt.d) / 750, by = cam.ybh + (cam.f * cam.C[2]) / bt.d;
    const boat = { pose: 'boat', parts: [], s: bs, footX: bt.x, footY: by, facing: 1 };
    {
      const L = 520 * bs, Hh = 110 * bs, x = bt.x, y = by;
      const hull = new Path2D();
      hull.moveTo(x - L * 0.5, y - Hh * 0.85); hull.bezierCurveTo(x - L * 0.2, y - Hh * 0.62, x + L * 0.25, y - Hh * 0.62, x + L * 0.52, y - Hh * 1.05);
      hull.bezierCurveTo(x + L * 0.46, y - Hh * 0.35, x + L * 0.3, y + Hh * 0.02, x, y); hull.bezierCurveTo(x - L * 0.3, y, x - L * 0.45, y - Hh * 0.3, x - L * 0.5, y - Hh * 0.85); hull.closePath();
      boat.parts.push({ name: 'hull', edge: true, path: hull, hatch: { dir: [1, 0.08] }, bb: [x - L * 0.5, y - Hh * 1.05, x + L * 0.52, y] });
      const gun = new Path2D(); gun.moveTo(x - L * 0.5, y - Hh * 0.85); gun.bezierCurveTo(x - L * 0.2, y - Hh * 0.62, x + L * 0.25, y - Hh * 0.62, x + L * 0.52, y - Hh * 1.05);
      gun.lineTo(x + L * 0.5, y - Hh * 0.9); gun.bezierCurveTo(x + L * 0.2, y - Hh * 0.46, x - L * 0.2, y - Hh * 0.46, x - L * 0.48, y - Hh * 0.72); gun.closePath();
      boat.parts.push({ name: 'inside', edge: true, path: gun, hatch: { dir: [0.2, 1] }, bb: [x - L * 0.5, y - Hh * 1.05, x + L * 0.52, y - Hh * 0.46] });
      boat.bb = [x - L * 0.5, y - Hh * 1.05, x + L * 0.52, y]; boat.heightPx = Hh * 1.05;
    }
    // barco fondeado cerca del horizonte, más allá de la punta: casco bajo, dos palos, velas aferradas; sin banderas
    const sp = fc.ship;
    const ship = { pose: 'ship', parts: [], footX: sp.x, footY: cam.ybh + 2, facing: 1 };
    {
      const L = sp.hull, x = sp.x, y = cam.ybh + 2.5, hh = 7;
      const hull = new Path2D();
      hull.moveTo(x - L * 0.5, y - hh); hull.lineTo(x + L * 0.5, y - hh - 1.5); hull.lineTo(x + L * 0.42, y); hull.lineTo(x - L * 0.44, y + 0.5); hull.closePath();
      ship.parts.push({ name: 'hull', path: hull, hatch: { dir: [1, 0] }, bb: [x - L * 0.5, y - hh - 2, x + L * 0.5, y + 1] });
      const mast = (mx, top) => { const p = new Path2D(); p.rect(mx - 1.2, y - top, 2.4, top - hh + 1); return p; };
      ship.parts.push({ name: 'm1', path: mast(x - L * 0.14, 46), hatch: { dir: [0, 1] }, bb: [x - L * 0.14 - 2, y - 46, x - L * 0.14 + 2, y] });
      ship.parts.push({ name: 'm2', path: mast(x + L * 0.18, 38), hatch: { dir: [0, 1] }, bb: [x + L * 0.18 - 2, y - 38, x + L * 0.18 + 2, y] });
      const furl = (mx, yy, w) => { const p = new Path2D(); p.ellipse(mx, yy, w, 2.2, 0, 0, Math.PI * 2); return p; };
      ship.parts.push({ name: 'f1', path: furl(x - L * 0.14, y - 38, 11), hatch: { dir: [1, 0] }, bb: [x - L * 0.14 - 12, y - 41, x - L * 0.14 + 12, y - 35] });
      ship.parts.push({ name: 'f2', path: furl(x - L * 0.14, y - 26, 14), hatch: { dir: [1, 0] }, bb: [x - L * 0.14 - 15, y - 29, x - L * 0.14 + 15, y - 23] });
      ship.parts.push({ name: 'f3', path: furl(x + L * 0.18, y - 30, 10), hatch: { dir: [1, 0] }, bb: [x + L * 0.18 - 11, y - 33, x + L * 0.18 + 11, y - 27] });
      // gavia a medio aferrar en el trinquete
      const sail = new Path2D(); sail.moveTo(x + L * 0.18 - 9, y - 30); sail.lineTo(x + L * 0.18 + 9, y - 30); sail.lineTo(x + L * 0.18 + 7, y - 19); sail.lineTo(x + L * 0.18 - 8, y - 20); sail.closePath();
      ship.parts.push({ name: 'sail', path: sail, hatch: { dir: [0, 1] }, bb: [x + L * 0.18 - 9, y - 30, x + L * 0.18 + 9, y - 19] });
      ship.bb = [x - L * 0.5, y - 47, x + L * 0.5, y + 1]; ship.heightPx = 48;
    }
    // render de cada figura
    const shadowK = { len: 1.05, shear: 0.42 };
    figs.sort((a, b) => b.f.d - a.f.d);
    for (const { f, fig } of figs) {
      const isDyn = !!f.cut;
      const o = F.renderDay(fig, { shadow: shadowK, dyn: isDyn, erode: fig.heightPx < 150 ? 3 : 5 });
      if (!isDyn) {
        put(statInk, o, o.shadow, (i, v) => (statInk[i] = Math.max(statInk[i], v)));
        put(statMask, o, o.mask, (i, v) => (statMask[i] = Math.max(statMask[i], v)));
        for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) { const X = x + o.x0, Y = y + o.y0; if (X < 0 || Y < 0 || X >= W || Y >= BH) continue; const li = y * o.w + x, m = o.mask[li]; if (m <= 0) continue; const i = Y * W + X; statInk[i] = Math.max(statInk[i] * (1 - m), o.ink[li]); }
      } else {
        dynBoxes.push([o.x0, o.y0, o.w, o.h]);
        const [a, b] = f.cut, end = f.cutEnd || 1;
        const T = (u) => tEnc(a + ((b - a) * u) / end);
        for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
          const X = x + o.x0, Y = y + o.y0; if (X < 0 || Y < 0 || X >= W || Y >= BH) continue;
          const i = y * o.w + x, j = (Y * W + X) * 4;
          const hc = o.hatch[i] * (o.inside[i] ? 1 : 0) * (1 - o.gap[i]);
          if (hc > 0.02) { dyn[j] = Math.max(dyn[j], Math.round(hc * 255)); dyn[j + 1] = T(o.hTime[i]); }
          const cc = Math.max(o.core[i] * (1 - o.gap[i]), o.contact[i], o.shadow ? o.shadow[i] : 0);
          if (cc > 0.02) { dyn[j + 2] = Math.max(dyn[j + 2], Math.round(cc * 255)); dyn[j + 3] = T(o.contact[i] > 0.02 || (o.shadow && o.shadow[i] > 0.02) ? 1 : o.cTime[i]); }
          if (o.mask[i] > 0.5) { const tm = (tEnc(a + ((b - a) * o.mTime[i]) / end) - 1) / 254; dynMaskT[Y * W + X] = dynMaskT[Y * W + X] > 0 ? Math.min(dynMaskT[Y * W + X], tm + 0.004) : tm + 0.004; }
        }
      }
    }
    for (const [obj, cut] of [[boat, bt.cut], [ship, [sp.at, sp.at + sp.dur]]]) {
      const o = F.renderDay(obj, { dyn: true, erode: obj === ship ? 1.2 : 3, spacing: obj === ship ? 4 : 7, width: obj === ship ? 1.6 : 3.2, contactW: obj === ship ? 0.0001 : 0.7, ring: obj === ship ? 1 : 1.5, edgeMinPx: 1e9 });
      dynBoxes.push([o.x0, o.y0, o.w, o.h]);
      const [a, b] = cut; const T = (u) => tEnc(a + (b - a) * u);
      for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) {
        const X = x + o.x0, Y = y + o.y0; if (X < 0 || Y < 0 || X >= W || Y >= BH) continue;
        const i = y * o.w + x, j = (Y * W + X) * 4;
        const hc = o.hatch[i] * (o.inside[i] ? 1 : 0);
        if (hc > 0.02) { dyn[j] = Math.max(dyn[j], Math.round(hc * 255)); dyn[j + 1] = T(o.hTime[i]); }
        const cc = obj === ship ? o.core[i] : Math.max(o.core[i], o.contact[i]);
        if (cc > 0.02) { dyn[j + 2] = Math.max(dyn[j + 2], Math.round(cc * 255)); dyn[j + 3] = T(o.cTime[i]); }
        if (o.mask[i] > 0.5) { const tm = (T(o.mTime[i]) - 1) / 254; dynMaskT[Y * W + X] = dynMaskT[Y * W + X] > 0 ? Math.min(dynMaskT[Y * W + X], tm + 0.004) : tm + 0.004; }
      }
    }
    // arena: punteado estático (más denso en la franja húmeda) y algunas líneas de forma largas y suaves
    const sandC = U.canvas(W, BH), sx = sandC.getContext('2d', { willReadFrequently: true });
    sx.fillStyle = '#fff'; sx.strokeStyle = '#fff';
    const r = PBS.rng(seed + 77);
    const dwAt = (xb) => OB.waterD(cfg, xb);
    for (let Y = cam.ybh + 150; Y < BH; Y += 7) for (let X = 0; X < W; X += 7) {
      const px = X + r() * 5, py = Y + r() * 5, dw = dwAt(px), d = (cam.f * cam.C[2]) / (py - cam.ybh);
      if (d > dw + 1.5) continue;
      const wet = Math.max(0, 1 - (dw - d) / 5);
      const dens = 0.38 + 0.5 * wet;
      if (r() > dens) continue;
      const rad = 1.2 + 0.35 * wet + 0.25 * r();
      sx.beginPath(); sx.arc(px, py, rad, 0, Math.PI * 2); sx.fill();
    }
    sx.lineCap = 'round';
    for (let k = 0; k < 0; k++) { // (sin líneas de forma: se leían como cuerdas sobre la arena)
      const dd = [17.2][k];
      sx.lineWidth = 2.3; sx.beginPath();
      let first = true;
      for (let X = -10; X <= 760; X += 12) {
        const dw = dwAt(X), d = Math.min(dw - 3.5, dw * (dd / 21));
        const Y = cam.ybh + (cam.f * cam.C[2]) / d + Math.sin(X / 170 + k) * 3;
        if (first) { sx.moveTo(X, Y); first = false; } else sx.lineTo(X, Y);
      }
      sx.setLineDash([260 + k * 90, 120 + k * 60]); sx.stroke();
    }
    // dilatar los canales de tiempo 2 px para que el filtrado bilineal no adelante los bordes
    const dil = (get, set, n) => {
      for (const [bx, by, bw, bh] of dynBoxes) {
        const x0 = Math.max(1, bx - 3), y0 = Math.max(1, by - 3), x1 = Math.min(W - 2, bx + bw + 3), y1 = Math.min(BH - 2, by + bh + 3), ww = x1 - x0 + 1;
        for (let it = 0; it < n; it++) {
          const snap = new Float32Array(ww * (y1 - y0 + 3));
          for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0; x <= x1; x++) snap[(y - y0 + 1) * ww + (x - x0)] = get(y * W + x);
          for (let y = y0; y <= y1; y++) for (let x = x0 + 1; x < x1; x++) {
            const k = (y - y0 + 1) * ww + (x - x0); if (snap[k] > 0) continue;
            const v = Math.max(snap[k - 1], snap[k + 1], snap[k - ww], snap[k + ww]); if (v > 0) set(y * W + x, v);
          }
        }
      }
    };
    dil((i) => dyn[i * 4 + 1], (i, v) => (dyn[i * 4 + 1] = v), 2);
    dil((i) => dyn[i * 4 + 3], (i, v) => (dyn[i * 4 + 3] = v), 2);
    dil((i) => dynMaskT[i], (i, v) => (dynMaskT[i] = v), 2);
    const sand = U.alpha(sandC);
    for (let i = 0; i < W * BH; i++) sand[i] *= 1 - statMask[i];
    const t1 = performance.now();
    return {
      stat: U.pack8(W, BH, statInk, statMask, sand, dynMaskT), dyn,
      shipBox: [ship.bb[0] - 4, ship.bb[1] - 4, ship.bb[2] + 4, ship.bb[3] + 4],
      ms: t1 - t0, figs,
    };
  };

  // Línea de agua de la playa en primer plano: distancia (m) según la x de búfer; se abre a la derecha, donde la playa sale.
  OB.waterD = function (cfg, xb) {
    const K = [[-40, 23.5], [150, 22.4], [330, 21.4], [560, 20.2], [700, 19.9], [800, 21.5], [880, 27], [960, 33], [1040, 37], [1120, 40]];
    if (xb <= K[0][0]) return K[0][1];
    for (let i = 0; i < K.length - 1; i++) if (xb <= K[i + 1][0]) { const u = (xb - K[i][0]) / (K[i + 1][0] - K[i][0]), s = u * u * (3 - 2 * u); return K[i][1] + (K[i + 1][1] - K[i][1]) * s; }
    return K[K.length - 1][1];
  };
  OB.waterGLSL = function () {
    const K = [[-40, 23.5], [150, 22.4], [330, 21.4], [560, 20.2], [700, 19.9], [800, 21.5], [880, 27], [960, 33], [1040, 37], [1120, 40]];
    let s = `float waterD(float x){\n  float v = ${K[0][1].toFixed(2)};\n`;
    for (let i = 0; i < K.length - 1; i++) s += `  v = mix(v, mix(${K[i][1].toFixed(2)}, ${K[i + 1][1].toFixed(2)}, smoothstep(${K[i][0].toFixed(1)}, ${K[i + 1][0].toFixed(1)}, x)), step(${K[i][0].toFixed(1)}, x));\n`;
    return s + '  return v;\n}\n';
  };
})();
