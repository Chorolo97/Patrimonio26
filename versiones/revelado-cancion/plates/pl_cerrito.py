"""Placa «cerrito» (SPEC §9): llanura baja de pastizal hacia la Laguna Merín, con una isla de monte sobre un montículo suave (cerrito de indios).
Heightfield + marcha de rayos + hierba de primer plano dibujada en 2D."""
import sys
from pl_engine import *

def scene():
    N, dx = 2048, 3.0
    Yg, Xg = np.mgrid[0:N, 0:N].astype(np.float32) * dx
    plain = 2.6 + 2.2 * fbm(N, N, 180, 3, 3) + 0.12 * fbm(N, N, 30, 3, 4)
    cx0, cy0 = 3250., 640.
    r = np.hypot(Xg - cx0, (Yg - cy0) * 1.25)
    mound = 24 * np.exp(-(r / 175.0) ** 2.2)
    # isla de monte: copas sobre el cerrito, borde irregular
    ex = 128 + 38 * (fbm(N, N, 60, 3, 5) - 0.5)
    inside = sm(ex + 12, ex - 26, r + 30 * (fbm(N, N, 22, 3, 6) - 0.5))
    crownR = fbm(N, N, 7, 4, 7)
    crown = 0.30 + 0.9 * crownR ** 1.4
    trees = (10.5 + 5 * fbm(N, N, 60, 3, 8)) * crown * inside
    # arboledas sueltas
    scat = sm(0.70, 0.78, fbm(N, N, 90, 4, 9)) * (1 - sm(0, 1, inside)) * sm(300, 700, np.hypot(Xg - 3000, Yg - 300))
    trees2 = (5 + 3 * fbm(N, N, 30, 3, 10)) * (0.4 + 0.8 * crownR) * scat
    h = plain + mound + trees + trees2
    # laguna al fondo
    shore = 1500 + 1.6 * np.maximum(Xg - 2700, 0) + 90 * (fbm(N, N, 250, 3, 11) - 0.5) + 50 * np.sin(Xg / 300)
    lag = sm(-6, 6, Yg - shore)
    h = h * (1 - lag) + 0.0 * lag
    h = np.maximum(h, 0.0)
    T = Terrain(gblur(h, 0.5), dx)
    alb = 0.27 + 0.10 * fbm(N, N, 70, 4, 12) + 0.05 * fbm(N, N, 9, 3, 13)
    alb = alb * (1 - inside) + (0.06 + 0.17 * crownR ** 1.6) * inside
    alb = alb * (1 - scat) + (0.08 + 0.15 * crownR ** 1.6) * scat
    alb = alb * (1 - 0.25 * mound / 19.0) + 0.02
    ao = np.clip((gblur(h, 4) - h) / 6.0 + 0.9, 0.4, 1.05)
    veg = np.clip(0.8 + 0.2 * inside, 0, 1)
    return T, dict(alb=alb.astype(np.float32), water=lag.astype(np.float32), ao=ao.astype(np.float32), veg=veg.astype(np.float32))

PARAMS = dict(sun=(-0.75, -0.35, 0.55), sunI=0.85, amb=0.50, gain=1.25, shadows=True, shadow_steps=90, shadow_bias=1.2, shadow_tmax=900., fog=4200., haze=0.80,
              sky_top=0.56, sky_hor=0.88, cloud_h=1900., cloud_amp=0.6, cloud_cover=0.50, cloud_scale=2600.,
              m1=(21, 40, 0.5), m2=(22, 12, 0.05), micro_fade=500., micro_alb=0.10, micro_base=0.10, micro_n=0.10,
              ripple=(31, 40, 6.0, 30.0, 0.05), F0=0.03, Fpow=5.0, water_deep=0.30, refl_gain=1.0, refl_tmax=6000.)

if __name__ == '__main__':
    quick = len(sys.argv) > 1 and sys.argv[1] == 'q'
    W, Hh = (850, 960) if quick else (1700, 1920)
    T, M = scene()
    cam = (3010., 60., 7.2)
    tgt = (3300., 1000., 7.2 + 950 * np.tan(np.radians(-0.7)))
    G = T.render(cam, tgt, 50, W, Hh, tmax=6200., verbose=False)
    L = shade_image(T, G, M, PARAMS, 4)
    gx, gy = G['X'] / T.dx, G['Y'] / T.dx
    wat = bil(M['water'], gx, gy) * G['hit']
    skym = (G['sky'] | ~G['hit']).astype(np.float32)
    Yi, Xi = np.mgrid[0:Hh, 0:W].astype(np.float32)
    # pastizal: vetas en perspectiva sobre el suelo (no sobre cielo ni laguna)
    hor = int(np.argmax(~G['sky'].any(axis=1)))
    ground = (1 - skym) * (1 - np.clip(wat, 0, 1))
    L = L * (1 + (grass_texture(Hh, W, hor, 21, 0.22) - 1) * ground)
    Yi, Xi = np.mgrid[0:Hh, 0:W].astype(np.float32)
    # franja de laguna al fondo (izquierda), con la orilla lejana oscura
    lagm = poly(Hh, W, [(0, hor + 1), (W * 0.46, hor + 1), (W * 0.52, hor + 5), (W * 0.40, hor + 15), (0, hor + 20)], 1.6) * ground
    L = L * (1 - lagm) + (0.80 + 0.06 * (fbm(Hh, W, 60, 2, 33, cy=3) - 0.5)) * lagm
    L = L * (1 - 0.6 * poly(Hh, W, [(0, hor - 1), (W * 0.30, hor - 2), (W * 0.46, hor), (W * 0.30, hor + 3), (0, hor + 3)], 1.2) * (1 - skym * 0))
    # hierba alta de primer plano
    cl = [(x, Hh + 20, 8, Hh * 0.10, 60) for x in np.linspace(-40, W + 40, 34)]
    ov = culm_overlay(L.shape, cl, 31, leaves=0.0, wmul=0.55, blur=1.6)
    L = L * (1 - ov) + 0.07 * ov
    out = finish(L, 1.0, 1.06, 0.7, 0.14, 8)
    save(out, 'c_test' if quick else 'cerrito', dict(water=np.clip(wat, 0, 1), sky=gblur(skym, 1.0)))
