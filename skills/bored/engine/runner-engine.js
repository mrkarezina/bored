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

  /**
   * Level generation. `envelope` is what the player can physically reach, worked
   * out once from the theme's own physics; `scheduler` turns the theme's
   * playlist into obstacles at distances that envelope says are survivable.
   *
   * This replaces the old timer-and-coin-flip spawner. That version fired on a
   * fixed interval and picked a type at weighted random, with no idea that the
   * gap between two obstacles can be too wide to clear in one jump and too tight
   * to land between — at max speed 47% of the gaps it emitted were in that band.
   */
  let envelope = null;
  let scheduler = null;

  /**
   * Physics runs on a fixed 60Hz step, decoupled from the display refresh.
   * Previously every physics line multiplied by dt/16, which made the jump arc
   * depend on the monitor: the same theme played differently at 144Hz than at
   * 60Hz, and nothing that reasons about reachability could be trusted.
   */
  const STEP_MS = 1000 / 60;
  const MAX_STEPS_PER_FRAME = 5;   // after a tab stall, drop time rather than spiral
  let accumulator = 0;

  // Floating text popups
  let floatingTexts = [];

  // Combo system
  let combo = 0;
  let comboMultiplier = 1;
  let lastCollectTime = 0;

  // Difficulty
  let currentSpeed = 0;

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

    // What this player can reach. Everything about spacing is derived from it,
    // so it is computed before anything else and throws loudly on physics that
    // cannot produce a playable arc.
    envelope = Envelope.compute(theme.player);
    assertObstaclesAreClearable();

    // Initialize subsystems
    InputHandler.init(canvas, { onJump, onJumpRelease, onDuck, onDuckRelease, onAction });
    AudioEngine.init(theme.sounds);
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

  /**
   * Every obstacle must be survivable by the move it asks for, before the game
   * ever starts. Two ways a theme gets this wrong:
   *
   *   - a ground obstacle taller than the jump can clear, so it is simply a wall
   *   - an air obstacle that dips into the ducking player, either because it is
   *     too tall or because its motion carries it down there
   *
   * The second is the interesting one: `bob(8)` on a bird that only just fits
   * the duck band makes it stop fitting. Motion declares a bound precisely so
   * this can be checked by arithmetic instead of discovered by dying.
   */
  function assertObstaclesAreClearable() {
    for (const o of theme.obstacles || []) {
      const bound = o.motion ? Motion.boundsOf(o.motion, o) : { dx: 0, dy: 0 };
      const swept = o.height + bound.dy * 2;

      if (o.type === 'air') {
        if (swept > envelope.maxAirHeight) {
          throw new Error(
            `RunnerEngine: air obstacle "${o.name}" sweeps ${swept}px ` +
            `(${o.height}px tall${bound.dy ? ` plus ${bound.dy}px of motion either way` : ''}) ` +
            `but the duck clearance band only admits ${envelope.maxAirHeight}px. ` +
            `A ducking player would still be hit. Make it shorter, reduce the motion, ` +
            `or widen player.height - player.duckHeight.`
          );
        }
      } else if (o.height >= envelope.peak * 0.9) {
        throw new Error(
          `RunnerEngine: ground obstacle "${o.name}" is ${o.height}px tall but the ` +
          `jump only peaks at ${envelope.peak.toFixed(0)}px. Nothing clears it. ` +
          `Cap it around ${Math.floor(envelope.peak * 0.85)}px or give the player a stronger jump.`
        );
      }
    }
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
    accumulator = 0;

    // A fresh scheduler per run, so the level is different every time but
    // reproducible when a seed is pinned — which is what lets playtest.js replay
    // the exact run that failed.
    scheduler = Rhythm.scheduler({
      playlist: theme.rhythm,
      env: envelope,
      obstacles: theme.obstacles,
      powerups: theme.powerups || [],
      seed: theme.seed !== undefined ? theme.seed : (Math.random() * 0x7fffffff) | 0,
    });
    scheduler.validate(theme.difficulty.startSpeed);

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
    // Browsers only allow an AudioContext to start from inside a user gesture.
    // This is that gesture — miss it and the game is silent on mobile forever.
    AudioEngine.unlock();

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
    AudioEngine.unlock();
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

      // Deliberately wall-clock scaled rather than fixed-step. Nothing here is
      // simulation — the player is already dead and no input is accepted — so
      // what matters is that the tumble lasts the same length of time at any
      // refresh rate. The playing state is the opposite case and is stepped.
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
    // Physics advances in whole fixed steps and rendering happens once, so a
    // 144Hz display and a 60Hz one simulate identically. Leftover time carries
    // to the next frame instead of being smeared into the step size.
    accumulator += dt;
    let steps = 0;
    while (accumulator >= STEP_MS && steps < MAX_STEPS_PER_FRAME && state === STATE.PLAYING) {
      accumulator -= STEP_MS;
      steps++;
      stepPlaying();
    }
    // A long stall (backgrounded tab, GC pause) must not turn into a burst of
    // catch-up frames the player cannot react to. Drop the debt instead.
    if (steps >= MAX_STEPS_PER_FRAME) accumulator = 0;

    draw(timestamp);
  }

  /**
   * One fixed 60Hz step of the playing state. Every quantity here is per-step,
   * which is why there is no dt multiplier anywhere in it.
   */
  function stepPlaying() {
    elapsed += STEP_MS;
    frame++;

    // Difficulty ramp — logarithmic curve for exciting start, fair plateau
    const elapsedSec = elapsed / 1000;
    const maxSpeedBonus = theme.difficulty.maxSpeed - theme.difficulty.startSpeed;
    currentSpeed = theme.difficulty.startSpeed + maxSpeedBonus * (1 - Math.exp(-elapsedSec * (theme.difficulty.speedRampPerSecond / maxSpeedBonus)));

    // Slow-mo effect
    const speedMult = activeEffects['slow-mo'] ? 0.5 : 1;
    const effectiveSpeed = currentSpeed * speedMult;

    // Update input forgiveness timers
    if (coyoteTimer > 0) coyoteTimer -= STEP_MS;
    if (jumpBufferTimer > 0) jumpBufferTimer -= STEP_MS;

    updatePlayer();

    // Build the road ahead. The scheduler decides what and where; everything it
    // hands back is already spaced so it can be got through.
    for (const ev of scheduler.update(distance, effectiveSpeed, elapsedSec)) {
      if (ev.kind === 'obstacle') spawnObstacleAt(ev);
      else spawnPowerupAt(ev);
    }

    updateObstacles(effectiveSpeed);
    if (state !== STATE.PLAYING) return;   // death triggered mid-step

    updatePowerups(effectiveSpeed);
    updateEffects(STEP_MS);
    updateFloatingTexts(STEP_MS);

    const scoreMult = activeEffects['2x-score'] ? 2 : 1;
    const prevScore = score;
    score += theme.scoring.distancePointsPerFrame * comboMultiplier * scoreMult;
    distance += effectiveSpeed;

    // Combo decay
    if (combo > 0 && elapsed - lastCollectTime > theme.scoring.comboDecayMs) {
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
    const lerpRate = 1 - Math.pow(0.85, 1);
    squashX += (1.0 - squashX) * lerpRate;
    squashY += (1.0 - squashY) * lerpRate;
  }

  function updatePlayer() {
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

      playerVY += theme.player.gravity * gravityMult;
      playerY += playerVY;

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

  /**
   * Place an obstacle the scheduler has decided on. `worldX` is an absolute
   * position along the run, so the screen position is just the difference from
   * how far we have travelled — sub-pixel exact, and independent of when in the
   * frame this happened to be called.
   */
  function spawnObstacleAt(ev) {
    const def = ev.def;
    if (!def) return;

    let spawnY;
    if (def.type === 'air') {
      // Air obstacles sit in the band that overlaps a standing player and
      // clears a ducking one. assertObstaclesAreClearable() has already proved
      // this one fits, motion included.
      const duckH = theme.player.duckHeight || theme.player.height * 0.5;
      const clearance = theme.player.height - duckH;
      spawnY = theme.player.groundY + clearance / 2 - def.height / 2;
    } else {
      spawnY = theme.player.groundY + theme.player.height - def.height;
    }

    obstacles.push({
      ...def,
      x: ev.worldX - distance,
      y: spawnY,
      baseY: spawnY,
      dx: 0,
      dy: 0,
      rotate: 0,
      scale: 1,
      active: true,
      passed: false,
      frame: 0,
      // Fixed at spawn, never re-rolled, so instances move out of step with
      // each other without anything strobing.
      phase: Math.random(),
      screenX: ev.worldX - distance,
    });
  }

  /**
   * Power-ups are placed by the scheduler inside gaps, at an altitude taken from
   * the jump arc — so they are reachable by construction. The old version rolled
   * a per-frame dice at a random height with no relationship to the obstacle
   * stream, and most of what it produced could not be got to.
   */
  function spawnPowerupAt(ev) {
    if (powerups.length >= 3) return;
    const template = (theme.powerups || []).find((p) => p.name === ev.name);
    if (!template) return;

    powerups.push({
      ...template,
      x: ev.worldX - distance,
      y: theme.player.groundY - ev.altitude,
      active: true,
      frame: 0,
    });
  }

  function updateObstacles(speed) {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      obs.x -= speed;
      obs.frame++;
      obs.screenX = obs.x;

      // Motion blocks displace the obstacle from where the scroll put it. The
      // offsets are applied to collision and drawing alike, so what the player
      // sees and what can hit them stay the same thing.
      if (obs.motion && obs.motion.length) {
        const m = Motion.applyAll(obs.motion, obs, obs.frame);
        obs.dx = m.dx;
        obs.dy = m.dy;
        obs.rotate = m.rotate;
        obs.scale = m.scale;
        obs.y = obs.baseY + m.dy;
      }

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

  function updatePowerups(speed) {
    const magnetActive = !!activeEffects['magnet'];

    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.x -= speed;
      pu.frame++;

      // Magnet attraction
      if (magnetActive) {
        const dx = playerX - pu.x;
        const dy = playerY - pu.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1 && dist < 200) {
          pu.x += (dx / dist) * 5;
          pu.y += (dy / dist) * 5;
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
    // Measured on the fixed-step clock, the same one the combo decay reads.
    lastCollectTime = elapsed;
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

    // The hitbox is wherever motion has actually put the thing this frame, at
    // whatever size it is actually being drawn. A sprite that grows must become
    // harder to miss, or the drawing is lying to the player.
    const scale = obj.scale || 1;
    const w = obj.width * scale;
    const h = obj.height * scale;
    const ox = obj.x + (obj.dx || 0) - (w - obj.width) / 2;
    const oy = obj.y - (h - obj.height) / 2;

    // AABB collision with padding for fairness
    const pad = 4;
    return (
      playerX + pad < ox + w - pad &&
      playerX + pw - pad > ox + pad &&
      py + pad < oy + h - pad &&
      py + ph - pad > oy + pad
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

    // Obstacles. Rotation and scale are applied about the sprite's centre so a
    // spinning or breathing obstacle stays where its hitbox says it is.
    for (const obs of obstacles) {
      if (!obs.active) continue;
      ctx.save();
      const x = obs.x + (obs.dx || 0);
      if (obs.rotate || (obs.scale && obs.scale !== 1)) {
        const cx = x + obs.width / 2;
        const cy = obs.y + obs.height / 2;
        ctx.translate(cx, cy);
        if (obs.rotate) ctx.rotate(obs.rotate);
        if (obs.scale && obs.scale !== 1) ctx.scale(obs.scale, obs.scale);
        ctx.translate(-cx, -cy);
      }
      obs.draw(ctx, x, obs.y, obs.frame);
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

  // STATE and getFrame are exposed for tooling (playtest.js, the test suite).
  // getFrame counts fixed physics steps, not rendered frames — the two differ
  // whenever the accumulator carries time between frames, and anything
  // measuring the simulation needs the former.
  return {
    start,
    getState: () => state,
    getScore: () => score,
    getFrame: () => frame,
    getSpeed: () => currentSpeed,
    STATE,
  };
})();
