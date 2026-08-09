const { test } = require('node:test');
const assert = require('node:assert');
const { envFor, pairIsSurvivable } = require('./helpers');

/**
 * COMPOSITION FUZZ.
 *
 * Everything else in this suite tests blocks one family at a time. This tests
 * the claim the whole library rests on: that ANY combination of them composes
 * into a game that works. Pairwise interaction bugs — a bobbing bird inside a
 * gauntlet, a cluster of wide obstacles at low speed — are exactly the class of
 * thing per-block tests cannot see.
 *
 * Random themes, random playlists, random physics, played forward through a
 * full speed ramp. Deterministic: a failure prints the seed that produced it.
 */

const FPS = 60;
const CASES = 500;
const RUN_SECONDS = 90;

function makeTheme(rand) {
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const between = (lo, hi) => lo + rand() * (hi - lo);

  const player = {
    width: Math.round(between(26, 38)),
    height: Math.round(between(40, 54)),
    jumpForce: -between(10, 16),
    gravity: between(0.45, 1.05),
  };
  player.duckHeight = Math.round(player.height * between(0.42, 0.58));

  const env = envFor(player);

  // Obstacle sizes are drawn inside what the physics can actually handle; a
  // theme that asks for something unclearable is a different test.
  const groundCount = 2 + Math.floor(rand() * 3);
  const obstacles = [];
  for (let i = 0; i < groundCount; i++) {
    obstacles.push({
      name: `g${i}`,
      type: 'ground',
      width: Math.round(between(20, 52)),
      height: Math.round(between(18, Math.min(70, env.peak * 0.8))),
    });
  }

  const airCount = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < airCount; i++) {
    const motions = [];
    // Motion has to be paid for out of the duck clearance budget.
    const budget = (env.maxAirHeight - 14) / 2;
    if (rand() < 0.5 && budget > 2) motions.push(Motion.bob(Math.min(budget, between(2, 8)), between(600, 1400)));
    if (rand() < 0.3) motions.push(Motion.spin(between(0.2, 1)));
    if (rand() < 0.3) motions.push(Motion.sway(between(4, 14), between(800, 1600)));

    const swept = Motion.boundsOf(motions, { width: 30, height: 14 }).dy * 2;
    obstacles.push({
      name: `a${i}`,
      type: 'air',
      width: Math.round(between(22, 40)),
      height: Math.max(10, Math.round(Math.min(env.maxAirHeight - swept - 1, between(12, 26)))),
      motion: motions.length ? motions : undefined,
    });
  }

  const ground = obstacles.filter((o) => o.type === 'ground').map((o) => o.name);
  const air = obstacles.filter((o) => o.type === 'air').map((o) => o.name);

  // A random playlist, always including something that can open the game.
  const entries = [[2 + Math.floor(rand() * 3), Pattern.single(pick(ground))]];
  const pool = [
    () => [1 + Math.floor(rand() * 3), Pattern.run(pick(ground), 2 + Math.floor(rand() * 4), { gap: pick(['tight', 'even', 'loose']) })],
    () => [1 + Math.floor(rand() * 2), Pattern.cluster([pick(ground), pick(ground)])],
    () => [1 + Math.floor(rand() * 2), Pattern.cluster([pick(ground), pick(ground), pick(ground)])],
    () => [1 + Math.floor(rand() * 2), Pattern.pair(pick(ground), pick(air))],
    () => [1, Pattern.gauntlet(pick(air), 2 + Math.floor(rand() * 4))],
  ];
  const extra = 2 + Math.floor(rand() * 4);
  for (let i = 0; i < extra; i++) entries.push(pick(pool)());

  const startSpeed = between(3, 5);
  return {
    player, env, obstacles,
    // Rest length varies, but it is always the scheduler's to insert.
    playlist: Rhythm.playlist(entries, { rest: Pattern.breather({ arcs: between(1.8, 3.5) }) }),
    startSpeed,
    maxSpeed: startSpeed + between(4, 8),
  };
}

test(`${CASES} random compositions all produce a playable level`, () => {
  let checkedGaps = 0;

  for (let c = 0; c < CASES; c++) {
    const seed = 90000 + c;
    const rand = Vendor.rng(seed);
    let theme;

    try {
      theme = makeTheme(rand);
    } catch (e) {
      assert.fail(`seed ${seed}: building the theme threw — ${e.message}`);
    }

    const { env, obstacles, playlist, startSpeed, maxSpeed } = theme;

    let s;
    try {
      s = Rhythm.scheduler({ playlist, env, obstacles, powerups: [], seed });
      s.validate(startSpeed);
    } catch (e) {
      assert.fail(`seed ${seed}: scheduler rejected a legal composition — ${e.message}`);
    }

    // Every air obstacle must remain duckable with its motion applied. This is
    // the interaction that per-family tests cannot catch.
    for (const o of obstacles.filter((x) => x.type === 'air')) {
      const swept = o.height + Motion.boundsOf(o.motion, o).dy * 2;
      assert.ok(swept <= env.maxAirHeight,
        `seed ${seed}: air obstacle ${o.name} sweeps ${swept.toFixed(1)}px past the ${env.maxAirHeight}px duck band`);
    }

    const events = [];
    const bonus = maxSpeed - startSpeed;
    let distance = 0;
    try {
      for (let f = 0; f < RUN_SECONDS * FPS; f++) {
        const t = f / FPS;
        const speed = startSpeed + bonus * (1 - Math.exp(-t * (0.05 / bonus)));
        distance += speed;
        for (const ev of s.update(distance, speed, t)) events.push({ ...ev, speed });
      }
    } catch (e) {
      assert.fail(`seed ${seed}: scheduling threw mid-run — ${e.message}`);
    }

    assert.ok(events.length > 20, `seed ${seed}: only ${events.length} events in ${RUN_SECONDS}s`);

    const ground = events
      .filter((e) => e.kind === 'obstacle' && e.def.type === 'ground')
      .sort((a, b) => a.worldX - b.worldX);

    for (let i = 1; i < ground.length; i++) {
      const a = { at: ground[i - 1].worldX, width: ground[i - 1].def.width, height: ground[i - 1].def.height };
      const b = { at: ground[i].worldX, width: ground[i].def.width, height: ground[i].def.height };
      checkedGaps++;
      assert.ok(pairIsSurvivable(env, ground[i].speed, a, b),
        `seed ${seed}: ${(b.at - a.at).toFixed(0)}px between ${ground[i - 1].name} and ${ground[i].name} ` +
        `at speed ${ground[i].speed.toFixed(1)} is unwinnable ` +
        `(one-jump ceiling ${env.clearSpan(Math.max(a.height, b.height), ground[i].speed).toFixed(0)}px, ` +
        `land-between floor ${env.span(ground[i].speed).toFixed(0)}px)`);
    }
  }

  assert.ok(checkedGaps > 20000, `expected a broad sweep, only checked ${checkedGaps} gaps`);
});
