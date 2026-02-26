# Endless Runner Game Engine Template

This is the complete game engine skeleton. When generating a game, copy this entire template and fill in **only** the `THEME` object. Do not modify the engine code below the THEME section.

The generated file must be a single, self-contained `index.html` with no external dependencies.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>GAME_TITLE_HERE</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
  canvas { display: block; width: 100%; height: 100%; touch-action: none; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
// ============================================================
// THEME OBJECT — THIS IS THE ONLY SECTION TO CUSTOMIZE
// See theming-guide.md for full documentation of each field
// ============================================================
const THEME = {
  name: '',           // Game title string
  description: '',    // One-line theme summary
  gameId: '',         // UUID v4 — unique per generated game

  colors: {
    skyTop: '#87CEEB',
    skyBottom: '#E0F0FF',
    ground: '#8B4513',
    groundDetail: '#6B3410',
    ui: '#FFFFFF',
    uiShadow: 'rgba(0,0,0,0.5)',
    score: '#FFD700',
    menuOverlay: 'rgba(0,0,0,0.6)',
    deathFlash: 'rgba(255,255,255,0.8)',
    gameoverOverlay: 'rgba(0,0,0,0.75)',
  },

  // Draw the player character
  // ctx: CanvasRenderingContext2D, player: {x,y,w,h,vy}, time: seconds
  drawCharacter(ctx, player, time) {
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(player.x, player.y, player.w, player.h);
  },

  // Obstacle types array — at least 3
  // Each: { name, w, h, unlockScore, draw(ctx, obs, time) }
  obstacleTypes: [
    {
      name: 'default',
      w: 40,
      h: 60,
      unlockScore: 0,
      draw(ctx, obs, time) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      }
    }
  ],

  // Parallax background layers — at least 3, drawn far to near
  // Each: { speed (0-1, 0=static, 1=ground speed), y (0-1 normalized), draw(ctx, scrollX, y, w, h, time) }
  parallaxLayers: [],

  // Draw the scrolling ground
  drawGround(ctx, scrollX, groundY, w, h) {
    ctx.fillStyle = this.colors.ground;
    ctx.fillRect(0, groundY, w, h);
  },

  // Particle colors/config per type
  particles: {
    dust:     { colors: ['#D2B48C','#C4A882'], size: 4 },
    ring:     { color: '#FFD700', maxRadius: 30 },
    death:    { colors: ['#FF4444','#FF8800','#FFDD44'], size: 6 },
    trail:    { colors: ['#FFFFFF'], size: 3 },
    confetti: { colors: ['#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF'], size: 5 },
  },

  // Procedural sound definitions — functions that play a sound
  // Each receives (audioCtx, masterGain) and should create+start oscillators/noise
  sounds: {
    jump(ac, g) {},
    doubleJump(ac, g) {},
    land(ac, g) {},
    die(ac, g) {},
    score100(ac, g) {},
    score1000(ac, g) {},
    nearMiss(ac, g) {},
    milestone(ac, g) {},
  },

  // Background music config
  bpm: 120,
  // Play one beat of the background music
  // ac: AudioContext, g: GainNode, beatNum: integer, time: AudioContext time
  playBeat(ac, g, beatNum, time) {},
};

// ============================================================
// ENGINE — DO NOT MODIFY BELOW THIS LINE
// ============================================================

const LEADERBOARD_URL = 'https://bored-leaderboard.vercel.app';

// --- Canvas Setup ---
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
let W, H, GROUND_Y, SCALE;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  GROUND_Y = H * 0.75;
  SCALE = Math.min(W / 800, H / 600);
}
resize();
window.addEventListener('resize', resize);

// --- Constants ---
const PHYSICS_DT = 1 / 120;
const GRAVITY = 2800;
const JUMP_VELOCITY = -750;
const DOUBLE_JUMP_VELOCITY = -650;
const HOLD_GRAVITY_MULT = 0.45;
const RELEASE_GRAVITY_MULT = 3.0;
const TERMINAL_VELOCITY = 1200;
const HITBOX_SCALE = 0.80;
const NEAR_MISS_MARGIN = 20;
const START_SPEED = 300;
const MAX_SPEED = 900;
const SPEED_RAMP = 8;
const MIN_OBSTACLE_INTERVAL = 0.6;
const MAX_OBSTACLE_INTERVAL = 1.8;
const PARTICLE_POOL_SIZE = 300;

