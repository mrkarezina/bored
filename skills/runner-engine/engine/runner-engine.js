/**
 * RunnerEngine — Complete endless runner game framework
 * Embed verbatim. Customize via THEME config object.
 */
const RunnerEngine = (() => {
  // State machine
  const STATE = { MENU: 0, PLAYING: 1, GAME_OVER: 2 };
  let state = STATE.MENU;
  let theme = null;
  let canvas, ctx;

  // Game state
  let score = 0;
  let highScore = 0;
  let distance = 0;
  let speed = 0;
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
  let playerState = 'run'; // run, jump, duck, hit

  // Active power-up effects
  let activeEffects = {};  // { effectName: { remaining: ms, powerup: ref } }

  // Object pools
  let obstacles = [];
  let powerups = [];
  let lastSpawnTime = 0;
  let spawnInterval = 0;

  // Combo system
  let combo = 0;
  let comboMultiplier = 1;
  let lastCollectTime = 0;

  // Difficulty
  let currentSpeed = 0;
  let currentSpawnInterval = 0;

  // Canvas scaling
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function start(themeConfig) {
    theme = themeConfig;
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = theme.canvasWidth || 800;
    canvas.height = theme.canvasHeight || 400;

    // Load high score
    highScore = parseInt(localStorage.getItem('bored-hs-' + theme.gameId) || '0');

    // Set up responsive scaling
    handleResize();
    window.addEventListener('resize', handleResize);

    // Initialize subsystems
    InputHandler.init(canvas, { onJump, onDuck, onDuckRelease, onAction });
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
    activeEffects = {};
    playerY = theme.player.groundY;
    playerVY = 0;
    isJumping = false;
    isDucking = false;
    isGrounded = true;
    playerState = 'run';
    gameStartTime = performance.now();
    lastFrameTime = gameStartTime;
    elapsed = 0;
    currentSpeed = theme.difficulty.startSpeed;
    currentSpawnInterval = theme.difficulty.startSpawnInterval;
    lastSpawnTime = gameStartTime;

    // Hide menu
    const menuEl = document.getElementById('menu-screen');
    const overEl = document.getElementById('gameover-screen');
    if (menuEl) menuEl.classList.add('hidden');
    if (overEl) overEl.classList.add('hidden');

    AudioEngine.bgBeat(true);
  }

  function gameOver() {
    state = STATE.GAME_OVER;
    AudioEngine.hit();
    AudioEngine.bgBeat(false);
    ParticleEngine.explosion(playerX + theme.player.width / 2, playerY, theme.colors.accent, 30);
    ParticleEngine.screenShake(10, 300);

    // Save high score
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('bored-hs-' + theme.gameId, String(highScore));
    }

    // Submit score and show game over
    if (typeof Scoreboard !== 'undefined') {
      Scoreboard.submitScore(theme.gameId, theme.name, theme.description || '', score).then((result) => {
        ScoreboardUI.showGameOver(score, highScore, result);
      });
    } else {
      ScoreboardUI.showGameOver(score, highScore, null);
    }
  }

  // Input callbacks
  function onJump() {
    if (state === STATE.MENU) {
      startGame();
      return;
    }
    if (state === STATE.GAME_OVER) {
      showMenu();
      return;
    }
    if (state === STATE.PLAYING && isGrounded) {
      playerVY = theme.player.jumpForce;
      isJumping = true;
      isGrounded = false;
      playerState = 'jump';
      AudioEngine.jump();
      ParticleEngine.emit(playerX, playerY + theme.player.height, theme.colors.accent, 5, 'burst');
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

  // Main game loop
  function gameLoop(timestamp) {
    requestAnimationFrame(gameLoop);

    if (state !== STATE.PLAYING) {
      // Still render menu/game-over background
      drawBackground(timestamp);
      ParticleEngine.update(16);
      ParticleEngine.draw();
      return;
    }

    const dt = Math.min(timestamp - lastFrameTime, 50); // cap delta
    lastFrameTime = timestamp;
    elapsed = timestamp - gameStartTime;
    frame++;
    // Difficulty ramp
    const elapsedSec = elapsed / 1000;
    currentSpeed = Math.min(
      theme.difficulty.startSpeed + elapsedSec * theme.difficulty.speedRampPerSecond,
      theme.difficulty.maxSpeed
    );
    currentSpawnInterval = Math.max(
      theme.difficulty.startSpawnInterval + elapsedSec * theme.difficulty.spawnRampPerSecond,
      theme.difficulty.minSpawnInterval
    );

    // Slow-mo effect
    let speedMult = 1;
    if (activeEffects['slow-mo']) speedMult = 0.5;

    const effectiveSpeed = currentSpeed * speedMult;

    // Update player physics
    updatePlayer(dt);

    // Spawn obstacles
    if (timestamp - lastSpawnTime > currentSpawnInterval) {
      spawnObstacle();
      lastSpawnTime = timestamp;
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

    // Update powerups
    updatePowerups(effectiveSpeed, dt);

    // Update active effects
    updateEffects(dt);

    // Update score
    const scoreMult = activeEffects['2x-score'] ? 2 : 1;
    score += Math.round(theme.scoring.distancePointsPerFrame * comboMultiplier * scoreMult);
    distance += effectiveSpeed;

    // Combo decay
    if (combo > 0 && timestamp - lastCollectTime > theme.scoring.comboDecayMs) {
      combo = 0;
      comboMultiplier = 1;
    }

    // Milestone
    if (Math.floor(score / theme.scoring.milestoneInterval) > Math.floor((score - theme.scoring.distancePointsPerFrame * comboMultiplier * scoreMult) / theme.scoring.milestoneInterval)) {
      AudioEngine.milestone();
      ParticleEngine.sparkle(canvas.width / 2, canvas.height / 2, theme.colors.score, 20);
    }

    // Draw everything
    draw(timestamp);
  }

  function updatePlayer(dt) {
    const dtMult = dt / 16; // normalize to ~60fps

    // Gravity
    if (!isGrounded) {
      playerVY += theme.player.gravity * dtMult;
      playerY += playerVY * dtMult;

      // Ground collision
      if (playerY >= theme.player.groundY) {
        playerY = theme.player.groundY;
        playerVY = 0;
        isJumping = false;
        isGrounded = true;
        playerState = isDucking ? 'duck' : 'run';
        ParticleEngine.emit(playerX + theme.player.width / 2, playerY + theme.player.height, theme.colors.accent, 3, 'dust');
      }
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

    const obs = {
      ...selected,
      x: canvas.width + 20,
      y: selected.type === 'air'
        ? theme.player.groundY - 20 - selected.height  // air obstacles at head height
        : theme.player.groundY + theme.player.height - selected.height,  // ground obstacles on ground
      active: true,
      frame: 0,
    };
    obstacles.push(obs);
  }

  function spawnPowerup(template) {
    // Don't spawn too many
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
          // Protected — destroy obstacle
          obs.active = false;
          ParticleEngine.explosion(obs.x + obs.width / 2, obs.y + obs.height / 2, theme.colors.accent, 10);
          AudioEngine.collect();
          score += 50;
          if (activeEffects['shield']) {
            delete activeEffects['shield']; // shield is one-hit
          }
        } else {
          gameOver();
          return;
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
        if (dist < 200) {
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
    AudioEngine.collect();
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

    // AABB collision with slight padding for fairness
    const pad = 4;
    return (
      playerX + pad < obj.x + obj.width - pad &&
      playerX + pw - pad > obj.x + pad &&
      py + pad < obj.y + obj.height - pad &&
      py + ph - pad > obj.y + pad
    );
  }

  // Drawing
  function draw(timestamp) {
    // Clear
    ctx.fillStyle = theme.colors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Backgrounds (parallax)
    drawBackground(timestamp);

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
    // Flash when shielded/invincible
    if (activeEffects['shield'] || activeEffects['invincible']) {
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(frame * 0.3);
    }
    const ph = isDucking ? (theme.player.duckHeight || theme.player.height * 0.5) : theme.player.height;
    const py = isDucking ? (playerY + theme.player.height - ph) : playerY;
    theme.player.draw(ctx, playerX, py, frame, playerState);
    ctx.restore();

    // Particles
    ParticleEngine.update(16);
    ParticleEngine.draw();

    // HUD
    HUD.draw(score, highScore, combo, comboMultiplier, activeEffects, elapsed);
  }

  function drawBackground(timestamp) {
    if (!theme || !theme.backgrounds) return;
    const t = timestamp || performance.now();
    const offset = state === STATE.PLAYING ? distance : t * 0.02;
    for (const bg of theme.backgrounds) {
      ctx.save();
      bg.draw(ctx, offset * bg.speed, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  return { start, getState: () => state, getScore: () => score };
})();
