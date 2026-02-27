// --- ParticleEngine IIFE ---
const ParticleEngine = (() => {
  const POOL_SIZE = 300;
  const pool = [];
  let ctx = null;
  let cw = 800, ch = 400;
  let shakeX = 0, shakeY = 0;
  let shakeAmount = 0;

  for (let i = 0; i < POOL_SIZE; i++) {
    pool.push({ active: false, x:0, y:0, vx:0, vy:0, life:0, maxLife:1, type:'dust', color:'#FFF', size:4, rotation:0, vr:0, alpha:1, gravity:0 });
  }

  function init(context, w, h) { ctx = context; cw = w; ch = h; }

  function emit(x, y, vx, vy, life, type, color, size, gravity) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.active) {
        p.active = true;
        p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.life = life; p.maxLife = life;
        p.type = type; p.color = color; p.size = size || 4;
        p.rotation = Math.random() * Math.PI * 2;
        p.vr = (Math.random() - 0.5) * 10;
        p.alpha = 1;
        p.gravity = gravity || 0;
        return p;
      }
    }
    return null;
  }

  function burst(x, y, count, type, colors, sizeRange, speedRange, lifeRange, gravity) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
      const life = lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0]);
      const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
      const color = colors[Math.floor(Math.random() * colors.length)];
      emit(x, y, Math.cos(angle)*speed, Math.sin(angle)*speed, life, type, color, size, gravity || 400);
    }
  }

  function dust(x, y, count, colors, size) {
    const c = colors || ['#D2B48C','#C4A882'];
    const s = size || 4;
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 150;
      const vy = -Math.random() * 100 - 30;
      emit(x + (Math.random()-0.5)*20, y, vx, vy, 0.4 + Math.random()*0.3, 'dust', c[Math.floor(Math.random()*c.length)], s * (0.5+Math.random()*0.5), 300);
    }
  }

  function ring(x, y, color, maxRadius) {
    emit(x, y, 0, 0, 0.4, 'ring', color || '#FFD700', maxRadius || 30, 0);
  }

  function explosion(x, y, colors, size) {
    const c = colors || ['#FF4444','#FF8800','#FFDD44'];
    const s = size || 6;
    burst(x, y, 25, 'death', c, [3, s], [100, 350], [0.5, 1.2], 500);
  }

  function trail(x, y, colors, size, gameSpeed) {
    const c = colors || ['#FFFFFF'];
    const s = size || 3;
    emit(x, y, -(gameSpeed||300)*0.3 + (Math.random()-0.5)*30, (Math.random()-0.5)*20, 0.3+Math.random()*0.2, 'trail', c[Math.floor(Math.random()*c.length)], s*(0.5+Math.random()*0.5), 0);
  }

  function sparkle(x, y, colors, size, count) {
    const c = colors || ['#FFD700','#FFA500'];
    const s = size || 4;
    burst(x, y, count || 12, 'sparkle', c, [2, s], [60, 200], [0.5, 1.0], 200);
  }

  function confetti(x, y, colors, size, count) {
    const c = colors || ['#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF'];
    const s = size || 5;
    burst(x, y, count || 30, 'confetti', c, [3, s], [80, 250], [0.8, 1.5], 300);
  }

  function screenShake(amount) {
    shakeAmount = Math.max(shakeAmount, amount);
  }

  function clearAll() {
    for (let i = 0; i < POOL_SIZE; i++) pool[i].active = false;
    shakeAmount = 0; shakeX = 0; shakeY = 0;
  }

  function update(dt) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.rotation += p.vr * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
    // Shake decay (damped sine wave for smooth, directed feel)
    if (shakeAmount > 0) {
      const t = performance.now() * 0.03;
      shakeX = Math.round(Math.sin(t) * shakeAmount);
      shakeY = Math.round(Math.sin(t * 1.3) * shakeAmount);
      shakeAmount *= Math.pow(0.05, dt);
      if (shakeAmount < 0.5) { shakeAmount = 0; shakeX = 0; shakeY = 0; }
    }
  }

  function draw(layer) {
    // layer 0 = behind player, layer 1 = in front, undefined = all
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.active) continue;
      const isFront = (p.type === 'confetti' || p.type === 'ring' || p.type === 'sparkle');
      if (layer === 0 && isFront) continue;
      if (layer === 1 && !isFront) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'ring') {
        const progress = 1 - (p.life / p.maxLife);
        const radius = p.size * progress;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2 * (1 - progress);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'confetti') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/4, p.size, p.size/2);
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.save();
        ctx.rotate(p.life * Math.PI * 2);
        const s = p.size * p.alpha;
        ctx.fillRect(-s/2, -s/2, s, s);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function getShake() { return { x: shakeX, y: shakeY }; }

  return { init, emit, burst, dust, ring, explosion, trail, sparkle, confetti, screenShake, clearAll, update, draw, getShake };
})();