// --- Game State ---
let state = 'menu'; // menu, playing, dying, gameover
let score = 0;
let displayScore = 0;
let highScore = 0;
let gameSpeed = START_SPEED;
let scrollX = 0;
let lastObstacleTime = 0;
let obstacleInterval = MAX_OBSTACLE_INTERVAL;
let dyingTimer = 0;
let deathFlashAlpha = 0;
let hitFreezeFrames = 0;
let shakeX = 0, shakeY = 0, shakeAmount = 0;
let jumpHeld = false;
let gameTime = 0;

// --- Player ---
const player = {
  x: 0, y: 0, w: 50 * 1, h: 60 * 1,
  vy: 0,
  grounded: true,
  jumps: 0,
  maxJumps: 2,
  scaleX: 1, scaleY: 1,
  targetScaleX: 1, targetScaleY: 1,
  rotation: 0,
  dead: false,
};

function resetPlayer() {
  player.x = W * 0.15;
  player.y = GROUND_Y - player.h;
  player.vy = 0;
  player.grounded = true;
  player.jumps = 0;
  player.scaleX = 1; player.scaleY = 1;
  player.targetScaleX = 1; player.targetScaleY = 1;
  player.rotation = 0;
  player.dead = false;
}

// --- Obstacles ---
let obstacles = [];

function spawnObstacle() {
  const available = THEME.obstacleTypes.filter(t => score >= t.unlockScore);
  const type = available[Math.floor(Math.random() * available.length)];
  obstacles.push({
    x: W + 50,
    y: GROUND_Y - type.h,
    w: type.w,
    h: type.h,
    type: type,
    scored: false,
    nearMissed: false,
  });
}

// --- Particle System (Object Pool) ---
const particlePool = [];
for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
  particlePool.push({ active: false, x:0, y:0, vx:0, vy:0, life:0, maxLife:1, type:'dust', color:'#FFF', size:4, rotation:0, vr:0, alpha:1, gravity: 0 });
}

function emitParticle(x, y, vx, vy, life, type, color, size, gravity) {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = particlePool[i];
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

function emitBurst(x, y, count, type, colors, sizeRange, speedRange, lifeRange, gravity) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
    const life = lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0]);
    const size = sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]);
    const color = colors[Math.floor(Math.random() * colors.length)];
    emitParticle(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, life, type, color, size, gravity || 400);
  }
}

// Dust on jump/land
function emitDust(x, y, count) {
  const cfg = THEME.particles.dust;
  for (let i = 0; i < count; i++) {
    const vx = (Math.random() - 0.5) * 150;
    const vy = -Math.random() * 100 - 30;
    emitParticle(x + (Math.random()-0.5)*20, y, vx, vy, 0.4 + Math.random()*0.3, 'dust', cfg.colors[Math.floor(Math.random()*cfg.colors.length)], cfg.size * (0.5 + Math.random()*0.5), 300);
  }
}

// Ring effect
function emitRing(x, y) {
  emitParticle(x, y, 0, 0, 0.4, 'ring', THEME.particles.ring.color, THEME.particles.ring.maxRadius, 0);
}

// Death explosion
function emitDeath(x, y) {
  const cfg = THEME.particles.death;
  emitBurst(x, y, 25, 'death', cfg.colors, [3, cfg.size], [100, 350], [0.5, 1.2], 500);
}

// Trail particle
function emitTrail(x, y) {
  const cfg = THEME.particles.trail;
  emitParticle(x, y, -gameSpeed * 0.3 + (Math.random()-0.5)*30, (Math.random()-0.5)*20, 0.3+Math.random()*0.2, 'trail', cfg.colors[Math.floor(Math.random()*cfg.colors.length)], cfg.size*(0.5+Math.random()*0.5), 0);
}

// Confetti burst
function emitConfetti(x, y, count) {
  const cfg = THEME.particles.confetti;
  emitBurst(x, y, count, 'confetti', cfg.colors, [3, cfg.size], [80, 250], [0.8, 1.5], 300);
}

function updateParticles(dt) {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = particlePool[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
    p.rotation += p.vr * dt;
    p.alpha = Math.max(0, p.life / p.maxLife);
  }
}

