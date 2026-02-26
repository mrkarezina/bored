# Theming Guide

When generating a game, you fill in **only** the `THEME` object in the engine template. This document describes every field you must customize.

## THEME Object Reference

### Identity

```js
name: 'string'          // Game title, shown on menu screen (e.g., "Neon Drift")
description: 'string'   // One-line description shown below title (e.g., "Surf the synthwave grid!")
gameId: 'uuid-v4'       // Generate a unique UUID v4 for every game — this is the leaderboard key
```

### Colors

```js
colors: {
  bg: '#hex',            // Page background & canvas clear color (dark preferred)
  text: '#FFFFFF',       // UI text color
  accent: '#hex',        // Accent for highlights, particles, UI elements
  score: '#hex',         // Score number color (bright, readable)
  ground: '#hex',        // Ground fill color
  groundLine: '#hex',    // Ground detail/line color
}
```

Choose colors that match your theme! A space game might have deep purples with cyan accents. A kitchen game might have warm oranges and reds. Keep `bg` dark for best contrast.

### Player

```js
player: {
  width: 32,          // Player hitbox width (px)
  height: 48,         // Player hitbox height when standing (px)
  duckHeight: 24,     // Player hitbox height when ducking (px) — should be roughly half of height
  groundY: 300,       // Y position of player's top edge when standing on ground
  jumpForce: -14,     // Initial vertical velocity on jump (negative = up). Range: -10 to -18
  gravity: 0.8,       // Gravity acceleration per physics frame. Range: 0.5 to 1.2

  // Draw the player character
  // ctx: CanvasRenderingContext2D
  // x, y: top-left position of the player bounding box
  // frame: frame counter (integer, use for animation cycles)
  // state: 'run' | 'jump' | 'duck' | 'hit'
  draw(ctx, x, y, frame, state) {
    // Draw within x, y, this.width, this.height bounds
    // Use state to change pose:
    //   'run' — normal running animation (use frame for leg movement)
    //   'jump' — airborne pose (arms up, legs tucked, etc.)
    //   'duck' — crouching pose (shorter hitbox, drawn from y)
    //   'hit' — death pose (brief, before explosion)
    // Use Math.sin(frame * speed) for idle animation (bobbing, blinking)
  },
}
```

**Guidelines:**
- Draw within the `x, y, width, height` bounds (or `duckHeight` when `state === 'duck'`)
- Add idle animation using `Math.sin(frame * speed)` for bobbing, blinking, wiggling
- Show different poses per state — at minimum differentiate `run`, `jump`, and `duck`
- The engine handles squash/stretch transforms — just draw the character normally
- Keep it simple but charming — 10-20 drawing calls is plenty
- Canvas is fixed at 800×400, so coordinates are predictable

**Example:**
```js
draw(ctx, x, y, frame, state) {
  // Body
  ctx.fillStyle = '#4a90d9';
  if (state === 'duck') {
    ctx.fillRect(x + 4, y + 4, 24, 16); // wide and flat
  } else {
    ctx.fillRect(x + 6, y + 14, 20, 28);
  }
  // Head with bob
  const bob = state === 'run' ? Math.sin(frame * 0.15) * 2 : 0;
  ctx.beginPath();
  ctx.arc(x + 16, y + 10 + bob, 10, 0, Math.PI * 2);
  ctx.fill();
  // Eyes (blink every ~60 frames)
  if (frame % 60 > 5) {
    ctx.fillStyle = '#FFF';
    ctx.fillRect(x + 12, y + 7 + bob, 3, 3);
    ctx.fillRect(x + 19, y + 7 + bob, 3, 3);
  }
  // Jump pose — arms up
  if (state === 'jump') {
    ctx.fillStyle = '#4a90d9';
    ctx.fillRect(x + 2, y + 10, 4, 12);
    ctx.fillRect(x + 26, y + 10, 4, 12);
  }
}
```

### obstacles[]

Array of obstacle types. Include at least 3 ground obstacles and 1-2 air obstacles:

```js
{
  name: 'string',         // Descriptive name
  type: 'ground',         // 'ground' = jump over, 'air' = duck under
  width: number,          // Width in pixels (20-60 typical)
  height: number,         // Height in pixels (20-80 typical)
  weight: number,         // Spawn probability weight (1-10). Higher = more common
  draw(ctx, x, y, frame) {
    // Draw obstacle at x, y with this.width, this.height dimensions
    // Use frame for animation (rotating, bobbing, glowing, etc.)
  }
}
```

