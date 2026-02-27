# Game Engine Improvements Report

Researched from: Jetpack Joyride, Geometry Dash, Canabalt, Chrome Dino, Alto's Adventure, Celeste, Flappy Bird, Vlambeer's "Art of Screenshake", and "Juice It or Lose It" (GDC).

Each enhancement below is a small code change with big gameplay impact. Organized by priority.

---

## Critical Bug Fix

### Air obstacles can never hit the player
**Status:** Fixed in this session.

The `spawnObstacle()` function placed air obstacles at `groundY - 20 - height`, which is entirely above the player's hitbox. They could never collide — ducking was decorative.

**Fix:** Position air obstacles in the "duck clearance zone" — the region that overlaps with the standing hitbox but clears the ducking hitbox:
```js
const duckH = theme.player.duckHeight || theme.player.height * 0.5;
const clearance = theme.player.height - duckH;
spawnY = theme.player.groundY + clearance / 2 - selected.height / 2;
```

---

## Tier 1: High Impact, Low Effort

### 1. Variable Jump Height (Tap vs Hold)
**What:** Release jump early → cut upward velocity. Hold → full arc.
**Why:** Single most impactful jump feel improvement. Without it, every jump is the same height and feels robotic. Jetpack Joyride, Celeste, and Chrome Dino all do this.
**Effort:** ~8 lines in `onJump`/`onJumpRelease` + `updatePlayer`.

```js
// On jump release while ascending:
if (jumpReleased && playerVY < 0) {
  playerVY *= 0.4; // cut jump short
}
```

### 2. Increased Fall Gravity
**What:** Apply 2-2.5x gravity when falling vs rising.
**Why:** Makes jumps feel snappy instead of floaty. The "Mega Man jump" — quick up, fast down. Every great platformer does this. Without it jumps feel like floating on the moon.
**Effort:** 3 lines in `updatePlayer`.

```js
const fallMult = playerVY > 0 ? 2.0 : 1.0;
playerVY += theme.player.gravity * fallMult * dtMult;
```

### 3. Hit Freeze (Hitstop) on Death
**What:** Freeze the game for 80-120ms on death before showing game-over.
**Why:** Vlambeer's #1 technique. A tiny pause lets the brain register the impact. Without it, death feels sudden and arbitrary. With it, death feels dramatic and earned. Research shows ~100ms freeze increases perceived impact by ~30%.
**Effort:** ~6 lines — add `freezeTimer` to game loop.

```js
let freezeTimer = 0;
// In gameLoop, before update:
if (freezeTimer > 0) { freezeTimer -= dt; return; }
// In gameOver:
freezeTimer = 100; // ms
```

### 4. Landing Squash & Stretch
**What:** On landing, briefly squash player sprite (1.3x wide, 0.7x tall) then ease back to normal. On jump launch, stretch (0.7x wide, 1.3x tall).
**Why:** From Disney's 12 principles of animation. Makes the character feel alive and weighty. Without it, the character is a rigid shape sliding around. Alto's Adventure does this beautifully on every landing.
**Effort:** ~10 lines — track `squashX/squashY`, lerp back each frame, apply in draw.

```js
// On landing:
squashX = 1.3; squashY = 0.7;
// On jump:
squashX = 0.7; squashY = 1.3;
// Each frame:
squashX += (1.0 - squashX) * 0.15;
squashY += (1.0 - squashY) * 0.15;
// In draw:
ctx.scale(squashX, squashY);
```

### 5. Coyote Time
**What:** Allow jumping for ~100ms after leaving the ground (e.g. walking off an edge, or after a near-miss).
**Why:** Named after Wile E. Coyote. The player's brain thinks they're still on solid ground. Without it, players feel cheated when a jump "doesn't register." Celeste, Chrome Dino, and most modern platformers use 6-10 frames.
**Effort:** ~5 lines — add `coyoteTimer`, decrement per frame, allow jump while > 0.

*Note: Less critical for auto-runners where you can't walk off edges, but still helps with jump timing feel.*