function drawParticles(layer) {
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    const p = particlePool[i];
    if (!p.active) continue;
    // layer 0 = behind player, layer 1 = in front
    const isFront = (p.type === 'confetti' || p.type === 'ring');
    if ((layer === 0 && isFront) || (layer === 1 && !isFront)) continue;

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
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size * p.alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- Audio System ---
let audioCtx = null;
let masterGain = null;
let musicPlaying = false;
let beatInterval = null;
let beatNumber = 0;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.4;
  masterGain.connect(audioCtx.destination);
}

function playSound(name) {
  if (!audioCtx || !THEME.sounds[name]) return;
  try { THEME.sounds[name](audioCtx, masterGain); } catch(e) {}
}

function startMusic() {
  if (musicPlaying || !audioCtx || !THEME.playBeat) return;
  musicPlaying = true;
  beatNumber = 0;
  const beatTime = 60 / THEME.bpm;
  let nextBeatTime = audioCtx.currentTime + 0.1;

  function scheduleBeat() {
    while (nextBeatTime < audioCtx.currentTime + 0.1) {
      try { THEME.playBeat(audioCtx, masterGain, beatNumber, nextBeatTime); } catch(e) {}
      beatNumber++;
      nextBeatTime += beatTime;
    }
  }
  beatInterval = setInterval(scheduleBeat, 25);
}

function stopMusic() {
  musicPlaying = false;
  if (beatInterval) { clearInterval(beatInterval); beatInterval = null; }
}

// --- Floating Text ---
let floatingTexts = [];

function addFloatingText(x, y, text, color, size) {
  floatingTexts.push({ x, y, text, color, size: size || 24, life: 1.2, maxLife: 1.2 });
}

function updateFloatingTexts(dt) {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.life -= dt;
    ft.y -= 60 * dt;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }
}

function drawFloatingTexts() {
  for (const ft of floatingTexts) {
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

// --- Speed Lines ---
let speedLines = [];

function updateSpeedLines(dt) {
  if (gameSpeed > 500 && state === 'playing') {
    if (Math.random() < (gameSpeed - 500) / 400 * dt * 30) {
      speedLines.push({
        x: W, y: Math.random() * GROUND_Y,
        len: 40 + Math.random() * 80,
        speed: gameSpeed * (1.5 + Math.random()),
        alpha: 0.1 + Math.random() * 0.2,
        life: 0.5,
      });
    }
  }
  for (let i = speedLines.length - 1; i >= 0; i--) {
    const sl = speedLines[i];
    sl.x -= sl.speed * dt;
    sl.life -= dt;
    if (sl.x + sl.len < 0 || sl.life <= 0) speedLines.splice(i, 1);
  }
}

function drawSpeedLines() {
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1;
  for (const sl of speedLines) {
    ctx.globalAlpha = sl.alpha * (sl.life / 0.5);
    ctx.beginPath();
    ctx.moveTo(sl.x, sl.y);
    ctx.lineTo(sl.x + sl.len, sl.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// --- Screen Shake ---
function triggerShake(amount) {
  shakeAmount = Math.max(shakeAmount, amount);
}

function updateShake(dt) {
  if (shakeAmount > 0) {
    shakeX = (Math.random() - 0.5) * shakeAmount * 2;
    shakeY = (Math.random() - 0.5) * shakeAmount * 2;
    shakeAmount *= Math.pow(0.05, dt);
    if (shakeAmount < 0.5) { shakeAmount = 0; shakeX = 0; shakeY = 0; }
  }
}

// --- Squash & Stretch ---
function updateSquash(dt) {
  const lerp = 1 - Math.pow(0.001, dt);
  player.scaleX += (player.targetScaleX - player.scaleX) * lerp;
  player.scaleY += (player.targetScaleY - player.scaleY) * lerp;
}

function setSquash(sx, sy) {
  player.scaleX = sx;
  player.scaleY = sy;
  player.targetScaleX = 1;
  player.targetScaleY = 1;
}

// --- Input ---
let inputJump = false;

function jumpPress() {
  initAudio();
  if (state === 'menu') {
    startGame();
    return;
  }
  if (state === 'gameover') {
    startGame();
    return;
  }
  if (state !== 'playing') return;

  jumpHeld = true;
  if (player.grounded) {
    player.vy = JUMP_VELOCITY;
    player.grounded = false;
    player.jumps = 1;
    setSquash(0.7, 1.3);
    emitDust(player.x + player.w/2, GROUND_Y, 8);
    playSound('jump');
  } else if (player.jumps < player.maxJumps) {
    player.vy = DOUBLE_JUMP_VELOCITY;
    player.jumps++;
    setSquash(0.75, 1.25);
    emitRing(player.x + player.w/2, player.y + player.h/2);
    playSound('doubleJump');
  }
}

function jumpRelease() {
  jumpHeld = false;
}

// Keyboard
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    jumpPress();
  }
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    jumpRelease();
  }
});

// Touch
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); jumpPress(); }, { passive: false });
canvas.addEventListener('touchend', (e) => { e.preventDefault(); jumpRelease(); }, { passive: false });

