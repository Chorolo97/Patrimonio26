/* Capa de objetos rasterizada: cuadriláteros instanciados que solo tocan los píxeles que cubren.
   Personas (sombra + cuerpo), matas de monte, bote, barco y huellas. Dos pases:
   OV (RGBA8, mezcla MAX): r = oclusión del sol, g = hueco de huella, b = borde iluminado de huella.
   OB (RGBA16F, alfa premultiplicado): cuerpos vistos desde arriba. */
(function () {
  const LR = (window.LR = window.LR || {});
  const MAXI = 400, TW = 6;

  LR.makeOverlay = function (G, cfg, atlas, bk) {
    const gl = G.gl, P = cfg.palette, Wd = cfg.world, BG = Wd.big, TB = Wd.tipBake;
    const f = (v) => { const s = String(+(+v).toFixed(6)); return s.includes('.') || s.includes('e') ? s : s + '.0'; };
    const L = (k) => `vec3(${LR.lin(P[k]).map(f).join(',')})`;
    const az = cfg.sun.azimuth * Math.PI / 180, toSun = [Math.sin(az), Math.cos(az)];
    const VS = `#version 300 es
precision highp float; precision highp sampler2D;
uniform sampler2D tI; uniform vec4 uXf; uniform int uFirst;
flat out vec4 v0, v2, v3, v4, v5; out vec2 vW;
void main(){
  int i = gl_InstanceID + uFirst, c = gl_VertexID;
  vec4 a = texelFetch(tI, ivec2(0,i), 0), b = texelFetch(tI, ivec2(1,i), 0);
  v0 = a; v2 = texelFetch(tI, ivec2(2,i), 0); v3 = texelFetch(tI, ivec2(3,i), 0); v4 = texelFetch(tI, ivec2(4,i), 0); v5 = texelFetch(tI, ivec2(5,i), 0);
  vec2 st = vec2(float(c & 1), float(c >> 1))*2. - 1.;
  vec2 W = a.yz + b.xy*st.x + b.zw*st.y;
  vW = W;
  vec2 rel = W - uXf.xy; float th = uXf.w; vec2 RX = vec2(cos(th), -sin(th)), UY = vec2(sin(th), cos(th));
  vec2 sp = vec2(dot(rel,RX), dot(rel,UY))/uXf.z;
  gl_Position = vec4(sp.x/540., sp.y/960., 0., 1.);
}`;
    const FS = `#version 300 es
precision highp float; precision highp sampler2D;
${PBS.GLSL_NOISE}
flat in vec4 v0, v2, v3, v4, v5; in vec2 vW; out vec4 o;
uniform sampler2D tBake, tTip, tAtlas; uniform vec4 uXf; uniform float uE, uEh, uPass, uTipOn;
uniform vec3 uSunC, uSky; uniform float uFar;
const vec2 BIG0 = vec2(${f(BG.x0)},${f(BG.y0)}); const float BIGS = ${f(BG.size)};
const vec2 TIP0 = vec2(${f(TB.cx - TB.size / 2)},${f(TB.cy - TB.size / 2)}); const float TIPS = ${f(TB.size)};
const vec2 TOSUN = vec2(${f(toSun[0])},${f(toSun[1])}); const vec2 SDIR = -TOSUN; const vec2 SPERP = vec2(-SDIR.y, SDIR.x);
const float ACOLS = ${f(atlas.cols)}, AROWS = ${f(atlas.rows)}, AWM = ${f(atlas.WM)}, AHM = ${f(atlas.HM)};
float terrH(vec2 P){ vec2 tq = (P-TIP0)/TIPS; if(uTipOn > 0.5 && max(abs(tq.x-.5), abs(tq.y-.5)) < 0.46) return texture(tTip, tq).r; return texture(tBake, (P-BIG0)/BIGS).r; }
float hullW(float x, float half_, float beam){ return beam*pow(max(1.-pow(abs(x)/half_, 2.2), 0.), 0.55); }
void main(){
  vec2 P = vW; float fp = uXf.z; int type = int(v0.x + 0.5);
  float e = radians(uE); vec3 Ls = vec3(TOSUN*cos(e), sin(e)); float tanE = tan(e), tanEh = tan(radians(uEh));
  vec3 sunC = uSunC, sky = uSky;
  float occ = 0., fDark = 0., fLit = 0.; vec4 body = vec4(0.);
  if(type == 0){ // sombra de persona
    vec4 f0 = v2, f1 = v3, f2 = v4;
    vec2 rel = P - f0.xy; float k = f0.w; float cW = AWM*k, cH = AHM*k;
    float al = dot(rel, SDIR), ac = dot(rel, SPERP);
    float h = terrH(P);
    float v = (al*tanEh + 0.4*(h - f0.z))/cH;
    float u = ac/cW + 0.5; if(f1.w > 0.5) u = 1.-u;
    if(v > 0. && v < 1. && abs(ac) < cW*0.5){
      float lodU = log2(max(fp/cW*128., 1.));
      float vP = v*AHM/f2.w;
      float lod = max(lodU - 1.0, 0.2 + 1.3*v) + 1.5*f2.x*(1.-smoothstep(0.38, 0.5, vP));
      lod = clamp(lod, 0., 4.5);
      float du = 0.25*fp/cW;
      float ca = floor(f1.x+0.5), cb = floor(f1.y+0.5);
      vec2 aA = vec2((mod(ca, ACOLS) + clamp(u,0.02,0.98))/ACOLS, 1. - (floor(ca/ACOLS) + 1. - v)/AROWS);
      vec2 dA = vec2(du/ACOLS, 0.);
      float cov = 0.5*(textureLod(tAtlas, aA-dA, lod).r + textureLod(tAtlas, aA+dA, lod).r);
      vec2 aB = vec2((mod(cb, ACOLS) + clamp(u,0.02,0.98))/ACOLS, 1. - (floor(cb/ACOLS) + 1. - v)/AROWS);
      cov = mix(cov, 0.5*(textureLod(tAtlas, aB-dA, lod).r + textureLod(tAtlas, aB+dA, lod).r), f1.z);
      float soft = 0.16 + 0.12*v;
      occ = smoothstep(0.5-soft, 0.5+soft, cov)*f2.y;
    }
    // sombra de contacto bajo el cuerpo
    occ = max(occ, 0.35*f2.y*(1.-smoothstep(0.2, 0.42, length(rel))));
  } else if(type == 1){ // cuerpo visto desde arriba
    vec4 f2 = v4, f3 = v5; vec2 rel = P - v2.xy;
    float face = f2.z; vec2 fwd = vec2(sin(face), cos(face)), sdv = vec2(fwd.y, -fwd.x);
    vec2 q = vec2(dot(rel, sdv), dot(rel, fwd));
    float sc = f3.x, pose = f3.y, isCol = f3.z;
    vec2 mR = vec2(0.25, 0.15)*sc; vec2 mC = vec2(0.);
    if(pose > 1.5 && pose < 2.5){ mR = vec2(0.24, 0.22)*sc; mC = vec2(0., 0.08)*sc; }
    if(pose > 2.5){ mR = vec2(0.27, 0.26)*sc; mC = vec2(0., 0.06)*sc; }
    vec2 hC = (pose > 1.5 ? vec2(0., 0.2) : vec2(0., 0.03))*sc;
    float hr = (isCol > 0.5 ? 0.225 : 0.105)*sc;
    vec2 dm = (q-mC)/mR; float em = dot(dm,dm);
    vec2 dh = (q-hC)/hr; float eh = dot(dh,dh);
    float aa = fp/0.12;
    float covM = smoothstep(1.+aa, 1.-aa, em), covH = smoothstep(1.+aa*1.5, 1.-aa*1.5, eh);
    vec3 nm = normalize(vec3(dm*0.8, sqrt(max(0.,1.-em))+0.25)), nh = normalize(vec3(dh*0.9, sqrt(max(0.,1.-eh))+0.2));
    vec3 aM = isCol > 0.5 ? ${L('jacket')} : ${L('hide')};
    vec3 aH = isCol > 0.5 ? ${L('hat')} : ${L('hair')};
    float lt = f2.y;
    vec3 cM = aM*(sunC*1.9*max(dot(nm, Ls)+0.18,0.)*lt + sky*0.85);
    vec3 cH = aH*(sunC*1.7*max(dot(nh, Ls)+0.1,0.)*lt + sky*0.65);
    if(isCol > 0.5){ float crown = smoothstep(0.5, 0.3, sqrt(eh)); cH = mix(cH, ${L('hat')}*1.4*(sunC*1.2*max(dot(nh,Ls),0.)*lt + sky*0.7), crown); }
    vec3 c = mix(cM, cH, covH);
    float a = max(covM, covH);
    body = vec4(c*a, a);
  } else if(type == 2){ // mata de monte: copa lobulada + sombra larga ahusada
    vec2 cc = v2.xy; float rad = v2.z, hh = v2.w, sd0 = v3.x, lt = v3.y;
    vec2 q = vec2(dot(P-cc, TOSUN), dot(P-cc, SPERP));
    float lob = vnoise(P*2.2/rad + sd0*7.);
    float wob = (vnoise(P*1.3 + sd0)-0.5)*0.55 + (lob-0.5)*0.3;
    float dq2 = length(q)/rad + wob;
    float leaf = vnoise(P*7.+sd0) + 0.5*vnoise(P*15.);
    if(dq2 < 1.){
      float z = sqrt(max(0.,1.-dq2*dq2));
      vec3 nn = normalize(vec3(q.x/rad*0.9, -q.y/rad*0.9, z+0.25) + vec3((vec2(vnoise(P*5.), vnoise(P*5.+3.))-0.5)*1.2, 0.));
      nn = normalize(vec3(TOSUN*nn.x + SPERP*(-nn.y), nn.z));
      float lb = max(dot(nn, Ls),0.)*(0.6+0.5*leaf);
      vec3 mc = mix(${L('monteA')}, ${L('monteB')}, fract(sd0*3.7)*0.6 + (leaf-0.7)*0.5);
      vec3 c = mc*(sunC*lb*lt*1.2 + sky*(0.3+0.3*z)*(0.6+0.4*leaf));
      float a = smoothstep(1., 0.8, dq2);
      body = vec4(c*a, a);
    }
    float Lcap = min(hh/max(tanE, 0.005), 9.*rad);
    float sl = -q.x, Lt = Lcap + rad, sx = sl/Lt;
    if(sl > 0. && sx < 1.){
      float wdt = rad*0.9*sqrt(max(0., 1.-sx*sx)) + (vnoise(vec2(sl*1.3, sd0*3.1))-0.5)*0.4*rad;
      float pen = 0.25 + sl*0.012;
      occ = (1.-smoothstep(wdt-pen, wdt+pen, abs(q.y)))*(1.-smoothstep(0.85, 1., sx))*lt*mix(1., 0.5, uFar);
    }
  } else if(type == 3){ // bote varado (5 m)
    vec2 sc = v2.xy; float hd = v2.z; float lt = v2.w; vec2 fw = vec2(sin(hd), cos(hd)), sd = vec2(fw.y, -fw.x);
    for(int k=0;k<14;k++){ float s = (float(k)+0.5)/14.*0.35/tanE; vec2 q = P - sc - SDIR*s; float x = dot(q,fw), y = dot(q,sd);
      float hw = hullW(x, 2.5, 0.75); occ = max(occ, smoothstep(0.03, -0.03, abs(y)-hw)*step(abs(x),2.5)); }
    occ = min(occ, 1.)*lt*0.95;
    vec2 q = P - sc; float x = dot(q,fw), y = dot(q,sd);
    float hw = hullW(x, 2.5, 0.75);
    float cov = smoothstep(hw+0.5*fp, hw-0.5*fp, abs(y))*step(abs(x),2.5);
    float gun = smoothstep(hw-0.14, hw-0.07, abs(y));
    float thwart = step(abs(fract((x+0.35)/1.1)-0.5), 0.07)*step(abs(x),1.8);
    vec3 c = mix(${L('hull')}*0.55, ${L('deck')}*0.95, max(gun, thwart*0.9));
    float sideLit = smoothstep(-0.2, 0.3, sign(y)*dot(TOSUN, sd));
    c *= sunC*lt*(0.25 + 0.6*gun*sideLit + 0.3*thwart) + sky*0.8;
    body = vec4(c*cov, cov);
  } else if(type == 4){ // barco fondeado: casco 18×5, dos palos, velas aferradas, sin banderas
    vec2 sc = v2.xy; float hd = v2.z; float lt = v2.w; vec2 fw = vec2(sin(hd), cos(hd)), sd = vec2(fw.y, -fw.x);
    float roll = v3.x;
    for(int k=0;k<8;k++){ float s = (float(k)+0.5)/8.*1.6/tanE; vec2 q = P - sc - SDIR*s; float x = dot(q,fw), y = dot(q,sd);
      occ = max(occ, smoothstep(0.1, -0.1, abs(y)-hullW(x, 9., 2.5))*step(abs(x),9.)); }
    for(int m=0;m<2;m++){ vec2 mb = sc + fw*(m==0? 3.8 : -1.6); float mh = m==0? v3.z : v3.w;
      vec2 top = mb + sd*roll*mh + SDIR*(mh/tanE);
      vec2 pa = P-mb, ba = top-mb; float t = clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float dd = length(pa-ba*t);
      float wdt = max(mix(0.26, 0.15, t), 1.4*fp);
      occ = max(occ, (1.-smoothstep(wdt-0.4*fp, wdt+0.6*fp, dd))*(1.-t*0.15));
      vec2 b0 = mb + SDIR*(2.2/tanE), b1 = mb - fw*5. + SDIR*(2.0/tanE);
      pa = P-b0; ba = b1-b0; t = clamp(dot(pa,ba)/dot(ba,ba),0.,1.); dd = length(pa-ba*t);
      occ = max(occ, 1.-smoothstep(0.28, 0.28+fp, dd));
    }
    { vec2 bow = sc + fw*12.5 + SDIR*(1.8/tanE), mtop = sc + fw*3.8 + sd*roll*v3.z + SDIR*(v3.z/tanE);
      vec2 pa = P-bow, ba = mtop-bow; float t = clamp(dot(pa,ba)/dot(ba,ba),0.,1.); float dd = length(pa-ba*t);
      occ = max(occ, 0.5*(1.-smoothstep(0.06, 0.06+fp, dd))); }
    occ = min(occ,1.)*lt*0.95;
    vec2 q = P - sc; float x = dot(q,fw), y = dot(q,sd);
    float hw = hullW(x, 9., 2.5);
    float cov = smoothstep(hw+0.5*fp, hw-0.5*fp, abs(y))*step(abs(x),9.);
    float rail = smoothstep(hw-0.35, hw-0.2, abs(y));
    float planks = 0.85 + 0.15*step(0.5, fract(y/0.32));
    vec3 c = mix(${L('deck')}*planks, ${L('hull')}, rail);
    c = mix(c, ${L('hull')}*0.6, step(abs(x-0.8),1.1)*step(abs(y),0.9));
    float lL = 0.3 + 0.55*rail*smoothstep(-0.2, 0.3, sign(y)*dot(TOSUN, sd));
    c *= sunC*lL*lt*0.9 + sky*0.9;
    for(int m=0;m<2;m++){ float mx = m==0? 3.8 : -1.6; float bx = x - mx;
      if(bx < 0.3 && bx > -5.2 && abs(y) < 0.3){ vec3 s2 = ${L('sail')}*(sunC*0.6*lt*(0.6+0.4*smoothstep(-0.3,0.3,y*sign(dot(TOSUN,sd)))) + sky*0.9); c = mix(c, s2, smoothstep(0.3,0.18,abs(y))); }
      if(length(vec2(bx, y)) < 0.28) c = ${L('hull')}*0.5*(sky*0.8); }
    { float t = clamp((x-8.8)/4., 0., 1.); float dd = length(vec2(x - mix(8.8, 12.8, t), y));
      float bc = 1.-smoothstep(0.1, 0.1+fp, dd); c = mix(c, ${L('hull')}*sky*0.8, bc*(1.-cov)); cov = max(cov, bc); }
    body = vec4(c*cov, cov);
  } else if(type == 5){ // huella genérica: óvalo con microsombra, sin dedos ni talón
    vec2 c = v2.xy, dir = v2.zw; vec2 pr = vec2(-dir.y, dir.x);
    vec2 q = P - c; vec2 ql = vec2(dot(q,dir)/v3.x, dot(q,pr)/v3.y);
    float dd = length(ql) + (vnoise(P*25.)-0.5)*0.2;
    float inside = 1.-smoothstep(0.85,1.05,dd);
    float w = dot(normalize(q+1e-4), TOSUN);
    fDark = inside*smoothstep(-0.55,-0.1,w)*v3.w;
    fLit = max(inside*smoothstep(-0.45,-0.85,w), (smoothstep(0.95,1.1,dd)-smoothstep(1.1,1.35,dd))*smoothstep(0.2,0.7,w)*0.6)*v3.w;
  }
  if(uPass < 0.5) o = vec4(occ, fDark, fLit, 0.); else o = body;
}`;
    // compilar con nuestro propio VS
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    const U = {}; const loc = (n) => (n in U ? U[n] : (U[n] = gl.getUniformLocation(pr, n)));
    const data = new Float32Array(TW * MAXI * 4);
    const tI = LR.tex(G, TW, MAXI, { fmt: 'f32', filter: 'nearest' });
    const OV = LR.target(G, cfg.width, cfg.height, { fmt: 'u8', filter: 'nearest' });
    const OB = LR.target(G, cfg.width, cfg.height, { fmt: 'f16', filter: 'nearest' });

    // lista de instancias del cuadro
    let n = 0;
    const list = { ov: [], ob: [] };
    let XF = null; const box = [0, 0, 0, 0];
    function add(pass, type, o, a, b, p2, p3, p4, p5) {
      if (n >= MAXI) return;
      if (XF) for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const wx = o[0] + a[0] * sx + b[0] * sy - XF.cx, wy = o[1] + a[1] * sx + b[1] * sy - XF.cy;
        const px = 540 + (wx * XF.RX[0] + wy * XF.RX[1]) / XF.mpp, py = 960 - (wx * XF.UY[0] + wy * XF.UY[1]) / XF.mpp;
        box[0] = Math.min(box[0], px); box[1] = Math.min(box[1], py); box[2] = Math.max(box[2], px); box[3] = Math.max(box[3], py);
      }
      const k = n * TW * 4;
      data.set([type, o[0], o[1], 0], k); data.set([a[0], a[1], b[0], b[1]], k + 4);
      data.set(p2 || [0, 0, 0, 0], k + 8); data.set(p3 || [0, 0, 0, 0], k + 12); data.set(p4 || [0, 0, 0, 0], k + 16); data.set(p5 || [0, 0, 0, 0], k + 20);
      list[pass].push(n); n++;
    }
    function begin(X) { n = 0; list.ov.length = 0; list.ob.length = 0; XF = X; box[0] = box[1] = 1e9; box[2] = box[3] = -1e9; }
    // caja de pantalla (x0, y0 desde arriba, x1, y1) recortada al cuadro y ensanchada 2 px
    function screenBox() { return [Math.max(0, Math.floor(box[0]) - 2), Math.max(0, Math.floor(box[1]) - 2), Math.min(cfg.width, Math.ceil(box[2]) + 2), Math.min(cfg.height, Math.ceil(box[3]) + 2)]; }

    function draw(U0) {
      gl.bindTexture(gl.TEXTURE_2D, tI);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TW, Math.max(1, n), gl.RGBA, gl.FLOAT, data, 0);
      gl.useProgram(pr);
      gl.disableVertexAttribArray(0);
      const bindT = (name, tex, unit) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(loc(name), unit); };
      bindT('tI', tI, 0); bindT('tBake', bk.big.tex, 1); bindT('tTip', bk.tip.tex, 2); bindT('tAtlas', atlas.tex, 3);
      gl.uniform4fv(loc('uXf'), U0.uXf); gl.uniform1f(loc('uE'), U0.uE); gl.uniform1f(loc('uEh'), U0.uEh); gl.uniform1f(loc('uTipOn'), U0.tip);
      gl.uniform3fv(loc('uSunC'), U0.sunC); gl.uniform3fv(loc('uSky'), U0.sky); gl.uniform1f(loc('uFar'), U0.far || 0);
      gl.viewport(0, 0, cfg.width, cfg.height);
      const sb = screenBox();
      if (n === 0 || sb[2] <= sb[0] || sb[3] <= sb[1]) { gl.activeTexture(gl.TEXTURE0); return; }
      gl.enable(gl.SCISSOR_TEST); gl.scissor(sb[0], cfg.height - sb[3], sb[2] - sb[0], sb[3] - sb[1]);
      gl.enable(gl.BLEND);
      for (const pass of ['ov', 'ob']) {
        const T = pass === 'ov' ? OV : OB;
        gl.bindFramebuffer(gl.FRAMEBUFFER, T.fb);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        if (pass === 'ov') { gl.blendEquation(gl.MAX); gl.blendFunc(gl.ONE, gl.ONE); }
        else { gl.blendEquation(gl.FUNC_ADD); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
        gl.uniform1f(loc('uPass'), pass === 'ov' ? 0 : 1);
        // dibujar tramos contiguos de instancias de este pase
        const ids = list[pass]; let i = 0;
        while (i < ids.length) {
          let j = i; while (j + 1 < ids.length && ids[j + 1] === ids[j] + 1) j++;
          drawRange(ids[i], j - i + 1);
          i = j + 1;
        }
      }
      gl.disable(gl.BLEND); gl.blendEquation(gl.FUNC_ADD); gl.disable(gl.SCISSOR_TEST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.activeTexture(gl.TEXTURE0);
    }
    function drawRange(first, count) { if (count > 0) { gl.uniform1i(loc('uFirst'), first); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count); } }
    return { begin, add, draw, OV, OB, count: () => n, screenBox };
  };
})();