### 6. Input Buffering
**What:** If player presses jump within ~100ms before landing, queue it and execute on landing.
**Why:** Without it, players have to time jump presses EXACTLY at the landing frame. With it, early presses still register. Celeste uses this. Players won't notice it's there but will notice when it's not.
**Effort:** ~5 lines — add `jumpBufferTimer`, check on ground contact.

```js
let jumpBufferTimer = 0;
// On jump press: jumpBufferTimer = 100;
// Each frame: jumpBufferTimer -= dt;
// On ground contact: if (jumpBufferTimer > 0) { jump(); }
```

---

## Tier 2: Medium Impact, Low-Medium Effort

### 7. Near-Miss Detection & Reward
**What:** When an obstacle passes within 5-10px of the player without hitting, trigger a "CLOSE!" floating text, bonus points, and a brief particle burst.
**Why:** Turns scary moments into rewarding ones. Players start intentionally seeking close calls for bonus points. Jetpack Joyride does this with "near miss" bonuses. Makes every dodge feel skillful.
**Effort:** ~15 lines — secondary hitbox check after obstacle passes player X.

### 8. Speed Lines at High Velocity
**What:** When game speed exceeds a threshold, draw thin horizontal streaks across the screen.
**Why:** Instantly communicates "you are going fast" without affecting gameplay. Geometry Dash uses this. Creates a visceral sense of velocity that parallax alone can't match.
**Effort:** ~15 lines — spawn line particles when speed > threshold.

### 9. Score Lerp (Count-Up Display)
**What:** Don't update the displayed score instantly. Lerp it toward the actual score over ~200ms.
**Why:** The "counting up" effect makes scoring feel continuous and satisfying. Every modern game does this. The score should feel alive, not just a static number that ticks.
**Effort:** ~3 lines in HUD draw.

```js
displayScore += (actualScore - displayScore) * 0.1;
ctx.fillText(Math.round(displayScore), x, y);
```

### 10. Death Momentum (Post-Death Physics)
**What:** On death, don't just freeze the player. Let them tumble/bounce/fly upward for a beat before game-over overlay appears.
**Why:** Makes death feel physical rather than like hitting a wall. Chrome Dino does this — the dino trips and slides. Gives the player a brief moment to process what happened.
**Effort:** ~15 lines — add DYING state, apply upward velocity + gravity + rotation for ~500ms.

### 11. Background Flash on Death
**What:** Flash the canvas background to white (or accent color) for 2-3 frames on death.
**Why:** Vlambeer's technique. Costs 3 lines of code, creates a powerful visual "punch" that makes impacts feel heavy. Combine with screen shake and hit freeze for maximum effect.
**Effort:** 3 lines.

```js
let flashTimer = 0;
// In gameOver: flashTimer = 50; // ms
// In draw, before background: if (flashTimer > 0) { ctx.fillStyle = '#fff'; ctx.fillRect(...); flashTimer -= dt; }
```

### 12. Canvas `alpha: false` Optimization
**What:** Create the canvas context with `{ alpha: false }`.
**Why:** Free performance win. Since we fill the entire canvas every frame, the browser can skip compositing transparency. Can improve frame times by 5-15% on mobile.
**Effort:** 1 line change.

```js
ctx = canvas.getContext('2d', { alpha: false });
```

### 13. Tab Visibility Handling
**What:** Pause game when tab loses focus. Reset timing on return.
**Why:** Without this, switching tabs and coming back causes a massive delta spike — the game tries to simulate minutes of elapsed time in one frame, causing a "spiral of death." The player returns to find their character dead.
**Effort:** ~8 lines — `visibilitychange` listener.

---

## Tier 3: Nice to Have

### 14. Logarithmic Speed Curve
**What:** Replace linear speed ramp with exponential approach: `speed = base + max * (1 - e^(-t * rate))`.
**Why:** Exciting early acceleration that plateaus gracefully. Linear ramps either start too slow or end impossibly fast. Chrome Dino uses a similar curve.
**Effort:** 1 line change in difficulty ramp.

### 15. Minimum Obstacle Gap Enforcement
**What:** After spawning an obstacle, enforce a minimum time before the next can spawn (regardless of spawn interval RNG).
**Why:** Prevents unfair situations where two obstacles spawn nearly overlapping. At high speeds, the player must always have enough reaction time. Even Geometry Dash, which is brutally hard, guarantees minimum gaps.
**Effort:** ~3 lines — track last spawn time, enforce minimum.

