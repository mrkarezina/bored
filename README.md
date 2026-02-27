# /bored

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that generates unique, playable HTML5 endless runner games with a single command.

Every game is a self-contained `index.html` — no dependencies, no build step, no frameworks. Just open it in a browser and play.

Try games made with /bored at **[bored.run](https://bored.run)**

## Install

In Claude Code:

```
/install-plugin bored@bored-games
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
- **Physics** — jumps, ducking, difficulty ramp
- **Power-ups** — shield, invincibility, 2x score, slow-mo, magnet with combo multiplier
- **Procedural audio** — jump chirps, collect jingles, death sounds, background beat
- **Particles** — dust, explosions, sparkles, trails, screen shake
- **Score tracking** — play count and all-time high tracked at [bored.run](https://bored.run)
- **Polished UI** — menu overlay, game-over screen with animated stats

## Sharing

After generating a game, share it:

```
/bored-share
```

Uploads your game to [bored.run](https://bored.run) and gives you a link:

```
https://www.bored.run/play/<gameId>
```

Playable in any browser. Send the link to friends and compete for the all-time high.

## How It Works

The plugin has two parts:

1. **Engine modules** — pre-built JavaScript (AudioEngine, ParticleEngine, InputHandler, HUD, Scoreboard, RunnerEngine) that handle all game logic on a fixed 800x400 canvas.

2. **THEME object** — the creative part that changes per game. Contains all visuals (`draw()` functions using Canvas 2D), obstacles, power-ups, parallax layers, colors, difficulty, and sounds. Claude writes this fresh each time.

Claude assembles both parts into a single `index.html` and opens it.
