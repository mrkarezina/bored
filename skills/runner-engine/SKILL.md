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
- A `THEME` object (the only customized part) containing all visuals, sounds, and theme data
- A shared engine handling physics, rendering, particles, audio, input, and leaderboard

## Key Reference Files

- `skills/runner-engine/references/engine-template.md` — Complete engine code template
- `skills/runner-engine/references/theming-guide.md` — THEME object interface documentation
- `skills/runner-engine/references/audio-cookbook.md` — Web Audio API sound recipes

## Engine Features

- Fixed-timestep physics (120Hz) with variable rendering
- State machine: menu → playing → dying → gameover
- Variable-height jumps (hold=float, release=fast fall) + double jump
- Object-pooled particles (300 pre-allocated, zero GC)
- Procedural Web Audio API sounds + beat-scheduled music
- Screen shake, squash/stretch, hit freeze, speed lines, near-miss detection
- Difficulty ramp: 300→900 px/s, tightening obstacle intervals
- Forgiving hitboxes (80% of visual size)
- Leaderboard integration (score submission to backend API)
- Full input support: keyboard, touch, mouse

## Leaderboard

- Backend: Next.js + Supabase at `https://bored-leaderboard.vercel.app`
- Each game gets a unique UUID v4 `gameId`
- Scores are submitted via POST to `/api/scores`
- Global leaderboard at the website root, per-game leaderboards at `/games/[gameId]`

## Common Issues

- **No sound on mobile**: Audio requires user gesture — the engine handles this via `initAudio()` on first input
- **Parallax tearing**: Ensure layers use `-(scrollX % spacing)` for seamless tiling
- **Empty sound functions**: Every sound in `THEME.sounds` must create and start oscillators — empty functions produce silence
- **Score not submitting**: Check that `THEME.gameId` is a valid UUID and `LEADERBOARD_URL` is correct
