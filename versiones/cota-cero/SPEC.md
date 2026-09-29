# Cota cero

Una plancha grabada que se mueve. En el primer cuadro, sobre índigo, se corta en espuma la línea de costa de Punta Ballena, la cota cero. Desde ella suben las curvas de nivel hasta la cresta mientras los anillos de espuma se abren al mar. Todo es línea: la sierra, el mar, la gruta y las personas, grabadas con trazo denso y firme, quietas y con peso. En el respiro de la guitarra amanece y la plancha se invierte: de línea blanca sobre noche pasa a tinta sobre papel. Con la voz cantada vemos la costa habitada desde la playa de Portezuelo: personas indígenas en sus tareas y, más tarde y más lejos, un barco fondeado y dos sombreros. Al final las líneas de la sierra cruzan la costa y siguen mar adentro como espuma: la piedra se queda y su dibujo se hace ola. La plancha no está terminada: a un niño todavía lo están grabando.

BUILD SPEC — «Cota cero» (slug: cota-cero). Version 1 of 3 of the Día del Patrimonio 2026 reel. This document is self-contained: read all of it before coding.

0. THE IDEA
An engraved relief plate that moves. Every mark on screen is an engraved line, a stipple dot, or the bare plate/paper it is cut into. Land, sea, granite, foam and people share one line language: no color fills, gradients, glows, washes or illustration.
During the spoken recitation the plate is NIGHT: bone lines cut into a tinted indigo plate (white-line engraving). In the guitar breath a dawn front crosses the frame and the plate inverts to DAY: black-line intaglio, warm inks on bone paper.
«Cota cero» means the 0 m contour, the coastline where the Sierra de la Ballena meets the sea. The reel opens by cutting that coastline as a line of foam; the land's contours rise inward from it and foam rings open seaward. It ends with the sierra's contour lines crossing that same line into the sea and becoming foam: the stone stays, and its drawing becomes the wave.
People are engraved with dense, form-following hatching around a solid core. They are grounded, still and dignified, never animated. The last figure, a child, is still being cut when the reel ends: the plate is unfinished, and that is the future.

It must NOT look like any of these:
(a) The rejected v1 in reel/: a flat painted diorama with small articulated cartoon people walking, and dissolves.
(b) Joy Division's «Unknown Pleasures» or ridgeline plots: uniform wavy lines stacked over a silhouette on black, or depth transects bulging over relief. This piece has NO stacked transects anywhere. Land lines are contours (isolines of HEIGHT) and hachures.
(c) An audio visualizer: no waveform or oscilloscope line, no line tracing the voice, no bars.
(d) A map or infographic: no labels, place names, border frame, grid, graticule, compass rose, scale bar, legend or cartouche. It is an engraving, not a survey chart; a chart would also read as a colonial instrument.
(e) A Photoshop line-screen filter. Tone comes from hatching that follows form: hachures along the fall line, strokes along the rock's fractures, crosshatch in the darks. It never comes from straight stripes whose width tracks luminance.
(f) Template motion: no zoom beyond ±5% per view, no 3D spin, no rotating line field, no glitch, flare or dissolve.

1. FIXED BRIEF CONSTRAINTS
- Format: 1080x1920, 30 fps, exactly 40 s = 1200 frames (t = frame/30).
- Client and theme: Unión Vecinal de Punta Ballena y Lagunas del Sauce y del Diario (UVPB); Día del Patrimonio 2026, Uruguay; theme «Raíces indígenas: pasado, presente y futuro»; dates «3 y 4 de octubre».
- Period: an artistic evocation, not an archaeological reconstruction. Working frame: second half of the 18th century (Maldonado was founded 1755–1757; use it only as regional context, and depict no real historical person). This is before Lussich (1896): no pines, eucalyptus or any forest; no roads, buildings, fences or cars.
- Geography: the Sierra de la Ballena is a long LOW granite ridge that runs into the Atlantic as a point, dark rock ringed by white foam. It has steep fractured granite walls with sea grottos on the WEST side and a gentle grass slope on the EAST side, with curved sandy beaches on both sides (Portezuelo to the west). Pradera and low native scrub (monte); soft hills inland. Height/length at most 1:12. Never Andean peaks, fjords or jungle.
- Representation:
  · The land was already inhabited: never 'empty land discovered', and never 'universal harmony' either.
  · Indigenous presence comes first and never fades, dims, leaves or is replaced. Colonists appear later, while every indigenous figure remains.
  · Coexistence without pacts, trade, friendship, fights, ceremonies or gestures between the groups. Do not name any specific people.
  · None of: feathers, headdresses, tipis, Inca/Aztec/North-American dress, invented ornaments, body paint, rituals, fake petroglyphs, weapons, nudity, faces or face close-ups, caricature.
  · Both groups use the same ink and the same density; they differ ONLY in silhouette.
  · Colonial presence is legible but never triumphal: brimmed hats, shirts or jackets, an anchored ship, a beached boat. No flags, swords, crosses or horses.
  · The ending affirms continuity: no 'last Indian', no farewell pose, no posed trio facing the sea, nobody standing on the skyline.
