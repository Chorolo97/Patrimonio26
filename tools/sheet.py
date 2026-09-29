#!/usr/bin/env python3
"""Hoja de contactos: python3 tools/sheet.py <carpeta_de_pngs> <salida.png> [columnas] [ancho_miniatura]"""
import glob, sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 5
tw = int(sys.argv[4]) if len(sys.argv) > 4 else 270
th = tw * 16 // 9
fs = sorted(glob.glob(src.rstrip('/') + '/*.png'))
rows = (len(fs) + cols - 1) // cols
sh = Image.new('RGB', (cols * (tw + 6), rows * (th + 22)), (18, 18, 18))
d = ImageDraw.Draw(sh)
for i, f in enumerate(fs):
    x, y = (i % cols) * (tw + 6), (i // cols) * (th + 22)
    sh.paste(Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS), (x, y))
    d.text((x + 4, y + th + 4), f.split('/')[-1], fill=(230, 230, 230))
sh.save(out)
print(out, len(fs))
