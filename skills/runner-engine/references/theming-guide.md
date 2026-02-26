# Theming Guide

When generating a game, you fill in **only** the `THEME` object in the engine template. This document describes every field you must customize.

## THEME Object Reference

### Identity

```js
name: 'string'          // Game title, shown on menu screen (e.g., "Grandma's Great Escape")
description: 'string'   // One-line description shown below title (e.g., "Escape bingo night on a motorized wheelchair!")
gameId: 'uuid-v4'       // Generate a unique UUID v4 for every game — this is the leaderboard key
```

### Colors

```js
colors: {
  skyTop: '#hex',        // Top of sky gradient
  skyBottom: '#hex',     // Bottom of sky gradient (at ground level)
  ground: '#hex',        // Primary ground color
  groundDetail: '#hex',  // Secondary ground detail color (lines, texture)
  ui: '#FFFFFF',         // UI text color
  uiShadow: 'rgba()',   // Text shadow for readability
  score: '#FFD700',      // Score number color
  menuOverlay: 'rgba()', // Menu screen overlay
  deathFlash: 'rgba()',  // Flash color on death
  gameoverOverlay: 'rgba()', // Game over screen overlay
}
```

Choose colors that match your theme! A space game might have deep purples and star-white. A kitchen game might have warm oranges and reds.

### drawCharacter(ctx, player, time)

Draw the player character using Canvas 2D. The character should have idle animation based on `time`.

**Parameters:**
- `ctx` — CanvasRenderingContext2D
- `player` — `{ x, y, w, h, vy, grounded, jumps }` — position, dimensions, velocity, and state
- `time` — elapsed game time in seconds (use for animation cycles)

**Guidelines:**
- Draw within the `player.x, player.y, player.w, player.h` bounds
- Add idle animation (bobbing, blinking, wiggling) using `Math.sin(time * speed)`
- Show different poses based on `player.vy` (negative = jumping up, positive = falling)
- Use `player.grounded` to differentiate ground vs air poses
- Keep it simple but charming — 10-20 drawing calls is plenty
- The engine handles squash/stretch transforms — just draw the character normally

**Example structure:**
```js
drawCharacter(ctx, p, t) {
  // Body
  ctx.fillStyle = '#FF6B35';
  ctx.fillRect(p.x + 5, p.y + 15, p.w - 10, p.h - 20);
  // Head with bob
  const bob = Math.sin(t * 5) * 2;
  ctx.beginPath();
  ctx.arc(p.x + p.w/2, p.y + 12 + bob, 12, 0, Math.PI * 2);
  ctx.fill();
  // Eyes that blink
  const blink = Math.sin(t * 3) > 0.95 ? 0 : 3;
  ctx.fillStyle = '#FFF';
  ctx.fillRect(p.x + p.w/2 - 6, p.y + 9 + bob, 4, blink);
  ctx.fillRect(p.x + p.w/2 + 2, p.y + 9 + bob, 4, blink);
}
```

### obstacleTypes[]

Array of at least 3 obstacle types. Each type:

```js
{
  name: 'string',       // Descriptive name
  w: number,            // Width in pixels (20-80 typical)
  h: number,            // Height in pixels (30-120 typical)
  unlockScore: number,  // Score at which this type starts appearing (0 = always)
  draw(ctx, obs, time) {
    // Draw obstacle at obs.x, obs.y with obs.w, obs.h dimensions
    // Use time for animation (rotating, bobbing, etc.)
  }
}
```

**Unlock progression:**
- Type 1: `unlockScore: 0` — available from the start
- Type 2: `unlockScore: 500` — appears after score 500
- Type 3: `unlockScore: 1500` — appears after score 1500
- Type 4 (optional): `unlockScore: 3000` — late-game challenge

**Guidelines:**
- Make each type visually distinct and thematically appropriate
- Vary sizes — some short and wide, some tall and narrow
- Add subtle animation (wobble, glow, bounce)
- Heights should range from player-clearable (40-60) to tall barriers (80-120)

### parallaxLayers[]

Array of at least 3 background layers, drawn far-to-near:

```js
{
  speed: number,  // 0 to 1 — 0 = static, 1 = same speed as ground. Far layers ~0.1, near layers ~0.5
  y: number,      // 0 to 1 — normalized vertical position (0 = top, 1 = ground level)
  draw(ctx, scrollX, y, w, h, time) {
    // scrollX: horizontal scroll offset for this layer (already multiplied by speed)
    // y: pixel y-position for this layer
    // w: canvas width
    // h: ground Y position
    // time: game time for animation
  }
}
```

