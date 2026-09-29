/* Motor del reel: carga recursos, construye los planos y dibuja cualquier instante t de forma determinista. */
(function () {
  const PB = (window.PB = window.PB || {});

  const loadImage = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => rej(new Error('No se pudo cargar ' + src));
    im.src = src;
  });

  PB.Reel = class {
    constructor(canvas, cfg, opts = {}) {
      this.canvas = canvas;
      this.cfg = cfg;
      this.base = opts.base || '';
      canvas.width = cfg.width;
      canvas.height = cfg.height;
      this.ctx = canvas.getContext('2d');
      this.warnings = [];
      this.layouts = new Map();
    }

    async load() {
      const cfg = this.cfg;
      for (const key of ['serif', 'sans']) {
        const f = cfg.fonts[key];
        for (const face of f.faces) {
          try {
            const ff = new FontFace(f.family, `url(${this.base + face.src})`, { style: face.style, weight: face.weight });
            await ff.load();
            document.fonts.add(ff);
          } catch (e) {
            this.warnings.push(`Tipografía no cargada (${face.src}); se usa la alternativa del sistema.`);
          }
        }
      }
      const logoSrc = cfg.logo[cfg.logo.use];
      try {
        this.logo = await loadImage(this.base + logoSrc);
      } catch (e) {
        this.logo = null;
        this.warnings.push(`FALTA EL LOGO: ${logoSrc}. No se genera un reemplazo.`);
      }
      this.shots = PB.buildShots(cfg);
      this.buf = document.createElement('canvas');
      this.buf.width = cfg.width;
      this.buf.height = cfg.height;
      this.vignette = this.makeVignette();
      return this;
    }

    makeVignette() {
      const { width: w, height: h } = this.cfg;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const x = c.getContext('2d');
      const g = x.createRadialGradient(w / 2, h * 0.48, h * 0.32, w / 2, h * 0.5, h * 0.75);
      g.addColorStop(0, 'rgba(30,26,22,0)');
      g.addColorStop(1, 'rgba(30,26,22,0.28)');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
      return c;
    }

    render(t) {
      const cfg = this.cfg, ctx = this.ctx, T = cfg.transition;
      t = PB.clamp(t, 0, cfg.duration - 1e-6);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      const active = this.shots.filter((s) => t >= s.t0 && t < s.t1).sort((a, b) => a.start - b.start);
      active.forEach((s, i) => {
        if (i === 0) { s.draw(ctx, t); return; }
        const a = PB.smooth((t - s.t0) / T);
        const b = this.buf.getContext('2d');
        b.setTransform(1, 0, 0, 1, 0, 0);
        b.clearRect(0, 0, cfg.width, cfg.height);
        s.draw(b, t);
        ctx.globalAlpha = a;
        ctx.drawImage(this.buf, 0, 0);
        ctx.globalAlpha = 1;
      });
      ctx.drawImage(this.vignette, 0, 0);
      this.drawTexts(t);
    }

    font(line) {
      const f = this.cfg.fonts[line.font];
      return `${line.italic ? 'italic ' : ''}${line.weight || 400} ${line.size}px "${f.family}", ${f.fallback}`;
    }

    // Corta en líneas equilibradas, respetando saltos manuales (\n) y el máximo de líneas.
    wrap(line) {
      const ctx = this.ctx;
      ctx.font = this.font(line);
      const paras = line.text.split('\n');
      const out = [];
      for (const para of paras) {
        const words = para.split(' ');
        const total = ctx.measureText(para).width;
        const maxW = line.maxWidth || 800;
        const maxL = line.maxLines || 3;
        let best = null;
        for (let n = 1; n <= maxL && !best; n++) {
          const lim = Math.min(maxW, (total / n) * 1.12);
          const lines = [];
          let cur = '';
          for (const w of words) {
            const tryS = cur ? cur + ' ' + w : w;
            if (ctx.measureText(tryS).width <= lim || !cur) cur = tryS;
            else { lines.push(cur); cur = w; }
          }
          if (cur) lines.push(cur);
          if (lines.length <= n && lines.every((l) => ctx.measureText(l).width <= maxW)) best = lines;
        }
        if (!best) {
          // último recurso: corte voraz con el ancho máximo
          best = [];
          let cur = '';
          for (const w of words) {
            const tryS = cur ? cur + ' ' + w : w;
            if (ctx.measureText(tryS).width <= maxW || !cur) cur = tryS;
            else { best.push(cur); cur = w; }
          }
          if (cur) best.push(cur);
          if (best.length > maxL) this.warnings.push(`El texto «${line.text}» excede ${maxL} líneas.`);
        }
        out.push(...best);
      }
      return out;
    }

    layout(blk) {
      if (this.layouts.has(blk.id)) return this.layouts.get(blk.id);
      const ctx = this.ctx, cfg = this.cfg;
      const items = [];
      let y = blk.y, maxW = 0;
      for (const line of blk.lines) {
        y += line.gap || 0;
        if (line.logo) {
          if (!this.logo) continue;
          const lw = cfg.logo.width, lh = lw * (this.logo.naturalHeight / this.logo.naturalWidth);
          items.push({ logo: true, y, w: lw, h: lh });
          y += lh;
          maxW = Math.max(maxW, lw);
          continue;
        }
        const rows = this.wrap(line);
        ctx.font = this.font(line);
        const lh = line.size * 1.16;
        for (const r of rows) {
          const w = ctx.measureText(r).width;
          maxW = Math.max(maxW, w);
          items.push({ text: r, line, y: y + line.size * 0.92, w });
          y += lh;
        }
      }
      const sz = cfg.safeZone;
      const cx = PB.clamp(cfg.width / 2, sz.x0 + maxW / 2, sz.x1 - maxW / 2);
      const L = { items, cx, top: blk.y, bottom: y, width: maxW };
      if (y > sz.y1 || blk.y < sz.y0 || maxW > sz.x1 - sz.x0) this.warnings.push(`El bloque «${blk.id}» sale de la zona segura.`);
      this.layouts.set(blk.id, L);
      return L;
    }

    drawTexts(t) {
      const ctx = this.ctx, cfg = this.cfg, F = cfg.textFade;
      for (const blk of cfg.texts) {
        const aIn = PB.smooth((t - blk.in) / F);
        const aOut = blk.out == null ? 1 : PB.smooth((blk.out - t) / F);
        const a = Math.min(aIn, aOut);
        if (a <= 0.001) continue;
        const rise = (1 - PB.ease((t - blk.in) / (F * 1.6))) * 10;
        const L = this.layout(blk);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        for (const it of L.items) {
          if (it.logo) {
            ctx.globalAlpha = a;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(this.logo, Math.round(L.cx - it.w / 2), Math.round(it.y + rise), it.w, it.h);
            continue;
          }
          const st = cfg.textStyles[it.line.style || blk.style];
          ctx.font = this.font(it.line);
          ctx.globalAlpha = a;
          if (st.shadow) {
            ctx.shadowColor = st.shadow;
            ctx.shadowBlur = st.shadowBlur || 16;
            ctx.shadowOffsetY = st.shadowY || 0;
          } else {
            ctx.shadowColor = 'transparent';
          }
          ctx.fillStyle = st.color;
          ctx.fillText(it.text, L.cx, it.y + rise);
        }
        ctx.restore();
      }
    }
  };
})();
