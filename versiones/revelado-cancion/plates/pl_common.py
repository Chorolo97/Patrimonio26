"""Herramientas comunes para las placas procedurales (SPEC §9): ruido fbm, desenfoque, polígonos, curvas."""
import numpy as np
from PIL import Image, ImageDraw

def rng(s): return np.random.default_rng(s)

def sm(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def noise(h, w, cx, cy=None, seed=0):
    """ruido de valor bicúbico con celdas de cx × cy px, en [0,1]"""
    cy = cy or cx
    r = rng(seed)
    gh, gw = int(h / cy) + 4, int(w / cx) + 4
    g = r.random((gh, gw)).astype(np.float32)
    im = Image.fromarray(g).resize((int(gw * cx), int(gh * cy)), Image.BICUBIC)
    a = np.asarray(im)
    ox, oy = int(r.integers(0, int(cx) + 1)), int(r.integers(0, int(cy) + 1))
    return np.clip(a[oy:oy + h, ox:ox + w], 0, 1)

def fbm(h, w, cx, oct=5, seed=0, cy=None, gain=0.55):
    cy0 = cy or cx
    tot, amp, s = np.zeros((h, w), np.float32), 1.0, 0.0
    for o in range(oct):
        tot += amp * (noise(h, w, max(1.5, cx / 2 ** o), max(1.5, cy0 / 2 ** o), seed * 131 + o * 17) - 0.5)
        s += amp; amp *= gain
    tot /= s
    return np.clip(0.5 + tot / 0.16 * 0.25, 0, 1)   # media 0,5; desviación ≈ 0,25

def gblur(a, s):
    if s <= 0.3: return a
    p = int(3 * s) + 2
    b = np.pad(a, p, mode='reflect')
    h, w = b.shape
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2 * (np.pi ** 2) * (s ** 2) * (fx ** 2 + fy ** 2))
    o = np.fft.irfft2(np.fft.rfft2(b) * k, s=b.shape).astype(np.float32)
    return o[p:-p, p:-p]

def poly(h, w, pts, blur=1.0, ss=2):
    im = Image.new('L', (w * ss, h * ss), 0)
    ImageDraw.Draw(im).polygon([(x * ss, y * ss) for x, y in pts], fill=255)
    a = np.asarray(im.resize((w, h), Image.BILINEAR), dtype=np.float32) / 255
    return gblur(a, blur)

def line_mask(h, w, pts, wid, blur=1.0, ss=2):
    """polilínea con ancho variable: pts [(x,y)], wid = lista de anchos"""
    im = Image.new('L', (w * ss, h * ss), 0)
    d = ImageDraw.Draw(im)
    for (x, y), r in zip(pts, wid):
        d.ellipse([(x - r) * ss, (y - r * 0.5) * ss, (x + r) * ss, (y + r * 0.5) * ss], fill=255)
    a = np.asarray(im.resize((w, h), Image.BILINEAR), dtype=np.float32) / 255
    return gblur(a, blur)

