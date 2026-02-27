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

The engine is a set of JS module files (IIFEs) that get embedded into a single HTML file with the THEME object:

```
skills/runner-engine/
├── engine/
│   ├── audio-engine.js        # AudioEngine — Web Audio API synth
│   ├── particle-engine.js     # ParticleEngine — explosions, sparkles, dust, screen shake
│   ├── input-handler.js       # InputHandler — keyboard, touch, mouse
│   ├── hud.js                 # HUD — score, combo, effect timers
│   ├── scoreboard-client.js   # Scoreboard — POST/GET scores to bored-claude.vercel.app
│   ├── scoreboard-ui.js       # ScoreboardUI — game-over stats display
│   └── runner-engine.js       # RunnerEngine — game loop, physics, rendering
├── shell.html                 # HTML+CSS+DOM template (menu, game-over overlays)
└── references/
    └── theming-guide.md       # THEME object API & creative direction
```

### How Games Are Built

1. Claude reads `theming-guide.md` for the THEME API
2. Claude writes a `const THEME = { ... }` with creative visuals, obstacles, power-ups
3. Claude reads shell.html + all engine modules
4. Claude assembles everything into a single `index.html`: shell HTML + THEME + engine modules + boot line
5. Game opens in browser

Each engine module is a self-contained IIFE communicating via globals (e.g., RunnerEngine calls `AudioEngine.jump()`).

## Engine Features

- Variable delta-time physics with frame cap (50ms max)
- State machine: menu → playing → dying → game over
- **Variable jump height**: hold for full arc, release early for short hop
- **Enhanced gravity**: 2x fall speed, 1.8x on early release, 0.5x hang time at apex
- **Squash & stretch**: landing squash + jump stretch with lerp back
- **Coyote time**: 100ms grace period for late jumps
- **Input buffering**: 100ms queued jump before landing
- **Hit freeze**: 100ms pause on death for dramatic impact
- **Background flash**: white overlay on death
- **Death momentum**: player tumbles upward then falls before game-over
- **Near-miss detection**: "CLOSE!" bonus when dodging within 12px
- **Speed lines**: horizontal streaks at high velocity
- **Running dust trail**: particles while running on ground
- **Floating text popups**: animated score/near-miss text
- **Logarithmic difficulty curve**: exciting early ramp, fair plateau
- **Minimum obstacle gap**: 400ms between spawns
- **Score lerp**: smooth count-up display in HUD
- **Tab visibility handling**: pauses and resets timing on tab switch
- **Canvas alpha:false**: free performance optimization
- Jump (Space/Up/W, tap) + duck (Down/S, swipe down) mechanics
- Power-up system: shield, invincible, 2x-score, slow-mo, magnet
- Combo system with rising pitch audio on consecutive pickups
- Weighted obstacle spawning with air obstacle "duck clearance zone"
- Particle effects: dust, bursts, explosions, sparkles, trails, speed lines
- Screen shake on death
- Procedural Web Audio sounds + background beat + near-miss whoosh
- HUD: score, high score, combo counter, effect timers, elapsed time
- DOM-based UI: menu overlay with backdrop blur, game-over with animated stats
- Full input: keyboard, touch (tap/swipe), mouse click
- Responsive canvas scaling
- Forgiving hitboxes (4px padding)

## Scoreboard

- API at `https://bored-claude.vercel.app/api/scores`
- POST `{ gameId, gameName, theme, score }` → `{ playCount, allTimeHigh, isNewRecord }`
- GET `?gameId=<uuid>` → `{ playCount, allTimeHigh }`
- Anonymous: no player names, personal best in localStorage per gameId
- Each game gets a unique UUID v4 `gameId` hardcoded in the THEME
- Game-over shows: score count-up, personal best, all-time high, play count, "NEW WORLD RECORD!"

## Common Issues

- **No sound on mobile**: Audio requires user gesture — engine resumes AudioContext on first input
- **Parallax tearing**: Use `-(scrollX % spacing)` for seamless tiling
- **Power-ups not spawning**: Check `spawnChance` (0.001-0.005 range) and `powerups` array
- **Air obstacles too easy/hard**: Adjust `duckHeight` and air obstacle dimensions
- **Flickering sprites**: Never use `shadowBlur`, `Math.random()`, `createLinearGradient()` in draw() functions
