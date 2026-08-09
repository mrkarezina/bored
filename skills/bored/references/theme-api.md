# THEME API

The mechanical contract between a theme and the engine — the parts that are not blocks. For the
block vocabulary see [blocks.md](blocks.md); for why any of it is shaped this way, see
[fundamentals.md](fundamentals.md).

A theme file declares exactly one top-level binding:

```js
const THEME = { /* ... */ };
```

`scripts/build.js` evaluates that file with the block library already in scope, so it must be plain
JavaScript with no imports and no browser globals at the top level. A theme is **not inert data** —
`Pattern.cluster(...)` and `Palette.dusk(...)` run as the object is built. `ctx` exists only inside a
`draw()`, at runtime.

## Structure

```js
const PALETTE = Palette.dusk('#2b1b3d', { accent: '#ff9f43', obstacles: 4 });

const THEME = {
  name: 'Game Title',
  description: 'One-line hook',       // menu subtitle
  gameId: 'GENERATED',                // build.js replaces this with a real UUID

  colors: PALETTE,                    // needs bg, text, accent, score, ground, groundLine

  player: {
    width: 34, height: 44,   // standing hitbox
    duckHeight: 24,          // ducking hitbox, must be < height
    groundY: 296,            // Y of the hitbox top when standing on the ground
    jumpForce: -12.5,        // launch velocity, negative is up (-10 to -16)
    gravity: 0.65,           // per-frame gravity (0.45 to 1.05)
    draw(ctx, x, y, frame, state) {
      // state: 'run' | 'jump' | 'duck' | 'hit'
    },
  },

  obstacles: [
    {
      name: 'AC unit',              // patterns refer to obstacles by name
      type: 'ground' | 'air',
      width: 40, height: 38,        // this IS the hitbox — draw inside it
      motion: [Motion.bob(6, 900)], // optional
      draw(ctx, x, y, frame) {},
    },
  ],

  rhythm: Rhythm.playlist([ /* see blocks.md */ ]),

  powerups: [
    {
      name: 'catnip', width: 22, height: 22, points: 100,
      effect: 'shield' | 'invincible' | '2x-score' | 'slow-mo' | 'magnet',
      duration: 5000,               // ms; ignored for 'shield', which lasts until it absorbs a hit
      frequency: 'rare' | 'common',
      draw(ctx, x, y, frame) {},
    },
  ],

  backgrounds: [
    { speed: 0.18, draw(ctx, scrollX, canvasWidth, canvasHeight) {} },
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
    startSpeed: 4,             // px per frame, 3-6
    maxSpeed: 11,              // 9-14
    speedRampPerSecond: 0.05,  // 0.03-0.08
  },

  sounds: Sound.chiptune(),
};
```

There are no spawn intervals, obstacle weights, or per-frame power-up probabilities. How often
something appears is set by its patterns' weights in `THEME.rhythm`; where it appears is the
scheduler's job.

## Obstacle placement

The engine positions obstacles — a theme only supplies dimensions and a lane.

- **Ground** obstacles sit on the ground line. The player jumps them. Must be under ~90% of the jump
  apex or nothing clears them; the engine refuses to start otherwise.
- **Air** obstacles are centred in the clearance band between the standing and ducking hitbox tops.
  The player ducks under them.

Collision is AABB with 4px of padding per side, in the player's favour, which makes the duckable
window:

```
air obstacle height + 2 x (motion dy bound)  <=  (player.height - player.duckHeight) + 16
```

Motion counts against that budget — `bob(8)` on a bird that only just fits makes it stop fitting. The
engine checks this at boot and `validate.js` checks it at build time, both with the motion included.

## Drawing rules

Canvas primitives only — `fillRect`, `strokeRect`, `beginPath`/`arc`/`fill`/`stroke`,
`moveTo`/`lineTo`/`closePath`, `ellipse`, `quadraticCurveTo`. No `Image()`, no `fetch()`, no external
URLs: games must stay self-contained in one file.

Never call these inside a `draw()`:

| Banned | Why |
|---|---|
| `Math.random()` | re-randomising geometry every frame makes sprites strobe — derive variation from `frame` |
| `shadowBlur` | re-rasterises every frame and flickers at speed |
| `createLinearGradient` / `createRadialGradient` | per-frame allocation churn |
| `getImageData` | forces a pipeline stall every frame |

The engine wraps every `draw()` in `save()`/`restore()`, so you do not need them. If you call them
for a `translate`/`rotate` they must balance, or canvas state leaks into the rest of the frame.

Animate from the `frame` parameter: `Math.sin(frame * 0.15)` to bob, `frame % 60` to blink.

**Draw inside the box you declared.** `width` and `height` are the hitbox; a sprite painted wider
than its box will feel unfair, and this is the one thing nothing checks for you.

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

[example-theme.js](example-theme.js) is a complete theme that satisfies everything above.
