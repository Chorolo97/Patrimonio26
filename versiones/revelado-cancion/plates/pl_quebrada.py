"""Placa «quebrada» (SPEC §9): valle serrano profundo y cerrado, monte nativo espeso, afloramientos de roca clara, arroyo al fondo, lomas lejanas.
Heightfield procedural + marcha de rayos (pl_engine): relieve, luz, sombras, bruma y grano, sin fotos de referencia."""
import sys
from pl_engine import *

def XC(y): return 2600 + 650 * np.sin(y / 1500 + 0.5) + 250 * np.sin(y / 620 + 2.0)

def scene(quick=False):
    N, dx = 2048, 2.6
    Yg, Xg = np.mgrid[0:N, 0:N].astype(np.float32) * dx
    xc = XC(Yg)
    d = Xg - xc
    floor = 40 - 0.030 * (Yg - 200)
    u = np.maximum(np.abs(d) - 35, 0)
    # serranía baja y redondeada: perfil convexo que satura en cresta suave (sin aristas ni picos), ~100 m sobre el piso
    n1 = fbm(N, N, 140, 3, 3)
    cap = 92 + 34 * (gblur(fbm(N, N, 200, 2, 5), 6) * 2)
    prof = 1 - np.exp(-(u / (150 + 90 * (fbm(N, N, 220, 2, 4) + 0.5))) ** 1.25)
    walls = cap * prof
    walls = walls + 9 * (gblur(n1, 4)) * sm(30, 250, np.abs(d)) + 4 * (gblur(fbm(N, N, 40, 3, 15), 2)) * sm(60, 250, np.abs(d))
    hgt = floor + walls
    hgt += 70 * sm(2500, 3800, Yg) * (0.8 + 0.5 * gblur(fbm(N, N, 160, 3, 6), 5))     # el fondo se cierra con lomas suaves
    # copas del monte: bolas redondeadas (8–25 m) sobre las laderas
    forest = sm(50, 130, np.abs(d)) * (1 - sm(0.70, 0.82, fbm(N, N, 70, 4, 7)))
    cr1 = fbm(N, N, 9, 2, 8); cr2 = fbm(N, N, 22, 2, 9)
    canopy = gblur(cr1, 0.8) * 0.6 + cr2 * 0.4
    hgt += forest * (9 * canopy)
    # arroyo con meandros
    xs = xc + 70 * np.sin(Yg / 260 + 1.0) + 26 * np.sin(Yg / 97)
    ds = Xg - xs
    chan = np.exp(-(ds / (3.6 + 4.0 * fbm(N, N, 80, 3, 30))) ** 2)
    bank = np.exp(-(ds / 34.0) ** 2)
    hgt = hgt - bank * 1.6
    wl = floor - 1.4
    hgt = np.where(chan > 0.5, np.minimum(hgt, wl), hgt)
    hgt = np.where(chan > 0.5, wl, hgt)
    water = sm(0.45, 0.55, chan)
    # roca: pocos afloramientos claros en laderas altas, aspecto de bloques
    upper = sm(0.35, 0.8, (hgt - floor) / 110.0) * sm(90, 200, np.abs(d))
    rock = np.clip(sm(0.74, 0.80, fbm(N, N, 40, 5, 10)) * upper * 1.4, 0, 1)
    rock = gblur(rock, 1.0)
    blk = np.floor(fbm(N, N, 12, 3, 16) * 14) / 14
    hgt += rock * (3.0 * (fbm(N, N, 4, 4, 11) - 0.5) + 5 * (blk - 0.0))
    T = Terrain(hgt, dx)
    alb = 0.065 + 0.08 * fbm(N, N, 20, 4, 12)
    alb = alb * (1 - sm(0, 1, np.exp(-(ds / 70.0) ** 2))) + 0.30 * np.exp(-(ds / 70.0) ** 2)  # pastizal en el piso
    peb = sm(0.62, 0.78, fbm(N, N, 9, 3, 13)) * bank * 0.6
    alb = alb + (0.45 - alb) * np.clip(peb * 1.3, 0, 0.7)
    alb = alb * (1 - rock) + (0.38 + 0.12 * (fbm(N, N, 6, 4, 14) - 0.5)) * rock
    ao = np.clip((gblur(hgt, 8) - hgt) / 10.0 + 0.9, 0.45, 1.05)
    return T, dict(alb=alb.astype(np.float32), rock=rock.astype(np.float32), water=water.astype(np.float32), ao=ao.astype(np.float32), forest=forest.astype(np.float32), x0=xc)

