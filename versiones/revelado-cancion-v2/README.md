# Revelado canción v2 — Plata, espuma, arena

Versión independiente de `revelado-cancion`; original, librerías compartidas y exportador se conservan. 1080×1920, 30 fps, 162,8 s (4884 cuadros). Canción completa aportada por el usuario, sin cortes.

## Dirección
Fotos reales como copias de laboratorio, tinta plana para paisajes sin negativo. El grano y el virado son comunes. Se eliminan los paisajes de ray marching 3D. Tacuarí se evoca como río de monte ribereño; Guazunambí como cuchilla, sin identificar un cerrito arqueológico ni adjudicarle un pueblo. Recorrido lento, ninguna rotación, glitch ni destello.

La presencia indígena precede a los colonos, que aparecen aparte a los 99 s. Las figuras son evocaciones sin rasgos faciales ni adornos. Las fotos históricas son materia visual del siglo XX, no documentos indígenas.

## Archivos
- `src/config.js`: base heredada y tiempos de verso.
- `src/v2.js`: decisiones finales, anotaciones prudentes, fuentes locales y cámaras.
- `src/live.js`: esqueleto articulado de perfil (marcha con apoyo sin patinar, cuclillas ↔ de pie, brazos por cinemática inversa, cabeza que gira, manto y pelo con viento), barco del siglo XVIII de dos palos, bote de remos y aves.
- `src/vida.js`: qué hace cada figura viva en cada copia (función pura de t), cámara viva (empuje ≤ 7 %, paralaje entre planos, barridos de luz) y energía del agua con los graves y arranques medidos. Las figuras listadas allí reemplazan a las siluetas fijas del mismo id; main.js las dibuja por cuadro en un lienzo crudo y la GPU las lleva al mismo formato de atlas (revelado, grano, virado y sombra comunes).
- `src/flat.js`: tratamiento sin deformación de volumen para las matrices planas.
- `src/silver.js`: dispersión de granos derivados de la foto de granito, activada en la coda desde 138,84 s; no dibuja un fragmento macizo antes de desprenderlos.
- `plates/`: preparación de matrices y máscaras; derivados visuales excluidos de Git.
- `tools/prepare_assets.py`: recorta y normaliza los escaneos aportados, sin modificar los originales.
- `tools/review.js`: captura secuencial, mediciones y determinismo.
- `tools/mobile.js`: copia 720×1280 con audio y comprobación de duración, cuadros y tamaño menor de 30 MB.

## Preparar y renderizar
Instalar las dependencias del proyecto y Chromium como se indica en el README raíz. Python necesita Pillow/numpy para preparar assets. Copiar la canción a `shared/assets/audio/punta_ballena.mp3`. No subir medios al repositorio.

```powershell
python versiones/revelado-cancion-v2/tools/prepare_assets.py "RUTA/real/imagenes/punta ballena gral/virgenes"
# Preparar placas: ver plates/README.md; originales Commons en privado/commons/.
node versiones/revelado-cancion-v2/tools/review.js
node tools/export.js --dir versiones/revelado-cancion-v2 --audio
node versiones/revelado-cancion-v2/tools/mobile.js
```

Para reproducir la aérea aprobada, conservar `151482.jpg` en la carpeta padre de `virgenes`. El preparador registra el origen y los recortes finales en `privado/manifest_local.json`, después de cualquier sustitución. Si falta ese archivo, conserva la aérea alternativa y lo advierte; será necesario revisar esa variante.

Se pueden definir `NODE_PATH`, `CHROMIUM`, `FFMPEG`, `FFPROBE`, `WORKERS`, `CRF` y `MAXRATE` según la instalación local. Exportaciones en `out/revelado-cancion-v2/`, ignoradas por Git: `reel_con_audio.mp4`, `Punta_Ballena_v2_celular_720p.mp4` y la verificación técnica `export-report.json`. `mobile.js` necesita primero el MP4 completo con audio.

## Relato de las figuras (v2 «más vida»)
Alba en el canal (19 s): dos personas ya están sobre la roca. 40–50 s: tres caminan en fila el sendero del lomo. 52–54 s: un niño corre hasta la persona adulta junto al Yaguarón; cuervos cruzan el cielo. 56–60 s: alguien señala la lejanía; gaviotas. 63–69 s: el grupo camina el borde de la sierra. Tacuarí: alguien junta en la orilla. Interludio (90–110 s): la vida sigue (recolección, la mayor gira la cabeza, una niña lleva de la mano a la adulta hacia la orilla); desde 91,6 s un barco de dos palos entra por la derecha, fondea (≈100,6 s) y aferra el paño; un bote se acerca (100,9–105,4 s) y los dos colonos aparecen a 105,2 s junto al bote, lejos de las personas indígenas; una persona señala el barco (95,6–100,8 s), sin gesto de conquista. Playa: la mayor mira, alguien trae un atado, la recolectora se pone de pie (135–136 s) y vuelve a juntar; el niño sigue revelándose hasta el final.

## Investigación y atribución
Ver `investigacion/palabras_de_la_cancion_v2.md` y `investigacion/imagenes_candidatas_v2.md`. No se encontró una edición accesible que permita declarar confirmada la letra completa. El registro AGADU confirma nombres asociados a la obra; no contiene la letra. Los versos dudosos no se completan ni se rotulan como hechos.

Las glosas describen lugar o significado documentado. Yerbal no se adjudica automáticamente a Aiguá; Yaguarón es el río de Cerro Largo, Uruguay/Brasil. Aiguá no se traduce con etimología única. Pororó puede tener también lectura geográfica.

Los archivos Commons derivados conservan sus condiciones de atribución y compartir igual; la documentación identifica las fuentes. Las fotografías del archivo personal mantienen autor y licencia no verificados; permanecen privadas. No se ha incorporado una letra íntegra obtenida de terceros al repositorio público.

## Cierre
Desde 152,18 s: título, lema, fecha y logo blanco original intacto, dentro de x100–900/y250–1500. Sin leyenda de IA. La playa y las personas siguen en cuadro hasta 162,8 s.
