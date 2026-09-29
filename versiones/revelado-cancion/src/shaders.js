/*
 * Revelado · canción entera — shaders.
 * Un pase por copia (una variante de programa por tipo de foto) que escribe en un búfer flotante:
 *   R densidad del fondo · G densidad de las figuras · B cobertura de las figuras · A espuma (o manchas de archivo en la copia inicial)
 * y un pase de composición (menisco, virado, quemado, grano) que lee el búfer de la copia nueva y, durante un relevo, el de la vieja.
 * Un pase de puntos aparte dibuja la plata que se suelta (granito → espuma, roca → arena).
 */
(function () {
  const RV = (window.RV = window.RV || {});

  const COMMON = `
uint pcg(uint v){ uint s = v*747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float hashI(ivec2 p, uint seed){ return float(pcg(uint(p.x) * 1664525u + pcg(uint(p.y) + seed))) * (1.0/4294967295.0); }
float vnI(vec2 x, uint seed){ vec2 i = floor(x), f = fract(x); f = f*f*(3.-2.*f); ivec2 k = ivec2(i) + 4096;
  float a = hashI(k, seed), b = hashI(k+ivec2(1,0), seed), c = hashI(k+ivec2(0,1), seed), d = hashI(k+ivec2(1,1), seed);
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
const float LP = 0.955;
uniform sampler2D uTone; // virado precalculado por cuadro: fila 0 copia viva, fila 1 archivo
vec3 toneColor(float L, float arch){ return texture(uTone, vec2((clamp(L, 0., 1.)*255. + 0.5)/256., 0.25 + 0.5*arch)).rgb; }
// grano de nucleación fijo (no cambia por cuadro): grumos de 2–3 px con un poco de hash fino
float nucN(vec2 q, uint sd){ return 0.72*vnI(q*0.48, sd) + 0.28*hashI(ivec2(q*1.4), sd + 5u); }
// valor de celda (Worley) F2−F1 para el encaje de espuma
float cellEdge(vec2 x){
  vec2 i = floor(x), f = fract(x); float d1 = 8., d2 = 8.;
  for (int yy = -1; yy <= 1; yy++) for (int xx = -1; xx <= 1; xx++) {
    ivec2 k = ivec2(i) + ivec2(xx, yy) + 4096;
    vec2 c = vec2(float(xx), float(yy)) + 0.15 + 0.7*vec2(hashI(k, 71u), hashI(k, 72u)) - f;
    float dd = dot(c, c);
    if (dd < d1) { d2 = d1; d1 = dd; } else if (dd < d2) d2 = dd;
  }
  return sqrt(d2) - sqrt(d1);
}
`;

  // ---------- menisco: geometría cerrada del frente y desarrollo por píxel (común a los dos pases) ----------
  const FRONT = `
uniform float uTr, uWt, uFigTau, uDevAll;
uniform sampler2D uWtex, uNoise;
uniform vec4 uMen, uMen2, uMen3, uMen4; // t0, s0, v, ángulo | curva, ruido, semilla, visible | figuras por el frente, τ0, inducción, empuje húmedo | laboratorio (0/1), retardo
uniform vec4 uRinse;                    // ondulación, radio del anillo, amplitud del anillo, oscurecimiento
uniform float uNW;                      // cuadros de la tabla W
vec2 menDir(){ float a = uMen.w; return vec2(sin(a), -cos(a)); }
float wAt(float t){ return t <= 0. ? t * 3.0 : texture(uWtex, vec2((t*30. + 0.5)/uNW, 0.5)).b; }
float front(vec2 p, out float tarr, out float perp){
  vec2 d = menDir(); vec2 r = p - vec2(540., 1920.);
  float proj = dot(r, d); perp = dot(r, vec2(-d.y, d.x));
  if (uMen4.x > 0.5) { // relevo de laboratorio: sin frente; la copia sube desde el blanco, con un leve desfase por zonas
    float nl = texture(uNoise, vec2(p.x/1500. + uMen2.z, p.y/2300.)).b;
    tarr = uMen.x + uMen4.y + 0.35*nl; return 1e5;
  }
  vec4 nn = texture(uNoise, vec2(perp/2400. + uMen2.z, 0.13 + 0.07*uMen2.z));
  float n1 = nn.b - 0.5, n2 = nn.r - 0.5;
  float n = uMen2.y * (1.6*n1 + 0.9*n2) + uMen2.x * (perp/540.)*(perp/540.);
  tarr = uMen.x + (proj + n - uMen.y) / uMen.z;
  return (uTr - tarr) * uMen.z; // px por detrás del frente
}
struct FR { float er; float perp; float dev; float devFig; vec2 pr; };
FR frontAll(vec2 p0){
  FR f; f.er = 1e5; f.perp = 0.; f.dev = 1.; f.devFig = 1.; f.pr = p0;
  vec2 p = p0;
  // enjuague: la copia descansa bajo agua quieta (sólo refracción, sin líneas claras)
  if (uRinse.x > 0.) {
    p += uRinse.x * vec2(sin(p.y/260. + uTr*0.9), cos(p.x/310. + uTr*0.7));
    vec2 rr = p - vec2(620., 760.); float dd = length(rr);
    float x = dd - uRinse.y;
    float skyK = p.y < 560. ? 0.45 : 1.;
    p += normalize(rr + 1e-4) * uRinse.z * skyK * exp(-x*x/900.) * sin(x/9.);
    f.pr = p;
  }
  float tarr = 0., perp = 0.;
  if (uDevAll < 0. || uMen2.w > 0.5) {
    float e = front(p, tarr, perp);
    float wob = (uMen2.w > 0.5 && uMen4.x < 0.5) ? 1.8*sin(perp/95. + uTr*4.1) + 0.9*sin(perp/37. - uTr*6.3) : 0.;
    f.er = e - wob; f.perp = perp;
    if (uMen2.w > 0.5 && f.er > 0. && f.er < 34. && uMen4.x < 0.5) {
      float nl = texture(uNoise, vec2(perp/1300. + 1.3*uMen2.z, 0.37)).g;
      float k = 1. - f.er/34.;
      f.pr = p + menDir() * (8. + 9.*nl) * k*k;
    }
  }
  if (uDevAll < 0.) {
    float tau = uWt - wAt(tarr);
    f.dev = 1. - exp(-max(0., tau - uMen3.z)/uMen3.y);
    f.devFig = 1. - exp(-max(0., tau - 0.03)/uFigTau);
    f.devFig = max(f.devFig, uMen3.x * smoothstep(0., 100., f.er));
    f.dev = max(f.dev, uMen3.w * smoothstep(0., 90., f.er) * step(0., tau)); // el papel mojado se ve más hondo enseguida
  }
  return f;
}
`;

  // ---------- pase de copia ----------
  const PRINT_HEAD = `#version 300 es
__DEFINES__
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 uv; out vec4 o;
${COMMON}
uniform float uT, uS, uLow, uHigh, uRms, uSurge, uSwashPhase, uGrottoPhase, uIsOld;
uniform vec4 uOn;       // último arranque (t, índice), anterior (t, índice)
uniform vec4 uCam;      // reservado
${FRONT}
uniform sampler2D uPhoto, uMask, uFigA, uFigB;
uniform vec4 geo, geo2, boxA, boxB, grp, gcw, gb1, gb2, gb3, gb4, go1, go2, go3, go4, par, par2;
struct PR { float Dbg; float Df; float c; float foam; float arch; };
__WATERLINE__
`;

  const PRINT_BODY = `
// figura: cobertura × nucleación (grumos que se juntan, del núcleo al borde), luminancia propia bajo la misma luz
void fig(vec4 F, float devF, vec2 q, float lightMul, uint sd, float coreW, inout PR r){
  if (F.r < 0.004 || devF <= 0.) return;
  float thr = coreW*(1. - F.a) + (1. - coreW)*smoothstep(0.2, 0.8, nucN(q, sd));
  float nuc = smoothstep(thr - 0.03, thr + 0.03, devF*1.06);
  float cc = F.r * nuc;
  if (cc > r.c) {
    float Lf = F.b * 0.4 * lightMul;
    r.Df = -0.30103 * log2(max(Lf, 0.02)/LP);
    r.c = cc;
  }
}
// estallidos de espuma (pororó) que siguen los golpes medidos: celdas que reventan en blanco y se aclaran
float popFoam(vec2 q, float tO, float idx, float amp, float cellPx){
  float a = uTr - tO;
  if (a < 0. || a > 1.7 || tO < 0.) return 0.;
  vec2 cell = floor(q/cellPx);
  uint id = uint(max(idx, 0.));
  float h = hashI(ivec2(cell), id*7u + 13u), h2 = hashI(ivec2(cell), id*7u + 17u);
  if (h > amp) return 0.;
  float aa = a - h2*0.30; if (aa < 0.) return 0.;
  vec2 c0 = (cell + 0.2 + 0.6*vec2(hashI(ivec2(cell), id*7u + 19u), hashI(ivec2(cell), id*7u + 23u))) * cellPx;
  float rad = cellPx*(0.16 + 0.42*(1. - exp(-aa*4.5))) * (0.6 + 0.8*h2);
  vec2 d = (q - c0) * vec2(1., 1.5);
  float e = length(d) * (1. + 0.45*(vnI(q*0.09, 31u) - 0.5));
  float body = 1. - smoothstep(rad*0.5, rad, e);
  float lace = 0.55 + 0.45*smoothstep(0.35, 0.7, vnI(q*0.18 + vec2(aa*2., 0.), 37u));
  return body * lace * (1. - smoothstep(0.55, 1.6, aa));
}
vec2 sway(vec2 q, float live){ return vec2(0.); }

PR shade(vec2 p, float dev, float devFig){
  PR r; r.Dbg = 0.; r.Df = 0.; r.c = 0.; r.foam = 0.; r.arch = 0.;
  vec2 q = geo.xy + ((p - geo2.xy)/geo.w + geo2.xy)/geo.z;   // px de la foto original
  vec2 isz = 1. / geo2.zw;
  vec4 M = texture(uMask, vec2(q.x*isz.x, 1. - q.y*isz.y));
  float water = M.r, rock = M.g, sand = M.b, skyM = M.a;
  float live = dev;
  vec2 q2 = q;
  __WARP__
  vec4 P = texture(uPhoto, vec2(q2.x*isz.x, 1. - q2.y*isz.y));
  float L0 = P.r, Ll = P.a;
  float lightMul = 1.;
  __LIVE__
  float Dt = -0.30103 * log2(max(Ll, 0.02)/LP);
  float D;
#if ARCHIVE
  if (dev < 0.999) {
    // archivo: negros levantados (Dmax ≈ 0,4), manchas, rayas finas, bordes gastados
    float La = 0.36 + 0.56*L0;
    float fs = geo2.z / 3030.;
    ivec2 cell = ivec2(floor(q / (46.*fs)));
    float h1 = hashI(cell, 91u);
    if (h1 < 0.075) {
      vec2 c0 = (vec2(cell) + 0.2 + 0.6*vec2(hashI(cell, 92u), hashI(cell, 93u))) * (46.*fs);
      float rad = (1.5 + 5.5*hashI(cell, 94u)) * fs * 1.6;
      float sp = 1. - smoothstep(rad*0.25, rad, length(q - c0));
      La *= 1. - 0.14 * sp * (0.5 + 0.5*hashI(cell, 95u));
      r.arch = sp;
    }
    for (int i = 0; i < 3; i++) {
      vec2 a = vec2(geo2.z*(0.30 + 0.17*float(i)), geo2.w*(0.06 + 0.29*float(i))), b = a + vec2(geo2.z*(0.08 - 0.05*float(i)), geo2.w*(0.57 - 0.10*float(i)));
      vec2 pa = q - a, ba = b - a; float hh = clamp(dot(pa, ba)/dot(ba, ba), 0., 1.);
      float dd = length(pa - ba*hh) / (fs*1.6);
      La += 0.10 * (1. - smoothstep(0.35, 1.1, dd)) * step(0.1, sin(hh*37. + float(i)*2.1) * 0.5 + 0.5*sin(hh*11.3 + float(i)*4.7));
    }
    vec2 e2 = min(p, vec2(1080., 1920.) - p);
    float edgeF = 1. - smoothstep(0., 170., min(e2.x, e2.y));
    La = mix(La, 0.86, 0.35*edgeF);
    float Da = -0.30103 * log2(clamp(La, 0.02, LP)/LP);
    D = mix(Da, Dt, dev);
  } else D = Dt;
#else
  // lo más denso cruza primero: las sombras llegan antes que los medios y las luces (no es un fundido)
  D = Dt * pow(dev, mix(2.4, 0.55, smoothstep(0.15, 0.9, Dt)));
#endif
  __POST__
  // figuras: la plata más densa de la copia, con su sombra pegada a los pies
  vec2 aq = (q - boxA.xy) / boxA.zw;
  if (aq.x > 0. && aq.y > 0. && aq.x < 1. && aq.y < 1.) {
    vec4 F = texture(uFigA, vec2(aq.x, 1. - aq.y));
    D += F.g * 1.05 * smoothstep(0., 0.6, devFig);
    fig(F, devFig, q, lightMul, 17u, 0.72, r);
  }
#if HAS_FIGB
  {
    for (int gi = 0; gi < 4; gi++) {
      vec4 gbx = gi == 0 ? gb1 : gi == 1 ? gb2 : gi == 2 ? gb3 : gb4;
      vec4 gof = gi == 0 ? go1 : gi == 1 ? go2 : gi == 2 ? go3 : go4;
      vec2 qq = q - gof.xy;
      if (qq.x > gbx.x && qq.y > gbx.y && qq.x < gbx.z && qq.y < gbx.w) {
        vec2 bq = (qq - boxB.xy) / boxB.zw;
        if (bq.x > 0. && bq.y > 0. && bq.x < 1. && bq.y < 1.) {
          vec4 F = texture(uFigB, vec2(bq.x, 1. - bq.y));
          float devF = (gi == 0 ? grp.x : gi == 1 ? grp.y : gi == 2 ? grp.z : grp.w) * step(0.15, devFig);
          float cw = gi == 0 ? gcw.x : gi == 1 ? gcw.y : gi == 2 ? gcw.z : gcw.w;
          D += F.g * 1.05 * smoothstep(0., 0.6, devF);
          fig(F, devF, qq, lightMul, 29u, cw, r);
        }
      }
    }
  }
#endif
  r.Dbg = D;
  r.arch *= 1. - dev;
  return r;
}

void main(){
  vec2 p = vec2(uv.x * 1080., (1. - uv.y) * 1920.);
  FR f = frontAll(p);
  float dev = f.dev, devFig = f.devFig;
  if (uIsOld > 0.5) { dev = 1.; devFig = 1.; }
  PR r = shade(f.pr, dev, devFig);
#if ARCHIVE
  o = vec4(r.Dbg, r.Df, r.c, r.arch);
#else
  o = vec4(r.Dbg, r.Df, r.c, r.foam);
#endif
}
`;

  // ---------- código vivo por tipo de foto ----------
  // WARP: desplaza las coordenadas de lectura de la foto (q2, px de foto original). LIVE: modifica Ll (luminancia viva), lightMul, r.foam.
  const KINDS = {};

  // 1 · aérea de la punta: la espuma que rodea la sierra respira y el mar corre
  KINDS.aerea = { id: 1, warp: `
  if (water > 0.01 && live > 0.) {
    vec2 fl = vec2(texture(uNoise, q/vec2(420.,300.) + vec2(uS*0.010, 0.)).g, texture(uNoise, q/vec2(380.,260.) + vec2(0.37, -uS*0.008)).a) - 0.5;
    float dRw = texture(uPhoto, vec2(q.x*isz.x, 1. - q.y*isz.y)).b * 255.;
    q2 += fl * par.x * water * live * (0.6 + 0.8*uLow) * smoothstep(0., 30., dRw);
  }`, live: `
  if (live > 0.001) {
    float dR = P.b * 255.;
    float foamP = smoothstep(0.40, 0.85, L0) * water;
    vec4 nz = texture(uNoise, q/vec2(46.,46.) + vec2(uS*0.021, -uS*0.014));
    float lace = 0.5 + 0.5*sin(6.2832*(dR/26. - uS*0.5) + 5.*nz.g);
    Ll *= 1. + foamP*live*(0.30*(lace - 0.5) + 0.10*(2.*uLow - 1.));
    float wv = texture(uNoise, vec2(q.x/70., q.y/26. + uS*0.03)/8.).g - 0.5;
    Ll *= 1. + 0.16*wv*water*live*(1. - foamP);
    // luz de la mañana sobre la sierra
    vec2 lq = (q + vec2(-6.*uT, -2.*uT)) / 300.;
    float lf = texture(uNoise, lq/8.).r;
    lightMul = mix(1., 0.92 + 0.16*smoothstep(0.2, 0.8, lf), live);
    Ll *= lightMul;
  }`, post: `` };

  // 2 · canal entre rocas: la espuma entra, sube y baja con los graves
  KINDS.canal = { id: 2, warp: `
  if (water > 0.01 && live > 0.) {
    float sw = 0.5 + 0.5*sin(uSwashPhase*0.85 - q.y/420.);
    float amp = par.x * (0.55 + 0.9*uLow);
    vec2 fl = vec2(texture(uNoise, q/vec2(300.,240.) + vec2(uS*0.006, 0.)).g, texture(uNoise, q/vec2(260.,200.) + vec2(0.37, -uS*0.005)).a) - 0.5;
    q2.y += (sw - 0.5) * amp * water * live;
    q2 += fl * 9. * water * live;
  }`, live: `
  if (live > 0.001) {
    float foamP = smoothstep(0.45, 0.85, L0) * water * smoothstep(650., 900., q.y);
    vec4 nz = texture(uNoise, q/vec2(70.,70.) + vec2(uS*0.012, -uS*0.03));
    Ll *= 1. + foamP*live*(0.26*(nz.g - 0.5) + 0.10*(2.*uLow - 1.));
    // mar del horizonte: ondas estiradas que corren
    float hz = smoothstep(430., 470., q.y) * (1. - smoothstep(590., 640., q.y)) * water;
    float wv = texture(uNoise, vec2(q.x/210., q.y/16. + uS*0.05)/6.).g - 0.5;
    Ll *= 1. + 0.22*wv*hz*live;
    vec2 lq = (q + vec2(-10.*uT, -3.*uT)) / 700.;
    float lf = texture(uNoise, lq/8.).r;
    lightMul = mix(1., 0.94 + 0.12*smoothstep(0.2, 0.8, lf), live);
    Ll *= mix(1., lightMul, 1. - 0.6*skyM);
  }`, post: `` };

  // 3 · relieve: una luz de alba recorre el espinazo de arriba hacia abajo; la bahía titila
  KINDS.relieve = { id: 3, warp: `
  if (water > 0.01 && live > 0.) {
    vec2 fl = vec2(texture(uNoise, q/vec2(260.,180.) + vec2(uS*0.008, 0.)).g, texture(uNoise, q/vec2(220.,150.) + vec2(0.37, -uS*0.006)).a) - 0.5;
    q2 += fl * 4.0 * water * live;
  }`, live: `
  if (live > 0.001) {
    float yb = par.x;                                   // posición de la banda de alba (px de pantalla)
    float dy = (p.y - yb) / 300.;
    float band = exp(-dy*dy);
    float sh = smoothstep(0.35, 0.8, L0);
    Ll *= 1. + live*par.y*band*(0.55 + 0.75*sh);
    float sp = texture(uNoise, q/vec2(30.,22.) + vec2(uS*0.03, 0.)).g;
    Ll *= 1. + 0.14*(sp - 0.5)*water*live*smoothstep(0.35, 0.75, L0);
    vec2 lq = (q + vec2(-8.*uT, -3.*uT)) / 500.;
    float lf = texture(uNoise, lq/8.).r;
    lightMul = mix(1., 0.95 + 0.10*smoothstep(0.2, 0.8, lf), live);
    Ll *= lightMul;
  }`, post: `` };

  // 4 · abra al mar: la ola rompe con los golpes medidos
  KINDS.abra = { id: 4, warp: `
  if (water > 0.01 && live > 0.) {
    float hit = uSurge;
    float sw = 0.5 + 0.5*sin(uSwashPhase*0.9 + q.x/210.);
    vec2 fl = vec2(texture(uNoise, q/vec2(230.,160.) + vec2(uS*0.008, 0.)).g, texture(uNoise, q/vec2(200.,140.) + vec2(0.37, -uS*0.006)).a) - 0.5;
    q2 += fl * 5. * water * live;
    q2.y += (-hit*7. + (sw - 0.5)*7.) * water * live * smoothstep(560., 640., q.y);
  }`, live: `
  if (live > 0.001) {
    float surf = smoothstep(560., 620., q.y) * water;
    float foamP = smoothstep(0.42, 0.85, L0) * surf;
    vec4 nz = texture(uNoise, q/vec2(52.,40.) + vec2(uS*0.016, -uS*0.03));
    Ll *= 1. + foamP*live*(0.24*(nz.g - 0.5) + 0.20*uSurge);
    // el golpe de la ola: la espuma se abre en encaje y se aclara
    float ce = cellEdge(vec2(q.x/38., (q.y - 640.)/17. + uS*0.4) + 0.7*vec2(nz.g, nz.a));
    Ll = mix(Ll, 0.96, uSurge*0.42*(1. - smoothstep(0.05, 0.19, ce))*surf*live*smoothstep(0.35, 0.6, L0));
    // horizonte
    float hz = smoothstep(516., 545., q.y) * (1. - smoothstep(590., 620., q.y)) * water;
    float wv = texture(uNoise, vec2(q.x/190., q.y/14. + uS*0.05)/6.).g - 0.5;
    Ll *= 1. + 0.20*wv*hz*live;
    vec2 lq = (q + vec2(-9.*uT, -2.*uT)) / 500.;
    float lf = texture(uNoise, lq/8.).r;
    lightMul = mix(1., 0.94 + 0.12*smoothstep(0.2, 0.8, lf), live);
    Ll *= mix(1., lightMul, 1. - 0.6*skyM);
  }`, post: `` };

  // 5 · sierras del Yerbal: el pasto se mece, la sombra de las nubes camina por las lomas
  KINDS.yerbal = { id: 5, warp: `
  if (live > 0.) {
    float gr = smoothstep(390., 470., q.y);
    float w1 = texture(uNoise, vec2(q.x/190. + uS*0.03, q.y/90.)/4.).g - 0.5;
    float w2 = texture(uNoise, vec2(q.x/70. - uS*0.05, q.y/40.)/4.).a - 0.5;
    q2.x += (2.4*w1 + 1.3*w2) * gr * live * (0.6 + 0.8*uLow);
    q2.y += 0.5*w2 * gr * live;
  }`, live: `
  if (live > 0.001) {
    vec2 lq = (q + vec2(-14.*uT, -4.*uT)) / 260.;
    float lf = texture(uNoise, lq/8.).r;
    lightMul = mix(1., 0.80 + 0.32*smoothstep(0.2, 0.8, lf), live);
    Ll *= mix(1., lightMul, 1. - 0.5*skyM);
    float gr = smoothstep(430., 560., q.y);
    float fl = texture(uNoise, vec2(q.x/60. + uS*0.04, q.y/26.)/4.).g - 0.5;
    Ll *= 1. + 0.10*fl*gr*live;
  }`, post: `` };

  // 6 · rocas y rompiente: el granito suelta plata que se vuelve espuma; el mar florece en encaje
  KINDS.rompiente = { id: 6, warp: `
  if (water > 0.01 && live > 0.) {
    vec2 fl = vec2(texture(uNoise, q/vec2(340.,240.) + vec2(uS*0.007, 0.)).g, texture(uNoise, q/vec2(300.,200.) + vec2(0.37, -uS*0.005)).a) - 0.5;
    q2 += fl * 4. * water * live * (0.6 + 0.8*uLow);
  }`, live: `
  if (live > 0.001) {
    float g = par.x;                       // avance del pasaje sierra → espuma
    float hh = max(q.y - 400., 1.5);
    float wv = texture(uNoise, vec2(q.x/240., q.y/18. + uS*0.04)/6.).g - 0.5;
    float seaM = smoothstep(0.08, 0.45, water);
    Ll *= 1. + 0.16*wv*seaM*live*(1. - smoothstep(0.55, 0.8, L0));
    Ll *= mix(1., 1. - 0.30*par.y, seaM * live * (1. - smoothstep(0.62, 0.88, L0)));   // el mar se oscurece: la espuma nueva se lee
    if (g > 0.) {
      float dR = P.b * 255.;
      vec4 nz = texture(uNoise, q/vec2(150., 60.) + vec2(0., uS*0.01));
      float d = dR + 5.*(nz.r - 0.5);
      float pers = mix(0.6, 1., smoothstep(0., 140., d));
      float reachF = 10. + 130.*g;
      float env = smoothstep(0.5, 3.5, d) * (1. - smoothstep(0.45*reachF, reachF, d + 25.*(nz.g - 0.5)));
      vec2 lc = vec2(q.x/46. + q.y/70., (d - uS*6.)/(13.*pers)) + 0.8*vec2(nz.g - 0.5, nz.a - 0.5);
      float ce = cellEdge(lc);
      float wid = mix(0.08, 0.2, nz.b) * mix(1.4, 0.75, smoothstep(0., 90., d));
      float net = 1. - smoothstep(wid*0.45, wid, ce);
      vec4 nz2 = texture(uNoise, q/vec2(95., 38.) - vec2(uS*0.012, uS*0.02));
      float brk = smoothstep(0.22, 0.45, nz2.g);
      float patchF = smoothstep(0.58, 0.8, nz2.b + 0.45*(1. - smoothstep(0., 22., d)) - 0.2*(1. - brk));
      float lace = max(net * brk, patchF * 0.95);
      float wln = 6.5 * (1. + 0.3*(2.*uLow - 1.));
      float froth = smoothstep(-1., 1.5, d) * (1. - smoothstep(wln*0.5, wln, d)) * smoothstep(0.25, 0.5, texture(uNoise, vec2((q.x + q.y)/1500., 0.71)).a);
      float f = max(lace*env, froth) * g * smoothstep(0.3, 0.8, water);
      Ll *= 1. - 0.2 * env * g * (1. - lace) * smoothstep(0.3, 0.8, water);
      r.foam = f * (0.92 + 0.08*uHigh);
    }
    vec2 lq = (q + vec2(-10.*uT, -3.*uT)) / 500.;
    float lf = texture(uNoise, lq/8.).r;
    lightMul = mix(1., 0.94 + 0.12*smoothstep(0.2, 0.8, lf), live);
    Ll *= mix(1., lightMul, 1. - 0.6*skyM);
  }`, post: `` };

  // 7 · Portezuelo (rinconada): mar con ondas, resaca sobre la arena, luz que camina (como en Revelado)
  KINDS.portezuelo = { id: 7, warp: `
  if (water > 0.01) q2.x += 2.0 * sin(q.y*0.11 + uS*2.3) * water * live;
  `, live: `
  float lowB = smoothstep(1250., 1450., q.y);
  Ll = mix(Ll, mix(0.02 + 0.93*L0, Ll, 0.35), lowB);
  if (live > 0.001) {
    vec2 lq = (q + vec2(-12.*uT, -3.*uT)) / 900.;
    float lf = texture(uNoise, lq/8.).r;
    lightMul = mix(1., 0.93 + 0.14*smoothstep(0.2, 0.8, lf), live);
    Ll *= mix(1., lightMul, 1. - 0.6*skyM);
    if (water > 0.01) {
      float hh = max(q.y - 604., 1.5);
      vec2 wc = vec2((q.x - 2400.)/(hh*1.5), 3400./hh + uS*0.55) / 32.;
      float wv = texture(uNoise, wc).g - 0.5;
      float wv2 = texture(uNoise, wc*vec2(0.5, 0.37) + vec2(0.3, uS*0.004)).a - 0.5;
      float amp = smoothstep(3., 30., hh);
      float deep = 0.80 + 0.06*(1. - smoothstep(4., 40., hh));
      float seaM = smoothstep(0.08, 0.45, water) * (1. - smoothstep(1000., 1100., q.y));
      Ll *= mix(1., deep, seaM * live);
      Ll *= 1. + (0.08*wv + 0.05*wv2) * amp * seaM * live;
    }
    float dL = P.g * 255.;
    float shore = sand * (1. - rock) * (1. - smoothstep(40., 60., dL)) * (1. - smoothstep(960., 1000., q.y));
    if (shore > 0.01 && water < 0.99) {
      float ph = uSwashPhase;
      float reach = 16. * (0.5 + 0.5*sin(ph)) * (0.6 + 0.8*uLow) + 2.;
      float reach2 = 9. * (0.5 + 0.5*sin(ph - 2.1)) * (0.6 + 0.8*uLow) + 1.;
      float lacy = smoothstep(0.3, 0.75, texture(uNoise, vec2(q.x/70., q.y/18.)).b);
      float l1 = exp(-pow((dL - reach)/3.0, 2.)) * (0.5 + 0.5*lacy);
      float l2 = exp(-pow((dL - reach2)/1.8, 2.)) * 0.6 * lacy;
      float film = 1. - smoothstep(reach - 3., reach, dL);
      float retreat = smoothstep(0.1, -0.6, cos(ph));
      float sheen = retreat * exp(-max(dL - reach, 0.)/14.) * (1. - film);
      float Lf = mix(Ll, 0.95, max(l1, l2) * 0.9);
      Lf = mix(Lf, Lf*0.93 + 0.03, film*0.6);
      Lf *= 1. + 0.05*sheen;
      Ll = mix(Ll, Lf, shore * live);
    }
  }`, post: `` };

  // 8 · gruta: lámina de resaca sobre la arena, cáusticas en las paredes bajas, pororó en la boca
  KINDS.gruta = { id: 8, warp: ``, live: `
  if (live > 0.001) {
    vec2 lq = (q + vec2(-12.*uT, -3.*uT)) / 900.;
    float lf = texture(uNoise, lq/8.).r;
    lightMul = mix(1., 0.93 + 0.14*smoothstep(0.2, 0.8, lf), live);
    Ll *= lightMul;
    Ll *= 1. - 0.55*skyM*(1. - smoothstep(0.14, 0.5, Ll))*(0.94 + 0.06*sin(uT*1.1));
    if (sand > 0.01) {
      float gp = uGrottoPhase;
      float reach = (40. + 150. * pow(0.5 + 0.5*sin(gp), 1.2)) * (0.75 + 0.5*uLow) * (1. + 0.35*uSurge);
      float nx = texture(uNoise, vec2(q.x/900., gp*0.02)).r - 0.5;
      float yf = 1742. - reach * (1. + 0.45*nx);
      float sd = q.y - yf;
      float sheet = smoothstep(-1., 3., sd);
      float lacy = smoothstep(0.3, 0.7, texture(uNoise, vec2(q.x/55., q.y/14.)).b);
      float edge = exp(-pow((sd - 3.)/3.6, 2.)) * (0.6 + 0.4*lacy);
      float gloss = sheet * exp(-max(sd - 6., 0.)/55.);
      float trail = smoothstep(-80., 0., sd) * (1. - sheet) * smoothstep(-0.2, 0.6, -cos(gp));
      float Lg = Ll;
      Lg *= 1. - 0.30*gloss - 0.10*sheet;
      Lg += 0.06*sheet*smoothstep(0.45, 0.8, texture(uNoise, vec2(q.x/120. + gp*0.05, q.y/25.)).g);
      Lg *= 1. - 0.14*trail;
      Lg = mix(Lg, 0.95, edge*0.92*step(8., reach));
      Ll = mix(Ll, Lg, sand * live);
    }
    float dS = P.g * 255. * 2.;
    float wetM = sand * (1. - smoothstep(1452., 1478., q.y));
    Ll *= 1. - 0.16*wetM;
    float cw = (1. - sand) * (1. - smoothstep(20., 260., dS)) * (1. - 0.6*skyM);
    if (cw > 0.01) {
      float t = uT;
      vec2 k1 = vec2(cos(0.3 + 0.07*t), sin(0.3 + 0.07*t)) * 0.071;
      vec2 k2 = vec2(cos(2.4 - 0.05*t), sin(2.4 - 0.05*t)) * 0.083;
      vec2 k3 = vec2(cos(4.3 + 0.04*t), sin(4.3 + 0.04*t)) * 0.064;
      float s = sin(dot(q, k1) + 1.3*t) + sin(dot(q, k2) - 1.1*t) + sin(dot(q, k3) + 0.9*t);
      float c = pow(1. - abs(s)/3., 3.);
      Ll *= 1. + 0.12 * (2.*c - 0.6) * (0.6 + 0.4*uHigh) * cw * live;
    }
    // pororó: el maíz revienta en blanco, la espuma estalla en la boca con cada golpe medido
    {
      float zone = smoothstep(1330., 1420., q.y) * (1. - smoothstep(1700., 1745., q.y)) * smoothstep(1180., 1330., q.x) * (1. - smoothstep(2020., 2120., q.x));
      float pf = max(popFoam(q, uOn.x, uOn.y, par.x, 46.), popFoam(q, uOn.z, uOn.w, par.x, 46.));
      r.foam = max(r.foam, pf * zone * live);
    }
  }`, post: `` };

  // 9 · estratos: la cerrazón baja entre las capas y el agua corre por la hendidura
  KINDS.estratos = { id: 9, warp: `
  if (water > 0.01 && live > 0.) {
    float fl = texture(uNoise, vec2(q.x/38., q.y/160. - uS*0.4)/4.).g - 0.5;
    q2.x += fl * 6. * water * live;
  }`, live: `
  if (live > 0.001) {
    // cerrazón: niebla espesa que desciende desde arriba entre los estratos y se desplaza despacio
    float yF = par.x;                                     // frente de niebla (px de foto)
    vec2 fq = q/vec2(520., 340.) + vec2(uT*0.006, -uT*0.004);
    float fb = texture(uNoise, fq/6.).b*0.6 + texture(uNoise, fq*1.9/6. + 0.3).r*0.4;
    float fd = smoothstep(yF, yF - 460., q.y) * (0.55 + 0.7*fb);
    fd = clamp(fd, 0., 1.) * par.y;
    float Lfog = 0.70 + 0.10*fb;
    Ll = mix(Ll, mix(Ll, Lfog, 0.85), fd*live);
    // agua que corre por la hendidura: hilos claros que bajan
    if (water > 0.02) {
      float fl = texture(uNoise, vec2(q.x/34., q.y/150. - uS*0.55)/4.).g;
      float fl2 = texture(uNoise, vec2(q.x/17., q.y/70. - uS*0.9)/4.).a;
      float st = smoothstep(0.42, 0.72, 0.6*fl + 0.4*fl2);
      Ll = mix(Ll, 0.90, water*live*(0.18 + 0.52*st));
    }
    vec2 lq = (q + vec2(-9.*uT, -3.*uT)) / 600.;
    float lf = texture(uNoise, lq/8.).r;
    lightMul = mix(1., 0.94 + 0.12*smoothstep(0.2, 0.8, lf), live);
    Ll *= lightMul;
  }`, post: `` };

  // 10 · playa con pastos: los pastos se mecen con el viento, el mar gris respira; la plata se vuelve arena
  KINDS.playa = { id: 10, warp: `
  if (live > 0.) {
    // pastos: la punta se mueve más que la base (base y altura de cada mata en par/par2)
    for (int ti = 0; ti < 2; ti++) {
      vec4 tf = ti == 0 ? par : par2;      // x base, y base, alto, ancho medio
      float hgt = clamp((tf.y - q.y)/tf.z, 0., 1.);
      float wx = 1. - smoothstep(tf.w*0.6, tf.w*1.3, abs(q.x - tf.x - hgt*0.35*tf.z*0.5));
      float ph = uS*0.9 + q.x*0.012 + q.y*0.006;
      q2.x += live * wx * hgt*hgt * (9.*sin(ph) + 4.*sin(ph*2.3 + 1.7)) * (0.6 + 0.8*uLow);
    }
    if (water > 0.01) {
      float hh = max(q.y - 806., 1.);
      q2.x += 3.0*sin(q.y*0.13 + uS*1.9)*water*live;
      q2.y += 1.5*sin(q.x*0.02 - uS*1.3)*water*live;
    }
  }`, live: `
  if (live > 0.001) {
    vec2 lq = (q + vec2(-10.*uT, -2.*uT)) / 800.;
    float lf = texture(uNoise, lq/8.).r;
    lightMul = mix(1., 0.94 + 0.12*smoothstep(0.2, 0.8, lf), live);
    Ll *= mix(1., lightMul, 1. - 0.6*skyM);
    if (water > 0.01) {
      float hh = max(q.y - 800., 1.5);
      float wv = texture(uNoise, vec2(q.x/300., q.y/22. + uS*0.05)/6.).g - 0.5;
      Ll *= 1. + 0.16*wv*water*live;
      Ll *= 1. - 0.04*water*live;
    }
    // arena que se mueve con el viento: velos claros y oscuros muy suaves que corren a la derecha
    float sv = texture(uNoise, vec2((q.x - 42.*uT)/330., q.y/28.)/6.).g - 0.5;
    float sv2 = texture(uNoise, vec2((q.x - 70.*uT)/150., q.y/12.)/6.).a - 0.5;
    Ll *= 1. + (0.09*sv + 0.06*sv2)*sand*live*smoothstep(900., 1000., q.y);
  }`, post: `` };

  RV.KINDS = KINDS;

  function waterlineFn(pts) {
    const f = (v) => v.toFixed(1);
    let code = `float yWl(float x){\n  float y = ${f(pts[0][1])};\n`;
    for (let i = 0; i < pts.length - 1; i++) code += `  y = mix(y, mix(${f(pts[i][1])}, ${f(pts[i + 1][1])}, clamp((x - ${f(pts[i][0])})/${f(pts[i + 1][0] - pts[i][0])}, 0., 1.)), step(${f(pts[i][0])}, x));\n`;
    return code + '  return y;\n}\n';
  }

  // o: {kind, archive, figB}
  RV.printSource = function (o) {
    const K = KINDS[o.kind];
    const defs = `#define KIND ${K.id}\n#define ARCHIVE ${o.archive ? 1 : 0}\n#define HAS_FIGB ${o.figB ? 1 : 0}\n`;
    const body = PRINT_BODY.replace('__WARP__', K.warp || '').replace('__LIVE__', K.live || '').replace('__POST__', K.post || '');
    return PRINT_HEAD.replace('__DEFINES__', defs).replace('__WATERLINE__', '') + body;
  };

  // ---------- pase de composición ----------
  RV.compositeSource = function () {
    return `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 uv; out vec4 o;
${COMMON}
${FRONT}
uniform float uT, uFrame, uSurge, uDual, uBArch, uSink, uRms;
uniform sampler2D uGrain, uPB, uPA;
uniform vec2 uGOff;
uniform vec4 uBurn, uBurn2;     // progreso, yFull, yZero, densidad | fase del borde, amplitud del borde, pluma
void main(){
  vec2 p = vec2(uv.x * 1080., (1. - uv.y) * 1920.);
  FR f = frontAll(p);
  float er = f.er, perp = f.perp, dev = f.dev;
  if (uMen2.w < 0.5 && uDevAll < 0.) er = 1e5;
  ivec2 ip = ivec2(gl_FragCoord.xy);
  vec4 gt = texelFetch(uGrain, (ivec2(p) + ivec2(uGOff)) & 1023, 0);
  vec4 B = texelFetch(uPB, ip, 0);
  float Dbg = B.r, Df = B.g, figC = B.b, foam = uBArch > 0.5 ? 0. : B.a, arch = uBArch > 0.5 ? B.a : 0.;
  if (uDual > 0.5) {
    vec4 A = texelFetch(uPA, ip, 0);
    if (uMen4.x > 0.5) {
      // laboratorio: la vieja se sumerge (densidad → papel mojado) y la nueva sube desde el blanco
      float keep = step(nucN(p, 41u), 1. - uSink);
      Dbg = Dbg + A.r * (1. - uSink);
      float cA = A.b * keep;
      float D0 = mix(Dbg, mix(Df, A.g, cA), max(figC, cA));
      Dbg = D0; Df = D0; figC = max(figC, cA); foam = max(foam, A.a * (1. - uSink));
    } else {
      // relevo llevado por el frente: delante sólo la copia vieja; en la banda de lavado se disuelve; detrás sólo la nueva
      float wA = 1. - smoothstep(0., 64., er);
      float wF = 1. - smoothstep(0., 70., er);
      float cB = figC;
      if (er <= 0.) { Dbg = 0.; Df = 0.; cB = 0.; foam = 0.; arch = 0.; }
      float cA = 0., DfA = 0.;
      if (wA > 0.) {
        float keep = step(nucN(p, 41u), wF);      // cada grano de la figura vieja está entero o ya no está
        Dbg = min(Dbg + A.r * wA, 2.2);
        cA = A.b * keep; DfA = A.g;
        foam = max(foam, A.a * wA);
      }
      float Dm = mix(Dbg, Df, cB);
      Dm = mix(Dm, DfA, cA);
      figC = max(cB, cA);
      Dbg = Dm; Df = Dm;
    }
  }
  float D = mix(Dbg, Df, figC);
  float archAmt = (uBArch > 0.5 && uDevAll < 0.) ? (1. - dev) : 0.;
  D *= 1. + 0.04*(2.*uRms - 1.) + uRinse.w;
  // bordes quemados a mano en la copia viva (viñeta suave de ampliadora)
  { vec2 vq = (p - vec2(540., 1000.)) / vec2(620., 1050.); D += 0.065 * smoothstep(0.7, 1.4, dot(vq, vq)) * (1. - archAmt); }
  float L = LP * exp2(-3.321928 * D);
  L = mix(L, 0.955, foam * (1. - figC));
  // quemado del cielo: tarjeta sostenida a mano, borde ancho y ondulado que deriva despacio
  if (uBurn.x > 0.) {
    float yc = mix(-420., uBurn.y, uBurn.x);
    float nb1 = texture(uNoise, vec2(p.x/2200. + uBurn2.x, 0.83)).b - 0.5;
    float nb2 = texture(uNoise, vec2(p.x/900. - 0.6*uBurn2.x, 0.29)).r - 0.5;
    float wave = uBurn2.y * (1.4*nb1 + 0.6*nb2);
    float bd = uBurn.w * (1. - smoothstep(yc, yc + uBurn2.z, p.y + wave));
    L *= exp2(-3.321928 * bd);
  }
  // la emulsión mojada que todavía no reveló es gris lechosa, no papel blanco (sólo fuera de las figuras)
  if (uDevAll < 0. && er > 0. && er < 1e4) L *= 1. - 0.08*(1. - dev)*(1. - figC)*smoothstep(0., 160., er);
  // grano: vivo fino, archivo grueso, figuras en grumos densos de plata
  float g1 = gt.r - 0.5, g2 = gt.g - 0.5, gA = gt.b - 0.5, gF = gt.a - 0.5;
  float mid = max(clamp(4. * L * (1. - L), 0.15, 1.), 0.5*figC);
  float grain = (0.6*g1 + 0.75*g2) * 0.072 * uBurn2.w;
  grain = mix(grain, (0.35*g1 + 1.1*gA) * 0.16, archAmt);
  grain = mix(grain, (0.35*g1 + 1.0*gF) * 0.13, figC);
  L = clamp(L + grain * mid, 0., 1.);
  // menisco: labio oscuro delante, cresta especular quebrada con cuerpo, valle capilar, ondas que siguen, banda mojada
  float spec = 0.;
  if (uMen2.w > 0.5 && uMen4.x < 0.5 && er > -3. && er < 240.) {
    float nb = texture(uNoise, vec2(perp/3840. + uMen2.z, uTr*0.02 + 0.5)).a;
    float nb2 = texture(uNoise, vec2(perp/1300. + 1.3*uMen2.z, 0.37)).g;
    float thick = 3. + 3.*nb2;
    float brk = smoothstep(0.44, 0.6, nb);
    if (er < 0.) L *= 1. - (0.08 + 0.1*brk)*smoothstep(-2.6, -0.8, er);
    float crest = smoothstep(-0.2, 0.9, er) * (1. - smoothstep(thick - 1.2, thick + 0.6, er));
    spec = crest * brk * min(1., 0.72 + 0.28*uSurge);
    float trough = smoothstep(thick, thick + 1.5, er) * (1. - smoothstep(thick + 5., thick + 8., er));
    float r1 = er - (34. + 7.*nb2), r2 = er - (68. + 12.*nb2);
    float rip = 0.065*exp(-r1*r1/3.) - 0.045*exp(-(r1 - 3.2)*(r1 - 3.2)/4.) + 0.04*exp(-r2*r2/4.) - 0.03*exp(-(r2 - 3.4)*(r2 - 3.4)/5.);
    L *= 1. - 0.07*step(0., er)*exp(-er/90.);   // papel mojado: apenas gris, nunca un halo claro
    float midL = 4.*L*(1. - L);
    float gl = step(0., er) * exp(-er/16.) * 0.08 * midL;
    float wb = step(0., er) * (1. - smoothstep(0., 230., er));
    L *= (1. - (0.05 + 0.1*brk)*trough) * (1. + rip*step(0., er));
    L = (L + (L - 0.5)*0.14*wb*midL) * (1. - 0.07*wb) + gl;
  }
  vec3 col = toneColor(clamp(L, 0., 1.), archAmt);
  // plateado: brillo frío en las zonas densas junto a los bordes (sólo archivo)
  if (archAmt > 0.) {
    vec2 e2 = min(p, vec2(1080., 1920.) - p);
    float edgeF = 1. - smoothstep(0., 220., min(e2.x, e2.y));
    float dens = 1. - smoothstep(0.3, 0.6, L);
    col = mix(col, vec3(L*1.06)*vec3(0.96, 0.99, 1.04), 0.6*edgeF*dens*archAmt);
    col = mix(col, col * vec3(1.02, 0.93, 0.8), 0.7*arch);
  }
  col = mix(col, vec3(0.985, 0.965, 0.93), spec*0.8);
  o = vec4(col, 1.);
}
`;
  };

  // Plata que se suelta: puntos en forma cerrada (sin estado entre cuadros)
  RV.VS_FOAM = `#version 300 es
precision highp float;
in vec4 aP;   // x0, y0 (px foto), dirx, diry
in vec4 aQ;   // t liberación, velocidad (px foto/s), vida, d0 (recorrido antes de volverse claro)
in vec4 aR;   // fase del remolino, amplitud, L de la roca, tamaño (px pantalla)
uniform float uT, uS;
uniform vec4 uGeo;   // originX, originY, escala, zoom
uniform vec4 uGeo2;  // cx, cy
uniform vec4 uBurn;
uniform vec4 uSh;    // recorrido de transición (px foto) de oscuro a claro, fin del efecto (t), desvanecido final (s), 0
out float vA; out float vW; out float vL; out float vB; out float vSd;
void main(){
  float age = uT - aQ.x;
  vSd = aR.x;
  if (age < 0. || age > aQ.z) { gl_Position = vec4(2., 2., 0., 1.); gl_PointSize = 0.; vA = 0.; vW = 0.; vL = 0.; vB = 1.; return; }
  vec2 dir = aP.zw, pe = vec2(-dir.y, dir.x);
  float trav = aQ.y * age * (1. - 0.3*age/aQ.z);
  vec2 q = aP.xy + dir * trav + pe * aR.y * sin(age*1.7 + aR.x) * min(age, 1.);
  vec2 s = (q - uGeo.xy) * uGeo.z;
  s = (s - uGeo2.xy) * uGeo.w + uGeo2.xy;
  float wht = smoothstep(uSh.x*0.1, uSh.x, trav - aQ.w);
  float a = smoothstep(0., 0.2, age) * (1. - smoothstep(aQ.z*0.6, aQ.z, age));
  a *= 1. - smoothstep(uSh.y - uSh.z, uSh.y, uT);
  float yc = mix(-420., uBurn.y, uBurn.x);
  float bd = uBurn.x > 0. ? uBurn.w * (1. - smoothstep(yc, yc + uBurn.z, s.y)) : 0.;
  vA = a; vW = wht; vL = aR.z; vB = pow(10., -bd);
  gl_Position = vec4(s.x/540. - 1., 1. - s.y/960., 0., 1.);
  gl_PointSize = aR.w * uGeo.w * (1. + 0.35*wht);
}`;
  // dos pases conmutativos (deterministas): MIN para la plata oscura que se suelta, MAX para lo claro (espuma o arena)
  RV.FS_FOAM = `#version 300 es
precision highp float;
precision highp int;
in float vA; in float vW; in float vL; in float vB; in float vSd;
out vec4 o;
${COMMON}
uniform float uHigh, uPass, uPale;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float an = atan(c.y, c.x);
  float rad = 0.4 + 0.05*sin(4.*an + vSd) + 0.03*sin(7.*an - 2.*vSd);   // grano algo irregular
  float r = 1. - smoothstep(rad - 0.14, rad, length(c));
  if (uPass < 0.5) {
    float a = vA * r * (1. - vW);
    o = vec4(mix(vec3(1.), toneColor(clamp(vL*vB, 0., 1.), 0.), a), 1.);
  } else {
    float Lw = uPale * (0.9 + 0.1*uHigh);
    float a = vA * r * vW * 0.85;
    o = vec4(toneColor(clamp(Lw*vB, 0., 1.), 0.) * a, 1.);
  }
}`;
})();
