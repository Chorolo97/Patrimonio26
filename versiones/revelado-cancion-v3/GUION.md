# Punta Ballena v3 — guion

Guion gráfico: `out/storyboard_v3/` (nueve cuadros 1080×1920 y la hoja `storyboard.png`). Este documento es el plan. Todavía no se construyó el video. La v2 y `shared/` no se tocan.

## Por qué una v3

La v2 no se entiende. Tiene catorce escenas, no hay a quién seguir, los textos van descentrados sobre bandas oscuras y todo tiene el mismo peso. La v3 reduce todo a lo esencial:

1. **Un camino.** El recitado («Camino de mi esteña serranía… y allá del Yaguarón su lejanía… rompió en las olas su encrespado viaje») es la columna. Es un camino que baja de las sierras del este al mar de Punta Ballena.
2. **Una familia.** Son tres personas: una **adulta** (A), una **mayor** (M) y un **niño** (N). Aparecen como siluetas dignas, sin rasgos, adornos ni atuendo ritual, y no se les asigna un pueblo. Son las mismas en todos los capítulos. Nunca desaparecen.
3. **Siete capítulos** alineados con la canción. Cada uno tiene una sola copia de fondo, casi siempre fija, con un empuje de cámara de 7 % como máximo.
4. **Una palabra por capítulo.** Va en EB Garamond de 96 a 120 px, con una glosa en Source Sans 3 de 34 a 38 px. Está centrada exactamente en x = 540, con un ancho máximo de 720 px (la letra se achica si no entra). Se apoya en cielo, arena o papel. **No hay bandas oscuras.**
5. **Un solo recurso de transición.** Es una onda lenta de revelado, un frente irregular de 1,2 a 2 s. No hay destellos blancos, giros ni glitch.
6. **Pasado → presente → futuro.** La copia de plata se revela en color al final: la misma punta hoy, con el niño mirando el mar.

## Materia visual

