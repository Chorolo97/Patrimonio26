/* Utilidades de inicio: transformada de distancia, desenfoques, subida de texturas crudas. */
(function () {
  const U = (window.CC_U = {});

  // Felzenszwalb–Huttenlocher 1D sobre f (cuadrados), in-place en d.
  function edt1d(f, n, d, v, z) {
    let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; const dq = q - v[k]; d[q] = dq * dq + f[v[k]]; }
  }
  // Distancia euclídea (en px) desde cada celda a la celda "semilla" más cercana (seed[i] = true).
  U.edt = function (seed, w, h) {
    const INF = 1e20, n = Math.max(w, h);
    const g = new Float64Array(w * h);
    for (let i = 0; i < w * h; i++) g[i] = seed[i] ? 0 : INF;
    const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; edt1d(f, h, d, v, z); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
    for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; edt1d(f, w, d, v, z); for (let x = 0; x < w; x++) g[y * w + x] = d[x]; }
    const out = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = Math.sqrt(g[i]);
    return out;
  };
  // Distancia con signo a partir de un campo binario inside[]: + dentro, − fuera (en celdas).
  U.sdf = function (inside, w, h) {
    const inv = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) inv[i] = inside[i] ? 0 : 1;
    const a = U.edt(inv, w, h); // distancia al exterior (para celdas interiores)
    const b = U.edt(inside, w, h);
    const out = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) out[i] = inside[i] ? a[i] - 0.5 : -(b[i] - 0.5);
    return out;
  };

  // Desenfoque gaussiano separable de un Float32Array.
  U.blur = function (src, w, h, sigma) {
    if (sigma <= 0) return src.slice();
    const r = Math.ceil(sigma * 3), k = new Float32Array(2 * r + 1);
    let s = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma)); s += k[i + r]; }
    for (let i = 0; i < k.length; i++) k[i] /= s;
    const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let i = -r; i <= r; i++) { const xx = Math.min(w - 1, Math.max(0, x + i)); a += src[y * w + xx] * k[i + r]; } tmp[y * w + x] = a; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let a = 0; for (let i = -r; i <= r; i++) { const yy = Math.min(h - 1, Math.max(0, y + i)); a += tmp[yy * w + x] * k[i + r]; } out[y * w + x] = a; }
    return out;
  };
  // Caja rápida (3 pasadas ≈ gaussiana) para campos grandes.
  U.boxBlur = function (src, w, h, r) {
    let a = src.slice(), b = new Float32Array(w * h);
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < h; y++) { let acc = 0; const row = y * w; for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))]; for (let x = 0; x < w; x++) { b[row + x] = acc / (2 * r + 1); acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)]; } }
      for (let x = 0; x < w; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x]; for (let y = 0; y < h; y++) { a[y * w + x] = acc / (2 * r + 1); acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x]; } }
    }
    return a;
  };

  // Alfa de un lienzo como Float32Array 0..1
  U.alpha = function (canvas) {
    const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    const out = new Float32Array(canvas.width * canvas.height);
    for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3] / 255;
    return out;
  };

  // Sube datos crudos (fila 0 = ARRIBA de la imagen) como textura, con la misma convención que gl.texture (arriba en uv.y = 1).
  U.rawTexture = function (G, data, w, h, o = {}) {
    const gl = G.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    const filt = o.nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    let flipped = data;
    if (o.flip !== false) { flipped = new data.constructor(data.length); const row = w * 4; for (let y = 0; y < h; y++) flipped.set(data.subarray((h - 1 - y) * row, (h - y) * row), y * row); }
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    if (data instanceof Float32Array) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, flipped);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, flipped);
    t.w = w; t.h = h;
    return t;
  };

  // Empaqueta hasta 4 campos 0..1 (Float32Array o null) en RGBA8.
  U.pack8 = function (w, h, r, g, b, a) {
    const out = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      out[i * 4] = r ? Math.max(0, Math.min(255, Math.round(r[i] * 255))) : 0;
      out[i * 4 + 1] = g ? Math.max(0, Math.min(255, Math.round(g[i] * 255))) : 0;
      out[i * 4 + 2] = b ? Math.max(0, Math.min(255, Math.round(b[i] * 255))) : 0;
      out[i * 4 + 3] = a ? Math.max(0, Math.min(255, Math.round(a[i] * 255))) : 255;
    }
    return out;
  };

  U.canvas = function (w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
})();
