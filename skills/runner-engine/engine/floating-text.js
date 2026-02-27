// --- Floating Text ---
const FloatingText = (() => {
  let texts = [];
  let ctx = null;

  function init(context) { ctx = context; }

  function add(x, y, text, color, size) {
    texts.push({ x, y, text, color, size: size || 24, life: 1.2, maxLife: 1.2 });
  }

  function update(dt) {
    for (let i = texts.length - 1; i >= 0; i--) {
      const ft = texts[i];
      ft.life -= dt;
      ft.y -= 60 * dt;
      if (ft.life <= 0) texts.splice(i, 1);
    }
  }

  function draw() {
    if (!ctx) return;
    for (const ft of texts) {
      const alpha = Math.max(0, ft.life / ft.maxLife);
      const scale = 1 + (1 - alpha) * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(scale, scale);
      ctx.font = `bold ${ft.size}px monospace`;
      ctx.fillStyle = ft.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }
  }

  function clear() { texts = []; }

  return { init, add, update, draw, clear };
})();
