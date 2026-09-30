#!/usr/bin/env python3
"""Copias viradas en plata para la v3 (una por capítulo) y papel. Salida en plates/ (ignorada por Git).

Fuentes: shared/assets/photos/v2/*.jpg y versiones/revelado-cancion-v2/plates/*.jpg (se leen, no se modifican).
Virado común: sombras (36,29,24), medios (146,124,102), luces (243,235,219). El grano se agrega en el render.
Uso: python3 versiones/revelado-cancion-v3/tools/prepare.py [nombre ...]
La ilustración final en color se prepara aparte con tools/peninsula.py.
"""
import os, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
V3 = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(V3))
P = os.path.join(ROOT, 'shared/assets/photos/v2/')
PL = os.path.join(ROOT, 'versiones/revelado-cancion-v2/plates/')
OUT = os.path.join(V3, 'plates')
W, H = 1080, 1920
S = np.array([36, 29, 24.]); M = np.array([146, 124, 102.]); Hh = np.array([243, 235, 219.])

# src, x0 (px del recorte tras escalar a 1920 de alto), parches clonados [x, y, w, h, dx, dy, pluma]
PLATES = {
    'mar': dict(src=P + 'aerea.jpg', x0=900),
    'tacuari': dict(src=PL + 'tacuari.jpg', x0=300),
    'espuma': dict(src=P + 'canal.jpg', x0=416),
    # la ensenada: sin el sello del archivo (arriba a la derecha) ni los turistas del negativo (abajo a la derecha)
    'barco': dict(src=P + 'rinconada.jpg', x0=1950, patch=[[760, 0, 320, 90, 0, 130, 20], [815, 1280, 265, 380, -270, 0, 40]]),
    'carape': dict(src=PL + 'carape.jpg', x0=400),
    'arena': dict(src=P + 'playa.jpg', x0=420),
}


def tone(L):
    L = np.clip(L, 0, 1)[..., None]
    a = np.clip(L * 2, 0, 1); b = np.clip(L * 2 - 1, 0, 1)
    return np.where(L < .5, S + (M - S) * a, M + (Hh - M) * b)


def load(src, x0, lo=1, hi=99):
    im = Image.open(src).convert('RGB')
    s = H / im.height
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS).crop((x0, 0, x0 + W, H))
    im = im.filter(ImageFilter.UnsharpMask(2, 60, 2))
    a = np.asarray(im).astype(float) / 255
    L = a[..., 0] * .3 + a[..., 1] * .59 + a[..., 2] * .11
    l, h = np.percentile(L, lo), np.percentile(L, hi)
    return np.clip((L - l) / (h - l), 0, 1)


def patch(L, x, y, w, h, dx, dy, f):
    src = L[y + dy:y + dy + h, x + dx:x + dx + w].copy()
    yy, xx = np.mgrid[0:h, 0:w]
    m = np.minimum.reduce([xx / f if x > 0 else xx * 0 + 9, (w - 1 - xx) / f if x + w < W else xx * 0 + 9,
                           yy / f if y > 0 else yy * 0 + 9, (h - 1 - yy) / f])
    m = np.clip(m, 0, 1); m = m * m * (3 - 2 * m)
    L[y:y + h, x:x + w] = L[y:y + h, x:x + w] * (1 - m) + src * m


def paper():
    r = np.random.default_rng(5)
    small = r.normal(0, 1, (H // 40 + 2, W // 40 + 2))
    big = np.asarray(Image.fromarray(((small - small.min()) / np.ptp(small) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)).astype(float) / 255 - .5
    fib = np.asarray(Image.fromarray(np.clip(128 + r.normal(0, 30, (H, W)), 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9))).astype(float) - 128
    img = Hh[None, None, :] - 2 + big[..., None] * 5 + fib[..., None] * 0.08
    yy, xx = np.mgrid[0:H, 0:W]
    v = np.clip(((xx - 540) / 800) ** 2 + ((yy - 960) / 1400) ** 2 - 0.4, 0, 1)
    img = img * (1 - v[..., None] * 0.06)
    return np.clip(img, 0, 255).astype(np.uint8)


def main():
    os.makedirs(OUT, exist_ok=True)
    which = sys.argv[1:]
    for k, v in PLATES.items():
        if which and k not in which: continue
        L = load(v['src'], v['x0'])
        for p in v.get('patch', []): patch(L, *p)
        Image.fromarray(np.clip(tone(L), 0, 255).astype(np.uint8)).save(os.path.join(OUT, k + '.jpg'), quality=93)
        if k == 'espuma':   # máscara de la espuma (luces del canal bajo el horizonte) para que crezca con los golpes
            yy = np.arange(H)[:, None] * np.ones((1, W))
            f = np.clip((L - 0.62) / 0.25, 0, 1) * np.clip((yy - 560) / 80, 0, 1)
            f = np.asarray(Image.fromarray((f * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2))).astype(np.uint8)
            rgba = np.zeros((H, W, 4), np.uint8); rgba[..., :3] = [248, 243, 232]; rgba[..., 3] = f
            Image.fromarray(rgba, 'RGBA').save(os.path.join(OUT, 'espuma_luz.png'))
        print(k)
    if not which or 'papel' in which:
        Image.fromarray(paper()).save(os.path.join(OUT, 'papel.jpg'), quality=94)
        print('papel')


if __name__ == '__main__':
    main()