**Ground obstacles** sit on the ground — player must jump over them.
**Air obstacles** float at head height — player must duck under them.

**Weight guidelines:**
- Common obstacles: weight 3-5
- Uncommon obstacles: weight 1-2
- Air obstacles: weight 1-3 (less frequent than ground)

**Guidelines:**
- **Use angular, pointed shapes** — spikes, jagged edges, sharp corners (see Visual Clarity Rules)
- **Use warm colors** (reds, oranges) so obstacles pop against cool backgrounds
- **Include a 2px dark outline** — fill the shape first, then stroke with a darker color
- Make each type visually distinct and thematically appropriate
- Vary sizes — some short and wide, some tall and narrow
- Add subtle animation using `frame` (wobble, glow, bounce) — never `Math.random()`
- Minimum size: 20×20 pixels
- Ground obstacle heights should range from 20-80px
- Air obstacle heights should be 20-40px

### powerups[]

Array of collectible power-up types. Include 2-3:

```js
{
  name: 'string',         // Display name
  width: number,          // Hitbox width (16-24 typical)
  height: number,         // Hitbox height (16-24 typical)
  points: number,         // Bonus points on collection (50-200)
  effect: 'string',       // Effect type (see below)
  duration: number,       // Effect duration in ms (0 for instant, 3000-8000 for timed)
  spawnChance: number,    // Probability per frame (0.001-0.005 typical)
  draw(ctx, x, y, frame) {
    // Draw the collectible item
    // Add glow/bob animation using frame
  }
}
```

**Available effects:**
- `'shield'` — absorbs one hit, then disappears. Duration: 0 (lasts until hit)
- `'invincible'` — immune to all obstacles for duration
- `'2x-score'` — double score accumulation for duration
- `'slow-mo'` — slows game speed by 50% for duration
- `'magnet'` — attracts nearby power-ups for duration

**Guidelines:**
- **Use rounded shapes** — circles, ovals, orbs, pills (see Visual Clarity Rules)
- **Use cool or bright colors** (blues, greens, golds) to contrast with warm obstacles
- **Include a 2px outline** for readability against any background
- Make power-ups visually distinct from obstacles (bright, glowing, animated)
- Use `Math.sin(frame * 0.1)` for floating/pulsing animation — never `Math.random()`
- Minimum size: 16×16 pixels
- spawnChance of 0.003 means roughly one every ~5-6 seconds
- Shield: duration 0, invincible: 5000-8000, 2x-score: 5000-8000, slow-mo: 3000-5000, magnet: 5000-8000

### backgrounds[]

Array of parallax background layers, drawn far-to-near:

```js
{
  speed: number,  // 0 to 1 — 0 = static, 1 = same speed as obstacles
  draw(ctx, scrollX, canvasWidth, canvasHeight) {
    // scrollX: horizontal scroll offset (already multiplied by speed)
    // canvasWidth: always 800
    // canvasHeight: always 400
    // Use modular arithmetic for seamless tiling
  }
}
```

**Layer guidelines:**
- Layer 1 (far): speed 0.1-0.2 — distant scenery (mountains, clouds, stars, sky details)
- Layer 2 (mid): speed 0.3-0.5 — mid-ground elements (buildings, trees, hills)
- Layer 3 (near): speed 0.6-1.0 — close details (bushes, fences, ground decorations)

**Scrolling pattern for seamless tiling:**
```js
draw(ctx, scrollX, w, h) {
  const spacing = 200;
  const offset = -(scrollX % spacing);
  for (let x = offset - spacing; x < w + spacing; x += spacing) {
    // Draw repeating element at x
  }
}
```

### drawGround(ctx, scrollX, groundY, w, h)

Draw the scrolling ground surface.

**Parameters:**
- `ctx` — CanvasRenderingContext2D
- `scrollX` — total horizontal scroll (use modulo for tiling)
- `groundY` — pixel y where ground starts (below player)
- `w` — canvas width (800)
- `h` — height of ground area (canvas bottom - groundY)

**Example:**
```js
drawGround(ctx, scrollX, groundY, w, h) {
  ctx.fillStyle = this.colors.ground;
  ctx.fillRect(0, groundY, w, h);
  ctx.strokeStyle = this.colors.groundLine;
  ctx.lineWidth = 1;
  const spacing = 30;
  const offset = -(scrollX % spacing);
  for (let x = offset; x < w + spacing; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.lineTo(x - 10, groundY + h);
    ctx.stroke();
  }
}
```

