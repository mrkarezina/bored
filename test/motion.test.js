const { test } = require('node:test');
const assert = require('node:assert');
require('./helpers');

const OBS = () => ({ width: 40, height: 30, phase: 0.37, screenX: 900, baseY: 200 });

const ALL = () => ({
  bob: [Motion.bob(8, 900)],
  sway: [Motion.sway(10, 1200)],
  drift: [Motion.drift(0, 25, { max: 30 })],
  orbit: [Motion.orbit(12, 1400)],
  spin: [Motion.spin(0.5)],
  pulse: [Motion.pulse(0.12, 800)],
  dive: [Motion.dive({ at: 320, drop: 40, overMs: 400 })],
});

/** Drive a motion list for long enough to reach any extreme it has. */
function sweep(list, frames = 3000) {
  const obs = OBS();
  let maxDx = 0, maxDy = 0;
  for (let f = 0; f < frames; f++) {
    obs.screenX = 900 - f * 0.5;   // travels the whole screen and beyond
    const r = Motion.applyAll(list, obs, f);
    maxDx = Math.max(maxDx, Math.abs(r.dx));
    maxDy = Math.max(maxDy, Math.abs(r.dy));
    if (r.scale !== 1) {
      // A sprite drawn larger occupies more space than its nominal box, and the
      // bound has to account for that or the drawing outgrows the hitbox.
      maxDx = Math.max(maxDx, Math.abs((obs.width * (r.scale - 1)) / 2));
      maxDy = Math.max(maxDy, Math.abs((obs.height * (r.scale - 1)) / 2));
    }
  }
  return { maxDx, maxDy };
}

/**
 * THE COMPOSITION LAW. Displacement never exceeds the declared bound, which is
 * what lets the engine and the pattern fit rules reason about worst cases by
 * arithmetic instead of by simulation.
 */
test('every motion stays inside its declared bound', () => {
  for (const [name, list] of Object.entries(ALL())) {
    const bound = Motion.boundsOf(list, OBS());
    const { maxDx, maxDy } = sweep(list);
    assert.ok(maxDx <= bound.dx + 1e-6, `${name}: dx reached ${maxDx.toFixed(2)}, bound ${bound.dx}`);
    assert.ok(maxDy <= bound.dy + 1e-6, `${name}: dy reached ${maxDy.toFixed(2)}, bound ${bound.dy}`);
  }
});

test('bounds add when motions are composed, in any combination', () => {
  const all = ALL();
  const names = Object.keys(all);
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const list = [...all[names[i]], ...all[names[j]]];
      const bound = Motion.boundsOf(list, OBS());
      const { maxDx, maxDy } = sweep(list);
      assert.ok(maxDx <= bound.dx + 1e-6,
        `${names[i]}+${names[j]}: dx reached ${maxDx.toFixed(2)}, bound ${bound.dx.toFixed(2)}`);
      assert.ok(maxDy <= bound.dy + 1e-6,
        `${names[i]}+${names[j]}: dy reached ${maxDy.toFixed(2)}, bound ${bound.dy.toFixed(2)}`);
    }
  }
});

test('all seven at once still respects the summed bound', () => {
  const list = Object.values(ALL()).flat();
  const bound = Motion.boundsOf(list, OBS());
  const { maxDx, maxDy } = sweep(list);
  assert.ok(maxDx <= bound.dx + 1e-6 && maxDy <= bound.dy + 1e-6,
    `reached ${maxDx.toFixed(2)}/${maxDy.toFixed(2)} against ${bound.dx.toFixed(2)}/${bound.dy.toFixed(2)}`);
});

test('motion is a pure function of obstacle and frame', () => {
  // Purity is what keeps a long motion list off the allocation path, and what
  // makes the sweep above a proof rather than a sample.
  const list = [Motion.bob(8, 900), Motion.orbit(12, 1400), Motion.spin(0.5)];
  const a = Motion.applyAll(list, OBS(), 137);
  const b = Motion.applyAll(list, OBS(), 137);
  assert.deepStrictEqual(a, b);
});

test('drift stops at its clamp instead of wandering off', () => {
  const list = [Motion.drift(0, 100, { max: 20 })];
  const obs = OBS();
  const late = Motion.applyAll(list, obs, 100000);
  assert.ok(Math.abs(late.dy) <= 20 + 1e-9, `drift reached ${late.dy}`);
});

test('phase separates instances so they do not move in lockstep', () => {
  const list = [Motion.bob(8, 900)];
  const a = Motion.applyAll(list, { ...OBS(), phase: 0.0 }, 40);
  const b = Motion.applyAll(list, { ...OBS(), phase: 0.5 }, 40);
  assert.notStrictEqual(a.dy, b.dy);
});

test('spin is visual only and claims no space', () => {
  const bound = Motion.boundsOf([Motion.spin(1)], OBS());
  assert.deepStrictEqual(bound, { dx: 0, dy: 0 });
});

test('an empty or missing motion list is inert', () => {
  assert.deepStrictEqual(Motion.boundsOf(null, OBS()), { dx: 0, dy: 0 });
  assert.deepStrictEqual(Motion.applyAll([], OBS(), 5), { dx: 0, dy: 0, rotate: 0, scale: 1 });
});
