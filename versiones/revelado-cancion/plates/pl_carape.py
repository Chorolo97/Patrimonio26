"""Placa «carape» (SPEC §9): cumbre de sierra de pastizal con bloques y crestones de granito claro, cielo amplio.
Heightfield + marcha de rayos con sombras duras; pastos de primer plano en 2D."""
import sys
from pl_engine import *

def scene():
    N, dx = 2048, 1.5
    Yg, Xg = np.mgrid[0:N, 0:N].astype(np.float32) * dx
    # cumbre redondeada que cae hacia el fondo (loma tras loma)
    base = 24 - 0.020 * np.maximum(Yg - 900, 0) + 9 * fbm(N, N, 260, 4, 3) + 3.0 * fbm(N, N, 60, 3, 4)
    far = 55 * sm(1800, 3000, Yg) * (0.45 + fbm(N, N, 330, 4, 5))
    base = base + far
    r = rng(11)
    rock = np.zeros((N, N), np.float32); hb = np.zeros((N, N), np.float32)
    def boulder(cx, cy, rx, ry, H, rot=0.0, flat=0.45, seed=0):
        yy, xx = Yg - cy, Xg - cx
        c, s = np.cos(rot), np.sin(rot)
        u, v = (xx * c + yy * s) / rx, (-xx * s + yy * c) / ry
        rad = (np.abs(u) ** 2.6 + np.abs(v) ** 2.6) ** (1 / 2.6) * (1 + 0.34 * (fbm(N, N, 12, 3, 60 + seed) - 0.5))
        core = np.clip(1 - rad, 0, 1)
        return H * core ** (flat * 0.7) * (0.85 + 0.3 * fbm(N, N, 18, 3, 90 + seed)), sm(1.0, 0.90, rad)
    sp = [
        (1440, 1120, 5, 4, 2.0, 0.3, 0.30), (1580, 1080, 9, 6, 3.4, 0.0, 0.5), (1400, 1140, 12, 8, 5, 0.5, 0.45), (1650, 1130, 14, 10, 6.5, 0.2, 0.42),
        (1520, 1180, 18, 12, 8, -0.2, 0.45), (1340, 1200, 20, 14, 9, 0.4, 0.42), (1700, 1250, 26, 18, 14, 0.1, 0.5), (1450, 1330, 30, 20, 16, 0.0, 0.45),
        (1600, 1400, 40, 26, 24, 0.2, 0.5), (1260, 1380, 34, 24, 20, -0.3, 0.46), (1780, 1350, 30, 22, 16, 0.4, 0.5), (1500, 1550, 60, 36, 32, 0.0, 0.55),
        (1350, 1000, 6, 5, 2.0, 0.0, 0.5), (1620, 1010, 7, 5, 2.4, 0.3, 0.5), (1300, 1080, 8, 6, 3.2, 0.1, 0.5), (1210, 1180, 10, 7, 4.0, 0.2, 0.5),
    ]
    for i, (cx, cy, rx, ry, H, rot, fl) in enumerate(sp):
        b, m = boulder(cx, cy, rx * 1.8, ry * 1.8, H * 1.5, rot, fl, i)
        hb = np.maximum(hb, b); rock = np.maximum(rock, m)
    # losa plana amplia: aquí se paran las personas
    slab_c = (1500., 1160.)
    yy, xx = Yg - slab_c[1], Xg - slab_c[0]
    rs = np.sqrt((xx / 24.) ** 2 + (yy / 14.) ** 2) * (1 + 0.16 * (fbm(N, N, 20, 3, 70) - 0.5))
    slab = sm(1.0, 0.9, rs)
    hb = np.maximum(hb, slab * (1.3 + 0.5 * fbm(N, N, 40, 2, 71)))
    rock = np.maximum(rock, slab)
    rough = fbm(N, N, 4, 4, 72)
    h = base + hb * 1.0 + rock * 0.9 * (rough - 0.5)
    h = h + rock * 2.2 * (fbm(N, N, 9, 3, 73) - 0.5)
    groove = np.exp(-((fbm(N, N, 22, 3, 79) - 0.5) / 0.03) ** 2)
    h = h - rock * 0.35 * groove
    T = Terrain(h, dx)
    # albedo: granito claro con manchas y fisuras; pasto medio
    crack = np.abs(fbm(N, N, 26, 3, 74) - 0.5) < 0.018
    gran = 0.41 + 0.14 * (fbm(N, N, 7, 4, 75) - 0.5) - 0.10 * crack - 0.08 * sm(0.62, 0.8, fbm(N, N, 16, 3, 76))
    grass = 0.46 + 0.06 * fbm(N, N, 60, 4, 77) + 0.03 * fbm(N, N, 5, 3, 78)
    alb = grass * (1 - rock) + gran * rock
    ao = np.clip((gblur(h, 3) - h) / 4.0 + 0.9, 0.4, 1.05)
    veg = np.clip((1 - rock) * 0.8 + 0.1, 0, 1)
    return T, dict(alb=alb.astype(np.float32), water=np.zeros((N, N), np.float32), ao=ao.astype(np.float32), veg=veg.astype(np.float32), rock=rock.astype(np.float32))

PARAMS = dict(sun=(-0.55, -0.35, 0.62), sunI=0.95, amb=0.44, gain=1.35, shadows=True, shadow_steps=80, shadow_tmax=500., shadow_bias=0.35, fog=3500., haze=0.80,
              sky_top=0.55, sky_hor=0.88, cloud_h=2200., cloud_amp=0.5, cloud_cover=0.42, cloud_scale=2800.,
              m1=(21, 40, 0.28), m2=(22, 12, 0.06), micro_fade=260., micro_alb=0.15, micro_base=0.10, micro_n=0.0)

if __name__ == '__main__':
    quick = len(sys.argv) > 1 and sys.argv[1] == 'q'
    W, Hh = (850, 960) if quick else (1700, 1920)
    T, M = scene()
    cz = float(T.height(np.array([1500.]), np.array([1085.]))[0])
    cam = (1500., 1085., cz + 2.4)
    tgt = (1545., 1600., cz + 2.4 + 520 * np.tan(np.radians(2.0)))
    G = T.render(cam, tgt, 54, W, Hh, tmax=2500., verbose=False)
    L = shade_image(T, G, M, PARAMS, 6)
    gx, gy = G['X'] / T.dx, G['Y'] / T.dx
    rockm = bil(M['rock'], gx, gy) * G['hit'] * (G['t'] < 900)
    skym = (G['sky'] | ~G['hit']).astype(np.float32)
    Yi, Xi = np.mgrid[0:Hh, 0:W].astype(np.float32)
    hor = int(np.argmax(~G['sky'].any(axis=1)))
    ground = (1 - skym) * (1 - np.clip(rockm, 0, 1))
    L = L * (1 + (grass_texture(Hh, W, hor, 31, 0.15) - 1) * ground * (G['t'] > 60))
    cl = [(x, Hh + 20, 8, Hh * 0.11, 70) for x in np.linspace(-40, W + 40, 30)]
    ov = culm_overlay(L.shape, cl, 32, leaves=0.0, wmul=0.55, blur=1.6)
    L = L * (1 - ov) + 0.07 * ov
    out = finish(L, 1.0, 1.08, 0.7, 0.14, 9)
    save(out, 'k_test' if quick else 'carape', dict(rock=np.clip(rockm, 0, 1), sky=gblur(skym, 1.0)))
