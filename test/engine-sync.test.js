const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
require('./helpers');

const { makeEnv } = require('../skills/bored/scripts/dom-stub');

/**
 * THE SEAM BETWEEN lib/ AND engine/.
 *
 * `lib/envelope.js` decides how far apart obstacles have to be, and it does that
 * by simulating the jump. `engine/runner-engine.js` actually runs the jump. The
 * two contain the same three gravity multipliers — 2.0 falling, 1.8 on early
 * release, 0.5 at the apex — written out twice.
 *
 * That duplication is deliberate: the engine must not depend on the library for
 * something in its hot loop, and the library must be testable without a browser.
 * But it means a change to one silently invalidates every spacing decision made
 * by the other, and a comment asking people not to do that is not a control.
 *
 * So this test boots the REAL engine in a stubbed DOM, makes it jump, measures
 * the arc it actually produces, and asserts the library predicted it exactly.
 * If anyone edits updatePlayer(), this fails.
 */

const SKILL = path.resolve(__dirname, '..', 'skills', 'bored');
const LIB_FILES = ['vendor.js', 'envelope.js', 'patterns.js', 'rhythm.js', 'motion.js', 'palette.js', 'sound.js'];
const ENGINE_FILES = ['audio-engine.js', 'particle-engine.js', 'input-handler.js', 'hud.js',
  'scoreboard-client.js', 'scoreboard-ui.js', 'runner-engine.js'];

/** Assemble the same bundle build.js produces, without needing a built file. */
function bundle(themeSrc) {
  const read = (dir, f) => fs.readFileSync(path.join(SKILL, dir, f), 'utf8');
  return [
    ...LIB_FILES.map((f) => read('lib', f)),
    themeSrc,
    ...ENGINE_FILES.map((f) => read('engine', f)),
    'globalThis.__THEME = THEME; globalThis.__ENGINE = RunnerEngine;',
  ].join('\n\n');
}

const THEME_SRC = fs.readFileSync(path.join(SKILL, 'references', 'example-theme.js'), 'utf8');

/**
 * Boot the game, hold jump, and record the player's altitude at each PHYSICS
 * STEP until they land again.
 *
 * Sampling per rendered frame does not work: the fixed-timestep accumulator
 * occasionally carries time across a frame, so one rAF can produce zero steps
 * and the altitude reads twice. getFrame() counts steps, which is what the
 * envelope simulates.
 */
function measureJump(holdFrames) {
  const env = makeEnv();
  const context = vm.createContext(env.sandbox);
  vm.runInContext(bundle(THEME_SRC), context, { filename: 'sync.test' });

  const THEME = env.sandbox.__THEME;
  const ENGINE = env.sandbox.__ENGINE;
  THEME.seed = 1;

  const groundY = THEME.player.groundY;
  let playerY = groundY;
  const inner = THEME.player.draw;
  THEME.player.draw = function (ctx, x, y, frame, state) {
    playerY = y;
    inner.call(this, ctx, x, y, frame, state);
  };

  ENGINE.start(THEME);
  env.step();
  env.fire('keydown', { code: 'Space' });   // starts the game
  env.fire('keyup', { code: 'Space' });
  env.step();

  // Now airborne-capable. Jump for real.
  const startStep = ENGINE.getFrame();
  env.fire('keydown', { code: 'Space' });

  const altitudes = [];
  let released = false;
  let lastStep = startStep;

  for (let i = 0; i < 800; i++) {
    if (!released && altitudes.length >= holdFrames) {
      env.fire('keyup', { code: 'Space' });
      released = true;
    }
    env.step();

    const step = ENGINE.getFrame();
    if (step === lastStep) continue;      // this rAF ran no physics
    lastStep = step;

    // The engine clamps the player to the ground on landing; the library's
    // simulation lets the final step overshoot below zero. Both count that step
    // as the last one of the jump, so record it and stop.
    const altitude = groundY - playerY;
    altitudes.push(altitude);
    if (altitude <= 0) break;
    if (ENGINE.getState() !== ENGINE.STATE.PLAYING) break;   // hit something
  }

  return {
    frames: altitudes.length,
    peak: Math.max(...altitudes),
    altitudes,
    player: THEME.player,
  };
}

test('the engine produces exactly the jump the library predicts', () => {
  const measured = measureJump(9999);
  const predicted = Envelope.compute(measured.player);

  assert.strictEqual(measured.frames, predicted.frames,
    `airtime drifted: the engine took ${measured.frames} frames, envelope.js predicts ${predicted.frames}. ` +
    `updatePlayer() and envelope.js simulate() have diverged, and every gap in every generated ` +
    `game is now spaced by the wrong number.`);

  assert.ok(Math.abs(measured.peak - predicted.peak) < 0.5,
    `apex drifted: engine reached ${measured.peak.toFixed(2)}px, envelope.js predicts ${predicted.peak.toFixed(2)}px`);
});

test('a clipped jump matches too, so the variable-height code is in sync', () => {
  // The 1.8x early-release multiplier only fires on a short hold. A full-hold
  // test alone would never exercise it.
  const measured = measureJump(Envelope.TAP_FRAMES);
  const predicted = Envelope.compute(measured.player);

  assert.strictEqual(measured.frames, predicted.tapFrames,
    `tap airtime drifted: engine ${measured.frames} frames, envelope.js predicts ${predicted.tapFrames}`);
});

test('the altitude curve matches frame by frame, not just at the ends', () => {
  // Same total airtime with a different shape would still break clearFrames(),
  // which is what decides whether a cluster fits inside one arc.
  const measured = measureJump(9999);
  const predicted = Envelope.compute(measured.player);

  for (const h of [10, 20, 30, 40, 60, 80]) {
    const engineFrames = measured.altitudes.filter((a) => a > h).length;
    assert.strictEqual(engineFrames, predicted.clearFrames(h),
      `frames above ${h}px: engine ${engineFrames}, envelope.js ${predicted.clearFrames(h)}`);
  }
});

test('the engine refuses to start on an obstacle nothing can clear', () => {
  // The boot-time assertions are the other half of the contract: the library
  // guarantees spacing, the engine guarantees the pieces are reachable at all.
  const broken = THEME_SRC.replace(
    "name: 'chimney', type: 'ground', width: 26, height: 52,",
    "name: 'chimney', type: 'ground', width: 26, height: 300,"
  );
  assert.notStrictEqual(broken, THEME_SRC, 'fixture did not patch — example theme changed shape');

  const env = makeEnv();
  const context = vm.createContext(env.sandbox);
  vm.runInContext(bundle(broken), context, { filename: 'sync.test' });
  assert.throws(
    () => env.sandbox.__ENGINE.start(env.sandbox.__THEME),
    /Nothing clears it/,
  );
});

test('a real game runs for two minutes without throwing', () => {
  const env = makeEnv();
  const context = vm.createContext(env.sandbox);
  vm.runInContext(bundle(THEME_SRC), context, { filename: 'sync.test' });

  const ENGINE = env.sandbox.__ENGINE;
  env.sandbox.__THEME.seed = 99;
  ENGINE.start(env.sandbox.__THEME);
  env.step();
  env.fire('keydown', { code: 'Space' });
  env.fire('keyup', { code: 'Space' });

  // Idle: never press anything. The player dies almost immediately and the
  // engine has to keep running cleanly through death, game-over and menu.
  for (let f = 0; f < 120 * 60; f++) env.step();
  assert.ok(true, 'survived two minutes of wall clock without an exception');
});