// Mouse
canvas.addEventListener('mousedown', (e) => { jumpPress(); });
canvas.addEventListener('mouseup', (e) => { jumpRelease(); });

// --- Collision Detection ---
function checkCollision(a, b) {
  const ax = a.x + a.w * (1 - HITBOX_SCALE) / 2;
  const ay = a.y + a.h * (1 - HITBOX_SCALE) / 2;
  const aw = a.w * HITBOX_SCALE;
  const ah = a.h * HITBOX_SCALE;
  return ax < b.x + b.w && ax + aw > b.x && ay < b.y + b.h && ay + ah > b.y;
}

function checkNearMiss(obs) {
  const gap = obs.x - (player.x + player.w);
  return gap > 0 && gap < NEAR_MISS_MARGIN && !obs.nearMissed && !player.grounded;
}

// --- Score ---
let prevScoreHundred = 0;

function updateScore(dt) {
  if (state !== 'playing') return;
  score += gameSpeed * dt * 0.02;
  const s = Math.floor(score);
  const newHundred = Math.floor(s / 100);
  if (newHundred > prevScoreHundred) {
    prevScoreHundred = newHundred;
    if (s % 1000 === 0 && s > 0) {
      playSound('score1000');
      emitConfetti(W/2, H/3, 30);
      addFloatingText(W/2, H/3, `${s}!`, THEME.colors.score, 36);
      triggerShake(4);
    } else {
      playSound('score100');
      addFloatingText(player.x + player.w + 20, player.y, `${s}`, THEME.colors.score, 20);
    }
    // Milestone sound
    if (s === 500 || s === 1500 || s === 3000) {
      playSound('milestone');
      addFloatingText(W/2, H/2 - 50, 'NEW OBSTACLE!', '#FF4444', 28);
    }
  }
}

// --- Score count-up animation ---
let countUpScore = 0;
let countUpTarget = 0;
let countUpDone = false;

// --- Game Lifecycle ---
function startGame() {
  state = 'playing';
  score = 0;
  displayScore = 0;
  prevScoreHundred = 0;
  gameSpeed = START_SPEED;
  scrollX = 0;
  obstacles = [];
  floatingTexts = [];
  speedLines = [];
  lastObstacleTime = 0;
  gameTime = 0;
  shakeAmount = 0; shakeX = 0; shakeY = 0;
  hitFreezeFrames = 0;
  resetPlayer();
  // Clear particles
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) particlePool[i].active = false;
  startMusic();
}

function die() {
  if (state !== 'playing') return;
  state = 'dying';
  player.dead = true;
  dyingTimer = 0.5;
  hitFreezeFrames = 4;
  deathFlashAlpha = 1;
  triggerShake(10);
  emitDeath(player.x + player.w/2, player.y + player.h/2);
  playSound('die');
  stopMusic();
  const finalScore = Math.floor(score);
  if (finalScore > highScore) highScore = finalScore;
}

function goToGameOver() {
  state = 'gameover';
  countUpScore = 0;
  countUpTarget = Math.floor(score);
  countUpDone = false;
}

