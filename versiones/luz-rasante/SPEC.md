# Luz rasante

Una sola alborada sobre la Sierra de la Ballena antes de Lussich, vista desde arriba, como un pájaro quieto. La luz rasante del primer sol revela el relieve y sus huellas: el pasto mata por mata, las juntas del granito, el sendero gastado. De las personas casi no vemos el cuerpo, que desde arriba es un punto tibio, pero sí su sombra. Al amanecer una persona proyecta veinte o treinta metros de silueta, con el pelo suelto, el manto, el atado o la vara. Cuando llega la luz, la gente ya está ahí. Más tarde un barco fondea en la bahía y dos sombras con sombrero de ala suben desde un bote, aparte. En la punta, las juntas iluminadas del granito siguen en el mar como encaje de espuma: la sierra volviéndose espuma. Al final la luz todavía está llegando y un niño sale de la sombra de una roca.

BUILD SPEC — «Luz rasante» (slug: luz-rasante). Version 3 of 3 of the Día del Patrimonio 2026 reel. This spec is self-contained: read all of it before coding.

0. THE IDEA
One dawn over the Sierra de la Ballena, before Lussich, seen from straight above (nadir), as if by a bird holding still. Low grazing light ('luz rasante') reveals relief and traces: every grass tussock, the joints of the granite, the worn old path.
People appear through what the low sun does to them. From above a body is only a small warm dot, but at dawn a person's shadow is 15–40 m long, so each person becomes a long silhouette lying across the grass: loose hair, a mantle, a bundle, a staff.
When the light arrives, the people are already there. Later a ship anchors in the bay, and two brimmed-hat shadows walk up from a beached boat, apart from everyone else. At the point, the sunlit joints of the granite continue into the sea as a lace of foam: the sierra becoming foam. At the end the light is still arriving, and a child steps out of a rock's shadow into the sun.
Thesis: the light reveals a land that was already inhabited. It is explicitly NOT 'the same light for everyone' (no universal-harmony framing).

It must NOT look like:
(a) The epic-AI golden-hour kit: no god rays, volumetric haze layers, sun disc, lens flares, bloom, sparkles, dew bursts or gold-to-white glow.
(b) Layered-mountain parallax wallpaper; there are no profile shots at all.
(c) Google Earth: no satellite-photo textures, no roads or buildings, and no zooming between scales. Scale changes only at hard cuts.
(d) Shadow puppets: no walk cycles, no swinging legs.
(e) Generic terrain. It must read as Punta Ballena: a low ridge; a sheer, black west wall with grotto notches; a gentle lit east slope; a dark point ringed by foam; two sand crescents; no trees.
(f) Heroic or romantic tableaux: no figures on the skyline, no row of silhouettes, no trio facing the sunrise.
(g) The rejected v1 (flat painted diorama with small articulated cartoon people).

1. FIXED BRIEF CONSTRAINTS
- Format: 1080x1920, 30 fps, exactly 40 s = 1200 frames (t = frame/30).
- Client and theme: UVPB (Unión Vecinal de Punta Ballena y Lagunas del Sauce y del Diario); Día del Patrimonio 2026, Uruguay; theme «Raíces indígenas: pasado, presente y futuro»; dates «3 y 4 de octubre».
- Period: artistic evocation, not archaeology. Working frame is the second half of the 18th century, before Lussich (1896). No pines, eucalyptus or any forest; no roads, buildings, fences or cars.
- Geography: a long LOW granite ridge ending in the Atlantic as a point, with steep fractured walls and sea grottos on the WEST, a gentle grass slope on the EAST, curved sand beaches on both sides (Portezuelo to the west), pradera and low monte, soft hills inland. Height/length ≤ 1:12. Never Andean peaks, fjords or jungle.
- Representation:
  · The land is inhabited before anyone arrives.
  · Indigenous presence comes first and never fades or is replaced.
  · Colonists come later, while all indigenous figures remain.
  · No pacts, trade, friendship, fights, ceremonies, or gestures between the groups.
  · No specific people named.
  · None of: feathers, headdresses, tipis, foreign dress, invented ornaments, body paint, rituals, petroglyphs, weapons, nudity, faces, caricature.
  · Every human shadow has the same tone; the groups differ ONLY by silhouette.
  · Colonial presence: brimmed hats, jackets, an anchored ship, a beached boat. No flags, swords, crosses or horses.
  · The ending affirms continuity: no 'last Indian', no farewell tableau.
