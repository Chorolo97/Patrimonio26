# Validación de entrega

## Estado tras «más vida» (30/09/2026)

La tabla de exportación de abajo corresponde a la versión anterior: hay que volver a correr `tools/review.js` y exportar. Determinismo comprobado 87 → 106 → 87 s (PNG idéntico). Tiempo por cuadro medido en SwiftShader: 300–550 ms en tramos normales, 640–720 ms en la coda con cierre, 830–910 ms en cuadros de relevo (la versión anterior ya medía 620–830 ms en relevos).

## Antes de exportar

- Capturas de control de todas las transiciones, introducción, apariciones, espuma, arena y cierre; se repitieron las zonas retocadas. Las capturas y los informes automáticos quedan en `out/revelado-cancion-v2/review/`, fuera de Git.
- Revisión visual de integración de las cuatro matrices planas, lectura de las figuras sobre tierra, separación de colonos, anotaciones y logo. Se corrigieron máscaras de la rompiente, contraste de la costa y Yerbal, partículas congeladas y un borde rectangular en la erosión final.
- Preflight: todos los recursos presentes; 1080×1920, 30 fps, 162,8 segundos, 4884 cuadros; audio suficiente; tipografías cargadas; textos y logo dentro de x100–900/y250–1500. Sin errores de página ni recursos ausentes.
- Prueba de acceso no secuencial 87 → 145 → 87 segundos: PNG idéntico antes y después, SHA-256 `17dca6b9e604d2cca258903ab59f00de08f3e80080fd06a746250c15e156b165`. Verifica determinismo en el entorno de entrega; no promete el mismo PNG en cualquier versión de Chromium/GPU.
- La fuente del logo mide 441 px y se muestra a 620 px manteniendo proporción y contenido. Se conserva el archivo original.
- `git diff --check` sin errores. La versión anterior, `shared/` y `tools/` no se modifican. Fotos, audio, matrices, transcripciones completas y videos quedan excluidos de Git.

## Alcance documental

La búsqueda acredita datos geográficos y discográficos; no acredita una letra completa oficial. Las lecturas pendientes están identificadas en `investigacion/palabras_de_la_cancion_v2.md`. El video no las convierte en subtítulos ni topónimos comprobados. Las dos fotos Commons usadas están atribuidas en `CREDITOS.md`; las restantes candidatas están separadas en la investigación.

## Comandos

```sh
node versiones/revelado-cancion-v2/tools/review.js
node tools/export.js --dir versiones/revelado-cancion-v2 --audio
node versiones/revelado-cancion-v2/tools/mobile.js
```

El informe final de contenedores, resolución, número de cuadros, audio y tamaño se guarda en `out/revelado-cancion-v2/export-report.json`.

## Resultado de la exportación

| Archivo | Resolución | Duración / cuadros | Tamaño |
|---|---|---|---|
| Máster con audio | 1080×1920 | 162,8 s / 4884 | 180.668.577 bytes |
| Copia celular | 720×1280 | 162,8 s / 4884 | 19.128.193 bytes, menor de 30 MB |

Ambos contienen H.264 a 30 fps y AAC estéreo. Se decodificaron íntegros los streams de imagen y audio con FFmpeg sin fallos. Siete cuadros extraídos del máster (1, 44, 65, 87, 114, 146 y 158 s) se compararon con los PNG de control: error absoluto medio de 2,59 a 4,32 sobre 255 por canal, compatible con la compresión con pérdida. Se inspeccionó además el cierre extraído del MP4.
