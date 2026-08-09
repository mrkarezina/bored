# Engine Map

For modifying, debugging, or tuning a game that already exists. If you are creating a new game, go
back to `SKILL.md` — do not read this.

The game in the user's directory is a build artifact. `theme.js` is the source of truth; edit that
and rebuild. Editing `index.html` directly gets overwritten on the next build.

```
node ${CLAUDE_SKILL_DIR}/scripts/validate.js theme.js
node ${CLAUDE_SKILL_DIR}/scripts/build.js theme.js -o index.html
node ${CLAUDE_SKILL_DIR}/scripts/playtest.js index.html      # optional, reports on fun
```

If the user has only `index.html` and no `theme.js`, the theme source is still inside it — the block
between the `// ===== theme =====` and `// ===== engine/audio-engine.js =====` markers. Extract it to
`theme.js` and work from there.

## Modules

Each is a self-contained IIFE exposing one global. `scripts/build.js` holds the load order: the
library goes in first because a theme calls into it while it is being defined.

| File | Global | Responsibility |
|---|---|---|
| `lib/vendor.js` | `Vendor` | ZzFX synth, seeded RNG, easings, WCAG contrast |
| `lib/envelope.js` | `Envelope` | what the jump can reach — the keystone everything else is measured against |
| `lib/patterns.js` | `Pattern` | pre-solved obstacle clusters, authored in arc units |
| `lib/rhythm.js` | `Rhythm` | playlist plus the scheduler: budget, cooldown, forced rest, gap floor |
| `lib/motion.js` | `Motion` | bounded obstacle movement |
| `lib/palette.js` | `Palette` | contrast-solved colour sets |
| `lib/sound.js` | `Sound` | curated ZzFX palettes |
| `engine/runner-engine.js` | `RunnerEngine` | game loop, physics, collision, render |
| `engine/audio-engine.js` | `AudioEngine` | six game sounds over ZzFX |
| `engine/particle-engine.js` | `ParticleEngine` | bursts, dust, sparkles, screen shake |
| `engine/input-handler.js` | `InputHandler` | keyboard, touch, mouse |
| `engine/hud.js` | `HUD` | score, combo, effect timers |
| `engine/scoreboard-client.js` | `Scoreboard` | POST/GET to bored-claude.vercel.app |
| `engine/scoreboard-ui.js` | `ScoreboardUI` | game-over stats |
| `shell.html` | — | page chrome, overlays, the `<!--BUILD:INJECT-->` marker |

## Where to look

| Symptom | Location |
|---|---|
| Jump arc, gravity, coyote time, input buffer | `engine/runner-engine.js` `updatePlayer` |
| What appears and how often | the game's own `theme.js` — `rhythm` |
| Spacing, pacing, rest, difficulty ramp | `lib/rhythm.js` scheduler |
| Whether something is reachable at all | `lib/envelope.js` |
| Collision fairness, near-miss detection | `engine/runner-engine.js` `checkCollision` |
| Power-up effects and durations | `engine/runner-engine.js`, effect handling |
| Sound character | `lib/sound.js` palettes |
| Menu, game-over overlay, page layout | `shell.html` |
| Anything visual and theme-specific | the game's own `theme.js` |

Most complaints ("feels unfair", "too hard", "looks muddy") used to be theme problems. They largely
cannot be any more — the library makes those states unrepresentable. Check `playtest.js` output
before assuming an engine bug.

## Physics runs at a fixed 60Hz

Rendering follows the display; physics does not. `stepPlaying()` runs in whole 1/60s steps with an
accumulator, so a 144Hz monitor simulates identically to a 60Hz one. There is deliberately no `dt`
multiplier inside it — anything per-step is written per-step. If you add physics, add it there, not
in `gameLoop`.

## Scoreboard

`https://bored-claude.vercel.app/api/scores` — POST `{ gameId, gameName, theme, score }` returns
`{ playCount, allTimeHigh, isNewRecord }`; GET `?gameId=<uuid>` returns `{ playCount, allTimeHigh }`.
Anonymous, no player names; personal best is in `localStorage` keyed by `gameId`. Every call degrades
silently offline, so a dead network looks like missing stats, never a crash.

## Known failure modes

`scripts/validate.js` catches most of these — run it before debugging by hand.

- **The engine refuses to start.** It throws by design on an obstacle nothing can clear, an air
  obstacle whose motion carries it into a ducking player, or a playlist that cannot open the game.
  The message names the obstacle and the number that is wrong.
- **Sprites flicker.** `Math.random()`, `shadowBlur`, a gradient, or `getImageData` inside a
  `draw()`. Derive variation from the `frame` parameter instead.
- **Parallax tears at the seam.** The offset must be `-(scrollX % spacing)`.
- **A hazard feels unfair despite the guarantees.** Almost always a sprite drawn larger than the
  `width`/`height` it declared. The hitbox is the declared box.
- **The game feels monotonous.** Too few patterns in the playlist, or weights too lopsided. Check
  `playtest.js` for vocabulary and decision density.
- **No sound at all.** `AudioEngine.unlock()` has to run inside a real user gesture; on mobile a
  context created any earlier stays suspended.
