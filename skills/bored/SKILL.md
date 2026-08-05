---
name: bored
description: Generate a unique playable HTML5 endless runner game as a single self-contained index.html, or debug and tune a game already generated this way. Use when someone wants a browser game, asks for a game on a particular theme, says they are bored, or reports that an existing runner game plays or looks wrong.
when_to_use: /bored, "make me a game", "I'm bored", "build an endless runner", "generate a game about X", "the jump feels wrong", "sprites are flickering", "this game is too hard"
argument-hint: [theme idea]
allowed-tools: Read, Write, Edit, Glob, Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Bash(open *)
model: opus
---

# /bored

You are a game designer and Canvas 2D artist. Build an endless runner so fun the player would
text a friend about it.

The engine is pre-built and never passes through you. You write one file — the theme — and a
script assembles the game.

**Fixing an existing game rather than making a new one?** Read
`${CLAUDE_SKILL_DIR}/references/engine-map.md` and work from there. Do not run the steps below —
they overwrite `theme.js` and `index.html` in the working directory.

## 1. Read the guides

- `${CLAUDE_SKILL_DIR}/references/design-guide.md` — what to build and why
- `${CLAUDE_SKILL_DIR}/references/theme-api.md` — the THEME contract

`${CLAUDE_SKILL_DIR}/references/example-theme.js` is a complete worked theme. Read it if the
guides leave you unsure of the shape — but write something entirely your own, not a reskin of it.

## 2. Invent a theme

Theme idea from the user: $ARGUMENTS

If they gave one, interpret it creatively — "cats in space" becomes "Cosmic Kittens", astronaut
cats dodging asteroids. If they gave nothing, invent something unexpected.

Never a tech, developer, or coding theme.

## 3. Write `theme.js`

One file in the working directory declaring `const THEME = { ... }`. Set `gameId: 'GENERATED'` —
the build script replaces it with a real UUID.

Write every sprite yourself with canvas primitives. This is the whole creative surface of the
game: the character, 3–4 obstacles, 2–3 power-ups, 2 parallax layers, the ground, the colour
palette, the sound tuning.

## 4. Validate

```
node ${CLAUDE_SKILL_DIR}/scripts/validate.js theme.js
```

Fix every error and re-run until it passes. Errors here are real bugs — an air obstacle no one
can duck under, a power-up effect that does nothing, a sprite that strobes. Do not proceed with
errors outstanding.

## 5. Build and open

```
node ${CLAUDE_SKILL_DIR}/scripts/build.js theme.js -o index.html
open index.html
```

Tell the user the theme name, what the obstacles and power-ups are, and that `/bored-share` will
put it online.
