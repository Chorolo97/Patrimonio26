/* Mundo: horneado del relieve (GL), lectura a JS, pendiente, máscaras, distancia a la costa (EDT) y tiempos de aparición.
 * Convención de rejillas en JS: fila 0 = SUR (y0), columna 0 = OESTE (x0). Texturas sin volteo: uv.y = 0 → sur. */
(function () {
  const T = (window.CC_TERRAIN = {});
  const U = window.CC_U;
  const f1 = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));

  // Polígono de tierra (bahías y playas); la sierra se suma por encima con un máximo suave.
  // Chaikin (curva abierta, extremos fijos): medias lunas suaves y cóncavas en vez de segmentos con esquinas
  function chaikin(pts, it) {
    let a = pts;
    for (let k = 0; k < it; k++) {
      const b = [a[0]];
      for (let i = 0; i < a.length - 1; i++) { const p = a[i], q = a[i + 1]; b.push([0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]], [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]]); }
      b.push(a[a.length - 1]); a = b;
    }
    return a;
  }
  T.chaikin = chaikin;
  function landPolygon(W) {
    const west = chaikin(W.westBeach, 4).reverse();
    const cut = [[-60, 1150], [20, 900], [58, 640], [150, 600]];
    const east = chaikin(W.eastBeach, 4);
    const [x0, y0, x1, y1] = W.extent;
    return [...west, ...cut, ...east, [x1 + 200, east[east.length - 1][1]], [x1 + 200, y1 + 200], [x0 - 200, y1 + 200], [x0 - 200, west[0][1]]];
  }

  function bakeShader(W) {
    const n = W.spine.length;
    const sp = W.spine.map((p) => `vec2(${f1(p[0])},${f1(p[1])})`).join(',');
    const sc = W.crest.map((c) => f1(c)).join(',');
    const notch = W.notches.map((q) => `dent += ${f1(q.d)} * exp(-pow((p.y - ${f1(q.y)}) / ${f1(q.w * 0.6)}, 2.));`).join('\n  ');
    return `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D poly; uniform vec4 ext;
${PBS.GLSL_NOISE}
const vec2 SP[${n}] = vec2[${n}](${sp});
const float SC[${n}] = float[${n}](${sc});
float ridged(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ float q = 1.-abs(2.*vnoise(p)-1.); s += a*q*q; p = p*2.03+vec2(3.1,1.7); a*=.5; } return s/.9375; }
float smax(float a, float b, float k){ float h = clamp(.5+.5*(a-b)/k, 0., 1.); return mix(b, a, h) + k*h*(1.-h); }
float westP(float sd, float pw, float Ww){ float u = max(0., -sd - .3*pw)/Ww; return 1. - smoothstep(.12, 1., u); }
void main(){
  vec2 p = mix(ext.xy, ext.zw, uv);
  float best = 1e9, sd = 0., hc = 0., sa = 0., acc = 0.;
  for (int i = 0; i < ${n - 1}; i++) {
    vec2 a = SP[i], b = SP[i+1], ab = b - a; float L = length(ab);
    float t = clamp(dot(p - a, ab)/(L*L), 0., 1.); vec2 q = a + ab*t; float d = length(p - q);
    if (d < best) { best = d; vec2 tg = ab/L; vec2 nn = vec2(-tg.y, tg.x); float side = dot(p - q, nn);
      sd = (side < 0. ? -1. : 1.) * d; hc = mix(SC[i], SC[i+1], t); sa = acc + t*L; }
    acc += L;
  }
  sd += (fbm(p/420. + 4.) - .5)*2.*(sd > 0. ? 40. : 6.);
  if (sd < 0.) sd += (fbm(p/55. + 11.) - .5)*2.*9.;
  float Ww = mix(${f1(W.Ww[0])}, ${f1(W.Ww[1])}, vnoise(vec2(sa/380., 3.1)));
  float We = mix(${f1(W.We[0])}, ${f1(W.We[1])}, vnoise(vec2(sa/650., 7.7))) * (.3 + .7*smoothstep(4., 50., hc));
  float pw = mix(${f1(W.plateau[0])}, ${f1(W.plateau[1])}, vnoise(vec2(sa/420., 1.3)));
  float dent = 0.;
  ${notch}
  float prof;
  if (sd < 0.) {
    float pN = westP(sd, pw, Ww), pD = westP(sd - dent, pw, Ww);
    prof = mix(pD, pN, smoothstep(.12, .5, pN));
  } else {
    float u = max(0., sd - .7*pw)/We; prof = pow(max(0., 1. - u), 1.6);
    // cárcavas: pequeños valles que bajan por la ladera este
    float gph = sa/210. + .7*fbm(p/300. + 2.) + u*.5;
    float gv = (fract(gph) - .5)*2.;
    float gd = exp(-gv*gv*7.) * smoothstep(.05, .3, u) * (1. - smoothstep(.55, .95, u)) * (.6 + .8*vnoise(vec2(floor(gph), 3.)));
    prof -= gd*.06*(1. - u*.4);
    prof = max(prof, 0.);
  }
  float hr = hc*prof;
  float top = .92*hc; if (hr > top) hr = top + (hr - top)*.3;
  float drop = ${f1(W.drop)};
  hr -= drop*(1. - prof);
  // nudos de granito en cresta y acantilado
  float rockZone = smoothstep(.25, .9, prof) * (sd < 0. ? 1. : smoothstep(.75, .97, prof)) * smoothstep(3., 16., hc);
  float kn = (ridged(p/95.) - .55)*8.;
  hr += kn*rockZone;
  // plataforma rocosa y bloques en la punta
  vec2 tip = SP[${n - 1}];
  float dt = length(p - tip);
  float plat = 1. - smoothstep(20., 95., dt);
  float rocks = plat*(3.6*pow(ridged(p/11. + 5.), 2.4) - .9) - (1. - plat)*3.;
  // base: playas, pradera y lomas a partir de la distancia firmada al polígono de tierra
  float s = texture(poly, uv).r;
  float base;
  if (s >= 0.) {
    float sw = mix(45., 80., vnoise(p/300.));
    float sand = mix(.4, 2., smoothstep(0., sw, s));
    float prad = 2. + 2.2*smoothstep(sw, sw + 450., s) + (vnoise(p/700.) - .5)*1.2*smoothstep(60., 260., s);
    base = mix(sand, prad, smoothstep(sw*.7, sw*1.3, s));
    // lomas suaves tierra adentro (colinas redondeadas, sin ruido fino)
    vec2 q1 = (p - vec2(-700., 2230.))/vec2(380., 230.), q2 = (p - vec2(560., 2330.))/vec2(420., 250.), q3 = (p - vec2(250., 2150.))/vec2(260., 180.);
    float lom = 13.5*exp(-dot(q1, q1)) + 12.5*exp(-dot(q2, q2)) + 7.*exp(-dot(q3, q3)) + 3.*smoothstep(1700., 2700., p.y)
              + 9.*(fbm(p/360. + 9.) - .38)*smoothstep(1050., 1700., p.y);
    base += lom * smoothstep(80., 300., s);
  } else {
    base = max(.4 + s*.06, ${f1(W.seaFloor[0])} + (${f1(W.seaFloor[1] - W.seaFloor[0])})*smoothstep(40., 900., -s));
  }
  float h = smax(base, hr, 5.);
  h = max(h, rocks);
  o = vec4(h, rockZone*step(4., hr), 0., 1.);
}`;
  }

  // Pase de derivación: roca (pendiente), arena y D → textura final del mundo (R h, G roca, B arena, A D)
  const deriveFS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D hb, aux, poly, Dt; uniform vec2 texel; uniform float cellM;
