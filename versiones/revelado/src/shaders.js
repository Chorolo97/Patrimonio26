/*
 * Revelado — shaders. Un único pase de composición a resolución completa (copia vieja + copia nueva, figuras, menisco,
 * enjuague, quemado, grano, virado) y un pase de puntos para la plata que se suelta del granito y se vuelve espuma.
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
`;

  const FS_COMPOSITE = `#version 300 es
__DEFINES__
precision highp float;
precision highp int;
precision highp sampler2D;
in vec2 uv; out vec4 o;
${COMMON}
uniform float uT, uTr, uFrame, uWt, uS, uLow, uHigh, uRms;
uniform sampler2D uWtex;   // W(t) por cuadro (1201×1, float)
uniform sampler2D uNoise;  // ruido periódico 512², mipmaps
uniform sampler2D uGrain;  // grano 1024² (R blanco, G fino, B grumos de archivo, A grumos de figura)
uniform vec2 uGOff;
// copia B (nueva / actual) y A (vieja, blanqueándose)
uniform sampler2D bPhoto, bMask, bFigA, bFigB, aPhoto, aMask, aFigA, aFigB;
uniform vec4 bGeo, bGeo2, bKind, bBoxA, bBoxB, bGrp, bFlags;
uniform vec4 aGeo, aGeo2, aKind, aBoxA, aBoxB, aGrp, aFlags;
uniform float aOn;
uniform vec4 uMen, uMen2;      // menisco de la copia B: t0, s0, v, ángulo | curva, ruido, semilla, visible
uniform float uDevAll;         // ≥0: copia B ya revelada por completo
uniform vec4 uRinse;           // ondulación, radio del anillo, amplitud del anillo, oscurecimiento
uniform vec4 uBurn;            // progreso, yFull, yZero, densidad
uniform float uSurge, uFoamGrow, uSwashPhase, uGrottoPhase, uLive;

float front(vec2 p, out float tarr, out float perp){
  float a = uMen.w; vec2 d = vec2(sin(a), -cos(a)); vec2 r = p - vec2(540., 1920.);
  float proj = dot(r, d); perp = dot(r, vec2(-d.y, d.x));
  float x = perp / 300. + uMen2.z;
  float n = 0.62*sin(x*1.25 + 0.3) + 0.3*sin(x*2.6 + 1.7) + 0.12*sin(x*5.1 + 4.1);
  n = uMen2.y * n + uMen2.x * (perp/540.)*(perp/540.);
  tarr = uMen.x + (proj + n - uMen.y) / uMen.z;
  return (uTr - tarr) * uMen.z; // px por detrás del frente
}
float wAt(float t){ return t <= 0. ? t * 3.0 : texture(uWtex, vec2((t*30. + 0.5)/1201., 0.5)).r; }

struct PR { float D; float fig; float arch; float foam; float Df; };

__PRINTFNS__
void main(){
  vec2 p = vec2(uv.x * 1080., (1. - uv.y) * 1920.);
  // enjuague: la copia descansa bajo agua quieta
  if (uRinse.x > 0.) {
    p += uRinse.x * vec2(sin(p.y/260. + uT*0.9), cos(p.x/310. + uT*0.7));
    vec2 rr = p - vec2(620., 760.); float dd = length(rr);
    float x = dd - uRinse.y;
    p += normalize(rr + 1e-4) * uRinse.z * exp(-x*x/900.) * sin(x/9.);
  }
  // menisco de la copia B
  float tarr = 0., perp = 0., er = 1e5;
  vec2 pr = p;
  if (uDevAll < 0. || uMen2.w > 0.5) {
    float e = front(p, tarr, perp);
    float wob = uMen2.w > 0.5 ? 1.8*sin(perp/95. + uTr*4.1) + 0.9*sin(perp/37. - uTr*6.3) : 0.;
    er = e - wob;
    if (uMen2.w > 0.5 && er > 0. && er < 10.) { float a = uMen.w; pr += vec2(sin(a), -cos(a)) * 6. * (1. - er/10.); }
  }
  ivec2 ip = ivec2(p);
  vec4 gt = texelFetch(uGrain, (ip + ivec2(uGOff)) & 1023, 0);
  float hd = fract(gt.r * 13.71 + gt.g * 0.37);
  float dev = 1., tau = 99., devFig = 1.;
  if (uDevAll < 0.) { tau = uWt - wAt(tarr); dev = 1. - exp(-max(0., tau - 0.06)/0.55); devFig = 1. - exp(-max(0., tau - 0.03)/0.3); }
  PR B = shadeB(pr, dev, devFig, hd);
#if B_ARCHIVE
  float archAmt0 = uDevAll < 0. ? (1. - dev) : 0.;
#else
  float archAmt0 = 0.;
#endif
  float D = B.D, fig = B.fig, arch = B.arch, foam = B.foam;
#if DUAL
  {
    float bl = 1. - smoothstep(0., 0.35, tau);
    if (tau < 0.5) {
      PR A = shadeA(pr, 1., 1., hd);
      float blF = 1. - smoothstep(0.22, 0.5, tau);   // las figuras viejas se blanquean al final
      D = min(D + max(A.D * bl, A.Df * blF), 2.2);
      fig = max(fig, A.fig * (1. - smoothstep(0.22, 0.5, tau))); foam = max(foam, A.foam*bl);
    }
  }
#endif
  D *= 1. + 0.04*(2.*uRms - 1.) + uRinse.w;
  // bordes quemados a mano en la copia viva (viñeta suave de ampliadora)
  { vec2 vq = (p - vec2(540., 1000.)) / vec2(620., 1050.); D += 0.065 * smoothstep(0.7, 1.4, dot(vq, vq)) * (1. - archAmt0); }
  float L = LP * exp2(-3.321928 * D);
  L = mix(L, 0.95, foam * (1. - fig));
  if (uRinse.z > 0.) { float x = length(p - vec2(620., 760.)) - uRinse.y; L *= 1. + 0.02*exp(-x*x/1200.)*cos(x/9.); }
  // quemado del cielo (tarjeta sostenida a mano, borde ondulado)
  if (uBurn.x > 0.) {
    float yc = mix(-320., uBurn.y, uBurn.x);
    float wave = 16.*sin(p.x/210. + uT*0.8) + 7.*sin(p.x/77. - uT*1.3);
    float bd = uBurn.w * (1. - smoothstep(yc, yc + (uBurn.z - uBurn.y), p.y + wave));
    L *= exp2(-3.321928 * bd);
  }
  // grano: vivo fino, archivo grueso, figuras en grumos densos
  float g1 = gt.r - 0.5, g2 = gt.g - 0.5, gA = gt.b - 0.5, gF = gt.a - 0.5;
  float mid = clamp(4. * L * (1. - L), 0.15, 1.);
  float archW = arch > 0. ? 1. : 0.;
#if B_ARCHIVE
  float archAmt = uDevAll < 0. ? (1. - dev) : 0.;
#else
  float archAmt = 0.;
#endif
  float grain = (0.6*g1 + 0.75*g2) * 0.072;
  grain = mix(grain, (0.35*g1 + 1.1*gA) * 0.15, archAmt);
  grain = mix(grain, (0.3*g1 + 1.0*gF) * 0.095, fig);
  L = clamp(L + grain * mid, 0., 1.);
  // menisco: labio oscuro delante, línea especular quebrada, banda mojada detrás
  float spec = 0.;
  if (uMen2.w > 0.5) {
    if (er < 0. && er > -2.4) L *= 0.84;
    float shade = smoothstep(2.5, 5., er) * (1. - smoothstep(9., 22., er));
    vec4 nb = texture(uNoise, vec2(perp/(26.*32.), uT*0.05));
    float brk = smoothstep(0.3, 0.62, nb.g) * (0.75 + 0.25*nb.a);
    float line = smoothstep(0., 0.7, er) * (1. - smoothstep(1.8 + 1.2*nb.a, 3.4 + 1.2*nb.a, er));
    spec = line * brk * min(1., 0.55 + 0.3*uSurge);
    float gl = exp(-max(er - 2., 0.)/9.) * step(0., er) * 0.07 * (0.5 + 0.5*brk);
    float wetW = uMen.z * 0.8;
    float wb = step(0., er) * (1. - smoothstep(0., wetW, er));
    L = (0.5 + (L - 0.5)*(1. + 0.1*wb)) * (1. - 0.06*wb) * (1. - 0.07*shade) + gl;
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
  col = mix(col, vec3(1.0, 0.965, 0.902), spec);
  o = vec4(col, 1.);
}
`;

  // Cuerpo de la función de copia, especializado por macros (una variante de programa por combinación de copias)
  const PRINT_BODY = `
// kind: x = gruta, y = copia de archivo (P1), z = espuma de la sierra (P3), w = movimiento vivo
PR FNAME(vec2 p, float dev, float devFig, float hd){
  PR r; r.fig = 0.; r.arch = 0.; r.foam = 0.; r.Df = 0.;
  float Dfig = 0.;
  vec2 q = geo.xy + ((p - geo2.xy)/geo.w + geo2.xy)/geo.z;   // px de foto
  vec2 isz = 1. / geo2.zw;
  vec4 M = texture(MK, vec2(q.x*isz.x, 1. - q.y*isz.y));
  float water = M.r, rock = M.g, sand = M.b, skyM = M.a;
  float live = dev;
  vec2 q2 = q;
#if !IS_GRUTA
  if (water > 0.01) q2.x += 2.0 * sin(q.y*0.11 + uS*2.3) * water * live;
#endif
  vec4 P = texture(PH, vec2(q2.x*isz.x, 1. - q2.y*isz.y));
  float L0 = P.r, Ll = P.a;
#if !STATIC
  // luz de la mañana que camina sobre la tierra
  vec2 lq = (q + vec2(-12.*uT, -3.*uT)) / 900.;
  float lf = texture(uNoise, lq/8.).r;
  Ll *= mix(1., 0.93 + 0.14*smoothstep(0.2, 0.8, lf), live * (1. - 0.6*skyM*float(1 - IS_GRUTA)));
#if !IS_GRUTA
  {
    // mar: ondas horizontales con escala que se comprime hacia el horizonte
    if (water > 0.01) {
      float hh = max(q.y - 604., 1.5);
      vec2 wc = vec2((q.x - 2400.)/(hh*1.5), 3400./hh + uS*0.55) / 32.;
      float wv = texture(uNoise, wc).g - 0.5;
      float wv2 = texture(uNoise, wc*vec2(0.5, 0.37) + vec2(0.3, uS*0.004)).a - 0.5;
      float amp = smoothstep(3., 30., hh);
      // el mar sobreexpuesto de la postal se imprime más profundo en la copia viva (la espuma tiene contra qué leerse)
      float deep = 0.80 + 0.08*smoothstep(8., 60., hh) * 0. + 0.06*(1. - smoothstep(4., 40., hh));
      Ll *= mix(1., deep, water * live);
      Ll *= 1. + (0.08*wv + 0.05*wv2) * amp * water * live;
      // espuma de la sierra: encaje paralelo a la orilla que deriva mar adentro, anillo que respira
#if FOAM
      if (uFoamGrow > 0.) {
        float dR = P.b * 255.;
        vec4 nz = texture(uNoise, q/vec2(170., 120.) + vec2(0., uS*0.01));
        float dRn = dR + 9.*(nz.r - 0.5);
        // espuma espesa pegada a la roca, rota; su ancho respira con los graves
        float w = 14. * (1. + 0.3*(2.*uLow - 1.));
        float froth = (1. - smoothstep(w*0.35, w, dRn)) * smoothstep(0.28, 0.58, nz.b);
        // encaje: red de hilos alargados según la orilla que deriva mar adentro con S(t)
        float n1 = texture(uNoise, vec2(q.x/760., (dRn - uS*4.5)/300.)).g;
        float n2 = texture(uNoise, vec2(q.x/430. + 0.37, (dRn - uS*3.2)/190.)).a;
        float ridge = max(1. - smoothstep(0.03, 0.12, abs(n1 - 0.5)), 0.5*(1. - smoothstep(0.02, 0.09, abs(n2 - 0.5))));
        float lace = ridge * exp(-dRn/16.) * smoothstep(1., 5., dRn);
        froth *= 0.75 + 0.25*n2;
        float f = max(lace*0.85, froth*0.95) * uFoamGrow * smoothstep(0.35, 0.9, water);
        r.foam = f * (0.86 + 0.14*uHigh);
      }
#endif
    }
    // resaca: líneas de espuma sobre la arena, brillo de arena mojada al retirarse
    float dL = P.g * 255.;
    float shore = sand * (1. - rock) * (1. - smoothstep(40., 60., dL)) * (1. - smoothstep(960., 1000., q.y));
    if (shore > 0.01 && water < 0.99) {
      float ph = uSwashPhase;
      float reach = 16. * (0.5 + 0.5*sin(ph)) * (0.6 + 0.8*uLow) + 2.;
      float reach2 = 9. * (0.5 + 0.5*sin(ph - 2.1)) * (0.6 + 0.8*uLow) + 1.;
      float lacy = smoothstep(0.3, 0.75, texture(uNoise, vec2(q.x/70., q.y/18.)).b);
      float l1 = exp(-pow((dL - reach)/2.1, 2.)) * (0.45 + 0.55*lacy);
      float l2 = exp(-pow((dL - reach2)/1.6, 2.)) * 0.6 * lacy;
      float film = 1. - smoothstep(reach - 3., reach, dL);
      float retreat = smoothstep(0.1, -0.6, cos(ph));
      float sheen = retreat * exp(-max(dL - reach, 0.)/14.) * (1. - film);
      float Lf = mix(Ll, 0.945, max(l1, l2) * 0.8);
      Lf = mix(Lf, Lf*0.96 + 0.05, film*0.6);
      Lf *= 1. + 0.05*sheen;
      Ll = mix(Ll, Lf, shore * live);
    }
  }
#else
  {
    // gruta: lámina de resaca que entra por abajo sobre la arena; cáusticas en las paredes bajas; la boca respira
    float gp = uGrottoPhase;
    float reach = (30. + 120. * pow(0.5 + 0.5*sin(gp), 1.3)) * (0.7 + 0.6*uLow);
    float nx = texture(uNoise, vec2(q.x/900., gp*0.02)).r - 0.5;
    float yf = 1742. - reach * (1. + 0.5*nx);
    float sd = q.y - yf; // >0 dentro de la lámina
    float sheet = smoothstep(-1., 3., sd);
    float lacy = smoothstep(0.3, 0.7, texture(uNoise, vec2(q.x/55., q.y/14.)).b);
    float edge = exp(-pow((sd - 1.5)/2.6, 2.)) * (0.55 + 0.45*lacy);
    float trail = smoothstep(-70., 0., sd) * (1. - sheet) * smoothstep(-0.2, 0.6, -cos(gp));
    float Lg = Ll;
    Lg *= 1. - 0.2*sheet*(0.6 + 0.4*smoothstep(0., 50., sd));
    Lg += 0.05*sheet*smoothstep(0.45, 0.8, texture(uNoise, vec2(q.x/120. + gp*0.05, q.y/25.)).g);
    Lg *= 1. - 0.1*trail;
    Lg = mix(Lg, 0.95, edge*0.85*step(8., reach));
    Ll = mix(Ll, Lg, sand * live);
    float dS = P.g * 255. * 2.;
    float cw = (1. - sand) * (1. - smoothstep(20., 260., dS)) * (1. - 0.5*skyM);
    if (cw > 0.01) {
      float t = uT;
      vec2 k1 = vec2(cos(0.3 + 0.07*t), sin(0.3 + 0.07*t)) * 0.071;
      vec2 k2 = vec2(cos(2.4 - 0.05*t), sin(2.4 - 0.05*t)) * 0.083;
      vec2 k3 = vec2(cos(4.3 + 0.04*t), sin(4.3 + 0.04*t)) * 0.064;
      float s = sin(dot(q, k1) + 1.3*t) + sin(dot(q, k2) - 1.1*t) + sin(dot(q, k3) + 0.9*t);
      float c = pow(1. - abs(s)/3., 3.);
      Ll *= 1. + 0.06 * (2.*c - 0.6) * (0.6 + 0.4*uHigh) * cw * live;
    }
    Ll *= 1. + 0.03 * sin(uT*1.1) * skyM * live;
  }
#endif
#endif
  float Dt = -0.30103 * log2(max(Ll, 0.02)/LP);
  float D;
#if ARCHIVE
  if (dev < 0.999) {
    // archivo: negros levantados, manchas, rayas finas, bordes gastados
    float La = 0.30 + 0.60*L0;
    ivec2 cell = ivec2(floor(q / 46.));
    float h1 = hashI(cell, 91u);
    if (h1 < 0.075) {
      vec2 c0 = (vec2(cell) + 0.2 + 0.6*vec2(hashI(cell, 92u), hashI(cell, 93u))) * 46.;
      float rad = 1.5 + 5.5*hashI(cell, 94u);
      float sp = 1. - smoothstep(rad*0.25, rad, length(q - c0));
      La *= 1. - 0.14 * sp * (0.5 + 0.5*hashI(cell, 95u));
      r.arch = sp;
    }
    for (int i = 0; i < 3; i++) {
      vec2 a = vec2(1480. + 410.*float(i), 150. + 520.*float(i)), b = a + vec2(240. - 150.*float(i), 980. - 170.*float(i));
      vec2 pa = q - a, ba = b - a; float hh = clamp(dot(pa, ba)/dot(ba, ba), 0., 1.);
      float dd = length(pa - ba*hh);
      La += 0.10 * (1. - smoothstep(0.35, 1.1, dd)) * step(0.1, sin(hh*37. + float(i)*2.1) * 0.5 + 0.5*sin(hh*11.3 + float(i)*4.7));
    }
    vec2 e2 = min(p, vec2(1080., 1920.) - p);
    float edgeF = 1. - smoothstep(0., 170., min(e2.x, e2.y));
    La = mix(La, 0.86, 0.35*edgeF);
    float Da = -0.30103 * log2(clamp(La, 0.02, LP)/LP);
    D = mix(Da, Dt, dev);
  } else D = Dt;
#else
  D = Dt * dev;
#endif
  // figuras: la plata más densa, con sombras y un borde iluminado
  vec2 aq = (q - boxA.xy) / boxA.zw;
  if (aq.x > 0. && aq.y > 0. && aq.x < 1. && aq.y < 1.) {
    vec4 F = texture(FA, vec2(aq.x, 1. - aq.y));
    float devF = devFig;
    D += F.g * 0.85 * devF;
    if (F.r > 0.003) {
      float c = smoothstep(hd*0.7 + 0.15 - 0.16, hd*0.7 + 0.15 + 0.16, F.r);
      // la plata precipita en grumos: a media revelación la figura es de granos densos, no un velo gris
      float pr = devF;
      float Df = mix(1.55, 0.75, F.b * flags.x) * c * pr;
      Dfig = max(Dfig, Df); r.fig = max(r.fig, c * pr);
    }
  }
#if HAS_FIGB
  {
    vec2 bq = (q - boxB.xy) / boxB.zw;
    if (bq.x > 0. && bq.y > 0. && bq.x < 1. && bq.y < 1.) {
      vec4 F = texture(FB, vec2(bq.x, 1. - bq.y));
      float gi = floor(F.a * 255. / 60. + 0.5);
      float devF = gi < 1.5 ? grp.x : gi < 2.5 ? grp.y : grp.z;
      devF *= step(0.5, gi) * step(0.15, devFig);
      devF = pow(devF, 1.7);   // la densidad a medio camino se lee como gris: el revelado no terminó
      D += F.g * 0.85 * devF;
      if (F.r > 0.003) {
        float c = smoothstep(hd*0.7 + 0.15 - 0.16, hd*0.7 + 0.15 + 0.16, F.r);
        float pr = devF;
        float Df = mix(1.55, 0.75, F.b * flags.x) * c * pr;
        Dfig = max(Dfig, Df); r.fig = max(r.fig, c * pr);
      }
    }
  }
#endif
  r.D = max(D, Dfig); r.Df = Dfig;
#if ARCHIVE
  r.arch *= 1. - dev;
#else
  r.arch = 0.;
#endif
  return r;
}

`;
  const NAMES = ['PH', 'MK', 'FA', 'FB', 'geo', 'geo2', 'boxA', 'boxB', 'grp', 'flags', 'FNAME', 'IS_GRUTA', 'ARCHIVE', 'FOAM', 'HAS_FIGB', 'STATIC'];
  function printFn(pre, name, o) {
    const vals = [pre + 'Photo', pre + 'Mask', pre + 'FigA', pre + 'FigB', pre + 'Geo', pre + 'Geo2', pre + 'BoxA', pre + 'BoxB', pre + 'Grp', pre + 'Flags', name, o.gruta ? 1 : 0, o.archive ? 1 : 0, o.foam ? 1 : 0, o.figB ? 1 : 0, o.static ? 1 : 0];
    return NAMES.map((n, i) => `#define ${n} ${vals[i]}`).join('\n') + '\n' + PRINT_BODY + '\n' + NAMES.map((n) => `#undef ${n}`).join('\n') + '\n';
  }
  // o: {b: {gruta, archive, foam, figB}, a: null | {gruta, figB}}
  RV.compositeSource = function (o) {
    const defs = `#define DUAL ${o.a ? 1 : 0}\n#define B_ARCHIVE ${o.b.archive ? 1 : 0}\n`;
    return FS_COMPOSITE.replace('__DEFINES__', defs).replace('__PRINTFNS__', printFn('b', 'shadeB', o.b) + (o.a ? printFn('a', 'shadeA', o.a) : ''));
  };

  // Plata que se suelta del borde del granito: puntos en forma cerrada (sin estado entre cuadros)
  RV.VS_FOAM = `#version 300 es
precision highp float;
in vec4 aP;   // x0, y0 (px foto), dirx, diry
in vec4 aQ;   // t liberación, velocidad (px foto/s), vida, d0 (distancia al agua)
in vec4 aR;   // fase del remolino, amplitud, L de la roca, tamaño
uniform float uT, uS;
uniform vec4 uGeo;   // originX, originY, scale, 0
uniform vec4 uBurn;
out float vA; out float vW; out float vL; out float vB;
void main(){
  float age = uT - aQ.x;
  if (age < 0. || age > aQ.z) { gl_Position = vec4(2., 2., 0., 1.); gl_PointSize = 0.; vA = 0.; vW = 0.; vL = 0.; vB = 1.; return; }
  vec2 dir = aP.zw, pe = vec2(-dir.y, dir.x);
  float trav = aQ.y * age * (1. - 0.25*age/aQ.z);
  vec2 q = aP.xy + dir * trav + pe * aR.y * sin(age*2.1 + aR.x) * min(age, 1.);
  vec2 s = (q - uGeo.xy) * uGeo.z;
  float wht = smoothstep(-7., 2., trav - aQ.w);
  float a = smoothstep(0., 0.12, age) * (1. - smoothstep(aQ.z*0.55, aQ.z, age));
  float yc = mix(-320., uBurn.y, uBurn.x);
  float bd = uBurn.x > 0. ? uBurn.w * (1. - smoothstep(yc, yc + (uBurn.z - uBurn.y), s.y)) : 0.;
  vA = a; vW = wht; vL = aR.z; vB = pow(10., -bd);
  gl_Position = vec4(s.x/540. - 1., 1. - s.y/960., 0., 1.);
  gl_PointSize = aR.w;
}`;
  RV.FS_FOAM = `#version 300 es
precision highp float;
precision highp int;
in float vA; in float vW; in float vL; in float vB;
out vec4 o;
${COMMON}
uniform float uHigh;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = 1. - smoothstep(0.22, 0.5, length(c));
  float Lw = 0.94 * (0.88 + 0.12*uHigh);
  float L = mix(vL, Lw, vW) * vB;
  o = vec4(toneColor(clamp(L, 0., 1.), 0.) * (vA * r * mix(0.85, 0.95, vW)), 1.);
}`;
})();
