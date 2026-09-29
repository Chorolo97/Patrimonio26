# Revelado — canción entera (slug: revelado-cancion)

Nueva versión de «Revelado» que acompaña la canción completa «Punta Ballena» (Santiago Chalar y Santos Inzaurralde, «Minas y Abril», 1978; 162,8 s). Se parte del código de `versiones/revelado/`, que queda intacto: copiarlo a `versiones/revelado-cancion/` y extenderlo.

## 0. Idea (la misma de Revelado, ahora al ritmo de la letra)
Copias fotográficas reales del lugar tratadas como papel en la bandeja de revelado.
- El frente de revelador (menisco) hace retroceder el tiempo: detrás de él la copia vieja y quieta cobra vida (agua que se mueve, luz que camina, espuma).
- Las personas son la plata más densa: aparecen primero, sólidas e integradas en la copia (tono, grano y foco de la foto, sombra de contacto), nunca grises ni fantasmales.
- Cada tramo de la letra tiene su copia. Las palabras de la letra con carga indígena o regional se anotan en el margen como anotaciones de archivo, con su significado cuidadoso.

## 1. Formato y reglas fijas
- 1080×1920, 30 fps, **162,8 s** (4884 cuadros). Audio: la canción entera desde 0 s (`AUDIO_START_SECONDS: 0`, `fadeIn: 0`, `fadeOut: 0.8`). Rasgos: `shared/audio/features_cancion_entera.json` (mismo formato que `features.json`, 4884 cuadros).
- Contrato de versión, determinismo, ≤ 600 ms/cuadro, carpeta propia, no tocar `shared/`, `tools/` ni otras versiones: igual que en `versiones/revelado/SPEC.md`.
- Reglas de representación: las mismas del SPEC de Revelado.
  - Presencia indígena primero y nunca se desvanece.
  - Colonos más tarde y aparte, sin interacción.
  - Nada de estereotipos, adornos inventados ni primeros planos de rostros.
  - Las fotos del siglo XX son materia, nunca documento indígena.
- Cierre: `PBS.drawClosing` (título, lema, fecha y logo; **sin** nota de IA, ya desactivada en `shared/lib/closing.js`) sobre el cielo quemado en oscuro, con logo blanco de 620 px y sostenido hasta el final.

## 2. Material (`shared/assets/photos/`, no versionado)
| id | archivo | contenido | orientación |
|---|---|---|---|
| aerea | `aerea_punta.jpg` (988×717) | punta de la sierra desde el aire, rodeada de espuma | horizontal, baja resolución: usar con recorte vertical moderado y grano fuerte |
| canal | `clean/canal_espuma.jpg` (1415×1815) | canal entre rocas con espuma que entra | vertical |
| relieve | `clean/relieve_sin_bosque.jpg` (2000×932) | lomo de la sierra desde arriba con sendero y bahía | horizontal |
| abra | `clean/abra_al_mar.jpg` (1563×1013) | abra entre paredes de roca hacia el mar con cerros lejanos en el horizonte | horizontal |
| yerbal | `sierras_yerbal.jpg` (1010×720) | sierras del Yerbal: lomas y pastizal (foto actual en color → tratarla como copia virada, igual que las demás) | horizontal |
| rompiente | `clean/rocas_rompiente.jpg` (1876×1012) | rocas y ola que revienta en espuma | horizontal |
| portezuelo | `clean/rinconada_limpia.jpg` | acantilado de Portezuelo, playa y bloque (la copia P1/P3 de Revelado) | horizontal |
| gruta | `clean/gruta_limpia.jpg` | gruta de granito (P2 de Revelado) | horizontal |
| estratos | `clean/estratos_gruta.jpg` (1552×1004) | estratos y hendidura de la gruta | horizontal |
| playa | `clean/playa_pastos.jpg` (1786×1815) | playa con matas de pasto al viento y mar | cuadrada |

