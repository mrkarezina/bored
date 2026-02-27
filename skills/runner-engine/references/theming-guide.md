# Theme Examples & Creative Direction

When generating a theme for /bored, pick something wildly creative, fun, and unexpected.
Every invocation should feel DIFFERENT. Here are examples to riff on:

## Example Themes

| Theme | Character | Ground Obstacles | Air Obstacles | Power-ups | Background |
|-------|-----------|-----------------|---------------|-----------|------------|
| **Cosmic Surfer** | Astronaut on a hoverboard | Asteroids, black holes | Satellites, space debris | Star shield, warp speed | Nebula parallax, planet silhouettes |
| **Kitchen Chaos** | Running sushi roll | Knife chops, fire bursts | Flying pans, steam clouds | Wasabi boost, soy sauce shield | Kitchen counter with ingredients |
| **Neon Drift** | Glowing geometric shape | Neon barriers, laser walls | Floating cubes, pulse rings | Bass drop (slow-mo), double beat | Synthwave cityscape, grid floor |
| **Ocean Escape** | Surfing penguin | Coral, icebergs, sharks | Seagulls, fishing nets | Tidal wave (invincible), fish frenzy | Deep ocean layers, sun rays |
| **Candy Rush** | Gummy bear | Jawbreakers, licorice walls | Floating lollipops | Sugar rush (2x speed), chocolate shield | Candy landscape, frosting ground |
| **Rooftop Run** | Parkour cat | AC units, chimneys, gaps | Clotheslines, birds | Catnip (magnet), nine lives (shield) | City rooftops at sunset |
| **Prehistoric Sprint** | Baby dinosaur | Boulders, lava pools | Pterodactyls, falling rocks | Volcano boost, egg shield | Jungle with volcanoes |
| **Retro Arcade** | Pixel knight | Barrels, spike pits | Floating ghosts, fireballs | Sword slash, magic potion | 8-bit castle landscape |
| **Haunted Library** | Flying book | Candles, spider webs | Bats, floating skulls | Invisibility ink, speed read | Dark bookshelves, candlelight |
| **Disco Fever** | Dancing roller skater | Disco balls, speakers | Laser beams, mirror balls | Funk shield, groove boost | Dance floor with lights |
| **Arctic Dash** | Snowboarding fox | Ice spikes, snow drifts | Snowballs, icicles | Hot cocoa shield, northern lights boost | Frozen tundra, aurora borealis |
| **Pixel Farm** | Runaway chicken | Hay bales, fences | Eagles, crop dusters | Corn rocket, egg shield | Rolling countryside |

## Theme Generation Rules

1. **Pick a fun, unexpected setting** — NOT developer/coding themed. Think memes, viral trends, absurd mashups.

2. **Design obstacles**:
   - 3-4 ground obstacles (type: "ground") — player must jump over these
   - 1-2 air obstacles (type: "air") — player must duck under these
   - Each needs: name, width, height, weight (spawn probability), draw()

3. **Design power-ups** using engine effect types:
   - `"shield"` — absorbs one hit, then disappears
   - `"invincible"` — immune to all obstacles for duration
   - `"2x-score"` — double score accumulation
   - `"slow-mo"` — slows game speed by 50%
   - `"magnet"` — attracts nearby power-ups
   - Include 2-3 power-ups with different effects

4. **Create a color palette** with these keys:
   - `bg` — background color (dark preferred)
   - `text` — UI text color
   - `accent` — UI accent, particles, highlights
   - `score` — score number color (bright, readable)
   - `ground` — ground fill color
   - `groundLine` — ground detail/line color

5. **Write ALL sprite draw() functions** using canvas primitives only:
   - `ctx.fillRect()`, `ctx.fillStyle`, `ctx.strokeRect()`
   - `ctx.beginPath()`, `ctx.arc()`, `ctx.fill()`, `ctx.stroke()`
   - `ctx.moveTo()`, `ctx.lineTo()`, `ctx.closePath()`
   - NO `Image()`, NO `fetch()`, NO external URLs
   - Use `frame` parameter for animation (e.g., `Math.sin(frame * 0.1)` for bobbing)

6. **Design 3 parallax background layers**:
   - Layer 1 (speed: 0.15-0.2): Far background — sky, distant scenery
   - Layer 2 (speed: 0.3-0.5): Mid ground — terrain features, buildings
   - Layer 3 (speed: 0.6-0.8): Near ground — close details, foreground elements

7. **Add personality**:
   - Give the theme a catchy name
   - Make the character design memorable and fun

