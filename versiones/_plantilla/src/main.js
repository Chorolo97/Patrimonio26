/* Contrato: window.createReel(canvas, cfg) → Promise<{ render(t), warnings: string[], logo: boolean }>. render(t) debe ser determinista. */
window.createReel = async function (canvas, cfg) {
  const warnings = [];
  await PBS.loadFonts(cfg.assets + 'fonts/', warnings);
  const audio = await PBS.loadAudioFeatures(cfg.featuresUrl);
  let logo = null;
  try { logo = await PBS.loadImage(cfg.assets + cfg.logo.file); } catch (e) { warnings.push('FALTA EL LOGO'); }
  const gl = new PBS.GL(cfg.width, cfg.height);
  const prog = gl.program(`#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform float t, energy;
${PBS.GLSL_NOISE}
void main(){ float n = fbm(uv*vec2(3.,5.)+vec2(t*.05,0.)); vec3 c = mix(vec3(.12,.16,.2), vec3(.75,.68,.55), n*(.6+.4*energy)); o = vec4(c,1.); }`);
  const ctx = canvas.getContext('2d');
  return {
    warnings, logo: !!logo,
    render(t) {
      gl.draw(prog, { t, energy: audio.at('rmsSmooth', t) });
      ctx.drawImage(gl.canvas, 0, 0);
      PBS.drawClosing(ctx, t, { t0: cfg.closingAt, logo, dark: true, logoWidth: cfg.logo.width });
    },
  };
};
