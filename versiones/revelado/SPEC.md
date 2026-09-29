# Revelado

Dos fotografías reales del lugar tratadas como copias en la bandeja de revelado. Una postal de Portezuelo del siglo XX, gastada y quieta, recibe una ola de revelador. Detrás de la ola la copia se renueva y cobra vida: el mar se mueve y la luz de la mañana camina sobre la piedra. En la bandeja lo más denso aparece primero, y lo primero que aparece son ellos: personas indígenas hechas de la plata más densa de la copia, sólidas, con peso y sombra, que la voz va revelando. Después viene la gruta, con su piedra y su agua, y otra vez la playa, donde más tarde y más lejos se revelan dos sombreros y una vela. En la orilla el granito suelta su plata y la plata se vuelve espuma. Para el cierre el cielo se quema en oscuro, como en el laboratorio, mientras abajo la copia sigue revelándose: un niño todavía no terminó de aparecer.

BUILD SPEC — «Revelado» (slug: revelado). Version 2 of 3 of the Día del Patrimonio 2026 reel. This document is self-contained: read all of it before coding.

0. THE IDEA
The photographic process is the only visual grammar. Two real 20th-century photographs of the place are treated as prints in a developer tray: the clean crops of the Portezuelo postcard and of the Punta Ballena grotto.

What happens:
- A wave of developer crosses the frame: the meniscus you see when a tray is rocked. Behind it the print is developed again. The faded, still postcard becomes a fresh, deep, living print: the water moves and light drifts over the stone.
- In a real tray the densest silver appears first. Here the densest silver is people, so indigenous people appear FIRST, before the land around them. They are solid condensations of dark silver with weight, contact shadows and cast shadows.
- Development speed follows the measured voice (gated in the guitar breath): the singing develops the image.
- Later, and farther away, two colonists with brimmed hats and a small sail develop too, while every indigenous figure stays.
- At the waterline the granite's silver loosens and turns into foam: the sierra becoming foam.
- For the closing the sky is burned in, a darkroom gesture, and the text sits in that dark. Below it the print is still developing: the youngest figure has not finished appearing.

The logic is older = more alive, and the image is never fixed.

It must NOT be any of these:
(a) The rejected v1 in reel/: a flat painted diorama with small cartoon people walking.
(b) Colorization. This is a monochrome toned print. Only the light temperature may shift, and saturation stays ≤ 0.12.
(c) Ghosts. No luminous, white, glowing, haloed or translucent figures, and no long-exposure smears. Figures are the densest, most solid things in the print.
(d) Fake documents. Never present the photos as indigenous or 18th-century documents. The figures are never photographic: they are dense silver masses with no inner detail.
(e) Template effects:
  · no particle dissolve or lift-off, light leak, glitch, film burn or dissolve;
  · no zoom over 4% per print;
  · the meniscus is the ONLY transition and is used exactly 3 times.
(f) The raw photos. Never load rinconada.jpg, grutas.jpg or relieve.jpg: they contain stamps, captions, a 1920s bather and 1930s tourists. Relieve is not used at all; its 2x upscale breaks into blocks.

1. FIXED BRIEF CONSTRAINTS
- Format: 1080x1920, 30 fps, exactly 40 s = 1200 frames (t = frame/30).
- Client and theme: UVPB (Unión Vecinal de Punta Ballena y Lagunas del Sauce y del Diario); Día del Patrimonio 2026, Uruguay; theme «Raíces indígenas: pasado, presente y futuro»; dates «3 y 4 de octubre».
- Period: an artistic evocation, not a reconstruction. Working frame: second half of the 18th century, before Lussich. No pines, eucalyptus or any forest; no roads, buildings, fences or cars.
- Geography: the Sierra de la Ballena is a low granite ridge running into the sea as a point, ringed by foam, with fractured walls and grottos, sandy beaches, pradera and monte.
- Photos:
  · The photos are 20th-century images with unverified dates.
  · They are MATERIAL (memory, a layer of time), never documents.
  · Always cropped: here only the clean crops, which already have no borders, stamps, captions, bather or tourists.
- Representation:
  · The land is already inhabited. There is no 'universal harmony' framing.
  · Indigenous presence comes first and never fades, dims, bleaches before others do, or is replaced.
  · Colonists appear later, while every indigenous figure remains.
  · Coexistence without pacts, trade, friendship, fights, ceremonies or gestures between the groups.
  · No specific people named. None of: feathers, headdresses, tipis, foreign dress, invented ornaments, body paint, rituals, petroglyphs, weapons, nudity, faces, caricature.
  · Both groups are the SAME silver density; they differ only in silhouette.
  · Colonial presence: brimmed hats, shirts or jackets, a small sail. No flags, swords, crosses or horses.
  · Continuity at the end: no 'last Indian', no farewell tableau, no trio facing the sea, nobody on the skyline.
