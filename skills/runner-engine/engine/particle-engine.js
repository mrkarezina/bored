/**
 * ParticleEngine — Visual effects system
 * Embed verbatim. Supports explosions, trails, sparkles, screen shake.
 */
const ParticleEngine = (() => {
  let ctx = null;
  let canvasW = 800;
  let canvasH = 400;
  let particles = [];
  let shakeX = 0;
  let shakeY = 0;
  let shakeDuration = 0;
  let shakeIntensity = 0;
  let shakeStart = 0;

  function init(context, w, h) {
    ctx = context;
    canvasW = w;
    canvasH = h;
  }

  function emit(x, y, color, count, type) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particles.push({
        x, y, color,
        vx: Math.cos(angle) * speed * (type === 'dust' ? 0.5 : 1),
        vy: type === 'dust' ? -Math.random() * 2 : Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        size: type === 'dust' ? 2 + Math.random() * 2 : 3 + Math.random() * 3,
        type: type || 'burst',
      });
    }
  }

  function explosion(x, y, color, count) {
    for (let i = 0; i < (count || 15); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      particles.push({
        x, y, color,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        size: 3 + Math.random() * 5,
        type: 'explosion',
      });
    }
  }

  function sparkle(x, y, color, count) {
    for (let i = 0; i < (count || 10); i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 40,
        color,
        vx: (Math.random() - 0.5) * 2,
        vy: -1 - Math.random() * 3,
        life: 1.0,
        decay: 0.01 + Math.random() * 0.02,
        size: 2 + Math.random() * 3,
        type: 'sparkle',
      });
    }
  }

  function trail(x, y, color) {
    particles.push({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      color,
      vx: -1 - Math.random(),
      vy: (Math.random() - 0.5) * 0.5,
      life: 0.8,
      decay: 0.04,
      size: 2 + Math.random() * 2,
      type: 'trail',
    });
  }

  function screenShake(intensity, duration) {
    shakeIntensity = intensity;
    shakeDuration = duration;
    shakeStart = performance.now();
  }

  function update(dt) {
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'explosion' || p.type === 'burst') {
        p.vy += 0.1; // gravity on explosions
      }
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Cap particles
    if (particles.length > 200) {
      particles = particles.slice(-200);
    }

    // Screen shake
    if (shakeDuration > 0) {
      const elapsed = performance.now() - shakeStart;
      if (elapsed < shakeDuration) {
        const progress = 1 - elapsed / shakeDuration;
        shakeX = (Math.random() - 0.5) * shakeIntensity * progress * 2;
        shakeY = (Math.random() - 0.5) * shakeIntensity * progress * 2;
      } else {
        shakeX = 0;
        shakeY = 0;
        shakeDuration = 0;
      }
    }
  }

  function draw() {
    if (!ctx) return;

    // Apply screen shake
    if (shakeX !== 0 || shakeY !== 0) {
      ctx.save();
      ctx.translate(shakeX, shakeY);
    }

    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      if (p.type === 'sparkle') {
        // Star shape
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * Math.PI * 2);
        const s = p.size * p.life;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    if (shakeX !== 0 || shakeY !== 0) {
      ctx.restore();
    }
  }

  return { init, emit, explosion, sparkle, trail, screenShake, update, draw };
})();