- Human presence: at least 40% of the time, recognizably human. Here it is ≈65% (7.7–15.0 s and 19.6–40 s).
- On-screen text: ONLY the closing, drawn by PBS.drawClosing with the exact texts «Día del Patrimonio 2026» / «Raíces indígenas: pasado, presente y futuro» / «3 y 4 de octubre» / «Evocación artística realizada con IA». No lyrics, captions, labels or titles. Two type families only: EB Garamond and Source Sans 3, both local.
- Logo: shared/assets/logo/01_logo_uvpb_color.png, because this version closes on LIGHT paper. drawClosing draws it intact: no recolor, filter, blend, grain or linework over it; aspect and transparency kept. Use logoWidth 620: the PNG is 441x70 with transparent margins, so the visible mark is ≈565 px wide.
- Safe zone: all text and the logo inside x 100–900, y 250–1500.
- No voice-over and no template transitions.
- Photos: use only shared/assets/photos/clean/gruta_limpia.jpg, as the orientation and tone source for the grotto engraving. Never display it as a photo. Never load the raw grutas.jpg: it contains 1930s tourists and a printed caption.

2. HARNESS (read shared/lib/core.js, gl.js and closing.js, shared/render.js and versiones/_plantilla/ first)
Folder and contract:
- Create versiones/cota-cero/ by copying versiones/_plantilla/. Put EVERY tunable in src/config.js.
- Extra source files (for example src/terrain.js, src/figures.js, src/hatch.js, src/shaders.js) need <script> tags in BOTH index.html and render.html, after config.js and before main.js.
- Never edit shared/, tools/ or other versions.
- Contract: window.createReel(canvas, cfg) returns Promise<{render(t), warnings, logo}>.
- render(t) draws the full frame synchronously: GL passes, then ctx.drawImage(gl.canvas, 0, 0), then PBS.drawClosing.
- Set logo:false only if the logo failed to load (the export then aborts).
- Push drawClosing/drawBlock warnings into warnings once, plus the note «Logo 441 px ampliado a 620: pedir versión vectorial o PNG grande».

core.js:
- PBS.rng(seed); PBS.makeNoise(seed) returns {n2, fbm}; PBS.smooth, ease, clamp, lerp, win, mix, hex; PBS.loadImage; PBS.loadFonts(cfg.assets + 'fonts/', warnings); PBS.font(kind, size, weight).
- PBS.loadAudioFeatures(cfg.featuresUrl) returns a, with a.at(key, t) and a.avg(key, t, span). Arrays (1200 values each, 0..1, 30 fps): rms, low, mid, high, voice, flux, centroid, each also with a Smooth variant. Also a.markers.
- If the features file is missing, loadAudioFeatures returns {missing:true, at:()=>0}. Fall back to constants in that case.

gl.js:
- new PBS.GL(w, h) creates its own WebGL2 canvas with preserveDrawingBuffer.
- gl.program(fs) compiles your fragment shader against a fixed vertex shader that provides `in vec2 uv` (0..1; uv.y = 0 is the BOTTOM).
- gl.texture(imgOrCanvas, {nearest, repeat}) uploads RGBA8 with UNPACK_FLIP_Y, so the image top is at uv.y = 1. gl.texture(null, {w, h, float:true}) creates an empty RGBA16F texture.
- gl.target(w, h, {float}) returns {fb, tex, w, h}.
- gl.draw(prog, uniforms, target|null) binds only numbers, vec2–vec4 and textures, then draws a fullscreen triangle.
- PBS.GLSL_NOISE provides hash21, vnoise and fbm.

GL pitfalls you WILL hit:
(1) draw() cannot set int, array or matrix uniforms. Either call gl.gl.useProgram(p) and gl.gl.uniformXv(...) yourself before gl.draw (uniform values persist per program), or pack the data into a small RGBA32F texture with raw texImage2D (OES_texture_float_linear is enabled).
(2) draw() calls vertexAttribPointer on whatever buffer is currently bound to ARRAY_BUFFER. Once you create your own buffers or VAOs (the terrain mesh), keep your own fullscreen-triangle buffer [-1,-1, 3,-1, -1,3] and re-bind it, together with bindVertexArray(null), before every gl.draw.
(3) The screen row counted from the top is (1 - uv.y)·1920. Canvases uploaded with gl.texture are flipped consistently with this.
(4) Verified on this machine: RGBA16F and RGBA32F textures and render targets, depth renderbuffers, vertex texture fetch, and generateMipmap on NPOT RGBA8.

closing.js:
- PBS.drawClosing(ctx, t, {t0, dark, logo, logoWidth, y, ink, ink2}) draws the exact texts with a 0.8 s fade and a 10 px rise.
- Measured with the real fonts: the title at 74 px is 744 px wide. With logoWidth 620 the block is 566 px tall, so y = 290 puts its bottom at 856, centered at x ≈ 528, with no warnings.

