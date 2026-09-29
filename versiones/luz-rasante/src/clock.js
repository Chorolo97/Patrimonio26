/* Reloj del alba y demás mapeos de audio. Todo precalculado al iniciar; las consultas son funciones puras de t. */
(function () {
  const LR = (window.LR = window.LR || {});

  LR.makeClock = function (cfg, a) {
    const N = 1200, fps = 30, C = cfg.clock, S = cfg.sun;
    const missing = !!a.missing || !a.rmsSmooth;
    const arr = (k, def) => (missing || !a[k] ? new Float32Array(N).fill(def) : Float32Array.from(a[k]));
    const rms = arr('rmsSmooth', 0.5), low = arr('lowSmooth', 0.4), high = arr('highSmooth', 0.3), voice = arr('voiceSmooth', 0.5), cen = arr('centroidSmooth', 0.5);
    const flux = arr('flux', 0);
    const gate = (t) => {
      const [g0, g1] = C.gate, r = C.ramp;
      const inside = Math.min(PBS.smooth((t - g0) / r), PBS.smooth((g1 - t) / r));
      return 1 - (1 - C.gateFloor) * inside;
    };
    // prefijos (valor en el cuadro i = suma de 0..i-1)
    const D = new Float64Array(N + 1), Sp = new Float64Array(N + 1);
    for (let i = 0; i < N; i++) {
      const t = i / fps;
      D[i + 1] = D[i] + (missing ? 1 : gate(t) * (C.base + C.gain * rms[i]));
      Sp[i + 1] = Sp[i] + (0.3 + low[i]) / fps;
    }
    const Dn = D[N];
    for (let i = 0; i <= N; i++) D[i] /= Dn;
    const interp = (P, t) => { const f = PBS.clamp(t * fps, 0, N), i = Math.min(N - 1, Math.floor(f)), u = f - i; return P[i] * (1 - u) + P[i + 1] * u; };
    const at = (A, t) => { const f = PBS.clamp(t * fps, 0, N - 1), i = Math.floor(f), u = f - i; return A[i] * (1 - u) + A[Math.min(N - 1, i + 1)] * u; };
    // centroide promediado 2 s (tabla)
    const cen2 = new Float32Array(N);
    for (let i = 0; i < N; i++) { let s = 0, n = 0; for (let k = -30; k <= 30; k++) { const j = i + k; if (j >= 0 && j < N) { s += cen[j]; n++; } } cen2[i] = s / n; }
    // golpes: máximos locales de flux > umbral separados >= minGap
    const onsets = [];
    if (!missing) {
      for (let i = 1; i < N - 1; i++) {
        if (flux[i] > cfg.onsets.threshold && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1]) {
          const t = i / fps;
          if (!onsets.length || t - onsets[onsets.length - 1] >= cfg.onsets.minGap) onsets.push(t);
        }
      }
    } else onsets.push(1.7, 4.97, 7.03, 10.53, 15.07, 15.67, 18.77, 19.9, 22.23, 27.3, 30.63, 37.8, 38.53);
    const D_at = (t) => interp(D, t);
    const elev = (t) => S.e0 + (S.e1 - S.e0) * D_at(t);
    // pulso tras cada golpe (decae en ~0.9 s)
    const pulse = (t, tau = 0.5, from = -1, to = 99) => { let p = 0; for (const o of onsets) if (o >= from && o <= to && t >= o) p = Math.max(p, Math.exp(-(t - o) / tau)); return p; };
    return {
      missing, onsets, D: D_at, elev,
      sea: (t) => interp(Sp, t),
      rms: (t) => at(rms, t), low: (t) => at(low, t), high: (t) => at(high, t), voice: (t) => at(voice, t), centroid: (t) => at(cen2, t),
      pulse,
    };
  };

  // color del sol por elevación (tabla de la especificación)
  LR.sunColor = function (cfg, e) {
    const T = cfg.sun.colors;
    if (e <= T[0][0]) return T[0][1].slice();
    for (let i = 0; i < T.length - 1; i++) {
      if (e <= T[i + 1][0]) { const u = (e - T[i][0]) / (T[i + 1][0] - T[i][0]); return T[i][1].map((v, k) => v + (T[i + 1][1][k] - v) * u); }
    }
    return T[T.length - 1][1].slice();
  };
  // tabla lineal por tramos
  LR.pwl = function (T, x) {
    if (x <= T[0][0]) return T[0][1];
    for (let i = 0; i < T.length - 1; i++) if (x <= T[i + 1][0]) { const u = (x - T[i][0]) / (T[i + 1][0] - T[i][0]); return T[i][1] + (T[i + 1][1] - T[i][1]) * u; }
    return T[T.length - 1][1];
  };
})();
