/* Página de exportación compartida: cada versión define window.REEL_CONFIG y window.createReel(canvas, cfg). */
window.reelReady = (async () => {
  const canvas = document.getElementById('frame');
  const cfg = window.REEL_CONFIG;
  canvas.width = cfg.width; canvas.height = cfg.height;
  const reel = await window.createReel(canvas, cfg);
  window.reel = reel;
  return { warnings: reel.warnings || [], logo: reel.logo !== false };
})();
window.frameAt = async (t, type = 'image/png', q) => {
  window.reel.render(t);
  const blob = await new Promise((r) => document.getElementById('frame').toBlob(r, type, q));
  const buf = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(s);
};
