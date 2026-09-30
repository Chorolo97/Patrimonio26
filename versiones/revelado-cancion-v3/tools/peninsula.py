#!/usr/bin/env python3
"""Final «Hoy»: ilustración ORIGINAL plana (tipo estampa) de Punta Ballena vista desde el aire, desde el sur.

La FORMA de la costa se traza de la foto de referencia privada del usuario (privado/inspiracion/final_punta_ballena_hoy.jpg):
  1. se separa mar / tierra con numpy (croma azul-verde menos rojo + textura local: el mar es liso y azul);
  2. la espuma blanca pegada al mar se cuenta como agua (así aparecen los dedos de roca y las piedras sueltas de la punta);
  3. el contorno se extrae con marching squares, se suaviza, se simplifica (Douglas-Peucker) y se escala al cuadro 1080×1920;
  4. con esos trazados vectoriales se pinta una estampa nueva con pocas tintas planas y grano de papel.
Ningún píxel de la foto entra en la ilustración: sólo el contorno. Se omiten la ruta, las casas y la forestación.

Salidas (ignoradas por Git):
  plates/hoy.png          ilustración 1080×1920
  plates/hoy_shape.json   trazados en coordenadas de cuadro (tierra, islotes, playas, espuma) y la punta
  out/revelado-cancion-v3/peninsula_check.png  comprobación: contorno trazado sobre la referencia | sobre la ilustración
Requiere numpy, Pillow, scipy y scikit-image (sólo para preparar; el video no los usa).
"""
import json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd
from skimage import measure

HERE = os.path.dirname(os.path.abspath(__file__))
V3 = os.path.dirname(HERE)
ROOT = os.path.dirname(os.path.dirname(V3))
REF = os.path.join(ROOT, 'privado/inspiracion/final_punta_ballena_hoy.jpg')
OUT_PLATE = os.path.join(V3, 'plates')
OUT_CHECK = os.path.join(ROOT, 'out/revelado-cancion-v3')
W, H = 1080, 1920
S = 2.7                      # escala foto → cuadro (uniforme: la forma no se deforma)
HOR_PY, HOR_Y = 22, 520      # la línea del horizonte de la foto (y≈22) cae en y=520 del cuadro
OX = (W - 402 * S) / 2
OY = HOR_Y - HOR_PY * S
fx = lambda px: OX + px * S
fy = lambda py: OY + py * S