- Human presence: at least 40% of the time; here ≈97%, starting at 0.3 s.
- Text: ONLY the closing, via PBS.drawClosing, with the exact texts «Día del Patrimonio 2026» / «Raíces indígenas: pasado, presente y futuro» / «3 y 4 de octubre» / «Evocación artística realizada con IA». No lyrics, captions or labels. Fonts: EB Garamond and Source Sans 3 only (local).
- Logo: this version closes DARK, so use shared/assets/logo/02_logo_uvpb_blanco.png.
  · drawClosing draws it intact: no recolor, filter, grain or overlay; aspect and transparency kept.
  · logoWidth 620 (the file is 441x70 with transparent margins, so the visible mark is ≈565 px).
- Safe zone for text and logo: x 100–900, y 250–1500.
- No voice-over and no template transitions.

2. HARNESS (read shared/lib/core.js, gl.js and closing.js, shared/render.js and versiones/_plantilla/ first)
Folder and contract:
- Create versiones/revelado/ by copying versiones/_plantilla/. Every tunable goes in src/config.js.
- Extra source files (for example src/figures.js, src/masks.js, src/shaders.js) need <script> tags in BOTH index.html and render.html, after config.js and before main.js.
- Never edit shared/, tools/ or other versions.
- Contract: window.createReel(canvas, cfg) returns Promise<{render(t), warnings, logo}>.
- render(t) draws the whole frame synchronously: GL passes, then ctx.drawImage(gl.canvas, 0, 0), then PBS.drawClosing.
- Push the drawClosing warnings once, plus the note «Logo 441 px ampliado a 620: pedir versión vectorial o PNG grande». Set logo:false only if the logo failed to load.

core.js:
- PBS.rng(seed), PBS.makeNoise(seed), PBS.smooth, ease, clamp, lerp, mix and hex, PBS.loadImage(src), PBS.loadFonts(cfg.assets + 'fonts/', warnings), PBS.font().
- PBS.loadAudioFeatures(cfg.featuresUrl) returns a, with a.at(key, t) and a.avg(key, t, span). Arrays of 1200 values (0..1, 30 fps): rms, low, mid, high, voice, flux, centroid, each also with a Smooth variant. Plus a.markers.
- If the features file is missing it returns {missing:true}; use constant fallbacks.

gl.js:
- new PBS.GL(w, h) creates its own WebGL2 canvas (preserveDrawingBuffer).
- gl.program(fs) uses a fixed vertex shader that gives `in vec2 uv`, with uv.y = 0 at the BOTTOM.
- gl.texture(img|canvas, {nearest, repeat}) uploads RGBA8 flipped, so the image top is at uv.y = 1.
- gl.texture(null, {w, h, float:true}) creates an RGBA16F texture; gl.target(w, h, {float}) creates a render target.
- gl.draw(prog, uniforms, target) binds only numbers, vec2–vec4 and textures.
- PBS.GLSL_NOISE provides hash21, vnoise and fbm.

GL pitfalls:
(1) Int, array and matrix uniforms must be set with raw gl.gl calls after gl.gl.useProgram(prog) and before gl.draw. Alternatively, pack them into a small RGBA32F data texture (OES_texture_float_linear is on).
(2) If you create any ARRAY_BUFFER of your own, keep your own fullscreen-triangle buffer [-1,-1, 3,-1, -1,3] and re-bind it before every gl.draw; draw() calls vertexAttribPointer on whatever buffer is bound.
(3) The screen row counted from the top is (1 − uv.y)·1920. Canvases uploaded with gl.texture are flipped in the same way.
(4) Verified here: RGBA16F and RGBA32F textures and targets, generateMipmap, and large RGBA8 textures (3030 px wide, max 8192).

closing.js:
- PBS.drawClosing(ctx, t, {t0, dark, logo, logoWidth, y, shadow}) uses a 0.8 s fade and a 10 px rise.
- Measured with the real fonts: the title is 744 px wide at 74 px. With logoWidth 620 the block is 566 px tall: y = 300 gives y 300–866, centered near x 528.

