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
uniform sampler2D uWtex;   // R: W(t), G: S(t), B: W con piso 0,5 en la respiración (reloj de revelado)
uniform sampler2D uNoise;  // ruido periódico 512², mipmaps
uniform sampler2D uGrain;  // grano 1024² (R blanco, G fino, B grumos de archivo, A grumos de figura)
uniform vec2 uGOff;
uniform sampler2D bPhoto, bMask, bFigA, bFigB, aPhoto, aMask, aFigA, aFigB;
uniform vec4 bGeo, bGeo2, bBoxA, bBoxB, bGrp, bGB1, bGB2, bGB3;
uniform vec4 aGeo, aGeo2, aBoxA, aBoxB, aGrp, aGB1, aGB2, aGB3;
uniform vec4 uMen, uMen2, uMen3; // t0, s0, v, ángulo | curva, ruido, semilla, visible | figuras por el frente, τ0, inducción, empuje húmedo
uniform float uDevAll;           // ≥0: copia B ya revelada por completo
uniform vec4 uRinse;             // ondulación, radio del anillo, amplitud del anillo, oscurecimiento
uniform vec4 uBurn, uBurn2;      // progreso, yFull, yZero, densidad | fase del borde, amplitud del borde
uniform vec4 uFoam;              // crecimiento, mar en sombra, deshilachado de la roca, 0
uniform float uSurge, uSwashPhase, uGrottoPhase;

vec2 menDir(){ float a = uMen.w; return vec2(sin(a), -cos(a)); }
float front(vec2 p, out float tarr, out float perp){
  vec2 d = menDir(); vec2 r = p - vec2(540., 1920.);
  float proj = dot(r, d); perp = dot(r, vec2(-d.y, d.x));
  // forma irregular: dos octavas de ruido (≈ 600 y 200 px) y una curvatura suave
  vec4 nn = texture(uNoise, vec2(perp/2400. + uMen2.z, 0.13 + 0.07*uMen2.z));
  float n1 = nn.b - 0.5, n2 = nn.r - 0.5;
  float n = uMen2.y * (1.6*n1 + 0.9*n2) + uMen2.x * (perp/540.)*(perp/540.);
  tarr = uMen.x + (proj + n - uMen.y) / uMen.z;
  return (uTr - tarr) * uMen.z; // px por detrás del frente
}
float wAt(float t){ return t <= 0. ? t * 3.0 : texture(uWtex, vec2((t*30. + 0.5)/1201., 0.5)).b; }

struct PR { float Dbg; float Df; float c; float foam; float arch; };

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