# ---------------------------------------------------------------- 1 · segmentación
def segment(a):
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    L = a.mean(2); mx = a.max(2); mn = a.min(2)
    sd = np.sqrt(np.maximum(0, nd.uniform_filter(L ** 2, 7) - nd.uniform_filter(L, 7) ** 2))
    chroma = nd.gaussian_filter(((a[..., 2] - a[..., 0]) + (a[..., 1] - a[..., 0])) / 2, 1.6)   # canal azul/verde sobre el rojo
    Ls = nd.gaussian_filter(L, 0.8)
    TOP = 112                                          # sobre la playa del fondo a la izquierda todo es tierra (monte, lomas)
    foam = (Ls > 78) & ((mx - mn) < 62) & ~(a[..., 0] > a[..., 2] + 8)
    smooth_sea = (((sd < 7.5) & (chroma > 12)) | ((chroma > 42) & (sd < 14))) & (yy >= TOP)

    def touching_edges(m, right_from=200):
        lab, _ = nd.label(m)
        ids = set(lab[-1, :]) | set(lab[TOP:, 0]) | set(lab[right_from:, -1]); ids.discard(0)
        return np.isin(lab, list(ids))
    sea0 = touching_edges(smooth_sea)
    near = nd.binary_dilation(sea0, iterations=5)
    fl, _ = nd.label(foam & (yy >= TOP))
    ids = [i for i in np.unique(fl[near & (fl > 0)]) if i and near[fl == i].mean() > 0.35]
    surf = np.isin(fl, ids)
    # en la punta (rocas y espuma mezcladas) la espuma separa las piedras sueltas
    tipzone = (yy > 395) | (nd.distance_transform_edt(~sea0) < 7)
    surf |= foam & tipzone & (yy >= TOP)
    water = sea0 | surf
    water = (water | nd.binary_closing(water, iterations=1)) & (yy >= TOP)
    sea = touching_edges(water)
    land = ~sea
    sl, ns = nd.label(sea)
    for i, s in enumerate(nd.sum(sea, sl, range(1, ns + 1))):
        if s < 60: land[sl == i + 1] = True            # charcos sueltos dentro de la tierra
    land &= ~((yy > 486))                             # la foto corta la punta: se deja que termine en el agua
    land = nd.binary_opening(land, iterations=1) | (land & (yy < 380))
    ll, nl = nd.label(land); sizes = nd.sum(land, ll, range(1, nl + 1))
    main = ll == (1 + int(np.argmax(sizes)))
    dmain = nd.distance_transform_edt(~main)
    isl = np.zeros_like(main)
    for i, s in enumerate(sizes):
        m = ll == i + 1
        if s < sizes.max() and s >= 4 and dmain[m].min() < 24 and np.nonzero(m)[1].min() > 60: isl |= m
    sea = ~(main | isl)
    surf &= sea
    dsea = nd.distance_transform_edt(~sea)
    sand = (a[..., 0] > a[..., 2] + 8) & (Ls > 70)
    # playa curva de la derecha (sólo la franja junto al agua) y playa del fondo a la izquierda
    rbeach = nd.binary_closing(sand & (xx > 272) & (yy > 185) & (yy < 262), iterations=2) & main & (dsea < 16)
    rbeach = nd.binary_opening(rbeach, iterations=1)
    lb, nb = nd.label(rbeach)
    if nb: rbeach = lb == (1 + int(np.argmax(nd.sum(rbeach, lb, range(1, nb + 1)))))
    tlbeach = main & (yy >= TOP - 5) & (yy < 123) & (xx < 134) & (dsea < 5.5)
    return dict(main=main, isl=isl, sea=sea, surf=surf, rbeach=rbeach, tlbeach=tlbeach)


# ---------------------------------------------------------------- 2 · vectorización
def dp(pts, eps):
    """Douglas-Peucker iterativo"""
    if len(pts) < 3: return pts
    keep = np.zeros(len(pts), bool); keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        a, b = pts[i], pts[j]; ab = b - a; n = np.hypot(*ab) or 1e-9
        seg = pts[i + 1:j]
        if len(seg) == 0: continue
        d = np.abs(ab[0] * (seg[:, 1] - a[1]) - ab[1] * (seg[:, 0] - a[0])) / n
        k = int(np.argmax(d))
        if d[k] > eps:
            keep[i + 1 + k] = True; stack += [(i, i + 1 + k), (i + 1 + k, j)]
    return pts[keep]


def vectorize(mask, sigma=0.75, smooth=1.2, eps=0.3, min_len=6):
    """contornos cerrados del borde de la máscara, en coordenadas de cuadro"""
    f = nd.gaussian_filter(np.pad(mask.astype(float), 2), sigma)
    polys = []
    for c in measure.find_contours(f, 0.5):
        if len(c) < min_len: continue
        c = c - 2                                           # quitar el margen
        closed = np.allclose(c[0], c[-1])
        if closed:                                          # suavizado circular a lo largo del trazo
            k = max(1, int(3 * smooth)); cc = np.concatenate([c[-k - 1:-1], c, c[1:k + 1]])
            cc = nd.gaussian_filter1d(cc, smooth, axis=0)[k:-k]
        else:
            cc = nd.gaussian_filter1d(c, smooth, axis=0, mode='nearest')
        cc = dp(cc, eps)
        polys.append([(round(fx(x), 1), round(fy(y), 1)) for y, x in cc])
    return polys


SS = 3
def raster(polys, extra=None):
    im = Image.new('L', (W * SS, H * SS), 0); d = ImageDraw.Draw(im)
    for p in polys:
        if len(p) >= 3: d.polygon([(x * SS, y * SS) for x, y in p], fill=255)
    if extra: extra(d)
    return np.asarray(im.resize((W, H), Image.LANCZOS)).astype(float) / 255