float sm(float a, float b, float v){ return smoothstep(a, b, v); }
void main(){
  vec4 c = texture(hb, uv);
  float h = c.r;
  float hx = texture(hb, uv + vec2(texel.x, 0.)).r - texture(hb, uv - vec2(texel.x, 0.)).r;
  float hy = texture(hb, uv + vec2(0., texel.y)).r - texture(hb, uv - vec2(0., texel.y)).r;
  float slope = degrees(atan(length(vec2(hx, hy))/(2.*cellM)));
  float rock = min(1., sm(21., 29., slope) + c.g*.85) * step(-.5, h);
  vec4 A = texture(aux, uv);
  float s = texture(poly, uv).r;
  float sand = sm(-8., -1., s)*(1. - sm(60., 90., s))*(1. - sm(1.8, 2.8, h))*(1. - rock);
  o = vec4(h, rock, sand, texture(Dt, uv).r);
}`;
  const downFS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o; uniform sampler2D hb;
void main(){ o = texture(hb, uv); }`;

  T.build = function (G, cfg, rng) {
    const W = cfg.world, gl = G.gl;
    const [x0, y0, x1, y1] = W.extent, ew = x1 - x0, eh = y1 - y0;
    const t0 = performance.now();
    // 1) polígono de tierra → distancia firmada (m) a 1024²
    const R = W.edtRes;
    const pc = U.canvas(R, R), px = pc.getContext('2d', { willReadFrequently: true });
    const poly = landPolygon(W);
    px.fillStyle = '#fff'; px.beginPath();
    poly.forEach((p, i) => { const X = ((p[0] - x0) / ew) * R, Y = ((p[1] - y0) / eh) * R; i ? px.lineTo(X, Y) : px.moveTo(X, Y); });
    px.closePath(); px.fill();
    const pa = U.alpha(pc);
    const ins = new Uint8Array(R * R); for (let i = 0; i < R * R; i++) ins[i] = pa[i] > 0.5 ? 1 : 0;
    const polySdf = U.sdf(ins, R, R);
    const cell = ew / R;
    const polyData = new Float32Array(R * R * 4);
    for (let i = 0; i < R * R; i++) polyData[i * 4] = polySdf[i] * cell;
    const polyTex = U.rawTexture(G, polyData, R, R, { flip: false });
    const tA = performance.now();
    // 2) relieve en GL a bakeRes² (RGBA32F)
    const B = W.bakeRes;
    const f32 = (w, h) => { const t = G.target(w, h, { float: true }); gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null); return t; };
    const hT = f32(B, B);
    G.draw(G.program(bakeShader(W)), { poly: polyTex, ext: [x0, y0, x1, y1] }, hT);
    // 3) versión 1024 para JS
    const dT = f32(R, R);
    G.draw(G.program(downFS), { hb: hT.tex }, dT);
    gl.bindFramebuffer(gl.FRAMEBUFFER, dT.fb);
    const raw = new Float32Array(R * R * 4);
    gl.readPixels(0, 0, R, R, gl.RGBA, gl.FLOAT, raw);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const tB = performance.now();
    const H2 = new Float32Array(R * R), knob = new Float32Array(R * R), land = new Uint8Array(R * R);
    for (let i = 0; i < R * R; i++) { H2[i] = raw[i * 4]; knob[i] = raw[i * 4 + 1]; land[i] = H2[i] > 0 ? 1 : 0; }
    const sm = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
    // pendiente, roca y arena en 1024 (para JS)
    const rock = new Float32Array(R * R), sand = new Float32Array(R * R);
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
      const i = y * R + x, xm = x > 0 ? i - 1 : i, xp = x < R - 1 ? i + 1 : i, ym = y > 0 ? i - R : i, yp = y < R - 1 ? i + R : i;
      const sl = Math.atan(Math.hypot((H2[xp] - H2[xm]) / (2 * cell), (H2[yp] - H2[ym]) / (2 * cell))) * 57.2958;
      rock[i] = Math.min(1, sm(21, 29, sl) + knob[i] * 0.85) * (H2[i] > -0.5 ? 1 : 0);
      const s = polySdf[i] * cell;
      sand[i] = sm(-8, -1, s) * (1 - sm(60, 90, s)) * (1 - sm(1.8, 2.8, H2[i])) * (1 - rock[i]);
    }
    // 4) distancia firmada a la costa (m), + en el mar; y distancia a la costa de la punta
    const sdl = U.sdf(land, R, R);
    const Dm = new Float32Array(R * R);
    for (let i = 0; i < R * R; i++) Dm[i] = -sdl[i] * cell;
    for (let Y = 1; Y < R - 1; Y++) for (let X = 1; X < R - 1; X++) {
      const i = Y * R + X; if (Math.abs(Dm[i]) > cell * 1.5) continue;
      const gx = (H2[i + 1] - H2[i - 1]) / (2 * cell), gy = (H2[i + R] - H2[i - R]) / (2 * cell), g = Math.hypot(gx, gy);
      if (g > 1e-3) Dm[i] = Math.max(-cell * 1.5, Math.min(cell * 1.5, -H2[i] / g));
    }
    const [tx, ty] = W.tip;
    const tipSeed = new Uint8Array(R * R);
    for (let Y = 1; Y < R - 1; Y++) for (let X = 1; X < R - 1; X++) {
      const i = Y * R + X; if (!land[i]) continue;
      const wx = x0 + (X + 0.5) * cell, wy = y0 + (Y + 0.5) * cell;
      if (Math.hypot(wx - tx, wy - ty) > 260) continue;
      if (!land[i - 1] || !land[i + 1] || !land[i - R] || !land[i + R]) tipSeed[i] = 1;
    }
    const Dt = U.edt(tipSeed, R, R);
    // 5) tiempos de aparición de cada curva (EMERGE)
    const tl = cfg.timeline.emerge, Emax = 95, step = cfg.views.contours.step;
    const tE = (L) => tl[0] + ((tl[1] - tl[0]) * Math.acos(Math.max(-1, Math.min(1, 1 - (2 * L) / Emax)))) / Math.PI;
    const nL = Math.ceil(Emax / step) + 2, s0 = new Float32Array(nL).fill(1e9), s1 = new Float32Array(nL).fill(-1e9);
    const dtip = (X, Y) => Math.hypot(x0 + (X + 0.5) * cell - tx, y0 + (Y + 0.5) * cell - ty);
    for (let Y = 0; Y < R; Y++) for (let X = 0; X < R; X++) {
      const v = H2[Y * R + X]; if (v <= 0) continue; const L = Math.round(v / step); if (Math.abs(v - L * step) > 1.5 || L >= nL) continue;
      const d = dtip(X, Y); s0[L] = Math.min(s0[L], d); s1[L] = Math.max(s1[L], d);
    }
    const reveal = new Float32Array(R * R);
    for (let Y = 0; Y < R; Y++) for (let X = 0; X < R; X++) {
      const i = Y * R + X, v = H2[i]; if (v <= 0) continue;
      const L = Math.min(nL - 1, Math.round(v / step)); const sp = Math.max(1, s1[L] - s0[L]);
      reveal[i] = L === 0 ? 0 : tE(L * step) + 0.25 * Math.max(0, Math.min(1, (dtip(X, Y) - s0[L]) / sp));
    }
    // 6) aux 1024² (D, Dpunta, aparición, s del polígono) y textura final del mundo en GL
    const hv = cfg.views.hachure, az = (hv.sunAz * Math.PI) / 180, el = (hv.sunEl * Math.PI) / 180;
    const sunD = [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)];
    const sunN = [Math.cos(0.44), 0, Math.sin(0.44)];
    const aux = new Float32Array(R * R * 4), dD = new Float32Array(R * R * 4);
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
      const i = y * R + x, xm = x > 0 ? i - 1 : i, xp = x < R - 1 ? i + 1 : i, ym = y > 0 ? i - R : i, yp = y < R - 1 ? i + R : i;
      const gx = (H2[xp] - H2[xm]) / (2 * cell), gy = (H2[yp] - H2[ym]) / (2 * cell), n = Math.hypot(gx, gy, 1);
      aux[i * 4] = (-gx * sunD[0] - gy * sunD[1] + sunD[2]) / n;
      aux[i * 4 + 1] = Dt[i] * cell; aux[i * 4 + 2] = reveal[i];
      aux[i * 4 + 3] = (-gx * sunN[0] - gy * sunN[1] + sunN[2]) / n;
      dD[i * 4] = Dm[i];
    }
    const auxTex = U.rawTexture(G, aux, R, R, { flip: false });
    const dTex = U.rawTexture(G, dD, R, R, { flip: false });
    const fT = f32(B, B);
    G.draw(G.program(deriveFS), { hb: hT.tex, aux: auxTex, poly: polyTex, Dt: dTex, texel: [1 / B, 1 / B], cellM: ew / B }, fT);
    const bakeTex = fT.tex;
    gl.deleteFramebuffer(fT.fb); gl.deleteFramebuffer(dT.fb); gl.deleteTexture(dT.tex); gl.deleteFramebuffer(hT.fb); gl.deleteTexture(hT.tex);
    const t2 = performance.now();
    const sample = (arr, N, wx, wy) => {
      const fx = ((wx - x0) / ew) * N - 0.5, fy = ((wy - y0) / eh) * N - 0.5;
      const ix = Math.max(0, Math.min(N - 2, Math.floor(fx))), iy = Math.max(0, Math.min(N - 2, Math.floor(fy))), u = Math.max(0, Math.min(1, fx - ix)), v = Math.max(0, Math.min(1, fy - iy));
      return arr[iy * N + ix] * (1 - u) * (1 - v) + arr[iy * N + ix + 1] * u * (1 - v) + arr[(iy + 1) * N + ix] * (1 - u) * v + arr[(iy + 1) * N + ix + 1] * u * v;
    };
    return {
      H: H2, rock, sand, Dm, R, extent: W.extent, bakeTex, auxTex, polyTex,
      h: (x, y) => sample(H2, R, x, y), rockAt: (x, y) => sample(rock, R, x, y), sandAt: (x, y) => sample(sand, R, x, y), D: (x, y) => sample(Dm, R, x, y),
      timing: { poly: tA - t0, glBakeRead: tB - tA, post: t2 - tB },
    };
  };
})();
