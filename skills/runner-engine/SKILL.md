---
description: Endless runner game engine knowledge for /bored games
triggers:
  - game engine
  - runner game
  - game template
  - bored game
  - game theme
---

# Runner Engine Skill

This skill provides context about the /bored endless runner game engine. Use it when discussing, debugging, or modifying generated games.

## Architecture

The engine is split into static module files that are assembled by `build.sh`:

```
skills/runner-engine/
├── engine/                    # Pre-built engine modules (do not modify)
│   ├── constants.js           # LEADERBOARD_URL
│   ├── audio-engine.js        # AudioEngine IIFE (Web Audio API, procedural sounds, beat music)
│   ├── particle-engine.js     # ParticleEngine IIFE (300-pool, dust/ring/death/sparkle/confetti/trail)
│   ├── input-handler.js       # InputHandler IIFE (keyboard, touch, mouse, swipe detection)
│   ├── hud.js                 # HUD IIFE (score, combo, effect timers, elapsed time)
│   ├── scoreboard-client.js   # ScoreboardClient IIFE (POST scores, GET stats)
│   ├── scoreboard-ui.js       # ScoreboardUI IIFE (game-over stats display)
│   ├── speed-lines.js         # SpeedLines IIFE (motion blur effect)
│   ├── floating-text.js       # FloatingText IIFE (combo/near-miss text popups)
│   └── runner-engine.js       # RunnerEngine IIFE (game loop, physics, spawning, rendering) + boot
├── shell.html                 # HTML+CSS+DOM template (menu, game-over overlays)
├── build.sh                   # Assembles theme.js + engine modules → index.html
└── references/
    └── theming-guide.md       # THEME object API & creative direction
```

### Build Flow

1. Claude reads `theming-guide.md`
2. Claude writes `theme.js` (~300 lines) — just `const THEME = { ... };`
3. `build.sh theme.js index.html` concatenates: shell HTML + theme + engine modules → single-file HTML
4. Game opens in browser

Each engine module is a self-contained IIFE. They communicate via globals (e.g., RunnerEngine calls `AudioEngine.play()`). No imports/exports needed.

## Key Reference Files

- `skills/runner-engine/references/theming-guide.md` — THEME object API & creative direction

## Engine Features

- Fixed-timestep physics (120Hz) with variable rendering
- State machine: menu → playing → dying → gameover
- Variable-height jumps (hold=float, release=fast fall) + double jump
- Ducking mechanic (Down/S key, swipe-down on mobile) — duck under air obstacles
- Power-up system with 5 effect types: shield, invincible, 2x-score, slow-mo, magnet
- Combo system: consecutive pickups increase multiplier (1x → 5x max) with flash text
- Weighted obstacle spawning (no score-threshold unlocking)
- Object-pooled particles (300 pre-allocated, zero GC) — dust, ring, death, sparkle, confetti, trail
- Procedural Web Audio API sounds + beat-scheduled music
- Modular HUD: zero-padded score, high score, combo, effect timers, elapsed time
- Screen shake, squash/stretch, hit freeze, speed lines, near-miss detection
- Difficulty ramp: configurable speed and spawn intervals
- Forgiving hitboxes (4px padding on each side)
- DOM-based UI: menu overlay with backdrop blur, game-over with stats
- Full input support: keyboard (Space/Up/W = jump, Down/S = duck), touch (tap/swipe), mouse

## Leaderboard

- Backend: Next.js + Supabase at `https://bored.run`
- Each game gets a unique UUID v4 `gameId`
- Anonymous play tracking: no player names, API returns `{ playCount, allTimeHigh, isNewRecord }`
- Scores submitted via POST to `/api/scores` on game over
- Game-over shows: score count-up, personal best, all-time high, play count, "NEW WORLD RECORD!" for new highs
- High score persisted per gameId in localStorage

## Common Issues

- **No sound on mobile**: Audio requires user gesture — the engine handles this via `AudioEngine.ensure()` on first input
- **Parallax tearing**: Ensure layers use `-(scrollX % spacing)` for seamless tiling
- **Power-ups not spawning**: Check `spawnChance` is set (0.001-0.005 range) and `powerups` array is populated
- **Air obstacles too easy/hard**: Adjust `duckHeight` in player config and air obstacle dimensions
- **Score not submitting**: Check that `THEME.gameId` is a valid UUID and `LEADERBOARD_URL` is correct
