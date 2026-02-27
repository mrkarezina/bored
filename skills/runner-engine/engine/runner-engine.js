/**
 * RunnerEngine — Complete endless runner game framework
 * Embed verbatim. Customize via THEME config object.
 */
const RunnerEngine = (() => {
  // State machine
  const STATE = { MENU: 0, PLAYING: 1, DYING: 2, GAME_OVER: 3 };
  let state = STATE.MENU;
  let theme = null;
  let canvas, ctx;

  // Game state
  let score = 0;
  let highScore = 0;
  let distance = 0;
  let frame = 0;
  let gameStartTime = 0;
  let lastFrameTime = 0;
  let elapsed = 0;

  // Player state
  let playerX = 80;
  let playerY = 0;
  let playerVY = 0;
  let isJumping = false;
  let isDucking = false;
  let isGrounded = true;
  let wasGrounded = true;
  let playerState = 'run'; // run, jump, duck, hit
  let jumpHeld = false;

  // Squash & stretch
  let squashX = 1;
  let squashY = 1;

  // Input forgiveness
  let coyoteTimer = 0;
  let jumpBufferTimer = 0;
  const COYOTE_TIME = 100;      // ms
  const JUMP_BUFFER_TIME = 100; // ms

  // Death effects
  let freezeTimer = 0;
  let flashTimer = 0;
  let dyingTimer = 0;
  let dyingVY = 0;
  let dyingRotation = 0;
  const FREEZE_DURATION = 100;  // ms
  const FLASH_DURATION = 80;    // ms
  const DYING_DURATION = 600;   // ms

  // Near-miss
  const NEAR_MISS_THRESHOLD = 12; // px

  // Active power-up effects
  let activeEffects = {};

  // Object pools
  let obstacles = [];
  let powerups = [];
  let lastSpawnTime = 0;
  let lastObstacleSpawnTime = 0;
  const MIN_OBSTACLE_GAP = 400; // ms minimum between obstacle spawns

  // Floating text popups
  let floatingTexts = [];

  // Combo system
  let combo = 0;
  let comboMultiplier = 1;
  let lastCollectTime = 0;

  // Difficulty
  let currentSpeed = 0;
  let currentSpawnInterval = 0;

  // Frame timing
  let currentDt = 16;

  // Canvas scaling
  let scale = 1;

  function start(themeConfig) {
    theme = themeConfig;
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d', { alpha: false });
    canvas.width = theme.canvasWidth || 800;
    canvas.height = theme.canvasHeight || 400;

    // Load high score
    highScore = parseInt(localStorage.getItem('bored-hs-' + theme.gameId) || '0');

    // Set up responsive scaling
    handleResize();
    window.addEventListener('resize', handleResize);

    // Tab visibility — pause and reset timing
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state === STATE.PLAYING) {
        lastFrameTime = performance.now();
      }
    });

    // Initialize subsystems
    InputHandler.init(canvas, { onJump, onJumpRelease, onDuck, onDuckRelease, onAction });
    AudioEngine.init(theme.sounds || {});
    ParticleEngine.init(ctx, canvas.width, canvas.height);
    HUD.init(ctx, theme);
    ScoreboardUI.init(theme);

    // Set UI colors
    document.documentElement.style.setProperty('--color-bg', theme.colors.bg);
    document.documentElement.style.setProperty('--color-text', theme.colors.text);
    document.documentElement.style.setProperty('--color-accent', theme.colors.accent);
    document.documentElement.style.setProperty('--color-score', theme.colors.score);
    document.body.style.backgroundColor = theme.colors.bg;
    document.body.style.color = theme.colors.text;

    // Update UI text
    const titleEl = document.getElementById('game-title');
    if (titleEl) titleEl.textContent = theme.name;
    const subtitleEl = document.getElementById('game-subtitle');
    if (subtitleEl) subtitleEl.textContent = 'Press SPACE or tap to start';

    showMenu();
    requestAnimationFrame(gameLoop);
  }

  function handleResize() {
    const container = canvas.parentElement;
    if (!container) return;
    const maxW = Math.min(window.innerWidth - 20, 900);
    const maxH = Math.min(window.innerHeight - 200, 500);
    const scaleX = maxW / canvas.width;
    const scaleY = maxH / canvas.height;
    scale = Math.min(scaleX, scaleY, 1.5);
    canvas.style.width = (canvas.width * scale) + 'px';
    canvas.style.height = (canvas.height * scale) + 'px';
  }

  function showMenu() {
    state = STATE.MENU;
    const menuEl = document.getElementById('menu-screen');
    const overEl = document.getElementById('gameover-screen');
    if (menuEl) menuEl.classList.remove('hidden');
    if (overEl) overEl.classList.add('hidden');
  }

  function startGame() {
    state = STATE.PLAYING;
    score = 0;
    distance = 0;
    frame = 0;
    combo = 0;
    comboMultiplier = 1;
    lastCollectTime = 0;
    obstacles = [];
    powerups = [];
    floatingTexts = [];
    activeEffects = {};
    playerY = theme.player.groundY;
    playerVY = 0;
    isJumping = false;
    isDucking = false;
    isGrounded = true;
    wasGrounded = true;
    playerState = 'run';
    jumpHeld = false;
    squashX = 1;
    squashY = 1;
    coyoteTimer = 0;
    jumpBufferTimer = 0;
    freezeTimer = 0;
    flashTimer = 0;
    dyingTimer = 0;
    gameStartTime = performance.now();
    lastFrameTime = gameStartTime;
    elapsed = 0;
    currentSpeed = theme.difficulty.startSpeed;
    currentSpawnInterval = theme.difficulty.startSpawnInterval;
    lastSpawnTime = gameStartTime;
    lastObstacleSpawnTime = 0;

    // Hide menu
    const menuEl = document.getElementById('menu-screen');
    const overEl = document.getElementById('gameover-screen');
    if (menuEl) menuEl.classList.add('hidden');
    if (overEl) overEl.classList.add('hidden');

    HUD.reset();
    AudioEngine.bgBeat(true);
  }

  function triggerDeath() {
    state = STATE.DYING;
    playerState = 'hit';
    AudioEngine.hit();
    AudioEngine.bgBeat(false);

    // Hit freeze — pause for dramatic impact
    freezeTimer = FREEZE_DURATION;
    // Background flash
    flashTimer = FLASH_DURATION;
    // Death momentum — player flies up then falls
    dyingVY = -8;
    dyingRotation = 0;
    dyingTimer = DYING_DURATION;

    ParticleEngine.explosion(playerX + theme.player.width / 2, playerY, theme.colors.accent, 30);
    ParticleEngine.screenShake(12, 400);
  }

  function gameOver() {
    state = STATE.GAME_OVER;

    // Check for new high score before updating
    const prevHighScore = highScore;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('bored-hs-' + theme.gameId, String(highScore));
    }

    // Submit score and show game over (pass previous high score for comparison)
    if (typeof Scoreboard !== 'undefined') {
      Scoreboard.submitScore(theme.gameId, theme.name, theme.description || '', score).then((result) => {
        ScoreboardUI.showGameOver(score, prevHighScore, result);
      });
    } else {
      ScoreboardUI.showGameOver(score, prevHighScore, null);
    }
  }

  // --- Input callbacks ---

  function doJump() {
    playerVY = theme.player.jumpForce;
    isJumping = true;
    isGrounded = false;
    jumpHeld = true;
    playerState = 'jump';
    coyoteTimer = 0;
    jumpBufferTimer = 0;
    // Jump stretch
    squashX = 0.75;
    squashY = 1.25;
    AudioEngine.jump();
    ParticleEngine.emit(playerX + theme.player.width / 2, theme.player.groundY + theme.player.height, theme.colors.accent, 6, 'burst');
  }

  function onJump() {
    if (state === STATE.MENU) {
      startGame();
      return;
    }
    if (state === STATE.GAME_OVER) {
      showMenu();
      return;
    }
    if (state !== STATE.PLAYING) return;

    // Can jump if grounded or within coyote time
    if (isGrounded || coyoteTimer > 0) {
      doJump();
    } else {
      // Buffer the jump for when we land
      jumpBufferTimer = JUMP_BUFFER_TIME;
    }
  }

  function onJumpRelease() {
    jumpHeld = false;
    // Variable jump height — cut velocity on early release
    if (state === STATE.PLAYING && playerVY < 0) {
      playerVY *= 0.4;
    }
  }

  function onDuck() {
    if (state === STATE.PLAYING && isGrounded) {
      isDucking = true;
      playerState = 'duck';
    }
  }

  function onDuckRelease() {
    isDucking = false;
    if (isGrounded && state === STATE.PLAYING) playerState = 'run';
  }

  function onAction() {
    if (state === STATE.MENU) startGame();
    else if (state === STATE.GAME_OVER) showMenu();
  }

  // --- Main game loop ---

  function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    const dt = Math.min(timestamp - lastFrameTime, 50); // cap delta
    lastFrameTime = timestamp;
    currentDt = dt;

    if (state === STATE.MENU || state === STATE.GAME_OVER) {
      ctx.fillStyle = theme.colors.bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawBackground(timestamp);
      ParticleEngine.update(dt);
      ParticleEngine.draw();
      return;
    }

    // DYING state — death momentum animation
    if (state === STATE.DYING) {
      // Hit freeze
      if (freezeTimer > 0) {
        freezeTimer -= dt;
        draw(timestamp); // still render frozen frame
        return;
      }

      dyingTimer -= dt;
      const dtMult = dt / 16;
      dyingVY += 0.5 * dtMult; // gravity on corpse
      playerY += dyingVY * dtMult;
      dyingRotation += 0.15 * dtMult;

      // Update floating texts during death animation
      updateFloatingTexts(dt);

      if (dyingTimer <= 0) {
        gameOver();
      }

      draw(timestamp);
      return;
    }

    // --- STATE.PLAYING ---
    elapsed = timestamp - gameStartTime;
    frame++;

    // Difficulty ramp — logarithmic curve for exciting start, fair plateau
    const elapsedSec = elapsed / 1000;
    const maxSpeedBonus = theme.difficulty.maxSpeed - theme.difficulty.startSpeed;
    currentSpeed = theme.difficulty.startSpeed + maxSpeedBonus * (1 - Math.exp(-elapsedSec * (theme.difficulty.speedRampPerSecond / maxSpeedBonus)));
    currentSpawnInterval = Math.max(
      theme.difficulty.startSpawnInterval + elapsedSec * theme.difficulty.spawnRampPerSecond,
      theme.difficulty.minSpawnInterval
    );

    // Slow-mo effect
    let speedMult = 1;
    if (activeEffects['slow-mo']) speedMult = 0.5;

    const effectiveSpeed = currentSpeed * speedMult;

    // Update input forgiveness timers
    if (coyoteTimer > 0) coyoteTimer -= dt;
    if (jumpBufferTimer > 0) jumpBufferTimer -= dt;

    // Update player physics
    updatePlayer(dt);

    // Spawn obstacles (with minimum gap)
    if (timestamp - lastSpawnTime > currentSpawnInterval &&
        timestamp - lastObstacleSpawnTime > MIN_OBSTACLE_GAP) {
      spawnObstacle();
      lastSpawnTime = timestamp;
      lastObstacleSpawnTime = timestamp;
    }

    // Spawn powerups
    if (theme.powerups && theme.powerups.length > 0) {
      for (const pu of theme.powerups) {
        if (Math.random() < (pu.spawnChance || 0.01) * (dt / 16)) {
          spawnPowerup(pu);
        }
      }
    }

    // Update obstacles
    updateObstacles(effectiveSpeed, dt);
    if (state !== STATE.PLAYING) {
      // Death was triggered — draw and skip rest of update
      draw(timestamp);
      return;
    }

    // Update powerups
    updatePowerups(effectiveSpeed, dt);

    // Update active effects
    updateEffects(dt);

    // Update floating texts
    updateFloatingTexts(dt);

    // Update score (dt-scaled so score rate is consistent across framerates)
    const dtMult = dt / 16;
    const scoreMult = activeEffects['2x-score'] ? 2 : 1;
    const scoreInc = theme.scoring.distancePointsPerFrame * comboMultiplier * scoreMult * dtMult;
    const prevScore = score;
    score += scoreInc;
    distance += effectiveSpeed * dtMult;

    // Combo decay
    if (combo > 0 && timestamp - lastCollectTime > theme.scoring.comboDecayMs) {
      combo = 0;
      comboMultiplier = 1;
    }

    // Milestone
    if (Math.floor(score / theme.scoring.milestoneInterval) > Math.floor(prevScore / theme.scoring.milestoneInterval)) {
      AudioEngine.milestone();
      ParticleEngine.sparkle(canvas.width / 2, canvas.height / 2, theme.colors.score, 20);
    }

    // Running dust trail
    if (isGrounded && !isDucking && frame % 4 === 0) {
      ParticleEngine.emit(playerX + 5, theme.player.groundY + theme.player.height, theme.colors.accent, 1, 'dust');
    }

    // Speed lines at high velocity
    if (currentSpeed > theme.difficulty.maxSpeed * 0.6) {
      const intensity = (currentSpeed - theme.difficulty.maxSpeed * 0.6) / (theme.difficulty.maxSpeed * 0.4);
      if (Math.random() < intensity * 0.4) {
        ParticleEngine.speedLine(canvas.width, canvas.height);
      }
    }

    // Squash & stretch lerp back to normal
    const lerpRate = 1 - Math.pow(0.85, dt / 16);
    squashX += (1.0 - squashX) * lerpRate;
    squashY += (1.0 - squashY) * lerpRate;

    // Draw everything
    draw(timestamp);
  }

  function updatePlayer(dt) {
    const dtMult = dt / 16;
    wasGrounded = isGrounded;

    // Gravity with enhanced fall speed + hang time
    if (!isGrounded) {
      let gravityMult = 1.0;

      // Increased fall gravity (snappy descent)
      if (playerVY > 0) {
        gravityMult = 2.0;
      }
      // Low jump multiplier (released jump early while rising)
      else if (playerVY < 0 && !jumpHeld) {
        gravityMult = 1.8;
      }
      // Anti-gravity apex (hang time at peak)
      if (Math.abs(playerVY) < 2) {
        gravityMult *= 0.5;
      }

      playerVY += theme.player.gravity * gravityMult * dtMult;
      playerY += playerVY * dtMult;

      // Ground collision
      if (playerY >= theme.player.groundY) {
        playerY = theme.player.groundY;
        const landingSpeed = playerVY;
        playerVY = 0;
        isJumping = false;
        isGrounded = true;
        playerState = isDucking ? 'duck' : 'run';

        // Landing squash (proportional to fall speed)
        const impact = Math.min(Math.abs(landingSpeed) / 15, 1);
        squashX = 1 + impact * 0.3;
        squashY = 1 - impact * 0.3;

        // Landing particles
        ParticleEngine.emit(playerX + theme.player.width / 2, playerY + theme.player.height, theme.colors.accent, 3 + Math.floor(impact * 5), 'dust');

        // Check jump buffer — execute queued jump
        if (jumpBufferTimer > 0) {
          doJump();
        }
      }
    }

    // Coyote time — track when we leave the ground
    if (wasGrounded && !isGrounded && playerVY >= 0) {
      // Just walked off edge (not jumped) — start coyote timer
      coyoteTimer = COYOTE_TIME;
    }
  }

  function spawnObstacle() {
    const pool = theme.obstacles;
    if (!pool || pool.length === 0) return;

    // Weighted random selection
    const totalWeight = pool.reduce((s, o) => s + (o.weight || 1), 0);
    let r = Math.random() * totalWeight;
    let selected = pool[0];
    for (const o of pool) {
      r -= (o.weight || 1);
      if (r <= 0) { selected = o; break; }
    }

    // Calculate Y position based on obstacle type
    let spawnY;
    if (selected.type === 'air') {
      // Position air obstacles in the "duck clearance zone":
      // overlaps standing hitbox but clears ducking hitbox
      const duckH = theme.player.duckHeight || theme.player.height * 0.5;
      const clearance = theme.player.height - duckH;
      spawnY = theme.player.groundY + clearance / 2 - selected.height / 2;
    } else {
      // Ground obstacles sit on the ground line
      spawnY = theme.player.groundY + theme.player.height - selected.height;
    }

    const obs = {
      ...selected,
      x: canvas.width + 20,
      y: spawnY,
      active: true,
      passed: false,
      frame: 0,
    };
    obstacles.push(obs);
  }

  function spawnPowerup(template) {
    if (powerups.length >= 3) return;

    const pu = {
      ...template,
      x: canvas.width + 20,
      y: theme.player.groundY - 30 - Math.random() * 60,
      active: true,
      frame: 0,
    };
    powerups.push(pu);
  }

  function updateObstacles(speed, dt) {
    const dtMult = dt / 16;
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= speed * (obs.minSpeed || 1) * dtMult;
      obs.frame++;

      // Off screen
      if (obs.x + obs.width < -20) {
        obstacles.splice(i, 1);
        continue;
      }

      // Collision detection (AABB)
      if (obs.active && checkCollision(obs)) {
        if (activeEffects['shield'] || activeEffects['invincible']) {
          obs.active = false;
          ParticleEngine.explosion(obs.x + obs.width / 2, obs.y + obs.height / 2, theme.colors.accent, 10);
          AudioEngine.collect();
          score += 50;
          if (activeEffects['shield']) {
            delete activeEffects['shield'];
          }
        } else {
          triggerDeath();
          return;
        }
      }

      // Near-miss detection
      if (obs.active && !obs.passed && obs.x + obs.width < playerX) {
        obs.passed = true;
        const pw = theme.player.width;
        const ph = isDucking ? (theme.player.duckHeight || theme.player.height * 0.5) : theme.player.height;
        const py = isDucking ? (playerY + theme.player.height - ph) : playerY;

        // Check vertical proximity
        const obsCenter = obs.y + obs.height / 2;
        const playerCenter = py + ph / 2;
        const vertDist = Math.abs(obsCenter - playerCenter);
        const horizDist = playerX - (obs.x + obs.width);

        if (vertDist < obs.height / 2 + ph / 2 + NEAR_MISS_THRESHOLD && horizDist < NEAR_MISS_THRESHOLD + pw) {
          // Near miss!
          score += 25;
          addFloatingText(playerX + pw, py - 10, 'CLOSE!', theme.colors.score);
          AudioEngine.nearMiss();
          ParticleEngine.emit(playerX, py + ph / 2, theme.colors.score, 4, 'sparkle');
        }
      }
    }
  }

  function updatePowerups(speed, dt) {
    const dtMult = dt / 16;
    const magnetActive = !!activeEffects['magnet'];

    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.x -= speed * dtMult;
      pu.frame++;

      // Magnet attraction
      if (magnetActive) {
        const dx = playerX - pu.x;
        const dy = playerY - pu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1 && dist < 200) {
          pu.x += (dx / dist) * 5 * dtMult;
          pu.y += (dy / dist) * 5 * dtMult;
        }
      }

      // Off screen
      if (pu.x + pu.width < -20) {
        powerups.splice(i, 1);
        continue;
      }

      // Collection
      if (pu.active && checkCollision(pu)) {
        pu.active = false;
        powerups.splice(i, 1);
        activatePowerup(pu);
      }
    }
  }

  function activatePowerup(pu) {
    AudioEngine.collect(combo);
    ParticleEngine.sparkle(pu.x + pu.width / 2, pu.y + pu.height / 2, theme.colors.score, 15);
    score += pu.points || 100;

    // Combo
    combo++;
    lastCollectTime = performance.now();
    comboMultiplier = Math.min(1 + combo * 0.5, theme.scoring.comboMultiplierMax);

    // Activate effect
    if (pu.effect) {
      activeEffects[pu.effect] = {
        remaining: pu.duration || 3000,
        powerup: pu,
      };
    }

    HUD.flashCombo(combo, comboMultiplier);
  }

  function updateEffects(dt) {
    for (const key of Object.keys(activeEffects)) {
      activeEffects[key].remaining -= dt;
      if (activeEffects[key].remaining <= 0) {
        delete activeEffects[key];
      }
    }
  }

  function checkCollision(obj) {
    const pw = theme.player.width;
    const ph = isDucking ? (theme.player.duckHeight || theme.player.height * 0.5) : theme.player.height;
    const py = isDucking ? (playerY + theme.player.height - ph) : playerY;

    // AABB collision with padding for fairness
    const pad = 4;
    return (
      playerX + pad < obj.x + obj.width - pad &&
      playerX + pw - pad > obj.x + pad &&
      py + pad < obj.y + obj.height - pad &&
      py + ph - pad > obj.y + pad
    );
  }

  // --- Floating text ---

  function addFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, age: 0, maxAge: 800 });
  }

  function updateFloatingTexts(dt) {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      floatingTexts[i].age += dt;
      if (floatingTexts[i].age >= floatingTexts[i].maxAge) {
        floatingTexts.splice(i, 1);
      }
    }
  }

  function drawFloatingTexts() {
    for (const ft of floatingTexts) {
      const t = ft.age / ft.maxAge;
      const alpha = 1 - t * t; // ease-in fade
      const yOff = t * 30; // float up
      const scale = Math.min(t * 6, 1); // quick pop-in
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.font = 'bold ' + Math.floor(14 * (0.8 + scale * 0.2)) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y - yOff);
      ctx.restore();
    }
  }

  // --- Drawing ---

  function draw(timestamp) {
    // Clear
    ctx.fillStyle = theme.colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply screen shake to entire scene
    const shake = ParticleEngine.getShakeOffset();
    if (shake.x !== 0 || shake.y !== 0) {
      ctx.save();
      ctx.translate(shake.x, shake.y);
    }

    // Backgrounds (parallax)
    drawBackground(timestamp);

    // Ground
    if (theme.drawGround) {
      ctx.save();
      theme.drawGround(ctx, distance, theme.player.groundY + theme.player.height, canvas.width, canvas.height);
      ctx.restore();
    }

    // Obstacles
    for (const obs of obstacles) {
      if (!obs.active) continue;
      ctx.save();
      obs.draw(ctx, obs.x, obs.y, obs.frame);
      ctx.restore();
    }

    // Powerups
    for (const pu of powerups) {
      if (!pu.active) continue;
      ctx.save();
      pu.draw(ctx, pu.x, pu.y, pu.frame);
      ctx.restore();
    }

    // Player
    ctx.save();
    if (activeEffects['shield'] || activeEffects['invincible']) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(frame * 0.3);
    }
    const ph = isDucking ? (theme.player.duckHeight || theme.player.height * 0.5) : theme.player.height;
    const py = isDucking ? (playerY + theme.player.height - ph) : playerY;

    // Apply squash & stretch (anchor at bottom center)
    if (state === STATE.DYING) {
      // Dying rotation
      ctx.translate(playerX + theme.player.width / 2, py + ph / 2);
      ctx.rotate(dyingRotation);
      ctx.translate(-(playerX + theme.player.width / 2), -(py + ph / 2));
    } else if (Math.abs(squashX - 1) > 0.01 || Math.abs(squashY - 1) > 0.01) {
      ctx.translate(playerX + theme.player.width / 2, py + ph);
      ctx.scale(squashX, squashY);
      ctx.translate(-(playerX + theme.player.width / 2), -(py + ph));
    }

    theme.player.draw(ctx, playerX, py, frame, playerState);
    ctx.restore();

    // Particles
    ParticleEngine.update(currentDt);
    ParticleEngine.draw();

    // Floating texts
    drawFloatingTexts();

    // End screen shake transform
    if (shake.x !== 0 || shake.y !== 0) {
      ctx.restore();
    }

    // Background flash on death (overlay AFTER scene, not shaken)
    if (flashTimer > 0) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = flashTimer / FLASH_DURATION * 0.6;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      flashTimer -= currentDt;
    }

    // HUD (drawn last, on top of everything)
    if (state === STATE.PLAYING || state === STATE.DYING) {
      HUD.draw(score, highScore, combo, comboMultiplier, activeEffects, elapsed);
    }
  }

  function drawBackground(timestamp) {
    if (!theme || !theme.backgrounds) return;
    const t = timestamp || performance.now();
    const offset = (state === STATE.PLAYING || state === STATE.DYING) ? distance : t * 0.02;
    for (const bg of theme.backgrounds) {
      ctx.save();
      bg.draw(ctx, offset * bg.speed, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  return { start, getState: () => state, getScore: () => score };
})();