### particles

Configure colors and sizes for each particle type:

```js
particles: {
  dust:     { colors: ['#hex', '#hex'], size: 4 },       // Jump/land dust
  jump:     { colors: ['#hex'], size: 3 },                 // Double jump ring
  death:    { colors: ['#hex','#hex','#hex'], size: 6 },  // Death explosion
  collect:  { colors: ['#hex','#hex'], size: 4 },          // Power-up collect sparkle
  trail:    { colors: ['#hex'], size: 3 },                 // Running trail
  confetti: { colors: ['#hex','#hex','#hex','#hex'], size: 5 }, // Score milestone
}
```

Match these to your theme! A fire theme uses reds/oranges, a space theme uses blues/whites, a candy theme uses pinks/yellows.

### scoring

```js
scoring: {
  distancePointsPerFrame: 1,     // Base score per frame (~60 per second at start)
  milestoneInterval: 500,         // Score interval for celebration effects (500 = every 500 points)
  comboDecayMs: 3000,             // Ms after last power-up collect before combo resets
  comboMultiplierMax: 5,          // Maximum combo multiplier
}
```

### difficulty

```js
difficulty: {
  startSpeed: 4,                 // Initial scroll speed (px/frame). Range: 3-6
  maxSpeed: 12,                  // Maximum scroll speed. Range: 10-16
  speedRampPerSecond: 0.05,      // Speed increase per second. Range: 0.03-0.08
  startSpawnInterval: 1500,      // Initial obstacle spawn interval (ms). Range: 1200-2000
  minSpawnInterval: 600,         // Minimum spawn interval (ms). Range: 400-800
  spawnRampPerSecond: -8,        // Spawn interval change per second (negative = faster)
}
```

### sounds

Configure the AudioEngine. You can either tune the default sounds with frequency configs, or provide full custom sound functions:

```js
sounds: {
  // Simple config (tunes default sounds)
  jumpFreqs: [200, 500],          // [startHz, endHz] for jump sweep
  collectFreqs: [523, 659, 784],  // Arpeggio notes for collect sound
  hitFreq: 80,                    // Death hit base frequency
  bgBPM: 120,                    // Background beat BPM

  // Full custom overrides (optional — each receives audioCtx, masterGain)
  // jump(ac, g) {},
  // doubleJump(ac, g) {},
  // land(ac, g) {},
  // die(ac, g) {},
  // collect(ac, g) {},
  // score100(ac, g) {},
  // score1000(ac, g) {},
  // nearMiss(ac, g) {},
  // milestone(ac, g) {},

  // Custom background music (optional — receives audioCtx, masterGain, beatNumber, scheduledTime)
  // playBeat(ac, g, beatNum, time) {},
}
```

See `audio-cookbook.md` for ready-to-use sound recipes.

**Every sound function MUST create and start at least one oscillator or noise source.** Even minimal sounds drastically improve game feel.

## Visual Clarity Rules

These rules prevent the most common visual problems: flickering, unreadable objects, and obstacles that blend into backgrounds. The engine enforces some of these automatically, but draw functions must follow the rest.

### Shape Language

Humans read geometric forms instinctively. Use this to make gameplay elements instantly recognizable:

- **Obstacles: angular, pointed shapes** — triangles, spikes, jagged edges, sharp corners. Danger reads as sharp.
- **Power-ups: rounded shapes** — circles, ovals, pills, orbs. Safe/friendly reads as smooth.
- **Background: rectangular, soft shapes** — blocks, gentle curves, horizontal lines. Neutral reads as structural.

This is the single highest-impact visual clarity improvement. A player should know "that will kill me" from silhouette alone.

### Color Temperature

- **Obstacles: warm colors** (reds, oranges, yellows) — warm advances, reads as threat
- **Power-ups: cool or bright colors** (blues, greens, golds) — cool/bright reads as reward
- **Backgrounds: cool, desaturated colors** (muted blues, purples, grays) — recedes visually
- **Ground: neutral, medium saturation** — anchors the scene without competing

### Outlines

Every obstacle and power-up draw function MUST include a dark outline for silhouette readability:

