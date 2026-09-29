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

## 3. Letra y tiempos (anclaje por tramos medidos; las líneas exactas se verifican al oído)
Transcripción del usuario, con [?] donde hay dudas. **No se subtitula la letra.** Solo se anotan algunas palabras (§5).

| Tramo (s) | Música | Letra | Copia y acción |
|---|---|---|---|
| 0–19,5 | intro de guitarra | — | **aerea**. La postal vieja y quieta; el menisco la cruza y la punta revela su espuma viva. Ficha de créditos (§5) de 2,0 a 9,0 s. |
| 19,5–26 | estrofa 1 | «Dice que se echó en sus brazos / y el mar se puso a llorar» | **canal**: el mar entra y abraza la roca; la espuma sube y baja con `lowSmooth`. |
| 26–33 | | «Sierra de Punta Ballena / piedra que se ahogó en el mar» | **canal** con acercamiento lento hacia la roca en el agua. |
| 33–38,4 | | repite «Dice que se echó… llorar» | Relevo (menisco) hacia **relieve**, que entra a las 38 s. |
| 38,4–50,5 | recitado | «Camino de mi esteña serranía / vertebrado de picos y hondonadas / cuajado su espinazo de alboradas / refugio de orientales rebeldías» | **relieve**: el lomo de la sierra desde arriba. Una luz de alba recorre el espinazo de arriba hacia abajo. Primeras personas indígenas: pequeñas, en el sendero del lomo, quietas o caminando despacio, desde 41 s. |
| 50,5–60,6 | | «Y allá del Yaguarón su lejanía / que entre vuelos de cuervos celajes / rompió en las olas su encrespado viaje / y zambulló al azul su travesía» | Relevo a **abra**: entre las paredes de roca, el horizonte y los cerros lejanos. Anotación «Yaguarón» (51–57 s). Dos personas indígenas sobre la roca de la izquierda miran la lejanía. La ola rompe con los golpes medidos. |
| 60,6–62,85 | respiro de guitarra | — | enjuague (como en Revelado). |
| 62,85–73 | estrofa 2 | «[?] y piedra arisca / de las sierras del yerbal / Tacuarí de los quileros / y el Guazunambí arachán» | **yerbal**: lomas y pastizal. Tres anotaciones seguidas: «Sierras del Yerbal», «Tacuarí · quilero», «Guazunambí · arachán». Un grupo indígena pequeño recorre la loma. |
| 73–80,6 | | «Va en las sierras de Leonardo / sangre del coronillar» | **yerbal** con viraje cálido pardo-rojizo sutil (virador de selenio o cobre, nunca rojo literal) para «sangre del coronillar». Anotación «coronilla». |
| 80,6–86,3 | | «Sierra que se vuelve espuma / y es un jazminero el mar» | **rompiente**: el granito suelta plata que se vuelve espuma blanca (efecto clave de Revelado); el mar florece en encaje. |
| 86,3–110,8 | interludio de guitarra | — | **portezuelo**: la visión de Alejandra. Personas indígenas en la playa en sus tareas (las de Revelado P1/P3). Desde ≈97 s, más tarde y lejos, dos colonos con sombrero y una vela; todos permanecen, sin interacción. |
| 110,8–121 | estrofa 3 | «[?] de los indios / pororó que veo blanquear» | Relevo a **gruta**: personas indígenas en la gruta (G1–G3). «Pororó que veo blanquear» (pororó: maíz que revienta en blanco): la espuma estalla y blanquea en la boca de la gruta con los golpes medidos. Sin anotación. |
| 121,8–128,4 | | «Cerrazón, tus aguas altas / que el indio llamó el Aiguá» | **estratos**: niebla (cerrazón) que baja entre los estratos y agua que corre por la hendidura. Anotación «Aiguá». |
| 128,4–≈139 | | «Dice que se echó en sus brazos / y el mar se puso a llorar» | Relevo a **playa**: pastos al viento, mar gris; personas indígenas en la playa (una agachada, un adulto con atado, un anciano). |
| ≈139–155,5 | coda | «Dice que se echó… llorar / Sierra [?] arena / de tanto llorarle al mar» (×3) | **playa**: la plata de la roca se vuelve arena. Desde 150,5 s el cielo se quema en oscuro (tarjeta a mano) y aparece el cierre. |
| 155,5–162,8 | acorde final | — | Cierre sostenido. El niño todavía se está revelando (≈70 % al final) y la espuma sigue respirando abajo. Movimiento al 40 % desde 156 s. |

Todos los tiempos van en `src/config.js` (`sections[]`, `annotations[]`) para ajustarlos al oído sin tocar código.

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