Determinism:
- render(t) must be a pure function of t.
- No Math.random, Date or performance.now inside render, and no state carried between frames.
- Every animation is either closed-form or looked up in arrays built at init (for example prefix sums of the audio features).
- Seed all init randomness from PBS.rng(cfg.seed).
- Paper and plate grain are FIXED: they do not boil from frame to frame.

Stills (run from the repo root):
- FFMPEG=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2 NODE_PATH=/opt/node22/lib/node_modules WORKERS=1 node tools/export.js --dir versiones/cota-cero --stills 0,1.2,2.6
- Output goes to out/cota-cero/stills/tXX.XX.png.
- Contact sheet: python3 tools/sheet.py out/cota-cero/stills /tmp/cota-cero_sheet.png 5 270 (or write it to your scratchpad).
- View the PNGs with the Read tool. Empty the stills folder between rounds.
- NEVER run the full video export; the orchestrator does it.

Performance, measured here (SwiftShader, 1080x1920):
- each texture fetch in a full-resolution pass ≈ 9 ms;
- an empty pass ≈ 10 ms;
- a 6-octave domain-warped fbm ≈ 110 ms;
- a 512² grid mesh with vertex texture fetch into RGBA16F + depth ≈ 140 ms.
Hard ceiling: 600 ms per render(t). Targets: ≤ 250 ms typical and ≤ 400 ms during fronts.

3. AUDIO
cfg.audio.AUDIO_START_SECONDS = 47.8. shared/audio/features.json was computed for 47.8.

Structure (from signal analysis; nobody verified the words):
- 0–12.8 s: spoken recitation over guitar. The cut starts in the middle of it.
- 12.8–15.05 s: guitar breath, no voice (marker at 13.1).
- 15.05–38.5 s: one sung stanza.
- 38.5–40 s: decay.

Caution: the 'voice' feature is 300–3400 Hz energy, so it also picks up the guitar. voiceSmooth stays ≈ 0.31–0.36 during the breath. Use the markers, not the voice feature, whenever something must pause.

Onsets: detect them at init from a.flux (local maxima > 0.85, at least 0.4 s apart). Expected: 1.70, 4.97, 7.03, 7.63, 8.07, 10.53, 15.07, 15.67, 18.77, 19.17, 19.90, 22.23, 26.40, 27.30, 29.40, 30.63, 37.80, 38.53.

Never sync to words, never show lyrics, never assume a BPM.

Mappings:
- Sea phase S(t) = prefix sum of (0.3 + lowSmooth)/30. Expected values: S(10) = 9.06, S(20) = 16.86, S(40) = 31.19. It drives streamline drift, foam-ring expansion and the final echoes. Never use t·speed for the sea.
- Line weight: global half-width × (0.9 + 0.2·rmsSmooth).
- Onset ripples: each onset launches one closed-form ring from the point.
  · Radius r = c·(t − ti), with c = 170 px/s in the plan view and 40 m/s (world) in the oblique view.
  · Amplitude A·exp(−(t − ti)/2.2 s), with A proportional to the flux peak. It displaces sea lines by at most 6 px.
  · Pass the last 8 onsets as uniforms. The 15.07 ring is the largest (A × 1.8).
- voiceSmooth: grotto only, hachure width shimmer of ±4% (slow and spatially smooth). Night bone brightness ±4%.
- centroidSmooth, averaged over 2 s with a.avg: frequency of the foam-edge irregularity (brighter timbre gives finer lace).
- Decay, 38.5–40 s: motion amplitudes ease to 30%. Nothing freezes abruptly.

4. VISUAL GRAMMAR
4.1 Plate states
NIGHT (0–12.8 s, and anything still ahead of the dawn front):
- Ground: tinted indigo #16202E with a fixed plate tooth of ±2.5% (low-frequency mottling plus a fine hash).
- Land lines bone #E6DDC8; sea lines pale blue-grey #8FA3AE; foam bone #F2ECDF; the old trail ochre #B8863B.
- White-line logic: brighter means more and wider cut lines; the darkest areas are uncut plate.

DAY (behind the dawn front, 12.8–40 s):
- Paper: bone #ECE4D2 with a fixed paper grain of ±3% and a 1–2% plate tone.
- Granite and cliff ink: warm black #22211F. Grass contours: olive #5E5B40. Sand stipple: #6E604A. Sea ink: blue-grey #4E6773. Foam is bare paper.
- Ochre #B8863B is used only for the old trail and the dawn-front line.
- Black-line logic: darker means more and wider ink.

No other colors, and no gradients apart from the tooth and paper grain.

4.2 Line rules (they must survive H.264/Instagram)
- Parallel lines at least 13 px apart on screen (base spacing 14 px, jittered ±12% by a slow noise to give engraver unevenness).
- Width at least 2.2 px and at most 0.55 × the local spacing.
- Antialias with fwidth, using about a 1 px ramp.
- A fixed per-position width wobble of ±0.35 px (ink bleed). It does not change per frame.
- A near-horizontal line either stays static or moves at least 0.4 px/frame; never a slow creep.
- Stipple dots at least 2.4 px in diameter.
- Tone is built in three ways: width, then a second crossing set, then a third set only in the deepest darks.

