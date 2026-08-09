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

Games are composed from a **tested block library**, not written from scratch. The split is
deliberate:

> **Blocks where correctness matters. Freedom where identity lives.**

A bad sprite is only ugly, so drawing is left wide open — that's where "cats in space" stops being a
reskin. A bad spawner is unplayable, so spacing, colour and sound are blocks.

**The library** (`skills/bored/lib/`) — patterns, a rhythm scheduler, bounded motion, contrast-solved
palettes, curated ZzFX sound sets. Every piece is tested against the full range of physics and speed
a theme can ask for, and composes safely in any combination.

**The engine** (`skills/bored/engine/`) — game loop, fixed-60Hz physics, collision, particles, HUD,
scoreboard. Never passes through the model, so it can't be mistyped.

**The theme** — the only file Claude writes. Sprites, obstacle shapes, and a playlist of patterns.

```
node skills/bored/scripts/validate.js theme.js   # lint against the contract
node skills/bored/scripts/build.js theme.js      # splice library + theme + engine into index.html
node skills/bored/scripts/playtest.js index.html # optional: play it 100s of times, report on fun
```

### Why it's built this way

The old spawner fired on a fixed interval and picked an obstacle at weighted random. But a jump
lasts 37 frames, and you're above a 40px obstacle for 30 of them — so two obstacles are survivable
only if they're close enough to clear in one arc, or far enough apart to land between. **Between
those is a band with no answer at all**, and at maximum speed 47% of the gaps that spawner produced
landed in it. That is the "it gets unfair when it speeds up" complaint, and no amount of tuning the
interval fixes it.

Patterns are pre-solved clusters that live entirely in one survivable regime, and the scheduler
spaces them more than a full jump apart. So the unfair case isn't caught — it's **unrepresentable**.
The same trick applies to muddy palettes and unreachable power-ups.

That moves testing off every generated game and onto the parts:

```
npm test    # 44 tests, including 500 randomly composed games
```

`theme.js` is the source of truth; `index.html` is a build artifact you can regenerate at any time.

**Requires Node 18+** when generating a game. The generated game itself has no dependencies at all —
it's one self-contained HTML file, [ZzFX](https://github.com/KilledByAPixel/ZzFX) (MIT, Frank Force)
and all.
