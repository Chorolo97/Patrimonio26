#!/usr/bin/env python3
"""
Rasgos de audio por cuadro para que la animación siga la música REAL (no se sincroniza con palabras).
Uso: python3 tools/audio_features.py [inicio_s] [duracion_s] [fps]  (por defecto 47.8 40 30)
Requiere numpy y un ffmpeg (variable FFMPEG o 'ffmpeg' en el PATH).
Salida: shared/audio/features.json
"""
import json, os, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'shared', 'assets', 'audio', 'punta_ballena.mp3')
OUT = os.environ.get('OUT') or os.path.join(ROOT, 'shared', 'audio', 'features.json')
FF = os.environ.get('FFMPEG', 'ffmpeg')
start = float(sys.argv[1]) if len(sys.argv) > 1 else 47.8
dur = float(sys.argv[2]) if len(sys.argv) > 2 else 40.0
fps = int(sys.argv[3]) if len(sys.argv) > 3 else 30
SR = 22050

raw = subprocess.run([FF, '-v', 'error', '-i', SRC, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
song_dur = len(x) / SR

n = int(round(dur * fps))
hop = SR / fps
nfft = 2048
win = np.hanning(nfft)
freqs = np.fft.rfftfreq(nfft, 1 / SR)
bands = {'low': (40, 250), 'mid': (250, 2000), 'high': (2000, 8000), 'voice': (300, 3400)}
feat = {k: [] for k in ['rms', 'low', 'mid', 'high', 'voice', 'flux', 'centroid']}
prev = None
for i in range(n):
    c = int((start + i / fps) * SR)
    seg = x[max(0, c - nfft // 2): c + nfft // 2]
    if len(seg) < nfft:
        seg = np.pad(seg, (0, nfft - len(seg)))
    mag = np.abs(np.fft.rfft(seg * win))
    feat['rms'].append(float(np.sqrt(np.mean(seg ** 2))))
    for k, (a, b) in bands.items():
        feat[k].append(float(np.sqrt(np.mean(mag[(freqs >= a) & (freqs < b)] ** 2))))
    lm = np.log1p(mag)
    feat['flux'].append(0.0 if prev is None else float(np.sum(np.maximum(0, lm - prev))))
    prev = lm
    feat['centroid'].append(float(np.sum(freqs * mag) / (np.sum(mag) + 1e-9)))

def norm(v):
    v = np.array(v)
    lo, hi = np.percentile(v, 2), np.percentile(v, 99)
    return np.clip((v - lo) / (hi - lo + 1e-9), 0, 1)

def smooth(v, attack, release):
    out, s = [], 0.0
    for val in v:
        k = attack if val > s else release
        s += (val - s) * k
        out.append(s)
    return np.array(out)

out = {'fps': fps, 'start': start, 'duration': dur, 'frames': n, 'songDuration': round(song_dur, 3)}
for k in feat:
    v = norm(feat[k])
    out[k] = [round(float(a), 4) for a in v]
    out[k + 'Smooth'] = [round(float(a), 4) for a in smooth(v, 0.25, 0.04)]
# Estructura medida por análisis de señal (espectrograma), en segundos DEL REEL para el corte 47.8 s.
# No se escucharon las palabras: son tramos de voz hablada/cantada/instrumental, no sincronía con la letra.
markers_song = [
    {'t': 38.0, 'label': 'inicio tramo de voz hablada (recitado)'},
    {'t': 60.6, 'label': 'fin del recitado'},
    {'t': 60.9, 'label': 'respiro de guitarra'},
    {'t': 62.85, 'label': 'entra la voz cantada (estrofa)'},
    {'t': 86.3, 'label': 'termina la última frase cantada'},
    {'t': 88.4, 'label': 'vuelve el patrón de guitarra (interludio)'},
]
out['markers'] = [dict(m, t=round(m['t'] - start, 2)) for m in markers_song if start <= m['t'] <= start + dur]
if 38.0 < start < 60.6:
    out['markers'].insert(0, {'t': 0.0, 'label': 'el corte empieza dentro del tramo de voz hablada (recitado)'})
out['note'] = 'Rasgos normalizados 0..1 por cuadro. *Smooth: envolvente con ataque rápido y liberación lenta. markers: tiempos del reel (s).'
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('ok', OUT, n, 'cuadros', out['markers'])