- Human presence ≥ 40% of the time; here ≈63%.
- Text: ONLY the closing, via PBS.drawClosing, with exactly: «Día del Patrimonio 2026» / «Raíces indígenas: pasado, presente y futuro» / «3 y 4 de octubre» / «Evocación artística realizada con IA». No lyrics, captions or labels. Fonts: EB Garamond + Source Sans 3 only (local).
- Logo: this version closes DARK over the sea, so use shared/assets/logo/02_logo_uvpb_blanco.png. drawClosing draws it intact (no recolor, filter or overlay; aspect and transparency kept) at logoWidth 620, which gives a visible mark of ≈565 px (the file is 441x70 with margins).
- Safe zone for all text and the logo: x 100–900, y 250–1500.
- No voice-over, no template transitions.
- Photos are texture material only, never shown as pictures: the clean crops in shared/assets/photos/clean/. Never load the raw rinconada.jpg, grutas.jpg or relieve.jpg.

2. HARNESS (read shared/lib/core.js, gl.js, closing.js, shared/render.js and versiones/_plantilla/ first)
Setup:
- Create versiones/luz-rasante/ by copying versiones/_plantilla/.
- Every tunable goes in src/config.js.
- Extra source files (e.g. src/world.js, src/figures.js, src/shaders.js, src/shots.js) need <script> tags in BOTH index.html and render.html, placed after config.js and before main.js.
- Never edit shared/, tools/ or other versions.

Contract:
- window.createReel(canvas, cfg) returns Promise<{render(t), warnings, logo}>.
- render(t) draws synchronously: GL passes, then ctx.drawImage(gl.canvas, 0, 0), then PBS.drawClosing.
- Push drawClosing warnings once, plus «Logo 441 px ampliado a 620: pedir versión vectorial o PNG grande».

core.js:
- PBS.rng, makeNoise, smooth, ease, clamp, lerp, mix, hex, loadImage, loadFonts(cfg.assets+'fonts/', warnings), font.
- PBS.loadAudioFeatures(cfg.featuresUrl) returns a, with a.at(key, t) and a.avg(key, t, span), and 1200-value arrays (0..1, 30 fps) for rms, low, mid, high, voice, flux and centroid, each with a *Smooth variant, plus a.markers. If the file is missing it returns {missing:true}: use constant fallbacks (dawn clock linear).

gl.js:
- new PBS.GL(w, h) creates its own WebGL2 canvas (preserveDrawingBuffer).
- gl.program(fs) compiles against a fixed vertex shader that provides `in vec2 uv`, with uv.y = 0 at the BOTTOM.
- gl.texture(img|canvas, {nearest, repeat}) uploads RGBA8 flipped, so the image top is at uv.y = 1. gl.texture(null, {w, h, float:true}) makes an RGBA16F texture.
- gl.target(w, h, {float}) returns a render target.
- gl.draw(prog, uniforms, target) binds only numbers, vec2–4 and textures.
- PBS.GLSL_NOISE provides hash21, vnoise, fbm.

GL pitfalls:
(1) Arrays, ints and matrices (the figure list, the shot transform) need raw gl.gl.uniform*v calls after gl.gl.useProgram(prog) and before gl.draw, or go in an RGBA32F data texture (OES_texture_float_linear is on).
(2) If you create any buffer of your own, keep your own fullscreen-triangle buffer [-1,-1, 3,-1, -1,3] and re-bind it before every gl.draw: draw() points vertex attribute 'p' at whatever ARRAY_BUFFER is bound.
(3) Screen row from the top = (1 − uv.y)·1920.
(4) Verified here: RGBA16F and RGBA32F textures and targets, generateMipmap on NPOT RGBA8, MAX_TEXTURE_SIZE 8192.

closing.js:
- PBS.drawClosing(ctx, t, {t0, dark, logo, logoWidth, y, shadow}), with a 0.8 s fade and a 10 px rise.
- Measured with the real fonts: the title is 744 px wide at 74 px, and with logoWidth 620 the block is 566 px tall. With y = 320 it spans 320–886, centered near x 528.

