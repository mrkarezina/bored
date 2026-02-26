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

Read the engine template file at `skills/runner-engine/references/engine-template.md`. This contains the complete game engine (~800 lines of JS) that handles physics, rendering, particles, audio, input, and leaderboard integration.

Also read:
- `skills/runner-engine/references/theming-guide.md` — documents every field in the THEME object
- `skills/runner-engine/references/audio-cookbook.md` — procedural sound recipes

## Step 2: Invent a Wildly Creative Theme

Come up with a **hilarious, surprising, specific** theme. The theme should make someone laugh just reading the title.

**Rules:**
- **NEVER** use tech/developer/coding themes (no keyboards, no terminals, no bugs-as-insects-in-code)
- **Be absurdly specific** — not "animal runs" but "a raccoon on roller skates fleeing a garbage truck"
- **Visual comedy** — the character and obstacles should be inherently funny
- **Thematic coherence** — every element (parallax layers, obstacles, ground, character) tells the same story

**Great theme examples:**
- "Grandma on a motorized wheelchair escaping bingo night"
- "A burrito rolling through a kitchen dodging hot sauce bottles"
- "A penguin in a tuxedo late for his own wedding"
- "A cat knocking things off increasingly tall shelves"
- "A piece of toast launched from a toaster navigating a breakfast table"
- "A mall cop on a Segway chasing a shoplifter through Black Friday crowds"
- "A pigeon carrying a stolen french fry through a city park"

## Step 3: Fill in the THEME Object

Using the engine template as the base, fill in **only** the THEME object with:

1. **`name`** — Fun game title
2. **`description`** — One-line hook
3. **`gameId`** — Generate a unique UUID v4 (e.g., `crypto.randomUUID()` format like `f47ac10b-58cc-4372-a567-0d02b2c3d479`)
4. **`colors`** — Full color palette matching the theme
5. **`drawCharacter(ctx, player, time)`** — A charming character with idle animation, jump/fall poses. Use 10-20 Canvas 2D calls. Add personality!
6. **`obstacleTypes[]`** — At least 3 types, unlocking at scores 0, 500, 1500 (optionally 3000). Each visually distinct with subtle animation
7. **`parallaxLayers[]`** — At least 3 layers setting the scene. Far (speed ~0.1), mid (speed ~0.25), near (speed ~0.45). Use tiling patterns with modular arithmetic
8. **`drawGround(ctx, scrollX, groundY, w, h)`** — Themed scrolling ground surface
9. **`particles`** — Colors matching theme for dust, ring, death, trail, confetti
10. **`sounds`** — All 8 sound effects defined (jump, doubleJump, land, die, score100, score1000, nearMiss, milestone). Use the audio cookbook recipes as starting points, then customize pitch/type to match theme
11. **`bpm` + `playBeat()`** — Simple background music loop (kick + hi-hat + optional bass is enough)

## Step 4: Write the Game File

Write the complete game as a single `index.html` file in the current directory. The file should contain:
- The filled-in THEME object at the top
- The complete engine code below it (copy exactly from the template)

## Step 5: Open in Browser

Run `open index.html` to launch the game in the default browser.

## Quality Checklist

Before finishing, mentally verify:
- [ ] Theme is creative, funny, and NOT tech-related
- [ ] 3+ parallax layers with smooth scrolling (use modulo for tiling!)
- [ ] 3+ obstacle types with staggered unlock scores
- [ ] Character has idle animation and different jump/fall poses
- [ ] All 8 sound effects are non-empty functions
- [ ] Background music plays during gameplay
- [ ] Particle colors match the theme
- [ ] Ground has scrolling detail texture
- [ ] Unique UUID v4 gameId is set
- [ ] Colors create a cohesive, attractive palette
- [ ] Game title makes you smile

## Important Notes

- The engine handles ALL game logic — you only fill in the THEME object visuals and sounds
- Keep Canvas drawing code simple but charming — shapes and colors over complexity
- Test your parallax layers mentally: do they tile seamlessly with `scrollX % spacing`?
- Every sound function MUST create and start at least one oscillator or noise source
- The game automatically connects to the leaderboard at `https://bored-leaderboard.vercel.app`