Determinism:
- render(t) is a pure function of t: no Math.random, Date or performance.now in render, and no state between frames.
- Development, motion and grain are closed-form or looked up from init arrays.
- Seed grain per frame with Math.round(t·30). Seed all init randomness from PBS.rng(cfg.seed).

Stills (run from the repo root):
- FFMPEG=/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2 NODE_PATH=/opt/node22/lib/node_modules WORKERS=1 node tools/export.js --dir versiones/revelado --stills 0,1.2,4
- Output goes to out/revelado/stills/.
- Contact sheet: python3 tools/sheet.py out/revelado/stills /tmp/revelado_sheet.png 5 270 (or into your scratchpad). View with the Read tool, and empty the stills folder between rounds.
- NEVER run the full export; the orchestrator does it.

Performance (measured here, SwiftShader, 1080x1920):
- each texture fetch in a full-res pass ≈ 9 ms;
- an empty pass ≈ 10 ms;
- 6-octave warped fbm ≈ 110 ms.
Hard ceiling 600 ms per frame; target ≤ 220 ms.

3. AUDIO
AUDIO_START_SECONDS = 47.8 (config). features.json was computed for 47.8.

Structure (signal analysis; the words were not verified):
- 0–12.8 s: spoken recitation over guitar.
- 12.8–15.05 s: guitar breath (marker 13.1).
- 15.05–38.5 s: sung stanza.
- 38.5–40 s: decay.

Caution: 'voice' is 300–3400 Hz energy and also picks up the guitar; voiceSmooth stays ≈ 0.31–0.36 in the breath. Gate by markers.

Onsets: detect them at init from a.flux (local maxima > 0.85, at least 0.4 s apart). Expected: 1.70, 4.97, 7.03, 7.63, 8.07, 10.53, 15.07, 15.67, 18.77, 19.17, 19.90, 22.23, 26.40, 27.30, 29.40, 30.63, 37.80, 38.53.

No word sync, no lyrics, no BPM.

Mappings:
- WET-TIME, the master clock of development: W(t) = ∫0^t g(τ)·(0.25 + 0.75·voiceSmooth(τ)) dτ.
  · g = 1, except 0.12 inside [12.8, 15.05], with 0.3 s smoothstep ramps.
  · Precompute it as a 1201-entry prefix sum and upload it as a 1201x1 RGBA32F texture.
  · Expected: W(1) = 0.55, W(3) = 1.90, W(12.8) = 8.77, W(15.05) = 8.97, W(22.2) = 13.12, W(26.4) = 15.58, W(30) = 18.17, W(35) = 21.34, W(39.97) = 23.67.
- Sea phase S(t) = prefix sum of (0.3 + lowSmooth)/30. Expected S(10) = 9.06, S(40) = 31.19. It drives waves, swash and foam; lowSmooth also scales the swash amplitude.
- Flux: onsets add a small surge to the meniscus highlight only, and bursts of grain release in the sierra-to-foam passage.
- highSmooth: caustic intensity in the grotto (0.6 + 0.4·high); foam brightness pulses.
- rmsSmooth: overall density ±4%.
- centroidSmooth (a.avg over 2 s): highlight warmth ±2%.

4. MATERIAL MODEL
4.1 Photos
The two sources:
- shared/assets/photos/clean/rinconada_limpia.jpg (3030x1710). Portezuelo beach:
  · a cliff with inclined strata on the left, then the sand beach;
  · a large granite boulder at the waterline, center-right;
  · the sea;
  · the distant low ridge of the sierra descending into the sea at the upper right (the headland);
  · a pale sky.
  · The 1920s seated bather was at photo (1444,1079) and has been removed: never place a figure within x 1380–1510, y 950–1110.
- shared/assets/photos/clean/gruta_limpia.jpg (3015x1730). Black and white: vertical granite walls, a tall dark cave mouth, and a sand floor at the bottom.
  · The 1930s tourists stood at photo x 1481–1956, y 1286–1466 and have been removed: never place a figure there.

Loading:
- Use PBS.loadImage(cfg.assets + path), then draw the image into a canvas and read it with getImageData.
- Upload a luminance texture per photo (RGBA8, R = luminance).
- If a photo fails to load, push 'FALTA FOTO <file>' and use a procedural fallback (fbm granite, flat sand, a flat sea band) so rendering never breaks.

