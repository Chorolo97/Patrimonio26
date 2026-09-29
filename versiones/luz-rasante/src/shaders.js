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
uniform sampler2D tBake, tNorm, tHz, tTip, tTipN, tTipHz, tDet, tWave, tPhoto, tAtlas, tOV, tOB, tVor;
uniform vec4 uXf;          // cx, cy, mpp, theta
uniform float uT, uE, uEh, uSunI;
uniform vec3 uSunC, uSky;
uniform float uSea, uLow, uHigh, uSway, uGust;
uniform vec4 uFlags;       // close, tip, ship, boat
uniform vec4 uFlags2;      // footprints, lace, calm(S8), clumps
uniform vec4 uLace;        // R, width, flash, drift
uniform vec4 uKnoll;       // on, frontA (m, eje solar desde la loma), jag, halfLen
uniform vec4 uKnollP;      // x, y, 0, 0
uniform vec4 uBand, uBandL, uBand2; uniform float uLip;
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
const vec2 TIP0 = vec2(${f(TB.cx - TB.size / 2)},${f(TB.cy - TB.size / 2)}); const float TIPS = ${f(TB.size)};
const vec2 TOSUN = vec2(${f(toSun[0])},${f(toSun[1])});
const vec2 SDIR = vec2(${f(sDir[0])},${f(sDir[1])});
const vec2 SPERP = vec2(${f(perp[0])},${f(perp[1])});
const float ACOLS = ${f(atlas.cols)}, AROWS = ${f(atlas.rows)}, AWM = ${f(atlas.WM)}, AHM = ${f(atlas.HM)};
${hzCode}
float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
vec2 hash22(vec2 p){ return vec2(hash21(p), hash21(p+19.19)); }

// ---- Voronoi (juntas del granito = encaje de espuma): distancia al borde y dirección al borde ----
vec4 voronoiEdge(vec2 x){
  vec2 n = floor(x), f = fract(x); vec2 mg, mr; float md = 8.; float eh = 0.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g = vec2(i,j); vec2 r = g + 0.15 + 0.7*hash22(n+g) - f; float d = dot(r,r); if(d<md){ md=d; mr=r; mg=g; } }
  md = 8.; vec2 nb = vec2(0.);
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g = mg + vec2(i,j); vec2 r = g + 0.15 + 0.7*hash22(n+g) - f;
    vec2 dr = r-mr; if(dot(dr,dr)>0.0001){ float d = dot(0.5*(mr+r), normalize(dr)); if(d<md){ md=d; nb=normalize(dr); eh = hash21(2.*n+mg+g+0.37); } } }
  return vec4(md, nb, eh);
}

vec2 jointDomain(vec2 P){ vec2 w = vec2(vnoise(P/7.1), vnoise(P/7.1+5.2))-0.5; vec2 q = P + w*2.4; return vec2(dot(q, vec2(0.94,0.34)), dot(q, vec2(-0.34,0.94))*1.2)/${f(lc.cell)}; }
vec3 grain(vec2 P){ return texture(tPhoto, P).rgb - 0.5; }

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
  tipW = smoothstep(0.5, 0.46, max(abs(tq.x-.5), abs(tq.y-.5)));
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
  vec2 dq = (P + sway)/16.;
  vec4 DT = texture(tDet, dq);
  float lodFade = smoothstep(0.02, 0.2, fp);   // 1 = lejos (detalle ya promediado)
  vec4 MAC = texture(tDet, P/uMacS+vec2(0.37,0.71));
  float tpatch = smoothstep(0.3, 0.75, MAC.g*0.8 + DT.a*0.4);
  float tus = DT.r*mix(0.45, 1.05, tpatch);
  float fib = mix(0.5, DT.b, 1.-lodFade);
  // bordes de roca nítidos e irregulares (umbral perturbado)
  rock = smoothstep(0.38, 0.62, rock + (DT.g-0.5)*0.35*(1.-lodFade) + (MAC.b-0.5)*0.15);
#ifdef F_NOGRASS
  float big1 = 0.5;
#else
  float big1 = vnoise(P/42.);
