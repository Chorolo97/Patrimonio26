/*
 * Textos y cierre compartidos. El logo se dibuja como imagen independiente, intacto (sin recolorear ni deformar).
 * Zona segura por defecto: x 100–900, y 250–1500 (1080×1920).
 */
(function () {
  const S = (window.PBS = window.PBS || {});
  S.SAFE = { x0: 100, x1: 900, y0: 250, y1: 1500 };
  S.CLOSING_TEXT = {
    title: 'Día del Patrimonio 2026',
    motto: 'Raíces indígenas:\npasado, presente y futuro',
    date: '3 y 4 de octubre',
    note: 'Evocación artística realizada con IA',
  };

  function wrapLines(ctx, text, maxW) {
    const out = [];
    for (const para of String(text).split('\n')) {
      const words = para.split(' ');
      let cur = '';
      for (const w of words) {
        const tryS = cur ? cur + ' ' + w : w;
        if (ctx.measureText(tryS).width <= maxW || !cur) cur = tryS; else { out.push(cur); cur = w; }
      }
      if (cur) out.push(cur);
    }
    return out;
  }

  // Bloque de líneas centrado. items: [{text, font, size, weight, italic, gap, color} | {logo:img, width, gap}]
  // o: {y, alpha, rise, color, shadow, shadowBlur, cx, maxWidth, safe}. Devuelve {top, bottom, width, warnings}
  S.drawBlock = function (ctx, items, o = {}) {
    const safe = o.safe || S.SAFE;
    const warnings = [];
    const rows = [];
    let y = o.y || 400, maxW = 0;
    for (const it of items) {
      y += it.gap || 0;
      if (it.logo) {
        const lw = it.width || 600, lh = lw * (it.logo.naturalHeight / it.logo.naturalWidth);
        rows.push({ logo: it.logo, y, w: lw, h: lh });
        y += lh; maxW = Math.max(maxW, lw);
        continue;
      }
      ctx.font = S.font(it.font || 'serif', it.size || 64, it.weight || 500, it.italic);
      if (it.letterSpacing != null) ctx.letterSpacing = it.letterSpacing + 'px'; else ctx.letterSpacing = '0px';
      const lines = wrapLines(ctx, it.text, it.maxWidth || o.maxWidth || safe.x1 - safe.x0);
      for (const l of lines) {
        const w = ctx.measureText(l).width;
        maxW = Math.max(maxW, w);
        rows.push({ text: l, it, y: y + (it.size || 64) * 0.92, w });
        y += (it.size || 64) * (it.lineHeight || 1.16);
      }
    }
    const cx = o.cx != null ? o.cx : S.clamp(540, safe.x0 + maxW / 2, safe.x1 - maxW / 2);
    if (o.y < safe.y0 || y > safe.y1 || maxW > safe.x1 - safe.x0) warnings.push('Un bloque de texto sale de la zona segura.');
    const a = o.alpha == null ? 1 : o.alpha, rise = o.rise || 0;
    if (a > 0.001) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      for (const r of rows) {
        ctx.globalAlpha = a * (r.it && r.it.alpha != null ? r.it.alpha : 1);
        if (r.logo) {
          ctx.shadowColor = 'transparent';
          ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(r.logo, Math.round(cx - r.w / 2), Math.round(r.y + rise), r.w, r.h);
          continue;
        }
        const it = r.it;
        ctx.font = S.font(it.font || 'serif', it.size || 64, it.weight || 500, it.italic);
        ctx.letterSpacing = (it.letterSpacing || 0) + 'px';
        const sh = it.shadow !== undefined ? it.shadow : o.shadow;
        if (sh) { ctx.shadowColor = sh; ctx.shadowBlur = it.shadowBlur || o.shadowBlur || 18; ctx.shadowOffsetY = 2; } else ctx.shadowColor = 'transparent';
        ctx.fillStyle = it.color || o.color || '#f6f1e7';
        ctx.fillText(r.text, cx, r.y + rise);
      }
      ctx.restore();
    }
    return { top: o.y, bottom: y, width: maxW, warnings };
  };

  // Cierre estándar con los datos de la convocatoria. o: {logo, t, t0, y, dark (texto claro sobre fondo oscuro), colors, sizes, fade}
  S.drawClosing = function (ctx, t, o) {
    const T = S.CLOSING_TEXT;
    const a = S.smooth((t - o.t0) / (o.fade || 0.8));
    if (a <= 0) return { warnings: [] };
    const ink = o.ink || (o.dark ? '#f5efe3' : '#2a2520');
    const ink2 = o.ink2 || (o.dark ? '#e2d9c8' : '#3d382c');
    const items = [
      { text: T.title, font: 'serif', size: o.titleSize || 74, weight: 600, color: ink },
      { text: T.motto, font: 'sans', size: 46, weight: 600, gap: 26, color: ink2, maxWidth: 760 },
      { text: T.date, font: 'sans', size: 50, weight: 600, gap: 30, color: ink2 },
    ];
    if (o.logo) items.push({ logo: o.logo, width: o.logoWidth || 620, gap: 62 });
    items.push({ text: T.note, font: 'sans', size: 34, weight: 400, gap: o.logo ? 60 : 40, color: ink2 });
    return S.drawBlock(ctx, items, { y: o.y || 330, alpha: a * (o.alpha == null ? 1 : o.alpha), rise: (1 - S.ease((t - o.t0) / 1.2)) * 10, shadow: o.shadow || null });
  };
})();