def catmull(pts, n=200):
    P = np.array(pts, np.float32); out = []
    Pm = np.vstack([P[0], P, P[-1]])
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = Pm[i], Pm[i + 1], Pm[i + 2], Pm[i + 3]
        for t in np.linspace(0, 1, max(2, n // (len(P) - 1)), endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-1])
    return np.array(out)

def ridge1d(w, base, amp, cell, seed, oct=5):
    """perfil 1D de cresta: base(x) + amp·(fbm−0,5)"""
    r = rng(seed); tot = np.zeros(w, np.float32); a = 1.0; s = 0
    for o in range(oct):
        c = max(2.0, cell / 2 ** o); g = r.random(int(w / c) + 4).astype(np.float32)
        xs = np.arange(w) / c
        i = xs.astype(int); f = xs - i; f = f * f * (3 - 2 * f)
        tot += a * ((g[i] * (1 - f) + g[i + 1] * f) - 0.5); s += a; a *= 0.5
    return base + amp * tot / s * 2

def finish(L, gamma=1.0, contrast=1.0, blur=0.6, vig=0.10, seed=0):
    H, W = L.shape
    Y, X = np.mgrid[0:H, 0:W].astype(np.float32)
    v = ((X - W / 2) / (W * 0.75)) ** 2 + ((Y - H / 2) / (H * 0.75)) ** 2
    L = L * (1 - vig * sm(0.2, 1.0, v))
    L = np.clip(L, 0, 1)
    L = 0.5 + (L - 0.5) * contrast
    L = np.clip(L, 0, 1) ** gamma
    L = gblur(L, blur)
    L += (rng(seed).random(L.shape).astype(np.float32) - 0.5) * 0.012
    return np.clip(L, 0, 1)

def save(L, name, masks=None, q=93):
    img = Image.fromarray((np.clip(L, 0, 1) * 255).astype(np.uint8)).convert('RGB')
    img.save(name + '.jpg', quality=q, subsampling=0)
    if masks is not None:
        H, W = L.shape
        m = np.zeros((H, W, 3), np.uint8)   # RGB opaco (sin alfa premultiplicado): R agua, G roca, B cielo
        for i, k in enumerate(['water', 'rock', 'sky']):
            if k in masks: m[..., i] = (np.clip(masks[k], 0, 1) * 255).astype(np.uint8)
        Image.fromarray(m, 'RGB').save(name + '_mask.png')

def tnoise(N, cells, seed):
    """ruido de valor bicúbico periódico de N×N px con `cells` celdas por lado"""
    r = rng(seed); g = r.random((cells, cells)).astype(np.float32)
    gp = np.pad(g, 2, mode='wrap')
    im = Image.fromarray(gp).resize((N, N), Image.BICUBIC, box=(2, 2, 2 + cells, 2 + cells))
    return np.clip(np.asarray(im), 0, 1)

def tfbm(N, cell, oct=4, seed=0, gain=0.55):
    tot, amp, s = np.zeros((N, N), np.float32), 1.0, 0.0
    for o in range(oct):
        c = max(2, int(round(N / max(2.0, cell / 2 ** o))))
        tot += amp * (tnoise(N, c, seed * 131 + o * 17) - 0.5); s += amp; amp *= gain
    tot /= s
    return np.clip(0.5 + tot / 0.16 * 0.25, 0, 1)

def bezier(p0, p1, p2, n=40):
    t = np.linspace(0, 1, n)[:, None]
    return (1 - t) ** 2 * np.array(p0) + 2 * (1 - t) * t * np.array(p1) + t ** 2 * np.array(p2)

def culm_overlay(shape, clumps, seed, ss=2, blur=1.2, leaf_len=(40, 95), leaves=1.0, tone=0.06, wmul=1.0):
    """primer plano: matas de tacuara (cañas arqueadas con hojas lanceoladas), dibujadas como silueta oscura.
    clumps: [(x_base, y_base, n_cañas, altura, deriva_x)]. Devuelve máscara (0..1)."""
    H, W = shape; r = rng(seed)
    im = Image.new('L', (W * ss, H * ss), 0); d = ImageDraw.Draw(im)
    for (bx, by, n, hgt, drift) in clumps:
        for k in range(n):
            x0 = bx + r.normal(0, 26); y0 = by + r.uniform(0, 30)
            h = hgt * r.uniform(0.55, 1.0)
            lean = drift * r.uniform(0.3, 1.3) + r.normal(0, 60)
            tip = (x0 + lean, y0 - h); mid = (x0 + lean * 0.15 + r.normal(0, 10), y0 - h * 0.62)
            ctrl = (2 * mid[0] - (x0 + tip[0]) / 2, 2 * mid[1] - (y0 + tip[1]) / 2)
            pts = bezier((x0, y0), ctrl, tip, 46)
            wdt = r.uniform(3.2, 7.0) * wmul
            for i in range(len(pts) - 1):
                w = wdt * (1 - 0.8 * i / len(pts))
                d.line([(pts[i][0] * ss, pts[i][1] * ss), (pts[i + 1][0] * ss, pts[i + 1][1] * ss)], fill=255, width=max(1, int(w * ss)))
            # ramillas con hojas en el tercio superior
            for j in range(int(r.integers(4, 9) * leaves)):
                u = r.uniform(0.55, 0.98); i0 = int(u * (len(pts) - 1))
                bxp, byp = pts[i0]
                side = 1 if r.random() < 0.5 else -1
                ang = np.radians(r.uniform(15, 70)) * side + np.radians(90)
                L0 = r.uniform(*leaf_len) * (1.2 - 0.5 * u)
                for m in range(int(r.integers(3, 7))):
                    a2 = ang + np.radians(r.normal(0, 14)); l2 = L0 * r.uniform(0.5, 1.0)
                    ex, ey = bxp + np.cos(a2) * l2 * side * -1, byp + np.sin(a2) * l2 * 0.55 + l2 * 0.35
                    # hoja: cuña fina
                    nx, ny = -(ey - byp), (ex - bxp); nn = max(1e-3, np.hypot(nx, ny)); nx, ny = nx / nn * 2.4, ny / nn * 2.4
                    d.polygon([(bxp * ss, byp * ss), ((ex * 0.5 + bxp * 0.5 + nx) * ss, (ey * 0.5 + byp * 0.5 + ny) * ss), (ex * ss, ey * ss), ((ex * 0.5 + bxp * 0.5 - nx) * ss, (ey * 0.5 + byp * 0.5 - ny) * ss)], fill=255)
    a = np.asarray(im.resize((W, H), Image.LANCZOS), dtype=np.float32) / 255
    return gblur(a, blur)

def grass_texture(H, W, y_h, seed, amp=0.22, ymax=None):
    """textura de pastizal en perspectiva: vetas horizontales cuyo tamaño crece hacia el primer plano"""
    Yi = np.arange(H, dtype=np.float32)[:, None]
    ymax = ymax or H
    t = np.clip((Yi - y_h) / max(1, ymax - y_h), 0, 1.0)
    s = 1.2 + 70 * t ** 1.7
    tot = np.zeros((H, W), np.float32); wsum = np.zeros((H, 1), np.float32)
    for k, sc in enumerate([1.5, 3, 6, 12, 24, 48, 96]):
        w = np.exp(-(np.log(sc / s) / 0.75) ** 2)
        n = fbm(H, W, sc * 2.4, 2, seed + k, cy=sc)
        tot += w * (n - 0.5); wsum += w
    return 1 + amp * 2.2 * tot / np.maximum(wsum, 1e-3)