Determinism:
- render(t) is a pure function of t: no Math.random, Date or performance.now in render, and no state between frames.
- Figure motion is closed-form splines of t. The dawn clock is a precomputed prefix sum. Grain is seeded by Math.round(t·30). Init randomness uses PBS.rng(cfg.seed).

Stills (run from the repo root):
- FFMPEG=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2 NODE_PATH=/opt/node22/lib/node_modules WORKERS=1 node tools/export.js --dir versiones/luz-rasante --stills 0,2.5,6
- Output goes to out/luz-rasante/stills/.
- Contact sheet: python3 tools/sheet.py out/luz-rasante/stills /tmp/luz-rasante_sheet.png 5 270 (or into your scratchpad).
- View PNGs with the Read tool; empty the stills folder between rounds.
- NEVER run the full export; the orchestrator does it.

Performance, measured here (SwiftShader, 1080x1920):
- each texture fetch in a full-res pass ≈ 9 ms;
- an empty pass ≈ 10 ms;
- a 6-octave warped fbm ≈ 110 ms.
Hard ceiling 600 ms per render(t); target ≤ 320 ms.

3. AUDIO
AUDIO_START_SECONDS = 47.8 (config); features.json matches 47.8.

Structure (signal analysis, words not verified):
- 0–12.8 s: spoken recitation over guitar;
- 12.8–15.05 s: guitar breath (marker 13.1);
- 15.05–38.5 s: sung stanza;
- 38.5–40 s: decay.
'voice' includes guitar energy: voiceSmooth stays ≈ 0.31–0.36 in the breath, so gate with the markers.

Onsets: detect at init from a.flux (local maxima > 0.85, at least 0.4 s apart). Expected: 1.70, 4.97, 7.03, 7.63, 8.07, 10.53, 15.07, 15.67, 18.77, 19.17, 19.90, 22.23, 26.40, 27.30, 29.40, 30.63, 37.80, 38.53.

No word sync, no lyrics, no BPM.

Mappings:
- DAWN CLOCK (master variable). D(t) = normalized prefix sum of g·(0.55 + 0.9·rmsSmooth), with g = 0.15 inside [12.8, 15.05] (0.3 s ramps), else 1. The light speeds up when the song swells and almost stops in the breath.
  · Expected D: 4.97 → 0.143; 10.53 → 0.314; 12.8 → 0.376; 15.05 → 0.386; 22.23 → 0.557; 27.3 → 0.685; 30.63 → 0.781; 34.7 → 0.883; 40 → 1.
  · Sun elevation e(t) = 0.4° + 6.4°·D(t), giving ≈ 1.32°, 2.41°, 2.81°, 2.87°, 3.96°, 4.78°, 5.40°, 6.05°, 6.80° at those times.
- Sea phase S(t) = prefix sum of (0.3 + lowSmooth)/30: waves, swash, lace drift. lowSmooth also sets swash amplitude and lace width (±30%).
- voiceSmooth: sun intensity ±6% (the light breathes with the voice).
- centroidSmooth (2 s average): sun color temperature ±3%.
- highSmooth: grass sway amplitude (≤ 1.2 px) and foam brightness.
- rmsSmooth: exposure ±4%.
- Flux onsets: cut points (below) and wave-set foam flashes at the point.

4. WORLD (one consistent world; meters, x east, y north, sea level 0)
The ridge:
- Spine inland to tip: (−420,3300) (−260,2500) (−110,1700) (10,1000) (70,420) (55,60), tip (40,−40). Crest heights at those points: 95, 88, 74, 62, 46, 18, 0 m.
- Cross profile from the signed distance d to the spine:
  · west wall (d < 0): u = −d/Ww, Ww 35–55 m, h = hc·(1 − smoothstep(0.35, 1.0, u)), a sheer fractured wall;
  · 4 grotto notches at the wall foot near y = 180, 330, 520, 760, each 8–15 m wide and 6–10 m deep, dark from above;
  · east slope (d > 0): u = d/We, We 250–420 m, h = hc·(1 − u)^1.6, gentle;
  · crest: a rounded plateau 40–90 m wide.