4.3 Three views, all engraved:
- PLAN: orthographic, top-down view of the point.
- GROTTO: an engraving built from gruta_limpia.
- OBLIQUE: a perspective from the Portezuelo beach.
Views change only through soft FRONTS: behind a noisy moving edge, one layer is masked and replaced by the other. Line fields never interpolate between views.

5. WORLD (bake once at init; config.world)
Units and axes: meters, x east, y north, sea level 0.

Spine polyline, inland to tip: (−420,3300) (−260,2500) (−110,1700) (10,1000) (70,420) (55,60), tip (40,−40). Crest heights at those points: 95, 88, 74, 62, 46, 18, 0 m.

Cross profile, from the signed distance d to the spine (d < 0 west, d > 0 east):
- West face: u = −d/Ww with Ww = 35–55 m; h = hc·(1 − smoothstep(0.35, 1.0, u)). This gives a steep, fractured wall.
- Grotto notches: 4 dents at the cliff foot near y = 180, 330, 520 and 760, each 8–15 m wide and 6–10 m deep.
- East slope: u = d/We with We = 250–420 m; h = hc·(1 − u)^1.6. Gentle.
- Crest: a rounded plateau 40–90 m wide (flatten the top 8%).

Add:
- ridged-fbm granite knobs of ±4–8 m on the crest and cliffs;
- soft inland lomas (fbm, 5–25 m high, fading in north of y = 1800);
- two sand crescents, 0.5–2 m high and 30–60 m wide: the WEST one (Portezuelo) from (−220,1300) curving to (−1400,2300), concave toward the SW; the EAST one from (330,700) to (1500,1500), concave toward the SE;
- a sea floor with a gentle slope from −2 to −12 m;
- at the tip, a rocky platform with boulder bumps.

Bake into gl.target(2048, 2048, {float:true}), either with one GL pass or from JS, over x ∈ [−1700,1700], y ∈ [−700,2700]:
- R = h;
- G = rock mask (slope > 25°, or crest knobs);
- B = sand mask;
- A = signed distance to the coastline in meters (JS Felzenszwalb EDT at 1024², then upload).

Old trail (a polyline in config): along the crest from the top edge down to (60,420), then down the east slope to the east beach at (330,760), meandering ±15 m. It is the land's own path: it is cut as soon as the land is complete and stays until the last frame.

6. VIEWS
6.1 PLAN (0–7.6 s at night; 12.8–19.5 s by day)
Framing:
- North up, orthographic. Center (40,900), width 1500 m (1.389 m/px). The tip lands at y ≈ 1636; the ridge runs up the middle, the west bay is on the left and the east beach on the right.
- Push 1.00 → 1.05 from 2.8 to 7.6 s, and pull 1.05 → 1.00 from 15.05 to 19.5 s, both centered on the tip.

Layers:
a) CONTOURS. F = h/5 m. Draw a line where |fract(F + 0.5) − 0.5|/fwidth(F) < w. Every 25 m contour is 0.8 px heavier. Where fwidth(F) > 1/6 (spacing under 6 px, i.e. the west cliff), fade the contours out and let layer b carry the cliff.
b) HACHURES. These are static: render them at init into two canvases, NIGHT and DAY, at 1.1x frame size.
  · Evenly spaced streamlines (Jobard–Lefer) along the fall line −∇h, on land with slope > 3°.
  · Parameters: d_sep 12 px, d_test 5.5 px, RK2 step 1.5 px, stroke length 8–60 px, breaking at each 25 m contour so they read as engraver hachures. Use a grid hash to test separation.
  · Stroke width = mix(0.9, 4.2, slope/40°) × shade, with tapered ends.
  · DAY shade: sun at azimuth 96° (ESE), elevation 12°. West and shadowed faces get dense ink; east slopes get thin strokes.
  · NIGHT shade: a soft pre-dawn light from the eastern sky. East faces get wide bone strokes; west cliffs get thin strokes or none (uncut = dark).
  · On the cliff band, add a second crossing set.
c) SAND. Stipple on the sand mask: a hash grid of 7 px, dot radius driven by tone, radius at least 1.2 px.
d) SEA streamlines (section 7).
e) FOAM RINGS (section 7).
f) OLD TRAIL. Ochre stitch marks baked into the static canvases: dashes 6 px long and 3 px wide, period 11 px, following the path.
g) Plate tooth or paper grain.

6.2 GROTTO (7.6–15.0 s, NIGHT)
Source and crop:
- shared/assets/photos/clean/gruta_limpia.jpg (3015x1730).
- Crop x 1164–2137 at full height: 973x1730 mapped to 1080x1920, scale 1.110.
- The frame shows the huge vertical granite walls, the tall dark cave mouth, and the sand floor in the bottom 16%.
- Push 1.00 → 1.03 around (540,1100).

Init processing (JS, on a 540x960 copy of the crop):
1) Luminance, then a contrast curve.
2) Structure tensor: Sobel on the luminance blurred at σ 2 px, then blur the tensor at σ 10 px. Take the orientation ALONG edges and fractures, then smooth that orientation field heavily (σ 25 px).
3) Trace evenly spaced streamlines along it (d_sep 13 px at output scale) and render tapered bone strokes into a 1080x1920 canvas.

