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
  :root {
    --color-bg: #0a0a2e;
    --color-text: #ffffff;
    --color-accent: #ff6b6b;
    --color-score: #ffd93d;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: var(--color-bg);
    color: var(--color-text);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }
  #game-container {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  #game-canvas {
    border-radius: 8px;
    box-shadow: 0 0 40px rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.3);
    cursor: pointer;
    display: block;
  }
  /* Menu Screen Overlay */
  #menu-screen {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    border-radius: 8px;
    z-index: 10;
    transition: opacity 0.3s;
  }
  #menu-screen.hidden { opacity: 0; pointer-events: none; }
  #game-title {
    font-size: 2.4em;
    font-weight: 800;
    letter-spacing: -1px;
    color: var(--color-accent);
    text-shadow: 0 0 20px var(--color-accent);
    margin-bottom: 8px;
    text-align: center;
  }
  #game-subtitle {
    font-size: 1em;
    opacity: 0.7;
    margin-bottom: 24px;
    text-align: center;
  }
  #menu-start-hint {
    animation: pulse 2s ease-in-out infinite;
    opacity: 0.6;
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  .controls-hint {
    display: flex;
    gap: 16px;
    font-size: 0.8em;
    opacity: 0.5;
    margin-top: 16px;
  }
  .controls-hint kbd {
    background: rgba(255,255,255,0.1);
    padding: 2px 8px;
    border-radius: 4px;
    font-family: monospace;
  }
  /* Game Over Screen */
  #gameover-screen {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding-top: 30px;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(6px);
    border-radius: 8px;
    z-index: 10;
    transition: opacity 0.3s;
    overflow-y: auto;
  }
  #gameover-screen.hidden { opacity: 0; pointer-events: none; }
  #gameover-title {
    font-size: 1.8em;
    font-weight: 700;
    color: var(--color-accent);
    margin-bottom: 4px;
  }
  #gameover-score {
    font-size: 2.4em;
    font-weight: 800;
    color: var(--color-score);
    text-shadow: 0 0 15px var(--color-score);
  }
  #gameover-highscore {
    font-size: 0.9em;
    opacity: 0.6;
    margin-bottom: 16px;
  }
  #gameover-newrecord {
    display: none;
    font-size: 1em;
    color: var(--color-score);
    font-weight: 700;
    animation: pulse 1s ease-in-out infinite;
    margin-bottom: 8px;
  }
  /* Leaderboard */
  #leaderboard-container {
    width: 85%;
    max-width: 350px;
    margin: 8px 0;
  }
  #leaderboard-title {
    font-size: 0.9em;
    opacity: 0.6;
    text-align: center;
    margin-bottom: 8px;
  }
  #leaderboard-list {
    list-style: none;
    width: 100%;
  }
  #leaderboard-list li {
    display: flex;
    justify-content: space-between;
    padding: 4px 8px;
    font-size: 0.85em;
    border-radius: 4px;
    opacity: 0;
    animation: fadeSlideIn 0.3s ease forwards;
  }
  #leaderboard-list li:nth-child(1) { color: #ffd700; }
  #leaderboard-list li:nth-child(2) { color: #c0c0c0; }
  #leaderboard-list li:nth-child(3) { color: #cd7f32; }
  .lb-rank { min-width: 24px; opacity: 0.5; }
  .lb-name { flex: 1; padding: 0 8px; overflow: hidden; text-overflow: ellipsis; }
  .lb-score { font-weight: 700; font-variant-numeric: tabular-nums; }
  #leaderboard-loading {
    text-align: center;
    opacity: 0.4;
    font-size: 0.85em;
    padding: 12px;
  }
  #gameover-restart {
    font-size: 0.9em;
    opacity: 0.5;
    margin-top: 12px;
    margin-bottom: 16px;
    animation: pulse 2s ease-in-out infinite;
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  /* Name input modal */
  #name-modal {
    display: none;
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.8);
    z-index: 100;
    align-items: center;
    justify-content: center;
  }
  #name-modal.show { display: flex; }
  #name-form {
    background: rgba(30,30,60,0.95);
    padding: 24px 32px;
    border-radius: 12px;
    text-align: center;
    border: 1px solid rgba(255,255,255,0.1);
  }
  #name-form input {
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    color: white;
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 1.1em;
    text-align: center;
    outline: none;
    width: 200px;
    margin: 12px 0;
  }
  #name-form input:focus { border-color: var(--color-accent); }
  #name-form button {
    background: var(--color-accent);
    color: white;
    border: none;
    padding: 8px 24px;
    border-radius: 6px;
    font-size: 1em;
    cursor: pointer;
    font-weight: 600;
  }
  #game-footer {
    font-size: 0.7em;
    opacity: 0.3;
    margin-top: 8px;
  }
