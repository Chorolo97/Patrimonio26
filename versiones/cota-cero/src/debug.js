/* Hojas de depuración (solo con ?debug=… en la URL; nunca en la exportación). */
(function () {
  const D = (window.CC_DEBUG = {});
  D.mode = (() => { try { return new URLSearchParams(location.search).get('debug'); } catch (e) { return null; } })();

  function composite(ctx, W, H, layer, color, arr, x0, y0, w, h, mul = 1) {
    const img = ctx.getImageData(0, 0, W, H), d = img.data, c = PBS.hex(color);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const X = x + x0, Y = y + y0; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const a = arr[y * w + x] * mul; if (a <= 0) continue;
      const j = (Y * W + X) * 4;
      if (layer === 'set') { d[j] = d[j] + (c[0] - d[j]) * a; d[j + 1] = d[j + 1] + (c[1] - d[j + 1]) * a; d[j + 2] = d[j + 2] + (c[2] - d[j + 2]) * a; }
    }
    ctx.putImageData(img, 0, 0);
  }

  D.figureSheet = function (ctx, cfg) {
    const W = 1080, H = 1920, F = window.CC_FIG, pal = cfg.palette;
    const r = PBS.rng(7);
    // NOCHE: plancha índigo, pared con tallas claras arriba, arena en punteado claro abajo
    ctx.fillStyle = pal.night.plate; ctx.fillRect(0, 0, W, 960);
    ctx.strokeStyle = pal.night.land; ctx.lineWidth = 2.4;
    for (let x = -40; x < W + 40; x += 14) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.bezierCurveTo(x + 10, 200, x - 8, 400, x + 6, 640); ctx.stroke(); }
    ctx.fillStyle = pal.night.land;
    for (let y = 640; y < 960; y += 7) for (let x = 0; x < W; x += 7) { const rr = 1.2 + r() * 1.0; ctx.beginPath(); ctx.arc(x + r() * 4, y + r() * 4, rr, 0, 7); ctx.fill(); }
    // DÍA: papel, mar rayado arriba, arena punteada abajo
    ctx.fillStyle = pal.day.paper; ctx.fillRect(0, 960, W, 960);
    ctx.strokeStyle = pal.day.sea; ctx.lineWidth = 2.4;
    for (let y = 980; y < 1400; y += 14) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + 3); ctx.stroke(); }
    ctx.fillStyle = pal.day.sand;
    for (let y = 1400; y < H; y += 7) for (let x = 0; x < W; x += 7) { const rr = 1.2 + r() * 0.6; ctx.beginPath(); ctx.arc(x + r() * 4, y + r() * 4, rr, 0, 7); ctx.fill(); }

    const poses = [['standBundle', 1], ['standStaff', 1], ['elderSeated', 1], ['childCrouch', 1], ['gather', 1], ['colonBundle', -1], ['colonStick', -1]];
    // noche: fila a 270 px (adulto)
    let x = 70;
    const nightRow = [];
    poses.forEach(([p, f], i) => { const fig = F.build(p, 80 + i * 148, 900, 270, f); nightRow.push(fig); });
    for (const fig of nightRow) {
      const n = F.renderNight(fig, {});
      composite(ctx, W, H, 'set', pal.night.plate, n.clear, n.x0, n.y0, n.w, n.h);
      composite(ctx, W, H, 'set', pal.night.land, n.rim, n.x0, n.y0, n.w, n.h);
      composite(ctx, W, H, 'set', pal.night.land, n.lit, n.x0, n.y0, n.w, n.h);
    }
    // noche: tamaños reales de la gruta
    // día: fila a 270 px y fila a tamaños reales
    const dayRows = [
      poses.map(([p, f], i) => F.build(p, 80 + i * 148, 1360, 270, f)),
      [['elderSeated', 1, 150, 16], ['standBundle', -1, 330, 14], ['childCrouch', -1, 420, 14.5], ['gather', 1, 560, 19], ['standStaff', 1, 700, 20], ['colonBundle', -1, 895, 27], ['colonStick', -1, 972, 26]].map(([p, f, xx, d]) => F.build(p, xx, 1300 + 8236 / d, (2059 * 1.7) / d, f)),
    ];
    for (const row of dayRows) for (const fig of row) {
      const o = F.renderDay(fig, { shadow: { len: 1.5, shear: 0.55 } });
      composite(ctx, W, H, 'set', pal.day.paper, o.mask, o.x0, o.y0, o.w, o.h);
      composite(ctx, W, H, 'set', pal.day.granite, o.shadow, o.x0, o.y0, o.w, o.h);
      composite(ctx, W, H, 'set', pal.day.granite, o.ink, o.x0, o.y0, o.w, o.h);
    }
    x;
  };
})();
