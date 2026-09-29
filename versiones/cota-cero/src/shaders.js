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

  // Ruido fijo precalculado (una vez, en el inicio): pantalla (diente, sangrado, encaje, deformación) y búfer oblicuo
  SH.noiseScreen = SH.common + `
void main(){ vec2 px = pxOf(uv); o = vec4(clamp(tooth(px)*.5 + .5, 0., 1.), vnoise(px/9.), vnoise(px/7. + 3.), vnoise(px/70.)); }`;
  SH.noiseBuf = SH.common + `
uniform float BH;
void main(){ vec2 pb = vec2(uv.x*1080., (1. - uv.y)*BH); o = vec4(vnoise(pb/9.), vnoise(pb/7.), vnoise(pb/60.), vnoise(pb*vec2(1./240., 1./40.))); }`;

  // ---------------- PLANTA ----------------
  SH.plan = SH.common + `
uniform sampler2D bake, aux, hach, nzS;
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

float rgap(float r, float ti, float A){
  float dt = t - ti; if (dt <= 0. || dt > 7.) return 0.;
  float hw = (A > 5. ? 5.8 : 2.4)*exp(-dt/5.);
  return lineCov(abs(r - 170.*dt), hw)*step(1.1, hw);
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
  vec4 NS = texture(nzS, uv);
  float wob = (NS.g - .5)*.7;                      // sangrado fijo ±0,35 px

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
    seaHW = (mix(1.25, 1.12, day) + .15*vnoise(w/90.) + wob*.5)*wmul;
  }
  float rP2 = length(P - tipPx);
  float onGap = day > .5 ? max(max(max(rgap(rP2, on0.x, am0.x), rgap(rP2, on0.y, am0.y)), max(rgap(rP2, on0.z, am0.z), rgap(rP2, on0.w, am0.w))),
                              max(max(rgap(rP2, on1.x, am1.x), rgap(rP2, on1.y, am1.y)), max(rgap(rP2, on1.z, am1.z), rgap(rP2, on1.w, am1.w)))) : 0.;
  float seaL = lineCov(isoDist(psi), seaHW);
  seaL *= smoothstep(3.5, 7.5, Dpx);               // la tinta del mar se detiene antes de la costa

  // ---- espuma: anillos = isolíneas de la distancia a la costa ----
  float dTip = length(w - vec2(${'${TIPX}'}, ${'${TIPY}'}));
  float Dmax = 150.*(.16 + .84*exp(-dTip/480.))*mix(.62, 1., ringOpen);
  float phi = (150./11.)*log((25. + 11.*D/150.)/25.);
  float drift = S*.42;
  float ringD = isoDist(phi - drift);
  float ringA = step(4., D)*step(D, Dmax);
  float ringTaper = 1. - smoothstep(Dmax*.55, Dmax, D);
  float edgeF = mix(1./26., 1./9., cen);
  float lace = 0.;
  if (day > .5 && D > 0. && D < 160.) lace = (vnoise(px*edgeF) - .5)*1.8;
  float ringHW = mix(1.15, 2.8, day)*(.85 + .35*low) + day*lace*.5;
  float ring = lineCov(ringD, ringHW*ringTaper)*ringA;
  // cota cero: de noche un corte de espuma de 5–6 px con borde de encaje roto hacia el mar; de día la línea de agua en tinta
  float laceC = (vnoise(px*mix(1./10., 1./6., cen)) - .5)*2.;
  float coastN = max(lineCov(abs(Dpx - .6), 1.7*wmul + wob*.3), step(1.5, Dpx)*step(Dpx, 4.2 + 2.2*laceC)*step(.34, NS.b));
  float cliffRim = 0.;
  if (day < .5 && abs(Dpx) < 6.) cliffRim = smoothstep(.4, .7, texture(bake, bu + vec2(.0022, 0.)).g)*lineCov(abs(Dpx + .4), 2.);
  float coast = day > .5 ? lineCov(abs(Dpx), 1.3*wmul + wob*.4) : max(coastN, cliffRim);

  // ---- tierra ----
  float land = smoothstep(-.05, .15, h);
  float F = h/5.;
  float fwF = fwidth(F);
  float Lr = floor(F + .5);
  float major = 1. - step(.5, abs(mod(Lr, 5.)));
  // curvas: menores (5 m) solo donde el terreno es suave; en laderas con hachuras quedan las mayores (25 m)
  float cHW = (mix(1.15, 1.3, day) + .45*major)*wmul + wob*.5;
  // en las laderas con hachuras no hay curvas (ni las mayores): la masa del relieve la llevan las hachuras
  float minorK = mix(1. - smoothstep(.018, .034, fwF), 1. - smoothstep(.03, .05, fwF), major);
  float kW = minorK * (1. - smoothstep(.12, .19, fwF)) * (1. - smoothstep(.45, .8, rock));
  float cont = lineCov(isoDist(F), cHW*kW - (1. - kW)*.6)*step(.5, Lr)*land;
  // lomas tierra adentro: curvas intermedias (2,5 m) donde el terreno es bajo y suave, para que la pradera quede grabada
  float lomK = smoothstep(1000., 1350., w.y)*(1. - smoothstep(22., 30., h))*(1. - smoothstep(.02, .035, fwF))*(1. - rock);
  float Fh2 = h/2.5;
  float half2 = step(.5, abs(mod(floor(Fh2 + .5), 2.)));   // solo las impares (las pares ya son curvas de 5 m)
  cont = max(cont, lineCov(isoDist(Fh2), (1.1 + .15*day)*wmul*lomK + wob*.4 - (1. - lomK)*1.2)*half2*step(1.5, Fh2)*land);
  float rev = A.b;
  cont *= smoothstep(rev, rev + .05, t)*landOn;
  float bandOn = smoothstep(h - 2., h + 2., E)*landOn;
  float hachC = Hc.r*bandOn*land;
  float sandC = Hc.b*step(-2., h);                  // la arena se corta junto con la costa, desde el cuadro 0
  float trailC = Hc.g*step(Hc.a, trailProg + .001)*step(.001, trailProg);

  vec3 col;
  if (day < .5) {
    col = cPlate*(1. + toothAmt*(NS.r*2. - 1.));
    col = mix(col, cSea, seaL*(1. - ring)*(1. - land));
    col = mix(col, cFoam, max(ring, coast)*(1. - land*.0));
    col = mix(col, cLand*.93, sandC*.9);
    col = mix(col, cLand, max(cont, hachC));
    col = mix(col, cTrail, trailC);
  } else {
    col = cPaper*(1. + grainAmt*(NS.r*2. - 1.))*(1. - toneAmt);
    float gap = ring;                                // la espuma es papel
    col = mix(col, cSeaD, seaL*(1. - max(gap, onGap))*(1. - land));
    col = mix(col, cGranite, coast*.9);
    col = mix(col, mix(cSand, cGranite, step(dTip, 110.)), sandC);
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
uniform sampler2D gro, nzS;
uniform vec2 zc; uniform float zoom, shim, boneMul, t;
uniform vec3 cPlate, cLand, cFoam; uniform float toothAmt;
void main(){
  vec2 px = pxOf(uv);
  vec2 P = zc + (px - zc)/zoom;
  vec4 g = texture(gro, vec2(P.x/1080., 1. - P.y/1920.));
  float s = clamp(.5 + shim*(vnoise(P/340. + vec2(t*.05, 0.)) - .5)*2., 0., 1.);
  float stroke = mix(g.r, g.g, s);
  vec3 col = cPlate*(1. + toothAmt*(texture(nzS, uv).r*2. - 1.));
  vec3 bone = cLand*boneMul;
  col = mix(col, bone*.94, g.b);
  col = mix(col, bone, stroke);
  col = mix(col, cFoam*boneMul, g.a);
  o = vec4(col, 1.);
}`;

  // Composición por frente: A delante del borde, B detrás. El borde es un frente grabado: tres octavas de ruido (mordido irregular),
  // una ondulación larga, máscara dura (las dos capas quedan nítidas), línea de ancho variable y, opcional, rebaba punteada delante.
  SH.front = SH.common + `
uniform sampler2D ta, tb;
uniform vec2 dir; uniform float pos, lineW, seed;
uniform vec4 oct;    // amplitud gruesa, escala gruesa, amplitud media, escala media (px)
uniform vec4 oct2;   // amplitud fina, escala fina, amplitud de la onda larga, periodo de la onda
uniform vec3 lineCol;
uniform float burr;  // ancho de la banda de rebaba (px) delante del borde; 0 = sin rebaba
float edgeF(vec2 px){
  vec2 nd = vec2(-dir.y, dir.x);
  float s = dot(px, nd);
  return dot(px, dir)
    + oct.x*(fbm3(vec2(s/oct.y, seed)) - .5)*2.
    + oct.z*(fbm3(px/oct.w + seed*3.) - .5)*2.
    + oct2.x*(vnoise(px/oct2.y + seed*5.) - .5)*2.
    + oct2.z*sin(s/oct2.w + seed);
}
void main(){
  vec2 px = pxOf(uv);
  float f = edgeF(px);
  float gpx = max(length(vec2(dFdx(f), dFdy(f))), 1e-4);
  float dd = (f - pos)/gpx;                                 // px con signo: + = todavía delante del frente (capa A)
  float m = smoothstep(-1.2, 1.2, dd);
  vec3 a = texture(ta, uv).rgb, b = texture(tb, uv).rgb;
  vec3 col = mix(b, a, m);
  // línea que cabalga el borde: ancho ±1 px con ruido fijo, pocas mellas
  float lw = lineW*.5 + (vnoise(px/23. + seed) - .5)*1. ;
  float nick = step(.12, vnoise(px/9. + seed*2.));
  col = mix(col, lineCol, lineCov(abs(dd), max(lw, 1.1))*step(.5, lineW)*nick);
  // rebaba: puntos ocres fijos delante del borde, cada vez más ralos
  if (burr > 0. && dd > 2. && dd < burr + 4.) {
    vec2 cell = floor(px/7.);
    vec2 jit = vec2(hash21(cell), hash21(cell + 17.3));
    vec2 c = (cell + .2 + .6*jit)*7.;
    float dens = 1. - (dd - 2.)/burr;
    float on = step(hash21(cell + 5.1), dens*dens*.9);
    float r = 1.3 + .5*hash21(cell + 9.7);
    col = mix(col, lineCol, clamp(r - length(px - c) + .5, 0., 1.)*on);
  }
  o = vec4(col, 1.);
}`;
})();