- Ridged-fbm granite knobs and outcrops (±4–8 m) on the crest, the wall and scattered on the east slope. Include a granite knoll 5–7 m high about 90–110 m ESE of (230,980): its shadow must cross S4's frame (below).

Around the ridge:
- Soft inland lomas (fbm, 5–25 m, north of y = 1800).
- Two sand crescents 30–60 m wide: WEST (Portezuelo) from (−220,1300) curving to (−1400,2300), concave to the SW; EAST from (330,700) to (1500,1500), concave to the SE.
- Sea floor −2 to −15 m.
- The point: a dark granite platform with boulders and tide pools.
- Monte: dark rounded clumps 1–4 m on sheltered slopes and hollows. NO trees.

Paths and craft:
- Old trail (config polyline): along the crest from the north edge to (60,420), then down the east slope to (330,760), meandering ±15 m.
- The anchored ship at ≈ (720,520) in the east bay.
- A beached rowing boat on the east beach at ≈ (590,905).

Bakes, done at init with GL passes:
- BIG: 2048² RGBA16F over x ∈ [−1700,1700], y ∈ [−700,2700] (1.66 m/texel). R = h, G = rock mask, B = sand mask, A = signed coast distance (JS EDT at 1024²). Plus a baked normal texture.
- HORIZON MAP: 1024². The max terrain elevation angle toward the sun azimuth 96°, by 128 steps growing from 2 m to 900 m with a jittered start, stored in degrees.
- LOCAL TIP: 1024² over a 160 m square centered at (40,−20) (0.156 m/texel), with boulders (fbm-perturbed SDF blobs, 0.5–2 m high), joints and tide pools. Give it its own 64-step horizon map.

Relief detail below the bake resolution comes from a 512² tileable noise texture (4 channels at different scales, REPEAT, mipmapped) built at init. Filter all detail by pixel footprint so wide shots do not alias.

5. LIGHT MODEL (world pass into an RGBA16F linear target, then a grade pass)
Sun direction:
- Azimuth 96° (ESE; early-October sunrise at 35°S), elevation e(t).
- Human shadows use e_h = max(e, 2.3°) so they never exceed ≈ 42 m and the head stays in frame.

Terrain shadow:
- lit = smoothstep(hz − 0.15°, hz + 0.15°, e), with hz = max(horizonMap, hzFar(h)).
- hzFar(h) = 1.4° − 0.022°·h(m) is an art-directed distant eastern horizon: the highest ground lights first.
- Tune so that S1 frame 0 is 25–35% lit, and the terminator reaches the east beach's waterline at about 6–7 s in S2.

Sun color by elevation:
- ≤ 1°: (1.00, 0.55, 0.30)
- 2.5°: (1.00, 0.66, 0.40)
- 4°: (1.00, 0.75, 0.50)
- 6°: (1.00, 0.82, 0.62)
- 7°: (1.00, 0.86, 0.70)
Intensity = 3.0·smoothstep(−0.3, 2.0, e)·(1 + 0.06·(voiceSmooth − 0.5)).
Sky fill = (0.38, 0.46, 0.58)·(0.30 + 0.25·smoothstep(0, 6, e))·AO, with AO from concavity.
Exposure targets (sRGB): lit grass 0.55–0.65, shaded grass 0.16–0.24, sea 0.16–0.26, foam ≤ 0.92.

IMPORTANT: grass is not a Lambert plane. At a 2° sun, flat Lambert ground turns to dark mud. Model grass as vertical blades and tussocks:
- N·L_eff = max(N·L, 0.30 + 0.35·tussockNoise)·(1 − microShadow).
- microShadow: in close shots (W ≤ 150 m), sample a detail height of 0.2–0.35 m tussocks at 5 points toward the sun (0.15, 0.3, 0.6, 1.0, 1.6 m). If any rises above the sun ray, the pixel is shadowed (soft).
- This is what makes raking light read as a photograph: every tussock bright on one side, with a long thin shadow.

Grade pass:
- filmic ACES-fit curve;
- shadows cooled toward #1B2433, lights warm;
- film grain 1 px, ±0.03, per-frame seed;
- 5% vignette;
- nothing else (no bloom).

