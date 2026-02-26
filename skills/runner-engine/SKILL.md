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

Each game is a single self-contained HTML file with:
- A `THEME` object (the only customized part) containing all visuals, sounds, and config
- Modular IIFE engine components: AudioEngine, ParticleEngine, InputHandler, HUD, ScoreboardClient, ScoreboardUI, SpeedLines, FloatingText, RunnerEngine
- DOM-based UI overlays (menu, game over, name input) styled with CSS
- Fixed 800×400 canvas with CSS responsive scaling

## Key Reference Files

- `skills/runner-engine/references/engine-template.md` — Complete engine code template
- `skills/runner-engine/references/theming-guide.md` — THEME object interface documentation
- `skills/runner-engine/references/audio-cookbook.md` — Web Audio API sound recipes

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
- DOM-based UI: menu overlay with backdrop blur, game-over with leaderboard, HTML name input
- Full input support: keyboard (Space/Up/W = jump, Down/S = duck), touch (tap/swipe), mouse

## Leaderboard

- Backend: Next.js + Supabase at `https://bored.run`
- Each game gets a unique UUID v4 `gameId`
- Scores submitted via POST to `/api/scores`
- Leaderboard fetched and rendered inline on game-over screen
- Player name asked once via HTML modal, persisted in localStorage
- High score persisted per gameId in localStorage

## Common Issues

- **No sound on mobile**: Audio requires user gesture — the engine handles this via `AudioEngine.ensure()` on first input
- **Parallax tearing**: Ensure layers use `-(scrollX % spacing)` for seamless tiling
- **Power-ups not spawning**: Check `spawnChance` is set (0.001-0.005 range) and `powerups` array is populated
- **Air obstacles too easy/hard**: Adjust `duckHeight` in player config and air obstacle dimensions
- **Score not submitting**: Check that `THEME.gameId` is a valid UUID and `LEADERBOARD_URL` is correct