__PRINTFNS__
void main(){
  vec2 p = vec2(uv.x * 1080., (1. - uv.y) * 1920.);
  // enjuague: la copia descansa bajo agua quieta (sólo refracción, sin líneas claras)
  if (uRinse.x > 0.) {
    p += uRinse.x * vec2(sin(p.y/260. + uT*0.9), cos(p.x/310. + uT*0.7));
    vec2 rr = p - vec2(620., 760.); float dd = length(rr);
    float x = dd - uRinse.y;
    float skyK = p.y < 560. ? 0.45 : 1.;
    p += normalize(rr + 1e-4) * uRinse.z * skyK * exp(-x*x/900.) * sin(x/9.);
  }
  // menisco: frente curvo, lente de refracción detrás de la cresta
  float tarr = 0., perp = 0., er = 1e5;
  vec2 pr = p;
  float nl = 0.5;
  if (uDevAll < 0. || uMen2.w > 0.5) {
    float e = front(p, tarr, perp);
    float wob = uMen2.w > 0.5 ? 1.8*sin(perp/95. + uTr*4.1) + 0.9*sin(perp/37. - uTr*6.3) : 0.;
    er = e - wob;
    if (uMen2.w > 0.5 && er > 0. && er < 34.) {
      nl = texture(uNoise, vec2(perp/1300. + 1.3*uMen2.z, 0.37)).g;
      float k = 1. - er/34.;
      pr += menDir() * (8. + 9.*nl) * k*k;
    }
  }
  ivec2 ip = ivec2(p);
  vec4 gt = texelFetch(uGrain, (ip + ivec2(uGOff)) & 1023, 0);
  float dev = 1., tau = 99., devFig = 1.;
  if (uDevAll < 0.) {
    tau = uWt - wAt(tarr);
    dev = 1. - exp(-max(0., tau - uMen3.z)/uMen3.y);
    devFig = 1. - exp(-max(0., tau - 0.03)/0.3);
    devFig = max(devFig, uMen3.x * smoothstep(0., 200., er));
    dev = max(dev, uMen3.w * smoothstep(0., 90., er) * step(0., tau)); // el papel mojado se ve más hondo enseguida
  }
  float Dbg, Df = 0., figC = 0., foam = 0., arch = 0.;
#if DUAL
  // relevo llevado por el frente: delante sólo la copia vieja; en la banda de lavado se disuelve; detrás sólo la nueva
  float wA = 1. - smoothstep(0., 70., er);
  float wF = 1. - smoothstep(0., 50., er);
  Dbg = 0.;
  float cB = 0.;
  if (er > 0.) { PR B = shadeB(pr, dev, devFig); Dbg = B.Dbg; Df = B.Df; cB = B.c; foam = B.foam; }
  float cA = 0., DfA = 0.;
  if (wA > 0.) {
    PR A = shadeA(pr, 1., 1.);
    float keep = step(nucN(p, 41u), wF);      // cada grano de la figura vieja está entero o ya no está
    Dbg = min(Dbg + A.Dbg * wA, 2.2);
    cA = A.c * keep; DfA = A.Df;
    foam = max(foam, A.foam * wA);
  }
  float D = mix(Dbg, Df, cB);
  D = mix(D, DfA, cA);
  figC = max(cB, cA);
#else
  PR B = shadeB(pr, dev, devFig);
  Dbg = B.Dbg; Df = B.Df; figC = B.c; foam = B.foam; arch = B.arch;
  float D = mix(Dbg, Df, figC);
#endif
#if B_ARCHIVE
  float archAmt = uDevAll < 0. ? (1. - dev) : 0.;
#else
  float archAmt = 0.;
#endif
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
    float bd = uBurn.w * (1. - smoothstep(yc, yc + (uBurn.z - uBurn.y), p.y + wave));
    L *= exp2(-3.321928 * bd);
  }
  // grano: vivo fino, archivo grueso, figuras en grumos densos de plata
  float g1 = gt.r - 0.5, g2 = gt.g - 0.5, gA = gt.b - 0.5, gF = gt.a - 0.5;
  float mid = max(clamp(4. * L * (1. - L), 0.15, 1.), 0.5*figC);
  float grain = (0.6*g1 + 0.75*g2) * 0.072;
  grain = mix(grain, (0.35*g1 + 1.1*gA) * 0.16, archAmt);
  grain = mix(grain, (0.35*g1 + 1.0*gF) * 0.13, figC);
#if IS_RINC_B
  grain += 0.03 * g1 * smoothstep(1250., 1450., p.y) * (1. - figC);