# ---------------------------------------------------------------- 3 · estampa
hexc = lambda h: np.array([int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)], float)
C = dict(sky0='#EFE9DB', sky1='#E4E2D5', far='#B7BDAA', far2='#9DA78E', hill='#75835A', hill2='#687649',
         olive='#7C8550', olive2='#69743F', lit='#9C9C66', granite='#3A3B39', granite2='#57564F', lichen='#8E8C7A',
         sand='#DDC393', sand2='#CBAF7F', sea0='#18324C', sea1='#244A68', sea2='#35627F', shallow='#3F7290', foam='#F4F1E8')


def noise(shape, scale, seed):
    r = np.random.default_rng(seed); h, w = shape
    small = r.normal(0, 1, (max(2, h // scale + 2), max(2, w // scale + 2)))
    im = Image.fromarray(((small - small.min()) / np.ptp(small) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(im).astype(float) / 255 * 2 - 1


def blur(m, r): return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) / 255
def over(img, m, col, a=1.0):
    m = np.clip(m * a, 0, 1)[..., None]
    return img * (1 - m) + hexc(col) * m


CREST = [(214, 128), (207, 190), (201, 250), (197, 300), (190, 345), (183, 385), (178, 415), (182, 470)]
def spine_x(y):
    c = np.array([(fx(a), fy(b)) for a, b in CREST])
    return np.interp(y, c[:, 1], c[:, 0])


def paint(shape):
    rng = np.random.default_rng(26)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    land = raster(shape['land'] + shape['islets'])
    main = raster(shape['land'])
    isl = np.clip(land - main, 0, 1)
    beach = raster(shape['beach'])
    surf = raster(shape['surf'])
    photo_bottom = fy(486)
    # --- mar: dos tintas y trazos cortos de oleaje (más largos hacia abajo: perspectiva)
    t = np.clip((yy - HOR_Y) / (H - HOR_Y), 0, 1)[..., None]
    img = hexc(C['sea1']) * (1 - t) + hexc(C['sea0']) * t
    wv = Image.new('L', (W * 2, H * 2), 0); wd = ImageDraw.Draw(wv)
    for _ in range(1700):
        x, y = rng.uniform(0, W), rng.uniform(HOR_Y + 220, H)
        L = rng.uniform(7, 22) * (0.55 + (y - HOR_Y) / H)
        wd.arc([(x - L) * 2, (y - L * 0.15) * 2, (x + L) * 2, (y + L * 0.15) * 2], 200, 340, fill=int(rng.uniform(60, 150)), width=3)
    img = over(img, np.asarray(wv.resize((W, H), Image.LANCZOS)).astype(float) / 255, C['sea2'], 0.85)
    # agua somera junto a la costa (una tinta, borde suave)
    D8, D20, D44 = blur(land, 8), blur(land, 20), blur(land, 44)
    img = over(img, np.clip(D44 * 2.4 - 0.1, 0, 1) * (1 - land) * (yy > HOR_Y + 200), C['shallow'], 0.38)
    # --- espuma: la de la foto (vectorizada) + un encaje que rodea rocas y costa; más ancha en la punta
    tip = shape['tip']
    tipw = np.clip(1 - np.hypot(xx - tip[0], (yy - tip[1]) * 0.9) / 330, 0, 1)
    fine = noise((H, W), 3, 8) * 0.6 + noise((H, W), 7, 9) * 0.4
    lace = np.clip((D8 * 1.5 + D20 * (0.4 + 1.5 * tipw)) + fine * 0.33 - 0.36, 0, 1)
    lace = np.clip(lace * 3.2, 0, 1) * (1 - land) * (1 - blur(beach, 6) * 1.5).clip(0, 1) * (yy > HOR_Y + 205)
    streak = np.clip((noise((H, W), 4, 41) * 0.6 + noise((H, W), 2, 42) * 0.4 + 0.28) * 2.6, 0, 1)
    lace = lace * (0.35 + 0.65 * streak)
    surf_l = streak * np.clip(surf * np.clip((fine + 0.22) * 2.6, 0, 1), 0, 1) * (1 - land) * 0.92
    # rompiente de las playas: dos líneas paralelas a la arena
    bd = blur(beach, 4)
    bl1 = np.clip((bd - 0.04) * 7, 0, 1) * (1 - beach) * (1 - land)
    bl2 = np.clip(1 - np.abs(blur(beach, 14) - 0.10) * 32, 0, 1) * (1 - beach) * (1 - land) * 0.55
    img = over(img, np.maximum.reduce([lace, surf_l, bl1, bl2]), C['foam'])
    # --- tierra
    img = over(img, beach, C['sand'])
    img = over(img, beach * np.clip((noise((H, W), 5, 3) > 0.35) * 1.0, 0, 1) * 0.5, C['sand2'])
    img = over(img, land * (1 - beach), C['granite'])
    xs = np.linspace(0, W, 72)
    def ridge(y0, amp, seed, fr=9):
        r = np.random.default_rng(seed); k = np.hanning(fr); k /= k.sum()
        top = y0 + np.convolve(r.normal(0, 1, len(xs)), k, 'same') * amp
        return raster([[(x, y) for x, y in zip(xs, top)] + [(W, H), (0, H)]])
    # borde rocoso por distancia real a la costa: ancho y quebrado del lado oeste (acantilados oscuros), más angosto al este;
    # junto a las playas no hay roca. La punta (desde donde termina el pasto) es toda granito.
    firm = (land > 0.5) & (beach < 0.5)
    dsea = nd.distance_transform_edt(firm | (beach > 0.5) | (yy < fy(128)))
    rim = noise((H, W), 30, 9) * 0.6 + noise((H, W), 9, 19) * 0.4
    spx = spine_x(yy)
    west = np.clip((spx - xx) / 120, 0, 1)
    w_out = 7 + 6 * west + 7 * rim
    w_in = 24 + 22 * west + 18 * rim
    grass_end = fy(392) + 46 * noise((H, W), 26, 23) + 14 * noise((H, W), 7, 24) - np.minimum(0.0035 * (xx - spx) ** 2, 70)
    g2 = np.clip((dsea - w_out) / 3, 0, 1) * firm
    img = over(img, g2, C['granite2'])
    ol = np.clip((dsea - w_in) / 4, 0, 1) * firm * np.clip((grass_end - yy) / 8, 0, 1)
    img = over(img, ol, C['olive'])
    # lomo: el filo corre por el eje de la punta (se sigue la cresta de la foto, sin dibujar la ruta)
    side = np.clip((xx - spx) / 70, -1, 1)
    band = np.clip((yy - fy(150)) / 90, 0, 1)
    img = over(img, blur(np.clip(-side, 0, 1) * ol, 10) * band, C['lit'], 0.5)
    img = over(img, blur(np.clip(side, 0, 1) * ol, 10) * band, C['olive2'], 0.45)
    # monte nativo bajo: matas agrupadas de una tinta más oscura, en las laderas
    scrub = ((noise((H, W), 18, 12) * 0.7 + noise((H, W), 6, 13) * 0.3) > 0.46) * ol * np.clip(np.abs(xx - spx) / 60, 0, 1)
    img = over(img, blur(scrub, 1.5), C['olive2'], 0.75)
    # afloramientos de granito: bloques sueltos junto al borde rocoso
    rk = Image.new('L', (W * 2, H * 2), 0); rd = ImageDraw.Draw(rk); r2 = np.random.default_rng(77)
    n = 0
    while n < 60:
        y = r2.uniform(fy(165), tip[1]); x = r2.uniform(0, W)
        yi, xi = int(min(H - 1, y)), int(min(W - 1, max(0, x)))
        if not firm[yi, xi] or not (w_in[yi, xi] - 4 < dsea[yi, xi] < w_in[yi, xi] + 26): continue
        n += 1
        rr = r2.uniform(3, 8); a = np.linspace(0, 2 * np.pi, 12); q = rr * (1 + r2.normal(0, .25, 12))
        rd.polygon([((x + u * math.cos(b)) * 2, (y + u * .62 * math.sin(b)) * 2) for b, u in zip(a, q)], fill=255)
    rk = np.asarray(rk.resize((W, H), Image.LANCZOS)).astype(float) / 255
    img = over(img, rk * firm, C['granite2'], 0.9)
    img = over(img, np.roll(rk, -2, 0) * firm * (1 - rk), C['lichen'], 0.5)
    # la roca de la punta: vetas de liquen claro sobre el granito
    tipg = firm * (yy > grass_end) * ((noise((H, W), 7, 31) > 0.3) & (noise((H, W), 3, 32) > -0.1))
    img = over(img, blur(tipg * 1.0, 1.0), C['granite'], 0.55)
    moss = firm * (yy > grass_end - 20) * (dsea > w_in * 0.7) * (noise((H, W), 11, 33) > 0.25)
    img = over(img, blur(moss * 1.0, 1.2), C['olive2'], 0.65)
    lich = firm * (yy > grass_end) * (noise((H, W), 3, 34) > 0.62)
    img = over(img, lich * 1.0, C['lichen'], 0.5)
    img = over(img, np.clip(isl - np.roll(isl, 2, 0), 0, 1), C['lichen'], 0.45)
    # --- tierra adentro, detrás de la playa del fondo: lomas redondeadas en franjas, cada vez más azuladas hacia el horizonte
    upper = (1 - ridge(fy(117), 7, 10, 11)) * (1 - beach)
    for y0, amp, col, seed, fr in [(fy(26), 7, 'far', 17, 15), (fy(33), 9, 'far2', 16, 13), (fy(46), 10, '#8C9A80', 15, 11),
                                   (fy(62), 11, 'hill', 14, 9), (fy(80), 12, 'hill2', 13, 9), (fy(98), 11, 'hill', 12, 11)]:
        img = over(img, ridge(y0, amp, seed, fr) * upper, C.get(col, col), 1.0)
    # --- cielo con bruma y lomas lejanas
    sky = (yy < HOR_Y).astype(float)
    ts = np.clip(yy / HOR_Y, 0, 1)[..., None]
    skyc = hexc(C['sky0']) * (1 - ts) + hexc(C['sky1']) * ts
    img = img * (1 - sky[..., None]) + skyc * sky[..., None]
    for y0, amp, col, seed in [(HOR_Y - 26, 9, 'far', 1), (HOR_Y - 6, 11, 'far2', 2)]:
        img = over(img, ridge(y0, amp, seed, 13) * (yy < HOR_Y + 30) * (1 - main * (yy > HOR_Y + 8)), C[col], 0.95)
    for i in range(7):
        cy = rng.uniform(90, HOR_Y - 90); cx = rng.uniform(-100, W); L = rng.uniform(260, 600); th = rng.uniform(5, 12)
        st = raster([[(cx, cy), (cx + L * .5, cy - th), (cx + L, cy), (cx + L * .5, cy + th * .5)]])
        img = over(img, blur(st, 5), '#F7F4EC', rng.uniform(.3, .6))
    # --- papel: grano, fibra, viñeta cálida y 15 % del virado sepia (continuidad con la copia de plata)
    g = rng.normal(0, 1, (H, W))
    g = np.asarray(Image.fromarray(np.clip(128 + g * 40, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float) - 128
    img = img + g[..., None] * 0.14 + noise((H, W), 60, 40)[..., None] * 4
    v = np.clip(((xx - 540) / 760) ** 2 + ((yy - 960) / 1300) ** 2 - 0.45, 0, 1)
    img = img * (1 - v[..., None] * 0.12) + np.array([40, 30, 20]) * v[..., None] * 0.12
    Lm = (img[..., 0] * .3 + img[..., 1] * .59 + img[..., 2] * .11)[..., None] / 255
    sep = np.where(Lm < .5, np.array([36, 29, 24.]) + (np.array([146, 124, 102.]) - [36, 29, 24]) * Lm * 2,
                   np.array([146, 124, 102.]) + (np.array([243, 235, 219.]) - [146, 124, 102]) * (Lm * 2 - 1))
    img = img * .85 + sep * .15
    return np.clip(img, 0, 255).astype(np.uint8)


def check_image(a, shape, illu):
    """izquierda: referencia (sólo para comprobar, no se publica) con el contorno trazado; derecha: la ilustración con el mismo contorno"""
    ref = Image.fromarray(a.astype(np.uint8)).resize((round(402 * S), round(497 * S)), Image.LANCZOS)
    left = Image.new('RGB', (W, H), (20, 20, 20)); left.paste(ref, (round(OX), round(OY)))
    right = Image.fromarray(illu).convert('RGB')
    for im in (left, right):
        d = ImageDraw.Draw(im)
        for p in shape['land'] + shape['islets']: d.line(p + [p[0]], fill=(255, 40, 40), width=3)
        for p in shape['beach']: d.line(p + [p[0]], fill=(255, 200, 0), width=2)
    y0, y1 = HOR_Y - 60, H
    panel = Image.new('RGB', (W * 2 + 30, y1 - y0 + 70), (18, 18, 18))
    panel.paste(left.crop((0, y0, W, y1)), (0, 70)); panel.paste(right.crop((0, y0, W, y1)), (W + 30, 70))
    d = ImageDraw.Draw(panel)
    d.text((20, 20), 'Referencia del usuario (privada, solo control) + contorno trazado', fill=(235, 235, 235))
    d.text((W + 50, 20), 'Ilustracion original v3 (plates/hoy.png) + el mismo contorno', fill=(235, 235, 235))
    return panel.resize((panel.width // 2, panel.height // 2), Image.LANCZOS)


def main():
    if not os.path.exists(REF):
        sys.exit('Falta la foto de referencia privada: ' + REF)
    a = np.asarray(Image.open(REF).convert('RGB')).astype(float)
    assert a.shape[:2] == (497, 402), a.shape
    m = segment(a)
    shape = {
        'land': vectorize(m['main'], smooth=1.1, eps=0.28),
        'islets': vectorize(m['isl'], sigma=0.6, smooth=0.8, eps=0.25, min_len=4),
        'beach': vectorize(m['rbeach'], smooth=2.0, eps=0.3) + vectorize(m['tlbeach'], smooth=2.0, eps=0.3),
        'surf': vectorize(m['surf'], sigma=0.7, smooth=0.9, eps=0.3, min_len=5),
        'map': {'scale': S, 'ox': OX, 'oy': OY, 'horizon': HOR_Y},
    }
    ys, xs = np.nonzero(m['main'])
    k = ys > ys.max() - 26                                # la punta: el extremo sur de la tierra principal
    shape['tip'] = [round(float(fx(xs[k].mean())), 1), round(float(fy(ys.max())), 1)]
    # donde puede pararse la familia: tierra firme a unos pasos del extremo
    tm = m['main'] & (nd.distance_transform_edt(m['main']) > 3)
    ys2, xs2 = np.nonzero(tm); j = int(np.argmax(ys2))
    shape['stand'] = [round(float(fx(xs2[j])), 1), round(float(fy(ys2[j])), 1)]
    os.makedirs(OUT_PLATE, exist_ok=True); os.makedirs(OUT_CHECK, exist_ok=True)
    illu = paint(shape)
    Image.fromarray(illu).save(os.path.join(OUT_PLATE, 'hoy.png'))
    json.dump(shape, open(os.path.join(OUT_PLATE, 'hoy_shape.json'), 'w'))
    check_image(a, shape, illu).save(os.path.join(OUT_CHECK, 'peninsula_check.png'))
    print('tierra', len(shape['land']), 'islotes', len(shape['islets']), 'playas', len(shape['beach']), 'espuma', len(shape['surf']),
          'vértices', sum(len(p) for p in shape['land']), 'punta', shape['tip'], 'pie', shape['stand'])


if __name__ == '__main__':
    main()