</style>
</head>
<body>
  <div id="game-container">
    <canvas id="game-canvas"></canvas>

    <!-- Menu Screen -->
    <div id="menu-screen">
      <div id="game-title">Game Title</div>
      <div id="game-subtitle">Subtitle</div>
      <div id="menu-start-hint">Press SPACE or tap to start</div>
      <div class="controls-hint">
        <span><kbd>SPACE</kbd> / <kbd>UP</kbd> Jump</span>
        <span><kbd>DOWN</kbd> Duck</span>
      </div>
    </div>

    <!-- Game Over Screen -->
    <div id="gameover-screen" class="hidden">
      <div id="gameover-title">Game Over</div>
      <div id="gameover-score">0</div>
      <div id="gameover-newrecord">NEW RECORD!</div>
      <div id="gameover-highscore">Best: 0</div>
      <div id="leaderboard-container">
        <div id="leaderboard-title">Global Leaderboard</div>
        <div id="leaderboard-loading">Loading scores...</div>
        <ul id="leaderboard-list"></ul>
      </div>
      <div id="gameover-restart">Press SPACE or tap to play again</div>
    </div>
  </div>

  <div id="game-footer">Made with /bored</div>

  <!-- Name Input Modal -->
  <div id="name-modal">
    <div id="name-form">
      <div>Pick a name for the leaderboard</div>
      <input id="name-input" type="text" maxlength="20" placeholder="Your name" autofocus>
      <br>
      <button id="name-submit">Let's go!</button>
    </div>
  </div>

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
    bg: '#0a0a2e',       // Page background & canvas clear color
    text: '#ffffff',     // UI text color
    accent: '#ff6b6b',   // Accent for highlights, particles, UI elements
    score: '#ffd93d',    // Score number color
    ground: '#1a1a3e',   // Ground fill color
    groundLine: '#2a2a5e', // Ground detail/line color
  },

  // Player config
  player: {
    width: 32,         // Player hitbox width
    height: 48,        // Player hitbox height (standing)
    duckHeight: 24,    // Player hitbox height (ducking)
    groundY: 300,      // Y position of player's top when standing on ground
    jumpForce: -14,    // Initial vertical velocity on jump (negative = up)
    gravity: 0.8,      // Gravity acceleration per frame

    // Draw the player — called every frame
    // ctx: CanvasRenderingContext2D, x/y: position, frame: frame counter, state: 'run'|'jump'|'duck'|'hit'
    draw(ctx, x, y, frame, state) {
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(x, y, 32, state === 'duck' ? 24 : 48);
    },
  },

  // Obstacle types — at least 3 ground + 1 air
  // Each: { name, type: 'ground'|'air', width, height, weight, draw(ctx, x, y, frame) }
  obstacles: [
    {
      name: 'default',
      type: 'ground',
      width: 30,
      height: 40,
      weight: 1,       // Spawn probability weight (higher = more common)
      draw(ctx, x, y, frame) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(x, y, 30, 40);
      }
    }
  ],

  // Power-up types — collectible items with effects
  // Each: { name, width, height, points, effect, duration, spawnChance, draw(ctx, x, y, frame) }
  // effect: 'shield'|'invincible'|'2x-score'|'slow-mo'|'magnet'
  powerups: [
    // Example:
    // { name: 'Shield', width: 20, height: 20, points: 100,
    //   effect: 'shield', duration: 0, spawnChance: 0.003,
    //   draw(ctx, x, y, frame) { ... } }
  ],

  // Parallax background layers — drawn far to near
  // Each: { speed (0-1), draw(ctx, scrollX, canvasWidth, canvasHeight) }
  backgrounds: [],

  // Draw the scrolling ground
  drawGround(ctx, scrollX, groundY, w, h) {
    ctx.fillStyle = this.colors.ground;
    ctx.fillRect(0, groundY, w, h);
  },

  // Particle colors per effect type
  particles: {
    dust:     { colors: ['#D2B48C','#C4A882'], size: 4 },
    jump:     { colors: ['#FFFFFF'], size: 3 },
    death:    { colors: ['#FF4444','#FF8800','#FFDD44'], size: 6 },
    collect:  { colors: ['#FFD700','#FFA500'], size: 4 },
    trail:    { colors: ['#FFFFFF'], size: 3 },
    confetti: { colors: ['#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF'], size: 5 },
  },

  // Scoring config
  scoring: {
    distancePointsPerFrame: 1,    // Base score per frame while running
    milestoneInterval: 500,        // Score interval for milestone celebrations
    comboDecayMs: 3000,            // ms before combo resets after last collect
    comboMultiplierMax: 5,         // Maximum combo multiplier
  },

  // Difficulty ramp
  difficulty: {
    startSpeed: 4,               // Initial obstacle scroll speed (px/frame)
    maxSpeed: 12,                 // Maximum speed
    speedRampPerSecond: 0.05,     // Speed increase per second of gameplay
    startSpawnInterval: 1500,     // Initial spawn interval (ms)
    minSpawnInterval: 600,        // Minimum spawn interval
    spawnRampPerSecond: -8,       // Spawn interval change per second (negative = faster)
  },

  // Procedural sound config for AudioEngine
  sounds: {
    jumpFreqs: [200, 500],       // [startHz, endHz] for jump chirp
    collectFreqs: [523, 659, 784], // Arpeggio notes for collect sound
    hitFreq: 80,                  // Death hit base frequency
    bgBPM: 120,                   // Background beat BPM

    // Optional: full custom sound functions (override defaults)
    // jump(ac, g) {},
    // doubleJump(ac, g) {},
    // land(ac, g) {},
    // die(ac, g) {},
    // collect(ac, g) {},
    // score100(ac, g) {},
    // score1000(ac, g) {},
    // nearMiss(ac, g) {},
    // milestone(ac, g) {},
    // playBeat(ac, g, beatNum, time) {},
  },
};