#endif
  float big2 = vnoise(P/9.+3.1);

  // terminador dentado por las matas (solo cerca)
  float jag = (tus-0.5)*0.16*(1.-lodFade) + (big2-0.5)*0.06;
  float lit = smoothstep(hz-${f(cfg.sun.penumbra)}, hz+${f(cfg.sun.penumbra)}, uE + jag);

  // sombra dirigida de la loma (S4)
#ifdef F_BAND
  {
    vec2 ba = uBand.zw - uBand.xy, pa = P - uBand.xy; float d = (ba.x*pa.y - ba.y*pa.x)/length(ba);
    float dj = d + (tus-0.5)*0.5 + (vnoise(P/2.3)-0.5)*uBandL.z*2.;
    float bu = uBand2.z*exp(-0.5*pow((P.y-uBand2.x)/uBand2.y, 2.));
    lit *= (1.-smoothstep(uBandL.y-0.8, uBandL.y+0.8, dj))*smoothstep(uBandL.x-bu-0.8, uBandL.x-bu+0.8, dj);
  }
#endif
#ifdef F_KNOLL
  {
    vec2 rel = P - uKnollP.xy; float a = dot(rel, TOSUN), b = dot(rel, SPERP);
    float front = uKnoll.y + (vnoise(vec2(b/3.2, 1.7))-0.5)*uKnoll.z + (tus-0.5)*0.9*(1.-lodFade);
    float inS = smoothstep(front-0.6, front+0.6, a) * smoothstep(uKnoll.w, uKnoll.w-12., abs(b)) * step(a, 0.);
    lit *= 1.-inS;
  }
#endif

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
  float swFront = beachy*step(cyc,0.62)*exp(-abs(coast-wl)/(0.18+0.6*fp))*(0.55+0.45*vnoise(P*1.3));
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
  vec4 VV = texture(tVor, jointDomain(Qv)/16.); VV.yz = normalize(VV.yz + 1e-4);
#endif
  // ---------------- tierra ----------------
  vec3 cl = vec3(0.), clSun = vec3(0.);
  if(water < 0.999){
#ifndef F_NOGRASS
    // pradera
    vec3 ph = (texture(tPhoto, mat2(0.8,-0.6,0.6,0.8)*P/27.+0.31).rgb - 0.5)*(1.-0.6*lodFade);
    float dry = smoothstep(0.2, 0.8, mix(big1, 0.5, lodFade*0.7)*0.9 + (MAC.a-0.5)*0.6 + ph.b*0.5);
    vec3 grass = mix(${L('olive')}, ${L('ochre')}, dry*0.7);
    grass = mix(grass, ${L('straw')}, (smoothstep(0.4, 0.9, tus)*0.25*(1.-lodFade) + smoothstep(0.55,0.8, DT.a)*0.2)*(0.5+0.5*dry));
    grass *= (0.9 + 0.2*tus*(1.-lodFade*0.7))*(0.85 + 0.3*fib);
    grass *= 1. + ph.b*0.4 + (MAC.b-0.5)*0.25;
    grass = mix(grass, grass*vec3(0.92,1.0,0.86), (1.-tpatch)*0.5);

    // sendero viejo: pasto más corto y pálido
    float tdist = NB.w;
#ifdef F_TRAILSEG
    if(NB.w < 3.5){ tdist = 60.; for(int i=0;i<12;i++){ if(float(i)>=uNTrail) break; vec2 a = uTrail[i].xy, b2 = uTrail[i].zw; vec2 pa=P-a, ba=b2-a; float t=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); tdist=min(tdist, length(pa-ba*t)); } }
#endif
    float tw = ${f(Wd.trailWidth)}*(0.85+0.3*vnoise(P/6.)) * 0.5;
    float twv = max(tw, 0.6*fp);
    float twj = twv + (DT.r-0.3)*0.25*(1.-lodFade);
    float trail = 0.85*(1.-smoothstep(twj-0.5*fp-0.06, twj+0.5*fp+0.06, tdist)) * min(1., tw/twv) * (1.-rock) * (1.-sand);
    float tusE = mix(tus, tus*0.45+0.1, trail);
    grass = mix(grass, mix(grass, ${L('straw')}, 0.2)*1.06, trail);

    // luz en la pradera: briznas verticales y matas (no Lambert)
    float NdL = dot(N, Ls);
    float rel = NdL - Ls.z;
    float micro = 0.;
    float gface = 0.;
