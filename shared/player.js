/* Reproductor de vista previa compartido. Los controles quedan FUERA del cuadro exportado. */
(async () => {
  const cfg = window.REEL_CONFIG;
  document.title = (cfg.title || 'Reel') + ' — vista previa';
  const css = document.createElement('style');
  css.textContent = `:root{--bg:#1b1a18;--panel:#282522;--ink:#efe8dc;--muted:#b3aa9c;--accent:#c9a86a}*{box-sizing:border-box}
  html,body{margin:0;height:100%;background:var(--bg);color:var(--ink);font:15px/1.4 system-ui,sans-serif}
  main{display:flex;gap:24px;min-height:100%;padding:16px;align-items:flex-start;justify-content:center;flex-wrap:wrap}
  .stage{position:relative;height:calc(100vh - 32px);aspect-ratio:9/16;max-width:100%;background:#000;box-shadow:0 8px 30px rgba(0,0,0,.5)}
  .stage canvas{position:absolute;inset:0;width:100%;height:100%}#guides{pointer-events:none;display:none}
  aside{width:320px;max-width:100%;background:var(--panel);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px}
  h1{font-size:17px;margin:0}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  button{background:#3a3632;color:var(--ink);border:1px solid #4b4640;border-radius:6px;padding:8px 12px;font:inherit;cursor:pointer}button:hover{border-color:var(--accent)}
  input[type=range]{width:100%;accent-color:var(--accent)}.time{font-variant-numeric:tabular-nums;color:var(--muted)}
  .status{font-size:13px;color:var(--muted);white-space:pre-wrap}.warn{color:#f0b87a}label{color:var(--muted);display:flex;gap:6px;align-items:center}small{color:var(--muted)}
  @media (max-width:760px){.stage{height:auto;width:100%}}`;
  document.head.appendChild(css);
  document.body.innerHTML = `<main><div class="stage"><canvas id="frame"></canvas><canvas id="guides" width="${cfg.width}" height="${cfg.height}"></canvas></div>
  <aside><h1>${cfg.title || 'Reel'}</h1><small>${cfg.subtitle || ''}</small>
  <div class="row"><button id="play">▶ Reproducir</button><button id="restart">⟲ Reiniciar</button></div>
  <input id="seek" type="range" min="0" step="0.0333333" value="0"><div class="row time"><span id="clock">0.00 s</span> · <span id="frameNo">cuadro 0</span></div>
  <label><input type="checkbox" id="audioOn" checked> Pista musical (si el archivo está disponible)</label>
  <label><input type="checkbox" id="showGuides"> Mostrar zona segura (solo en pantalla)</label>
  <div id="status" class="status">Cargando…</div></aside></main><audio id="aud" preload="auto"></audio>`;
  const $ = (id) => document.getElementById(id);
  const canvas = $('frame');
  canvas.width = cfg.width; canvas.height = cfg.height;
  const seek = $('seek'); seek.max = cfg.duration;
  let reel;
  try { reel = await window.createReel(canvas, cfg); } catch (e) { $('status').textContent = 'Error: ' + e.message; throw e; }
  const A = cfg.audio || {};
  const aud = $('aud');
  let audioOk = false;
  if (A.src) { aud.src = A.src; aud.addEventListener('canplay', () => { audioOk = true; showStatus(); }, { once: true }); aud.addEventListener('error', () => { audioOk = false; showStatus(); }); }
  const gainAt = (t) => (A.volume || 1) * PBS.clamp(Math.min(t / (A.fadeIn || 0.01), (cfg.duration - t) / (A.fadeOut || 0.01)), 0, 1);
  function showStatus() {
    const lines = [`${cfg.width}×${cfg.height} · ${cfg.fps} fps · ${cfg.duration} s`, audioOk ? `Audio: desde ${A.AUDIO_START_SECONDS} s del archivo (a verificar al oído).` : 'Audio: pendiente (reproducción muda).'];
    $('status').innerHTML = lines.join('\n') + ((reel.warnings || []).length ? '\n<span class="warn">' + reel.warnings.join('\n') + '</span>' : '');
  }
  showStatus();
  const g = $('guides').getContext('2d'); const sz = cfg.safeZone || PBS.SAFE;
  g.strokeStyle = 'rgba(255,80,80,.8)'; g.lineWidth = 3; g.setLineDash([16, 10]); g.strokeRect(sz.x0, sz.y0, sz.x1 - sz.x0, sz.y1 - sz.y0);
  $('showGuides').onchange = (e) => ($('guides').style.display = e.target.checked ? 'block' : 'none');
  let t = 0, playing = false, last = 0;
  const draw = () => { reel.render(t); seek.value = t; $('clock').textContent = t.toFixed(2) + ' s'; $('frameNo').textContent = 'cuadro ' + Math.min(cfg.duration * cfg.fps - 1, Math.floor(t * cfg.fps)); };
  const syncAudio = (force) => {
    if (!audioOk || !$('audioOn').checked) { aud.pause(); return; }
    const want = A.AUDIO_START_SECONDS + t;
    if (force || Math.abs(aud.currentTime - want) > 0.15) aud.currentTime = want;
    aud.volume = gainAt(t);
    if (playing && aud.paused) aud.play().catch(() => {});
    if (!playing && !aud.paused) aud.pause();
  };
  const loop = (now) => { if (!playing) return; t += (now - last) / 1000; last = now; if (t >= cfg.duration) { t = cfg.duration; playing = false; $('play').textContent = '▶ Reproducir'; } draw(); syncAudio(false); if (playing) requestAnimationFrame(loop); };
  const play = () => { if (t >= cfg.duration - 0.01) t = 0; playing = true; last = performance.now(); $('play').textContent = '❚❚ Pausar'; syncAudio(true); requestAnimationFrame(loop); };
  const pause = () => { playing = false; $('play').textContent = '▶ Reproducir'; syncAudio(false); };
  $('play').onclick = () => (playing ? pause() : play());
  $('restart').onclick = () => { t = 0; draw(); syncAudio(true); };
  seek.oninput = () => { t = parseFloat(seek.value); draw(); syncAudio(true); };
  $('audioOn').onchange = () => syncAudio(true);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    if (e.code === 'ArrowRight') { t = Math.min(cfg.duration, t + 1 / cfg.fps); draw(); syncAudio(true); }
    if (e.code === 'ArrowLeft') { t = Math.max(0, t - 1 / cfg.fps); draw(); syncAudio(true); }
  });
  draw();
})();