// ============================================================
// ENGINE — DO NOT MODIFY BELOW THIS LINE
// ============================================================

const LEADERBOARD_URL = 'https://bored.run';

// --- AudioEngine IIFE ---
const AudioEngine = (() => {
  let ac = null;
  let master = null;
  let bgInterval = null;
  let bgBeatOn = false;
  let beatNum = 0;
  let config = {};

  function init(soundConfig) {
    config = soundConfig || {};
  }

  function ensure() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain();
        master.gain.value = 0.4;
        master.connect(ac.destination);
      } catch(e) { return false; }
    }
    if (ac.state === 'suspended') ac.resume();
    return true;
  }

  function tone(freq, dur, type, vol) {
    if (!ensure()) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(master);
    o.start(); o.stop(ac.currentTime + dur);
  }

  function sweep(f0, f1, dur, type, vol) {
    if (!ensure()) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur + 0.05);
    o.connect(g).connect(master);
    o.start(); o.stop(ac.currentTime + dur + 0.05);
  }

  function noise(dur, hpFreq, vol) {
    if (!ensure()) return;
    const sz = ac.sampleRate * dur;
    const buf = ac.createBuffer(1, sz, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const n = ac.createBufferSource();
    n.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol || 0.1, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    if (hpFreq) {
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = hpFreq;
      n.connect(hp).connect(g).connect(master);
    } else {
      n.connect(g).connect(master);
    }
    n.start(); n.stop(ac.currentTime + dur);
  }

  // Sound functions — use custom overrides from THEME.sounds if provided
  function jump() {
    if (config.jump) { if (ensure()) config.jump(ac, master); return; }
    const f = config.jumpFreqs || [200, 500];
    sweep(f[0], f[1], 0.15, 'square', 0.12);
  }

  function doubleJump() {
    if (config.doubleJump) { if (ensure()) config.doubleJump(ac, master); return; }
    const f = config.jumpFreqs || [200, 500];
    sweep(f[0] * 1.5, f[1] * 1.5, 0.1, 'square', 0.1);
  }

  function land() {
    if (config.land) { if (ensure()) config.land(ac, master); return; }
    sweep(150, 50, 0.1, 'sine', 0.15);
  }

  function die() {
    if (config.die) { if (ensure()) config.die(ac, master); return; }
    const f = config.hitFreq || 80;
    sweep(400, f, 0.4, 'sawtooth', 0.2);
    noise(0.2, 0, 0.1);
  }

  function collect() {
    if (config.collect) { if (ensure()) config.collect(ac, master); return; }
    const freqs = config.collectFreqs || [523, 659, 784];
    if (!ensure()) return;
    freqs.forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.001, ac.currentTime + i * 0.06);
      g.gain.linearRampToValueAtTime(0.12, ac.currentTime + i * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.06 + 0.15);
      o.connect(g).connect(master);
      o.start(ac.currentTime + i * 0.06);
      o.stop(ac.currentTime + i * 0.06 + 0.15);
    });
  }

  function score100() {
    if (config.score100) { if (ensure()) config.score100(ac, master); return; }
    sweep(800, 1200, 0.06, 'sine', 0.08);
  }

  function score1000() {
    if (config.score1000) { if (ensure()) config.score1000(ac, master); return; }
    if (!ensure()) return;
    [523, 659, 784].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.001, ac.currentTime + i * 0.08);
      g.gain.linearRampToValueAtTime(0.1, ac.currentTime + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.08 + 0.15);
      o.connect(g).connect(master);
      o.start(ac.currentTime + i * 0.08);
      o.stop(ac.currentTime + i * 0.08 + 0.15);
    });
  }

  function nearMiss() {
    if (config.nearMiss) { if (ensure()) config.nearMiss(ac, master); return; }
    if (!ensure()) return;
    const sz = ac.sampleRate * 0.15;
    const buf = ac.createBuffer(1, sz, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const n = ac.createBufferSource();
    n.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1000, ac.currentTime);
    bp.frequency.exponentialRampToValueAtTime(4000, ac.currentTime + 0.1);
    bp.Q.value = 2;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
    n.connect(bp).connect(g).connect(master);
    n.start(); n.stop(ac.currentTime + 0.15);
  }

  function milestone() {
    if (config.milestone) { if (ensure()) config.milestone(ac, master); return; }
    if (!ensure()) return;
    [440, 880].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.001, ac.currentTime + i * 0.12);
      g.gain.linearRampToValueAtTime(0.15, ac.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.12 + 0.25);
      o.connect(g).connect(master);
      o.start(ac.currentTime + i * 0.12);
      o.stop(ac.currentTime + i * 0.12 + 0.25);
    });
  }

  function bgBeat(on) {
    if (on && !bgBeatOn) {
      bgBeatOn = true;
      beatNum = 0;
      const bpm = config.bgBPM || 120;
      const interval = 60000 / bpm;

      if (config.playBeat) {
        // Custom beat function — use lookahead scheduling
        let nextBeatTime = ac ? ac.currentTime + 0.1 : 0;
        bgInterval = setInterval(() => {
          if (!bgBeatOn || !ac) return;
          while (nextBeatTime < ac.currentTime + 0.1) {
            try { config.playBeat(ac, master, beatNum, nextBeatTime); } catch(e) {}
            beatNum++;
            nextBeatTime += 60 / bpm;
          }
        }, 25);
      } else {
        // Default simple beat
        bgInterval = setInterval(() => {
          if (!bgBeatOn) return;
          const freq = beatNum % 4 === 0 ? 60 : 45;
          tone(freq, 0.08, 'square', 0.04);
          beatNum++;
        }, interval);
      }
    } else if (!on) {
      bgBeatOn = false;
      if (bgInterval) clearInterval(bgInterval);
      bgInterval = null;
    }
  }

  return { init, ensure, jump, doubleJump, land, die, collect, score100, score1000, nearMiss, milestone, bgBeat };
})();

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
    // Shake decay
    if (shakeAmount > 0) {
      shakeX = (Math.random() - 0.5) * shakeAmount * 2;
      shakeY = (Math.random() - 0.5) * shakeAmount * 2;
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

// --- InputHandler IIFE ---
const InputHandler = (() => {
  let cbs = {};
  let touchStartY = 0;
  let touchStartX = 0;
  let duckingFromTouch = false;

  function init(canvas, callbacks) {
    cbs = callbacks;

    document.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (cbs.onJump) cbs.onJump();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (cbs.onDuck) cbs.onDuck();
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        if (cbs.onJumpRelease) cbs.onJumpRelease();
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        if (cbs.onDuckRelease) cbs.onDuckRelease();
      }
    });

    // Touch — tap to jump, swipe down to duck
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      duckingFromTouch = false;
      if (cbs.onJump) cbs.onJump();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const dy = e.touches[0].clientY - touchStartY;
      if (dy > 30 && !duckingFromTouch) {
        duckingFromTouch = true;
        if (cbs.onDuck) cbs.onDuck();
      }
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (duckingFromTouch) {
        duckingFromTouch = false;
        if (cbs.onDuckRelease) cbs.onDuckRelease();
      }
      if (cbs.onJumpRelease) cbs.onJumpRelease();
    }, { passive: false });

    // Mouse
    canvas.addEventListener('mousedown', () => { if (cbs.onJump) cbs.onJump(); });
    canvas.addEventListener('mouseup', () => { if (cbs.onJumpRelease) cbs.onJumpRelease(); });
  }

  return { init };
})();