#ifdef F_MICRO
    {
      float tanE = max(tan(e) + dot(N.xy, TOSUN)/max(N.z,0.2), 0.012);
      float hp0 = tusE*0.4;
      float s1 = texture(tDet, dq + TOSUN*0.18/16.).r, s2 = texture(tDet, dq + TOSUN*0.42/16.).r, s3 = texture(tDet, dq + TOSUN*0.85/16.).r;
      float s4 = texture(tDet, dq + TOSUN*1.7/16.).r;
      float tr1 = 1.-trail*0.7;
      float occ = max(max((s1*0.4*tr1-hp0-0.18*tanE)*0.7/0.05, (s2*0.4*tr1-hp0-0.42*tanE)*0.9/0.05), max((s3*0.4*tr1-hp0-0.85*tanE)*0.9/0.06, (s4*0.4*tr1-hp0-1.7*tanE)*0.75/0.07));
      micro = 0.55*smoothstep(0., 1.5, occ)*(1.-lodFade)*(1.-trail*0.75);
      gface = clamp((s1-tusE)*0.4/0.15, -1., 1.);
    }
#endif
    float blades = 0.32 + 0.2*tusE + 0.14*fib;
    float gL = max(NdL, blades) * (1. - micro);
    gL *= clamp(1. + 2.2*rel - 0.55*gface*(1.-lodFade), 0.3, 1.9);
    gL *= smoothstep(-0.05, 0.03, NdL + 0.02);
    float gSky = ao*(0.7 + 0.2*tusE + 0.2*fib)*(1.-0.3*micro);
#else
    vec3 grass = ${L('olive')}; float gL = 0.4; float gSky = ao;
#endif

#ifndef F_NOROCK
    // granito
    vec3 gr = grain(P/5.5);
    // granito: gris cálido meteorizado, más oscuro y húmedo cerca del agua; líquenes suaves
    vec3 granite = mix(${L('graniteB')}, ${L('graniteC')}, smoothstep(0.25,0.75, big2*0.6 + DT.g*0.5))*1.2;
    granite = mix(${L('graniteA')}, granite, smoothstep(0.5, 4., coast));
    float lich = smoothstep(0.55,0.8, vnoise(P/3.7+7.)*0.6 + vnoise(P/1.1)*0.25 + DT.b*0.25)*smoothstep(2.,6.,coast);
    granite = mix(granite, mix(${L('lichenA')}, ${L('lichenB')}, DT.b), lich*0.22);
    vec3 grf = grain(P/1.9+0.43);
    granite *= 1. + (gr.r*0.5 + gr.g*0.5)*0.35*(1.-lodFade*0.6) + (grf.r+grf.g)*0.3*(1.-smoothstep(0.02, 0.08, fp));
    float spk = hash21(floor(P/0.02))*(1.-smoothstep(0.015, 0.05, fp));
    granite *= 0.9 + 0.2*spk;
    // manchas de liquen redondas
    float rface = 0.;
    // roca rugosa: sus microfacetas atrapan la luz rasante (como las briznas)
    float rL = max(dot(N, Ls), 0.26 + 0.2*DT.g) * smoothstep(-0.12, 0.02, dot(N, Ls));
    rL = rL*(1. - rface*0.7) + 0.03;
#else
    vec3 granite = ${L('graniteB')}*1.2; float rL = max(dot(N, Ls), 0.3); float rface = 0.;
#endif
    // juntas: grietas oscuras con labio cálido del lado del sol
    float jointDark = 0., jointLip = 0.;
    vec3 vj = vec3(9.);
    float rockJ = smoothstep(0.45, 0.8, rock);