def shade(T, G, M, seed):
    W, Hh = G['W'], G['H']
    X, Y, Z, dist = G['X'], G['Y'], G['Z'], G['t']
    hit = G['hit']
    gx, gy = X / T.dx, Y / T.dx
    alb = bil(M['alb'], gx, gy); rock = bil(M['rock'], gx, gy); wat = bil(M['water'], gx, gy); ao = bil(M['ao'], gx, gy); forest = bil(M['forest'], gx, gy)
    nx, ny, nz = T.normal(X, Y)
    Ls = np.array([-0.62, -0.22, 0.75], np.float32); Ls /= np.linalg.norm(Ls)
    sh = T.shadow(X, Y, Z + 1.0, Ls, steps=70)
    ndl = np.clip(nx * Ls[0] + ny * Ls[1] + nz * Ls[2], 0, 1)
    # detalle fino en el punto de impacto (copas, hojas, cantos), atenuado con la distancia
    Nt = 1024
    _cache = {}
    def tex(seedd, cell):
        if (seedd, cell) not in _cache: _cache[(seedd, cell)] = tfbm(Nt, cell, 4, seedd)
        return _cache[(seedd, cell)]
    def dt(seedd, cell, k): return bilw(tex(seedd, cell), X * k, Y * k)
    def dt2(seedd, cell, k, XX, YY): return bilw(tex(seedd, cell), XX * k, YY * k)
    fade = 1 / (1 + dist / 1100.)
    c1 = dt(21, 40, 1 / 1.3); c2 = dt(22, 12, 1 / 0.45)
    micro = (c1 - 0.5) * 0.9 + (c2 - 0.5) * 0.7
    alb = alb * (1 + micro * fade * (1.5 * forest + 0.5))
    e = 0.5
    c2x = dt2(22, 12, 1 / 0.45, X + e, Y); c2y = dt2(22, 12, 1 / 0.45, X, Y + e)
    c1x = dt2(21, 40, 1 / 1.3, X + 1.2, Y); c1y = dt2(21, 40, 1 / 1.3, X, Y + 1.2)
    bx = ((c2x - c2) * 1.2 + (c1x - c1) * 0.9) * fade; by = ((c2y - c2) * 1.2 + (c1y - c1) * 0.9) * fade
    Lx, Ly, Lz = Ls
    ndl = np.clip(ndl - (bx * Lx + by * Ly) * 9.0 * (0.4 + forest), 0, 1)
    sun = 0.95; amb = 0.36
    Lum = alb * (amb * (0.55 + 0.45 * nz) * ao + sun * ndl * (0.15 + 0.85 * sh))
    Lum = Lum * 1.7
    # agua: reflejo del cielo con ángulo rasante
    Dv = G['D']
    fres = 0.10 + 0.9 * (1 - np.clip(-Dv[..., 2], 0, 1)) ** 3
    skyw = 0.86
    rip = dt(23, 30, 1 / 3.0)
    wl = 0.16 + fres * (skyw * 1.2 + 0.3 * (rip - 0.5)) * (0.8 + 0.2 * sh)
    Lum = Lum * (1 - wat) + wl * wat
    # bruma atmosférica
    k = 1 - np.exp(-(dist / 2600.) ** 1.15)
    hz = 0.74
    Lum = Lum * (1 - k) + hz * k
    # cielo
    SL = sky_L(Dv, G['cam'], 0.60, 0.86, seed, cloud_h=1900., cloud_amp=0.32, cloud_cover=0.55, cloud_scale=2200.)
    Lum = np.where(G['sky'] | (~hit), SL, Lum)
    return Lum

if __name__ == '__main__':
    quick = len(sys.argv) > 1 and sys.argv[1] == 'q'
    W, Hh = (750, 960) if quick else (1500, 1920)
    T, M = scene()
    cx0 = float(XC(np.array([250.]))[0]) - 15
    cam = (cx0, 250., float(T.height(np.array([cx0]), np.array([250.]))[0]) + 75)
    tx = float(XC(np.array([1500.]))[0])
    print('cam', cam, 'zmax', T.zmax)
    G = T.render(cam, (tx, 1500., cam[2] + 1250 * np.tan(np.radians(-3.5))), 56, W, Hh, tmax=5000.)
    L = shade(T, G, M, 1)
    Yg = np.arange(Hh)[:, None]
    from PIL import Image
    Image.fromarray((np.clip(L, 0, 1) * 255).astype(np.uint8)).save('/tmp/q_raw.png')
    # máscaras
    gx, gy = G['X'] / T.dx, G['Y'] / T.dx
    wat = bil(M['water'], gx, gy) * G['hit']
    skym = (G['sky'] | ~G['hit']).astype(np.float32)
    out = finish(L, 1.0, 1.08, 0.7, 0.14, 5)
    save(out, 'q_test' if quick else 'quebrada', dict(water=wat, sky=gblur(skym, 1.0)))