// --- HUD IIFE ---
const HUD = (() => {
  let ctx = null;
  let theme = null;
  let comboFlash = 0;
  let comboFlashText = '';

  function init(context, themeConfig) { ctx = context; theme = themeConfig; }

  function draw(score, highScore, combo, multiplier, activeEffects, elapsed) {
    if (!ctx || !theme) return;
    const w = ctx.canvas.width;

    ctx.save();

    // Score (top right, zero-padded)
    ctx.fillStyle = theme.colors.score;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    const scoreText = String(Math.floor(score)).padStart(6, '0');
    ctx.fillText(scoreText, w - 16, 16);

    // High score
    ctx.shadowBlur = 0;
    ctx.fillStyle = theme.colors.text;
    ctx.globalAlpha = 0.4;
    ctx.font = '12px monospace';
    ctx.fillText('HI ' + String(Math.floor(highScore)).padStart(6, '0'), w - 16, 48);
    ctx.globalAlpha = 1;

    // Combo multiplier (top left)
    if (multiplier > 1) {
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.colors.accent;
      ctx.font = 'bold 20px monospace';
      ctx.shadowColor = theme.colors.accent;
      ctx.shadowBlur = 8;
      ctx.fillText(multiplier.toFixed(1) + 'x', 16, 16);
      ctx.shadowBlur = 0;

      ctx.fillStyle = theme.colors.text;
      ctx.globalAlpha = 0.6;
      ctx.font = '12px monospace';
      ctx.fillText('COMBO ' + combo, 16, 40);
      ctx.globalAlpha = 1;
    }

    // Active effects with timer bars (below score, right side)
    let effectY = 64;
    for (const key of Object.keys(activeEffects)) {
      const effect = activeEffects[key];
      const pct = effect.remaining / (effect.powerup.duration || 3000);
      ctx.textAlign = 'right';
      ctx.font = '11px monospace';
      ctx.fillStyle = theme.colors.accent;
      ctx.globalAlpha = 0.8;
      const label = key.toUpperCase().replace(/-/g, ' ');
      ctx.fillText(label, w - 16, effectY);
      // Timer bar
      ctx.fillStyle = theme.colors.accent;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(w - 100, effectY + 2, 80, 4);
      ctx.globalAlpha = 0.8;
      ctx.fillRect(w - 100, effectY + 2, 80 * Math.max(0, pct), 4);
      ctx.globalAlpha = 1;
      effectY += 18;
    }

    // Elapsed time (bottom left)
    ctx.textAlign = 'left';
    ctx.fillStyle = theme.colors.text;
    ctx.globalAlpha = 0.25;
    ctx.font = '11px monospace';
    const secs = Math.floor(elapsed / 1000);
    const mins = Math.floor(secs / 60);
    ctx.fillText(mins + ':' + String(secs % 60).padStart(2, '0'), 16, ctx.canvas.height - 12);
    ctx.globalAlpha = 1;

    // Combo flash effect
    if (comboFlash > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = theme.colors.score;
      ctx.globalAlpha = comboFlash;
      ctx.shadowColor = theme.colors.score;
      ctx.shadowBlur = 12;
      ctx.font = 'bold ' + Math.round(24 + (1 - comboFlash) * 16) + 'px monospace';
      ctx.fillText(comboFlashText, w / 2, 80);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      comboFlash = Math.max(0, comboFlash - 0.02);
    }

    ctx.restore();
  }

  function flashCombo(combo, multiplier) {
    comboFlash = 1.0;
    if (combo >= 10) comboFlashText = 'UNSTOPPABLE! x' + multiplier.toFixed(1);
    else if (combo >= 7) comboFlashText = 'ON FIRE! x' + multiplier.toFixed(1);
    else if (combo >= 4) comboFlashText = 'COMBO x' + multiplier.toFixed(1);
    else comboFlashText = '+' + multiplier.toFixed(1) + 'x';
  }

  return { init, draw, flashCombo };
})();