6. SURFACES
- Pradera: olive #6F6B3C, dry ochre #B08A4A and straw #C9B48A, mixed by two noise scales.
- Monte: clumps in #4F5236 / #3C3F2A, each casting its own long shadow.
- Old trail: a 0.8–1.2 m ribbon of shorter, paler grass (albedo +8%, smoother, fewer micro-shadows). In raking light it reads as a smooth lit line: the path existed.
- Granite:
  · #3A3C3F / #4A4C4F / #6B6A66, lichen patches #8C8A70 / #A39C7A;
  · joints (Voronoi edges, 3 m cells) as dark cracks with a warm lit lip #B89A78 on the sun side;
  · micro-texture: high-pass luminance (photo minus its 40 px blur, REPEAT, 20–30% weight) of shared/assets/photos/clean/gruta_limpia.jpg and rinconada_limpia.jpg. Never recognisable as a photo.
- Sand:
  · dry #CDB892, wet #8F7F66 with a cool sky sheen;
  · ripple marks from stretched noise, visible in raking light;
  · generic footprints: small ovals with micro-shadows along the swash and from the boat, with no toe or heel detail (no barefoot-vs-boot coding).
- Sea:
  · deep #2E4452, mid #3E5563, shallow #5F7A86 by coast distance;
  · wave normals from 2 scrolled noise fetches driven by S(t);
  · water in the ridge's shadow darker and cooler;
  · swash bands on the beaches driven by S(t) and lowSmooth;
  · breaking foam lace at the point (section 9); foam #F1EEE6.
- relieve_sin_bosque.jpg (clean; the forest is already excluded):
  · (1) as a ≤ 20% high-pass texture for grass irregularity;
  · (2) as a REFERENCE. Compare your S2 and S7 stills against it: the dark, rugged granite fringe with foam along the shore, the grass slope above it, the worn path.
- If any photo is missing, push 'FALTA FOTO <file>' and use procedural noise.

7. PEOPLE AS SHADOWS
The silhouette atlas (Canvas2D at init, then RGBA8 with mipmaps, 256x512 cells):
- Authored Bézier silhouettes on a 7.5-head canon (child 5.5), drawn as seen from the sun's direction (front, back or profile per figure).
- Indigenous: bare head; loose hair to the shoulders or mid-back; plain hide mantle from shoulders to knee (no fringe or pattern); bare lower legs; optional straight walking staff held vertical, taller than the person; optional bundle at the hip or on the back. Also a child and an elder with a staff.
- Colonists: brimmed hat (brim ≥ 1.8x head width); shirt or short jacket; breeches or trousers to boots; optional bundle on the shoulder; optional walking stick.
- Poses: standing (2 weight-shift variants), walking stance (legs apart, static), crouched gathering (one hand down), seated (knees up or on a rock).

Projection, per pixel:
- At most 12 figures, each gated by its bounding box. Figure data goes in a uniform array (raw gl.uniform4fv) or a data texture.
- along = dot(p − foot, sDir), where sDir is the ground direction away from the sun (azimuth 276°, WNW).
- across = dot(p − foot, perp(sDir)).
- v = (along·tan(e_h) + (h(p) − h(foot)))/H. The height term bends the shadow over the terrain.
- u = across/Wsil + 0.5.
- Sample the atlas with LOD = 0.5 + 2.5·v: the penumbra grows away from the feet.
- The shadow removes only the DIRECT sun and keeps the sky light, so it stays cool and transparent like a real shadow.

Bodies seen from above:
- A head ellipse of 0.2 m plus a shoulders/mantle ellipse of 0.5x0.3 m. A colonist's hat is a 0.45 m disc.
- A warm rim on the sun side; the body occludes the ground beneath it. On screen this is 3–8 px.

Motion:
- Translation along closed-form splines at ≤ 0.4 m/s, with eased stops.
- While moving, blur the lower 45% of the shadow (the legs) with +1.5 LOD. This stride blur replaces any walk cycle.
- Standing figures switch between their two weight-shift variants every 6–9 s with a 1 s cross-fade. No bobbing.