**Layer guidelines:**
- Layer 1 (far): speed 0.05-0.15, y 0.1-0.3 — distant scenery (mountains, clouds, stars)
- Layer 2 (mid): speed 0.2-0.35, y 0.3-0.6 — mid-ground elements (buildings, trees, hills)
- Layer 3 (near): speed 0.4-0.6, y 0.5-0.8 — close details (bushes, fences, decorations)

**Scrolling pattern:** Use modular arithmetic for seamless tiling:
```js
draw(ctx, scrollX, y, w, h, time) {
  const spacing = 200;
  const offset = -(scrollX % spacing);
  for (let x = offset - spacing; x < w + spacing; x += spacing) {
    // Draw repeating element at x, y
  }
}
```

### drawGround(ctx, scrollX, groundY, w, h)

Draw the scrolling ground surface.

**Parameters:**
- `ctx` — CanvasRenderingContext2D
- `scrollX` — total horizontal scroll (use modulo for tiling)
- `groundY` — pixel y where ground starts
- `w` — canvas width
- `h` — height of ground area (canvas bottom - groundY)

**Example:**
```js
drawGround(ctx, scrollX, groundY, w, h) {
  ctx.fillStyle = this.colors.ground;
  ctx.fillRect(0, groundY, w, h);
  // Scrolling detail lines
  ctx.strokeStyle = this.colors.groundDetail;
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
  ring:     { color: '#hex', maxRadius: 30 },             // Double jump ring
  death:    { colors: ['#hex','#hex','#hex'], size: 6 },  // Death explosion
  trail:    { colors: ['#hex'], size: 3 },                // Running trail
  confetti: { colors: ['#hex','#hex','#hex','#hex'], size: 5 }, // Score milestone
}
```

Match these to your theme! A fire theme uses reds/oranges for dust, a water theme uses blues/whites.

### sounds

Each sound is a function that receives `(audioCtx, masterGain)` and creates oscillators/noise. See `audio-cookbook.md` for ready-to-use recipes.

```js
sounds: {
  jump(ac, g) {},        // Short ascending chirp
  doubleJump(ac, g) {},  // Higher-pitched version of jump
  land(ac, g) {},        // Low thud
  die(ac, g) {},         // Descending death sound
  score100(ac, g) {},    // Quick positive blip
  score1000(ac, g) {},   // Triumphant arpeggio
  nearMiss(ac, g) {},    // Whoosh sound
  milestone(ac, g) {},   // Achievement jingle
}
```

**Every sound must be defined.** Even minimal sounds drastically improve game feel.

### Background Music

```js
bpm: number,  // Beats per minute (100-140 typical)

playBeat(ac, g, beatNum, time) {
  // Called once per beat at the scheduled audio time
  // beatNum: integer counting from 0
  // time: precise AudioContext time to schedule sounds
  // Use beatNum % N for patterns (kick on 0,4,8... hi-hat on every beat, etc.)
}
```

**Music guidelines:**
- Keep it simple: kick + hi-hat + bass is enough
- Use `beatNum % 4` for 4/4 patterns, `beatNum % 8` for 2-bar loops
- Schedule sounds at the `time` parameter, not `ac.currentTime`
- Keep volumes low — music should enhance, not overwhelm

## Theme Creativity Rules

1. **NO tech/developer themes** — no coding, no terminals, no keyboards
2. **Be absurd and specific** — not "animal runs" but "a raccoon on roller skates fleeing a garbage truck"
3. **Visual comedy** — the character and obstacles should make people laugh
4. **Thematic coherence** — obstacles, background, and character should all fit the theme
5. **Cultural richness** — draw from food, nature, history, mythology, sports, daily life, dreams
6. **Every element tells the story** — parallax layers set the scene, obstacles are the conflict, the character is the hero

## Quality Checklist

Before finishing a game, verify:
- [ ] 3+ parallax layers with smooth scrolling
- [ ] 3+ visually distinct obstacle types with staggered unlocks
- [ ] Character has idle animation and reacts to jump/fall state
- [ ] All 8 sound effects are defined (not empty functions)
- [ ] Background music plays during gameplay
- [ ] Particle colors match the theme
- [ ] Ground has scrolling detail/texture
- [ ] Colors create a cohesive palette
- [ ] Game title and description are fun and descriptive
- [ ] Unique UUID v4 gameId is set
