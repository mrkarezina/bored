# Design Guide

What to build and why. For the mechanical contract — key names, types, ranges — see
[theme-api.md](theme-api.md).

## Pick a theme

Every invocation should feel like a different game. Never use a tech, developer, or coding theme.
Think memes, viral trends, absurd mashups. Be specific — not "animal runner" but "Rooftop Run".

| Theme | Character | Ground obstacles | Air obstacles | Power-ups | Background |
|-------|-----------|------------------|---------------|-----------|------------|
| **Cosmic Surfer** | Astronaut on a hoverboard | Asteroids, black holes | Satellites, debris | Star shield, warp speed | Nebula, planet silhouettes |
| **Kitchen Chaos** | Running sushi roll | Knife chops, fire bursts | Flying pans, steam | Wasabi boost, soy shield | Counter with ingredients |
| **Neon Drift** | Glowing geometric shape | Neon barriers, laser walls | Floating cubes, pulse rings | Bass drop, double beat | Synthwave grid |
| **Ocean Escape** | Surfing penguin | Coral, icebergs, sharks | Seagulls, fishing nets | Tidal wave, fish frenzy | Deep ocean, sun rays |
| **Candy Rush** | Gummy bear | Jawbreakers, licorice walls | Floating lollipops | Sugar rush, chocolate shield | Frosting landscape |
| **Rooftop Run** | Parkour cat | AC units, chimneys, gaps | Clotheslines, birds | Catnip magnet, nine lives | City rooftops at sunset |
| **Prehistoric Sprint** | Baby dinosaur | Boulders, lava pools | Pterodactyls, falling rocks | Volcano boost, egg shield | Jungle with volcanoes |
| **Haunted Library** | Flying book | Candles, spider webs | Bats, floating skulls | Invisibility ink, speed read | Bookshelves, candlelight |
| **Arctic Dash** | Snowboarding fox | Ice spikes, snow drifts | Snowballs, icicles | Cocoa shield, aurora boost | Frozen tundra, aurora |
| **Disco Fever** | Roller skater | Disco balls, speakers | Laser beams, mirror balls | Funk shield, groove boost | Dance floor lights |

Every element should tell the same story: the character, the hazards, the power-up names, the
particle colours, the sound palette.

## The play area is sacred

**Two parallax layers, never three.** A far layer for sky or atmosphere (`speed` 0.15–0.25) and a
mid layer for terrain silhouettes (`speed` 0.3–0.5). That is the ceiling.

A third foreground layer was tried and removed: at speed, decoration and hazards blurred into one
another and the game read as chaotic rather than challenging. Backgrounds create atmosphere;
nothing decorative belongs where gameplay happens.

- Background colours stay dark and desaturated so they recede.
- Obstacles are warm and saturated with a 2–2.5px outline so they pop.
- Ground is one flat colour with a single bright accent line — no grass tufts, no pebbles.

## Shape communicates function

**3–4 obstacle types, maximum.** Each must be identifiable from its silhouette alone at speed,
because that is all the player gets. Shape tells them what to do before they can process detail:

| Silhouette | Reads as | Action |
|---|---|---|
| Tall narrow rectangle | Wall | Full committed jump |
| Triangle cluster | Spikes | Medium jump |
| Wide low oval | Log | Quick hop |
| Circle or bar overhead | Hazard in the air | Duck |

Give each type a different shape *and* a different colour. Two obstacles that share a silhouette
are one obstacle with extra steps.

## Physics: deliberate, not frantic

Snappy defaults (`jumpForce: -14`, `gravity: 0.8`) technically respond fine but feel like panic.
Floatier arcs give the player time to read what is coming:

```js
jumpForce: -12.5,
gravity: 0.65,
```

The engine already supplies variable jump height, coyote time, and input buffering. The theme's
job is only to set an arc the player can learn. Predictable arcs build muscle memory — the player
should be able to think "this height clears the spikes" and be right every time.

## Pacing: earn the difficulty

The first thirty seconds should feel relaxed and inviting. A player who feels competent before
the game gets hard stays; one who dies in the first ten seconds does not.

```js
difficulty: {
  startSpeed: 3,
  maxSpeed: 11,             // the cap should stay playable, not become impossible
  speedRampPerSecond: 0.025,
  startSpawnInterval: 2000,
  minSpawnInterval: 650,
  spawnRampPerSecond: -5,
}
```

The engine's ramp is logarithmic, so difficulty climbs fast at first and then flattens. That
avoids the "impossible wall" while still leaving long-term challenge.

## Audio sets the mood

The engine reads four values from `THEME.sounds` — `jumpFreqs`, `collectFreqs`, `hitFreq`,
`bgBPM` — and synthesises everything from them. It does not call custom sound functions, so do
not write any.

- `jumpFreqs: [startHz, endHz]` — ascending is cheerful, descending is heavy. `[180, 440]` reads
  warm; `[200, 500]` reads bright.
- `collectFreqs` — make it a pleasant chord. `[440, 554, 659]` is an A major triad. Arbitrary
  frequencies sound like a placeholder beep.
- `hitFreq` — 60–120Hz. Lower is heavier.
- `bgBPM` — 100–110 feels relaxed and groovy, 130+ feels urgent. Match it to the theme.

## Before you ship

Run `scripts/validate.js`. It catches the failure modes that have actually shipped: missing colour
keys, typo'd power-up effects, `Math.random()` inside `draw()` that makes sprites strobe, and air
obstacles too tall to duck under.

[example-theme.js](example-theme.js) is a complete theme that follows every rule on this page.

## Remember

- Optimise for fun and visual delight.
- Make players want to show it to a friend.
- The weirder and more creative, the better.
