# Matrices de aguatinta y punta seca

Cuatro ilustraciones originales realizadas con el generador de imágenes integrado de Codex, a partir de indicaciones propias de aguatinta y punta seca. Las imágenes adoptan línea grabada, tramas orgánicas, punteado, grises de tinta y papel cálido. No son raymarching, terreno 3D ni capturas de un juego. Entran en el revelado, grano y virado común de las copias fotográficas.

Son **evocaciones artísticas contemporáneas, no documentos históricos** ni reconstrucciones topográficas o arqueológicas. No deben rotularse como fotografías del lugar. No se usaron imágenes de terceros como entrada del generador. Las fuentes históricas y geográficas del proyecto contextualizan los motivos; no autentican estos puntos de vista inventados.

| Archivo | Evocación | Dimensiones |
| --- | --- | --- |
| `quebrada.jpg` | Quebrada serrana profunda, monte nativo y arroyo | 1500 × 1920 |
| `tacuari.jpg` | Río manso entre monte ribereño y pastizal | 1700 × 1920 |
| `cerrito.jpg` | Cuchilla de Guazunambí: lomas bajas y pastizal | 1700 × 1920 |
| `carape.jpg` | Carapé: granito aflorado y pastizal serrano | 1700 × 1920 |

`cerrito` conserva únicamente el identificador técnico del montaje anterior. La ilustración **no representa un cerrito de indios**, ni atribuye un sitio arqueológico a los arachanes.

Las cuatro matrices originales se conservan localmente como `*_source.png`, excluidas del repositorio público junto a JPG y máscaras. El render es determinista usando esas matrices fijas; **la generación original con IA no es reproducible bit a bit**. Los prompts se conservan en `PROMPTS.md`.

Preparación: `python plates/make_plates.py` desde la carpeta de la versión (o con ruta absoluta). Requiere Python y Pillow, además de las cuatro matrices locales. Solo convierte tamaño/formato y traza las máscaras operativas; no genera ni altera artísticamente las matrices. También admite nombres individuales, por ejemplo `python plates/make_plates.py carape`. Sin archivos fuente, informa el faltante y no descarga nada.

Cada JPG lleva una máscara PNG RGB opaca de idéntico tamaño: R = agua visible, G = afloramientos de roca, B = cielo. Las áreas están trazadas según las matrices finales y suavizadas 1,4 px; el resto del campo es negro. Son máscaras de animación aproximadas, sin pretensión cartográfica.

Paleta fuente: tinta de carbón, papel cálido, virado bistre muy leve. El render de la bandeja aplica la tonalidad final común a todas las copias. Sin edificios, caminos, pinos, eucaliptos ni figuras incorporadas: las personas pertenecen a la capa continua del montaje.