// --- Physics Update (fixed timestep) ---
function physicsStep(dt) {
  if (state === 'dying') {
    dyingTimer -= dt;
    deathFlashAlpha *= Math.pow(0.01, dt);
    if (dyingTimer <= 0) goToGameOver();
    return;
  }
  if (state !== 'playing') return;

  gameTime += dt;

  // Difficulty ramp
  gameSpeed = Math.min(MAX_SPEED, START_SPEED + SPEED_RAMP * gameTime);
  obstacleInterval = MAX_OBSTACLE_INTERVAL - (MAX_OBSTACLE_INTERVAL - MIN_OBSTACLE_INTERVAL) * ((gameSpeed - START_SPEED) / (MAX_SPEED - START_SPEED));

  scrollX += gameSpeed * dt;

  // Player physics
  let gMult = 1;
  if (!player.grounded) {
    if (player.vy < 0 && jumpHeld) gMult = HOLD_GRAVITY_MULT;
    else if (player.vy > 0) gMult = RELEASE_GRAVITY_MULT;
  }
  player.vy += GRAVITY * gMult * dt;
  player.vy = Math.min(player.vy, TERMINAL_VELOCITY);
  player.y += player.vy * dt;

  // Ground collision
  if (player.y + player.h >= GROUND_Y) {
    player.y = GROUND_Y - player.h;
    if (!player.grounded && player.vy > 100) {
      setSquash(1.3, 0.7);
      emitDust(player.x + player.w/2, GROUND_Y, 5);
      triggerShake(2);
      playSound('land');
    }
    player.vy = 0;
    player.grounded = true;
    player.jumps = 0;
  }

  // Trail particles
  if (gameTime % 0.05 < dt) {
    emitTrail(player.x, player.y + player.h * 0.5 + (Math.random()-0.5)*player.h*0.3);
  }

  // Obstacles
  lastObstacleTime += dt;
  if (lastObstacleTime >= obstacleInterval) {
    lastObstacleTime = 0;
    spawnObstacle();
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const obs = obstacles[i];
    obs.x -= gameSpeed * dt;

    // Score when passed
    if (!obs.scored && obs.x + obs.w < player.x) {
      obs.scored = true;
    }

    // Near miss detection
    if (checkNearMiss(obs)) {
      obs.nearMissed = true;
      score += 25;
      addFloatingText(player.x + player.w + 30, player.y - 10, 'CLOSE!', '#00FF88', 22);
      triggerShake(3);
      playSound('nearMiss');
    }

    // Collision
    if (checkCollision(player, obs)) {
      die();
      return;
    }

    // Remove off-screen
    if (obs.x + obs.w < -50) obstacles.splice(i, 1);
  }

  // Score
  updateScore(dt);
  updateSquash(dt);
}

