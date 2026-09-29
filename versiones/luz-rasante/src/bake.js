/* Horneados al iniciar: terreno grande (altura, roca, arena, distancia a la costa), normales, mapa de horizonte,
   punta local de alta resolución, texturas de ruido, altas frecuencias de fotos. */
(function () {
  const LR = (window.LR = window.LR || {});
  const f = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
  const v2 = (p) => `vec2(${f(p[0])},${f(p[1])})`;

  // ---------- utilidades GL propias (formatos que gl.js no cubre) ----------
  LR.tex = function (G, w, h, o = {}) {
    const gl = G.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    const fmt = o.fmt || 'u8';
    const F = {
      f32: [gl.RGBA32F, gl.RGBA, gl.FLOAT], f16: [gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT], u8: [gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE], r32: [gl.R32F, gl.RED, gl.FLOAT],
    }[fmt];
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, F[0], w, h, 0, F[1], F[2], o.data || null);
    const lin = o.filter !== 'nearest';
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, lin ? gl.LINEAR : gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, lin ? gl.LINEAR : gl.NEAREST);
    const wrap = o.wrap === 'repeat' ? gl.REPEAT : o.wrap === 'mirror' ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    t.w = w; t.h = h; t.fmt = fmt;
    return t;
  };
  LR.target = function (G, w, h, o = {}) {
    const gl = G.gl, tex = LR.tex(G, w, h, o), fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (st !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer incompleto ' + o.fmt + ' ' + st);
    return { fb, tex, w, h };
  };
  LR.mip = function (G, t) {
    const gl = G.gl; gl.bindTexture(gl.TEXTURE_2D, t); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  };
  LR.read = function (G, T) {
    const gl = G.gl, out = new Float32Array(T.w * T.h * 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb);
    gl.readPixels(0, 0, T.w, T.h, gl.RGBA, gl.FLOAT, out);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return out;
  };

  // ---------- transformada de distancia euclídea (Felzenszwalb) ----------
  function edt1(f, n, d, v, z) {
    let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  }
  function edt(mask, W, H) { // distancia (en celdas) desde cada celda a la celda más cercana con mask=1
    const INF = 1e20, g = new Float64Array(W * H);
    for (let i = 0; i < W * H; i++) g[i] = mask[i] ? 0 : INF;
    const n = Math.max(W, H), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    for (let x = 0; x < W; x++) { for (let y = 0; y < H; y++) f[y] = g[y * W + x]; edt1(f, H, d, v, z); for (let y = 0; y < H; y++) g[y * W + x] = d[y]; }
    for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) f[x] = g[y * W + x]; edt1(f, W, d, v, z); for (let x = 0; x < W; x++) g[y * W + x] = Math.sqrt(d[x]); }
    return g;
  }
  LR.signedCoast = function (land, W, H, cell) { // + en tierra, − en mar (metros)
    const sea = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) sea[i] = land[i] ? 0 : 1;
    const dSea = edt(sea, W, H), dLand = edt(land, W, H);
    const out = new Float32Array(W * H * 4);
    for (let i = 0; i < W * H; i++) out[i * 4] = land[i] ? (dSea[i] - 0.5) * cell : -(dLand[i] - 0.5) * cell;
    return out;
  };

  // ---------- GLSL del terreno ----------
  LR.glslTerrain = function (cfg) {
    const Wd = cfg.world, sp = Wd.spine, hc = Wd.crest;
    const bw = Wd.beachW, be = Wd.beachE, k = Wd.knoll, tp = Wd.tip;
    const A = bw.a, B = be.a; const dir = [B[0] - A[0], B[1] - A[1]], L = Math.hypot(dir[0], dir[1]);
    const nrm = [-dir[1] / L, dir[0] / L]; // normal hacia el norte (izquierda de A→B)
    const nn = nrm[1] < 0 ? [-nrm[0], -nrm[1]] : nrm;
    return `
const vec2 SP[7] = vec2[7](${sp.map(v2).join(',')});
const float HC[7] = float[7](${hc.map(f).join(',')});
const vec4 NOTCH[4] = vec4[4](${Wd.notches.map((n) => `vec4(${f(n[0])},${f(n[1])},${f(n[2])},0.)`).join(',')});
float smaxk(float a, float b, float k){ float h = clamp(0.5+0.5*(a-b)/k,0.,1.); return mix(b,a,h)+k*h*(1.-h); }
float ridged(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ float w = 2.*vnoise(p)-1.; float n = 1.-sqrt(w*w+0.05); s += a*n*n; p = p*2.03+vec2(3.1,1.7); a*=.5; } return s/0.72; }   // crestas redondeadas: sin pliegues que dibujen líneas
float sdSeg(vec2 p, vec2 a, vec2 b, out float t){ vec2 pa=p-a, ba=b-a; t=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return length(pa-ba*t); }
void spineInfo(vec2 p, out float d, out float hc, out float s){
  float best=1e9, acc=0.; d=0.; hc=0.; s=0.;
  for(int i=0;i<6;i++){ float t; float dd = sdSeg(p, SP[i], SP[i+1], t); vec2 ba = SP[i+1]-SP[i];
    if(dd<best){ best=dd; vec2 pa=p-SP[i]; float cr = ba.x*pa.y-ba.y*pa.x; d = cr>0.? dd : -dd; hc = mix(HC[i],HC[i+1],t); s = acc + t*length(ba); }
    acc += length(ba); }
}
float beachMask(vec2 p, vec2 a, vec2 b, vec2 wr, float sd){
  vec2 ab=b-a; float tt=dot(p-a,ab)/dot(ab,ab);
  float win = smoothstep(-0.05,0.03,tt)*smoothstep(1.08,0.98,tt);
  float w = mix(wr.x, wr.y, vnoise(vec2(tt*7.,1.3)));
  return win*smoothstep(-30.,-20.,sd)*(1.-smoothstep(w-10.,w,sd));
}
// devuelve (h, roca, arena, lomo)  — lomo = distancia firmada al lomo (este +)
vec4 terrain(vec2 p){
  float d, hc, s; spineInfo(p, d, hc, s);
  float Ww = mix(${f(Wd.Ww[0])}, ${f(Wd.Ww[1])}, vnoise(vec2(s/160., 7.3)));
  float We = mix(${f(Wd.We[0])}, ${f(Wd.We[1])}, vnoise(vec2(s/300., 2.1))) * (0.28+0.72*smoothstep(4., 50., hc));
  float frac = (fbm(p/16.)-0.5)*0.26 + (vnoise(p/4.5)-0.5)*0.10;
  float hr, rock = 0., u = 0., eastRel = 0.;
  if(d < 0.){
    u = -d/Ww + frac;
    hr = hc*(1.-smoothstep(0.35,1.0,u)) - max(u-1.,0.)*Ww*0.35;
    float wallR = smoothstep(0.38,0.55,u)*(1.-smoothstep(1.02,1.2,u));
    rock = max(rock, wallR);
    // grutas: bolsillos al pie del paredón
    for(int i=0;i<4;i++){
      float g = exp(-pow((p.y-NOTCH[i].x)/(NOTCH[i].y*0.5),4.));
      float xf = Ww*(1.-frac);
      float carve = g*smoothstep(xf-NOTCH[i].z-1.5, xf-NOTCH[i].z+1.5, -d);
      hr = mix(hr, -2.5, carve);
    }
  } else {
    // meseta: rampa suave que vale 0 exactamente en el lomo (continuidad C1 con el lado oeste; sin pliegue ni línea de AO)
    float xe0 = -${f(Wd.plateau)}; float xe = d-${f(Wd.plateau)}; xe = 0.5*(xe+sqrt(xe*xe+100.)) - 0.5*(xe0+sqrt(xe0*xe0+100.));
    u = xe/We;
    hr = hc*pow(max(1.-u,0.),1.6) - max(u-1.,0.)*We*0.05;
    // relieve que revela la luz rasante: ondulaciones paralelas a las curvas de nivel y montículos
    float band = smoothstep(0.06,0.25,u)*(1.-smoothstep(0.8,1.0,u));
    float und = fbm(vec2(xe/26., s/150.)+3.3)-0.5;
    float hum = fbm(p/38.+7.7)-0.5;
    hr += band*(und*2.6 + hum*1.5)*clamp(hc/40.,0.3,1.2);
    eastRel = band*max(und*2.6 + hum*1.5, 0.)*clamp(hc/40.,0.3,1.2);
  }
  // bolas y afloramientos de granito
  float kn = ridged(p/10.5+vec2(4.2,1.1));
  float kCrest = (1.-smoothstep(4.,12.,abs(d+27.)))*step(8.,hc)*smoothstep(0.45,0.6,vnoise(p/40.+2.));
  float kWall = d<0. ? smoothstep(0.25,0.5,u)*(1.-smoothstep(0.95,1.1,u)) : 0.;
  float kEast = d>0. ? smoothstep(0.76,0.84,vnoise(p/65.+9.))*smoothstep(0.1,0.25,u)*(1.-smoothstep(0.85,1.,u)) : 0.;
  float knob = (kCrest*3.5 + kWall*6. + kEast*1.2)*pow(kn,2.6);
  float noHz = kEast*1.2*pow(kn,2.6);   // relieve menor de la ladera este: no proyecta sombras largas (manchas negras al alba)
  hr += knob*step(0.,hr+2.);
  rock = max(rock, smoothstep(0.7,1.8,knob));
  // loma granítica (S4): meseta baja alargada N–S
  vec2 kq = (p-${v2([k.x, k.y])})/vec2(${f(k.rx)}, ${f(k.ry)});
  float kd = length(kq) + (fbm(p/11.)-0.5)*0.45 + (vnoise(p/4.)-0.5)*0.12;
  float hk = ${f(k.h)}*smoothstep(1.25, 0.2, kd)*(0.9+0.2*fbm(p/9.));   // loma suave: sin borde abrupto (no dibuja un contorno)
  hr += hk;
  // llanura costera (medialunas) y lomadas tierra adentro
  float sdW = length(p-${v2(bw.c)})-${f(bw.R)};
  float sdE = length(p-${v2(be.c)})-${f(be.R)};
  float lineN = dot(p-${v2(A)}, ${v2(nn)});
  float sdN = max(lineN, p.y-2250.);
  float sdP = min(min(sdW,sdE),sdN);
  float hp = sdP<0. ? max(sdP*0.035,-15.) : min(sdP,60.)*0.045 + max(sdP-60.,0.)*0.035;
  hp += smoothstep(40.,260.,sdP)*((fbm(p/110.)-0.5)*5.);
  float lomaRel = smoothstep(1650.,2250.,p.y)*smoothstep(0.,200.,sdP)*(4.+15.*fbm(p/380.+3.));
  hp += lomaRel;
  hr = mix(hr, hr*0.55 - 8., smoothstep(2200., 2700., p.y));
  float h = smaxk(hr, hp, 8.);
  // plataforma de la punta
  // la punta: envolvente que recorta la sierra y plataforma baja de granito al final
  float tt; float sdc = sdSeg(p, ${v2(tp.a)}, ${v2(tp.b)}, tt); sdc -= ${f(tp.r)} + max(p.y-(${f(tp.b[1])}),0.)*0.55;
  vec2 eq = (p-${v2(tp.c)})/vec2(${f(tp.rx)}, ${f(tp.ry)});
  float sde = (length(eq)-1.)*min(${f(tp.rx)}, ${f(tp.ry)});
  vec2 pr = mat2(0.8,-0.6,0.6,0.8)*p;
  float sdEnv = min(sdc, sde) + (fbm(p/11.)-0.5)*11. + (fbm(pr/3.3+1.7)-0.5)*5. + (fbm(pr.yx/1.1)-0.5)*1.2;
  float envOn = 1.-smoothstep(200., 420., p.y);
  h = mix(h, min(h, mix(-3.5, 300., smoothstep(3., -4., sdEnv))), envOn);
  float hPlat = mix(-3., 1.3 + 1.0*fbm(p/7.), smoothstep(2.5,-3.5,sdEnv));
  h = mix(h, smaxk(h, hPlat, 2.), envOn*(1.-smoothstep(40., 90., p.y)));
  float yN = p.y + (fbm(p/17.+4.)-0.5)*70.;
  rock = max(rock, envOn*smoothstep(-2., -8., -sdEnv)*smoothstep(12., -2., sdEnv)*smoothstep(90., 20., yN));
  rock = max(rock, envOn*smoothstep(4.,-3.,sdEnv)*smoothstep(55., 0., yN));
  // fondo marino
  if(h < -1.5) h = max(h, -15.) + (fbm(p/70.)-0.5)*2.5*smoothstep(-1.5,-5.,h);
  // arena
  float sand = max(beachMask(p, ${v2(bw.a)}, ${v2(bw.b)}, vec2(${f(bw.width[0])},${f(bw.width[1])}), sdW),
                   beachMask(p, ${v2(be.a)}, ${v2(be.b)}, vec2(${f(be.width[0])},${f(be.width[1])}), sdE));
  sand *= smoothstep(4.5, 2.0, h) * step(hr, hp+1.);
  rock *= 1.-sand;
  float lomaW = smoothstep(-4., 4., hp - hr);   // donde manda la loma, su relieve no proyecta sombras largas sobre la sierra
  return vec4(h, clamp(rock,0.,1.), sand, (hk + noHz*step(0.,hr+2.) + eastRel + lomaRel*lomaW)*step(0.,h));
}`;
  };

  // ---------- diaclasas maestras del granito (compartidas por el horneado de S8 y el sombreador) ----------
  // Dos juegos casi ortogonales, líneas levemente onduladas, espaciado 6–12 m, con cortes a lo largo.
  LR.glslJoints = function (cfg) {
    const J = cfg.world.joints, r = (a) => a * Math.PI / 180;
    const dA = [Math.sin(r(J.azA)), Math.cos(r(J.azA))], dB = [Math.sin(r(J.azB)), Math.cos(r(J.azB))];
    return `
vec2 jSet(vec2 P, vec2 d, float S, float seed){
  vec2 n = vec2(d.y, -d.x);
  float w = (vnoise(P/23.+seed)-0.5)*6. + (vnoise(P/6.3+seed*2.3)-0.5)*1.1 + (vnoise(P/1.7+seed*4.1)-0.5)*0.22;
  float u = dot(P, n) + w, al = dot(P, d);
  float k = floor(u/S); float best = 1e3, side = 1.;
  for(int i=-1;i<=1;i++){ float kk = k+float(i); float x = (kk+0.5+${f(J.jitter)}*(hash21(vec2(kk,seed))-0.5))*S;
    float on = smoothstep(${f(J.gaps)}-0.08, ${f(J.gaps)}+0.08, vnoise(vec2(al/8.5 + kk*1.7, kk*3.7+seed)));
    float dd = abs(u-x) + (1.-on)*2.5;
    if(dd < best){ best = dd; side = u > x ? 1. : -1.; } }
  return vec2(best, side*dot(n, vec2(${f(-Math.sin(r(cfg.sun.azimuth)))}, ${f(-Math.cos(r(cfg.sun.azimuth)))})));
}
// x: distancia a la diaclasa maestra más cercana (m); y: > 0 del lado opuesto al sol (labio iluminado)
vec2 masterJ(vec2 P){ vec2 a = jSet(P, vec2(${f(dA[0])},${f(dA[1])}), ${f(J.S)}, 3.1), b = jSet(P, vec2(${f(dB[0])},${f(dB[1])}), ${f(J.S * 2.1)}, 7.7); b.x += 0.02 + 2.5*smoothstep(0.3, 0.5, vnoise(P/13.+2.2)); return a.x < b.x ? a : b; }
`;
  };

  // ---------- pases de horneado ----------
  LR.bake = async function (G, cfg, extra) {
    const t0 = performance.now();
    const gl = G.gl, Wd = cfg.world, BG = Wd.big, TB = Wd.tipBake;
    const HEAD = `#version 300 es\nprecision highp float; precision highp sampler2D; in vec2 uv; out vec4 o;\n${PBS.GLSL_NOISE}\n`;
    const TER = LR.glslTerrain(cfg);
    const az = cfg.sun.azimuth * Math.PI / 180, toSun = [Math.sin(az), Math.cos(az)];
    const timings = {};
    const tick = (k, a) => { gl.finish(); timings[k] = Math.round(performance.now() - a); return performance.now(); };
    let tt = performance.now();

    // 1) terreno crudo 2048²
    const N = BG.res, cellB = BG.size / N;
    const pRaw = G.program(HEAD + TER + `
uniform vec4 ext;
void main(){ vec2 p = ext.xy + uv*ext.z; o = terrain(p); }`);
    const T0 = LR.target(G, N, N, { fmt: 'f32' });
    G.draw(pRaw, { ext: [BG.x0, BG.y0, BG.size, 0] }, T0);
    tt = tick('terrain', tt);
    const raw = LR.read(G, T0);
    const land = new Uint8Array(N * N); for (let i = 0; i < N * N; i++) land[i] = raw[i * 4] > 0 ? 1 : 0;
    const coast = LR.signedCoast(land, N, N, cellB);
    const tCoast = LR.tex(G, N, N, { fmt: 'f32', data: coast });
    tt = tick('edt', tt);

    // 2) composición: roca por pendiente y franja costera; A = distancia a la costa
    const pComp = G.program(HEAD + `
uniform sampler2D T0, TC; uniform vec4 ext; uniform float px;
void main(){ vec2 p = ext.xy + uv*ext.z; vec4 a = texture(T0, uv); float c = 0.;
  // distancia a la costa suavizada (tienda 5×5): quita la escalera del EDT sobre la máscara pixelada
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float w = (3.-abs(float(i)))*(3.-abs(float(j))); c += w*texture(TC, uv+vec2(float(i),float(j))*px).r; }
  c /= 81.;
  float hx = texture(T0, uv+vec2(px,0.)).r - texture(T0, uv-vec2(px,0.)).r;
  float hy = texture(T0, uv+vec2(0.,px)).r - texture(T0, uv-vec2(0.,px)).r;
  float slope = length(vec2(hx,hy))/(2.*ext.z*px);
  float rock = max(a.g, smoothstep(0.55,0.9,slope)*step(0.5,a.r));
  float fw = 5. + 16.*fbm(p/28.) ;
  float fringe = (1.-smoothstep(fw*0.45, fw, c))*step(-1.,c)*(1.-a.b);
  rock = max(rock, fringe*smoothstep(0.35,0.6,fbm(p/6.)+0.3*(1.-c/fw)));
  o = vec4(a.r, clamp(rock,0.,1.), a.b, c); }`);
    const tBakeT = LR.target(G, N, N, { fmt: 'f32' });
    G.draw(pComp, { T0: T0.tex, TC: tCoast, ext: [BG.x0, BG.y0, BG.size, 0], px: 1 / N }, tBakeT);
    tt = tick('compose', tt);

    // 3) normales + AO por concavidad + distancia al sendero
    // distancia exacta al sendero (JS, solo en una banda alrededor de cada tramo)
    const trailPts = extra.trailPts;
    const td = new Float32Array(N * N).fill(60);
    for (let i = 0; i < trailPts.length - 1; i++) {
      const a = trailPts[i], b = trailPts[i + 1], M = 14;
      const i0 = Math.max(0, Math.floor((Math.min(a[0], b[0]) - M - BG.x0) / cellB)), i1 = Math.min(N - 1, Math.ceil((Math.max(a[0], b[0]) + M - BG.x0) / cellB));
      const j0 = Math.max(0, Math.floor((Math.min(a[1], b[1]) - M - BG.y0) / cellB)), j1 = Math.min(N - 1, Math.ceil((Math.max(a[1], b[1]) + M - BG.y0) / cellB));
      const bax = b[0] - a[0], bay = b[1] - a[1], bb = bax * bax + bay * bay;
      for (let j = j0; j <= j1; j++) for (let ii = i0; ii <= i1; ii++) {
        const px = BG.x0 + (ii + 0.5) * cellB - a[0], py = BG.y0 + (j + 0.5) * cellB - a[1];
        const t = PBS.clamp((px * bax + py * bay) / bb, 0, 1), dx = px - bax * t, dy = py - bay * t;
        const d = Math.sqrt(dx * dx + dy * dy), k = j * N + ii;
        if (d < td[k]) td[k] = d;
      }
    }
    const tTrail = LR.tex(G, N, N, { fmt: 'r32', data: td });
    const pNorm = G.program(HEAD + `
uniform sampler2D TB, TTR; uniform vec4 ext; uniform float px;
float hA(vec2 q){ return max(texture(TB,q).r, 0.); }
void main(){ vec2 p = ext.xy + uv*ext.z; float cell = ext.z*px;
  // normal con diferencias sobre 1.5 texel en dos diagonales (filtra pliegues de un texel)
  float r1 = 1.5*px;
  float hx = hA(uv+vec2(r1,0.)) - hA(uv-vec2(r1,0.)) + 0.5*(hA(uv+vec2(r1,r1)) - hA(uv+vec2(-r1,r1)) + hA(uv+vec2(r1,-r1)) - hA(uv-vec2(r1,r1)));
  float hy = hA(uv+vec2(0.,r1)) - hA(uv-vec2(0.,r1)) + 0.5*(hA(uv+vec2(r1,r1)) - hA(uv+vec2(r1,-r1)) + hA(uv+vec2(-r1,r1)) - hA(uv-vec2(r1,r1)));
  vec3 n = normalize(vec3(-hx/(4.*1.5*cell), -hy/(4.*1.5*cell), 1.));
  float h0 = 0.25*(hA(uv+vec2(0.5*px)) + hA(uv-vec2(0.5*px)) + hA(uv+vec2(0.5*px,-0.5*px)) + hA(uv+vec2(-0.5*px,0.5*px))); float lap = 0.;
  for(int k=0;k<2;k++){ float r = px*(k==0?3.:9.); float c = (k==0?3.:9.)*cell;
    float m = 0.25*(hA(uv+vec2(r,0.))+hA(uv-vec2(r,0.))+hA(uv+vec2(0.,r))+hA(uv-vec2(0.,r)));
    lap += (m-h0)/c; }
  float ao = clamp(1. - 1.6*max(lap,0.) + 0.3*min(lap,0.), 0.45, 1.);
  o = vec4(n.xy, ao, texture(TTR, uv).r); }`);
    const tNormT = LR.target(G, N, N, { fmt: 'f16' });
    G.draw(pNorm, { TB: tBakeT.tex, TTR: tTrail, ext: [BG.x0, BG.y0, BG.size, 0], px: 1 / N }, tNormT);
    tt = tick('normals', tt);

    // 4) mapa de horizonte 1024²: ángulo máximo hacia el sol (grados)
    const NH = 1024;
    const pHz = G.program(HEAD + `
uniform sampler2D TB; uniform vec4 ext; uniform vec2 dir; uniform float steps, s0, s1, lift, sub;
float hh(vec2 q){ vec4 b = texture(TB, q); return max(b.r - sub*b.a, 0.); }
void main(){ vec2 p = ext.xy + uv*ext.z; float h0 = hh(uv) + lift;
  float j = hash21(uv*1024.+7.1); float best = -8.;
  for(int i=0;i<128;i++){ if(float(i)>=steps) break;
    float s = s0*pow(s1/s0, (float(i)+j)/(steps-1.));
    vec2 q = (p + dir*s - ext.xy)/ext.z;
    if(q.x<0.||q.y<0.||q.x>1.||q.y>1.) break;
    float hq = hh(q);
    best = max(best, degrees(atan((hq-h0)/s))); }
  o = vec4(best, 0., 0., 1.); }`);
    const tHzT = LR.target(G, NH, NH, { fmt: 'f32' });
    G.draw(pHz, { TB: T0.tex, ext: [BG.x0, BG.y0, BG.size, 0], dir: toSun, steps: 128, s0: 2, s1: 900, lift: 0.4, sub: 1 }, tHzT);
    tt = tick('horizon', tt);
    const hzBig = LR.read(G, tHzT);
    const bakeBig = LR.read(G, tBakeT);
    tt = tick('readback', tt);

    // 5) punta local 1024² (0.156 m/texel): bolas, pozas, juntas suaves
    const NTp = TB.res, cellT = TB.size / NTp;
    const rocks = []; // (las rocas explícitas de S8 van en el horneado de la punta fina)
    const rockArr = []; for (let i = 0; i < 4; i++) { const r = rocks[i] || [0, 0, 0, 0]; rockArr.push(`vec4(${r.map(f).join(',')})`); }
    const pTip = G.program(HEAD + TER + `
uniform sampler2D TB; uniform vec4 ext, bext;
const vec4 RK[4] = vec4[4](${rockArr.join(',')});
vec2 h22(vec2 p){ return vec2(hash21(p), hash21(p+17.3)); }
void main(){ vec2 p = ext.xy + uv*ext.z; vec2 bu = (p-bext.xy)/bext.z; vec4 b = texture(TB, bu);
  float edge = smoothstep(0.5, 0.44, max(abs(uv.x-.5), abs(uv.y-.5)));
  vec4 tr = terrain(p);
  float h = mix(b.r, tr.x, edge), rock = max(b.g, tr.y), coast = b.a;
  float rk = smoothstep(0.35,0.7,rock) * edge;
  // micro relieve de la plataforma
  // lomos redondeados de granito (como ballenas) y relieve menor
  h += rk*smoothstep(1., 5., coast)*((fbm(p/7.5+3.)-0.5)*0.7 + (fbm(p/2.2)-0.5)*0.18 + (vnoise(p/0.9)-0.5)*0.02);
  // pozas
  float pool = smoothstep(0.66,0.71, fbm(p/2.2+11.))*rk*smoothstep(3.,6.,coast)*smoothstep(1.5,0.6,abs(h-1.4));
  h -= pool*0.35;
  // bolas de granito (celdas 4.2 m)
  float bh = 0.;
  vec2 c0 = floor(p/5.6);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
    vec2 c = c0+vec2(i,j); vec2 r2 = h22(c*1.37+3.1);
    float want = texture(TB, (c*5.6+2.8-bext.xy)/bext.z).g;
    float cst = texture(TB, (c*5.6+2.8-bext.xy)/bext.z).a;
    if(r2.x > 1.-0.3*smoothstep(0.4,0.8,want)*smoothstep(5.,0.5,abs(cst-0.5))) {
      vec2 ctr = (c + 0.25 + 0.5*h22(c+5.7))*5.6;
      float rad = 1.0 + 1.4*r2.y; float hb = (0.45+0.6*hash21(c+9.1))*min(rad,1.2);
      vec2 q = p-ctr; float ang = hash21(c+2.2)*6.283; q = mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*q; q.x *= 0.8+0.4*hash21(c+4.4);
      float dd = length(q)/rad + (fbm(p/1.3+c)-0.5)*0.22;
      bh = max(bh, hb*pow(max(1.-dd*dd,0.), 0.75));
    } }
  for(int k=0;k<4;k++){ if(RK[k].z<=0.) continue; vec2 q = p-RK[k].xy; float dd = length(q)/RK[k].z + (fbm(p/0.8+float(k)*3.)-0.5)*0.22;
    bh = max(bh, RK[k].w*sqrt(max(1.-dd*dd,0.))); rk = max(rk, step(dd,1.05)); }
  h = max(h, h + bh*edge);
  rock = max(rock, smoothstep(0.05,0.3,bh));
  o = vec4(h, rock, pool, coast); }`);
    const TT0 = LR.target(G, NTp, NTp, { fmt: 'f32' });
    const tipExt = [TB.cx - TB.size / 2, TB.cy - TB.size / 2, TB.size, 0];
    G.draw(pTip, { TB: tBakeT.tex, ext: tipExt, bext: [BG.x0, BG.y0, BG.size, 0] }, TT0);
    const traw = LR.read(G, TT0);
    const tland = new Uint8Array(NTp * NTp); for (let i = 0; i < NTp * NTp; i++) tland[i] = traw[i * 4] > 0 ? 1 : 0;
    const tcoast = LR.signedCoast(tland, NTp, NTp, cellT);
    // fuera de ~40 m de la costa local, usar la distancia gruesa (más allá del borde de la textura)
    for (let i = 0; i < NTp * NTp; i++) { const cb = traw[i * 4 + 3], cl = tcoast[i * 4]; const w = PBS.smooth((Math.abs(cl) - 25) / 15); tcoast[i * 4] = cl * (1 - w) + cb * w; }
    const tTipC = LR.tex(G, NTp, NTp, { fmt: 'f32', data: tcoast });
    const pTipC = G.program(HEAD + `uniform sampler2D A, C; void main(){ vec4 a = texture(A, uv); float c = texture(C, uv).r; float ch = a.r*3.; o = vec4(a.rgb, mix(ch, c, smoothstep(2.5, 5., abs(c)))); }`);
    const tTipT = LR.target(G, NTp, NTp, { fmt: 'f32' });
    G.draw(pTipC, { A: TT0.tex, C: tTipC }, tTipT);
    const pTipN = G.program(HEAD + `
uniform sampler2D TB; uniform float px, cell;
float hA(vec2 q){ vec4 b = texture(TB,q); return max(b.r, 0.); }
void main(){ float hx = hA(uv+vec2(px,0.)) - hA(uv-vec2(px,0.)); float hy = hA(uv+vec2(0.,px)) - hA(uv-vec2(0.,px));
  vec3 n = normalize(vec3(-hx/(2.*cell), -hy/(2.*cell), 1.));
  float h0 = hA(uv); float m = 0.25*(hA(uv+vec2(6.*px,0.))+hA(uv-vec2(6.*px,0.))+hA(uv+vec2(0.,6.*px))+hA(uv-vec2(0.,6.*px)));
  float ao = clamp(1. - 1.2*max((m-h0),0.), 0.45, 1.);
  o = vec4(n.xy, ao, 0.); }`);
    const tTipNT = LR.target(G, NTp, NTp, { fmt: 'f16' });
    G.draw(pTipN, { TB: tTipT.tex, px: 1 / NTp, cell: cellT }, tTipNT);
    const tTipHzT = LR.target(G, NTp, NTp, { fmt: 'f32' });
    G.draw(pHz, { TB: tTipT.tex, ext: tipExt, dir: toSun, steps: 64, s0: 0.12, s1: 60, lift: 0.03, sub: 0 }, tTipHzT);
    const hzTip = LR.read(G, tTipHzT);
    const bakeTip = LR.read(G, tTipT);
    tt = tick('tip', tt);

    // 4b) densidad de monte (zonas de config + manchas raras) en 512² sobre el horneado grande: una lectura en vez de 9 exponenciales
    const MZ = Wd.monte;
    const pMonte = G.program(HEAD + `
uniform vec4 ext;
const vec4 MZ[${MZ.length}] = vec4[${MZ.length}](${MZ.map((z) => `vec4(${f(z[0])},${f(z[1])},${f(z[2])},${f(z[3])})`).join(',')});
const float MZD[${MZ.length}] = float[${MZ.length}](${MZ.map((z) => f(z[4])).join(',')});
void main(){ vec2 P = ext.xy + uv*ext.z; float d = 0.05*smoothstep(0.62, 0.8, vnoise(P/70.+4.2));
  for(int i=0;i<${MZ.length};i++){ vec2 q = (P-MZ[i].xy)/MZ[i].zw; d = max(d, MZD[i]*exp(-dot(q,q)*1.6)); }
  o = vec4(d*2., 0., 0., 1.); }`);
    const tMonT = LR.target(G, 512, 512, { fmt: 'u8' });
    G.draw(pMonte, { ext: [BG.x0, BG.y0, BG.size, 0] }, tMonT);

    // 5a) diaclasas maestras horneadas para S7 (0.156 m/texel sobre la punta y el paredón): una lectura en vez de ~11 ruidos
    const pJ = G.program(HEAD + LR.glslJoints(cfg) + `
uniform vec4 ext; uniform float cell;
vec2 hash22(vec2 p){ return vec2(hash21(p), hash21(p+19.19)); }
vec2 vorEdge(vec2 x){
  vec2 n = floor(x), f = fract(x); vec2 mg, mr; float md = 8.; float eh = 0.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 r = g + 0.15 + 0.7*hash22(n+g) - f; float d = dot(r,r); if(d<md){ md=d; mr=r; mg=g; } }
  md = 8.;
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ vec2 g = mg + vec2(i,j); vec2 r = g + 0.15 + 0.7*hash22(n+g) - f;
    vec2 dr = r-mr; if(dot(dr,dr)>0.0001){ float d = dot(0.5*(mr+r), normalize(dr)); if(d<md){ md=d; eh = hash21(2.*n+mg+g+0.37); } } }
  return vec2(md, eh);
}
vec2 jointDomain(vec2 P){ vec2 w = vec2(vnoise(P/7.1), vnoise(P/7.1+5.2))-0.5; vec2 q = P + w*2.4*cell/3.; return vec2(dot(q, vec2(0.94,0.34)), dot(q, vec2(-0.34,0.94))*1.2)/cell; }
// x,y: diaclasas maestras; z: distancia a la red secundaria (m, aprox.); w: azar del borde
void main(){ vec2 p = ext.xy + uv*vec2(ext.z, ext.w); vec2 v = vorEdge(jointDomain(p)); o = vec4(masterJ(p), v.x*cell, v.y); }`);
    const JX = [-40, -140, 160, 320];
    const tJT = LR.target(G, 1024, 2048, { fmt: 'f16' });
    G.draw(pJ, { ext: JX, cell: 5.4 }, tJT);
    tt = tick('joints', tt);

    // 5b) S8: granito de la punta a 2.6 cm/texel. Costa casi horizontal en el cuadro, bloques almohadillados
    //     entre diaclasas maestras, bolas redondeadas (unión suave), pozas de marea y la roca-asiento.
    let cap = null;
    if (Wd.cap) {
      const CP = Wd.cap, NC = CP.res, cellC = CP.size / NC;
      const plArr = []; for (let i = 0; i < 4; i++) { const q = CP.pools[i] || [0, 0, 0, 0, 0]; plArr.push(`vec4(${q.slice(0, 4).map(f).join(',')})`); }
      const plAng = []; for (let i = 0; i < 4; i++) plAng.push(f((CP.pools[i] || [0, 0, 0, 0, 0])[4]));
      const rkArr = []; for (let i = 0; i < 4; i++) { const r = (extra.capRocks || [])[i] || [0, 0, 0, 0]; rkArr.push(`vec4(${r.map(f).join(',')})`); }
      const pCap = G.program(HEAD + LR.glslJoints(cfg) + `
uniform vec4 ext;
const vec4 PL[4] = vec4[4](${plArr.join(',')}); const float PLA[4] = float[4](${plAng.join(',')});
const vec4 RK[4] = vec4[4](${rkArr.join(',')});
float blobH(vec2 p){
  float hmax = 0.; vec2 c0 = floor(p/2.9);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 c = c0+vec2(i,j);
    if(hash21(c*1.37+3.1) > 0.35) continue;
    vec2 ctr = (c + 0.2 + 0.6*vec2(hash21(c+5.7), hash21(c+8.9)))*2.9;
    float rad = 0.9 + 1.3*hash21(c+11.3); float hb = 0.06 + 0.16*hash21(c+9.1);
    vec2 q = p - ctr; float ang = hash21(c+2.2)*6.283; q = mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*q; q.x *= 0.75+0.5*hash21(c+4.4);
    float dd = length(q)/rad + (fbm(p/0.9+c)-0.5)*0.25;
    hmax = max(hmax, hb*pow(max(1.-dd*dd, 0.), 1.6)); }
  return hmax;
}
void main(){ vec2 p = ext.xy + uv*ext.z;
  vec2 J = masterJ(p); float jm = J.x;
  float yc = ${f(CP.coastY)} + (fbm(vec2(p.x/6.5, 3.1))-0.5)*3.0 + (fbm(vec2(p.x/1.9, 7.7))-0.5)*0.9;
  float dn0 = p.y - yc;
  // la costa entra en las diaclasas (caletas angostas donde una junta llega al mar)
  float dn = dn0 + (fbm(p/1.4)-0.5)*0.7 + (vnoise(p/0.3)-0.5)*0.07 - 1.1*(1.-smoothstep(0.,1.0,jm))*(1.-smoothstep(0.,5.,dn0));
  float plat = 0.7*(1.-exp(-max(dn,0.)/2.4)) + 0.03*max(dn,0.) + (fbm(p/8.)-0.5)*0.3*smoothstep(0.,3.,dn);
  float pillow = 0.12*smoothstep(0.02, 1.5, jm);
  float h = plat + pillow*smoothstep(-0.4, 1.4, dn) + blobH(p)*smoothstep(0.6, 2.6, dn);
  for(int k=0;k<4;k++){ if(RK[k].z<=0.) continue; vec2 q = p-RK[k].xy; float dd = length(q)/RK[k].z + (fbm(p/0.7+float(k)*3.)-0.5)*0.2;
    h = max(h, plat + RK[k].w*pow(max(1.-dd*dd,0.), 0.6)); }
  if(dn < 0.) h = min(h, 0.03) + dn*0.3 - 0.02;
  float pool = 0.;
  for(int k=0;k<4;k++){ if(PL[k].z<=0.) continue; vec2 q = p-PL[k].xy; float a = PLA[k]; q = mat2(cos(a),-sin(a),sin(a),cos(a))*q;
    float dd = length(q/PL[k].zw) + (fbm(p/0.55+float(k)*5.)-0.5)*0.35;
    h -= 0.2*smoothstep(1.15, 0.55, dd); pool = max(pool, smoothstep(1.02, 0.9, dd)); }
  o = vec4(h, step(0., h), pool, jm); }`);
      const capExt = [CP.x0, CP.y0, CP.size, 0];
      const TC0 = LR.target(G, NC, NC, { fmt: 'f32' });
      G.draw(pCap, { ext: capExt }, TC0);
      const craw = LR.read(G, TC0);
      const cland = new Uint8Array(NC * NC); for (let i = 0; i < NC * NC; i++) cland[i] = craw[i * 4] > 0 ? 1 : 0;
      const ccoast = LR.signedCoast(cland, NC, NC, cellC);
      const tCapC = LR.tex(G, NC, NC, { fmt: 'f32', data: ccoast });
      const pCapC = G.program(HEAD + `uniform sampler2D A, C; uniform float px; void main(){ vec4 a = texture(A, uv); float c = 0.;
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ float w = (3.-abs(float(i)))*(3.-abs(float(j))); c += w*texture(C, uv+vec2(float(i),float(j))*px).r; }
  o = vec4(a.r, a.g, a.b, c/81.); }`);
      const tCapT = LR.target(G, NC, NC, { fmt: 'f32' });
      G.draw(pCapC, { A: TC0.tex, C: tCapC, px: 1 / NC }, tCapT);
      const tCapNT = LR.target(G, NC, NC, { fmt: 'f16' });
      G.draw(pTipN, { TB: tCapT.tex, px: 1 / NC, cell: cellC }, tCapNT);
      const tCapHzT = LR.target(G, NC, NC, { fmt: 'f32' });
      G.draw(pHz, { TB: tCapT.tex, ext: capExt, dir: toSun, steps: 64, s0: 0.03, s1: 14, lift: 0.01, sub: 0 }, tCapHzT);
      // diaclasas maestras horneadas (x: distancia, y: lado) para S8
      const tCapJT = LR.target(G, NC, NC, { fmt: 'f16' });
      const capJX = [CP.x0, CP.y0, CP.size, CP.size];
      G.draw(pJ, { ext: capJX, cell: cfg.lace.cell }, tCapJT);
      cap = { jt: tCapJT.tex, jx: capJX, tex: tCapT.tex, norm: tCapNT.tex, hz: tCapHzT.tex, data: LR.read(G, tCapT), hzData: LR.read(G, tCapHzT), N: NC, x0: CP.x0, y0: CP.y0, size: CP.size };
      tt = tick('cap', tt);
    }

    // 6) textura de detalle 512² (R matas, G ruido medio, B grano fino, A ruido de ondas de arena)
    const PER = `
float hp2(vec2 i, float per){ i = mod(i, per); return hash21(i*0.731+vec2(0.37,0.91)); }
float pn(vec2 p, float per){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hp2(i,per),hp2(i+vec2(1,0),per),f.x), mix(hp2(i+vec2(0,1),per),hp2(i+vec2(1,1),per),f.x), f.y); }
float hp3(vec2 i, vec2 per){ i = mod(i, per); return hash21(i*0.731+vec2(0.37,0.91)); }
float pn2(vec2 p, vec2 per){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hp3(i,per),hp3(i+vec2(1,0),per),f.x), mix(hp3(i+vec2(0,1),per),hp3(i+vec2(1,1),per),f.x), f.y); }
float pfbm(vec2 p, float per){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*pn(p,per); p*=2.; per*=2.; a*=.5; } return s/0.97; }
vec2 hc2(vec2 c, float per){ c = mod(c, per); return vec2(hash21(c+0.5), hash21(c+31.7)); }`;
    const pDet = G.program(HEAD + PER + `
// matas de pasto (mosaico de 16 m, 1.56 cm/texel): grumos irregulares y alargados, sin estrella radial ni filas.
// Tres escalas con desplazamiento completo dentro de la celda, densidad agrupada por un fbm lento y borde deshilachado.
void main(){ vec2 p = uv;
  float fineA = pn(p*256., 256.), fineB = pn(p*512.+7.3, 512.), fineC = pn(p*1024.+3.1, 1024.);
  float sward = 0.1 + 0.16*(0.5*fineA + 0.3*fineB + 0.2*fineC);          // pasto corto de base
  float clus = smoothstep(0.32, 0.72, pfbm(p*3.+0.21, 3.));               // manchones de matas
  float clus2 = smoothstep(0.3, 0.7, pfbm(p*7.+4.4, 7.));
  float rag = pn(p*320.+1.7, 320.), rag2 = pn(p*700.+5.9, 700.);
  float tus = sward;
  for(int layer=0; layer<3; layer++){
    float per = layer==0 ? 9. : (layer==1 ? 19. : 41.);
    float prob = layer==0 ? 0.42*mix(0.15, 1.6, clus) : (layer==1 ? 0.5*mix(0.3, 1.4, clus*0.6+clus2*0.4) : 0.45*mix(0.5, 1.2, clus2));
    vec2 q = p*per; vec2 c0 = floor(q);
    for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){
      vec2 c = c0+vec2(i,j); vec2 cm = mod(c, per) + float(layer)*57.;
      if(hash21(cm+0.77) > prob) continue;
      vec2 r = hc2(c + float(layer)*13., per);
      vec2 ctr = c + r;                                                    // desplazamiento completo: sin filas
      float radm = layer==0 ? 0.26+0.26*hash21(cm+3.3) : (layer==1 ? 0.13+0.14*hash21(cm+3.3) : 0.06+0.07*hash21(cm+3.3));
      float rad = radm*per/16.;
      float asp = 1.+0.9*hash21(cm+5.1); float ang = hash21(cm+2.9)*6.2832;
      vec2 dq = q-ctr; dq = mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*dq; dq *= vec2(1./asp, sqrt(asp))/rad;
      float d = length(dq);
      if(d < 1.45){
        d += (rag-0.5)*0.55*smoothstep(0.25, 1., d) + (rag2-0.5)*0.35*smoothstep(0.55, 1.2, d);   // borde deshilachado
        float hh = layer==0 ? 0.78+0.22*hash21(cm+8.1) : (layer==1 ? 0.5+0.2*hash21(cm+8.1) : 0.3+0.14*hash21(cm+8.1));
        float prof = pow(max(1.-d*d, 0.), 0.65);
        tus = max(tus, hh*prof*(0.82 + 0.18*fineB));
      }
    }
  }
  tus = clamp(tus, 0., 1.);
  float mid = pfbm(p*8., 8.);
  float fine = mix(0.5*fineA + 0.5*fineC, pfbm(p*64., 64.), 0.35);
  float rip = pfbm(p*16., 16.);
  o = vec4(tus, mid, fine, rip); }`);
    const tDetT = LR.target(G, 1024, 1024, { fmt: 'u8', wrap: 'repeat' });
    G.draw(pDet, {}, tDetT); LR.mip(G, tDetT.tex);
    // olas: RG = gradiente, B = altura, A = ruido de espuma
    const pWave = G.program(HEAD + PER + `
float wh(vec2 p){ float h = 0.;
  h += 0.6*(pfbm(p*vec2(6.,6.)+vec2(0.3,0.1), 6.)-0.5);
  h += 0.5*(pfbm(p*16.+vec2(1.7,4.1), 16.)-0.5);
  h += 0.25*(pn(p*48., 48.)-0.5);
  return h; }
void main(){ vec2 p = uv; float e = 1./512.;
  float h = wh(p); float gx = (wh(p+vec2(e,0.))-wh(p-vec2(e,0.)))/(2.*e); float gy = (wh(p+vec2(0.,e))-wh(p-vec2(0.,e)))/(2.*e);
  o = vec4(0.5+gx*0.012, 0.5+gy*0.012, 0.5+0.35*h, pfbm(p*32.,32.)); }`);
    const tWaveT = LR.target(G, 512, 512, { fmt: 'u8', wrap: 'repeat' });
    G.draw(pWave, {}, tWaveT); LR.mip(G, tWaveT.tex);
    // Voronoi periódico (16×16 celdas): x = distancia al borde (en celdas), yz = dirección al borde, w = azar del borde
    const pVor = G.program(HEAD + `
vec2 hv(vec2 c){ c = mod(c, 16.); return vec2(hash21(c+0.5), hash21(c+19.69)); }
void main(){ vec2 x = uv*16.; vec2 n = floor(x), f = fract(x); vec2 mg, mr; float md = 8.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 r = g + 0.15 + 0.7*hv(n+g) - f; float d = dot(r,r); if(d<md){ md=d; mr=r; mg=g; } }
  md = 8.; vec2 nb = vec2(0.); float eh = 0.;
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){ vec2 g = mg + vec2(i,j); vec2 r = g + 0.15 + 0.7*hv(n+g) - f;
    vec2 dr = r-mr; if(dot(dr,dr)>0.0001){ float d = dot(0.5*(mr+r), normalize(dr)); if(d<md){ md=d; nb=normalize(dr); vec2 a = mod(n+mg,16.), b = mod(n+g,16.); eh = hash21(a+b+0.37); } } }
  o = vec4(md, nb, eh); }`);
    const tVorT = LR.target(G, 1024, 1024, { fmt: 'f16', wrap: 'repeat' });
    G.draw(pVor, {}, tVorT); LR.mip(G, tVorT.tex);
    tt = tick('noise', tt);

    return {
      big: { tex: tBakeT.tex, norm: tNormT.tex, hz: tHzT.tex, data: bakeBig, hzData: hzBig, N, NH, x0: BG.x0, y0: BG.y0, size: BG.size },
      cap, joints: { tex: tJT.tex, ext: JX }, monte: tMonT.tex,
      tip: { tex: tTipT.tex, norm: tTipNT.tex, hz: tTipHzT.tex, data: bakeTip, hzData: hzTip, N: NTp, x0: tipExt[0], y0: tipExt[1], size: TB.size },
      det: tDetT.tex, wave: tWaveT.tex, vor: tVorT.tex, timings, ms: Math.round(performance.now() - t0),
    };
  };

  // muestreo bilineal en JS de un canal de una lectura RGBA float
  LR.sampleData = function (D, arr, NN, x, y, ch = 0) {
    const u = (x - D.x0) / D.size * NN - 0.5, v = (y - D.y0) / D.size * NN - 0.5;
    const i = PBS.clamp(Math.floor(u), 0, NN - 2), j = PBS.clamp(Math.floor(v), 0, NN - 2);
    const fu = PBS.clamp(u - i, 0, 1), fv = PBS.clamp(v - j, 0, 1);
    const g = (a, b) => arr[((j + b) * NN + (i + a)) * 4 + ch];
    return (g(0, 0) * (1 - fu) + g(1, 0) * fu) * (1 - fv) + (g(0, 1) * (1 - fu) + g(1, 1) * fu) * fv;
  };

  // altas frecuencias de las fotos (luminancia − desenfoque 40 px), en una textura RGBA espejada
  LR.photoDetail = async function (G, cfg, warnings) {
    const S = 1024, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    const out = ctx.createImageData(S, S);
    const keys = ['graniteA', 'graniteB', 'grass'];
    for (let k = 0; k < 3; k++) {
      const file = cfg.photos[keys[k]];
      let img = null;
      try { img = await PBS.loadImage(cfg.assets + file); } catch (e) { warnings.push('FALTA FOTO ' + file); }
      if (!img) { for (let i = 0; i < S * S; i++) out.data[i * 4 + k] = 128; continue; }
      // recorte central cuadrado reescalado
      const s = Math.min(img.width, img.height), sx = (img.width - s) / 2, sy = (img.height - s) / 2;
      const M = 90; // margen para que el desenfoque no oscurezca los bordes
      ctx.filter = 'grayscale(1)'; ctx.drawImage(img, sx, sy, s, s, -M, -M, S + 2 * M, S + 2 * M); ctx.filter = 'none';
      const a = ctx.getImageData(0, 0, S, S).data;
      ctx.filter = 'grayscale(1) blur(40px)'; ctx.drawImage(img, sx, sy, s, s, -M, -M, S + 2 * M, S + 2 * M); ctx.filter = 'none';
      const b = ctx.getImageData(0, 0, S, S).data;
      for (let i = 0; i < S * S; i++) out.data[i * 4 + k] = PBS.clamp(128 + (a[i * 4] - b[i * 4]) * 1.6, 0, 255);
    }
    for (let i = 0; i < S * S; i++) out.data[i * 4 + 3] = 255;
    ctx.putImageData(out, 0, 0);
    const t = G.texture(cv, { repeat: true });
    const gl = G.gl; gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    LR.mip(G, t);
    return t;
  };
})();