- Las horizontales se muestran como recorte vertical de 9:16 con paneo lento (≤ 25 px/s) para recorrer la foto; se puede ampliar hasta 1,6× si la resolución aguanta, con el grano de plata disimulando.
- No usar `yaguaron_iteños_NO_USAR.jpg`.
- Las máscaras mar/roca/arena/cielo de cada foto se calculan como en Revelado (polígonos más relleno por semilla). Hay que verificarlas visualmente.

## 3. Tiempos por verso (transcripción con tiempos del usuario; tiene prioridad sobre cualquier estimación anterior)
No se subtitula la letra. Solo se indican las primeras palabras de cada verso como referencia. El usuario tiene la transcripción completa; no se copia al repositorio público.

| Tramo (s) | Verso (inicio) | Copia y acción |
|---|---|---|
| 0–19,06 | intro de guitarra | **aerea**: la postal vieja; el menisco revela la punta y su espuma viva. Créditos de 2,0 a 9,0 s. |
| 19,06–24,78 | «Dice que se echó en sus brazos…» | **canal**: el mar entra y abraza la roca. |
| 26,14–32,42 | «Sierra de Punta Ballena, piedra que se ahogó…» | **canal**: acercamiento lento a la roca en el agua. |
| 33,42–39,60 | «Dice que se echó…» (repetición) | **canal**; relevo a **relieve** entre 39,6 y 40,4. |
| 40,42–50,42 | recitado: «Camino de mi esteña serranía… espinazo de alboradas… orientales rebeldías» | **relieve**: la luz del alba recorre el espinazo. Primeras personas indígenas en el sendero desde ≈41 s. |
| 50,42–55,28 | «y allá del Yaguarón su lejanía… vuelos de cuervos y celajes» | relevo a **abra** a las 50,4: lejanía y horizonte. Anotación «Yaguarón» 50,6–55,2. Dos personas indígenas miran la lejanía. |
| 55,28–60,86 | «rompió en las olas su encrespado viaje…» | **abra**: la ola rompe con los golpes medidos. |
| 60,86–62,52 | respiro | enjuague. |
| 62,52–68,34 | «Del Timbes y Piedra Arisca, de las sierras del Yerbal» | **yerbal**. Anotación «Sierras del Yerbal» 63,0–68,3. |
| 69,90–75,64 | «Tacuarí de los quileros y el Guazunambí arachán» | **yerbal**. Anotación «Tacuarí · quilero» 69,9–72,8 y luego «Guazunambí · arachán» 72,8–76,0. |
| 75,64–82,40 | «van las sierras de Leonardo / sangre del coronillar» | **yerbal** con viraje pardo-rojizo sutil. Anotación «coronilla» 79,6–83,6. |
| 84,18–90,28 | «sierra que se vuelve espuma / y es un jazminero el mar» | relevo a **rompiente** a las 83,6: el granito suelta plata que se vuelve espuma y el mar florece en encaje. |
| 90,28–110,48 | interludio de guitarra | **portezuelo**: personas indígenas en sus tareas; desde ≈99 s, lejos, dos colonos y una vela. |
| 110,48–117,14 | «Carapé vos de los indios / pororó que veo blanquear» | relevo a **gruta** a las 110,2. Anotación «Carapé» 110,6–116,5. La espuma estalla en blanco en la boca con «pororó» (≈114–117). |
| 117,84–123,40 | «Cerrazón, tus aguas altas / que el indio llamó el Aiguá» | relevo a **estratos** a las 117,5: la niebla (cerrazón) baja y el agua corre por la hendidura. Anotación «Aiguá» 120,8–126,0. |
| 124,92–130,96 | «Dice que se echó… llorar» | relevo a **playa** a las 124,5: pastos al viento y personas indígenas en la playa. |
| 132,00–138,16 | «Dice que se echó… llorar» (coda) | **playa**. |
| 138,84–152,18 | «Sierra deshecha en arena / de tanto llorarle al mar» (×3) | **playa**: la plata del granito se deshace en arena de 138,8 a 150 s. El cielo empieza a quemarse a las 148 s. |
| 152,18–162,8 | guitarra final | Cierre sostenido desde ≈150,5 s. El niño se sigue revelando y la espuma respira. Movimiento al 40 % desde 157 s. |

