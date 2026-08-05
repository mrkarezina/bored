# Engine Map

For modifying, debugging, or tuning a game that already exists. If you are creating a new game,
go back to `SKILL.md` — do not read this.

The game in the user's directory is a build artifact. `theme.js` is the source of truth; edit
that and rebuild. Editing `index.html` directly gets overwritten on the next build.

```
node ${CLAUDE_SKILL_DIR}/scripts/validate.js theme.js
node ${CLAUDE_SKILL_DIR}/scripts/build.js theme.js -o index.html
```

If the user has only `index.html` and no `theme.js`, the theme source is still inside it — the
first block after `<script>`, between the `// ===== theme =====` and `// ===== audio-engine.js =====`
markers. Extract it to `theme.js` and work from there.

## Modules

Each is a self-contained IIFE exposing one global, calling the others by name
(`AudioEngine.jump()`). Load order lives in `scripts/build.js`.

| File | Global | Responsibility |
|---|---|---|
| `engine/runner-engine.js` | `RunnerEngine` | game loop, physics, spawning, collision, render |
| `engine/audio-engine.js` | `AudioEngine` | Web Audio synth, tuned by `THEME.sounds` |
| `engine/particle-engine.js` | `ParticleEngine` | bursts, dust, sparkles, screen shake |
| `engine/input-handler.js` | `InputHandler` | keyboard, touch, mouse |
| `engine/hud.js` | `HUD` | score, combo, effect timers |
| `engine/scoreboard-client.js` | `Scoreboard` | POST/GET to bored-claude.vercel.app |
| `engine/scoreboard-ui.js` | `ScoreboardUI` | game-over stats |
| `shell.html` | — | page chrome, menu and game-over overlays, `<!--BUILD:INJECT-->` marker |

## Where to look

| Symptom | Location |
|---|---|
| Jump arc, gravity, coyote time, input buffer | `engine/runner-engine.js` |
| Obstacle spawn position, weighting, gaps | `engine/runner-engine.js`, spawn logic |
| Collision fairness, near-miss detection | `engine/runner-engine.js` `checkCollision` |
| Power-up effects and durations | `engine/runner-engine.js`, effect handling |
| Sound character | `engine/audio-engine.js` |
| Menu, game-over overlay, page layout | `shell.html` |
| Score submission, stats display | `engine/scoreboard-*.js` |
| Anything visual and theme-specific | the game's own `theme.js` |

Most complaints ("feels unfair", "too hard", "looks muddy") are theme problems, not engine
problems. Check `theme.js` against `design-guide.md` before touching `engine/`.

An engine edit reaches existing games only when they are rebuilt.

## Scoreboard

`https://bored-claude.vercel.app/api/scores` — POST `{ gameId, gameName, theme, score }` returns
`{ playCount, allTimeHigh, isNewRecord }`; GET `?gameId=<uuid>` returns
`{ playCount, allTimeHigh }`. Anonymous, no player names; personal best is in `localStorage`
keyed by `gameId`. Every call degrades silently offline, so a dead network looks like missing
stats, never a crash.

## Known failure modes

`scripts/validate.js` catches most of these — run it before debugging by hand.

- **Sprites flicker.** `Math.random()`, `shadowBlur`, `createLinearGradient`, or `getImageData`
  inside a `draw()`. Derive variation from the `frame` parameter instead.
- **Parallax tears at the seam.** The offset must be `-(scrollX % spacing)`.
- **Power-ups never appear.** `spawnChance` outside 0.001–0.005, or an `effect` that is not one of
  `shield`, `invincible`, `2x-score`, `slow-mo`, `magnet`.
- **Air obstacles cannot be ducked.** Height must be at most
  `player.height - player.duckHeight + 16`; the engine centres them in that band and applies 4px
  of collision padding per side.
- **Custom sound functions do nothing.** `AudioEngine` reads only `jumpFreqs`, `collectFreqs`,
  `hitFreq`, `bgBPM` from `THEME.sounds`.
- **The game feels chaotic at speed.** Usually a third parallax layer competing with the
  obstacles. See `design-guide.md`.
- **No sound on mobile.** Audio needs a user gesture; the engine resumes the AudioContext on
  first input.