```js
// Pattern: fill first, then outline
ctx.fillStyle = '#ff4444';
ctx.beginPath();
// ... shape path ...
ctx.fill();
ctx.strokeStyle = '#880000';  // darker version of fill color
ctx.lineWidth = 2;
ctx.stroke();
```

### Minimum Sizes

- Obstacles: minimum 20×20 pixels. Anything smaller is invisible at speed.
- Power-ups: minimum 16×16 pixels.
- No more than 5-6 path operations for objects smaller than 40px — detail is wasted.

### Banned APIs in draw() Functions

These cause flickering, performance problems, or non-deterministic rendering:

| Banned | Why | Use Instead |
|--------|-----|-------------|
| `shadowBlur` | Expensive Gaussian blur every frame | Draw a larger semi-transparent shape behind |
| `Math.random()` | Different output each frame = flicker | Use `frame` parameter for animation |
| `createLinearGradient()` | Allocates new objects 60x/sec | Use solid fills, or create gradient once outside draw |
| `getImageData()` | Forces GPU→CPU transfer | Never use in game loop |
| `globalCompositeOperation` | Flushes canvas state on each change | Stick to default `source-over` |

### Drawing Best Practices

- **Fill first, outline second.** Solid fill makes the shape readable; outline guarantees contrast.
- **Max 6 colors per element.** More creates visual noise.
- **Use `frame` for animation, not randomness.** `Math.sin(frame * 0.1)` is deterministic and smooth.
- **Bilateral symmetry.** Symmetric sprites look more intentional and read faster.
- **Silhouette test:** If your object isn't recognizable as a solid black shape on white, it won't read during gameplay.
- **The engine wraps every draw() in save()/restore()** — do NOT call save/restore yourself inside draw functions.

### Theme Style Tiers

**Tier 1 — Nearly impossible to mess up:**
- Silhouette/shadow themes (dark solid shapes on gradient sky)
- Neon/wireframe (bright strokes on black)
- Monochrome + one accent color

**Tier 2 — Reliable with these constraints:**
- Flat color with outlines (solid fills, dark outlines, no shading)
- Geometric/abstract (circles, triangles, hexagons)
- Retro pixel-art (blocky fillRect-based art)

**Tier 3 — Avoid:**
- Realistic environments (trees with leaves, buildings with windows)
- Characters with consistent anatomy (humans, animals with limbs)
- Themes requiring complex lighting or perspective

## Theme Creativity Rules

1. **NO tech/developer themes** — no coding, no terminals, no keyboards
2. **Be creative and fun** — "Cosmic Surfer", "Kitchen Chaos", "Rooftop Run", "Neon Drift" — unexpected but grounded
3. **Visual personality** — the character and obstacles should be charming and memorable
4. **Thematic coherence** — obstacles, background, character, and power-ups should all fit the theme
5. **Cultural richness** — draw from food, nature, history, mythology, sports, daily life, dreams, pop culture
6. **Every element tells the story** — parallax layers set the scene, obstacles are the conflict, power-ups are the reward, the character is the hero

## Quality Checklist

Before finishing a game, verify:

**Visual clarity:**
- [ ] Obstacles use angular/pointed shapes with warm colors
- [ ] Power-ups use rounded shapes with cool/bright colors
- [ ] All obstacles and power-ups have a 2px dark outline
- [ ] No `shadowBlur`, `Math.random()`, `createLinearGradient()`, or `getImageData()` inside any draw() function
- [ ] All objects pass the silhouette test (recognizable as solid black on white)
- [ ] Minimum sizes: obstacles 20×20, power-ups 16×16

**Content:**
- [ ] 3+ parallax layers with smooth scrolling (use modulo for tiling!)
- [ ] 3+ ground obstacles + 1-2 air obstacles, weighted for variety
- [ ] 2-3 power-ups with different effects and themed visuals
- [ ] Character has idle animation and reacts to run/jump/duck/hit states

**Audio:**
- [ ] All sounds are defined (either via config or custom functions)
- [ ] Background music plays during gameplay

**Polish:**
- [ ] Particle colors match the theme
- [ ] Ground has scrolling detail/texture
- [ ] Colors create a cohesive, attractive palette (warm obstacles, cool backgrounds)
- [ ] Game title and description are fun and descriptive
- [ ] Unique UUID v4 gameId is set
- [ ] Difficulty ramp feels fair (not too fast, not too slow)