#ifdef F_JOINTS
    if(rock > 0.2){
      vec4 vv = VV; vj = vv.xyz;
      float md = vj.x*${f(lc.cell)} + smoothstep(mix(0.5, 0.26, uLip), mix(0.42, 0.18, uLip), vv.w)*9.;
      float cw = max(0.035, 0.35*fp) * (0.4 + 1.2*vnoise(P/2.3)*vv.w);
      float fade = (1.-smoothstep(0.25,0.5,fp))*rockJ;
      jointDark = (1.-smoothstep(cw-0.5*fp, cw+0.5*fp, md))*fade;
      float lipSide = smoothstep(-0.1, 0.25, dot(vj.yz, TOSUN));
      float lw = cw + max(0.06, mix(0.6, 1.1, uLip)*fp);
      jointLip = (1.-smoothstep(lw-0.5*fp, lw+0.5*fp, md))*(1.-jointDark)*lipSide*fade;
      float shSide = smoothstep(0.1,-0.25, dot(vj.yz, TOSUN));
      rL *= 1. - (1.-smoothstep(cw, cw+0.35+0.3*fp, md))*shSide*0.8*fade;
    }
#endif

#ifndef F_NOSAND
    // arena: seca/mojada, ondulitas en luz rasante
    vec3 sandC = mix(${L('sandDry')}*0.78, ${L('sandWet')}*0.9, wet);
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
    float sL = max(dot(N, Ls), 0.) + 0.26 + 0.2*rp + 0.08*(fib-0.5);
    sL = max(sL, 0.03);
#else
    vec3 sandC = ${L('sandDry')}; float sL = 0.2;
#endif

    // mezcla de superficies
    vec3 alb = grass; float kL = gL; float kS = gSky;
    alb = mix(alb, granite, rock); kL = mix(kL, rL, rock); kS = mix(kS, ao*0.85, rock);
    alb = mix(alb, sandC, sand); kL = mix(kL, sL, sand); kS = mix(kS, ao*(0.9+0.15*wet), sand);
    // juntas
    alb = mix(alb, ${L('lip')}, jointLip*mix(0.4, 0.85, uLip));
    kL = mix(kL, kL*0.05, jointDark); kS = mix(kS, kS*0.6, jointDark);
    kL = mix(kL, max(kL, mix(0.45, 1.1, uLip)), jointLip*mix(0.6, 1., uLip));
    // huellas
#ifdef F_OV
    kL *= 1. - OV.g*sand*0.92; kL += OV.b*sand*0.35;
#endif

    clSun = alb*sunC*kL*lit;
    cl = clSun + alb*sky*kS;
    // cuerpo de las matas ocluye: guardar para figuras
  }

  // ---------------- mar ----------------
  vec3 cw = vec3(0.), cwSun = vec3(0.);
