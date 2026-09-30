# Punta Ballena v3: un camino, una familia, siete capítulos

Esta versión construye en video el guion aprobado (`GUION.md`, guion gráfico en `out/storyboard_v3/`). Se respeta el orden de la canción y el capítulo V se titula «Horizonte». Formato: 1080×1920, 30 fps, 162,8 s y la canción completa desde 0. La v2, `shared/` y `tools/` no se modifican.

## Motor
- `src/main.js`: `window.createReel(canvas, cfg)` devuelve `{ render(t), warnings, logo }`. Dibuja en Canvas 2D sobre lienzos de CPU (`willReadFrequently`), que en Chromium sin GPU tardan ≈ 250–570 ms por cuadro con el PNG incluido. `render(t)` es una función pura de t. El grano varía con el número de cuadro.
- `src/config.js`: capítulos, tiempos de la onda y las palabras.
- `src/live.js`: el esqueleto articulado de la v2, copiado sin cambios.
- `src/familia.js`: la misma familia en todos los capítulos (adulta, mayor con bastón, niño). Adapta las rutinas de `vida.js` de la v2: caminar sin patinar, juntar agua, señalar, hacerse sombra, sentarse y girar la cabeza. También dibuja a los colonos del capítulo V.
- `src/mapa.js`: el mapa de línea del capítulo II, con coordenadas reales aproximadas. Se dibuja solo y el camino avanza del Yaguarón a Punta Ballena mientras la familia camina en su punta.
- Transición única: una onda lenta e irregular de revelado de 1,5 a 2,9 s, con un borde de revelador apenas más denso. Sin destellos.
- Textos: una palabra y una glosa por capítulo, con la tinta centrada en x = 540 (medido: 539,5–540,5 px) y 720 px de ancho como máximo. No hay bandas oscuras. El cierre lleva el logo original en color, centrado por su contenido y sin nota de IA.

## Final «Hoy»
`tools/peninsula.py` traza la forma de la punta a partir de la foto de referencia privada del usuario (`privado/inspiracion/final_punta_ballena_hoy.jpg`). Separa mar y tierra con numpy (croma azul-verde y textura), cuenta la espuma como agua, vectoriza el contorno (marching squares, suavizado y Douglas-Peucker) y pinta con esos trazados una estampa original de pocas tintas planas con grano de papel. Ningún píxel de la foto entra en la ilustración. Se omiten la ruta, las casas y la forestación. La comprobación queda en `out/revelado-cancion-v3/peninsula_check.png`.

## Preparar y renderizar
```bash
python3 versiones/revelado-cancion-v3/tools/prepare.py      # copias viradas y papel → plates/ (Pillow, numpy)
python3 versiones/revelado-cancion-v3/tools/peninsula.py    # ilustración final → plates/hoy.png (además scipy, scikit-image)
node tools/export.js --dir versiones/revelado-cancion-v3 --range 0:300   # por tramos de 10 s
```
Los derivados (`plates/*`) y los renders (`out/`) quedan fuera de Git. Las fuentes y los créditos son los de la v2 (`versiones/revelado-cancion-v2/CREDITOS.md`, `plates/README.md`).