Tone:
- cave interior (luminance < 0.18): uncut indigo;
- dark walls: one thin set;
- mid walls: one wider set;
- lit rock and sand: add a second set crossing at ~70°. The sand floor may use short stipple strokes instead.
This is not a line screen: the lines follow the fractures. Fade the image edges softly; no hard rectangle.

Keep the cave mouth, walls and floor recognisable. The 1930s tourists stood at photo x 1481–1956, y 1286–1466 (removed in the clean crop). No figure may ever be placed there.

Fallback if the photo fails to load: push the warning «FALTA FOTO gruta_limpia» and use a procedural vertical-fracture orientation field with a dark elliptical mouth.

6.3 OBLIQUE (19.5–40 s, DAY)
The camera:
- A perspective from the Portezuelo beach. Camera at world (−520, 1420, 4.0 m), looking SSE toward the tip.
- The ridge's WEST face is seen obliquely: the crest descends from the left toward the tip, which sits at about 60% of the frame width, and meets the sea.
- Open sea lies beyond the tip on the right, the bay's water in between, and the camera's own beach in the foreground.
- Vertical FOV 50° (focal ≈ 2059 px); vertical exaggeration k = 1.4.

Tilt:
- The horizon sits at y ≈ 880 at 20.5 s and eases to y ≈ 1060 at 35.0 s (≈ 12 px/s). This slow tilt-up opens the sky for the text.
- In the closing, the WHOLE ridge silhouette must lie below y = 900. Tune the camera position and yaw until that holds.

Rendering:
- Raw-GL terrain mesh: a 512² grid over the visible area, with vertex texture fetch from the bake, rendered into an RGBA16F G-buffer (world h, view depth, normal) with a depth renderbuffer.
- Render it ONCE at init into a 1080x2200 buffer that covers the tilt range, then scroll it (a 2° tilt is visually a scroll). The per-frame cost is then only the engraving pass.

Engraving layers:
a) SKY: fine ruled horizontal lines (14 px spacing), 2.6 px wide at the top, thinning to 0 at the horizon behind the ridge (the dawn glow is bare paper). Add two long, soft cloud bands where the width swells by ±0.8 px. No sun disc, no rays.
b) LAND:
  · Contours are isolines of world h every 3 m, seen in perspective. The G-buffer gives hidden-line removal for free.
  · Width comes from light. The sun is behind the ridge, so the west face is in shadow and gets wide ink; grass tops catch rim light and stay thin.
  · Add a crosshatch set on steep shadowed faces (screen angles 60° and 120°, 13 px spacing).
  · Draw firm 2.5 px outlines where the G-buffer depth jumps: the ridge skyline against the sky, and cliff edges.
  · The grotto notches read as small dark wedges at the cliff foot. The old trail is an ochre dotted line along the crest.
c) SEA:
  · Ruled lines = isolines of log(depth), so spacing compresses gently toward the horizon. Wherever screen spacing would drop below 13 px, fade out every other line (LOD) so no two lines get closer than that.
  · Displace the lines with waves (noise driven by S(t)) and with the onset swells.
  · Interrupt them with foam gaps (section 7).
d) BEACH: stipple, denser in the wet band, plus a few long, gentle form lines. The swash appears as paper-gap foam lines sliding in and out.
e) FIGURES and the SHIP (section 8).

6.4 FRONTS (the only transitions)
- M1, 7.6–8.6 s, plan → grotto: a diagonal front from lower-right to upper-left, edge noise ±20 px, feather 35 px, with a 2 px bone line riding the front.
- M2, 12.8–15.05 s, grotto (NIGHT) → plan (DAY): the dawn front moves right → left (east → west). Its progress follows smoothstep over 12.8–15.0 s; it is time-driven, not audio-driven. Feather 60 px, edge noise ±30 px, with a 3 px ochre line riding it. Everything ahead of it is night/grotto; everything behind it is day/plan.
- M3, 19.5–20.5 s, plan → oblique: a horizontal front rising from the bottom, feather 40 px, with a 2 px ink line.
While a front is active, compute both layers and composite them through the mask. Never rotate a field and never interpolate between line fields.

7. SEA, FOAM AND ECHOES (one family of functions, shared by the plan and oblique views)
- Sea streamlines (plan): ψ = y_world/Δ + A·fbm3(p·k + flow(S(t))) + ripples. Within 60 m of the shore, blend ψ toward a function of the coast distance so the coastline is itself a streamline. Lines 2.2–3 px wide, 14 px apart.
- Foam rings: isolines of the coast distance D (bake channel A) for D between 0 and 150 m.
  · Ring spacing grows from 18 px near the coast to 26 px, and the rings drift outward with S(t).
  · NIGHT: bone lines. DAY: paper gaps, i.e. a 3–4 px band where the sea ink is removed, with slightly irregular edges; centroidSmooth sets the edge-noise frequency.
  · The rings are densest around the tip, and their width pulses with lowSmooth.
