# Punta Ballena, memorias del territorio — reel Día del Patrimonio 2026

Primera versión completa y editable (v1) de un reel vertical poético, hecho con **animación programada por capas** (ilustración procedural en Canvas 2D). Sin servicios pagos de generación de imagen o video y sin recursos comprados.

- **Formato:** 1080 × 1920 (9:16), 30 fps, 40 s exactos (1200 cuadros).
- **Video:** `entregas/reel_patrimonio2026_mudo.mp4` (H.264 High, yuv420p, ≈8 Mbps, 41 MB, sin audio).
- **Versión de revisión con música:** se genera localmente con `npm run export:audio`. No se versiona porque la licencia de la canción no está verificada.
- **Fuente editable:** carpeta `reel/`. Toda la configuración está en un solo archivo: `reel/src/config.js`.
- **Cuadros de control:** `entregas/cuadros_de_control.png`.

## Guion implementado

| Tiempo | Plano | Texto |
|---|---|---|
| 00–06 | Amanecer sobre lomas bajas, pradera y costa. El grupo indígena ya está presente, caminando a lo lejos por la playa. | «Punta Ballena» / «Memorias del territorio» (0,7–5,5 s) |
| 06–14 | Plano medio abierto junto al agua: una persona se agacha en la orilla, otra espera, la tercera camina y se detiene. Viento en mantos y cabello. | «Presencias indígenas» (7–12 s) |
| 14–21 | Misma luz, mirando hacia la ladera: dos pobladores coloniales recorren a pie un sendero del segundo plano con un bulto sencillo. Las tres personas indígenas siguen junto al agua en primer plano; quien estaba agachada se incorpora. | «En tiempos de los primeros pobladores coloniales» (14,5–20,5 s, en dos líneas) |
| 21–28 | Plano amplio compartido: el grupo indígena camina por la orilla y los colonos siguen a distancia por la ladera. No hay saludo, trato ni enfrentamiento, y el espacio entre ellos queda abierto. | — |
| 28–35 | La diagonal de la punta rocosa continúa en líneas de espuma blanca sobre el azul (fundido a los 31,3 s). Las figuras salen caminando por el borde del encuadre, no se desvanecen. | «La memoria sigue viva.» (30–34,5 s) |
| 35–40 | Cierre sereno con cielo claro. Las tres personas indígenas siguen presentes, mirando el mar. El logo y los textos se sostienen hasta el final. | «Día del Patrimonio 2026» / «Raíces indígenas: pasado, presente y futuro» / «3 y 4 de octubre» |

Hay presencia humana en pantalla de 0 a 30 s y de 35 a 40 s. El tramo central, de 6 a 28 s (22 s), está dedicado a las personas. Las transiciones son fundidos de 0,6 s centrados en cada corte, incluidos en los 40 s.

> La v1 se conserva tal como se exportó (con la nota «Evocación artística realizada con IA»). Las versiones nuevas (`versiones/`) cierran sin esa nota, por pedido del usuario (`shared/lib/closing.js`).

## Ver y editar

Requisitos: Node 18 o superior. Para exportar hacen falta además Playwright (Chromium) y un `ffmpeg` con libx264.

```bash
npm run preview          # http://127.0.0.1:8080  (reproducir, pausar, reiniciar, buscar; ←/→ cuadro a cuadro)
npm install              # instala Playwright para exportar
npm run export           # out/reel_mudo.mp4
npm run export:audio     # además out/reel_con_audio.mp4, si existe reel/assets/audio/punta_ballena.mp3
npm run stills           # cuadros sueltos en out/stills/
# FFMPEG=/ruta/a/ffmpeg si no está en el PATH; WORKERS=3 páginas de render en paralelo
```

Los controles de la vista previa están fuera del cuadro, y la guía de zona segura se dibuja en otro lienzo, así que ninguno de los dos entra en el render exportado. La vista previa necesita el servidor local: abierta con doble clic (`file://`), el navegador bloquea las tipografías.

**Dónde cambiar cada cosa**

