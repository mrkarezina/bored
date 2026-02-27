# /bored

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that generates unique, playable HTML5 endless runner games with a single command.

Every game is a self-contained `index.html` — no dependencies, no build step, no frameworks. Just open it in a browser and play.

Try games made with /bored at **[bored.run](https://bored.run)**

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

Pass a description after the command to guide the theme:

```
/bored cats in space
```

```
/bored underwater pirate adventure
```

Claude interprets your idea creatively — "cats in space" might become "Cosmic Kittens" with astronaut cats dodging asteroids.

### Default behavior

With no description, Claude invents a theme from scratch — something fun and unexpected like "Kitchen Chaos", "Neon Drift", or "Rooftop Run".

## What You Get

Every generated game includes:

- **Canvas 2D graphics** — character, obstacles, parallax backgrounds, all drawn with code
- **Physics** — variable-height jumps, double jump, ducking, fixed-timestep simulation
- **Power-ups** — shield, invincibility, 2x score, slow-mo, magnet — with a combo multiplier system
- **Procedural audio** — jump chirps, death sounds, collect jingles, and background music — all synthesized with Web Audio API
- **Particles** — dust, rings, explosions, sparkles, confetti, speed lines — object-pooled for zero GC
- **Game juice** — screen shake, squash & stretch, hit freeze, near-miss detection, floating text
- **Score tracking** — play count and all-time high tracked at [bored.run](https://bored.run)
- **Polished UI** — CSS menu overlay with backdrop blur, game-over screen with stats

Every game has a unique theme with matching visuals, sounds, and obstacles.

## Sharing

After generating a game, share it with anyone:

```
/bored-share
```

This uploads your game to [bored.run](https://bored.run) and gives you a link like:

```
https://www.bored.run/play/<gameId>
```

Playable in any browser — no install needed. Send the link to friends and compete for the all-time high.

## How It Works

The plugin has two parts:

1. **Engine template** — ~1800 lines of JavaScript organized as modular IIFEs (AudioEngine, ParticleEngine, InputHandler, HUD, ScoreboardClient, RunnerEngine, etc.) on a fixed 800x400 canvas. This code is the same for every game.

2. **THEME object** — the only part that changes per game. Contains all the visuals (`draw()` functions using Canvas 2D), obstacle definitions, power-up configs, parallax layers, color palette, difficulty curve, and sound settings. Claude fills this in based on the theme it invents.

The engine handles physics, rendering, particles, audio, input, scoring, combos, and leaderboard integration. Claude only needs to be creative with the THEME.

## Reference Docs

- [`skills/runner-engine/references/theming-guide.md`](skills/runner-engine/references/theming-guide.md) — THEME object API & creative direction