Masks:
- Author them in config as polygons in photo pixels. The coordinates below are approximate: REFINE them by rendering a debug still that overlays the masks on the photo.
- Rasterize them at init, blur by 3 px, and pack them into one RGBA texture per photo:
  · R: water;
  · G: rock (cliff, boulder, headland, walls);
  · B: sand, with the wet band as a soft ramp;
  · A: sky (rinconada) or the cave mouth (gruta).
- Also build a distance-to-water-edge field (JS EDT at half resolution).

rinconada_limpia polygons (photo px):
- SKY: above the skyline (980,0) (1200,40) (1400,100) (1600,180) (1800,270) (1920,340) (2000,405) (2200,465) (2400,495) (2600,535) (2800,570) (3030,600).
- HEADLAND, the distant sierra: between that skyline and the sea line at y ≈ 612–618, for x ≥ 2000.
- SEA: (2040,612) (3030,618) (3030,990) (2930,960) (2905,850) (2800,760) (2650,720) (2480,700) (2300,690) (2140,735) (2090,790) (2020,770) (1990,720).
- BOULDER: (2080,820) (2130,740) (2300,690) (2480,700) (2650,720) (2800,760) (2905,850) (2930,960) (2860,1060) (2780,1250) (2700,1390) (2400,1405) (2250,1330) (2120,1150) (2085,1000).
- CLIFF: from (0,0) along the skyline to (2040,420), then (2060,600) (1800,660) (1500,690) (1100,700) (700,690) (300,660) (0,640).
- WET SAND: ≈ (1600,700) (2000,700) (2090,790) (2080,900) (1900,860) (1650,780).
- BEACH: y 690–1150; foreground rocks and pebbles below y 1150.

gruta_limpia polygons (photo px):
- MOUTH: (1330,400) (1620,340) (1900,380) (2000,700) (1990,1440) (1420,1452) (1330,1100).
- SAND: (1130,1730) (1135,1610) (1210,1500) (1360,1456) (1990,1446) (2010,1520) (1990,1600) (2050,1730).
- WALLS: everything else.
- Caustic band: walls within 260 px above the sand line.

