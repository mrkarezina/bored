# Blocks

The vocabulary. Skim this; read [fundamentals.md](fundamentals.md) for why any of it is shaped this
way.

Everything here is pre-tested against the full range of physics and speed a theme can ask for, and
composes safely in any combination. You cannot build an unwinnable level or an unreadable palette
out of these pieces.

---

## Pattern — what appears

A pattern is a pre-solved cluster of obstacles. Obstacles are referred to **by name**, matching
`THEME.obstacles[].name`.

| Call | Shape | Costs |
|---|---|---|
| `Pattern.single(name)` | one obstacle | 1 |
| `Pattern.run(name, n, { gap })` | `n` of the same, jumped separately | 1 + n/2 |
| `Pattern.cluster([names], { n })` | 2–4 ground obstacles cleared in **one jump** | 2 |
| `Pattern.pair(groundName, airName)` | jump, land, duck | 2 |
| `Pattern.gauntlet(airName, n)` | 2–5 air obstacles: one sustained duck | 2 + n/2 |
| `Pattern.breather({ arcs })` | deliberate empty space | 0 |

`gap` is `'tight'` · `'even'` (default) · `'loose'`.

**`cluster` is the only one that can decline to place itself.** Obstacle width is the one thing that
is not scale-free: at speed 3 a full jump covers ~111px, so a 40px crate eats a third of it; at speed
11 the same jump covers ~407px. Three crates simply do not fit inside one arc early on. The scheduler
skips patterns that don't fit yet, so complex shapes unlock as the run speeds up — which is the
pacing you wanted anyway.

**`breather` does not go in a playlist.** Rest is inserted automatically; see `Rhythm.playlist` below.

## Rhythm — how often, and in what order

```js
Rhythm.playlist([
  [3, Pattern.single('AC unit')],
  [2, Pattern.cluster(['crate', 'AC unit'])],
  [1, Pattern.gauntlet('pigeon', 3)],
], { rest: Pattern.breather({ arcs: 3 }) })   // rest option is optional
```

Weights are relative, not probabilities. Minimum two patterns — one pattern is not a vocabulary.

Everything else is the scheduler's job and is not configurable, because each piece of it is a
fundamental rather than a taste:

- difficulty budget that climbs fast and then flattens, so cheap patterns come first
- no pattern repeats while it is in cooldown
- a breather is forced once pressure has run ~14 arcs (about 8.5s)
- every gap is spaced above a full jump arc, so nothing lands in the unwinnable band
- power-ups are placed *in* gaps, at an altitude the jump actually reaches

## Motion — how it moves

Attach to an obstacle as `motion: [ ... ]`. Composes in any combination: each block declares a bound,
bounds add, and the engine refuses to start if the total would carry an air obstacle into a ducking
player.

| Call | Does |
|---|---|
| `Motion.bob(amp, periodMs)` | rise and fall in place |
| `Motion.sway(amp, periodMs)` | side to side |
| `Motion.drift(dxPerSec, dyPerSec, { max })` | steady lean, clamped at `max` |
| `Motion.dive({ at, drop, overMs })` | holds, then descends once `at` px from the left |
| `Motion.orbit(radius, periodMs)` | circular |
| `Motion.spin(turnsPerSec)` | rotation; visual only, claims no space |
| `Motion.pulse(amount, periodMs)` | breathing scale; grows the hitbox to match |

## Palette — colour that reads

```js
const PALETTE = Palette.dusk('#2b1b3d', { accent: '#ff9f43', obstacles: 4 });
```

Families: `dusk` · `neon` · `slate` · `candy` · `deep` · `ember`. Background is optional — each family
has its own.

Returns `{ bg, text, accent, score, ground, groundLine, obstacles[], obstacle(i) }`, ready to use as
`THEME.colors`. Obstacle colours are **solved**, not picked: each clears 4.5:1 contrast against the
background and sits at least 25° of hue from the others. `obstacle(i)` wraps, so it never runs out.

## Sound — palettes, not parameters

```js
sounds: Sound.chiptune()
sounds: Sound.organic({ hit: [1.5, .1, 60, .02, .1, .4, 0, 1.5, -3] })   // override one slot
sounds: Sound.metallic({ bpm: 150 })
```

| Palette | Character |
|---|---|
| `chiptune` | bright triangle, pentatonic — the safe default |
| `organic` | low warm sine; animals, nature, anything soft |
| `metallic` | bright triangle high up, fourths; machines, cities, ice |
| `retro` | triangle in octaves and fifths; arcade without the buzz |

Slots: `jump` `collect` `hit` `nearMiss` `milestone` `beat` `lead`, plus `bpm` and `motif`.

**There are two background voices.** `beat` is the bass — root on beat one, a fifth on beat three,
half-time so it pulses instead of ticking. `lead` plays the `motif`: four bars of eighth notes given
as semitone offsets from the lead's root, `null` for a rest. Motifs are pentatonic (nothing can
clash with the bass) and more rest than note (it loops for the entire game). Override `motif` to
give a theme its own phrase:

```js
sounds: Sound.organic({ motif: [0, null, 5, null, 7, null, null, null, /* ...to a multiple of 8 */] })
```

**Do not write raw ZzFX arrays if you can avoid it.** Audio is the one axis where reasoning does not
substitute for judgement — a 20-number array cannot be evaluated by looking at it, only by hearing
it, and the first set shipped here sounded like brushes because nobody could. Every palette is now
sine or triangle only, pitched on real notes, with pitch jumps on consonant intervals; `test/sound.test.js`
renders each one to samples and asserts it actually oscillates at the pitch it claims. Override a
single slot if you must, and keep the same discipline.

---

## What the theme still owns

Everything visual, and the shape of the game's identity:

- every `draw()` — the player, each obstacle, each power-up, the parallax layers, the ground
- which obstacles exist, their names, sizes and lanes
- which patterns are in the playlist and how heavily weighted
- particle colours, the speed ramp, the palette family and background

A bad sprite is only ugly, and you can reason about geometry. That is why drawing is left wide open
while spacing, colour and sound are not.
