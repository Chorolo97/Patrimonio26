"""Placa «tacuari» (SPEC §9): río ancho y lento de aguas pardas, orillas con monte ribereño denso y matas de tacuara, cielo nublado. Sin bote.
Agua con reflejo por marcha de rayos (pl_engine), cielo de nubes procedural, banco de arena y cañas de primer plano dibujados en 2D."""
import sys
from pl_engine import *

def XR(y): return 1500 + 210 * np.sin(y / 1100 + 0.2) + 70 * np.sin(y / 420 + 1.1)

def scene():
    N, dx = 2048, 1.5
    Yg, Xg = np.mgrid[0:N, 0:N].astype(np.float32) * dx
    xr = XR(Yg)
    wid = 190 + 30 * np.sin(Yg / 600 + 0.7)
    d = Xg - xr
    edge = np.abs(d) - wid / 2 + 10 * (fbm(N, N, 40, 3, 4) - 0.5)
    river = sm(0.5, -0.5, edge)
    dist_bank = np.maximum(edge, 0)
    belt = 1 - sm(150, 330, dist_bank + 70 * (fbm(N, N, 120, 3, 5) - 0.5))
    crownR = fbm(N, N, 8, 4, 6)
    crown = 0.35 + 0.75 * crownR ** 1.15
    tall = fbm(N, N, 90, 3, 7)
    hc = ((11 + 6 * tall) * crown * belt + 2.2 * (1 - belt)) * (0.12 + 0.88 * sm(0, 24, dist_bank))
    taq = sm(0.58, 0.72, fbm(N, N, 40, 3, 8)) * (1 - sm(0, 60, dist_bank)) * (edge > 3)
    taq = gblur(taq.astype(np.float32), 1.2)
    stems = fbm(N, N, 2.4, 3, 9)
    hc = hc * (1 - taq) + (6.5 + 4.5 * stems + 3.0 * fbm(N, N, 14, 3, 10)) * taq * (0.3 + 0.7 * sm(0, 10, dist_bank))
    hc = gblur(hc, 0.6)
    ground = hc
    hills = 45 * sm(1900, 2900, Yg) * (0.5 + fbm(N, N, 200, 4, 11)) + 14 * sm(200, 900, np.abs(d)) * fbm(N, N, 300, 3, 12)
    h = np.where(river > 0.5, 0.0, np.maximum(ground + hills * (1 - belt), 0.6))
    h = h + hills * belt * 0.3
    T = Terrain(h, dx)
    alb = 0.09 + 0.16 * crownR ** 1.5 + 0.05 * fbm(N, N, 14, 4, 13)
    alb = alb * (1 - taq) + (0.24 + 0.07 * fbm(N, N, 6, 3, 14)) * taq
    field = (1 - belt)
    alb = alb * (1 - field) + (0.26 + 0.08 * fbm(N, N, 40, 3, 15)) * field
    ao = np.clip((gblur(h, 5) - h) / 7.0 + 0.85, 0.35, 1.05)
    veg = np.clip(0.4 + 0.6 * belt + 0.3 * taq, 0, 1)
    return T, dict(alb=alb.astype(np.float32), water=river.astype(np.float32), ao=ao.astype(np.float32), veg=veg.astype(np.float32))

PARAMS = dict(sun=(-0.35, 0.25, 0.9), sunI=0.34, amb=0.78, gain=1.75, shadows=False, fog=2400., haze=0.70,
              sky_top=0.55, sky_hor=0.84, cloud_h=1500., cloud_amp=0.36, cloud_cover=0.78, cloud_scale=1900.,
              m1=(21, 40, 0.16), m2=(22, 12, 0.05), micro_fade=260., micro_alb=1.8, micro_n=0.0,
              ripple=(31, 40, 2.0, 11.0, 0.18), F0=0.06, Fpow=4.0, water_deep=0.10, refl_gain=0.95, refl_tmax=3000.)

if __name__ == '__main__':
    quick = len(sys.argv) > 1 and sys.argv[1] == 'q'
    W, Hh = (850, 960) if quick else (1700, 1920)
    T, M = scene()
    cx = float(XR(np.array([60.]))[0]) - 44
    cam = (cx, 60., 2.4)
    tgt = (float(XR(np.array([1200.]))[0]) + 18, 1200., 2.4 + 1200 * np.tan(np.radians(1.2)))
    G = T.render(cam, tgt, 52, W, Hh, tmax=3400., verbose=False)
    L = shade_image(T, G, M, PARAMS, 2)
    gx, gy = G['X'] / T.dx, G['Y'] / T.dx
    wat = bil(M['water'], gx, gy) * G['hit']
    skym = (G['sky'] | ~G['hit']).astype(np.float32)
    Yi, Xi = np.mgrid[0:Hh, 0:W].astype(np.float32)
    # banco de arena en la orilla cercana (izquierda): aquí se paran las personas
    top = np.array([(0, .705), (.10, .690), (.22, .692), (.31, .705), (.37, .722)]) * [W, Hh]
    bot = np.array([(.36, .733), (.30, .762), (.20, .790), (.10, .812), (0, .830)]) * [W, Hh]
    spit = poly(Hh, W, [tuple(p) for p in np.vstack([top, bot])], 3.5)
    sand = 0.50 + 0.13 * (fbm(Hh, W, 14, 4, 51) - 0.5) + 0.05 * (fbm(Hh, W, 3, 2, 52) - 0.5)
    ytop = np.interp(Xi[0], top[:, 0], top[:, 1])[None, :]
    wet = 1 - sm(0.0, 22.0, np.abs(Yi - ytop))
    sand = sand * (0.80 + 0.20 * (1 - wet)) - 0.06 * wet + 0.05 * (fbm(Hh, W, 5, 3, 53) > 0.62) - 0.07 * (fbm(Hh, W, 7, 3, 54) > 0.70)
    refl = gblur(spit, 9)
    L = L * (1 - 0.22 * np.clip(refl - spit, 0, 1) * 2.0)
    L = L * (1 - spit) + sand * spit
    edge = gblur(spit, 3) - spit
    L = L + 0.06 * np.clip(edge * 3, 0, 1)
    wat = wat * (1 - spit)
    # matas de tacuara en primer plano: esquina inferior derecha y un borde fino a la izquierda
    ov = culm_overlay(L.shape, [(W * 0.90, Hh + 40, 40, Hh * 0.50, -380), (W * 1.02, Hh + 30, 26, Hh * 0.36, -260)], 77, leaf_len=(50, 120))
    ov2 = culm_overlay(L.shape, [(W * 0.0, Hh * 1.02, 9, Hh * 0.20, 60)], 78, blur=2.4, leaf_len=(50, 100))
    ovm = np.maximum(ov, ov2)
    L = L * (1 - ovm) + 0.05 * ovm
    L = L * (1 - 0.30 * sm(Hh * 0.80, Hh, Yi))
    out = finish(L, 1.0, 1.05, 0.7, 0.14, 6)
    save(out, 't_test' if quick else 'tacuari', dict(water=np.clip(wat, 0, 1), rock=np.clip(spit, 0, 1) * 0, sand=np.clip(spit, 0, 1), sky=gblur(skym, 1.0)))