Todos los tiempos van en `src/config.js` (`sections[]`, `annotations[]`).

## 4. Relevos
- Menisco de Revelado, irregular, 0,9–1,6 s por relevo. Delante del frente queda la copia vieja; detrás, la nueva. Nunca hay doble exposición y ninguna figura queda gris.
- Se permite un relevo alternativo de laboratorio: la copia se sumerge (baja el contraste hasta papel mojado casi blanco) y la nueva sube desde el blanco, lo más denso primero. Dura ≤ 1,2 s y sin personas en ese momento.
- En cada relevo tiene que haber siempre alguien en pantalla cuando el tramo anterior tenía personas; si no se puede, las personas nuevas nuclean antes de que el frente se lleve las viejas.

## 5. Anotaciones (texto en pantalla)
Estilo: anotación de archivo a lápiz o tinta en el margen de la copia. Se revelan como la plata (densidad que sube) y se van con el siguiente relevo o con un fundido de 0,6 s.
- **Palabra:** EB Garamond itálica, 60–64 px, tinta crema (#efe6d2) con sombra suave.
- **Glosa:** Source Sans 3, 40–44 px, ≤ 10 palabras.
- **Posición:** zona segura, preferentemente arriba (y 280–520), sobre el cielo, o en el tercio inferior (y 1250–1450) si el cielo está ocupado. Una sola anotación por vez; duración 3,3–6 s.

Textos (redacción cuidadosa, sacada de `investigacion/palabras_de_la_cancion.md`):
- créditos (2,0–9,0 s): «Punta Ballena» / «Santiago Chalar y Santos Inzaurralde · Minas y Abril, 1978».
- Yaguarón (51–57 s): «Yaguarón» / «río de la frontera con Brasil; del guaraní yaguá, perro o jaguar».
- Sierras del Yerbal (63,0–66,2 s): «Sierras del Yerbal» / «serranía del este; entre las sierras de Aiguá, junto a Coronilla y León».
- Tacuarí (66,2–69,6 s): «Tacuarí» / «río que alude a la tacuara, la caña nativa». Segunda línea, más chica: «quilero: contrabandista de frontera».
- Guazunambí (69,6–73,0 s): «Guazunambí» / «cuchilla de Cerro Largo; se interpreta “oreja de venado”». Segunda línea: «arachán: así se llama por tradición a la gente de Cerro Largo».
- coronilla (75,5–80,0 s): «coronilla» / «árbol nativo del monte serrano, de corteza rojiza». No anotar «Leonardo»: probablemente sea «León», sin confirmar.
- Aiguá (122–128 s): «Aiguá» / «nombre guaraní que se suele traducir “agua que corre”».

Ninguna anotación presenta una etimología dudosa como hecho: usar «se interpreta», «se suele traducir».

## 6. Presencia humana
- Mismas siluetas y reglas de Revelado (canon de 7,5 cabezas, manto liso, pelo suelto, bastón o atado; colonos con sombrero de ala).
- Primera aparición indígena a los 41 s (relieve).
- Presencia en relieve, abra, yerbal, portezuelo, gruta, playa y cierre: más del 60 % del tiempo.
- Colonos solo en portezuelo (≈97–110 s) y, lejos, en playa (≈145 s en adelante). Siempre después y aparte.
- Final: continuidad, con el niño revelándose. Nada de «último indio» ni trío mirando al mar.

## 7. Rendimiento y revisión
- Tiempo por cuadro ≤ 600 ms. El inicio puede tardar (muchas copias): precalcular máscaras, atlas y rejillas una sola vez.
- Cuadros de revisión: 1, 5, 15, 22, 30, 36, 44, 53, 61.5, 65, 68, 71, 77, 83, 92, 102, 108, 116, 125, 133, 145, 152, 158, 162.5, más cada relevo en t−0,2 / t / t+0,2.

## 8. Actualización de la letra (aporte del usuario; tiene prioridad sobre §3 y §5)
- Estrofa 2, primera línea: «[del timbes] y piedra arisca». No está resuelto: sin anotación.
- Estrofa 3, primera línea: el usuario oye «[carapebos] de los indios». Es casi seguro **«Carapé, … de los indios»**: Carapé figura entre las palabras de la canción en el texto de difusión y es la única que faltaba en la transcripción. Se agrega la anotación **«Carapé»** en 111,5–117,0 s: palabra «Carapé» / glosa «sierra de Maldonado y Lavalleja; se suele traducir “bajo”». La imagen del tramo 110,8–121 puede abrir con la gruta como «piedra de la sierra» y seguir igual.
- Coda: «Sierra [desechar?] arena» se lee muy probablemente como **«Sierra deshecha en arena / de tanto llorarle al mar»**. Refuerza el cierre: en la playa, la plata del granito se deshace en granos de arena, de forma visible y bella, entre ≈146 y 155 s. No se subtitula.

## 9. Copias sin negativo (lugares que el archivo no tiene)
El usuario aportó fotos de referencia de autoría desconocida. **Solo sirven como inspiración:** no se usan, no se calcan ni se copia su composición, y quedan fuera del repositorio (`privado/inspiracion/`). Para esos lugares se generan **placas propias**, paisajes procedurales hechos una vez con Python o WebGL: relieve, luz, atmósfera, vegetación y grano. La bandeja las trata igual que a las fotos: viradas, con grano de plata y reveladas por el menisco. Son evocaciones, no documentos, y deben verse coherentes con las copias reales, sin estética de videojuego.

| Placa | Inspiración (qué evocar) | Tramo |
|---|---|---|
| **quebrada** | valle serrano profundo y cerrado, laderas con monte nativo espeso y afloramientos de roca clara, un arroyo al fondo, lomas lejanas (Quebrada de los Cuervos y Sierras del Yerbal). Sin barandas, caminos ni pinos. | 62,5–68,3, «sierras del Yerbal» (antes era la foto yerbal) |
| **tacuari** | río ancho y lento de aguas pardas, orillas con monte ribereño denso y matas de tacuara, cielo nublado. Sin bote. | 69,9–72,8, «Tacuarí» |
| **cerrito** | llanura baja de pastizal hacia la Laguna Merín, con una isla de monte sobre un montículo suave (cerrito de indios). No se anota que sea arachán. | 72,8–76,0, «Guazunambí arachán» |
| **carape** | cumbre de sierra de pastizal con bloques y crestones de granito claro, cielo amplio. | 110,5–117,5, «Carapé vos de los indios», con personas indígenas; la gruta pasa a 117,5–124,5 junto con los estratos |

La foto **yerbal** queda para 75,6–83,6 (coronillar, viraje cálido).

## 10. Decisiones de implementación (segunda pasada)
- **§3 sobre estimaciones:** todos los relevos, secciones y anotaciones siguen los tiempos del §3 y §8: laboratorio 19,06 · relieve 40,0 · abra 50,42 · quebrada 62,52 · tacuarí 69,9 · cerrito 72,8 · yerbal 75,64 · rompiente 83,6 · portezuelo 90,28 · carapé 110,2 · … · playa 124,5.
- **§3 vs §9 en 117,5–124,5:** la letra manda. «Cerrazón» (117,84) sale sobre **estratos** desde 117,5 (la niebla baja hasta 120,4); la **gruta** entra a 120,6, justo antes de «que el indio llamó el Aiguá» y de la anotación (120,8). El pororó (≈114–117) revienta sobre el granito claro de la placa **carape**, y la gruta conserva su espuma suave en la boca con cada golpe.
- **Placas propias (§9):** `plates/make_plates.sh` las genera una sola vez (numpy + Pillow; heightfield con marcha de rayos, sin fotos de referencia). Cada una lleva su máscara (`*_mask.png`, PNG opaco: R agua, G roca, B cielo).
- **Etimología de Yaguarón:** el texto se mantiene como en el §5 hasta que se actualice el SPEC (la glosa afirma «del guaraní yaguá»; conviene «se suele derivar»).
- La letra completa no se copia: `config.js` sólo guarda las primeras palabras de cada verso.
