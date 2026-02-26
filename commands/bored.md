---
description: Generate a unique, fun endless runner game
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
model: opus
---

# /bored — Generate an Endless Runner Game

You are a game designer and Canvas 2D artist. Your job is to create a **single-file HTML5 endless runner game** that is so fun and polished the player would text a friend about it.

## Step 1: Read the Engine Template

Read the engine template file at `skills/runner-engine/references/engine-template.md`. This contains the complete game engine with modular IIFEs for physics, rendering, particles, audio, input, HUD, and leaderboard integration.

Also read:
- `skills/runner-engine/references/theming-guide.md` — documents every field in the THEME object
- `skills/runner-engine/references/audio-cookbook.md` — procedural sound recipes

## Step 2: Invent a Creative Theme

Come up with a **fun, unexpected, specific** theme. The theme should make someone smile reading the title and want to play immediately.

**Rules:**
- **NEVER** use tech/developer/coding themes (no keyboards, no terminals, no bugs-as-insects-in-code)
- **Be creative and specific** — not "animal runs" but "Cosmic Surfer" or "Kitchen Chaos" or "Rooftop Run"
- **Visual personality** — the character and obstacles should be charming and memorable
- **Thematic coherence** — every element (parallax layers, obstacles, ground, character, power-ups) tells the same story

**Great theme examples:**
- "Cosmic Surfer" — astronaut on a hoverboard dodging asteroids and satellites
- "Kitchen Chaos" — a sushi roll running across a kitchen counter dodging knives and steam
- "Neon Drift" — a glowing geometric shape surfing a synthwave grid
- "Rooftop Run" — a parkour cat leaping across city rooftops at sunset
- "Ocean Escape" — a surfing penguin dodging coral, icebergs, and seagulls
- "Candy Rush" — a gummy bear running through a candy landscape
- "Disco Fever" — a roller skater grooving through a disco dance floor
- "Arctic Dash" — a snowboarding fox on frozen tundra under aurora borealis
- "Haunted Library" — a flying book dodging candles and bats

## Step 3: Fill in the THEME Object

Using the engine template as the base, fill in **only** the THEME object with:

1. **`name`** — Fun game title
2. **`description`** — One-line hook
3. **`gameId`** — Generate a unique UUID v4
4. **`colors`** — Full color palette: `bg`, `text`, `accent`, `score`, `ground`, `groundLine`
5. **`player`** — Character config with `width`, `height`, `duckHeight`, `groundY`, `jumpForce`, `gravity`, and `draw(ctx, x, y, frame, state)`. Draw different poses for `run`, `jump`, `duck`, and `hit` states. Add idle animation!
6. **`obstacles[]`** — At least 3 ground obstacles + 1-2 air obstacles. Each with `type` ('ground'/'air'), `weight` for spawn probability, and `draw()`. Vary sizes and difficulty.
7. **`powerups[]`** — 2-3 collectible power-ups with themed visuals. Effects: `shield`, `invincible`, `2x-score`, `slow-mo`, or `magnet`. Include spawn chance and duration.
8. **`backgrounds[]`** — At least 3 parallax layers: far (~0.15), mid (~0.4), near (~0.7). Use tiling patterns with modular arithmetic.
9. **`drawGround(ctx, scrollX, groundY, w, h)`** — Themed scrolling ground surface
10. **`particles`** — Colors for `dust`, `jump`, `death`, `collect`, `trail`, `confetti` — all matching theme
11. **`scoring`** — Points config, combo decay, multiplier max
12. **`difficulty`** — Speed ramp, spawn intervals
13. **`sounds`** — Either simple config (`jumpFreqs`, `collectFreqs`, etc.) or full custom sound overrides. Use the audio cookbook as starting points.

## Step 4: Write the Game File

Write the complete game as a single `index.html` file in the current directory. The file should contain:
- The filled-in THEME object at the top
- The complete engine code below it (copy exactly from the template)

## Step 5: Open in Browser

Run `open index.html` to launch the game in the default browser.

## Quality Checklist

Before finishing, mentally verify:
- [ ] Theme is creative, fun, and NOT tech-related
- [ ] 3+ parallax layers with smooth scrolling (use modulo for tiling!)
- [ ] 3+ ground obstacles + 1-2 air obstacles with weighted spawning
- [ ] 2-3 power-ups with distinct effects and themed visuals
- [ ] Character has idle animation and different run/jump/duck poses
- [ ] All sounds are configured (at minimum: `jumpFreqs`, `collectFreqs`, `hitFreq`, `bgBPM`)
- [ ] Background music plays during gameplay
- [ ] Particle colors match the theme
- [ ] Ground has scrolling detail texture
- [ ] Unique UUID v4 gameId is set
- [ ] Colors create a cohesive, attractive palette
- [ ] Game title makes you smile

## Important Notes

- The engine handles ALL game logic — you only fill in the THEME object with visuals, sounds, and config
- Keep Canvas drawing code simple but charming — shapes and colors over complexity
- Test your parallax layers mentally: do they tile seamlessly with `scrollX % spacing`?
- Canvas is fixed at 800×400 — all coordinates are predictable
- The game automatically connects to the leaderboard at `https://bored.run`
- UI overlays (menu, game over, name input) are DOM-based with CSS — styled automatically from THEME.colors