// --- ScoreboardClient IIFE ---
const ScoreboardClient = (() => {
  let playerName = localStorage.getItem('bored-player-name') || '';

  function ensurePlayerName() {
    if (playerName) return Promise.resolve(playerName);
    return new Promise((resolve) => {
      const modal = document.getElementById('name-modal');
      const input = document.getElementById('name-input');
      const btn = document.getElementById('name-submit');
      if (!modal || !input || !btn) { playerName = 'Anon'; resolve(playerName); return; }
      modal.classList.add('show');
      input.value = '';
      input.focus();
      function submit() {
        const name = (input.value || 'Anon').trim().slice(0, 20);
        playerName = name || 'Anon';
        localStorage.setItem('bored-player-name', playerName);
        modal.classList.remove('show');
        btn.removeEventListener('click', submit);
        input.removeEventListener('keydown', onKey);
        resolve(playerName);
      }
      function onKey(e) { if (e.key === 'Enter') submit(); }
      btn.addEventListener('click', submit);
      input.addEventListener('keydown', onKey);
    });
  }

  async function submitScore(gameId, gameName, description, finalScore) {
    try {
      const name = await ensurePlayerName();
      const res = await fetch(`${LEADERBOARD_URL}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId, gameName, theme: description,
          playerName: name, score: Math.floor(finalScore),
        }),
      });
      if (res.ok) return await res.json();
      return null;
    } catch(e) { return null; }
  }

  async function getLeaderboard(gameId, limit) {
    try {
      const res = await fetch(`${LEADERBOARD_URL}/api/scores?gameId=${gameId}&limit=${limit || 10}`);
      if (res.ok) return await res.json();
      return [];
    } catch(e) { return []; }
  }

  return { ensurePlayerName, submitScore, getLeaderboard };
})();

// --- ScoreboardUI IIFE ---
const ScoreboardUI = (() => {
  let theme = null;

  function init(themeConfig) { theme = themeConfig; }

  async function showGameOver(score, highScore, gameId) {
    const screen = document.getElementById('gameover-screen');
    const scoreEl = document.getElementById('gameover-score');
    const hsEl = document.getElementById('gameover-highscore');
    const newRecordEl = document.getElementById('gameover-newrecord');
    const listEl = document.getElementById('leaderboard-list');
    const loadingEl = document.getElementById('leaderboard-loading');
    if (!screen) return;

    screen.classList.remove('hidden');

    // Animate score count-up
    if (scoreEl) {
      let current = 0;
      const target = Math.floor(score);
      const step = Math.max(1, Math.floor(target / 40));
      const countUp = () => {
        current = Math.min(current + step, target);
        scoreEl.textContent = current.toLocaleString();
        if (current < target) requestAnimationFrame(countUp);
      };
      countUp();
    }

    if (hsEl) hsEl.textContent = 'Best: ' + Math.floor(highScore).toLocaleString();
    if (newRecordEl) newRecordEl.style.display = score >= highScore && score > 0 ? 'block' : 'none';

    // Fetch leaderboard
    if (listEl) listEl.innerHTML = '';
    if (loadingEl) loadingEl.style.display = 'block';
    try {
      const entries = await ScoreboardClient.getLeaderboard(gameId, 10);
      renderLeaderboard(entries);
    } catch(e) {
      if (loadingEl) loadingEl.textContent = 'Could not load leaderboard';
    }
  }

  function renderLeaderboard(entries) {
    const listEl = document.getElementById('leaderboard-list');
    const loadingEl = document.getElementById('leaderboard-loading');
    if (loadingEl) loadingEl.style.display = 'none';
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!entries || entries.length === 0) {
      const li = document.createElement('li');
      li.style.textAlign = 'center';
      li.style.opacity = '0.5';
      li.textContent = 'No scores yet — be the first!';
      listEl.appendChild(li);
      return;
    }

    const list = Array.isArray(entries) ? entries : (entries.scores || []);
    list.forEach((entry, i) => {
      const li = document.createElement('li');
      li.style.animationDelay = (i * 60) + 'ms';
      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.textContent = '#' + (i + 1);
      const name = document.createElement('span');
      name.className = 'lb-name';
      name.textContent = entry.playerName || entry.player_name || 'Anon';
      const sc = document.createElement('span');
      sc.className = 'lb-score';
      sc.textContent = (entry.score || 0).toLocaleString();
      li.appendChild(rank);
      li.appendChild(name);
      li.appendChild(sc);
      listEl.appendChild(li);
    });
  }

  return { init, showGameOver, renderLeaderboard };
})();

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
    ctx = canvas.getContext('2d');
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
    ScoreboardClient.submitScore(THEME.gameId, THEME.name, THEME.description, score).then(() => {
      ScoreboardUI.showGameOver(score, highScore, THEME.gameId);
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
      }
    }

    // Trail particles
    if (Math.floor(gameTime * 20) !== Math.floor((gameTime - dt) * 20)) {
      const tcfg = THEME.particles.trail;
      ParticleEngine.trail(player.x, player.y + pw.height * 0.5, tcfg.colors, tcfg.size, effectiveSpeed * 50);
    }

    // Spawn obstacles
    const now = performance.now();
    if (now - lastSpawnTime >= spawnInterval) {
      lastSpawnTime = now;
      spawnObstacle();
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
        try { bg.draw(ctx, offset * bg.speed, CW, CH); } catch(e) {}
        ctx.restore();
      }
    }

    // Ground
    const groundY = THEME.player.groundY + THEME.player.height;
    ctx.save();
    try { THEME.drawGround(ctx, distance, groundY, CW, CH - groundY); } catch(e) {}
    ctx.restore();

    // Obstacles
    for (const obs of obstacles) {
      if (!obs.active) continue;
      ctx.save();
      try { obs.drawFn(ctx, obs.x, obs.y, obs.frame); } catch(e) {}
      ctx.restore();
    }

    // Powerups
    for (const pu of powerups) {
      if (!pu.active) continue;
      ctx.save();
      try { pu.drawFn(ctx, pu.x, pu.y, pu.frame); } catch(e) {}
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
      try { pw.draw(ctx, player.x, py, Math.floor(gameTime * 60), player.state); } catch(e) {}
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

</script>
</body>
</html>
```

## Key Engine Features Summary

1. **HTML/CSS UI shell** — DOM-based menu, game-over, and name-input screens with backdrop-filter blur and CSS transitions
2. **Fixed 800x400 canvas** with CSS scaling — predictable coordinates for drawing
3. **Modular IIFEs** — AudioEngine, ParticleEngine, InputHandler, HUD, ScoreboardClient, ScoreboardUI, SpeedLines, FloatingText, RunnerEngine — all in one file
4. **Fixed-timestep physics** at 120Hz with variable rendering — consistent behavior regardless of frame rate
5. **State machine**: menu → playing → dying → gameover with proper transitions
6. **Variable-height jumps**: hold for float, release for fast fall, double jump
7. **Ducking mechanic**: Down/S key + swipe-down on mobile — duck under air obstacles
8. **Power-up system**: Collectible items with effects (shield, invincible, 2x-score, slow-mo, magnet) — themed draws, timed durations
9. **Combo system**: Consecutive pickups increase multiplier (1x → 5x max) with flash text escalation
10. **Weighted obstacle spawning**: Each obstacle has a `weight` field — no score-threshold unlocking
11. **Object-pooled particles**: 300 pre-allocated, zero GC during gameplay — dust, ring, death, sparkle, confetti, trail
12. **Procedural audio**: Web Audio API with configurable frequencies + full custom sound overrides
13. **Beat-scheduled music**: Lookahead pattern at 25ms intervals for gapless playback, or simple default beat
14. **Modular HUD**: Zero-padded score, high score, combo multiplier, active effect timers with progress bars, elapsed time
15. **Game juice**: screen shake, squash/stretch, hit freeze, speed lines, near-miss detection, floating text
16. **Leaderboard integration**: HTML name-input modal (ask once, persists in localStorage), fetches/renders leaderboard on game over via Next.js API proxy
17. **Full input support**: keyboard (Space/Up/W = jump, Down/S = duck), touch (tap = jump, swipe down = duck), mouse
18. **Mobile-ready**: CSS scaling, touch-action none, user-scalable no
