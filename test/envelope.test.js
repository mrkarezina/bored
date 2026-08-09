const { test } = require('node:test');
const assert = require('node:assert');
const { PHYSICS, SPEEDS, envFor } = require('./helpers');

test('reproduces the engine physics it is meant to mirror', () => {
  // These are the guide's defaults, and the numbers the whole library is
  // calibrated against. If runner-engine's updatePlayer() ever drifts from this
  // simulation, every spacing decision downstream is quietly wrong — so the
  // values are pinned here deliberately.
  const env = envFor(PHYSICS[0]);
  assert.strictEqual(env.frames, 37, 'full-hold airtime in frames');
  assert.strictEqual(env.clearFrames(40), 30, 'frames spent above a 40px obstacle');
  assert.ok(Math.abs(env.peak - 115.6) < 0.5, `peak was ${env.peak}`);
  assert.ok(env.tapFrames < env.frames, 'a tap must be shorter than a full hold');
});

test('refuses physics that cannot produce a playable arc', () => {
  assert.throws(() => envFor({ jumpForce: 12.5, gravity: 0.65 }), /must be negative/);
  assert.throws(() => envFor({ jumpForce: -12.5, gravity: 0 }), /must be positive/);
  assert.throws(() => envFor({ jumpForce: -12.5 }), /numeric jumpForce and gravity/);
});

test('the unwinnable band is real and correctly ordered at every speed', () => {
  for (const p of PHYSICS) {
    const env = envFor(p);
    for (const speed of SPEEDS) {
      const band = env.band(40, speed);
      assert.ok(band.low < band.high,
        `${p.name} @${speed}: band should be non-empty, got ${band.low}-${band.high}`);
      assert.strictEqual(band.high, env.span(speed), 'band ceiling is one full arc');
    }
  }
});

test('arc units are speed-invariant, which is what makes patterns portable', () => {
  for (const p of PHYSICS) {
    const env = envFor(p);
    const ratios = SPEEDS.map((s) => env.toArcs(env.clearSpan(40, s), s));
    const spread = Math.max(...ratios) - Math.min(...ratios);
    assert.ok(spread < 1e-9, `${p.name}: clearance ratio varied by ${spread} across speeds`);
  }
});

test('arc shape barely moves across the whole physics range', () => {
  // This is the load-bearing assumption behind authoring in arc units at all:
  // a cluster written for one theme's jump is still correct for another's.
  const ratios = PHYSICS.map((p) => {
    const env = envFor(p);
    return env.clearFrames(env.peak * 0.35) / env.frames;
  });
  const spread = Math.max(...ratios) - Math.min(...ratios);
  assert.ok(spread < 0.06, `arc shape varied by ${spread.toFixed(3)} across physics; SAFETY margin assumes ~0.03`);
});

test('riseFrames gives the lead time needed to clear a given height', () => {
  const env = envFor(PHYSICS[0]);
  assert.ok(env.riseFrames(10) < env.riseFrames(80), 'higher obstacles need more lead');
  assert.strictEqual(env.riseFrames(env.peak + 1), Infinity, 'nothing clears above the apex');
});

test('maxAirHeight matches the engine collision arithmetic', () => {
  for (const p of PHYSICS) {
    const env = envFor(p);
    // The engine centres air obstacles in the duck clearance band and applies
    // 4px of padding per side, in the player's favour.
    assert.strictEqual(env.maxAirHeight, (p.height - p.duckHeight) + 16);
  }
});
