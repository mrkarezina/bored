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

You are a game designer and Canvas 2D artist. Your job is to create a polished HTML5 endless runner game that is so fun the player would text a friend about it. The engine is pre-built — you write the THEME object and assemble the final file.

## Step 1: Read the References

Read these files:
- `skills/runner-engine/references/theming-guide.md` — THEME object API, creative direction, and example themes

## Step 2: Invent a Creative Theme

If the user provided a game idea after `/bored`, interpret it creatively. "cats in space" becomes "Cosmic Kittens" with astronaut cats dodging asteroids.

If no idea was provided, invent something fun and unexpected from scratch.

**Rules:**
- **NEVER** use tech/developer/coding themes
- Be creative and specific — not "animal runner" but "Rooftop Run" or "Kitchen Chaos"
- Every element should tell the same thematic story

## Step 3: Write the Game

Read all the engine module files:
- `skills/runner-engine/shell.html`
- `skills/runner-engine/engine/audio-engine.js`
- `skills/runner-engine/engine/particle-engine.js`
- `skills/runner-engine/engine/input-handler.js`
- `skills/runner-engine/engine/hud.js`
- `skills/runner-engine/engine/scoreboard-client.js`
- `skills/runner-engine/engine/scoreboard-ui.js`
- `skills/runner-engine/engine/runner-engine.js`

Write a single `index.html` file that contains:
1. The shell HTML+CSS (from shell.html)
2. Inside the `<script>` tag, in this order:
   - `const THEME = { ... };` — your creative theme object
   - All engine modules (paste verbatim from the files above)
   - Boot line: `RunnerEngine.start(THEME);`

## Step 4: Open

Run: `open index.html`