- Swash (oblique): paper-gap lines parallel to the waterline, moving in and out with offset = 4 m·(0.5 + 0.5·sin(phase(S)))·(0.6 + 0.8·lowSmooth).
- ECHOES, 32.5–40 s (oblique; this is THE key image):
  · For each sea pixel, take its world position on the sea plane.
  · The echo field is the isolines of (distance to the tip's coastline − 9 m·(S(t) − S(32.5)))/spacing, with a world spacing of 11 m.
  · Each echo is an arc repeating the point's outline, advancing outward toward the viewer.
  · Draw echoes as paper-white foam gaps 3–5 px wide with thin ink edges. Their contrast falls off with distance; 4–7 should be visible.
  · At the tip, the ridge's own 3 m contour lines must visibly continue across the coastline into the first echo: share the spacing and the phase at the coast. The viewer should read that the sierra's drawing crosses cota cero and becomes the wave.
  · The rock and the ridge never lower, move or dissolve.
- In the plan view the foam rings (6.1 e) are this same coast-distance function seen from above. The rhyme between opening and ending is intentional.

8. PEOPLE
Canon:
- Authored Bézier silhouettes in src/figures.js on a 7.5-head canon (child: 5.5 heads and 0.65 of adult height), each 12–30 curve segments.
- No faces, no articulated limbs, NO walk cycles.
- Indigenous: bare head; loose hair to the shoulders or mid-back; a plain hide mantle from the shoulders to the knee (a simple trapezoid with no fringe or pattern); bare lower legs. Optional: a long, plain, straight walking staff held vertical (a walking aid, never raised); a bundle at the hip or on the back.
- Colonists: brimmed hat (flat brim at least 1.8x head width, low crown); long-sleeved shirt or short jacket; breeches or trousers down to boots. Optional: a bundle over one shoulder; a walking stick.
- Postures: standing with weight on one leg; crouching at the water's edge with one hand to the sand (gathering); seated on a rock, knees up, staff across the knees; an adult with a child.
- Never: raised arms, pointing, gestures toward the other group, dance.

Atlas: at init, draw each figure into an atlas canvas with four channels:
- R: coverage (antialiased).
- G: hatch angle per body part (0..π stored as 0..1). The mantle is near-vertical and follows the drape; the head curves; the legs are vertical; the staff follows its length.
- B: solid core, i.e. coverage eroded by 5 px.
- A: a 2.5 px rim band on the lit side.

Rendering:
- NIGHT (grotto): the body is uncut indigo plate, with a 2 px bone rim on the lit side, 2–4 sparse bone hatch lines inside (lit side only), and a short bone contact stroke on the sand at the feet. They must read as dense, solid people on bright stipple sand, never as glowing figures.
- DAY (oblique):
  · Inside the coverage, ink = max(core, hatch(angle, 7 px spacing, 3.2 px width)).
  · Where the background is darker than 50%, add a 1.5 px paper-gap ring just outside the silhouette to separate figure from ground.
  · Cast shadow on the sand toward the camera (the sun is behind the ridge): the silhouette sheared and stretched to 1.2–1.8x the figure height, crosshatched at 40% coverage, with a 2 px blurred edge.
  · A firm contact stroke at the feet.

TEST FIRST, before building anything else:
1) Render a debug still with every silhouette at 180–290 px, in both modes.
2) Make the 270 px contact sheet.
3) If they read as pictograms or stick figures: fatten the mantle and hair masses, use solid ink with irregular engraved edges, and keep hatching only near the edges.

Cast in the grotto (7.6–15.0 s). Photo px map to output as (x − 1164, y)·1.110. Eye-level rule: a standing adult's head sits near photo y 1460.
- G1: elder seated on the sand near the left wall base, staff across the knees, facing right/inward. Photo foot (1300,1700), output (151,1887), ≈ 165 px tall.
- G3: child crouched, looking at the sand. Photo (1400,1690), output (262,1876), ≈ 110 px.
- G2: adult standing by the right boulder base, bundle at the hip, facing left. Photo (2050,1715), output (983,1904), ≈ 283 px.

Cast in the oblique view (19.6–40 s). Place each figure by the screen x of its feet and its distance d. With the camera at 4 m and horizon at y_h: feet y = y_h + 2059·4/d, head y = y_h + 2059·2.3/d. The horizon moves from 880 to 1060, so figures move with the tilt.
- O1: adult standing with a bundle at the hip, facing left along the beach. d 14 m, x ≈ 330, ≈ 250 px.
- O2: child crouched beside O1, looking at the sand. d 14.5 m, x ≈ 420.
- O3: adult crouched at the swash, gathering. d 19 m, x ≈ 560.
- O4: elder seated on a low rock, staff across the knees, facing right toward O1 and O2. d 16 m, x ≈ 150.
- O5: adult standing at the waterline, facing along the shore to the right. d 20 m, x ≈ 700.
- Colonists, cut in 24.6–26.4 s while every indigenous figure remains: C1 (hat, bundle on shoulder) and C2 (hat, walking stick) stand beside a small beached rowing boat at the far right, where the beach curves out. d 26–28 m (≈ 120–130 px), x ≈ 880–960, facing inland (left-up), at least 8 m from O5. No new trail for them: the path belongs to the land.
- Ship: engraved at 22.23 s near the horizon on the right, beyond the tip. Hull ≈ 50 px, one or two masts, sails partly furled, no flags. Anchored, with a ±1 px bob.
- FUTURE: at the 37.80 onset the burin starts cutting O6, a small child crouched between O1 and O4 (d 13 m, x ≈ 250). Its hatch appears stroke by stroke along a diagonal sweep, with the solid core last; it is ≈ 70% complete at 40.0 s. Nothing else is added or removed in the closing.