4.2 Tone
The ramp:
- Paper white Lp = 0.955 (#F3EDE0).
- Every output color comes from a toned ramp over luminance: shadows warm black #1E1712, mids #7A6650, highlights #F2EADB.
- Saturation ≤ 0.12, highlights slightly warm, shadows neutral.

ARCHIVE (print P1 only, and only ahead of meniscus 1): the postcard as it is, faded.
- L_a = 0.30 + 0.60·L0 (lifted blacks, Dmax ≈ 0.5), with highlights yellowed toward #CDB594.
- Coarse grain.
- Foxing: sparse brown spots, 3–14 px, alpha ≤ 0.18, at fixed seeded positions.
- 2–3 fine light scratches.
- Silvering: a cool +6% sheen in the densest areas near the edges.
- A soft edge fade. Totally still.

LIVING: L_l = toneCurve(L0), a fresh print with deeper blacks, cleaner whites and +20% midtone contrast. Target points: 0.05→0.03, 0.30→0.22, 0.50→0.55, 0.75→0.84, 0.84→0.93.

Target density: D_t = −log10(max(L_l, 0.02)/Lp). The final luminance is Lp·10^(−D).

4.3 Development (deterministic; this is why people appear first)
The front:
- Each meniscus k has a closed-form front: s_k(t) = s0 + v_k·(t − t0_k) along its travel direction.
- The shape offset is n(x) = 40 px·fbm(along/300 px). Onset surges affect only the rendered highlight, never the timing.
- Arrival time per pixel: t_arr = t0_k + (proj(x) + n(x) − s0)/v_k.

Development:
- τ = W(t) − W(t_arr), which is ≥ 0 behind the front. Read W(t_arr) from the W texture.
- dev = 1 − exp(−max(0, τ − 0.06)/0.55).

Applying it:
- P1 re-develops from its archive state: D = D_a + (D_t − D_a)·dev. Living motion fades in with dev.
- Meniscus 2 and 3: the old print bleaches as D_old·(1 − smoothstep(0, 0.35, τ)), while the new print develops from paper as D_t·dev. Add the two densities and clamp.
- Fronts travel bottom→top and the new print's figures sit low in the frame. So the new figures appear before the old ones bleach, and there is always someone on screen.

Physics check: with a shared dev, darks cross visibility first. Figures have D_fig = 1.55, so they are the first readable shapes, ≈ 0.3–0.4 s after the front passes. Rock comes next, then sand, and sky last.

4.4 Grain
Per-frame seed: Math.round(t·30). Amplitude is luminance-dependent and peaks in the midtones.
- LIVING: ±0.04 at 1–1.5 px, a mix of a 1 px hash and a 2 px blurred hash.
- ARCHIVE: ±0.085, in 2–2.5 px clumps.
- FIGURES: denser, clumped silver inside the body (2–3 px clumps, ±0.05). The edge is dithered: a hash threshold over a 2 px soft ramp, so it looks made of silver rather than vector.
- No grain on the text or logo; they are drawn afterwards on the 2D canvas.

4.5 The meniscus (exactly 3 uses)
Rendering at the front:
- a bright specular line, 2–3 px, #FFF6E6 at 55%, broken by noise so it reads as liquid;
- a 6 px refraction offset of the image within the 10 px behind the line;
- a wet band behind it: −5% luminance, slightly glossier, fading over ≈ 0.8 s;
- a 1 px darker lip ahead of it.
Speed ≈ 600–700 px/s (it crosses 1920 px in 2.6–3.2 s). Curved and noise-driven, never a straight wipe.

The three uses:
- MEN1: t0 = −0.9 s, so it is already crossing at frame 0, with its front at y ≈ 1350. It moves bottom→top with a slight tilt over P1 (archive → living).
- MEN2: 14.25–15.9 s, bottom→top on a 12° diagonal, P1 → P2. The grotto's figures develop at ≈ 15.0 s, on the first sung note.
- MEN3: starts on the 22.23 onset and exits at ≈ 24.6 s, bottom→top, P2 → P3.

4.6 Living motion (all multiplied by dev, so the archive stays still)
Sea (P1 and P3). The postcard's sea is overexposed, so generate the motion:
- horizontal wavelets: noise stretched 6:1, with its scale compressing toward the horizon (y ≈ 612); ±5% luminance; scrolled by S(t);
- ±2 px horizontal UV flow;
- swash foam lines along the water edge: bands of distance-to-edge moving by 10 px·(0.5 + 0.5·sin(phase(S)))·(0.6 + 0.8·lowSmooth), color #F4F1EA;
- a wet-sand sheen that brightens slightly as the swash retreats.

Light (all prints):
- A slow drifting light field (soft noise at 900 px scale, moving 12 px/s) multiplies luminance by 0.93–1.07: morning light moving over the land.
- The highlights warm gradually, from #F2EADB toward #F4E6CC by 30 s (saturation ≤ 0.12).

Grotto (P2):
- A thin sheet of swash slides in over the sand from the bottom edge and retreats. Its leading edge is bright with a dark wet gloss behind; timing by S(t) and lowSmooth.
- Caustics on the lower walls and the rim of the mouth: the sum of three rotating sine gratings, abs, raised to the power 3; ±6% × (0.6 + 0.4·highSmooth). This is sunlight reflected off the water.
- The dark mouth breathes by ±3%.

Nothing else moves: stone, cliff and headland stay still. Parallax: none, or at most 6 px between two planes during the P1 pan. Never a depth search.

4.7 Figures (the cast is in section 6)
Design:
- Authored Bézier silhouettes in src/figures.js on a 7.5-head canon (children 5.5).
- No faces, no inner detail, no animation.
- They are recorded only when still, the Boulevard-du-Temple principle of early photography. Nobody walks.
- Indigenous: bare head, loose hair to the shoulders or back, a plain hide mantle from shoulders to knee (no fringe or pattern), bare lower legs. Optional: a straight staff held vertical, a bundle.
- Colonists: a brimmed hat (brim at least 1.8x head width), shirt or jacket, trousers or breeches with boots. Optional: a bundle, a walking stick.
- Postures: standing, seated, crouched gathering, an adult holding a child's hand. Never raised arms, pointing or dance.

At init, render one atlas canvas per print:
- R: coverage (antialiased).
- G: cast shadow. The silhouette projected on the ground following the photo's light: in P1 and P3 the light comes from the upper left, so shadows fall down-right at 0.6–0.9x the figure height, blurred 4 px.
- B: contact shadow, a soft ellipse at the feet 1.4x the foot width, blurred 3 px.
- A: a 2 px rim band inside the outline on the lit side.
- Also: a figure-ID texture (NEAREST) and a small data texture with each figure's start time and τ0.

Composite:
- D = max(D, 1.55·coverage·devFig).
- The rim lowers density to ≈ 0.75 on the lit edge. This is a slightly lighter line that separates dark figures from dark rock. It is not a glow and is never brighter than the local background.
- The cast shadow adds 0.30·dev density; the contact shadow adds 0.55·dev.
- Clumped inner grain (4.4).
- devFig follows the print's τ unless the figure has its own start:
  · C1 and C2 start at 26.4 s with τ0 = 1.0, so they are ≈ 92% by 30 s;
  · the youngest child, I7, starts at 35.8 s with τ0 = 1.6, so it is ≈ 70% developed at 40 s.

Legibility rule: every figure must differ from its immediate background by at least 0.25 in luminance along at least 70% of its outline, head included. The measured backgrounds at the planned spots are 0.45–0.65. Verify on the 270 px sheet. If a head lands on dark rock, move the figure or strengthen the rim.

4.8 La sierra volviéndose espuma (P3, 29.4–40 s)
Where: along the rock–water boundary, which here means the foot of the distant headland (the sierra entering the sea) and the base of the big granite boulder.

What happens:
- In a 40 px band of rock beside the water, 3 px grain cells detach one by one. Release times come from the cumulative flux curve, so the 29.40 and 30.63 onsets release bursts.
- Each detached cell drifts seaward along the gradient of the water-distance field: position = p0 + dir·v·age plus a small swirl, all closed-form.
- As it crosses into the water mask it turns from rock-dark to foam-white.
- The cells gather into lace-like foam lines parallel to the shore that drift outward (bands of water distance moving with S(t)).
- A foam ring breathes around the boulder base, its width ±30% with lowSmooth, and a bright foam line runs along the headland foot.
- Foam brightness pulses with highSmooth, and the whole effect continues under the closing in the lower band.

The rock silhouette never lowers, erodes, moves or sinks. Only its edge sheds grain of light.

4.9 Rinse (12.8–15.05 s, guitar breath)
P1 rests under still water:
- a slow whole-frame refraction wobble of at most 1.5 px;
- one ripple ring from a drop at 13.1 s, centered at (620,760), 3 px amplitude, growing past the frame edges in 1.8 s;
- tones deepen by 4%.
Development and motion almost pause (g = 0.12). The figures stay.

4.10 Burn-in (34.5–36.0 s)
A darkroom 'burning in' of the sky: a soft dark gradient descends from the top, its edge slightly wavy like a hand-held card.
- Final state: +1.2 density from y 0 to 950, feathering to 0 at y 1250.
- Luminance behind the text must be ≤ 0.15.
- The lower band (y > 1250) stays fully visible.

5. PRINTS AND FRAMING
All prints use the full photo height. output = (photo − origin)·scale.
- P1 PORTEZUELO: rinconada_limpia, 0 to ≈15.9 s. Crop 962x1710 at scale 1.1228. The crop origin x pans from 1250 to 1600 photo px over 0–12.8 s (eased, ≈ 31 px/s on screen) and holds during the rinse. The frame shows the end of the cliff and the beach on the left, the sea on the right, and the start of the boulder and the distant sierra.
- P2 GRUTA: gruta_limpia, 14.25–24.6 s. Crop origin x 1164, 973x1730, scale 1.1098. Push 1.00 → 1.035 about (540,1150).
- P3 PORTEZUELO (boulder, sea, sierra): rinconada_limpia, 22.23–40 s. The crop origin x drifts from 1760 to 1700 over 22.23–35 s (≈ 5 px/s), then holds.

6. PEOPLE
Size rules:
- Rinconada: a standing adult is ≈ 0.34·(y_foot − 600) photo px tall. Multiply by 0.62 for seated, 0.55 for crouched, 0.68 for a child.
- Grotto: the camera is at eye level, so a standing adult's head sits near photo y 1460 and height ≈ y_foot − 1460.

P1:
- I1: adult standing with a bundle at the hip, facing left along the beach. Foot (1760,1180), ≈ 221 px on screen.
- I2: child holding I1's hand. Foot (1812,1172), ≈ 148 px.
- I3: adult standing near the wet sand, looking toward the water. Foot (1990,965), ≈ 139 px.
- MEN1 develops them at ≈ 0.3–2 s.

P2:
- G1: elder seated on the sand near the left wall, staff across the knees. Foot (1300,1700), ≈ 165 px.
- G3: child crouched, looking at the sand. Foot (1400,1690), ≈ 105 px.
- G2: adult standing by the base of the right boulder, bundle at the hip, facing left. Foot (2050,1715), ≈ 283 px. Give it a strong rim: dark rock behind.
- None of them inside the tourists' zone.

P3:
- I3 again at (1990,965): the same person, still there.
- I8: adult standing with a bundle, facing left/inland. Foot (2010,1330), ≈ 279 px.
- I5: elder seated on a low rock, turned toward I6. Foot (1880,1360), ≈ 180 px.
- I6: adult crouched at a tide pool, gathering. Foot (2230,1520), ≈ 193 px.
- I7: child standing near I6. Foot (2150,1590), ≈ 257 px. This is the future: it starts developing at 35.8 s.
- Colonists, developing from 26.4 s, slower, once every indigenous figure is already there:
  · C1: hat, bundle on the shoulder. Foot (1790,905), ≈ 116 px.
  · C2: hat, walking stick. Foot (1840,900), ≈ 115 px.
  · Both stand on the far sand near the cliff foot, facing the sea, at least 150 photo px from I3. No interaction.
- A tiny sail (≈ 22 px) develops on the sea near the horizon at (2520,628) from 27.3 s.
- No row of figures, no one on the skyline, no trio facing the sea.

7. TIMELINE (seconds)
0.00 Frame 0: the faded Portezuelo postcard fills the frame, still and foxed. MEN1 is already crossing at y ≈ 1350. Below it the print is renewed: deep tones, moving sea, swash lines, drifting light.
0.30–1.20 I1 and I2 develop FIRST as dense dark forms on the sand, then the rock, then the sand around them (dark first). At the 1.70 onset, a small surge of the highlight.
1.20–3.00 MEN1 leaves through the top; I3 develops near the water at ≈ 2 s.
3.00–12.80 THE BEACH ALIVE. A slow pan right toward the sea and the boulder; the distant sierra enters at the upper right. Waves, swash and light move; the three people stay.
12.80–15.05 RINSE. Stillness under water, one ripple ring at 13.1 s. MEN2 starts at 14.25 from the bottom.
15.05–17.50 P2 develops on the first sung note: G2 and G3 first (low), then G1, then the walls, then the lit sand. The old print bleaches above the front; MEN2 exits at ≈ 15.9.
17.50–22.20 THE GROTTO. Push 1.00 → 1.035; the swash slides in over the sand and retreats; caustics on the lower walls; the people stay.
22.23–24.60 MEN3, on the onset. P3 develops bottom→top: I6, I5, I8 and I7's rock first, then I3 at the water, then the boulder, sea and distant sierra. The grotto bleaches ahead of the front. I7 itself stays undeveloped until 35.8.
24.60–29.40 PORTEZUELO, LATER. Sea and light move. At 26.4, C1 and C2 begin to develop far off on the sand; at 27.3, the sail.
29.40–34.50 LA SIERRA VOLVIÉNDOSE ESPUMA. Grain bursts at 29.40 and 30.63; foam lace grows from the boulder base and along the headland foot; the rock stays whole.
34.50–36.00 BURN-IN descends. At 35.0 the closing fades in.
35.80–40.00 I7 develops slowly, reaching ≈ 70% at 40 s; foam still breathes in the lower band. From 38.5, motion eases to 40%. Nothing freezes and there is no fade to black.

8. CLOSING
Call: PBS.drawClosing(ctx, t, {t0: cfg.closingAt = 35.0, dark:true, logo: whiteLogo, logoWidth: 620, y: 300, shadow:'rgba(10,8,6,0.5)'}).
- The block spans y 300–866, inside the safe zone.
- Text in #F5EFE3/#E2D9C8 on the burned area (luminance ≤ 0.15, contrast > 12:1).
- Below y ≈ 1250: I5, I6, I7 and I8, and the boulder base with its foam. The youngest is still developing.

9. CONFIG (src/config.js)
- title 'Revelado', seed, format fields, safeZone, assets, featuresUrl.
- audio {src:'../../shared/assets/audio/punta_ballena.mp3', AUDIO_START_SECONDS:47.8, fadeIn:0.4, fadeOut:1.5, volume:1}.
- logo {file:'logo/02_logo_uvpb_blanco.png', width:620}; closingAt 35.0.
- photos {portezuelo:'photos/clean/rinconada_limpia.jpg', gruta:'photos/clean/gruta_limpia.jpg'}.
- prints [{id, photo, t0, t1, originX keyframes, scale, push}].
- masks: polygons in photo px.
- meniscus [{t0, dur, dirDeg, s0, v, noiseAmp}].
- development {tau0:0.55, induction:0.06, gateFloor:0.12, bleach:0.35}.
- figures [{id, print, group, silhouette, foot:[x,y], sizeRule, facing, start, tau0}].
- tone ramps and grain; burn {t0:34.5, t1:36.0, yFull:950, yZero:1250}.
- markers and onset threshold.

10. PERFORMANCE
One full-res composite pass with at most 18 texture fetches ≈ 150–200 ms:
- old print photo and mask: 2–3;
- new print photo and mask: 2–3, with refraction taps only near the front;
- W lookup: 2;
- figure atlas and ID: 2–3;
- noise: 2–3;
- distance field: 1.
Canvas2D copy plus closing ≈ 15 ms.
Init: photo decode, luminance, mask raster, EDT and figure atlases ≈ 2–3 s.

11. BUILD ORDER AND SELF-REVIEW
1) FIGURE MATERIAL FIRST. P3 with I5–I8 and C1–C2 at full development: a still at 30 s and the 270 px sheet. They must read as solid people, not cutouts or ghosts. Fix with grain edge, rim, contact and cast shadow; never with glow.
2) Archive-to-living tone and MEN1: stills at 0, 1.2 and 4 s.
3) Development: stills at 1.2, 15.4 and 23.2 s, taken mid-development. Rocks and people must be visible while the sky is still paper.
4) Living motion: stills at 9 and 21.5 s.
5) Sierra to foam: 31 and 34 s.
6) Burn and closing: 36.5 and 39.9 s.
7) Compression test:
  · render 16 consecutive frames at 30.000 + k/30;
  · encode with the FFMPEG above: -framerate 30 -pattern_type glob -i '<dir>/*.png' -c:v libx264 -b:v 3.5M -pix_fmt yuv420p;
  · inspect the frames at 100%; if the grain turns to blocky mush, reduce its amplitude by 20%.