/* ---------------- OBLICUA (día) ---------------- */
(function () {
  const SH = window.CC_SH;
  SH.oblique = (waterGLSL) => SH.common + `
uniform sampler2D land, stat, dyn, nzS, nzB;
uniform float yOff, ybh, BH, f, cz, t, S, low, wmul, echoFront, echoPhase, echoAmp, echoLeft, echoT0, swash, closeK, clearK, decayK;
uniform vec2 tipB;
uniform vec4 shipBox; uniform float shipBob;
uniform vec4 on0, am0;
uniform vec4 clr;    // cierre: centro x, y del bloque; borde inferior del papel limpio; radio de esquina
uniform vec3 cPaper, cGranite, cGrass, cSand, cSeaD, cOchre;
uniform float grainAmt, toneAmt;
uniform vec4 skyP;   // spacing, topW, -, -
uniform vec4 seaP;   // dlog, waveAmp, -, swellFrom
uniform vec4 echoP;  // aspect, rho0, lambda, gap
${waterGLSL}
float tdec(float v){ return 20. + 20.*(v*255. - 1.)/254.; }
float swell(float d, float ti, float A){
  float dt = t - ti; if (dt <= 0. || dt > 6.) return 0.;
  float ds = seaP.w - 40.*dt; if (ds < 12.) return 0.;
  float x = (d - ds)/(ds*.16);
  return A*exp(-dt/2.2)*exp(-x*x)*sin(x*2.2);
}
float sdRBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
void main(){
  vec2 px = pxOf(uv);
  vec2 pb = vec2(px.x, px.y + yOff);
  vec2 pbs = pb;
  if (pb.x > shipBox.x && pb.x < shipBox.z && pb.y > shipBox.y && pb.y < shipBox.w) pbs.y -= shipBob;
  vec2 tu = vec2(pb.x/1080., 1. - pb.y/BH);
  vec4 L = texture(land, tu);
  vec4 Sx = texture(stat, tu);
  vec4 Dy = texture(dyn, vec2(pbs.x/1080., 1. - pbs.y/BH));
  vec4 NS = texture(nzS, uv), NB = texture(nzB, tu);
  float wob = (NB.r - .5)*.7;
  // cierre: el cielo rayado se acorta desde el centro del bloque hacia afuera (nunca se agrisa); abajo, borde orgánico
  float warp = (NS.a - .5)*26.;
  // cada raya del cielo se retira desde el centro del bloque hacia sus dos puntas (largo desparejo por raya)
  float lineId = floor(pb.y/skyP.x + .5);
  float reach = clearK*760. + (hash21(vec2(lineId, 7.)) - .5)*140.*clearK - abs(px.y - clr.y)*.35*(1. - clearK);
  float clearIn = step(abs(px.x - clr.x), reach)*step(px.y + warp*.6, clr.z)*step(.001, clearK);
  vec3 col = cPaper*(1. + grainAmt*(NS.r*2. - 1.))*(1. - toneAmt);

  float below = pb.y - ybh;
  float skyC = 0., seaC = 0., gapC = 0., sandC = 0., edgeC = 0.;
  if (below <= 0.) {
    // CIELO: rayado fino que adelgaza hasta el horizonte y en el resplandor detrás de la sierra; tres bandas de nube
    float above = ybh - pb.y;
    float fromTop = clamp(above/760., 0., 1.);
    float c1 = exp(-pow((above - 560. + 20.*sin(pb.x/310. + 1.))/70., 2.));
    float c2 = .9*exp(-pow((above - 300. + 16.*sin(pb.x/260. + 4.))/55., 2.));
    float c3 = exp(-pow((above - 860. + .26*pb.x + 14.*sin(pb.x/200.))/60., 2.));
    float cl = c1 + c2 + c3;
    float glow = 1. - exp(-pow(length((vec2(pb.x, above) - vec2(120., 380.))/vec2(520., 300.)), 2.));
    float hw = (skyP.y*.5*pow(fromTop, 1.1)*mix(.35, 1., glow) + 1.2*cl*(NB.a - .38)*2.)*wmul;
    skyC = lineCov(abs(fract(pb.y/skyP.x + .5) - .5)*skyP.x, max(0., hw + wob*.3*fromTop))*smoothstep(0., 40., above)*(1. - clearIn);
  } else {
    float dw = waterD(pb.x);
    float sw = swash;
    float dEdge = dw - .35*sw;
    // desplazamientos del mar: olas (fase del mar) y mar de fondo por golpes; casi quietos junto al horizonte
    float d0 = f*cz/below;
    vec2 wp = vec2(pb.x*d0/f, d0);
    float nearH = smoothstep(20., 120., below);
    float waveP = seaP.y*(fbm3(vec2(wp.x/22., wp.y/9.) + vec2(S*.35, -S*.9)) - .5)*2.*nearH*decayK;
    float swP = (swell(d0, on0.x, am0.x) + swell(d0, on0.y, am0.y) + swell(d0, on0.z, am0.z) + swell(d0, on0.w, am0.w))*decayK*nearH;
    float b2 = max(below + waveP + swP, .5);
    float d = f*cz/b2;
    float yEdge = ybh + f*cz/dEdge;
    if (d0 > dEdge) {
      // MAR: isolíneas de log(profundidad) con nivel de detalle (nunca a menos de 13 px; la primera a ≥ 13 px del horizonte)
      float n = log(d)/seaP.x;
      float fw = max(fwidth(n), 1e-5);
      float lod = max(0., log2(fw*13.));
      float L0 = floor(lod), fr = lod - L0;
      float hwS = (1.2 + .2*NB.b + wob*.4)*wmul;
      float c0 = lineCov(isoDist(n/exp2(L0)), hwS), c1 = lineCov(isoDist(n/exp2(L0 + 1.)), hwS);
      seaC = mix(c0, c1, smoothstep(.35, .65, fr))*step(13., below)*step(3., yEdge - pb.y);
      // orilla: línea de agua (tinta de mar) y resaca en papel, con bordes de encaje, siguiendo la curva de la playa
      float lace = (NB.g - .5)*2.2;
      float brk = step(.2, vnoise(vec2(pb.x/23., 3.)));
      for (int k = 0; k < 3; k++) {
        float dk = dEdge + .5 + float(k)*(.9 + .45*float(k));
        float yk = ybh + f*cz/dk;
        gapC = max(gapC, lineCov(abs(pb.y - yk), (2.6 - float(k)*.35) + lace*.6)*mix(1., brk, float(k)*.5));
      }
      // ECOS: la sierra se vuelve espuma. Curvas que repiten el contorno de la punta (flanco bajo la pared + extremo),
      // se abren desde la punta hacia quien mira; papel con filo de granito del lado del mar.
      if (echoAmp > 0.) {
        vec2 q = pb - tipB;
        float qy = max(q.y, 0.);
        float rho = q.x < 0. ? qy : length(vec2(q.x/echoP.x, qy));
        float er = log(1. + rho/echoP.y)/echoP.z;
        float ph = er - echoPhase;
        float fwp = max(fwidth(ph), 1e-5);
        float sdp = (fract(ph + .5) - .5)/fwp;
        float ring = floor(ph + .5);
        // a lo largo del eco: 0 en el horizonte junto a la punta → 1 bajo la punta → 2 bajo la pared
        float leftEnd = echoLeft*(.45 + .55*min(1., er/4.)) + (vnoise(vec2(ring*3.1, 2.)) - .5)*70.;
        float along = q.x >= 0. ? atan(qy, q.x/echoP.x)/1.5708 : 1. + (-q.x)/leftEnd;
        // buril: cada eco nuevo se corta desde la punta hacia afuera en 0,4 s
        float cutU = (t - (echoT0 + echoFront*er))/.2;
        float vis = step(along, cutU)*step(along, 2.)*echoAmp;
        float thin = (1. - .2*clamp(er - 4.5, 0., 3.))*(q.x < 0. ? clamp((leftEnd + q.x)/90., 0., 1.) : 1.);
        // línea de granito (la misma tinta que la pared) con un halo de papel que corta el rayado del mar
        float inkE = lineCov(abs(sdp), (2.1 + .25*low)*thin + wob*.3)*vis;
        float haloE = lineCov(abs(sdp), (echoP.w*.5 + 1.8)*thin)*vis;
        // cota cero: la orilla de la punta es el primer eco (siempre tallada desde que empiezan)
        float coast0 = lineCov(qy, 1.6)*step(-leftEnd*.8, q.x)*step(q.x, 4.)*step(along, cutU + 2.)*echoAmp;
        gapC = max(gapC, haloE);
        edgeC = max(edgeC, max(inkE, coast0));
        seaC *= 1. - haloE;
      }
    } else {
      sandC = Sx.b;
      // borde mojado: línea fina de tinta de mar en la línea de agua
      edgeC = 0.;
      gapC = 0.;
      seaC = lineCov(abs(pb.y - yEdge + 1.5), 1.1 + wob*.3)*step(.25, vnoise(vec2(pb.x/31., 7.)));
    }
  }
  // tiempos de las figuras que se tallan (barco, colonos y bote, O6)
  float hatchOn = step(.01, Dy.g)*smoothstep(tdec(Dy.g) - .01, tdec(Dy.g) + .08, t);
  float coreOn = step(.01, Dy.a)*smoothstep(tdec(Dy.a) - .01, tdec(Dy.a) + .12, t);
  float dmask = step(.003, Sx.a)*smoothstep(20. + 20.*Sx.a - .01, 20. + 20.*Sx.a + .1, t);
  float fig = max(Sx.g, dmask);
  float bg = (1. - fig)*(1. - L.a);
  col = mix(col, cGranite, skyC*bg);
  col = mix(col, cSeaD, seaC*(1. - gapC)*bg);
  col = mix(col, cSand, sandC*bg);
  col = mix(col, cGranite, edgeC*bg);
  // tierra
  float lk = 1. - fig;
  col = mix(col, cGrass, L.g*lk);
  col = mix(col, cGranite, L.r*lk);
  col = mix(col, cOchre, L.b*lk);
  // figuras
  col = mix(col, cGranite, Sx.r);
  col = mix(col, cGranite, max(Dy.r*hatchOn, Dy.b*coreOn));
  o = vec4(col, 1.);
}`;
})();
