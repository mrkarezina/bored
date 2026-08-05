# /bored

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that generates unique, playable HTML5 endless runner games with a single command.

Every game is a self-contained `index.html` — no dependencies, no build step, no frameworks. Just open it in a browser and play.

Try games made with /bored at **[bored-claude.vercel.app](https://bored-claude.vercel.app)**

## Install

In Claude Code:

```
/plugin marketplace add mrkarezina/bored
```

```
/plugin install bored@bored-games
```

## Usage

Just type:

```
/bored
```

Claude invents a theme, draws all the sprites, writes the sounds, and outputs a single `index.html` file. Then opens it in your browser.

### Request a specific theme

```
/bored cats in space
```

```
/bored underwater pirate adventure
```

Claude interprets your idea creatively — "cats in space" might become "Cosmic Kittens" with astronaut cats dodging asteroids.

## What You Get

Every generated game includes:

- **Canvas 2D graphics** — character, obstacles, parallax backgrounds, all drawn with code
- **Tight physics** — variable jump height (tap vs hold), snappy fall gravity, hang time at apex, coyote time, input buffering
- **Satisfying death** — hit freeze, screen shake, background flash, tumble animation
- **Game feel** — squash & stretch, near-miss detection with bonus points, speed lines, running dust trail
- **Power-ups** — shield, invincibility, 2x score, slow-mo, magnet with combo multiplier
- **Procedural audio** — jump chirps, collect jingles with rising combo pitch, near-miss whoosh, death sounds, background beat
- **Particles** — dust, explosions, sparkles, trails, speed lines, screen shake
- **Score tracking** — play count and all-time high tracked at [bored-claude.vercel.app](https://bored-claude.vercel.app)
- **Polished UI** — menu overlay, game-over screen with animated stats, score lerp

## Sharing

After generating a game, share it:

```
/bored-share
```

Uploads your game to [bored-claude.vercel.app](https://bored-claude.vercel.app) and gives you a link:

```
https://bored-claude.vercel.app/play/<gameId>
```

Playable in any browser. Send the link to friends and compete for the all-time high.

## Tweaking a Game

Ask for changes in plain English — "the jump feels floaty", "make the obstacles easier to tell
apart", "this is too hard". Claude edits `theme.js` and rebuilds. The `gameId` survives a rebuild,
so the scoreboard keeps counting.

## How It Works

The plugin has two parts:

1. **Engine modules** — pre-built JavaScript (AudioEngine, ParticleEngine, InputHandler, HUD, Scoreboard, ScoreboardUI, RunnerEngine) that handle all game logic on a fixed 800x400 canvas.

2. **THEME object** — the creative part that changes per game. Contains all visuals (`draw()` functions using Canvas 2D), obstacles, power-ups, parallax layers, colors, difficulty, and sounds. Claude writes this fresh each time.

Claude writes only the theme, to `theme.js`. Two scripts do the rest:

```
node skills/bored/scripts/validate.js theme.js   # lint the theme against the engine contract
node skills/bored/scripts/build.js theme.js      # splice theme + engine into index.html
```

The engine source never passes through the model, so it can't be mistyped, and `validate.js`
catches the failure modes that actually break games — sprites that strobe, air obstacles too tall
to duck under, power-up effects that silently do nothing.

`theme.js` is the source of truth; `index.html` is a build artifact you can regenerate at any time.

**Requires Node** (18+, for `crypto.randomUUID`) when generating a game. The generated game itself
has no dependencies at all.
