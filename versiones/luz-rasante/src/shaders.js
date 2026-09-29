/* Shaders por cuadro: pase de mundo (lineal, RGBA16F) y pase de gradación. */
(function () {
  const LR = (window.LR = window.LR || {});
  const f = (v) => { const s = String(+(+v).toFixed(6)); return s.includes('.') || s.includes('e') ? s : s + '.0'; };
  const lin = (hex) => PBS.hex(hex).map((c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  const v3 = (a) => `vec3(${a.map(f).join(',')})`;
  LR.lin = lin;

  LR.worldFS = function (cfg, atlas, flags = []) {
    const Wd = cfg.world, BG = Wd.big, TB = Wd.tipBake, P = cfg.palette;
    const az = cfg.sun.azimuth * Math.PI / 180;
    const toSun = [Math.sin(az), Math.cos(az)];
    const sDir = [-toSun[0], -toSun[1]];
    const perp = [-sDir[1], sDir[0]];
    const hzT = cfg.sun.hzFar;
    let hzCode = `float hzFar(float h){ `;
    hzCode += `if(h<=${f(hzT[0][0])}) return ${f(hzT[0][1])}; `;
    for (let i = 0; i < hzT.length - 1; i++) hzCode += `if(h<=${f(hzT[i + 1][0])}) return mix(${f(hzT[i][1])},${f(hzT[i + 1][1])},(h-(${f(hzT[i][0])}))/${f(hzT[i + 1][0] - hzT[i][0])}); `;
    hzCode += `return ${f(hzT[hzT.length - 1][1])}; }`;
    const L = (k) => v3(lin(P[k]));
    const lc = cfg.lace;
    return `#version 300 es
${flags.map((k) => '#define F_' + k + ' 1').join('\n')}
precision highp float; precision highp sampler2D;
in vec2 uv; out vec4 o;
${PBS.GLSL_NOISE}

// ruido con hash entero: estable para coordenadas grandes (el hash de PBS pierde precisión con |p|·456 > ~1e5)
float hashI(vec2 p){ uvec2 q = uvec2(ivec2(floor(p))) * uvec2(1597334677u, 3812015801u); uint n = (q.x ^ q.y) * 1597334677u; n ^= n >> 16; n *= 2246822519u; n ^= n >> 13; return float(n) * (1.0/4294967296.0); }
float vnI(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(hashI(i), hashI(i+vec2(1,0)), f.x), mix(hashI(i+vec2(0,1)), hashI(i+vec2(1,1)), f.x), f.y); }

uniform sampler2D tBake, tNorm, tHz, tTip, tTipN, tTipHz, tDet, tWave, tPhoto, tAtlas, tOV, tOB, tVor;
uniform vec4 uXf;          // cx, cy, mpp, theta
uniform float uT, uE, uEh, uEn, uSunI;
uniform vec3 uSunC, uSky;
uniform float uSea, uLow, uHigh, uSway, uGust;
uniform vec4 uFlags;       // close, tip, ship, boat
uniform vec4 uFlags2;      // footprints, lace, calm(S8), clumps
uniform vec4 uLace;        // R, width, flash, drift
uniform vec4 uBand, uBandL, uBand2; uniform float uLip;
uniform vec4 uMass, uMass2;
uniform sampler2D tKnA, tKnB; uniform vec4 uKnE; uniform sampler2D tMonte;   // S4: bolas de la loma horneadas   // S4: masa de la loma (x, y, r, Rb), (L, semilla, dentado, activo)
float h1(float i){ return fract(sin(i*127.1 + 3.7)*43758.5453); }
float n1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(h1(i), h1(i+1.), f); }
uniform float uExp, uSeed, uScrim, uGrain, uMacS, uCalmK; uniform vec4 uOvBox; uniform vec4 uBox; uniform float uFeather;
${LR.gradeGLSL(cfg)}  // S1: (ax, ay, bx, by), (c, w, jag, 0)
uniform vec4 uFig[48]; uniform float uNFig; uniform vec4 uFigBox; uniform vec4 uFigB[12];
uniform vec4 uTrail[24]; uniform float uNTrail;
uniform vec4 uZone[8]; uniform float uZoneDen[8]; uniform float uNZone;
uniform vec4 uShip, uShip2, uBoat;
uniform vec4 uFoot[8]; uniform float uNFoot;
uniform vec4 uCalm;        // S8: y de pantalla límite, 0,0,0
uniform vec4 uDbg, uDbg2;

const vec2 BIG0 = vec2(${f(BG.x0)},${f(BG.y0)}); const float BIGS = ${f(BG.size)};
uniform vec4 uTipE;  // punta: x0, y0, tamaño (S8: horneado fino)
#define TIP0 uTipE.xy
#define TIPS uTipE.z
const vec2 TOSUN = vec2(${f(toSun[0])},${f(toSun[1])});
const vec2 SDIR = vec2(${f(sDir[0])},${f(sDir[1])});
const vec2 SPERP = vec2(${f(perp[0])},${f(perp[1])});
const float ACOLS = ${f(atlas.cols)}, AROWS = ${f(atlas.rows)}, AWM = ${f(atlas.WM)}, AHM = ${f(atlas.HM)};
${hzCode}
float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec2 hash22(vec2 p){ return vec2(hashI(p), hashI(p+19.19)); }

// ---- Voronoi (juntas del granito = encaje de espuma): distancia al borde y dirección al borde ----
vec4 voronoiEdge(vec2 x){
  vec2 n = floor(x), f = fract(x); vec2 mg, mr; float md = 8.; float eh = 0.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 r = g + 0.15 + 0.7*hash22(n+g) - f; float d = dot(r,r); if(d<md){ md=d; mr=r; mg=g; } }
  md = 8.; vec2 nb = vec2(0.);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g = mg + vec2(i,j); vec2 r = g + 0.15 + 0.7*hash22(n+g) - f;
    vec2 dr = r-mr; if(dot(dr,dr)>0.0001){ float d = dot(0.5*(mr+r), normalize(dr)); if(d<md){ md=d; nb=normalize(dr); eh = hashI(2.*n+mg+g+0.37); } } }
  return vec4(md, nb, eh);
}

uniform float uCell;
vec2 jointDomain(vec2 P){ vec2 w = vec2(vnoise(P/7.1), vnoise(P/7.1+5.2))-0.5; vec2 q = P + w*2.4*uCell/3.; return vec2(dot(q, vec2(0.94,0.34)), dot(q, vec2(-0.34,0.94))*1.2)/uCell; }
uniform sampler2D tJ; uniform vec4 uJE;
vec2 masterJ(vec2 P){ return texture(tJ, (P-uJE.xy)/uJE.zw).rg; }   // diaclasas maestras horneadas
vec3 grain(vec2 P){ return texture(tPhoto, P).rgb - 0.5; }
// monte en tomas lejanas: punteado de matas oscuras (cobertura filtrada por la huella del píxel), sin manchas negras
const vec4 MZ[${cfg.world.monte.length}] = vec4[${cfg.world.monte.length}](${cfg.world.monte.map((z) => `vec4(${f(z[0])},${f(z[1])},${f(z[2])},${f(z[3])})`).join(',')});
const float MZD[${cfg.world.monte.length}] = float[${cfg.world.monte.length}](${cfg.world.monte.map((z) => f(z[4])).join(',')});
float monteDen(vec2 P){ float d = 0.05*smoothstep(0.62, 0.8, vnoise(P/70.+4.2));
  for(int i=0;i<${cfg.world.monte.length};i++){ vec2 q = (P-MZ[i].xy)/MZ[i].zw; d = max(d, MZD[i]*exp(-dot(q,q)*1.6)); } return d; }
vec2 monteStip(vec2 P, float fp, float den){
  // x: cobertura de copa, y: cobertura de sombra (hacia el oeste)
  float avg0 = clamp(den*2.2*0.26, 0., 1.);
  if(fp > 1.0) return vec2(avg0*0.9, avg0*0.6);
  if(fp > 0.1){   // lejos: manchas irregulares de matas (un solo ruido), con su sombra corrida al oeste
    float m1 = vnoise(P/2.1), m2 = vnoise((P + TOSUN*2.2)/2.1);
    float th = 1. - clamp(den*2.2, 0., 1.)*0.45;
    return vec2(smoothstep(th, th+0.08, m1), smoothstep(th, th+0.08, m2)*(1.-smoothstep(th, th+0.08, m1))*0.8);
  }
  vec2 c0 = floor(P/4.); float cov = 0., sh = 0.;
  for(int j=0;j<2;j++) for(int i=0;i<2;i++){ vec2 c = c0 + vec2(i,j) - step(fract(P/4.), vec2(0.5)) + vec2(0.);
    float hsh = hashI(c*1.31+0.7); if(hsh > den*2.2) continue;
    vec2 ctr = (c + 0.2 + 0.6*vec2(hashI(c+3.3), hashI(c+7.1)))*4.; float r = 0.7 + 1.1*hashI(c+9.9);
    float wob = (vnI(P*1.3+c)-0.5)*0.5*r;
    float d = length(P-ctr) + wob;
    cov = max(cov, smoothstep(r+0.6*fp, r-0.6*fp, d));
    vec2 ps = P + TOSUN*min(2.6*r, 1.4*r + 6.*fp);   // sombra corta y filtrada
    float ds = length(ps-ctr) + wob;
    sh = max(sh, smoothstep(r*0.9+0.6*fp, r*0.9-0.6*fp, ds)); }
  float avg = clamp(den*2.2*0.2*(1.+ 0.3), 0., 1.);
  float far_ = smoothstep(0.4, 1.0, fp);
  return vec2(mix(cov, avg*0.9, far_), mix(sh*(1.-cov), avg*0.6, far_));
}

void main(){
  vec2 sp = vec2((uv.x-0.5)*1080., (uv.y-0.5)*1920.);
  float mpp = uXf.z, th = uXf.w;
  vec2 RX = vec2(cos(th), -sin(th)), UY = vec2(sin(th), cos(th));
  vec2 P = uXf.xy + (RX*sp.x + UY*sp.y)*mpp;
  float fp = mpp;                    // huella del píxel (m)
  float closeS = uFlags.x;
#ifdef F_OV
  vec4 OV = vec4(0.), OB = vec4(0.);
  vec2 fpx = vec2(gl_FragCoord.x, 1920. - gl_FragCoord.y);
  if(fpx.x > uOvBox.x && fpx.x < uOvBox.z && fpx.y > uOvBox.y && fpx.y < uOvBox.w){ OV = texelFetch(tOV, ivec2(gl_FragCoord.xy), 0); OB = texelFetch(tOB, ivec2(gl_FragCoord.xy), 0); }
#endif

  // ---------------- terreno ----------------
  vec2 buv = (P-BIG0)/BIGS;
  vec4 B = vec4(0.), NB = vec4(0.,0.,1.,60.); float HZ = -5.;
  float tipW = 0., pool = 0.;
  vec2 tq = (P-TIP0)/TIPS;
#ifdef F_TIP
#ifdef F_CAP
  bool capIn = tq.x > 0.001 && tq.y > 0.001 && tq.x < 0.999 && tq.y < 0.999;
  tipW = capIn ? 1. : 0.;
  if(!capIn) B = vec4(-1., 0., 0., -16.);
#else
  tipW = smoothstep(0.5, 0.46, max(abs(tq.x-.5), abs(tq.y-.5)));
#endif
#endif
#ifndef F_TIPONLY
  if(tipW < 1.){ B = texture(tBake, buv); NB = texture(tNorm, buv); HZ = texture(tHz, buv).r; }
#else
  NB.w = texture(tNorm, buv).w;
#endif
#ifdef F_TIP
  if(tipW > 0.){
    vec4 TB = texture(tTip, tq); vec4 TN = texture(tTipN, tq); float TH = texture(tTipHz, tq).r;
    pool = TB.b*tipW;
    B = vec4(mix(B.r, TB.r, tipW), mix(B.g, TB.g, tipW), B.b*(1.-tipW), mix(B.a, TB.a, tipW));
    NB = vec4(mix(NB.xy, TN.xy, tipW), mix(NB.z, TN.z, tipW), NB.w);
    HZ = mix(HZ, TH, tipW);
  }
#endif
  float h = B.r, rock = B.g, sand = B.b, coast = B.a, ao = NB.z;
  vec3 N = vec3(NB.xy, sqrt(max(0.001, 1.-dot(NB.xy,NB.xy))));

  // ---------------- sol ----------------
  float e = radians(uE);
  vec3 Ls = vec3(TOSUN*cos(e), sin(e));
  float hz = max(HZ, hzFar(h));
  vec3 sunC = uSunC*uSunI;
  vec3 sky = uSky;

  // detalle (matas / ruido medio / grano / ondas de arena)
  vec2 sway = vec2(0.8,0.6)*uSway*fp*sin(uT*2.3 + dot(P, vec2(0.23,0.17)) + uGust*3.);
  // dominio del mosaico de detalle deformado por un campo lento (±4 m): rompe la repetición de 16 m
#ifdef F_MICRO
  vec2 warpD = (vec2(vnoise(P/29.+1.3), vnoise(P/29.+8.7))-0.5)*8.;
#else
  vec2 warpD = vec2(0.);
#endif
  vec2 dq = (P + warpD + sway)/16.;
  vec4 DT = fp < 0.16 ? texture(tDet, dq) : vec4(0.35, 0.5, 0.5, 0.5);   // de lejos el mosaico ya está promediado
  float lodFade = smoothstep(0.02, 0.2, fp);   // 1 = lejos (detalle ya promediado)
  vec4 MAC = texture(tDet, P/uMacS+vec2(0.37,0.71));
  float tpatch = smoothstep(0.3, 0.75, MAC.g*0.8 + DT.a*0.4);
  float tus = DT.r*mix(0.45, 1.05, tpatch);
  float fib = mix(0.5, DT.b, 1.-lodFade);
  // bordes de roca nítidos e irregulares (umbral perturbado)
  rock = smoothstep(0.38, 0.62, rock + (DT.g-0.5)*0.35*(1.-lodFade) + (MAC.b-0.5)*0.15);
#ifdef F_CAP
  rock = 1.;
#endif
#ifdef F_NOGRASS
  float big1 = 0.5;
#else
  float big1 = vnoise(P/42.);
#endif
  float big2 = vnoise(P/9.+3.1);

  // terminador dentado por las matas (solo cerca)
  float jag = (tus-0.5)*0.16*(1.-lodFade) + (big2-0.5)*0.06;
  // penumbra más ancha sobre el agua (el mapa de horizonte grueso no dibuja escalones)
  float penW = mix(${f(cfg.sun.penumbra)} + 0.5*smoothstep(0.3, 1.2, fp), 0.42 + 0.3*smoothstep(0.3, 1.2, fp), smoothstep(0., -3., coast));
  float hzF = hzFar(h);
  float lit = smoothstep(HZ-penW, HZ+penW, uE + jag + (hashI(P*0.7)-0.5)*0.12*smoothstep(0., -3., coast))
            * smoothstep(hzF-0.3, hzF+0.3, uE + jag*2.);   // el horizonte lejano es difuso

#ifdef F_BAND
  {
    vec2 ba = uBand.zw - uBand.xy, pa = P - uBand.xy; float d = (ba.x*pa.y - ba.y*pa.x)/length(ba);
    // borde del terminador: ondulación del terreno + dientes de las matas, nítido
    float dj = d + (tus-0.5)*0.55 + (vnI(P/2.3)-0.5)*uBandL.z*2. + (vnoise(vec2(P.y/5.5, 2.7))-0.5)*1.2;
    float bu = uBand2.z*exp(-0.5*pow((P.y-uBand2.x)/uBand2.y, 2.));
    lit *= (1.-smoothstep(uBandL.y-0.22, uBandL.y+0.22, dj))*smoothstep(uBandL.x-bu-0.22, uBandL.x-bu+0.22, dj);
  }
#endif


  // sombra de la masa de la loma (S4): misma forma que LR.boulderOcc, calculada aquí (más barato que la capa de objetos)
  if(uMass2.w > 0.5){
    vec2 rel = P - uMass.xy; float a_ = dot(rel, SDIR), b_ = dot(rel, SPERP);
    float Ra = uMass.z, Rb = uMass.w, Lsh = uMass2.x, sd0 = uMass2.y, jagA = uMass2.z;
    if(a_ > -0.2*Ra && abs(b_) < Rb*1.2){
      float R = Rb*(0.96 + (n1(b_*1.5/Rb + sd0)-0.5)*0.22);
      float bb = clamp(b_/R, -1., 1.);
      float front = sqrt(max(0., 1.-bb*bb))*(Ra + Lsh)
        + (n1(b_*0.21 + sd0)-0.5)*jagA*1.3 + (n1(b_*0.57 + sd0*1.7)-0.5)*jagA*0.8
        + (n1(b_*1.37 + sd0*2.3)-0.5)*(0.2*Ra + 0.2*jagA) + (n1(b_*3.9 + sd0)-0.5)*0.22 + (n1(b_*11. + sd0*3.)-0.5)*0.1 + (n1(b_*29.+sd0*5.)-0.5)*0.05
        + (tus-0.5)*0.35*(1.-lodFade);   // dientes de las matas en el borde
      float pen = 0.03 + 0.02*max(a_, 0.);
      lit *= 1. - (1.-smoothstep(front-pen, front+pen, a_))*(1.-smoothstep(0.92, 1.03, abs(b_)/R));
    }
  }

  // ---------------- agua / costa ----------------
#ifdef F_NOWATER
  float along = 0., n55 = 0., cyc = 0., run = 0., amp = 1., beachy = 0., wl = 0., water = 0., wet = 0., swFront = 0.;
#else
  float along = dot(P, vec2(0.0035,0.0026));
  float n55 = vnoise(P/55.);
  float cyc = fract(uSea*0.16 + along + n55*0.5);
  float run = cyc < 0.3 ? smoothstep(0.,0.3,cyc) : 1.-smoothstep(0.3,1.,cyc);
#ifdef F_NOSAND
  float amp = 3.;
  float beachy = 0.;
#else
  float amp = (3.2+2.2*vnoise(P/70.+5.))*(0.75+0.55*uLow);
  float beachy = smoothstep(0.05,0.4, sand) + smoothstep(8.,-2.,coast)*smoothstep(0.02,0.2,sand);
  beachy = clamp(beachy,0.,1.);
#endif
  float wl = mix(0.25*run - 0.2, run*amp - 1.2, beachy);
  float water = smoothstep(wl+0.25*fp+0.02, wl-0.25*fp-0.02, coast);
  float wet = beachy*smoothstep(amp*1.05, amp*0.55, coast);
#ifdef F_NOSAND
  float swFront = 0.;
#else
  float swFront = beachy > 0.01 ? beachy*step(cyc,0.62)*exp(-abs(coast-wl)/(0.18+0.6*fp))*(0.55+0.45*vnI(P*1.3)) : 0.;
#endif
#endif

  vec3 col, sunT;
#if defined(F_JOINTS) || defined(F_LACE)
  float ddv = max(-coast, 0.);
#ifdef F_LACE
  vec2 outDv = normalize(P - vec2(45., -5.) + 1e-3);
  vec2 Qv = P - outDv*uLace.w*smoothstep(0., 18., ddv);
#else
  vec2 Qv = P;
#endif
  vec4 JQ = texture(tJ, (Qv-uJE.xy)/uJE.zw);   // horneado: x,y maestras; z red secundaria (m); w azar del borde
#endif
  // ---------------- tierra ----------------
  vec3 cl = vec3(0.), clSun = vec3(0.);
  if(water < 0.999){
#ifndef F_NOGRASS
    // pradera
    // (la foto de relieve traía senderos y caminos: su paso alto dibujaba líneas; se reemplaza por ruido propio)
    vec3 ph = vec3(0., 0., ((MAC.g-0.5)*0.55 + (DT.g-0.5)*0.35)*(1.-0.6*lodFade));
    float dry = smoothstep(0.2, 0.8, mix(big1, 0.5, lodFade*0.5)*0.9 + (MAC.a-0.5)*(0.6 + 0.5*lodFade) + ph.b*0.5);
    vec3 grass = mix(${L('olive')}, ${L('ochre')}, dry*0.7);
    grass = mix(grass, ${L('straw')}, (smoothstep(0.45, 0.95, tus)*0.12*(1.-lodFade) + smoothstep(0.55,0.8, DT.a)*0.2)*(0.5+0.5*dry));
    grass *= (0.94 + 0.1*tus*(1.-lodFade*0.7))*(0.9 + 0.2*fib);
    grass *= 1. + ph.b*0.4 + (MAC.b-0.5)*0.25;
    grass = mix(grass, grass*vec3(0.92,1.0,0.86), (1.-tpatch)*0.5);

#ifndef F_MICRO
    float mden = texture(tMonte, buv).r*0.5*(1.-smoothstep(0.1, 0.4, sand))*smoothstep(4., 12., coast);
    vec2 MS = mden > 0.004 ? monteStip(P, fp, mden) : vec2(0.);
#else
    vec2 MS = vec2(0.);
#endif
    // sendero viejo: pasto más corto y pálido
    float tdist = NB.w;
#ifdef F_TRAILSEG
    if(NB.w < 3.5){ tdist = 60.; for(int i=0;i<12;i++){ if(float(i)>=uNTrail) break; vec2 a = uTrail[i].xy, b2 = uTrail[i].zw; vec2 pa=P-a, ba=b2-a; float t=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); tdist=min(tdist, length(pa-ba*t)); } }
#endif
    float tw = ${f(Wd.trailWidth)}*(0.85+0.3*vnoise(P/6.)) * 0.5;
    float twv = max(tw, 0.6*fp);
    float twj = twv + (DT.r-0.3)*0.25*(1.-lodFade);
    float trail = 0.85*(1.-smoothstep(twj-0.5*fp-0.06, twj+0.5*fp+0.06, tdist)) * min(1., tw/twv) * (1.-rock) * (1.-sand);
    float tusE = mix(tus, tus*0.55+0.08, trail);
    grass = mix(grass, mix(grass, ${L('straw')}, 0.12)*1.05, trail*0.7);

    // luz en la pradera: briznas verticales y matas (no Lambert)
    float NdL = dot(N, Ls);
    float rel = NdL - Ls.z;
    float micro = 0.;
    float gface = 0.;
#ifdef F_MICRO
    {
      // sombras de las matas con la elevación cercana (la misma que la de las personas): 0.6–2.5× su altura
      float tanN = tan(radians(uEn));
      float hp0 = tusE*0.4;
      float tr1 = 1.-trail*0.7;
      float s0 = texture(tDet, dq + TOSUN*0.05/16.).r;
      float s1 = texture(tDet, dq + TOSUN*0.15/16.).r, s2 = texture(tDet, dq + TOSUN*0.32/16.).r, s3 = texture(tDet, dq + TOSUN*0.58/16.).r;
      float occ = max(max((s1*0.4*tr1-hp0-0.15*tanN)/0.035, (s2*0.4*tr1-hp0-0.32*tanN)/0.045), (s3*0.4*tr1-hp0-0.58*tanN)/0.06);
      micro = 0.62*smoothstep(0., 1., occ)*(1.-lodFade)*(1.-trail*0.75);
      gface = clamp((tusE - s0*tr1)*0.4/0.05, -1.5, 1.5);   // > 0: la cara de la mata mira al sol
    }
#endif
    float blades = 0.32 + 0.2*tusE + 0.14*fib;
    float gL = max(NdL, blades) * (1. - micro);
    gL *= clamp(1. + 2.2*rel + 0.8*gface*(1.-lodFade), 0.3, 1.9);
    gL *= smoothstep(-0.3, 0.06, NdL);
    float gSky = ao*(0.82 + 0.1*tusE + 0.08*fib)*(1.-0.22*micro);
    // monte lejano: copa verde oscura (lado del sol algo iluminado) y su sombra corta
    grass = mix(grass, mix(${L('monteA')}, ${L('monteB')}, 0.5), MS.x*0.9);
    gL *= 1. - MS.y*0.85; gL = mix(gL, gL*0.8, MS.x); gSky *= 1. - 0.25*MS.x;
#else
    vec3 grass = ${L('olive')}; float gL = 0.4; float gSky = ao;
#endif

#ifndef F_NOROCK
    // granito: gris cálido meteorizado con feldespato rosado (paso alto de las fotos), líquenes, más oscuro y húmedo junto al agua
    vec3 gr = grain(P/5.5);
    // textura: paso alto de las fotos de granito a dos escalas, dominios rotados (sin costuras de espejo visibles)
    vec3 gA = grain(mat2(0.8,-0.6,0.6,0.8)*P/4.7 + 0.13), gB = vec3(0.);
    if(fp < 0.09) gB = grain(mat2(0.28,0.96,-0.96,0.28)*P/1.6 + 0.61);
    float tone = big2*0.3 + DT.g*0.2 + vnoise(mat2(0.8,-0.6,0.6,0.8)*P/2.3)*0.25 + (gA.r + gA.g)*0.35;
    vec3 granite = mix(${L('graniteA')}, ${L('graniteC')}, smoothstep(0.2, 0.95, tone))*1.3;
    granite *= mix(vec3(1.), vec3(1.07, 0.99, 0.94), smoothstep(0.35, 0.8, vnoise(mat2(0.6,0.8,-0.8,0.6)*P/1.1+2.)));   // feldespato rosado
    float lichM = vnoise(mat2(0.8,-0.6,0.6,0.8)*P/0.9+7.)*0.5 + vnoise(mat2(0.28,0.96,-0.96,0.28)*P/0.31)*0.3 + vnoise(P/3.5)*0.2;
    float lich = smoothstep(0.55, 0.9, lichM)*smoothstep(1.5, 4., coast);
    granite = mix(granite, mix(${L('lichenA')}, ${L('lichenB')}, vnoise(P/0.2))*0.85, lich*0.16);
    float closeR = 1.-smoothstep(0.03, 0.09, fp);
    granite *= 1. + (gr.r*0.5 + gr.g*0.5)*0.3*(1.-lodFade*0.6) + (gB.r + gB.g)*0.5*closeR;
    granite *= 0.9 + 0.2*hash21(floor(P/0.015))*closeR;
    // banda mojada de 0.5–1.5 m junto al agua
    float wetR = 1.-smoothstep(0.1, 1.1 + 0.6*vnI(P/2.), coast);
    granite = mix(granite, granite*vec3(0.42, 0.45, 0.5), wetR*0.9);
    float rface = 0.;
    // microfacetas de la roca rugosa atrapan la luz rasante; los lomos redondeados tienen hombro iluminado y núcleo de sombra
    float ndlR = dot(N, Ls);
    float rL = max(ndlR, 0.2 + 0.14*DT.g) * smoothstep(-0.14, 0.03, ndlR);
    rL = rL*(1. + 0.25*wetR) + 0.02;
#else
    vec3 granite = ${L('graniteB')}*1.2; float rL = max(dot(N, Ls), 0.3); float rface = 0.; float wetR = 0.;
#endif
    // diaclasas: grieta oscura; labio cálido solo del lado opuesto al sol (la pared que mira al sol)
    float jointDark = 0., jointLip = 0.;
    float rockJ = smoothstep(0.45, 0.8, rock);
#ifdef F_JOINTS
    if(rock > 0.2){
      vec2 MJ = JQ.xy;
      float wM = mix(0.035, 0.24, uLip)*(0.55 + 0.8*vnI(P/1.7));
      float aa = 0.6*fp;
      float dk = 1.-smoothstep(wM-aa, wM+aa, MJ.x);
      float lipW = mix(0.03, 0.3, uLip)*(0.4 + 0.8*vnoise(P/2.9 + 1.7));
      float lipZ = (1.-smoothstep(wM+lipW-aa, wM+lipW+aa, MJ.x))*(1.-dk)*smoothstep(0., 0.2, MJ.y)*mix(0.45*smoothstep(0.3, 0.6, vnI(P/1.3+9.)), 1., uLip);
      // red secundaria: solo ~30 % de los bordes, finos, solo de cerca
      float md = JQ.z; float keep = mix(1.-smoothstep(0.2, 0.26, JQ.w), 1.-smoothstep(0.48, 0.56, JQ.w), uLip);
      float taper = smoothstep(0.15, 0.6, vnI(P/1.9 + 3.3));
      float w2 = mix(0.012, 0.09, uLip)*taper;
      float dk2 = keep*(1.-smoothstep(w2-0.5*fp, w2+0.5*fp, md))*taper;
      float lip2 = 0.;
      jointDark = max(dk, dk2*0.85)*rockJ;
      jointLip = max(lipZ, lip2*0.6)*rockJ;
      rL *= 1. - (1.-smoothstep(wM, wM + 0.1 + 0.6*fp, MJ.x))*smoothstep(0., -0.2, MJ.y)*0.55*rockJ;
    }
#endif

#ifndef F_NOSAND
    // arena: seca/mojada, ondulitas en luz rasante
    vec3 sandC = mix(${L('sandDry')}*mix(0.5, 0.66, smoothstep(0.1, 1., fp)), ${L('sandWet')}*0.75, wet);   // de cerca la arena no se quema
    sandC *= 0.94 + 0.12*DT.b;
    float rp = 0.;
#ifdef F_RIPPLE
    {
      vec2 rd = vec2(0.83, 0.56);
      float ph2 = dot(P, rd)*6.2832/0.7 + (DT.a-0.5)*14. + big2*6. + (DT.g-0.5)*5.;
      float rpa = smoothstep(0.35, 0.75, MAC.g + (DT.a-0.5)*0.4);
      rp = cos(ph2)*(1.-smoothstep(0.06,0.18,fp))*(0.25 + 0.75*wet)*rpa;
      rp *= abs(dot(rd, TOSUN));
    }
#endif
    float sL = max(dot(N, Ls), 0.) + 0.26 + 0.32*rp + 0.08*(fib-0.5);
    sL = max(sL, 0.03);
#else
    vec3 sandC = ${L('sandDry')}; float sL = 0.2;
#endif

    // mezcla de superficies
    vec3 alb = grass; float kL = gL; float kS = gSky;
    alb = mix(alb, granite, rock); kL = mix(kL, rL, rock); kS = mix(kS, ao*0.85, rock);
    alb = mix(alb, sandC, sand); kL = mix(kL, sL, sand); kS = mix(kS, ao*(0.9+0.15*wet), sand);
    // juntas
    alb = mix(alb, ${L('lip')}, jointLip*0.7);
    alb = mix(alb, alb*0.35, jointDark);
    kL = mix(kL, kL*0.04, jointDark); kS = mix(kS, kS*0.55, jointDark);
    kL = mix(kL, max(kL, mix(0.6, 1.0, uLip)), jointLip);
    // huellas
#ifdef F_OV
    kL *= 1. - OV.g*sand*0.92; kL += OV.b*sand*0.35;
#endif

    clSun = alb*sunC*kL*lit;
    cl = clSun + alb*sky*kS;
#ifndef F_NOSAND
    cl += sky*vec3(0.9, 0.95, 1.05)*0.2*wet*sand;   // brillo frío de la arena mojada
#endif
    // cuerpo de las matas ocluye: guardar para figuras
  }

  // ---------------- mar ----------------
  vec3 cw = vec3(0.), cwSun = vec3(0.);
#ifndef F_NOWATER
  if(water > 0.001){
    float dd = max(mix(-coast, wl - coast, beachy), 0.);
    // agua somera: más clara sobre arena; sobre roca oscura, más oscura (sin halo claro alrededor de la costa)
    vec3 shal = mix(${L('seaMid')}*0.72, ${L('seaShallow')}*0.9, beachy);
    vec3 sea = mix(shal, ${L('seaMid')}, smoothstep(0.5, 9., dd));
    sea = mix(sea, ${L('seaDeep')}, smoothstep(22., 220., dd));
    vec2 s1 = vec2(0.012, 0.018)*uSea, s2 = vec2(-0.02, 0.01)*uSea;
    vec4 w1 = texture(tWave, P/34. + s1), w2 = texture(tWave, P/11.5 + s2);
    vec2 wn = (w1.xy-0.5)*0.9 + (w2.xy-0.5)*0.6;
#ifdef F_SWELL
    // oleaje de fondo a dos escalas (el mar no es una placa)
    vec4 w3 = texture(tWave, P/140. + vec2(0.004, 0.006)*uSea);
    wn += (w3.xy-0.5)*0.9;
    float swl = w3.b;
#else
    float swl = 0.5;
#endif
    wn *= 1.-smoothstep(0.6, 2.5, fp)*0.6;
    vec3 n = normalize(vec3(wn, 1.));
    float sunOnWater = 0.35 + 0.65*smoothstep(-0.05, 0.15, dot(n.xy, TOSUN)+0.05);
    float skyK = uSky.b/0.58;
    vec3 base = sea*(0.36 + 0.55*skyK)*(0.95 + 0.1*w1.b)*(0.92 + 0.16*swl) + sky*0.04*smoothstep(0.0, 0.3, length(n.xy));
    vec3 add = sea*sunC*(0.11 + 0.1*smoothstep(40., 4., dd))*sunOnWater + sunC*0.006*smoothstep(0.05, 0.25, dot(n.xy, TOSUN));
    // agua en sombra de la sierra: más oscura y fría
    vec3 cwSh = base*vec3(0.8,0.87,1.0);
    cw = mix(cwSh, base+add, lit);
    cwSun = cw - cwSh;
#ifdef F_CALM
    { float yS = (1.-uv.y)*1920.;
      float calm = max(smoothstep(0.15, 1.1, dd), 1.-smoothstep(960., 1120., yS));
      vec3 cs = ${L('closingSea')}*uCalmK*(0.9 + 0.2*w1.b + 0.08*(w2.b-0.5));
      cw = mix(cw, cs, calm); cwSun *= 1.-calm; }
#endif
    // espuma de rompiente a lo largo de la costa
    float wf = fract(uSea*0.16 + along + n55*0.5 - dd/22. + (w1.b-0.5)*0.3);
    float band = smoothstep(0.8, 0.96, wf)*(1.-smoothstep(0.96,1.,wf));
    float foamNoise = w1.a*0.6 + w2.a*0.6;
    float foam = band*exp(-dd/9.)*smoothstep(0.45, 0.8, foamNoise)*0.8*mix(0.25, 1., smoothstep(0.05, 0.2, fp));
    // línea de espuma fina y cortada contra la roca (no un halo continuo)
    foam += exp(-dd/(0.35+0.5*fp))*smoothstep(0.55,0.8,foamNoise)*(1.-beachy*0.6)*(0.6 + 0.4*smoothstep(0.3, 0.7, vnI(P/1.7 + uSea*0.1)));
    foam += swFront*1.2;
    // agua somera transparente sobre la arena y encaje de burbujas en la resaca
    float shallow = beachy*(1.-smoothstep(0.5, 7., dd));
    vec3 bottom = ${L('sandWet')}*0.55*(sky*1.2 + sunC*0.22*lit);
    cw = mix(cw, mix(bottom, cw, 0.45), shallow*0.7);
    cwSun = mix(cwSun, ${L('sandWet')}*0.55*sunC*0.22*lit*0.55, shallow*0.7);
    // (encaje fino de la resaca descartado: se leía como glifos)
    foam *= 0.7+0.3*uHigh;
    // pozas de marea: agua quieta, reflejo del cielo
    // encaje de espuma (S7/S8): mismas celdas que las juntas del granito
    float lace = 0.;
#ifdef F_LACE
    if(dd < 90.){
      // encaje: la red celular de la roca continúa en el mar; las diaclasas maestras salen primero como hilos más largos y brillantes
      vec2 MJq = JQ.xy;
      float wF = mix(0.07, 0.5, uLip)*(0.5 + 0.9*w2.a)*uLace.y;
      float th1 = 1.-smoothstep(wF-0.6*fp, wF+0.6*fp, MJq.x);
      float md = JQ.z; float keep = 1.-smoothstep(0.52, 0.6, JQ.w);
      float wv2 = mix(0.045, 0.26, uLip)*(0.35 + 1.1*w1.a)*uLace.y;
      float soft2 = mix(0.05, 0.12, uLip) + 0.5*fp;
      float th2 = keep*(1.-smoothstep(wv2-soft2, wv2+soft2, md));
#ifdef F_CALM
      th2 *= 0.55 + 0.45*smoothstep(0.25, 0.7, vnoise(Qv*9. + uSea*0.3));   // hilos con burbujas (no alambre)
#endif
      float film = (1.-smoothstep(0., mix(0.8, 3., uLip), md))*0.22*w2.b;   // película entre hilos
#ifdef F_CALM
      float frontN = uLace.x;
#else
      float frontN = uLace.x + (vnoise(P/9.)-0.5)*16. + (vnoise(P/3.)-0.5)*5.;
#endif
      float vis1 = smoothstep(frontN*0.6, frontN*0.6-6., dd)*mix(1.-smoothstep(0.5, 2.5, dd), 1., uLip);
      float vis2 = smoothstep(frontN, frontN-8., dd)*(1.-smoothstep(3., 40., dd)*0.75);
      float brk = 0.3 + 0.7*smoothstep(0.3, 0.62, w1.a*0.7 + w1.b*0.5 - 0.1);
      vis1 *= brk*(1.-smoothstep(2., 26., dd)*0.6); vis2 *= brk*(0.45 + 0.55*w2.b);
      float tipM = smoothstep(130., 70., length(P - vec2(42.,-8.)));
      vis1 *= tipM; vis2 *= tipM;
      if(uFlags2.z > 0.5){ float yS = (1.-uv.y)*1920.; float cf = smoothstep(${f(lc.calmBelow)}, ${f(lc.calmBelow - 2.5)}, dd)*smoothstep(uCalm.x-40., uCalm.x+90., yS); vis1 *= cf; vis2 *= cf; }
      lace = max(max(th1*vis1, th2*vis2*0.8), film*vis2)*(0.7 + 0.3*uLace.z);
    }
#endif
#ifdef F_CALM
    foam = exp(-dd/0.12)*smoothstep(0.45, 0.75, foamNoise)*0.8;   // solo una línea fina y cortada contra la roca
#endif
    foam = clamp(max(foam, lace), 0., 1.);
    vec3 foamS = ${L('foam')}*sunC*lit*(0.07+0.05*uLace.z);
    vec3 foamC = ${L('foam')}*(0.28 + 0.5*skyK)*vec3(0.93,0.97,1.0) + foamS;
    cw = mix(cw, foamC, foam*0.9); cwSun = mix(cwSun, foamS, foam*0.9);
    // pozas
  }
#endif
  float wm = water*(1.-step(0.5,pool));
  col = mix(cl, cw, wm); sunT = mix(clSun, cwSun, wm);
  if(uKnE.z > 0.){
    vec2 kq = (P-uKnE.xy)/uKnE.zw;
    if(kq.x > 0. && kq.y > 0. && kq.x < 1. && kq.y < 1.){
      vec4 KA = texture(tKnA, kq), KB = texture(tKnB, kq);
      float aoB = textureLod(tKnA, kq, 3.5).a;
      col -= sunT*KB.w*(1.-KA.a); sunT *= 1.-KB.w*(1.-KA.a);
      col *= 1. - 0.35*max(aoB - KA.a, 0.);
      if(KA.a > 0.){
        vec3 nn = normalize(vec3(KB.xy, 1.)); float ndl = dot(nn, Ls);
        float sT = max(ndl, 0.)*smoothstep(-0.04, 0.1, ndl);
        vec3 sunB = KA.rgb*sunC*1.5*sT*lit;
        vec3 cB = sunB + KA.rgb*sky*(0.5 + 0.5*KB.z)*(0.85 + 0.3*nn.z);
        col = mix(col, cB, KA.a); sunT = mix(sunT, sunB, KA.a);
      }
    }
  }
#ifdef F_TIP
  if(pool > 0.02){
    // poza de marea: fondo oscuro visto a través del agua, borde mojado oscuro, reflejo frío del cielo
    float skyKp = uSky.b/0.58;
    float depth = smoothstep(0.2, 0.95, pool);
    vec3 bottomP = ${L('graniteA')}*0.55*(sky*1.1 + uSunC*uSunI*0.08*lit);
    float rip = vnoise(P*4.+vec2(uSea*0.4, 0.)) - vnoise(P*4.+vec2(0.37, uSea*0.3));
    vec3 refl = sky*vec3(0.72, 0.84, 1.08)*(0.5 + 0.35*smoothstep(-0.3, 0.3, rip + (tq.y-0.5)*0.4));
    vec3 pc = mix(bottomP, ${L('seaDeep')}*(0.2+0.2*skyKp), depth*0.7)*0.7 + refl*(0.1 + 0.1*depth);
    pc = mix(pc, vec3(luma(pc)), 0.35);
    float rim = smoothstep(0.05, 0.25, pool)*(1.-smoothstep(0.35, 0.6, pool));
    float pm = smoothstep(0.25, 0.55, pool);
    col = mix(col, col*0.45, rim*0.8); sunT *= 1.-rim*0.6;
    col = mix(col, pc, pm); sunT *= 1.-pm;
  }
#endif

#ifdef F_OV
  // capa rasterizada: sombras (quitan solo el sol) y cuerpos
  col -= sunT*OV.r;
  col *= 1. - 0.3*OV.r*wm*vec3(1.05, 1.0, 0.9);   // sobre el agua la sombra también apaga la luz difusa del agua (fría, suave)
  col = col*(1.-OB.a) + OB.rgb;
#endif
  o = vec4(gradeColor(max(col, 0.), uv), 1.);
  if(uDbg.x > 3.5){ o = uDbg.x < 4.5 ? vec4(vec3(lit), 1.) : vec4(clamp((HZ - uE)*2.+0.5, 0., 1.), clamp((hzFar(h) - uE)*2.+0.5, 0., 1.), fract(h/10.), 1.); return; }
  if(uDbg.x > 0.5){ o = uDbg.x < 1.5 ? vec4(vec3(ao), 1.) : (uDbg.x < 2.5 ? vec4(N.xy*4.+0.5, 0., 1.) : vec4(vec3(fract(h)), 1.)); }
}`;
  };

  LR.gradeGLSL = function (cfg) {
    const g = cfg.grade;
    const st = lin(g.shadowTint);
    return `
float h21g(vec2 p){ uvec2 q = uvec2(ivec2(p)) * uvec2(1597334677u, 3812015801u); uint n = (q.x ^ q.y) * 1597334677u; n ^= n >> 16; n *= 2246822519u; n ^= n >> 13; return float(n) * (1.0/4294967296.0); }
vec3 acesG(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }
vec3 srgbG(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4))-0.055, step(0.0031308, c)); }
vec3 gradeColor(vec3 c, vec2 uv){
  c = acesG(c*uExp);
  float l = dot(c, vec3(0.2126,0.7152,0.0722));
  vec3 tint = ${v3(st)};
  vec3 tn = tint/max(dot(tint,vec3(0.2126,0.7152,0.0722)),0.001);
  c = mix(c, tn*l, ${f(g.shadowAmt)}*(1.-smoothstep(0.02, 0.2, l)));
  c *= mix(vec3(1.), vec3(1.0+${f(g.warm)}, 1.0+${f(g.warm * 0.3)}, 1.0-${f(g.warm)}), smoothstep(0.25, 0.8, l));
  vec2 px = vec2(uv.x*1080., (1.-uv.y)*1920.);
  vec2 d = (uv-0.5)*vec2(1.,1.78); c *= 1. - ${f(g.vignette)}*smoothstep(0.35, 1.05, length(d));
  if(uScrim > 0.){
    float dd = length(max(vec2(max(uBox.x-px.x, px.x-uBox.z), max(uBox.y-px.y, px.y-uBox.w)), 0.));
    c *= mix(1., uScrim, 1.-smoothstep(0., uFeather, dd));
  }
  float lg = dot(c, vec3(0.2126,0.7152,0.0722)); c = mix(vec3(lg), c, ${f(g.saturation)});
  c = srgbG(c);
  c += (h21g(px + vec2(uSeed*131.0, uSeed*71.0)) - 0.5)*2.*uGrain;
  return clamp(c, 0., 1.);
}`;
  };

})();