### 16. Running Dust Trail
**What:** Spawn 1-2 small dust particles behind the player every 3-5 frames while running on ground.
**Why:** Continuous visual feedback that the player is in contact with the ground. Makes the ground surface feel real. Almost every good runner has this.
**Effort:** 3 lines in the run state.

### 17. Pitch Variation on Repeated Sounds
**What:** Randomly vary sound playback rate by +/- 15% for repeated effects (collect, dust, footstep).
**Why:** Prevents the "machine gun effect" of identical sounds repeating. Makes audio feel organic. Jetpack Joyride does this for every pickup sound.
**Effort:** 1 line — `source.playbackRate.value = 0.85 + Math.random() * 0.3`.

### 18. Rising Pitch for Combo Streaks
**What:** Each consecutive pickup increases the collect sound pitch by a semitone (multiply frequency by 1.0595).
**Why:** Creates a musical escalation that feels rewarding. Players subconsciously chase the ascending melody. Reset after combo decay.
**Effort:** ~3 lines in `activatePowerup`.

### 19. Anti-Gravity Apex (Hang Time)
**What:** Reduce gravity when vertical velocity is near zero (at jump peak).
**Why:** Gives players a moment of extra air control at the apex. Makes precise dodging feel possible. Celeste does this.
**Effort:** 3 lines.

```js
if (Math.abs(playerVY) < 2) gravityMult *= 0.5; // hang time at apex
```

---

## What NOT to Add (Overly Constraining)

These were considered but would hurt more than help for a themed game generator:

- **Fixed timestep with accumulator** — Current variable dt with frame cap is simpler and good enough for a casual runner. Full accumulator adds complexity for marginal benefit.
- **Render interpolation** — Same as above. Overkill for 60fps canvas games.
- **Corner correction** — No platforms to clip in an auto-runner.
- **Offscreen canvas pre-rendering** — THEME sprites are procedural draw() functions, not pre-renderable.
- **Multiple layered canvases** — Adds complexity to the shell. Single canvas is simpler for generated games.
- **Player afterimage/trail** — Cool but requires storing position history and would need theme-specific tuning.

---

## Recommended Implementation Order

1. Variable jump height + increased fall gravity (transforms jump feel)
2. Hit freeze + background flash on death (transforms death feel)
3. Landing squash & stretch (transforms character feel)
4. Input buffering (removes frustration)
5. Near-miss detection (adds excitement)
6. Tab visibility handling + alpha:false (prevents bugs, free perf)
7. Everything else as time permits

## Sources

- [Vlambeer "Art of Screenshake"](https://www.gamedesign.gg/knowledge-base/game-design/game-feel-feedback/the-art-of-screenshake-jan-willem-nijman-vlambeer/) — Trauma-based shake, freeze frames, permanence
- [Celeste & Platformer Controls](https://shaggydev.com/2022/06/29/platformer-tips/) — Coyote time 0.1s, buffer 0.1s, fall multiplier 2.0x
- [Gaffer on Games: Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/) — Accumulator pattern
- [Juice It or Lose It (GDC)](https://rpgplayground.com/research-making-a-juicy-game/) — Squash/stretch, particles, screen flash
- [Chrome Dino Mechanics](https://pragyasapkota.medium.com/everything-we-know-about-chrome-dino-game-396151c176c7) — Speed ramp, obstacle phasing
- [Alto's Adventure Terrain & Physics](https://www.bitshiftprogrammer.com/2018/01/altos-adventure-style-procedural_67.html) — Momentum, slope physics
- [Game Feel: Death Animations](https://www.gameanim.com/2015/08/25/game-feel-why-your-death-animation-sucks-2/) — Post-death momentum
- [Slow-Mo Tips (Gamasutra)](https://www.gamedeveloper.com/design/slow-mo-tips-and-tricks) — Ease into slow-mo, don't apply at impact frame
- [MDN: Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) — alpha:false, integer coords, state batching
- [Web Audio for Games (web.dev)](https://web.dev/webaudio-games/) — Precise timing, buffer pooling