Legibility:
- In the hero shots (S1, S3, S4, S6, S8) every shadow is ≥ 220–250 px long and ≥ 8 px wide at the torso.
- Head, hair or hat must read on a 270 px contact sheet.
- If they fail, narrow the frame width W. Never enlarge the people.

Ship (S5):
- An anchored small 18th-century vessel seen from above: hull 18x5 m of dark wood, deck lines, two masts as dots with furled sails as thin pale bundles, NO flags.
- The long mast and hull shadows lie on the water (300–600 px, graphic). Bob ±0.3 m.

Beached rowing boat: 5 m, with its shadow.

8. SHOTS AND TIMELINE
Every shot is nadir. Shots change only by HARD CUTS on the listed times. Each shot has a world center, a frame width W in meters (= 1080 px), a rotation θ (the frame's up direction relative to north), a drift ≤ 25 px/s and a push ≤ 5%.

S1 PRIMERA LUZ, 0.00–4.97
- Center (35,760) on the crest plateau; W 80 m; θ 0 (east to the right, shadows pointing left).
- The plateau and the trail cross the frame vertically.
- At t = 0 only the highest band is lit, in warm raking light; the rest is deep blue-grey.
- Already there, at the plateau's east edge: I1 (adult with staff), I2 (adult with a bundle at the hip), I3 (child). Their bodies are warm dots around x ≈ 700–820, and their shadows (≈ 500–570 px) cross the lit plateau to the left.
- The lit band widens with the clock to ≈ 70% by 4.97. The 1.70 onset gives only a small step in light.

S2 EL FILO, 4.97–10.53
- Center (−80,900); W 1250 m; θ −10°; push 1.00 → 1.04.
- The whole ridge runs down to the point, with the tip at y ≈ 1600.
- The east slope is lit and the west wall black. The ridge's long shadow lies across the west bay and slowly recedes.
- The terminator crosses the east beach and reaches the waterline at ≈ 6–7 s.
- The foam ring at the tip and both crescents are visible. The old trail reads as a fine lit line.
- People are invisible at this scale: do not fake dots.

S3 SENDERO, 10.53–15.07
- Center (−60,1480); W 75 m; θ 20°.
- Five indigenous people on the old trail (I1–I3, I4 an elder with a staff, I5 an adult) walk south at 0.35 m/s with stride blur. Shadows are 480–580 px.
- At 12.8 (the breath) they ease to a stop and stand. The dawn clock almost stops; only the grass trembles faintly.

S4 LA LUZ LLEGA, 15.07–22.23
- Center (230,980) on the lower east slope beside the knoll; W 80 m; θ 0.
- At the cut the frame is in the knoll's shadow except one edge. From ≈ 15.5 to 17.5 s, as e rises past the knoll's horizon, the terminator sweeps across the frame.
- When the light reaches them, their shadows appear on the grass (≈ 330–460 px): I6 and I7 seated on the knoll's edge (compact shadows), I5 standing with a bundle, I3 (child) crouched by a clump of monte. Before the light, their bodies are visible dimly as dots.
- Onsets 15.67, 18.77 and 19.90 bring small gusts: tussock sway ±1 px.

S5 LA BAHÍA, 22.23–27.30
- Center (650,820) over the east bay and beach; W 460 m; θ −15°; drift 15 px/s.
- The ship is anchored with long mast shadows on the water, and the boat is on the sand.
- Tiny dots with short shadows: two colonists by the boat, and the indigenous gatherers along the waterline far to the left, at least 120 m away.

S6 LA ORILLA, 27.30–30.63
- Center (560,900) on the east beach; W 70 m; θ 0.
- Right: the beached boat. C1 (hat, bundle on shoulder) and C2 (hat, walking stick) walk slowly up the beach toward the NW (inland) and stop by 29.4. Shadows ≈ 280–310 px.
- Left third, at least 25 m away: I8 (adult crouched at the swash, gathering), I9 (child standing nearby), I10 (adult with a bundle facing north along the beach). They continue their own activity, and nobody turns toward the others.
- Swash lines, wet-sand sheen and generic footprints.

S7 PIEDRA Y ESPUMA, 30.63–34.70
- Center (40,40) over the point; W 260 m; θ 180° (south up: the sea at the top, the tip pointing up).
- The sierra-to-foam beat (section 9). People are too small to read here, so draw no dots.

S8 CIERRE, 34.70–40.00
- Center (40,−30) at the tip; W 64 m; θ 180°.
- The rock edge and foam line run across y ≈ 1250–1400. Calm dark sea above (the text zone). The tip's rocks and tide pools fill the lower band.
- Indigenous people at rest, off-axis, at different distances and orientations:
  · I4, the elder, seated on a boulder facing inland (down the frame);
  · I6, crouched at a tide pool, gathering;
  · I5, standing with a bundle, facing inland;
  · I11, a child standing in a boulder's shadow at the lower edge. At the 37.80 onset the receding shadow uncovers the child and its long shadow appears: the light is still arriving (the future).
- Tune the boulder so the child is uncovered at 37.80 ± 3 frames. If physical tuning is fiddly, drive that one shadow edge with a scripted mask timed to 37.80.
- Far away and apart, entering from the lower-right edge: the two brimmed-hat shadows of C1 and C2 (their bodies outside the frame), standing still, at least 25 m from the group.

Presence: S1 + S3 + S4 + S6 + S8 ≈ 25 s ≈ 63%. Indigenous people come first (frame 0); colonists appear from 22.23, while indigenous figures are still on screen.

9. LA SIERRA VOLVIÉNDOSE ESPUMA (S7, continuing into S8)
One cellular function draws both halves: Voronoi F2 − F1, 3 m cells, one shared seed.
- (1) On the rock, the granite joints: dark crack lines with a warm lit lip on the sun side (raking light makes one edge of each joint glow).
- (2) In the sea, the foam lace: white film lines along the SAME cell edges, the same cells continuing across the coastline.

Animation:
- From 30.63 the lace front grows outward from the rock edge. It is visible where coastDist < R(t), with R eased from 0 to 60 m by 33.0 s (a noisy front).
- The lace then breathes (width ±30% with lowSmooth), drifts outward (advected by S(t)) and flashes brighter on onsets (wave sets breaking).
- For at least 2 s the viewer must clearly see the lit joint network of the stone continue into the sea as foam.
- The rock never lowers, erodes or sinks.
- In S8, confine the lace to within ≈ 25 m of the rocks (below y ≈ 1300) so the sea behind the text stays calm and dark.

10. CLOSING
- PBS.drawClosing(ctx, t, {t0: cfg.closingAt = 35.0, dark:true, logo: whiteLogo, logoWidth: 620, y: 320, shadow:'rgba(5,8,14,0.5)'}). The block spans y 320–886, inside the safe zone.
- Behind it: the calm sea (#1E2B36–#2A3846) with an extra soft scrim (multiply 0.72, feathered, no visible box), so luminance is ≤ 0.18 behind all text. No foam streaks under the text.
- Hold to 40 s. The lower band keeps living: the lace breathes and the child's shadow appears at 37.8. From 38.5, motion eases.

11. CONFIG (src/config.js)
- title 'Luz rasante', seed, format fields, safeZone, assets, featuresUrl.
- audio {src:'../../shared/assets/audio/punta_ballena.mp3', AUDIO_START_SECONDS:47.8, fadeIn:0.4, fadeOut:1.5, volume:1}.
- logo {file:'logo/02_logo_uvpb_blanco.png', width:620}; closingAt 35.0.
- photos {graniteA:'photos/clean/gruta_limpia.jpg', graniteB:'photos/clean/rinconada_limpia.jpg', grass:'photos/clean/relieve_sin_bosque.jpg'}.
- world {spine, crest, Ww, We, notches, knoll, beaches, trail, ship, boat, bake extents}.
- sun {azimuth:96, e0:0.4, e1:6.8, humanMinElev:2.3, hzFar:[1.4, 0.022]}.
- clock {gateFloor:0.15, base:0.55, gain:0.9}.
- shots [{t0, t1, center, W, theta, drift, push}].
- figures [{id, group, silhouette, pose(s), height, path spline or foot, times, heading}].
- palette, grade, markers.

12. PERFORMANCE
- World pass, full resolution, ≤ 26 texture fetches:
  · bake/normal: 2
  · horizon: 1
  · noise: 4–6, including micro-shadow samples in close shots only
  · photo detail: 2
  · water: 3
  · atlas: only inside shadow boxes
  ≈ 200–260 ms.
- Grade pass ≈ 25 ms.
- Canvas2D ≈ 15 ms.
- Init (≤ 8 s): bakes, normals, horizon maps (≈ 1–3 s), local tip bake, noise texture, silhouette atlas, photo high-passes, audio tables.
- Log timings at t = 2, 8, 14, 20, 32, 38.

13. BUILD ORDER AND SELF-REVIEW
1) World bake plus an S2 still at 8 s. It must read as Punta Ballena: compare it against relieve_sin_bosque and the brief (steep black west wall, gentle lit east, crescents, point with foam).
2) Light model on S1 at 0 and 2.5 s. The grass under raking light must look photographic: tussocks, micro-shadows, a muted palette.
3) Silhouettes and shadow projection on S3 and S4 (12, 16, 20 s), checked on the 270 px sheet. Heads, hair and hats must read.
4) Water, foam and the S7 lace (32, 34 s).
5) The colonial beats in S5 and S6 (24.5, 28.5 s).
6) S8 and the closing (36.5, 39.9 s).
7) Cut timing, which must land exactly on round(t·30) of the listed times, and performance.
8) Review every reviewTime at 270 px and at full size.

