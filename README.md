# /bored

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that generates unique, playable HTML5 endless runner games with a single command.

Every game is a self-contained `index.html` — no dependencies, no build step, no frameworks. Just open it in a browser and play.

Try games made with /bored at **[bored.run](https://bored.run)**

## What You Get

Type `/bored` and Claude creates a complete game with:

- **Canvas 2D graphics** — character, obstacles, parallax backgrounds, all drawn with code
- **Physics** — variable-height jumps, double jump, ducking, fixed-timestep simulation
- **Power-ups** — shield, invincibility, 2x score, slow-mo, magnet — with a combo multiplier system
- **Procedural audio** — jump chirps, death sounds, collect jingles, and background music — all synthesized with Web Audio API
- **Particles** — dust, rings, explosions, sparkles, confetti, speed lines — object-pooled for zero GC
- **Game juice** — screen shake, squash & stretch, hit freeze, near-miss detection, floating text
- **Global leaderboard** — scores submit to [bored.run](https://bored.run) automatically
- **Polished UI** — CSS menu overlay with backdrop blur, game-over screen with animated leaderboard, HTML name input

Every game has a unique theme — "Neon Drift", "Kitchen Chaos", "Rooftop Run", "Cosmic Surfer" — with matching visuals, sounds, and obstacles.

## Install

### From the marketplace

In Claude Code:

```
/plugin marketplace add mrkarezina/bored
```

Then install the plugin:

```
/plugin install bored@bored-games
```

### Manual

Clone the repo and point Claude Code at it:

```bash
git clone https://github.com/mrkarezina/bored.git
claude --plugin-dir ./bored
```

## Usage

Just type:

```
/bored
```

Claude invents a theme, draws all the sprites, writes the sounds, and outputs a single `index.html` file. Then opens it in your browser.

That's it. Play the game, share the file, challenge your friends on the leaderboard.

## How It Works

The plugin has two parts:

1. **Engine template** — ~1800 lines of JavaScript organized as modular IIFEs (AudioEngine, ParticleEngine, InputHandler, HUD, ScoreboardClient, RunnerEngine, etc.) on a fixed 800x400 canvas. This code is the same for every game.

2. **THEME object** — the only part that changes per game. Contains all the visuals (`draw()` functions using Canvas 2D), obstacle definitions, power-up configs, parallax layers, color palette, difficulty curve, and sound settings. Claude fills this in based on the theme it invents.

The engine handles physics, rendering, particles, audio, input, scoring, combos, and leaderboard integration. Claude only needs to be creative with the THEME.

## Leaderboard

Every generated game connects to [bored.run](https://bored.run) for global score tracking. Players enter their name once (saved in localStorage), and scores are submitted automatically on game over. The game-over screen shows the top 10 scores for that specific game.

Each game gets a unique UUID, so every `/bored` invocation creates its own leaderboard.

## Reference Docs

- [`skills/runner-engine/references/engine-template.md`](skills/runner-engine/references/engine-template.md) — Complete engine code
- [`skills/runner-engine/references/theming-guide.md`](skills/runner-engine/references/theming-guide.md) — THEME object API reference
- [`skills/runner-engine/references/audio-cookbook.md`](skills/runner-engine/references/audio-cookbook.md) — Procedural sound recipes
- [`examples/sample-game.html`](examples/sample-game.html) — Sample game (Neon Drift theme)