- `reel/src/config.js`: dimensiones, fps, duración, fundido, tiempos de cada plano, textos (contenido, tiempos, tamaños, estilo), tipografías, logo (variante y ancho), audio (`AUDIO_START_SECONDS`, fundidos, volumen) y zona segura.
- `reel/src/figures.js`: personajes (colores de vestuario, proporciones, poses de marcha, espera y agacharse).
- `reel/src/scenes.js`: composición de cada plano (capas de cielo, sierra, ladera, agua, orilla, roca), movimiento de cámara y coreografía.

## Música

Referencia: «Punta Ballena», Santiago Chalar y Santos Inzaurralde. Se usó el archivo aportado (162,8 s) sin descargar nada del enlace.

- **Corte propuesto:** `AUDIO_START_SECONDS = 47.8`, de 47,8 a 87,8 s del archivo, con fundido de entrada de 0,4 s y de salida de 1,5 s.
- **Cómo se eligió:** por análisis de señal (envolvente y espectrograma), **no escuchando la letra**. El análisis muestra voz hablada entre ≈38 y 60,6 s, un respiro de guitarra y una estrofa cantada completa entre ≈62,9 y 86,3 s. El corte empieza en una pausa del tramo hablado, incluye el final del recitado y termina después de la estrofa, sin unir fragmentos.
- **Pendiente:** confirmar al oído que el tramo contiene la imagen de la sierra volviéndose espuma. Si no la contiene, basta con cambiar `AUDIO_START_SECONDS`.
- No se sincronizó ninguna imagen con palabras. No hay subtítulos de la letra, no se completaron las palabras marcadas con [?] y no hay voz en off.

## Criterios aplicados

- Evocación artística, no reconstrucción arqueológica. El marco de trabajo es la segunda mitad del siglo XVIII, como elección artística. No se afirma un encuentro documentado en Punta Ballena.
- Los personajes son imaginados: tres adultos indígenas y dos pobladores coloniales, con el mismo vestuario y las mismas proporciones en todos los planos. No se les asigna un pueblo específico. No hay primeros planos de rostros ni manos.
- El vestuario es **provisional de boceto**: mantos y túnicas lisas de colores naturales, sin adornos, para las personas indígenas; camisa, calzón a la rodilla, medias y sombrero de ala sobria, sin uniformes ni emblemas, para los colonos. Los tonos de piel están en un mismo rango para todos: los grupos se distinguen por la secuencia, el vestuario y los textos.
- Paisaje de lomas bajas, piedra, pradera, costa y agua, sin forestación, caminos, edificios ni vehículos. La vegetación es una decisión artística general.
- Las fotografías de referencia se observaron para el relieve, la roca y la escala. No se calcaron, no se incluyen en el render ni en el repositorio y no se usan como documento.
- El logo se usa como imagen independiente, sin redibujar ni recolorear, con su proporción y transparencia. Va en su versión a color sobre cielo claro, a 620 px de ancho de archivo (≈565 px de contenido visible). Si falta el archivo, la exportación se detiene y no se genera un reemplazo.
- Tipografías: EB Garamond para los títulos y Source Sans 3 para los datos, ambas con licencia SIL OFL (`reel/assets/fonts/`).

## Revisión realizada (una pasada completa)

Se revisaron cuadros de control en cada plano y en cada fundido, además del primer y el último cuadro. Se corrigieron:

- cortes verticales en los promontorios lejanos;
- relleno gris bajo el horizonte;
- borde de roca escalonado;
- espuma que invadía el cielo y crestas cortadas;
- rocas con aspecto de canto rodado;
- línea de espuma con aspecto de marca vial;
- flexión excesiva de rodillas en la marcha.

Quedó verificado:

- la duración es de 40 s y 1200 cuadros;
- no hay cuadros vacíos;
- los textos y el logo están dentro de la zona segura (el motor avisa si no);
- el logo no está deformado;
- los controles no aparecen en el render;
- entre 6 y 28 s hay personas indígenas y coloniales con continuidad;
- el cierre muestra a las personas indígenas presentes.

## Pendiente

- Escuchar y confirmar el corte musical, y obtener la autorización de uso de la canción.
- Hacer la revisión histórica y de vestuario si se pasa a una versión más realista o detallada.
- Obtener la aprobación institucional: esta versión es un borrador, no una pieza oficial.
- Revisar la lectura en el teléfono con la interfaz real de Instagram. La zona segura es una guía, no una garantía de recorte.