Indigenous figures are never faded, dimmed, thinned or erased. The only exception is a view front, which replaces the whole view.

9. TIMELINE (seconds)
0.00–0.20 AT REST. Indigo plate; sea streamlines already flowing. The coastline of the point and both bays is traced as ONE continuous bone foam line: cota cero. Nothing is cut inland yet.
0.20–2.80 EMERGE.
- Contour levels are cut from the coast inward: level L appears when L ≤ E(t), with E eased from 0 to 95 m. Each new contour draws along its length in ≈ 0.25 s, starting at the point nearest the tip.
- Hachures appear with their band. Seaward, 4–6 foam rings open from the coast.
- 1.70 onset: the first ripple leaves the tip.
- 2.80: the land is complete, and the ochre trail is cut last along the crest (the path was already there).
2.80–7.60 SIERRA DE NOCHE (plan, night). Push 1.00 → 1.05; streamlines flow; ripples at 4.97 and 7.03; line weight breathes with rms.
7.60–8.60 Front M1 to the grotto. G2 appears first (lower right, ≈ 7.7 s), then G3 and G1.
8.60–12.80 PIEDRA (grotto, night). Three people on the sand beneath the vast wall; hachure shimmers with the recitation; push 1.00 → 1.03.
12.80–15.05 ALBORADA (guitar breath). Dawn front M2 moves right → left. Behind it lies the DAY plan: warm inks on paper, the trail, foam as paper gaps. The grotto figures stay until the front passes over them. Little else moves.
15.05–19.50 DE DÍA (plan). The 15.07 onset sends the largest ring from the tip through the sea lines. Foam rings pulse with lowSmooth; onsets 15.67, 18.77 and 19.17 send smaller rings; pull 1.05 → 1.00.
19.50–20.50 Front M3 to the oblique view. The people are already standing there and are revealed from the bottom up.
20.50–27.30 HABITADA (oblique). O1–O5 on the beach; beyond the bay, the ridge's dark engraved west face with the ochre trail on its crest; ruled sky; slow tilt-up. 22.23: the ship. 24.6–26.4: C1 and C2 are cut beside the beached boat, far right.
27.30–32.50 DOS DISTANCIAS. The loudest passage: line weight breathes, and the 27.30, 29.40 and 30.63 onsets roll swells toward the beach. Everyone stays where they are.
32.50–35.00 LA SIERRA VOLVIÉNDOSE ESPUMA. At the tip, the ridge's contours cross the coastline and continue as advancing foam echoes (section 7).
35.00–40.00 CIERRE. Closing text on paper (section 10). The echoes continue at falling amplitude; O6 is being cut from 37.8 s; from 38.5 s motion eases to 30%.

10. CLOSING
Call: PBS.drawClosing(ctx, t, {t0: cfg.closingAt = 35.0, dark:false, logo: colorLogo, logoWidth: 620, y: 290, ink:'#22211F', ink2:'#3A362E'}). The block spans y 290–856, centered near x 528, inside the safe zone.
- From 34.2 s, fade all sky lines to at most 10% ink.
- Inside the block's bounding rectangles (title, motto, date, logo, note) plus a 30 px margin, fade lines to 0 so the text and logo sit on bare paper #ECE4D2 (text contrast ≈ 13:1). Pass those rectangles to the shader as uniforms.
- Below the block, the ridge band (its top at y ≥ 900), the sea echoes and the beach with every figure stay visible.
- No fade to white or black at the end: the plate holds and keeps breathing faintly.

11. CONFIG (src/config.js)
- title 'Cota cero', subtitle, seed; width, height, fps, duration; safeZone; assets; featuresUrl.
- audio {src:'../../shared/assets/audio/punta_ballena.mp3', AUDIO_START_SECONDS:47.8, fadeIn:0.4, fadeOut:1.5, volume:1}.
- logo {file:'logo/01_logo_uvpb_color.png', width:620}; closingAt 35.0.
- photos {grotto:{file:'photos/clean/gruta_limpia.jpg', crop:[1164,0,973,1730]}}.
- palette {night, day}; lines {spacing:14, jitter:0.12, minWidth:2.2, maxWidthFrac:0.55}.
- world {spine, crest, Ww, We, notches, beaches, trail}.
- views: plan framing; grotto crop and push; oblique camera position, yaw, fov, k, horizonY keyframes.
- fronts; figures (id, view, silhouette, feet position or d + screen x, facing, start).
- markers {breath:[12.8,15.05], stanza:15.05, decay:38.5}; onsetThreshold 0.85; onsetMinGap 0.4.