8) Review all reviewTimes.

12. PITFALLS
- Figures reading as black cutouts: the cure is dithered edges, rim, shadows and clumped inner grain, never glow.
- Colorization creep: keep saturation ≤ 0.12.
- Development that looks like a crossfade: it must be dark first.
- The meniscus reading as a template wipe: curve it, noise it, light it. Three uses only.
- Sea motion invisible on the overexposed postcard sea: the generated wavelets and swash must read, calmly.
- Figures on the removed bather or tourist spots; showing the raw photos.
- Anything moving other than water, light, grain, development and foam. Nobody walks.
- Bleaching indigenous figures before new ones have appeared.

## Aceptación
1. Only the clean crops (rinconada_limpia, gruta_limpia) are loaded; no stamps, captions, borders, bather or tourists appear. A missing photo produces a warning plus a procedural fallback instead of a crash.
2. Frame 0 shows the faded, still postcard with the meniscus already crossing. Behind it: deep tones and visibly moving sea and swash.
3. Development is dark-first: mid-development stills show people and rock before sand and sky. Its speed follows the gated voice and almost pauses during 12.8–15.05 s.
4. Indigenous figures are readable by ≈1 s. They are the densest shapes, with contact and cast shadows and silver-grain edges. They are never white, glowing, translucent or haloed, and nobody walks.
5. Indigenous figures are ≥105 px (most 140–280 px) and colonists ≈115 px, all readable on the 270 px sheet, with ≥0.25 luminance contrast along their outlines.
6. The print stays monochrome and toned (saturation ≤0.12), with no colorization.
7. The meniscus appears exactly 3 times (frame 0, 14.25 s, 22.23 s), curved and lit. There are no other transitions, particles or light leaks, and push/pan stays ≤4%.
8. In P3, the colonists (from 26.4 s) and the sail (from 27.3 s) develop only after all indigenous figures are present. There is no interaction or gesture between the groups.
9. From 29.4 to 34.5 s the granite edge sheds grain that becomes foam lace, and the rock remains whole.
10. From 34.5 to 36 s the burn-in descends, keeping luminance behind the text ≤0.15. The closing shows the exact four texts and the white logo at 620 px, intact, in a block at y 300–866 inside the safe zone.
11. At 39.9 s the child I7 is visibly still developing (≈60–75%) and the foam still moves. There is no fade to black and no frozen 'fixed' frame.
12. There is no text other than the closing, and no trio facing the sea or figures on the skyline.
13. Human presence covers ≥40% of the runtime (planned ≈97%), with indigenous figures first and never replaced.
14. render(t) is deterministic, takes ≤600 ms worst case, returns logo:true and surfaces warnings. Grain survives the 3.5 Mbps compression test.