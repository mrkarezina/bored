// --- RunnerEngine IIFE ---
const RunnerEngine = (() => {
  // Fixed canvas size
  const CW = 800, CH = 400;
  let canvas, ctx;

  // State
  let state = 'menu'; // menu, playing, dying, gameover
  let score = 0;
  let highScore = 0;
  let gameSpeed = 0;
  let distance = 0;
  let gameTime = 0; // seconds
  let elapsed = 0;  // ms
  let lastFrameTime = 0;
  let gameStartTime = 0;

  // Physics (fixed timestep)
  const PHYSICS_DT = 1 / 120;
  let accumulator = 0;
  let hitFreezeFrames = 0;
  let dyingTimer = 0;
  let deathFlashAlpha = 0;

  // Player
  const player = {
    x: 80, y: 0, vy: 0,
    grounded: true, jumps: 0, maxJumps: 2,
    ducking: false,
    state: 'run', // run, jump, duck, hit
    scaleX: 1, scaleY: 1, targetScaleX: 1, targetScaleY: 1,
  };
  let jumpHeld = false;
  let jumpBuffered = false;
  let jumpBufferTime = 0;
  const JUMP_BUFFER_MS = 150;

  // Objects
  let obstacles = [];
  let powerups = [];
  let lastSpawnTime = 0;
  let spawnInterval = 0;

  // Combo
  let combo = 0;
  let comboMultiplier = 1;
  let lastCollectTime = 0;

  // Active power-up effects
  let activeEffects = {}; // { effectName: { remaining: ms, powerup: ref } }

  // Score tracking
  let prevMilestone = 0;

  function start() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = CW;
    canvas.height = CH;

    // Responsive scaling
    handleResize();
    window.addEventListener('resize', handleResize);

    // Load high score
    highScore = parseInt(localStorage.getItem('bored-hs-' + THEME.gameId) || '0');

    // Set CSS custom properties from theme
    document.documentElement.style.setProperty('--color-bg', THEME.colors.bg);
    document.documentElement.style.setProperty('--color-text', THEME.colors.text);
    document.documentElement.style.setProperty('--color-accent', THEME.colors.accent);
    document.documentElement.style.setProperty('--color-score', THEME.colors.score);
    document.body.style.backgroundColor = THEME.colors.bg;

    // Update DOM text
    const titleEl = document.getElementById('game-title');
    if (titleEl) titleEl.textContent = THEME.name;
    const subtitleEl = document.getElementById('game-subtitle');
    if (subtitleEl) subtitleEl.textContent = THEME.description;

    // Init subsystems
    AudioEngine.init(THEME.sounds);
    ParticleEngine.init(ctx, CW, CH);
    HUD.init(ctx, THEME);
    ScoreboardUI.init(THEME);
    SpeedLines.init(ctx);
    FloatingText.init(ctx);
    InputHandler.init(canvas, { onJump, onJumpRelease, onDuck, onDuckRelease });

    showMenu();
    requestAnimationFrame((t) => { lastFrameTime = t; gameLoop(t); });
  }

  function handleResize() {
    if (!canvas) return;
    const maxW = Math.min(window.innerWidth - 20, 900);
    const maxH = Math.min(window.innerHeight - 100, 550);
    const scaleX = maxW / CW;
    const scaleY = maxH / CH;
    const s = Math.min(scaleX, scaleY, 1.5);
    canvas.style.width = (CW * s) + 'px';
    canvas.style.height = (CH * s) + 'px';
  }

  function showMenu() {
    state = 'menu';
    const menuEl = document.getElementById('menu-screen');
    const overEl = document.getElementById('gameover-screen');
    if (menuEl) menuEl.classList.remove('hidden');
    if (overEl) overEl.classList.add('hidden');
  }

  function startGame() {
    state = 'playing';
    score = 0;
    distance = 0;
    gameTime = 0;
    elapsed = 0;
    gameStartTime = performance.now();
    combo = 0;
    comboMultiplier = 1;
    lastCollectTime = 0;
    obstacles = [];
    powerups = [];
    activeEffects = {};
    prevMilestone = 0;
    hitFreezeFrames = 0;
    deathFlashAlpha = 0;
    accumulator = 0;

    const diff = THEME.difficulty;
    gameSpeed = diff.startSpeed;
    spawnInterval = diff.startSpawnInterval;
    lastSpawnTime = performance.now();

    // Reset player
    player.x = 80;
    player.y = THEME.player.groundY;
    player.vy = 0;
    player.grounded = true;
    player.jumps = 0;
    player.ducking = false;
    player.state = 'run';
    player.scaleX = 1; player.scaleY = 1;
    player.targetScaleX = 1; player.targetScaleY = 1;
    jumpHeld = false;
    jumpBuffered = false;

    ParticleEngine.clearAll();
    FloatingText.clear();
    SpeedLines.clear();

    const menuEl = document.getElementById('menu-screen');
    const overEl = document.getElementById('gameover-screen');
    if (menuEl) menuEl.classList.add('hidden');
    if (overEl) overEl.classList.add('hidden');

    AudioEngine.ensure();
    AudioEngine.bgBeat(true);
  }

  function die() {
    if (state !== 'playing') return;
    state = 'dying';
    player.state = 'hit';
    dyingTimer = 0.5;
    hitFreezeFrames = 4;
    deathFlashAlpha = 1;
    ParticleEngine.screenShake(10);
    const pcfg = THEME.particles.death;
    ParticleEngine.explosion(
      player.x + THEME.player.width / 2,
      player.y + THEME.player.height / 2,
      pcfg.colors, pcfg.size
    );
    AudioEngine.die();
    AudioEngine.bgBeat(false);
    const finalScore = Math.floor(score);
    if (finalScore > highScore) {
      highScore = finalScore;
      localStorage.setItem('bored-hs-' + THEME.gameId, String(highScore));
    }
  }

  function goToGameOver() {
    state = 'gameover';
    // Submit score + show UI
    ScoreboardClient.submitScore(THEME.gameId, THEME.name, THEME.description, score).then((result) => {
      ScoreboardUI.showGameOver(score, highScore, result);
    });
  }

  // --- Input callbacks ---
  function onJump() {
    AudioEngine.ensure();
    if (state === 'menu') { startGame(); return; }
    if (state === 'gameover') { showMenu(); return; }
    if (state !== 'playing') return;

    jumpHeld = true;
    const pw = THEME.player;
    if (player.grounded) {
      player.vy = pw.jumpForce;
      player.grounded = false;
      player.jumps = 1;
      player.ducking = false;
      player.state = 'jump';
      setSquash(0.7, 1.3);
      const pcfg = THEME.particles.dust;
      ParticleEngine.dust(player.x + pw.width / 2, player.y + pw.height, 8, pcfg.colors, pcfg.size);
      AudioEngine.jump();
    } else if (player.jumps < player.maxJumps) {
      player.vy = pw.jumpForce * 0.85;
      player.jumps++;
      player.state = 'jump';
      setSquash(0.75, 1.25);
      const jcfg = THEME.particles.jump;
      ParticleEngine.ring(player.x + pw.width / 2, player.y + pw.height / 2, jcfg.colors[0], 30);
      AudioEngine.doubleJump();
    } else {
      // Buffer jump for execution on landing
      jumpBuffered = true;
      jumpBufferTime = performance.now();
    }
  }

  function onJumpRelease() { jumpHeld = false; }

  function onDuck() {
    if (state !== 'playing') return;
    if (player.grounded) {
      player.ducking = true;
      player.state = 'duck';
    }
  }

  function onDuckRelease() {
    player.ducking = false;
    if (player.grounded && state === 'playing') player.state = 'run';
  }

  // --- Squash/Stretch ---
  function setSquash(sx, sy) {
    player.scaleX = sx; player.scaleY = sy;
    player.targetScaleX = 1; player.targetScaleY = 1;
  }

  function updateSquash(dt) {
    const lerp = 1 - Math.pow(0.001, dt);
    player.scaleX += (player.targetScaleX - player.scaleX) * lerp;
    player.scaleY += (player.targetScaleY - player.scaleY) * lerp;
  }

  // --- Collision ---
  function checkCollision(obj) {
    const pw = THEME.player.width;
    const ph = player.ducking ? (THEME.player.duckHeight || THEME.player.height * 0.5) : THEME.player.height;
    const py = player.ducking ? (player.y + THEME.player.height - ph) : player.y;
    const pad = 4;
    return (
      player.x + pad < obj.x + obj.width - pad &&
      player.x + pw - pad > obj.x + pad &&
      py + pad < obj.y + obj.height - pad &&
      py + ph - pad > obj.y + pad
    );
  }

  function checkNearMiss(obs) {
    const gap = obs.x - (player.x + THEME.player.width);
    return gap > 0 && gap < 20 && !obs.nearMissed && !player.grounded;
  }

  // --- Spawning ---
  function spawnObstacle() {
    const pool = THEME.obstacles;
    if (!pool || pool.length === 0) return;
    const totalWeight = pool.reduce((s, o) => s + (o.weight || 1), 0);
    let r = Math.random() * totalWeight;
    let selected = pool[0];
    for (const o of pool) {
      r -= (o.weight || 1);
      if (r <= 0) { selected = o; break; }
    }
    const pw = THEME.player;
    const groundBottom = pw.groundY + pw.height;
    obstacles.push({
      x: CW + 20,
      y: selected.type === 'air'
        ? pw.groundY - 20 - selected.height
        : groundBottom - selected.height,
      width: selected.width,
      height: selected.height,
      type: selected.type,
      drawFn: selected.draw,
      name: selected.name,
      scored: false,
      nearMissed: false,
      active: true,
      frame: 0,
    });
  }

  function spawnPowerup(template) {
    if (powerups.length >= 3) return;
    const pw = THEME.player;
    powerups.push({
      x: CW + 20,
      y: pw.groundY - 30 - Math.random() * 60,
      width: template.width || 20,
      height: template.height || 20,
      drawFn: template.draw,
      name: template.name,
      points: template.points || 100,
      effect: template.effect,
      duration: template.duration || 3000,
      powerup: template,
      active: true,
      frame: 0,
    });
  }

  // --- Physics step (fixed timestep) ---
  function physicsStep(dt) {
    if (state === 'dying') {
      dyingTimer -= dt;
      deathFlashAlpha *= Math.pow(0.01, dt);
      if (dyingTimer <= 0) goToGameOver();
      return;
    }
    if (state !== 'playing') return;

    gameTime += dt;
    elapsed = (performance.now() - gameStartTime);

    // Difficulty ramp
    const diff = THEME.difficulty;
    const elapsedSec = gameTime;
    gameSpeed = Math.min(diff.maxSpeed, diff.startSpeed + diff.speedRampPerSecond * elapsedSec);
    spawnInterval = Math.max(diff.minSpawnInterval, diff.startSpawnInterval + diff.spawnRampPerSecond * elapsedSec);

    // Slow-mo effect
    let speedMult = 1;
    if (activeEffects['slow-mo']) speedMult = 0.5;
    const effectiveSpeed = gameSpeed * speedMult;

    distance += effectiveSpeed;

    // Player physics
    const pw = THEME.player;
    if (!player.grounded) {
      let gMult = 1;
      if (player.vy < 0 && jumpHeld) gMult = 0.5;    // Hold = float
      else if (player.vy > 0) gMult = 2.5;            // Release = fast fall
      player.vy += pw.gravity * gMult;
      player.y += player.vy;

      if (player.y >= pw.groundY) {
        player.y = pw.groundY;
        if (player.vy > 2) {
          setSquash(1.3, 0.7);
          const dcfg = THEME.particles.dust;
          ParticleEngine.dust(player.x + pw.width / 2, player.y + pw.height, 5, dcfg.colors, dcfg.size);
          ParticleEngine.screenShake(2);
          AudioEngine.land();
        }
        player.vy = 0;
        player.grounded = true;
        player.jumps = 0;
        player.state = player.ducking ? 'duck' : 'run';
        // Execute buffered jump
        if (jumpBuffered && performance.now() - jumpBufferTime < JUMP_BUFFER_MS) {
          jumpBuffered = false;
          onJump();
        } else {
          jumpBuffered = false;
        }
      }
    }

    // Trail particles
    if (Math.floor(gameTime * 20) !== Math.floor((gameTime - dt) * 20)) {
      const tcfg = THEME.particles.trail;
      ParticleEngine.trail(player.x, player.y + pw.height * 0.5, tcfg.colors, tcfg.size, effectiveSpeed * 50);
    }

    // Spawn obstacles (with warm-up grace period and spacing validation)
    const now = performance.now();
    if (now - lastSpawnTime >= spawnInterval && gameTime > 2) {
      const minGap = effectiveSpeed * 30;
      let canSpawn = true;
      if (obstacles.length > 0) {
        const last = obstacles[obstacles.length - 1];
        if (CW + 20 - last.x < minGap) canSpawn = false;
      }
      if (canSpawn) {
        lastSpawnTime = now;
        spawnObstacle();
      }
    }

    // Spawn powerups
    if (THEME.powerups && THEME.powerups.length > 0) {
      for (const pu of THEME.powerups) {
        if (Math.random() < (pu.spawnChance || 0.003) * dt * 60) {
          spawnPowerup(pu);
        }
      }
    }

    // Update obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= effectiveSpeed;
      obs.frame++;

      if (obs.x + obs.width < -20) { obstacles.splice(i, 1); continue; }

      if (!obs.scored && obs.x + obs.width < player.x) { obs.scored = true; }

      // Near miss
      if (checkNearMiss(obs) && obs.active) {
        obs.nearMissed = true;
        score += 25;
        FloatingText.add(player.x + pw.width + 30, player.y - 10, 'CLOSE!', '#00FF88', 22);
        ParticleEngine.screenShake(3);
        AudioEngine.nearMiss();
      }

      // Collision
      if (obs.active && checkCollision(obs)) {
        if (activeEffects['shield'] || activeEffects['invincible']) {
          obs.active = false;
          const ccfg = THEME.particles.collect;
          ParticleEngine.sparkle(obs.x + obs.width / 2, obs.y + obs.height / 2, ccfg.colors, ccfg.size, 10);
          AudioEngine.collect();
          score += 50;
          if (activeEffects['shield']) delete activeEffects['shield'];
        } else {
          die();
          return;
        }
      }
    }

    // Update powerups
    const magnetActive = !!activeEffects['magnet'];
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.x -= effectiveSpeed;
      pu.frame++;

      if (magnetActive) {
        const dx = player.x - pu.x;
        const dy = player.y - pu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          pu.x += (dx / dist) * 5;
          pu.y += (dy / dist) * 5;
        }
      }

      if (pu.x + pu.width < -20) { powerups.splice(i, 1); continue; }

      if (pu.active && checkCollision(pu)) {
        pu.active = false;
        powerups.splice(i, 1);
        activatePowerup(pu);
      }
    }

    // Update active effects
    for (const key of Object.keys(activeEffects)) {
      activeEffects[key].remaining -= dt * 1000;
      if (activeEffects[key].remaining <= 0) delete activeEffects[key];
    }

    // Score
    const scoreMult = activeEffects['2x-score'] ? 2 : 1;
    score += THEME.scoring.distancePointsPerFrame * comboMultiplier * scoreMult * dt * 60;

    // Combo decay
    if (combo > 0 && now - lastCollectTime > THEME.scoring.comboDecayMs) {
      combo = 0;
      comboMultiplier = 1;
    }

    // Milestones
    const newMilestone = Math.floor(score / THEME.scoring.milestoneInterval);
    if (newMilestone > prevMilestone) {
      prevMilestone = newMilestone;
      const s = Math.floor(score);
      if (s % 1000 === 0 && s > 0) {
        AudioEngine.score1000();
        const ccfg = THEME.particles.confetti;
        ParticleEngine.confetti(CW / 2, CH / 3, ccfg.colors, ccfg.size, 30);
        FloatingText.add(CW / 2, CH / 3, s + '!', THEME.colors.score, 36);
        ParticleEngine.screenShake(4);
      } else {
        AudioEngine.score100();
        FloatingText.add(player.x + pw.width + 20, player.y, String(s), THEME.colors.score, 20);
      }
    }

    updateSquash(dt);
  }

  function activatePowerup(pu) {
    AudioEngine.collect();
    const ccfg = THEME.particles.collect;
    ParticleEngine.sparkle(pu.x + pu.width / 2, pu.y + pu.height / 2, ccfg.colors, ccfg.size, 15);
    score += pu.points || 100;

    combo++;
    lastCollectTime = performance.now();
    comboMultiplier = Math.min(1 + combo * 0.5, THEME.scoring.comboMultiplierMax);

    if (pu.effect) {
      activeEffects[pu.effect] = { remaining: pu.duration || 3000, powerup: pu };
    }

    HUD.flashCombo(combo, comboMultiplier);
  }

  // --- Render ---
  function render() {
    const shake = ParticleEngine.getShake();

    // Clear
    ctx.fillStyle = THEME.colors.bg;
    ctx.fillRect(0, 0, CW, CH);

    ctx.save();
    ctx.translate(shake.x, shake.y);

    // Backgrounds (parallax)
    if (THEME.backgrounds) {
      const offset = state === 'playing' || state === 'dying' ? distance : performance.now() * 0.02;
      for (const bg of THEME.backgrounds) {
        ctx.save();
        try { bg.draw(ctx, Math.floor(offset * bg.speed), CW, CH); } catch(e) {}
        ctx.restore();
      }
    }

    // Ground
    const groundY = THEME.player.groundY + THEME.player.height;
    ctx.save();
    try { THEME.drawGround(ctx, Math.floor(distance), groundY, CW, CH - groundY); } catch(e) {}
    ctx.restore();

    // Obstacles
    for (const obs of obstacles) {
      if (!obs.active) continue;
      ctx.save();
      try { obs.drawFn(ctx, Math.floor(obs.x), Math.floor(obs.y), obs.frame); } catch(e) {}
      ctx.restore();
    }

    // Powerups
    for (const pu of powerups) {
      if (!pu.active) continue;
      ctx.save();
      try { pu.drawFn(ctx, Math.floor(pu.x), Math.floor(pu.y), pu.frame); } catch(e) {}
      ctx.restore();
    }

    // Particles (behind player)
    ParticleEngine.draw(0);

    // Player
    if (state !== 'gameover') {
      ctx.save();
      const pw = THEME.player;
      const ph = player.ducking ? (pw.duckHeight || pw.height * 0.5) : pw.height;
      const py = player.ducking ? (player.y + pw.height - ph) : player.y;
      const cx = player.x + pw.width / 2;
      const cy = py + ph;
      ctx.translate(cx, cy);
      ctx.scale(player.scaleX, player.scaleY);
      ctx.translate(-cx, -cy);
      // Flash when shielded/invincible
      if (activeEffects['shield'] || activeEffects['invincible']) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(gameTime * 15);
      }
      try { pw.draw(ctx, player.x, Math.floor(py), Math.floor(gameTime * 60), player.state); } catch(e) {}
      ctx.restore();
    }

    // Particles (in front)
    ParticleEngine.draw(1);

    // Speed lines
    SpeedLines.draw();

    // Floating text
    FloatingText.draw();

    // Death flash
    if (deathFlashAlpha > 0.01) {
      ctx.fillStyle = 'rgba(255,255,255,' + deathFlashAlpha.toFixed(2) + ')';
      ctx.fillRect(-20, -20, CW + 40, CH + 40);
    }

    ctx.restore(); // Remove shake

    // HUD (not affected by shake)
    if (state === 'playing' || state === 'dying') {
      HUD.draw(score, highScore, combo, comboMultiplier, activeEffects, elapsed);
    }
  }

  // --- Game Loop ---
  function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    const rawDt = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;
    const dt = Math.min(rawDt, 0.1);

    // Hit freeze
    if (hitFreezeFrames > 0) {
      hitFreezeFrames--;
      render();
      return;
    }

    // Fixed timestep physics
    accumulator += dt;
    while (accumulator >= PHYSICS_DT) {
      physicsStep(PHYSICS_DT);
      accumulator -= PHYSICS_DT;
    }

    // Variable-rate updates
    ParticleEngine.update(dt);
    FloatingText.update(dt);
    SpeedLines.update(dt, gameSpeed, state, THEME.player.groundY, CW);

    render();
  }

  return { start };
})();

// --- Boot ---
RunnerEngine.start();