12. PERFORMANCE BUDGET
Init, once, ≤ 6 s total: terrain bake and EDT; the night and day plan hachure canvases (streamline tracing); the grotto streamline canvas; the oblique G-buffer (≈ 150 ms); the figure atlas; audio prefix sums and onsets.
Per frame:
- plan or oblique engraving pass: 90–160 ms, with at most 10 texture fetches (bake or G-buffer 2, static hachure canvas 1, figure atlas 1–2, noise 2);
- during fronts, two layers: ≤ 330 ms;
- Canvas2D drawImage plus closing: ≈ 15 ms.
Log timings at t = 1, 10, 14, 25, 34 and 38.

13. BUILD ORDER AND SELF-REVIEW
1) Silhouette debug still in both modes, plus the 270 px sheet.
2) Terrain bake plus a DAY plan still at 16 s. It must read as a low ridge ending in a point: steep west, gentle east, two crescents.
3) NIGHT plan plus EMERGE: stills at 0, 1.2 and 2.6 s.
4) Grotto: 10.5 s.
5) Oblique, including G-buffer and figures: 23.5 and 34 s.
6) Fronts: 8.2, 13.9 and 20.2 s.
7) Echoes and closing: 33.8 and 39.9 s.
8) Compression test:
  · render stills at t = 28.000 + k/30 for k = 0..15;
  · encode them with the FFMPEG above: -framerate 30 -pattern_type glob -i '<dir>/*.png' -c:v libx264 -b:v 3.5M -pix_fmt yuv420p;
  · extract the frames and inspect them at 100%: no crawling, moiré or broken lines;
  · if they fail, widen spacing to 15 px and minimum width to 2.6 px.
9) Review every reviewTime, both on a 270 px contact sheet and at full size.

14. PITFALLS
- Unknown Pleasures creep. If a frame shows stacked wavy lines over a ridge on dark, you have drifted: contours must follow height, never depth.
- Moiré between sea lines and paper grain. Keep the grain fixed and fine (1 px) and the lines at least 13 px apart.
- fwidth discontinuities at the coast and the cliff. Compute line fields per region and blend them with the masks.
- Figures swallowed by the crosshatch behind them. Keep the 1.5 px separation ring.
- The logo is drawn last by drawClosing; never pass it through a shader.
- Nobody on the skyline, no row of figures facing the sea, and nobody looks at the colonists.
- No text anywhere except the closing.

## Aceptación
1. Frame 0 shows the indigo plate: a continuous bone foam line tracing the coast (cota cero) and sea lines already flowing. By 2.8 s the full plan of a LOW ridge ending in a point, with foam rings, is engraved. There is no waveform line and no stacked transect anywhere in the reel.
2. Every visible mark is an engraved line, a stipple dot or bare plate/paper, in the listed inks only. No fills, gradients, glows, washes, zooms over 5%, rotations or dissolves.
3. Parallel lines are at least 13 px apart and at least 2.2 px wide. The 3.5 Mbps compression test of 16 consecutive frames shows no crawling or moiré.
4. The geography reads as Punta Ballena: steep west wall with notches, gentle east slope, two sand crescents, a point ringed by foam. No trees, roads or buildings.
5. The grotto (8.6–12.8 s) is recognisable from gruta_limpia. Its strokes follow the rock's fractures, not straight stripes. No figure sits in the removed tourists' zone.
6. The first people (G2, G3, G1) appear during 7.7–8.6 s: dense, grounded, never glowing, readable at 270 px.
7. The dawn front (12.8–15.05 s) inverts night to day right-to-left with an ochre edge. The 15.07 ring is the largest.
8. In the oblique view from 19.6 s:
  · O1–O5 are in ordinary activities with varied orientations; O1 is ≈250 px and none is under ≈105 px;
  · nobody is on the skyline and there is no row facing the sea;
  · C1 and C2 appear in 24.6–26.4 s while every indigenous figure remains; they stand apart at the far right with readable hats;
  · the ship is small, anchored and flagless.
9. From 32.5 to 35 s the ridge's contour lines visibly cross the coastline and continue as advancing foam echoes, while the ridge itself never lowers or dissolves.
10. Closing:
  · the exact four texts via drawClosing, with the color logo at 620 px, intact;
  · the block at y 290–856, inside x 100–900 / y 250–1500, on bare paper (lines suppressed);
  · the whole ridge below y 900, with the sea echoes and every figure visible below the block;
  · at 39.9 s the child O6 is visibly half-engraved.
11. No other text at any time. No walk cycles. Groups are told apart only by silhouette.
12. Human presence ≥ 40% of the timeline (planned ≈65%). Indigenous figures come first and are never faded out.
13. render(t) is deterministic (the same t gives an identical PNG), ≤ 600 ms in the worst case and ≤ 250 ms typically. warnings are surfaced and logo:true.