#ifndef F_NOWATER
  if(water > 0.001){
    float dd = max(mix(-coast, wl - coast, beachy), 0.);
    vec3 sea = mix(${L('seaShallow')}, ${L('seaMid')}, smoothstep(1.5, 22., dd));
    sea = mix(sea, ${L('seaDeep')}, smoothstep(22., 220., dd));
    vec2 s1 = vec2(0.012, 0.018)*uSea, s2 = vec2(-0.02, 0.01)*uSea;
    vec4 w1 = texture(tWave, P/34. + s1), w2 = texture(tWave, P/11.5 + s2);
    vec2 wn = (w1.xy-0.5)*0.9 + (w2.xy-0.5)*0.6;
    wn *= 1.-smoothstep(0.6, 2.5, fp)*0.6;
    vec3 n = normalize(vec3(wn, 1.));
    float sunOnWater = 0.35 + 0.65*smoothstep(-0.05, 0.15, dot(n.xy, TOSUN)+0.05);
    float skyK = uSky.b/0.58;
    vec3 base = sea*(0.36 + 0.55*skyK)*(0.92 + 0.16*w1.b) + sky*0.04*smoothstep(0.0, 0.3, length(n.xy));
    vec3 add = sea*sunC*(0.11 + 0.1*smoothstep(40., 4., dd))*sunOnWater + sunC*0.006*smoothstep(0.05, 0.25, dot(n.xy, TOSUN));
    // agua en sombra de la sierra: más oscura y fría
    vec3 cwSh = base*vec3(0.8,0.87,1.0);
    cw = mix(cwSh, base+add, lit);
    cwSun = cw - cwSh;
#ifdef F_CALM
    { float calm = smoothstep(3., 13., dd);
      vec3 cs = ${L('closingSea')}*uCalmK*(0.9 + 0.2*w1.b + 0.08*(w2.b-0.5));
      cw = mix(cw, cs, calm); cwSun *= 1.-calm; }
#endif
    // espuma de rompiente a lo largo de la costa
    float wf = fract(uSea*0.16 + along + n55*0.5 - dd/22. + (w1.b-0.5)*0.3);
    float band = smoothstep(0.8, 0.96, wf)*(1.-smoothstep(0.96,1.,wf));
    float foamNoise = w1.a*0.6 + w2.a*0.6;
    float foam = band*exp(-dd/9.)*smoothstep(0.45, 0.8, foamNoise)*0.8;
    foam += exp(-dd/(0.8+1.2*fp))*smoothstep(0.3,0.8,foamNoise+0.2)*(1.-beachy*0.6);
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
    if(dd < 80.){
      vec2 Q = Qv;
      vec4 v = VV;
      float md = v.x*${f(lc.cell)} + smoothstep(0.26, 0.18, v.w)*9.;
      float lw = (0.07 + 0.2*v.w*v.w + 0.08*vnoise(Q/2.3))*uLace.y + 0.35*fp;
      float ln = 1.-smoothstep(lw-0.5*fp, lw+0.5*fp, md);
#ifdef F_CALM
      float frontN = uLace.x;
#else
      float frontN = uLace.x + (vnoise(P/9.)-0.5)*16. + (vnoise(P/3.)-0.5)*5.;
#endif
      float vis = smoothstep(frontN, frontN-6., dd) * smoothstep(${f(lc.R + 5)}, 12., dd);
      vis *= (0.3 + 0.7*smoothstep(0.35,0.65, vnoise(Q/9.+uSea*0.05)))*mix(1., 0.2, smoothstep(4., 42., dd));
      vis *= smoothstep(120., 60., length(P - vec2(42.,-8.)));
      if(uFlags2.z > 0.5){ vis *= smoothstep(${f(lc.calmBelow)}, ${f(lc.calmBelow - 8)}, dd) * smoothstep(uCalm.x-60., uCalm.x+60., (1.-uv.y)*1920.); }
      lace = ln*vis*(0.62 + 0.38*uLace.z);
    }
#endif
#ifdef F_CALM
    foam *= 1.-smoothstep(9., 16., dd);
#endif
    foam = clamp(max(foam, lace), 0., 1.);
    vec3 foamS = ${L('foam')}*sunC*lit*(0.12+0.08*uLace.z);
    vec3 foamC = ${L('foam')}*(0.25 + 0.5*skyK)*vec3(0.92,0.96,1.0) + foamS;
    cw = mix(cw, foamC, foam*0.9); cwSun = mix(cwSun, foamS, foam*0.9);
    // pozas
  }
#endif
  float wm = water*(1.-step(0.5,pool));
  col = mix(cl, cw, wm); sunT = mix(clSun, cwSun, wm);
#ifdef F_TIP
  if(pool > 0.02){
    float skyKp = uSky.b/0.58;
    vec3 pc = ${L('seaMid')}*(0.5+0.6*skyKp) + sky*0.35;
    float rim = smoothstep(0.45, 0.2, pool);
    float pm = smoothstep(0.1,0.45,pool)*(1.-rim*0.6);
    col = mix(col, pc, pm); sunT *= 1.-pm;
  }
#endif

#ifdef F_OV
  // capa rasterizada: sombras (quitan solo el sol) y cuerpos
  col -= sunT*OV.r;
  col = col*(1.-OB.a) + OB.rgb;
#endif
  o = vec4(gradeColor(max(col, 0.), uv), 1.);
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
