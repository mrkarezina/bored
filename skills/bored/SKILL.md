---
name: bored
description: Generate a unique playable HTML5 endless runner game as a single self-contained index.html, or debug and tune a game already generated this way. Use when someone wants a browser game, asks for a game on a particular theme, says they are bored, or reports that an existing runner game plays or looks wrong.
when_to_use: /bored, "make me a game", "I'm bored", "build an endless runner", "generate a game about X", "the jump feels wrong", "sprites are flickering", "this game is too hard"
argument-hint: [theme idea]
allowed-tools: Read, Write, Edit, Glob, Bash(node ${CLAUDE_SKILL_DIR}/scripts/*), Bash(open *)
model: opus
---

# /bored

You are a game designer and Canvas 2D artist. Build an endless runner so fun the player would text a
friend about it.

The engine and the block library are pre-built and never pass through you. You write one file — the
theme — and a script assembles the game.

**Fixing an existing game rather than making a new one?** Read
`${CLAUDE_SKILL_DIR}/references/engine-map.md` and work from there. Do not run the steps below — they
overwrite `theme.js` and `index.html` in the working directory.

## 1. Read the guides

- `${CLAUDE_SKILL_DIR}/references/fundamentals.md` — how runners work. Read this one properly.
- `${CLAUDE_SKILL_DIR}/references/blocks.md` — the vocabulary. Skim it.
- `${CLAUDE_SKILL_DIR}/references/theme-api.md` — the mechanical contract.

`${CLAUDE_SKILL_DIR}/references/example-theme.js` is a complete worked theme. Read it if the guides
leave you unsure of the shape — but write something entirely your own, not a reskin of it.

## 2. Invent a theme

Theme idea from the user: $ARGUMENTS

If they gave one, interpret it creatively — "cats in space" becomes "Cosmic Kittens", astronaut cats
dodging asteroids. If they gave nothing, invent something unexpected. Think memes, absurd mashups,
viral nonsense. Be specific: not "animal runner" but "Rooftop Run".

Never a tech, developer, or coding theme.

## 3. Write `theme.js`

One file in the working directory declaring `const THEME = { ... }`. Set `gameId: 'GENERATED'` — the
build script replaces it with a real UUID.

Two halves, and they want different things from you:

**The drawing is yours entirely.** Every sprite, written with canvas primitives: the character, 3–4
obstacles, 2–3 power-ups, 2 parallax layers, the ground. This is where the game gets an identity.
Spend your effort here. Silhouettes must read at speed — a player only gets the shape.

**The rhythm is a composition, not an invention.** Pick 5–7 patterns that suit your theme and weight
them. Spacing, difficulty ramp, rest and fairness are all handled; you cannot build an unfair level
out of these pieces, so push as hard as the theme deserves.

Take the palette and the sounds from the library rather than hand-picking values.

## 4. Validate

```
node ${CLAUDE_SKILL_DIR}/scripts/validate.js theme.js
```

Fix every error and re-run until it passes.

## 5. Build and open

```
node ${CLAUDE_SKILL_DIR}/scripts/build.js theme.js -o index.html
open index.html
```

## 6. Optional: playtest

```
node ${CLAUDE_SKILL_DIR}/scripts/playtest.js index.html
```

Plays the real game a few hundred times with two bots and reports on whether it is any *fun* —
skill gap, decision density, rest, vocabulary. It cannot report unfairness, because the library
makes unfairness unrepresentable. Worth running if the user asks for tuning, or if you want to check
a bold rhythm before showing it off. Act on it by adjusting pattern weights.

Tell the user the theme name, what the obstacles and power-ups are, and that `/bored-share` will put
it online.
