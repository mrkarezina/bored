# THEME API

The mechanical contract between a theme and the engine. For creative direction — what to
build and why — see [design-guide.md](design-guide.md).

A theme file declares exactly one top-level binding:

```js
const THEME = { /* ... */ };
```

`scripts/build.js` evaluates that file, so it must be plain JavaScript with no imports and no
browser globals at the top level. Drawing code runs inside a canvas context at runtime, which is
the only place `ctx` exists.

## Structure

```js
const THEME = {
  name: 'Game Title',
  description: 'One-line hook',       // menu subtitle
  gameId: 'GENERATED',                // build.js replaces this with a real UUID

  colors: {
    bg,          // page + canvas background (dark reads best)
    text,        // UI text
    accent,      // UI accent, particles, highlights
    score,       // score number (bright, high contrast)
    ground,      // ground fill
    groundLine,  // ground detail line
  },

  player: {
    width: 32, height: 48,   // standing hitbox
    duckHeight: 24,          // ducking hitbox, must be < height
    groundY: 300,            // Y of the hitbox top when standing on the ground
    jumpForce: -14,          // launch velocity, negative is up (range -10 to -18)
    gravity: 0.8,            // per-frame gravity (range 0.5 to 1.2)
    draw(ctx, x, y, frame, state) {
      // state: 'run' | 'jump' | 'duck' | 'hit'
      // Draw inside the x, y, width, height box.
    },
  },

  obstacles: [
    { name, type: 'ground' | 'air', width, height, weight, draw(ctx, x, y, frame) {} },
  ],

  powerups: [
    {
      name, width: 20, height: 20, points: 100,
      effect: 'shield' | 'invincible' | '2x-score' | 'slow-mo' | 'magnet',
      duration: 5000,        // ms; ignored for 'shield', which lasts until it absorbs a hit
      spawnChance: 0.003,    // per-frame roll, 0.001-0.005
      draw(ctx, x, y, frame) {},
    },
  ],

  backgrounds: [
    { speed: 0.15, draw(ctx, scrollX, canvasWidth, canvasHeight) {} },
  ],

  drawGround(ctx, scrollX, groundY, w, h) {
    // groundY here is the top of the ground area, i.e. player.groundY + player.height
  },

  particles: {
    dust:     { colors: ['#hex', '#hex'], size: 4 },
    jump:     { colors: ['#hex'], size: 3 },
    death:    { colors: ['#hex', '#hex', '#hex'], size: 6 },
    collect:  { colors: ['#hex', '#hex'], size: 4 },
    trail:    { colors: ['#hex'], size: 3 },
    confetti: { colors: ['#hex', '#hex', '#hex', '#hex'], size: 5 },
  },

  scoring: {
    distancePointsPerFrame: 1,
    milestoneInterval: 500,
    comboDecayMs: 3000,
    comboMultiplierMax: 5,
  },

  difficulty: {
    startSpeed: 4,             // 3-6
    maxSpeed: 12,              // 10-16
    speedRampPerSecond: 0.05,  // 0.03-0.08
    startSpawnInterval: 1500,  // ms, 1200-2000
    minSpawnInterval: 600,     // ms, 400-800
    spawnRampPerSecond: -8,
  },

  sounds: {
    jumpFreqs: [200, 500],           // [startHz, endHz]; ascending = cheerful
    collectFreqs: [523, 659, 784],   // arpeggio
    hitFreq: 80,                     // 60-120, a thud
    bgBPM: 120,                      // 100-140
  },
};
```

## Obstacle placement

The engine positions obstacles for you — a theme only supplies dimensions.

- **Ground** obstacles sit on the ground line: `y = player.groundY + player.height - height`.
  The player must jump them.
- **Air** obstacles are centred in the clearance band between the standing and ducking hitbox
  tops. The player must duck under them.

Collision is AABB with 4px of padding per side, in the player's favour. That makes the duckable
window:

```
air obstacle height <= (player.height - player.duckHeight) + 16
```

Exceed it and a ducking player still gets hit, which reads as a broken game.
`scripts/validate.js` checks this.

## Drawing rules

Canvas primitives only — `fillRect`, `strokeRect`, `beginPath`/`arc`/`fill`/`stroke`,
`moveTo`/`lineTo`/`closePath`. No `Image()`, no `fetch()`, no external URLs. Games must stay
self-contained in one file.

Never call these inside a `draw()`:

| Banned | Why |
|---|---|
| `Math.random()` | Re-randomising geometry every frame makes sprites strobe. Derive variation from `frame` or from a value fixed at spawn. |
| `shadowBlur` | Re-rasterises every frame and flickers at speed. |
| `createLinearGradient` / `createRadialGradient` | Per-frame allocation churn. Build gradients once outside `draw()`. |
| `getImageData` | Forces a pipeline stall every frame. |

The engine wraps every `draw()` in `save()`/`restore()`, so you do not need them. If you do call
them for a `translate`/`rotate`, they must balance — an unbalanced pair leaks canvas state into
the rest of the frame.

Animate from the `frame` parameter: `Math.sin(frame * 0.15)` to bob, `frame % 60` to blink.

## Sprite example

```js
draw(ctx, x, y, frame, state) {
  // Body
  ctx.fillStyle = '#4a90d9';
  ctx.fillRect(x + 8, y + 12, 16, 20);

  // Head
  ctx.fillStyle = '#ffd93d';
  ctx.fillRect(x + 6, y, 20, 14);

  // Eyes — blink every 60 frames
  if (frame % 60 > 5) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 10, y + 5, 3, 3);
    ctx.fillRect(x + 19, y + 5, 3, 3);
  }

  // Legs
  ctx.fillStyle = '#3a7bc8';
  if (state === 'run') {
    const legOffset = Math.sin(frame * 0.3) * 4;
    ctx.fillRect(x + 10, y + 32, 5, 12 + legOffset);
    ctx.fillRect(x + 17, y + 32, 5, 12 - legOffset);
  } else if (state === 'jump') {
    ctx.fillRect(x + 8, y + 32, 6, 8);
    ctx.fillRect(x + 18, y + 32, 6, 8);
  }
}
```

## Parallax tiling

Offset by the modulo of the spacing so the seam never shows:

```js
draw(ctx, scrollX, w, h) {
  const spacing = 200;
  const offset = -(scrollX % spacing);
  for (let x = offset - spacing; x < w + spacing; x += spacing) {
    // draw the repeating element at x
  }
}
```

Any other offset formula tears at the wrap point.

[example-theme.js](example-theme.js) is a complete theme that satisfies every rule above.