14. PITFALLS
- Lambert darkness at a low sun (see 5).
- Shadows too thin or too short: narrow W instead of scaling people.
- Detail aliasing in S2 and S5: filter the detail by footprint.
- Horizon-map banding: jitter the start and soften the penumbra.
- A crest skyline with figures on it; a row of silhouettes facing the sea.
- Colonists and indigenous people sharing one walking composition or direction as a single group.
- Saturation creeping up; any bloom, rays or sparkles.
- Text other than the closing.

## Aceptación
1. Every frame is a nadir view of the same world. Scale changes only through hard cuts at 4.97, 10.53, 15.07, 22.23, 27.30, 30.63 and 34.70, landing exactly on those frames. There are no zooms between scales.
2. The geography reads as Punta Ballena and holds up against relieve_sin_bosque:
   - a low ridge with a steep, black west wall with grotto notches;
   - a gentle, lit east slope;
   - a dark point ringed by foam;
   - two sand crescents;
   - pradera and monte clumps;
   - no trees, roads or buildings.
3. Frame 0 shows warm raking light on the crest band with three long human shadows already present, heads, hair and mantle readable. The rest of the frame is in blue shadow.
4. The grass under raking light looks photographic (tussocks, micro-shadows), not dark Lambert mud or plastic CG. The palette is muted, with no god rays, sun disc, flares, bloom or sparkles.
5. In S1, S3, S4, S6 and S8 each human shadow is at least about 220–250 px long and 8 px wide at the torso. Indigenous (bare head, loose hair, mantle, staff or bundle) and colonial (brimmed hat, jacket) silhouettes read at 270 px, and all shadows share one tone. There are no walk cycles, only slow translation with stride blur.
6. In S4 the terminator crosses the frame after 15.07, and the people's shadows appear as the light reaches them.
7. In S5 and S6:
   - the ship is anchored, flagless, with long mast shadows;
   - the colonists walk up from the boat and stop;
   - indigenous people at least 25 m away continue their own activity;
   - there is no gesture or interaction between the groups.
8. In S7 the lit granite joints continue into the sea as the same foam lace, visible for at least 2 s. The rock stays whole.
9. In S8 and the closing:
   - the exact four texts and the white logo at 620 px, intact;
   - the text block at y 320–886 inside the safe zone, over a calm dark sea (luminance at most 0.18);
   - indigenous figures at rest, off-axis, with varied orientations and one seated;
   - the child's shadow appears at the 37.80 onset;
   - the colonists' hat shadows sit far off at the edge;
   - no trio facing the sea and nobody on a skyline.
10. No text appears other than the closing.
11. Human presence covers at least 40% of the runtime (about 63% planned). Indigenous figures appear first and never fade or get replaced.
12. render(t) is deterministic, takes at most 600 ms in the worst case, surfaces its warnings, and reports logo:true.