#endif
  L = clamp(L + grain * mid, 0., 1.);
  // menisco: labio oscuro delante, cresta especular quebrada con cuerpo, valle capilar, ondas que siguen, banda mojada
  float spec = 0.;
  if (uMen2.w > 0.5 && er > -3. && er < 240.) {
    float nb = texture(uNoise, vec2(perp/3840. + uMen2.z, uTr*0.02 + 0.5)).a;
    float nb2 = texture(uNoise, vec2(perp/1300. + 1.3*uMen2.z, 0.37)).g;
    float thick = 3. + 2.2*nb2;
    if (er < 0.) L *= 1. - 0.24*smoothstep(-2.6, -0.8, er);
    float crest = smoothstep(-0.2, 0.9, er) * (1. - smoothstep(thick - 1.2, thick + 0.6, er));
    float brk = smoothstep(0.34, 0.56, nb);
    spec = crest * mix(0.18, 1., brk) * min(1., 0.72 + 0.28*uSurge);
    float trough = smoothstep(thick, thick + 1.5, er) * (1. - smoothstep(thick + 5., thick + 8., er));
    float r1 = er - (34. + 7.*nb2), r2 = er - (68. + 12.*nb2);
    float rip = 0.065*exp(-r1*r1/3.) - 0.045*exp(-(r1 - 3.2)*(r1 - 3.2)/4.) + 0.04*exp(-r2*r2/4.) - 0.03*exp(-(r2 - 3.4)*(r2 - 3.4)/5.);
    L *= 1. - 0.13*step(0., er)*exp(-er/110.);   // papel mojado: gris, nunca un halo claro
    float midL = 4.*L*(1. - L);
    float gl = step(0., er) * exp(-er/16.) * 0.08 * midL;
    float wb = step(0., er) * (1. - smoothstep(0., 230., er));
    L *= (1. - 0.13*trough) * (1. + rip*step(0., er));
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

  // Cuerpo de la función de copia, especializado por macros (una variante de programa por combinación de copias)
  const PRINT_BODY = `
// figura: cobertura × nucleación (grumos que se juntan, del núcleo al borde), luminancia propia bajo la misma luz
void FNAME_fig(vec4 F, float devF, vec2 q, float lightMul, uint sd, inout PR r){
  if (F.r < 0.004 || devF <= 0.) return;
  float thr = 0.78*(1. - F.a) + 0.22*nucN(q, sd);
  float nuc = smoothstep(thr - 0.035, thr + 0.035, devF*1.1);
  float cc = F.r * nuc;
  if (cc > r.c) {
    float Lf = F.b * 0.4 * lightMul;
    r.Df = -0.30103 * log2(max(Lf, 0.02)/LP);
    r.c = cc;
  }
}
PR FNAME(vec2 p, float dev, float devFig){
  PR r; r.Dbg = 0.; r.Df = 0.; r.c = 0.; r.foam = 0.; r.arch = 0.;
  vec2 q = geo.xy + ((p - geo2.xy)/geo.w + geo2.xy)/geo.z;   // px de foto
  vec2 isz = 1. / geo2.zw;
  vec4 M = texture(MK, vec2(q.x*isz.x, 1. - q.y*isz.y));
  float water = M.r, rock = M.g, sand = M.b, skyM = M.a;
  float live = dev;
  vec2 q2 = q;
#if !IS_GRUTA
  if (water > 0.01) q2.x += 2.0 * sin(q.y*0.11 + uS*2.3) * water * live;
  float lowB = smoothstep(1250., 1450., p.y);
  vec4 P = texture(PH, vec2(q2.x*isz.x, 1. - q2.y*isz.y));
#else
  vec4 P = texture(PH, vec2(q2.x*isz.x, 1. - q2.y*isz.y));
#endif
  float L0 = P.r, Ll = P.a;
#if !IS_GRUTA
  // primer plano: la curva viva con menos contraste medio (el primer plano blando de la fuente no se empasta)
  Ll = mix(Ll, mix(0.02 + 0.93*L0, Ll, 0.35), lowB);
#endif
  // luz de la mañana que camina sobre la tierra
  vec2 lq = (q + vec2(-12.*uT, -3.*uT)) / 900.;
  float lf = texture(uNoise, lq/8.).r;
  float lightMul = mix(1., 0.93 + 0.14*smoothstep(0.2, 0.8, lf), live);
  Ll *= mix(1., lightMul, 1. - 0.6*skyM*float(1 - IS_GRUTA));
#if !IS_GRUTA
  {
    if (water > 0.01) {
      float hh = max(q.y - 604., 1.5);
      vec2 wc = vec2((q.x - 2400.)/(hh*1.5), 3400./hh + uS*0.55) / 32.;
      float wv = texture(uNoise, wc).g - 0.5;
      float wv2 = texture(uNoise, wc*vec2(0.5, 0.37) + vec2(0.3, uS*0.004)).a - 0.5;
      float amp = smoothstep(3., 30., hh);
      // el mar sobreexpuesto de la postal se imprime más profundo en la copia viva
      float deep = 0.80 + 0.06*(1. - smoothstep(4., 40., hh));
#if FOAM
      deep *= 1. - 0.34*uFoam.y;   // sombra de la mañana sobre la bahía: el blanco de la espuma tiene contra qué leerse
#endif
      float seaM = smoothstep(0.08, 0.45, water) * (1. - smoothstep(1000., 1100., q.y));
      Ll *= mix(1., deep, seaM * live);
      Ll *= 1. + (0.08*wv + 0.05*wv2) * amp * seaM * live;
#if FOAM
      if (uFoam.x > 0.) {
        float dR = P.b * 255.;
        float g = uFoam.x;
        float pool = smoothstep(1250., 1290., q.y);
        vec4 nz = texture(uNoise, q/vec2(150., 60.) + vec2(0., uS*0.01));
        if (pool < 0.5) {
          // orilla verdadera: la roca está ARRIBA del agua (pie de la sierra, pie del acantilado);
          // el borde superior de la roca grande recorta el mar de atrás y no lleva espuma
          float dUp = texture(PH, vec2(q.x*isz.x, 1. - (q.y - 7.)*isz.y)).b * 255.;
          float dDn = texture(PH, vec2(q.x*isz.x, 1. - (q.y + 7.)*isz.y)).b * 255.;
          float wl = smoothstep(-0.15, 0.55, (dDn - dUp) / 14.);
          float pers = mix(0.55, 1., smoothstep(612., 780., q.y));
          float dRn = dR + 6.*(nz.r - 0.5);
          // encaje: bordes de celdas deformados y estirados según la orilla, rotos por ruido, en bandas que derivan mar adentro
          vec2 lc = vec2(q.x/26., (dRn - uS*5.5)/(7.5*pers));
          lc += 0.55*vec2(nz.g - 0.5, nz.a - 0.5)*2.;
          float ce = cellEdge(lc);
          float wid = mix(0.05, 0.13, nz.b) * (1.25 - 0.5*smoothstep(0., 50., dRn));
          float lace = 1. - smoothstep(wid*0.6, wid, ce);
          lace *= smoothstep(0.25, 0.55, texture(uNoise, q/vec2(90., 34.) - vec2(uS*0.02, 0.)).g);
          float bands = 0.5 + 0.5*sin((dRn - uS*7.)/(6.5*pers) + 2.*nz.r);
          float env = exp(-dRn/(52.*pers)) * smoothstep(0.8, 3., dRn);
          lace *= env * (0.3 + 0.7*bands) * wl;
          // línea gruesa y rota al pie de la roca (6–8 px)
          float wln = 6. * (1. + 0.3*(2.*uLow - 1.));
          float froth = (1. - smoothstep(wln*0.45, wln, dRn)) * smoothstep(0.3, 0.52, texture(uNoise, vec2(q.x/1400., 0.71 + q.y/3000.)).a) * wl;
          float f = max(lace, froth) * g * smoothstep(0.35, 0.9, water);
          // agua oscura entre los hilos (el encaje se lee por contraste)
          Ll *= 1. - 0.12 * env * wl * g * (1. - lace);
          r.foam = f * (0.9 + 0.1*uHigh);
        } else {
          // charca al pie de la roca grande: brillo que tiembla y un anillo de espuma que respira, roto
          Ll *= 1. + 0.06 * sin(q.x*0.09 + q.y*0.05 + uS*3.1) * g * water;
          float wr = 5. * (1. + 0.3*(2.*uLow - 1.));
          float ring = (1. - smoothstep(wr*0.4, wr, dR + 4.*(nz.r - 0.5))) * smoothstep(0.4, 0.6, nz.b);
          r.foam = ring * 0.8 * g * smoothstep(0.3, 0.8, water);
        }
      }
#endif
    }
    // resaca: línea de espuma sobre la arena, película que sube y brillo de arena mojada al retirarse
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
  }
#else
  {
    // gruta: la boca es una abertura negra; lámina de resaca que sube por la arena; cáusticas en las paredes bajas
    Ll *= 1. - 0.55*skyM*(1. - smoothstep(0.14, 0.5, Ll))*(0.94 + 0.06*sin(uT*1.1));
    float gp = uGrottoPhase;
    float reach = (40. + 150. * pow(0.5 + 0.5*sin(gp), 1.2)) * (0.75 + 0.5*uLow);
    float nx = texture(uNoise, vec2(q.x/900., gp*0.02)).r - 0.5;
    float yf = 1742. - reach * (1. + 0.45*nx);
    float sd = q.y - yf; // >0 dentro de la lámina
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
    // banda húmeda bajo la boca: el borde arena/boca deja de ser una línea recta de retoque
    float dS = P.g * 255. * 2.;
    float wetM = sand * (1. - smoothstep(1452., 1478. + 12.*nx, q.y));
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
  }
#endif
  float Dt = -0.30103 * log2(max(Ll, 0.02)/LP);
  float D;
#if ARCHIVE
  if (dev < 0.999) {
    // archivo: negros levantados (Dmax ≈ 0,4), manchas, rayas finas, bordes gastados
    float La = 0.36 + 0.56*L0;
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
  // lo más denso cruza primero: las sombras llegan antes que los medios y las luces (no es un fundido)
  D = Dt * pow(dev, mix(2.4, 0.55, smoothstep(0.15, 0.9, Dt)));
#endif
  // figuras: la plata más densa de la copia, con su sombra pegada a los pies
  vec2 aq = (q - boxA.xy) / boxA.zw;
  if (aq.x > 0. && aq.y > 0. && aq.x < 1. && aq.y < 1.) {
    vec4 F = texture(FA, vec2(aq.x, 1. - aq.y));
    D += F.g * 1.05 * smoothstep(0., 0.6, devFig);
    FNAME_fig(F, devFig, q, lightMul, 17u, r);
  }
#if HAS_FIGB
  {
    vec2 bq = (q - boxB.xy) / boxB.zw;
    if (bq.x > 0. && bq.y > 0. && bq.x < 1. && bq.y < 1.) {
      vec4 F = texture(FB, vec2(bq.x, 1. - bq.y));
      float devF = 0.;
      if (q.x > gb1.x && q.y > gb1.y && q.x < gb1.z && q.y < gb1.w) devF = grp.x;
      else if (q.x > gb2.x && q.y > gb2.y && q.x < gb2.z && q.y < gb2.w) devF = grp.y;
      else if (q.x > gb3.x && q.y > gb3.y && q.x < gb3.z && q.y < gb3.w) devF = grp.z;
      devF *= step(0.15, devFig);
      D += F.g * 1.05 * smoothstep(0., 0.6, devF);
      FNAME_fig(F, devF, q, lightMul, 29u, r);
    }
  }
#endif
  r.Dbg = D;
#if ARCHIVE
  r.arch *= 1. - dev;
#else
  r.arch = 0.;
#endif
  return r;
}

`;
  const NAMES = ['PH', 'MK', 'FA', 'FB', 'geo', 'geo2', 'boxA', 'boxB', 'grp', 'gb1', 'gb2', 'gb3', 'IS_GRUTA', 'ARCHIVE', 'FOAM', 'HAS_FIGB'];
  function printFn(pre, name, o) {
    const vals = [pre + 'Photo', pre + 'Mask', pre + 'FigA', pre + 'FigB', pre + 'Geo', pre + 'Geo2', pre + 'BoxA', pre + 'BoxB', pre + 'Grp', pre + 'GB1', pre + 'GB2', pre + 'GB3', o.gruta ? 1 : 0, o.archive ? 1 : 0, o.foam ? 1 : 0, o.figB ? 1 : 0];
    const body = PRINT_BODY.replace(/FNAME/g, name);
    return NAMES.map((n, i) => `#define ${n} ${vals[i]}`).join('\n') + '\n' + body + '\n' + NAMES.map((n) => `#undef ${n}`).join('\n') + '\n';
  }
  // o: {b: {gruta, archive, foam, figB}, a: null | {gruta, figB}}
  RV.compositeSource = function (o) {
    const defs = `#define DUAL ${o.a ? 1 : 0}\n#define B_ARCHIVE ${o.b.archive ? 1 : 0}\n#define IS_RINC_B ${o.b.gruta ? 0 : 1}\n`;
    return FS_COMPOSITE.replace('__DEFINES__', defs).replace('__PRINTFNS__', printFn('b', 'shadeB', o.b) + (o.a ? printFn('a', 'shadeA', o.a) : ''));
  };

  // Plata que se suelta del borde del granito: puntos en forma cerrada (sin estado entre cuadros)
  RV.VS_FOAM = `#version 300 es
precision highp float;
in vec4 aP;   // x0, y0 (px foto), dirx, diry
in vec4 aQ;   // t liberación, velocidad (px foto/s), vida, d0 (distancia al agua)
in vec4 aR;   // fase del remolino, amplitud, L de la roca, tamaño (px pantalla)
uniform float uT, uS;
uniform vec4 uGeo;   // originX, originY, scale, 0
uniform vec4 uBurn;
out float vA; out float vW; out float vL; out float vB;
void main(){
  float age = uT - aQ.x;
  if (age < 0. || age > aQ.z) { gl_Position = vec4(2., 2., 0., 1.); gl_PointSize = 0.; vA = 0.; vW = 0.; vL = 0.; vB = 1.; return; }
  vec2 dir = aP.zw, pe = vec2(-dir.y, dir.x);
  float trav = aQ.y * age * (1. - 0.3*age/aQ.z);
  vec2 q = aP.xy + dir * trav + pe * aR.y * sin(age*1.7 + aR.x) * min(age, 1.);
  vec2 s = (q - uGeo.xy) * uGeo.z;
  // oscuro mientras es granito; se vuelve espuma unos px después de entrar al agua
  float wht = smoothstep(5., 16., trav - aQ.w);
  float a = smoothstep(0., 0.2, age) * (1. - smoothstep(aQ.z*0.6, aQ.z, age));
  float yc = mix(-420., uBurn.y, uBurn.x);
  float bd = uBurn.x > 0. ? uBurn.w * (1. - smoothstep(yc, yc + (uBurn.z - uBurn.y), s.y)) : 0.;
  vA = a; vW = wht; vL = aR.z; vB = pow(10., -bd);
  gl_Position = vec4(s.x/540. - 1., 1. - s.y/960., 0., 1.);
  gl_PointSize = aR.w * (1. - 0.25*wht);
}`;
  // dos pases conmutativos (deterministas): MIN para la plata oscura que se suelta, MAX para la espuma blanca
  RV.FS_FOAM = `#version 300 es
precision highp float;
precision highp int;
in float vA; in float vW; in float vL; in float vB;
out vec4 o;
${COMMON}
uniform float uHigh, uPass;
void main(){
  vec2 c = gl_PointCoord - 0.5;
  float r = 1. - smoothstep(0.26, 0.5, length(c));
  if (uPass < 0.5) {
    float a = vA * r * (1. - vW);
    o = vec4(mix(vec3(1.), toneColor(clamp(vL*vB, 0., 1.), 0.), a), 1.);
  } else {
    float Lw = 0.95 * (0.9 + 0.1*uHigh);
    float a = vA * r * vW * 0.95;
    o = vec4(toneColor(clamp(Lw*vB, 0., 1.), 0.) * a, 1.);
  }
}`;
})();
