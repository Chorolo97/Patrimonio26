/* Núcleo compartido: azar con semilla, ruido, color, curvas, audio y tipografías. Sin dependencias. */
(function () {
  const S = (window.PBS = window.PBS || {});
  S.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  S.makeNoise = function (seed) {
    const r = S.rng(seed);
    const perm = new Uint8Array(512);
    const base = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [base[i], base[j]] = [base[j], base[i]]; }
    for (let i = 0; i < 512; i++) perm[i] = base[i & 255];
    const val = new Float32Array(256);
    for (let i = 0; i < 256; i++) val[i] = r();
    function n2(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
      const X = xi & 255, Y = yi & 255;
      const a = val[perm[perm[X] + Y]], b = val[perm[perm[X + 1] + Y]], c = val[perm[perm[X] + Y + 1]], d = val[perm[perm[X + 1] + Y + 1]];
      return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
    }
    function fbm(x, y, oct = 4) { let s = 0, amp = 0.5, f = 1, nn = 0; for (let i = 0; i < oct; i++) { s += amp * n2(x * f + i * 17.3, y * f - i * 9.1); nn += amp; amp *= 0.5; f *= 2.03; } return s / nn; }
    return { n2, fbm };
  };
  S.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  S.lerp = (a, b, t) => a + (b - a) * t;
  S.smooth = (t) => { t = S.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  S.ease = (t) => { t = S.clamp(t, 0, 1); return 0.5 - 0.5 * Math.cos(Math.PI * t); };
  // Ventana: 0 antes de a, sube en f segundos, 1 hasta b, baja en f segundos.
  S.win = (t, a, b, f = 0.6) => Math.min(S.smooth((t - a) / f), b == null ? 1 : S.smooth((b - t) / f));
  S.hex = (h) => { const s = h.replace('#', ''); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; };
  S.css = (c, a = 1) => { if (typeof c === 'string') c = S.hex(c); return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; };
  S.mix = (a, b, t) => { if (typeof a === 'string') a = S.hex(a); if (typeof b === 'string') b = S.hex(b); return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };

  S.loadImage = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('No se pudo cargar ' + src)); im.src = src; });

  // Rasgos de audio precalculados (tools/audio_features.py). a.at('voiceSmooth', t) interpola por cuadro.
  S.loadAudioFeatures = async function (url) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      d.at = (key, t) => {
        const arr = d[key]; if (!arr) return 0;
        const f = S.clamp(t * d.fps, 0, arr.length - 1), i = Math.floor(f), u = f - i;
        return arr[i] * (1 - u) + arr[Math.min(arr.length - 1, i + 1)] * u;
      };
      // media en una ventana (para movimientos lentos que respiran con la música)
      d.avg = (key, t, span = 1) => { let s = 0, n = 0; for (let k = -span / 2; k <= span / 2; k += 1 / d.fps) { s += d.at(key, t + k); n++; } return s / n; };
      return d;
    } catch (e) {
      const z = { fps: 30, frames: 0, markers: [], missing: true, at: () => 0, avg: () => 0 };
      return z;
    }
  };

  // Tipografías locales (OFL) compartidas.
  S.FONTS = {
    serif: { family: 'EB Garamond', faces: [['EBGaramond-latin.woff2', 'normal'], ['EBGaramond-Italic-latin.woff2', 'italic']], fallback: 'Georgia, serif' },
    sans: { family: 'Source Sans 3', faces: [['SourceSans3-latin.woff2', 'normal']], fallback: 'Arial, sans-serif' },
  };
  S.loadFonts = async function (base, warnings = []) {
    for (const k of Object.keys(S.FONTS)) {
      const f = S.FONTS[k];
      for (const [file, style] of f.faces) {
        try { const ff = new FontFace(f.family, `url(${base}${file})`, { style, weight: '200 900' }); await ff.load(); document.fonts.add(ff); }
        catch (e) { warnings.push('Tipografía no cargada: ' + file); }
      }
    }
  };
  S.font = (kind, size, weight = 400, italic = false) => `${italic ? 'italic ' : ''}${weight} ${size}px "${S.FONTS[kind].family}", ${S.FONTS[kind].fallback}`;
})();