/* S4: la loma — bolas de granito horneadas en el mundo (albedo, normal, altura y sombra propia fija).
   El sombreador de mundo las lee con dos texturas: mucho más barato que dibujarlas como objetos en cada cuadro. */
(function () {
  const LR = window.LR;
  const f = (v) => { const s = String(+(+v).toFixed(6)); return s.includes('.') || s.includes('e') ? s : s + '.0'; };
  LR.bakeKnoll = function (G, cfg, list, SC) {
    const vis = list.filter((b) => !b.hidden);
    if (!vis.length) return null;
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const b of vis) {
      const L = b.L(99), ex = [b.p[0] + SC.sDir[0] * (L + b.r), b.p[1] + SC.sDir[1] * (L + b.r)];
      for (const q of [b.p, ex]) { x0 = Math.min(x0, q[0] - b.r * 1.5 - 1.5); x1 = Math.max(x1, q[0] + b.r * 1.5 + 0.5); y0 = Math.min(y0, q[1] - b.r * 1.5 - 1); y1 = Math.max(y1, q[1] + b.r * 1.5 + 1); }
    }
    const res = 0.02, W = Math.ceil((x1 - x0) / res), H = Math.ceil((y1 - y0) / res);
    const P = cfg.palette, lin = (k) => `vec3(${LR.lin(P[k]).map(f).join(',')})`;
    const az = cfg.sun.azimuth * Math.PI / 180, toSun = [Math.sin(az), Math.cos(az)], sD = [-toSun[0], -toSun[1]], pp = [-sD[1], sD[0]];
    const B1 = vis.map((b) => `vec4(${f(b.p[0])},${f(b.p[1])},${f(b.r)},${f(b.hb)})`).join(',');
    const B2 = vis.map((b) => `vec4(${f(b.L(99))},${f(b.seed)},${f(b.asp)},${f(b.ang)})`).join(',');
    const N = vis.length;
    const HEAD = `#version 300 es\nprecision highp float; precision highp sampler2D; in vec2 uv; layout(location=0) out vec4 o;\n${PBS.GLSL_NOISE}\n\n// ruido con hash entero: estable para coordenadas grandes (el hash de PBS pierde precisión con |p|·456 > ~1e5)\nfloat hashI(vec2 p){ uvec2 q = uvec2(ivec2(floor(p))) * uvec2(1597334677u, 3812015801u); uint n = (q.x ^ q.y) * 1597334677u; n ^= n >> 16; n *= 2246822519u; n ^= n >> 13; return float(n) * (1.0/4294967296.0); }\nfloat vnI(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hashI(i), hashI(i+vec2(1,0)), f.x), mix(hashI(i+vec2(0,1)), hashI(i+vec2(1,1)), f.x), f.y); }\n`;
    const COMMON = `
const vec4 KB1[${N}] = vec4[${N}](${B1}); const vec4 KB2[${N}] = vec4[${N}](${B2});
const vec2 SDIR = vec2(${f(sD[0])},${f(sD[1])}), SPERP = vec2(${f(pp[0])},${f(pp[1])});
uniform vec4 ext;
float h1(float i){ return fract(sin(i*127.1 + 3.7)*43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(h1(i), h1(i+1.), f); }
// devuelve (z, cov, nx, ny) de la bola más alta en p
vec4 bodyAt(vec2 P, out vec3 alb){
  float best = -1.; vec4 R = vec4(0.); alb = vec3(0.);
  for(int k=0;k<${N};k++){
    vec2 cc = KB1[k].xy; float r = KB1[k].z, hb = KB1[k].w, sd0 = KB2[k].y, asp = KB2[k].z, ang = KB2[k].w;
    vec2 rel = P - cc; vec2 qr = mat2(cos(ang), -sin(ang), sin(ang), cos(ang))*rel; qr /= vec2(asp, 1./asp);
    float dn = length(qr)/r; if(dn > 1.4) continue;
    mat2 R1 = mat2(0.8,-0.6,0.6,0.8), R2 = mat2(0.28,0.96,-0.96,0.28);
    float d = dn + (vnI(R1*P*2.6/r + sd0)-0.5)*0.26 + (vnI(R2*P*7./r + sd0*2.)-0.5)*0.09 + (vnI(R1*P*30.)-0.5)*0.03;
    float cov = smoothstep(1.02, 0.98, d);
    float dd = min(d, 1.); float z = pow(max(1.-dd*dd, 0.), 0.55);
    float zh = cov > 0. ? z*hb : -0.5 + (1.4 - d);   // fuera del cuerpo: igual guarda el albedo más cercano (sin borde oscuro al filtrar)
    if(zh < best) continue; best = zh;
    vec2 g = normalize(rel + 1e-4)*dd/max(z, 0.08);
    float fn = vnI(R2*P*2.2/r+sd0), fm = vnI(R1*P*6.3+sd0);
    vec2 facet = (vec2(fn, vnI(R1*P*2.2/r+sd0+5.))-0.5)*0.5 + (vec2(fm, vnI(R2*P*6.3+sd0+3.))-0.5)*0.12;
    vec2 nxy = g*min(hb/r, 1.4)*0.55 + facet;
    float gr = vnI(R1*P*2.1)*0.5 + fm*0.25 + vnI(R2*P*23.)*0.25;
    vec3 a = mix(${lin('graniteA')}, ${lin('graniteC')}, smoothstep(0.15, 0.85, gr + 0.25*z))*0.85;
    float lich = smoothstep(0.58, 0.78, fn*0.6 + gr*0.4)*smoothstep(0.1, 0.5, z);
    a = mix(a, mix(${lin('lichenA')}, ${lin('lichenB')}, gr), lich*0.3);
    a *= 0.85 + 0.3*hashI(floor(P/0.025));
    alb = a; R = vec4(z*step(0.001, cov), cov, nxy);
  }
  return R;
}
float shadowAt(vec2 P){
  float occ = 0.;
  for(int k=0;k<${N};k++){
    vec2 cc = KB1[k].xy; float r = KB1[k].z, Lsh = KB2[k].x, sd0 = KB2[k].y;
    vec2 rel = P - cc; float a_ = dot(rel, SDIR), b_ = dot(rel, SPERP);
    if(a_ < -0.15*r || abs(b_) > r*1.2 || a_ > r + Lsh + 1.) continue;   // la sombra arranca bajo el cuerpo, no al este
    float R = r*(0.96 + (n1(b_*1.5/r + sd0)-0.5)*0.22)*(1. - 0.12*smoothstep(0., r + Lsh, a_));
    float bb = clamp(b_/R, -1., 1.);
    float front = sqrt(max(0., 1.-bb*bb))*(r + Lsh) + (n1(b_*1.37 + sd0*2.3)-0.5)*0.2*r + (n1(b_*3.9 + sd0)-0.5)*0.22 + (n1(b_*11. + sd0*3.)-0.5)*0.1;
    float pen = 0.03 + 0.02*max(a_, 0.);
    occ = max(occ, (1.-smoothstep(front-pen, front+pen, a_))*(1.-smoothstep(0.92, 1.03, abs(b_)/R)));
  }
  return occ;
}`;
    const pA = G.program(HEAD + COMMON + `void main(){ vec2 P = ext.xy + uv*ext.zw; vec3 alb; vec4 b = bodyAt(P, alb); o = vec4(alb, b.y); }`);
    const pB = G.program(HEAD + COMMON + `void main(){ vec2 P = ext.xy + uv*ext.zw; vec3 alb; vec4 b = bodyAt(P, alb); o = vec4(b.zw, b.x, shadowAt(P)); }`);
    const ext = [x0, y0, W * res, H * res];
    const TA = LR.target(G, W, H, { fmt: 'u8' }), TB = LR.target(G, W, H, { fmt: 'f16' });
    G.draw(pA, { ext }, TA); G.draw(pB, { ext }, TB);
    LR.mip(G, TA.tex);
    return { a: TA.tex, b: TB.tex, ext };
  };
})();