// --- Render ---
function render(alpha) {
  ctx.save();

  // Screen shake offset (applied to everything except UI)
  ctx.translate(shakeX, shakeY);

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0, THEME.colors.skyTop);
  skyGrad.addColorStop(1, THEME.colors.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(-20, -20, W + 40, GROUND_Y + 20);

  // Parallax layers
  for (const layer of THEME.parallaxLayers) {
    ctx.save();
    try { layer.draw(ctx, scrollX * layer.speed, layer.y * GROUND_Y, W, GROUND_Y, gameTime); } catch(e) {}
    ctx.restore();
  }

  // Ground
  ctx.save();
  try { THEME.drawGround(ctx, scrollX, GROUND_Y, W, H - GROUND_Y); } catch(e) {}
  ctx.restore();

  // Obstacles
  for (const obs of obstacles) {
    ctx.save();
    try { obs.type.draw(ctx, obs, gameTime); } catch(e) {}
    ctx.restore();
  }

  // Particles (behind player)
  drawParticles(0);

  // Player with squash & stretch
  if (!player.dead || state === 'dying') {
    ctx.save();
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h;
    ctx.translate(cx, cy);
    ctx.scale(player.scaleX, player.scaleY);
    ctx.rotate(player.rotation);
    ctx.translate(-cx, -cy);
    try { THEME.drawCharacter(ctx, player, gameTime); } catch(e) {}
    ctx.restore();
  }

  // Particles (in front of player)
  drawParticles(1);

  // Speed lines
  drawSpeedLines();

  // Death flash
  if (deathFlashAlpha > 0.01) {
    ctx.fillStyle = THEME.colors.deathFlash;
    ctx.globalAlpha = deathFlashAlpha;
    ctx.fillRect(-20, -20, W + 40, H + 40);
    ctx.globalAlpha = 1;
  }

  ctx.restore(); // Remove shake transform

  // --- UI (not affected by shake) ---
  const uiScore = Math.floor(state === 'gameover' ? (countUpDone ? countUpTarget : countUpScore) : score);

  // Score display
  ctx.save();
  ctx.font = `bold ${Math.round(28 * SCALE)}px monospace`;
  ctx.textAlign = 'right';
  ctx.fillStyle = THEME.colors.uiShadow;
  ctx.fillText(uiScore.toString(), W - 18, 42);
  ctx.fillStyle = THEME.colors.score;
  ctx.fillText(uiScore.toString(), W - 20, 40);
  // High score
  if (highScore > 0) {
    ctx.font = `${Math.round(16 * SCALE)}px monospace`;
    ctx.fillStyle = THEME.colors.ui;
    ctx.globalAlpha = 0.7;
    ctx.fillText('HI ' + highScore, W - 20, 62);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Floating texts
  drawFloatingTexts();

  // --- State Overlays ---
  if (state === 'menu') drawMenuOverlay();
  if (state === 'gameover') drawGameOverOverlay();
}

function drawMenuOverlay() {
  ctx.fillStyle = THEME.colors.menuOverlay;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = THEME.colors.ui;
  ctx.font = `bold ${Math.round(42 * SCALE)}px monospace`;
  ctx.fillText(THEME.name, W/2, H * 0.35);
  ctx.font = `${Math.round(18 * SCALE)}px monospace`;
  ctx.fillStyle = THEME.colors.ui;
  ctx.globalAlpha = 0.8;
  ctx.fillText(THEME.description, W/2, H * 0.43);
  ctx.globalAlpha = 1;
  ctx.font = `${Math.round(22 * SCALE)}px monospace`;
  const pulse = 0.5 + Math.sin(Date.now() / 400) * 0.5;
  ctx.globalAlpha = 0.6 + pulse * 0.4;
  ctx.fillText('TAP / SPACE to start', W/2, H * 0.58);
  ctx.globalAlpha = 1;
}

function drawGameOverOverlay() {
  ctx.fillStyle = THEME.colors.gameoverOverlay;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.fillStyle = THEME.colors.ui;
  ctx.font = `bold ${Math.round(38 * SCALE)}px monospace`;
  ctx.fillText('GAME OVER', W/2, H * 0.28);

  // Count-up score
  ctx.font = `bold ${Math.round(52 * SCALE)}px monospace`;
  ctx.fillStyle = THEME.colors.score;
  const displayVal = countUpDone ? countUpTarget : Math.floor(countUpScore);
  ctx.fillText(displayVal.toString(), W/2, H * 0.40);

  if (Math.floor(score) >= highScore && highScore > 0) {
    ctx.font = `bold ${Math.round(20 * SCALE)}px monospace`;
    ctx.fillStyle = '#FF4444';
    ctx.fillText('NEW HIGH SCORE!', W/2, H * 0.46);
  }

  // Leaderboard prompt
  if (countUpDone) {
    ctx.font = `${Math.round(16 * SCALE)}px monospace`;
    ctx.fillStyle = THEME.colors.ui;
    ctx.globalAlpha = 0.8;
    ctx.fillText('TAP / SPACE to retry', W/2, H * 0.58);

    // Name input prompt
    if (!scoreSubmitted && !nameInputActive) {
      ctx.globalAlpha = 0.6 + Math.sin(Date.now()/300)*0.4;
      ctx.fillText('Press ENTER to submit score', W/2, H * 0.65);
    }
    if (scoreSubmitted) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#00FF88';
      ctx.fillText(submitMessage, W/2, H * 0.65);
    }
    ctx.globalAlpha = 1;
  }

  // Name input UI
  if (nameInputActive) {
    drawNameInput();
  }
}

// --- Name Input for Leaderboard ---
let nameInputActive = false;
let playerName = '';
let scoreSubmitted = false;
let submitMessage = '';

function drawNameInput() {
  const boxW = Math.min(300, W * 0.7);
  const boxH = 100;
  const boxX = (W - boxW) / 2;
  const boxY = H * 0.55;

  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.strokeStyle = THEME.colors.score;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = `${Math.round(14 * SCALE)}px monospace`;
  ctx.fillStyle = THEME.colors.ui;
  ctx.fillText('Enter your name:', W/2, boxY + 25);

  ctx.font = `bold ${Math.round(22 * SCALE)}px monospace`;
  ctx.fillStyle = THEME.colors.score;
  const cursor = Math.sin(Date.now()/300) > 0 ? '|' : '';
  ctx.fillText(playerName + cursor, W/2, boxY + 55);

  ctx.font = `${Math.round(12 * SCALE)}px monospace`;
  ctx.fillStyle = THEME.colors.ui;
  ctx.globalAlpha = 0.6;
  ctx.fillText('ENTER to submit / ESC to cancel', W/2, boxY + 82);
  ctx.globalAlpha = 1;
}

