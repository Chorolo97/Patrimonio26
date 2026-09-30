"""Ilustración ORIGINAL en color plano (tipo estampa) de Punta Ballena vista desde el aire, desde el sur.
Toma de una foto de referencia del usuario (no incluida ni calcada) sólo la idea de composición: lomo largo hacia la punta,
mar profundo a ambos lados, anillo de espuma en la punta, playa curva a la derecha. Omite ruta, casas y forestación.
Salida: bg_hoy.png (1080x1920)."""
import numpy as np, math
from PIL import Image, ImageDraw, ImageFilter

W, H = 1080, 1920
SS = 2
rng = np.random.default_rng(26)
hexc = lambda h: np.array([int(h.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)], float)
C = dict(sky0='#EFE9DB', sky1='#E3E2D6', far='#B3BAA8', far2='#98A48C', hill='#6E7C52', hill2='#62704A', olive='#7A834E', olive2='#68733F',
         ridge='#9A9A63', granite='#3B3C3A', granite2='#55544E', sand='#DCC291', sea0='#1B3753', sea1='#264D6B', sea2='#3A6887', foam='#F4F1E8')

def smooth_noise(shape, scale, seed):
    r = np.random.default_rng(seed)
    h, w = shape
    small = r.normal(0, 1, (max(2, h // scale + 2), max(2, w // scale + 2)))
    im = Image.fromarray(((small - small.min()) / (np.ptp(small)) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(im).astype(float) / 255 * 2 - 1

def jitter(pts, step=6, amp=5, seed=0):
    """subdivide a polyline and push points along the normal with smooth noise (rocky coast)"""
    r = np.random.default_rng(seed); out = []
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
        for i in range(n): out.append((x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n))
    out.append(pts[-1]); P = np.array(out)
    nz = r.normal(0, 1, len(P)); k = np.hanning(9); k /= k.sum(); nz = np.convolve(nz, k, 'same'); nz = nz / (np.abs(nz).max() + 1e-9) * amp
    nz += r.normal(0, amp * 0.25, len(P))
    T = np.gradient(P, axis=0); T /= (np.linalg.norm(T, axis=1)[:, None] + 1e-9); N = np.stack([-T[:, 1], T[:, 0]], 1)
    return [tuple(p) for p in P + N * nz[:, None]]

def mask(poly):
    im = Image.new('L', (W * SS, H * SS), 0)
    ImageDraw.Draw(im).polygon([(x * SS, y * SS) for x, y in poly], fill=255)
    return np.asarray(im.resize((W, H), Image.LANCZOS)).astype(float) / 255

def grow(m, r, shrink=False):
    im = Image.fromarray((m * 255).astype(np.uint8))
    f = ImageFilter.MinFilter(5) if shrink else ImageFilter.MaxFilter(5)
    for _ in range(max(1, r // 2)): im = im.filter(f)
    return np.asarray(im).astype(float) / 255

def blur(m, r):
    return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(float) / 255
def over(base, m, col, a=1.0):
    m = np.clip(m * a, 0, 1)[..., None]
    return base * (1 - m) + (hexc(col) if isinstance(col, str) else col) * m

yy, xx = np.mgrid[0:H, 0:W].astype(float)
HOR = 520
# mar: degradé y textura de oleaje
img = np.zeros((H, W, 3))
t = np.clip((yy - HOR) / (H - HOR), 0, 1)[..., None]
img[:] = hexc(C['sea1']) * (1 - t) + hexc(C['sea0']) * t
waves = Image.new('L', (W * SS, H * SS), 0); wd = ImageDraw.Draw(waves)
for _ in range(1500):
    x, y = rng.uniform(0, W), rng.uniform(HOR + 170, H)
    L = rng.uniform(8, 26) * (0.6 + (y - HOR) / H)
    wd.arc([(x - L) * SS, (y - L * 0.16) * SS, (x + L) * SS, (y + L * 0.16) * SS], 200, 340, fill=int(rng.uniform(70, 160)), width=int(1.3 * SS))
wv = np.asarray(waves.resize((W, H), Image.LANCZOS)).astype(float) / 255
img = over(img, wv, C['sea2'], 0.9)

# cielo con bruma
sky = mask([(0, 0), (W, 0), (W, HOR + 2), (0, HOR + 2)])
ts = np.clip(yy / HOR, 0, 1)[..., None]
img = img * (1 - sky[..., None]) + (hexc(C['sky0']) * (1 - ts) + hexc(C['sky1']) * ts) * sky[..., None]

for i in range(9):
    cy = rng.uniform(80, HOR - 60); cx = rng.uniform(-100, W); L = rng.uniform(260, 620); th = rng.uniform(5, 14)
    streak = mask([(cx, cy), (cx + L * .5, cy - th), (cx + L, cy), (cx + L * .5, cy + th * .5)])
    img = over(img, blur(streak, 5), '#F7F4EC', rng.uniform(.35, .7))
# lomas lejanas (tres franjas)
xs = np.linspace(0, W, 60)
def ridge_band(y0, amp, seed):
    r = np.random.default_rng(seed); k = np.hanning(9); k /= k.sum()
    top = y0 + np.convolve(r.normal(0, 1, len(xs)), k, 'same') * amp
    return mask([(x, y) for x, y in zip(xs, top)] + [(W, H), (0, H)])
for y0, amp, col, seed in [(HOR - 8, 14, 'far', 1), (HOR + 14, 16, 'far2', 2), (HOR + 46, 18, 'hill', 3)]:
    img = over(img, ridge_band(y0, amp, seed) * (yy < 694 + 10 * np.sin(xx / 60) + xx * 0.03), C[col])

# tierra: interior + la punta (contorno dibujado a mano, ver docstring)
left_coast = [(330, 700), (310, 760), (285, 805), (300, 860), (350, 925), (380, 1000), (395, 1090), (410, 1180), (402, 1262), (424, 1340), (440, 1420), (428, 1488), (446, 1538), (430, 1572), (452, 1606), (490, 1632), (530, 1652)]
right_coast = [(530, 1652), (576, 1650), (612, 1630), (640, 1600), (636, 1566), (656, 1506), (670, 1440), (690, 1370), (700, 1290), (716, 1210), (704, 1130), (718, 1050), (694, 985), (702, 935), (664, 902)]
beach_in = [(664, 902), (720, 890), (800, 872), (880, 846), (960, 812), (1030, 780), (1080, 756)]
coast = jitter(left_coast, 5, 7, 4) + jitter(right_coast, 5, 7, 5)[1:]
land_poly = coast + beach_in[1:] + [(1080, 700), (1080, HOR + 60), (0, HOR + 60), (0, 690)] + [(x, 690 + 10 * math.sin(x / 60) + x * 0.03) for x in range(20, 330, 20)]
land = mask(land_poly)
beach_out = [(652, 918), (730, 912), (810, 896), (890, 872), (970, 838), (1040, 804), (1080, 786)]
beach = mask(beach_in + beach_out[::-1])
beach = np.clip(beach - land * 0.0, 0, 1)
# costa lejana izquierda (bahía): la tierra interior termina en una playa fina a y≈700
bayline = mask([(x, 688 + 10 * math.sin(x / 60) + x * 0.03) for x in range(0, 341, 20)] + [(x, 702 + 12 * math.sin(x / 60) + x * 0.03) for x in range(340, -1, -20)]) * (1 - land)

# islotes de la punta
isl = np.zeros((H, W))
for (cx, cy, r) in [(560, 1682, 20), (606, 1726, 11), (500, 1706, 10), (642, 1652, 8), (462, 1640, 7), (590, 1780, 6)]:
    a = np.linspace(0, 2 * np.pi, 36); rr = r * (1 + np.convolve(np.random.default_rng(cx).normal(0, .12, 36), np.ones(3) / 3, 'same'))
    isl = np.maximum(isl, mask([(cx + q * math.cos(b), cy + q * .7 * math.sin(b)) for b, q in zip(a, rr)]))
rock = np.maximum(land, isl)
# campo de "distancia" suave desde la roca hacia el mar
D1, D2, D3 = blur(rock, 6), blur(rock, 16), blur(rock, 34)
tipw = np.clip(1 - np.hypot(xx - 545, (yy - 1640) * 0.85) / 430, 0, 1)
flank = np.clip((yy - 880) / 760, 0, 1)
seam = (1 - rock) * (yy > 740) * (1 - blur(bayline, 20) * 4).clip(0, 1)
# agua somera: leve tono más claro junto a la costa rocosa
img = over(img, np.clip(D3 * 2.2, 0, 1) * seam * (1 - beach), C['sea2'], 0.45)
# espuma en encaje: se rompe hacia afuera; más ancha en la punta
fine = smooth_noise((H, W), 3, 8) * 0.6 + smooth_noise((H, W), 7, 9) * 0.4
lace = np.clip((D1 * 1.6 + D2 * (0.6 + 1.6 * tipw) + D3 * 2.4 * tipw) * (0.55 + 0.45 * flank) + fine * 0.35 - 0.32, 0, 1)
lace = np.clip(lace * 3.0, 0, 1) * seam
# surf lines on the beach
bd = blur(beach, 5)
bline = np.clip((bd - 0.05) * 6, 0, 1) * (1 - beach) * (1 - land) * (yy > 700)
bline2 = np.clip(1 - np.abs(blur(beach, 16) - 0.12) * 30, 0, 1) * (1 - beach) * (1 - land) * (yy > 700) * 0.5
img = over(img, np.maximum(lace, np.maximum(bline, bline2)), C['foam'])
img = over(img, isl, C['granite'])
# arena, tierra (granito en el borde, olivo adentro, lomo claro)
img = over(img, beach, C['sand'])
img = over(img, bayline, C['sand'])
img = over(img, land, C['granite'])
# el borde rocoso sólo existe hacia el mar abierto (no junto a la playa ni tierra adentro)
M2 = np.clip(land + blur(beach, 2) * 1.5 + (yy < 712), 0, 1)
Di = blur(M2, 10); Dj = blur(M2, 22)
rim_n = smooth_noise((H, W), 12, 9) * 0.5 + smooth_noise((H, W), 4, 19) * 0.5
g2 = np.clip((Di - 0.62 - rim_n * 0.12) * 12, 0, 1) * land
img = over(img, g2, C['granite2'])
ol = np.clip((Dj - 0.72 - rim_n * 0.14) * 10, 0, 1) * land
img = over(img, ol, C['olive'])
# matorral: manchas más oscuras en el olivo (monte nativo bajo)
scrub = (smooth_noise((H, W), 10, 12) > 0.45) * ol
img = over(img, np.asarray(Image.fromarray((scrub * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(float) / 255, C['olive2'], .8)
# modelado del lomo: ladera oeste iluminada, ladera este en sombra suave (sin franja dura)
spx = np.interp(yy, [700, 820, 940, 1060, 1180, 1300, 1420, 1540], [600, 590, 582, 570, 572, 566, 556, 548])
side = np.clip((xx - spx) / 60, -1, 1)
lit = blur(np.clip(-side, 0, 1) * ol, 10); shade = blur(np.clip(side, 0, 1) * ol, 10)
img = over(img, lit * np.clip((yy - 700) / 120, 0, 1), C['ridge'], .55)
img = over(img, shade * np.clip((yy - 700) / 120, 0, 1), C['olive2'], .45)
crest = np.clip(1 - np.abs(xx - spx) / 5, 0, 1) * ol * np.clip((yy - 760) / 200, 0, 1) * np.clip((1560 - yy) / 80, 0, 1)
# afloramientos de granito sobre el lomo (sin caminos ni construcciones)
rk = np.zeros((H, W)); r2 = np.random.default_rng(77)
for i in range(46):
    y = r2.uniform(760, 1560); x = np.interp(y, [700, 1060, 1300, 1540], [600, 570, 566, 548]) + r2.normal(0, 38) * (1.2 - (y - 700) / 1100)
    rr = r2.uniform(3, 9); a = np.linspace(0, 2 * np.pi, 14); q = rr * (1 + r2.normal(0, .25, 14))
    rk = np.maximum(rk, mask([(x + u * math.cos(b), y + u * .65 * math.sin(b)) for b, u in zip(a, q)]))
img = over(img, blur(rk, 0.6) * ol, C['granite2'], .85)
img = over(img, blur(np.roll(rk, -2, 0), 0.6) * ol * (1 - rk), '#8E8C7A', .5)
# lomas interiores sobre la tierra (continúan la banda "hill")
img = over(img, land * (yy < 700) * np.clip((700 - yy) / 40, 0, 1), C['hill'], 0.9)
img = over(img, (smooth_noise((H, W), 12, 30) > 0.35) * land * (yy < 690) * (yy > HOR + 60), C['hill2'], .7)

# grano de papel sutil y viñeta cálida
g = rng.normal(0, 1, (H, W))
g = np.asarray(Image.fromarray(np.clip(128 + g * 40, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(float) - 128
paper = smooth_noise((H, W), 60, 40)
img = img + g[..., None] * 0.13 + paper[..., None] * 4
v = np.clip(((xx - 540) / 760) ** 2 + ((yy - 960) / 1300) ** 2 - 0.45, 0, 1)
img = img * (1 - v[..., None] * 0.12) + np.array([40, 30, 20]) * v[..., None] * 0.12
# continuidad con la copia de plata: 15 % del virado sepia sobre el color
Lm = (img[..., 0] * .3 + img[..., 1] * .59 + img[..., 2] * .11)[..., None] / 255
sep = np.where(Lm < .5, np.array([36, 29, 24.]) + (np.array([146, 124, 102.]) - [36, 29, 24]) * Lm * 2, np.array([146, 124, 102.]) + (np.array([243, 235, 219.]) - [146, 124, 102]) * (Lm * 2 - 1))
img = img * .85 + sep * .15
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save('bg_hoy.png')
print('ok')
