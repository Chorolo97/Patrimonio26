/* Shaders de «Cota cero». Todos devuelven color final (sin alfa) en espacio de pantalla 1080×1920. */
(function () {
  const SH = (window.CC_SH = {});

  SH.common = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
${PBS.GLSL_NOISE}
float fbm3(vec2 p){ float s=0., a=.5; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return s/.875; }
// cobertura de una línea: dist en px al centro, semiancho en px, rampa ~1 px
float lineCov(float dpx, float hw){ return clamp(hw - dpx + .5, 0., 1.)*clamp(hw*2., 0., 1.); }
// distancia en px a la isolínea entera más cercana del campo f
float isoDist(float f){ return abs(fract(f + .5) - .5) / max(fwidth(f), 1e-5); }
vec2 pxOf(vec2 uv){ return vec2(uv.x*1080., (1. - uv.y)*1920.); }
vec2 uvOf(vec2 px){ return vec2(px.x/1080., 1. - px.y/1920.); }
// diente de la plancha / grano del papel (fijo en pantalla)
float tooth(vec2 px){ return (vnoise(px/140.)*.55 + vnoise(px/31. + 7.)*.25 + hash21(floor(px))*.2 - .5)*2.; }
`;

  // ---------------- PLANTA ----------------
  SH.plan = SH.common + `
uniform sampler2D bake, aux, hach;
uniform vec4 ext;          // mundo x0,y0,x1,y1
uniform vec4 fr;           // x0, yTop, mpp, zoom
uniform vec2 tipPx;        // punta en px (zoom 1)
uniform float t, S, E, day, wmul, low, cen, ringOpen, trailProg, landOn;
uniform vec4 on0, on1, am0, am1;
uniform vec3 cPlate, cLand, cSea, cFoam, cTrail;           // noche
uniform vec3 cPaper, cGranite, cGrass, cSand, cSeaD, cOchre; // día
uniform float toothAmt, grainAmt, toneAmt;

float ripple(float r, float ti, float A){
  float dt = t - ti; if (dt <= 0. || dt > 7.) return 0.;
  float x = r - 170.*dt;
  return A*exp(-dt/2.2)*sin(x/9.)*exp(-(x*x)/(28.*28.));
}

void main(){
  vec2 px = pxOf(uv);
  vec2 P = tipPx + (px - tipPx)/fr.w;              // px del cuadro a zoom 1
  vec2 w = vec2(fr.x + P.x*fr.z, fr.y - P.y*fr.z);  // mundo (m)
  vec2 bu = (w - ext.xy)/(ext.zw - ext.xy);
  vec4 B = texture(bake, bu);
  vec4 A = texture(aux, bu);
  vec4 Hc = texture(hach, vec2(P.x/1080., 1. - P.y/1920.));
  float h = B.r, rock = B.g, sandM = B.b, D = B.a;
  float mpp = fr.z/fr.w;                           // m por px en pantalla
  float Dpx = D/mpp;
  float wob = (vnoise(px/9.) - .5)*.7;             // sangrado fijo ±0,35 px

  // ---- mar: líneas de corriente ----
  float Delta = 14.*fr.z;                          // 14 px en metros (zoom 1)
  float psi = -w.y/Delta, seaHW = 1.25*wmul;
  if (D > -8.) {                                   // solo en el mar (rama coherente por zonas)
    vec2 q = w/170.;
    float wave = (fbm3(q + vec2(S*.55, S*.18)) - .5)*2.*9.5;
    float jit = (vnoise(w/300. + 3.) - .5)*2.*.12*Delta*2.;
    float rP = length(P - tipPx);
    float rip = ripple(rP, on0.x, am0.x) + ripple(rP, on0.y, am0.y) + ripple(rP, on0.z, am0.z) + ripple(rP, on0.w, am0.w)
              + ripple(rP, on1.x, am1.x) + ripple(rP, on1.y, am1.y) + ripple(rP, on1.z, am1.z) + ripple(rP, on1.w, am1.w);
    psi = (-w.y + wave + jit)/Delta + rip/14.;
    seaHW = (1.25 + .2*vnoise(w/90.) + wob*.5)*wmul;
  }
  float seaL = lineCov(isoDist(psi), seaHW);
  seaL *= smoothstep(3.5, 7.5, Dpx);               // la tinta del mar se detiene antes de la costa

  // ---- espuma: anillos = isolíneas de la distancia a la costa ----
  float dTip = length(w - vec2(${'${TIPX}'}, ${'${TIPY}'}));
  float Dmax = 150.*(.16 + .84*exp(-dTip/480.))*ringOpen;
  float phi = (150./11.)*log((25. + 11.*D/150.)/25.);
  float drift = S*.42;
  float ringD = isoDist(phi - drift);
  float ringA = smoothstep(4., 9., D)*(1. - smoothstep(Dmax*.62, Dmax, D))*step(.001, ringOpen);
  float edgeF = mix(1./26., 1./9., cen);
  float lace = 0.;
  if (day > .5 && D > 0. && D < 160.) lace = (vnoise(px*edgeF) - .5)*1.8;
  float ringHW = mix(1.15, 1.9, day)*(.85 + .35*low) + day*lace*.5;
  float ring = lineCov(ringD, ringHW)*ringA;
  float coast = lineCov(abs(Dpx), 1.3*wmul + wob*.4);   // cota cero

  // ---- tierra ----
  float land = smoothstep(-.05, .15, h);
  float F = h/5.;
  float fwF = fwidth(F);
  float Lr = floor(F + .5);
  float major = 1. - step(.5, abs(mod(Lr, 5.)));
  // curvas: menores (5 m) solo donde el terreno es suave; en laderas con hachuras quedan las mayores (25 m)
  float cHW = (1.15 + .45*major)*wmul + wob*.5;
  float minorK = mix(1. - smoothstep(.018, .034, fwF), 1., major);
  float kW = minorK * (1. - smoothstep(.12, .19, fwF)) * (1. - smoothstep(.45, .8, rock));
  float cont = lineCov(isoDist(F), cHW*kW - (1. - kW)*.6)*step(.5, Lr)*land;
  float rev = A.b;
  cont *= smoothstep(rev, rev + .05, t)*landOn;
  float bandOn = smoothstep(h - 2., h + 2., E)*landOn;
  float hachC = Hc.r*bandOn*land;
  float sandC = Hc.b*land*smoothstep(-1., 1., E)*landOn;
  float trailC = Hc.g*step(Hc.a, trailProg + .001)*step(.001, trailProg);

  vec3 col;
  if (day < .5) {
    col = cPlate*(1. + toothAmt*tooth(px));
    col = mix(col, cSea, seaL*(1. - ring)*(1. - land));
    col = mix(col, cFoam, max(ring, coast)*(1. - land*.0));
    col = mix(col, cLand*.93, sandC*.9);
    col = mix(col, cLand, max(cont, hachC));
    col = mix(col, cTrail, trailC);
  } else {
    col = cPaper*(1. + grainAmt*tooth(px))*(1. - toneAmt);
    float gap = ring;                                // la espuma es papel
    col = mix(col, cSeaD, seaL*(1. - gap)*(1. - land));
    col = mix(col, cGranite, coast*.9);
    col = mix(col, cSand, sandC);
    vec3 ink = mix(cGrass, cGranite, smoothstep(.3, .7, rock));
    col = mix(col, ink, max(cont, hachC));
    col = mix(col, cOchre, trailC);
  }
  o = vec4(col, 1.);
}`;
})();

/* ---------------- GRUTA (noche) y composición de frentes ---------------- */
(function () {
  const SH = window.CC_SH;
  SH.grotto = SH.common + `
uniform sampler2D gro;
uniform vec2 zc; uniform float zoom, shim, boneMul, t;
uniform vec3 cPlate, cLand, cFoam; uniform float toothAmt;
void main(){
  vec2 px = pxOf(uv);
  vec2 P = zc + (px - zc)/zoom;
  vec4 g = texture(gro, vec2(P.x/1080., 1. - P.y/1920.));
  float s = clamp(.5 + shim*(vnoise(P/340. + vec2(t*.05, 0.)) - .5)*2., 0., 1.);
  float stroke = mix(g.r, g.g, s);
  vec3 col = cPlate*(1. + toothAmt*tooth(px));
  vec3 bone = cLand*boneMul;
  col = mix(col, bone*.94, g.b);
  col = mix(col, bone, stroke);
  col = mix(col, cFoam*boneMul, g.a);
  o = vec4(col, 1.);
}`;

  // Composición por frente: A delante del borde, B detrás. dir: dirección de avance del borde (px), pos: posición del borde.
  SH.front = SH.common + `
uniform sampler2D ta, tb;
uniform vec2 dir; uniform float pos, amp, feather, lineW, nscale, seed;
uniform vec3 lineCol;
void main(){
  vec2 px = pxOf(uv);
  float f = dot(px, dir) + (fbm3(px/nscale + seed) - .5)*2.*amp;
  float gpx = max(length(vec2(dFdx(f), dFdy(f))), 1e-4);
  float m = smoothstep(pos - 1.2*gpx, pos + 1.2*gpx, f);   // borde nítido (1 = aún delante del frente → capa A)
  vec3 a = texture(ta, uv).rgb, b = texture(tb, uv).rgb;
  vec3 col = mix(b, a, m);
  float d = abs(f - pos)/gpx;
  col = mix(col, lineCol, lineCov(d, lineW*.5)*step(.5, lineW));
  o = vec4(col, 1.);
}`;
})();

/* ---------------- OBLICUA (día) ---------------- */
(function () {
  const SH = window.CC_SH;
  SH.oblique = (waterGLSL) => SH.common + `
uniform sampler2D land, stat, dyn;
uniform float yOff, ybh, BH, f, cz, t, S, low, wmul, skyK, echoFront, echoPhase, echoAmp, swash, closeK, decayK;
uniform vec2 tipB;
uniform vec4 shipBox; uniform float shipBob;
uniform vec4 on0, am0;
uniform vec4 r0, r1, r2, r3, r4;
uniform vec3 cPaper, cGranite, cGrass, cSand, cSeaD, cOchre;
uniform float grainAmt, toneAmt;
uniform vec4 skyP;   // spacing, topW, cloud1 y, cloud2 y
uniform vec4 seaP;   // dlog, waveAmp, -, swellFrom
uniform vec4 echoP;  // aspect, rho0, lambda, gap
${waterGLSL}
float inRect(vec2 p, vec4 r){ vec2 a = r.xy - 30., b = r.zw + 30.; vec2 d = max(a - p, p - b); return 1. - smoothstep(-6., 0., max(d.x, d.y)); }
float tdec(float v){ return 20. + 20.*(v*255. - 1.)/254.; }
float swell(float d, float ti, float A){
  float dt = t - ti; if (dt <= 0. || dt > 6.) return 0.;
  float ds = seaP.w - 40.*dt; if (ds < 12.) return 0.;
  float x = (d - ds)/(ds*.16);
  return A*exp(-dt/2.2)*exp(-x*x)*sin(x*2.2);
}
void main(){
  vec2 px = pxOf(uv);
  vec2 pb = vec2(px.x, px.y + yOff);
  vec2 pbs = pb;
  if (pb.x > shipBox.x && pb.x < shipBox.z && pb.y > shipBox.y && pb.y < shipBox.w) pbs.y -= shipBob;
  vec2 tu = vec2(pb.x/1080., 1. - pb.y/BH);
  vec4 L = texture(land, tu);
  vec4 Sx = texture(stat, tu);
  vec4 Dy = texture(dyn, vec2(pbs.x/1080., 1. - pbs.y/BH));
  float wob = (vnoise(pb/9.) - .5)*.7;
  float rectK = 1. - closeK*max(max(max(inRect(px, r0), inRect(px, r1)), max(inRect(px, r2), inRect(px, r3))), inRect(px, r4));
  vec3 col = cPaper*(1. + grainAmt*tooth(px))*(1. - toneAmt);

  float below = pb.y - ybh;
  float skyC = 0., seaC = 0., gapC = 0., sandC = 0.;
  if (below <= 0.) {
    // CIELO: rayado fino que adelgaza hasta el horizonte (el resplandor es papel), dos bandas de nube
    float fromTop = clamp((ybh - pb.y)/ybh, 0., 1.);
    float cl = exp(-pow((pb.y - skyP.z + 22.*sin(pb.x/310. + 1.))/70., 2.)) + .8*exp(-pow((pb.y - skyP.w + 18.*sin(pb.x/260. + 4.))/55., 2.));
    float hw = (skyP.y*.5*pow(fromTop, 1.25) + .4*cl*(vnoise(pb*vec2(1./240., 1./40.)) - .35)*2.)*wmul;
    skyC = lineCov(abs(fract(pb.y/skyP.x + .5) - .5)*skyP.x, max(0., hw + wob*.3*fromTop))*smoothstep(0., 40., ybh - pb.y);
  } else {
    float dw = waterD(pb.x);
    float sw = swash;
    float dEdge = dw - .35*sw;
    // desplazamientos del mar: olas (fase del mar), mar de fondo por golpes
    float d0 = f*cz/below;
    vec2 wp = vec2(pb.x*d0/f, d0);
    float waveP = seaP.y*(fbm3(vec2(wp.x/22., wp.y/9.) + vec2(S*.35, -S*.9)) - .5)*2.*min(1., below/90.)*decayK;
    float swP = (swell(d0, on0.x, am0.x) + swell(d0, on0.y, am0.y) + swell(d0, on0.z, am0.z) + swell(d0, on0.w, am0.w))*decayK;
    float b2 = max(below + waveP + swP, .5);
    float d = f*cz/b2;
    if (d0 > dEdge) {
      // MAR: isolíneas de log(profundidad) con nivel de detalle (nunca a menos de 13 px)
      float n = log(d)/seaP.x;
      float fw = max(fwidth(n), 1e-5);
      float lod = max(0., log2(fw*13.));
      float L0 = floor(lod), fr = lod - L0;
      float hwS = (1.2 + .2*vnoise(pb/60.) + wob*.4)*wmul;
      float c0 = lineCov(isoDist(n/exp2(L0)), hwS), c1 = lineCov(isoDist(n/exp2(L0 + 1.)), hwS);
      seaC = mix(c0, c1, smoothstep(.55, 1., fr))*smoothstep(2., 10., below);
      // resaca: líneas de papel paralelas a la orilla que suben y bajan
      float lace = (vnoise(pb/7.) - .5)*1.4;
      for (int k = 0; k < 3; k++) {
        float dk = dEdge + .9 + float(k)*float(k + 2)*.85;
        float yk = ybh + f*cz/dk;
        gapC = max(gapC, lineCov(abs(pb.y - yk), (1.8 - float(k)*.25) + lace)*(1. - float(k)*.22));
      }
      gapC = max(gapC, 1. - smoothstep(2.5, 5., (pb.y - (ybh + f*cz/dEdge))*-1.));
      // ECOS: arcos de espuma que repiten el perfil de la punta y avanzan hacia quien mira
      if (echoAmp > 0.) {
        vec2 q = vec2((pb.x - tipB.x)/echoP.x, pb.y - tipB.y);
        float rho = length(q);
        float er = log(1. + rho/echoP.y)/echoP.z;
        float ph = er - echoPhase;
        float dd = isoDist(ph);
        float vis = (1. - smoothstep(echoFront - .6, echoFront, er))*echoAmp*(1. - .45*smoothstep(4., 10., er));
        float gw = echoP.w*.5*(.8 + .25*low);
        float gapE = lineCov(dd, gw)*vis;
        float edgeE = lineCov(abs(dd - gw - 1.9), 1.3)*vis*step(.2, vis);
        gapC = max(gapC, gapE);
        seaC = max(seaC*(1. - gapE), edgeE);
      }
    } else {
      sandC = Sx.b;
    }
  }
  // tiempos de las figuras que se tallan (barco, colonos y bote, O6)
  float hatchOn = step(.01, Dy.g)*smoothstep(tdec(Dy.g) - .01, tdec(Dy.g) + .08, t);
  float coreOn = step(.01, Dy.a)*smoothstep(tdec(Dy.a) - .01, tdec(Dy.a) + .12, t);
  float dmask = step(.003, Sx.a)*smoothstep(20. + 20.*Sx.a - .01, 20. + 20.*Sx.a + .1, t);
  float fig = max(Sx.g, dmask);
  float bg = (1. - fig)*(1. - L.a);
  col = mix(col, cGranite, skyC*skyK*rectK*bg);
  col = mix(col, cSeaD, seaC*(1. - gapC)*rectK*bg);
  col = mix(col, cSand, sandC*bg);
  // tierra
  float lk = (1. - fig)*rectK;
  col = mix(col, cGrass, L.g*lk);
  col = mix(col, cGranite, L.r*lk);
  col = mix(col, cOchre, L.b*lk);
  // figuras
  col = mix(col, cGranite, Sx.r*(1. - dmask*step(.5, Sx.g)*0.));
  col = mix(col, cGranite, max(Dy.r*hatchOn, Dy.b*coreOn));
  o = vec4(col, 1.);
}`;
})();