8. **Sound tuning**:
   - `jumpFreqs`: [startHz, endHz] — ascending = cheerful, descending = heavy
   - `collectFreqs`: [note1, note2, note3] — arpeggio for collecting items
   - `hitFreq`: low Hz (60-120) — thud sound
   - `bgBPM`: beats per minute for background rhythm (100-140 typical)

## THEME Object Structure

```js
const THEME = {
  name: 'Game Title',
  description: 'One-line hook',
  gameId: 'uuid-v4',           // unique per game

  colors: { bg, text, accent, score, ground, groundLine },

  player: {
    width: 32, height: 48,    // hitbox size
    duckHeight: 24,            // hitbox when ducking (~half height)
    groundY: 300,              // Y position standing on ground
    jumpForce: -14,            // jump velocity (negative = up, range -10 to -18)
    gravity: 0.8,              // gravity per frame (range 0.5 to 1.2)
    draw(ctx, x, y, frame, state) {
      // state: 'run' | 'jump' | 'duck' | 'hit'
      // Draw within x, y, width, height bounds
      // Use frame for animation (Math.sin(frame * 0.15) for bobbing, frame % 60 for blinking)
    },
  },

  obstacles: [
    { name, type: 'ground'|'air', width, height, weight, draw(ctx, x, y, frame) {} },
    // 3-4 ground + 1-2 air, weight 1-5 (higher = more common)
  ],

  powerups: [
    { name, width: 20, height: 20, points: 100,
      effect: 'shield'|'invincible'|'2x-score'|'slow-mo'|'magnet',
      duration: 5000,  // ms (0 for shield)
      spawnChance: 0.003,
      draw(ctx, x, y, frame) {} },
  ],

  backgrounds: [
    { speed: 0.15, draw(ctx, scrollX, canvasWidth, canvasHeight) {} },
    // Use -(scrollX % spacing) for seamless tiling
  ],

  drawGround(ctx, scrollX, groundY, w, h) {
    // scrollX for tiling, groundY is top of ground area
  },

  particles: {
    dust:     { colors: ['#hex','#hex'], size: 4 },
    jump:     { colors: ['#hex'], size: 3 },
    death:    { colors: ['#hex','#hex','#hex'], size: 6 },
    collect:  { colors: ['#hex','#hex'], size: 4 },
    trail:    { colors: ['#hex'], size: 3 },
    confetti: { colors: ['#hex','#hex','#hex','#hex'], size: 5 },
  },

  scoring: {
    distancePointsPerFrame: 1,
    milestoneInterval: 500,
    comboDecayMs: 3000,
    comboMultiplierMax: 5,
  },

  difficulty: {
    startSpeed: 4,             // range 3-6
    maxSpeed: 12,              // range 10-16
    speedRampPerSecond: 0.05,  // range 0.03-0.08
    startSpawnInterval: 1500,  // ms, range 1200-2000
    minSpawnInterval: 600,     // ms, range 400-800
    spawnRampPerSecond: -8,
  },

  sounds: {
    jumpFreqs: [200, 500],
    collectFreqs: [523, 659, 784],
    hitFreq: 80,
    bgBPM: 120,
  },
};
```

## Canvas Drawing Tips for Sprites

```javascript
// Simple character example (pixel knight):
draw(ctx, x, y, frame, state) {
  // Body
  ctx.fillStyle = '#4a90d9';
  ctx.fillRect(x + 8, y + 12, 16, 20);

  // Head
  ctx.fillStyle = '#ffd93d';
  ctx.fillRect(x + 6, y, 20, 14);

  // Eyes (blink every 60 frames)
  if (frame % 60 > 5) {
    ctx.fillStyle = '#000';
    ctx.fillRect(x + 10, y + 5, 3, 3);
    ctx.fillRect(x + 19, y + 5, 3, 3);
  }

  // Legs (animated)
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

## Parallax Tiling Pattern

```javascript
draw(ctx, scrollX, w, h) {
  const spacing = 200;
  const offset = -(scrollX % spacing);
  for (let x = offset - spacing; x < w + spacing; x += spacing) {
    // Draw repeating element at x
  }
}
```

## Remember
- Every game should feel like a fresh experience
- Optimize for FUN and visual delight
- Make players want to show it to friends
- The weirder and more creative, the better!
- NO `shadowBlur`, `Math.random()`, `createLinearGradient()`, or `getImageData()` in draw() functions — they cause flickering
- Give obstacles a 2px outline so they're readable at speed
- The engine wraps every draw() in save()/restore() — don't call them yourself