- Las fotos reales y las placas de la v2 se tratan con el mismo virado de plata: sombras (36, 29, 24), medios (146, 124, 102), luces (243, 235, 219) y grano fino. Son las mismas fuentes de la v2 (`shared/assets/photos/v2/`, `versiones/revelado-cancion-v2/plates/`), con sus créditos y condiciones.
- Las siluetas, el barco, el bote y los colonos van en tinta plana (#2a2019) con sombra de contacto y el mismo grano.
- El mapa es de línea fina, en la tinta de la copia sobre papel. Usa coordenadas reales aproximadas (ver II).
- El final en color es una **ilustración original** plana, tipo estampa, dibujada por código (`storyboard/colour.py`). La **inspira una foto de referencia aportada por el usuario**: la vista aérea actual de la punta desde el sur. Esa foto no se incluye, no se calca y no forma parte del video. Del original se toma solo la idea de composición: el lomo largo hasta la punta, el mar profundo a ambos lados, el anillo de espuma en la punta y la playa curva a la derecha. Se **omiten** la ruta, las casas y la forestación: el final habla de la continuidad de la tierra, no del balneario. La paleta tiene pocas tintas: azul profundo, espuma, granito, olivo y arena, con un 15 % del virado sepia para que se lea como continuación de la copia.

## Capítulos

Los tiempos están en segundos y coinciden con las marcas de la canción del usuario: guitarra 0–19,06; verso 1, 19,06–39,6; recitado 40,42–60,86; verso 2, 62,52–90,28 (espuma 84,18–90,28); interludio 90,28–110,48; verso 3, 110,48–130,96; coda 132–152,18; acorde final hasta 162,8.

### I · El mar — 0 a 40,42 (guitarra y verso 1)
- **Copia:** aérea de la punta (`aerea.jpg`). Se revela desde abajo con la onda lenta; la parte alta sigue siendo papel.
- **Texto (0,5–9 s):** **Punta Ballena**, con la glosa *Santiago Chalar · Santos Inzaurralde · 1978*.
- **Familia:** los tres, diminutos, de pie sobre la roca junto a la rompiente. M lleva bastón, A se hace sombra con la mano y N está delante. En el verso 1 («Dice que se echó… sierra de Punta Ballena») la cámara baja muy despacio hacia ellos. No hay otro texto.
- **Salida (≈39,6–40,4):** onda de revelado hacia el papel del mapa.

### II · Serranía — 40,42 a 62,52 (recitado)
- **Copia:** papel en blanco. Sobre él se **dibuja** el mapa de línea del este del Uruguay:
  - costa del Río de la Plata y del Atlántico hasta Rio Grande, con líneas de agua repetidas mar adentro;
  - Laguna Merín, con una aguada apenas más fría, y la Laguna del Sauce, diminuta;
  - Río Yaguarón (frontera; desde Paso Centurión, −32,13 / −53,75, hasta la Merín) y Río Tacuarí;
  - sierras como signos ∧ de cartografía antigua: Cuchilla Grande, Guazunambí, Yerbal/Quebrada de los Cuervos, Carapé y Sierra de la Ballena;
  - puntos en Paso Centurión (Yaguarón), Aiguá (−34,20 / −54,76), la Sierra de Carapé (−34,44 / −54,90) y Punta Ballena (−34,91 / −55,04, marcada con un anillo).
- **Nombres (4):** *Yaguarón*, *Tacuarí*, *Aiguá* y *Punta Ballena*, en EB Garamond itálica de 25 px.
- **Camino:** una línea de tinta sepia (#6b3f2a) avanza desde el Yaguarón por las sierras (Tacuarí, Yerbal, Aiguá, Carapé) hasta Punta Ballena. El tramo que falta es punteado. Tiempos: 40,4–50,4 dibujo del mapa y salida; 50,4–55,3 la línea se acerca al Yaguarón y la sigue («y allá del Yaguarón su lejanía»); 55,3–60,86 baja por las sierras y llega a la costa («rompió en las olas su encrespado viaje»), donde un anillo se abre en el agua.
- **Texto (41–48 s):** **Serranía**, con la glosa *de las sierras del este hasta el mar*.
- **Familia:** los tres, en tinta y del tamaño del mapa, caminan junto a la punta de la línea, hacia el sudoeste.
- **Respiro 60,86–62,52:** el mapa se hunde en el papel con la onda.

### III · Los ríos — 62,52 a 84,18 (verso 2)
- **Copia:** placa del Tacuarí, un río de monte ribereño.
- **Texto (69,9–75 s):** **Tacuarí**, con la glosa *río de la cuenca de la Laguna Merín*. Se muestra lo que la investigación permite afirmar. No se rotulan Timbes, Piedra Arisca ni «Leonardo».
- **Familia:** A se arrodilla en la orilla y junta agua con la mano. N, de pie, la mira. M descansa sentada en la hierba de la barranca. Hay movimiento leve: la mano sube y baja y la cabeza de N gira hacia el río.

### IV · Espuma — 84,18 a 90,28
- **Copia:** el canal entre rocas con la rompiente (`canal.jpg`), en un encuadre simétrico con el cielo en V.
- **Texto (84,5–89,5 s):** **Espuma**, con la glosa *la sierra que se vuelve espuma*.
- **Familia:** los tres, pequeños, sobre el hombro de la roca izquierda, recortados contra el mar. Miran el agua y no se mueven. Solo se mueve la espuma, que crece con los golpes medidos de la canción.

### V · El barco — 90,28 a 110,48 (interludio)
- **Copia:** la ensenada (`rinconada.jpg`), sin el sello del archivo ni las figuras de turistas del negativo, que se retocan.
- **Texto (92–98 s):** **Horizonte**, con la glosa *llegan otros por el mar; ellos siguen aquí*.
- **Acción:** desde 91,6 s un bergantín de dos palos entra lejos y fondea hacia los 100,6 s. Aferra el paño y un bote se acerca a la playa. A los 105,2 s dos colonos (casaca y tricornio, sin armas) quedan junto al bote, lejos y aparte. **No hay interacción.**
- **Familia:** en primer plano, a la izquierda y de pie sobre la arena. M con bastón; N le toma la mano; A mira el barco. No señalan ni gesticulan: solo siguen ahí. La presencia indígena ocupa el primer plano todo el capítulo.

### VI · Carapé / Aiguá — 110,48 a 132 (verso 3)
- **Copia:** placa de la cumbre de granito de Carapé, con la lejanía serrana.
- **Texto:** de 110,8 a 117 s, **Carapé**, con la glosa *sierra de Maldonado y Lavalleja*. Una onda suave lo reemplaza de 120,8 a 126 s por **Aiguá**, con la glosa *arroyo y valle del norte de Maldonado*. No se traduce ninguna etimología como consenso; Pororó y cerrazón no llevan rótulo. En 117,8–120,8 puede aparecer bruma como decisión plástica.
- **Familia:** entre el pasto y el granito, de espaldas al espectador y mirando la lejanía. A señala las sierras y N mira donde ella señala. M se apoya en el bastón.

### VII · Arena — 132 a 152,18 (coda) y final en color
- **Copia:** la playa con los pastos (`playa.jpg`).
- **Texto (133–140 s):** **Arena**, con la glosa *sierra deshecha en arena*.
- **Acción (138,84 en adelante):** granos de granito se desprenden y el viento los arrastra por la arena. Solo se dibujan los granos que se sueltan.
- **Familia:** los tres caminan despacio por la playa hacia el mar: M detrás, A en el medio y N delante.
- **Pasado → presente (≈146–152,18):** la onda de revelado cruza el cuadro de abajo hacia arriba y, donde pasa, la copia de plata se vuelve **color**. Es la misma punta hoy, vista desde el aire, en la ilustración original descrita arriba.
- **Texto en color (146,5–151,5):** **Hoy**, con la glosa *la misma costa; las raíces siguen aquí*.
- **Familia en color:** diminuta, en el borde de la punta, frente al anillo de espuma. N está más cerca del agua y mira el mar; A y M, un paso detrás.

### Cierre — 152,18 a 162,8
- Una onda irregular de revelado lleva la mitad superior de la ilustración de vuelta a **papel**, sin banda oscura. La punta, el mar y la familia siguen abajo, en color, hasta el último cuadro.
- **Texto** en tinta oscura sobre papel, centrado en x = 540 y dentro de x 180–900:
  - **Día del Patrimonio 2026** (EB Garamond, 72 px)
  - **Raíces indígenas: / pasado, presente y futuro** (Source Sans 3, 44 px, dos líneas)
  - **3 y 4 de octubre** (Source Sans 3, 48 px, seminegrita)
  - Logo original **en color** `shared/assets/logo/01_logo_uvpb_color.png`, intacto (560 px de ancho, sin recolorear). Sin nota de IA.
- Desde 156 s el movimiento baja al 40 % y el acorde final se sostiene.

## Continuidad de la familia

| Capítulo | A (adulta) | M (mayor, manto y bastón) | N (niño) |
|---|---|---|---|
| I | se hace sombra y mira el mar | de pie, con bastón | delante, mira la rompiente |
| II | camina sobre la línea del mapa | camina detrás | encabeza |
| III | arrodillada, junta agua | sentada en la barranca | de pie, mira a A |
| IV | mira la espuma | mira la espuma | mira la espuma |
| V | mira el barco, quieta | de pie; N le toma la mano | de la mano de M |
| VI | señala la lejanía | se apoya en el bastón | mira donde señala A |
| VII | camina hacia el mar | camina detrás | delante |
| Hoy / cierre | un paso detrás | un paso detrás | en el borde, mira el mar |

Los colonos solo aparecen en V, lejos y sin contacto con la familia.

## Tipografía y zona segura

- La palabra, en EB Garamond regular, mide 116 px (la de I, 116 px y 620 px de ancho). La glosa, en Source Sans 3, mide 36 px con un espaciado de +0,06 em. Hay 26 px entre ambas.
- El bloque empieza en y ≈ 250–300, con la palabra centrada en x = 540 y 720 px de ancho como máximo. Tinta #2a2019 sobre copia clara y #23303a en el cuadro en color.
- Donde el cielo grabado es muy denso (III, VI), se aclara la copia con un velo radial muy suave. No es una banda.

## Herramientas del guion gráfico

`storyboard/` contiene lo necesario para regenerar los cuadros: el virado de las copias (`prep.py`, `bgs.json`), las siluetas y el barco (`fig.js`), el mapa con coordenadas reales (`map.js`), la ilustración final (`colour.py`), la composición de cada cuadro (`frames.js`, `frame.html`, `renderall.js`) y la hoja (`sheet.html`, `shootfull.js`). Los scripts esperan una carpeta de trabajo con los fondos generados. No son todavía el motor del video.
