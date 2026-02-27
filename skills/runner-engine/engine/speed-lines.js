// --- Speed Lines ---
const SpeedLines = (() => {
  let lines = [];
  let ctx = null;

  function init(context) { ctx = context; }

  function update(dt, gameSpeed, state, groundY, canvasW) {
    if (gameSpeed > 6 && state === 'playing') {
      if (Math.random() < (gameSpeed - 6) / 6 * dt * 30) {
        lines.push({
          x: canvasW,
          y: Math.random() * groundY,
          len: 40 + Math.random() * 80,
          speed: gameSpeed * 40 * (1.5 + Math.random()),
          alpha: 0.1 + Math.random() * 0.2,
          life: 0.5,
        });
      }
    }
    for (let i = lines.length - 1; i >= 0; i--) {
      const sl = lines[i];
      sl.x -= sl.speed * dt;
      sl.life -= dt;
      if (sl.x + sl.len < 0 || sl.life <= 0) lines.splice(i, 1);
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    for (const sl of lines) {
      ctx.globalAlpha = sl.alpha * (sl.life / 0.5);
      ctx.beginPath();
      ctx.moveTo(sl.x, sl.y);
      ctx.lineTo(sl.x + sl.len, sl.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function clear() { lines = []; }

  return { init, update, draw, clear };
})();