// Name input keyboard handler
window.addEventListener('keydown', (e) => {
  if (state !== 'gameover' || !countUpDone) return;

  if (e.key === 'Enter' && !nameInputActive && !scoreSubmitted) {
    nameInputActive = true;
    playerName = '';
    e.preventDefault();
    return;
  }

  if (!nameInputActive) return;

  if (e.key === 'Escape') {
    nameInputActive = false;
    return;
  }
  if (e.key === 'Enter' && playerName.length > 0) {
    nameInputActive = false;
    submitScore(playerName, Math.floor(score));
    return;
  }
  if (e.key === 'Backspace') {
    playerName = playerName.slice(0, -1);
    return;
  }
  if (e.key.length === 1 && playerName.length < 20) {
    playerName += e.key;
  }
  e.preventDefault();
  e.stopPropagation();
});

// Prevent jump during name input
const originalJumpPress = jumpPress;
const _jumpPress = () => {
  if (nameInputActive) return;
  originalJumpPress();
};
// Rebind — we need to override the event handlers above
// Instead, we check in jumpPress itself
// (Already handled by checking nameInputActive at the start)

// Patch jumpPress to block during name input
const __origJP = jumpPress;
jumpPress = function() {
  if (nameInputActive) return;
  __origJP();
};

// --- Leaderboard Submission ---
async function submitScore(name, finalScore) {
  scoreSubmitted = true;
  submitMessage = 'Submitting...';
  try {
    const res = await fetch(`${LEADERBOARD_URL}/api/scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: THEME.gameId,
        gameName: THEME.name,
        theme: THEME.description,
        playerName: name,
        score: finalScore,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      submitMessage = `Rank #${data.rank} — ${name}: ${finalScore}`;
    } else {
      submitMessage = 'Submitted! (could not get rank)';
    }
  } catch(e) {
    submitMessage = 'Offline — score not submitted';
  }
}

// --- Main Loop ---
let accumulator = 0;
let lastTime = 0;

function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);

  const rawDt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  // Clamp large dt (tab switch, etc)
  const dt = Math.min(rawDt, 0.1);

  // Hit freeze
  if (hitFreezeFrames > 0) {
    hitFreezeFrames--;
    render(1);
    return;
  }

  // Fixed-timestep physics
  accumulator += dt;
  while (accumulator >= PHYSICS_DT) {
    physicsStep(PHYSICS_DT);
    accumulator -= PHYSICS_DT;
  }
  const alpha = accumulator / PHYSICS_DT;

  // Variable-rate updates
  updateParticles(dt);
  updateFloatingTexts(dt);
  updateSpeedLines(dt);
  updateShake(dt);

  // Score count-up in gameover
  if (state === 'gameover' && !countUpDone) {
    countUpScore += countUpTarget * dt * 3;
    if (countUpScore >= countUpTarget) {
      countUpScore = countUpTarget;
      countUpDone = true;
    }
  }

  render(alpha);
}

// Kick off
resetPlayer();
requestAnimationFrame((t) => { lastTime = t; gameLoop(t); });

</script>
</body>
</html>
```

## Key Engine Features Summary

1. **Fixed-timestep physics** at 120Hz with variable rendering — ensures consistent behavior regardless of frame rate
2. **State machine**: menu → playing → dying → gameover with proper transitions
3. **Variable-height jumps**: hold for float, release for fast fall, double jump
4. **Object-pooled particles**: 300 pre-allocated, zero GC during gameplay
5. **Procedural audio**: Web Audio API sounds triggered on first user gesture
6. **Beat-scheduled music**: Lookahead pattern at 25ms intervals for gapless playback
7. **Game juice**: screen shake, squash/stretch, hit freeze, speed lines, near-miss detection
8. **Difficulty curve**: speed ramps from 300 to 900 px/s, obstacle intervals tighten, new types unlock
9. **Forgiving hitboxes**: 80% of visual size
10. **Leaderboard integration**: name input on game over, score submission to API
11. **Full input support**: keyboard, touch, mouse — all funnel to jumpPress/jumpRelease
12. **Mobile-ready**: full viewport canvas, touch-action none, user-scalable no
