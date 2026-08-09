#!/usr/bin/env node
/**
 * playtest.js — play the game a few hundred times and report on whether it is
 * any fun.
 *
 *   node playtest.js <index.html> [--runs 20] [--seconds 120]
 *
 * This is NOT a correctness gate. Correctness is structural: the pattern library
 * cannot express an unwinnable gap and the palette cannot express an unreadable
 * colour, so there is nothing here to catch. What it reports on instead are the
 * things a designer would say out loud — is there any rest in this, does it use
 * its whole vocabulary, is there room between surviving and playing well.
 *
 * HOW IT WORKS
 *
 * The built game runs unmodified in a stubbed DOM. That matters: input-handler
 * binds to `document`, so a stubbed document drives the REAL input path,
 * including coyote time and jump buffering. The bot is playing the same game a
 * person would, not a simulation of it.
 *
 * World state is harvested for free by wrapping each obstacle's draw(), which
 * the engine calls every frame with the exact on-screen position.
 *
 * TWO BOTS
 *
 * One times every input perfectly. The other has human timing jitter — it
 * commits a few frames early or late, at random, every single time. The gap
 * between their survival is the difficulty rating: a small gap means the level
 * is forgiving, a large one means it demands precision.
 *
 * Note it is jitter and NOT reaction latency that models a player here. The
 * scheduler builds the world ~900px ahead of an 800px screen, so every obstacle
 * is on screen for at least 70 frames before it matters — far longer than the
 * ~250ms a human needs to notice it. Reaction time is simply not the binding
 * constraint in a runner; precision is. Modelling it as latency just makes the
 * bot jump late by a fixed amount every time, which measures nothing about the
 * level.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FPS = 60;
const STEP_MS = 1000 / 60;
/** Human timing spread: inputs land within about +/-130ms of the intent. */
const HUMAN_JITTER_FRAMES = 8;

function die(msg) {
  console.error(`playtest: ${msg}`);
  process.exit(1);
}

const { makeEnv } = require('./dom-stub');

// ------------------------------------------------------------------- runner ----

function extractBundle(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const bundle = blocks.find((b) => b.includes('RunnerEngine.start'));
  if (!bundle) die(`no engine bundle found in ${htmlPath}`);
  return bundle;
}

/**
 * Run one game to death (or to the time limit) and return what happened.
 */
function playOne(bundle, { seed, jitter, maxSeconds }) {
  const env = makeEnv();
  const context = vm.createContext(env.sandbox);

  // Defer boot so the theme can be instrumented first, and pin the seed so a
  // failing run can be replayed exactly.
  const src = bundle.replace(/RunnerEngine\.start\(THEME\);?/, '')
    + '\n;globalThis.__THEME = THEME; globalThis.__ENGINE = RunnerEngine;';

  try {
    vm.runInContext(src, context, { filename: 'game.html' });
  } catch (e) {
    return { error: `bundle failed to load: ${e.message}` };
  }

  const THEME = env.sandbox.__THEME;
  const ENGINE = env.sandbox.__ENGINE;
  THEME.seed = seed;

  // Harvest the world by wrapping draw(). The engine calls these every frame
  // with exact on-screen coordinates, so this costs nothing and cannot drift
  // from what is really there.
  let visible = [];
  let player = null;
  for (const o of THEME.obstacles) {
    const inner = o.draw;
    o.draw = function (ctx, x, y, frame) {
      visible.push({ name: o.name, type: o.type, x, y, w: o.width, h: o.height });
      inner.call(this, ctx, x, y, frame);
    };
  }
  const pInner = THEME.player.draw;
  THEME.player.draw = function (ctx, x, y, frame, state) {
    player = { x, y, state, w: THEME.player.width, h: THEME.player.height };
    pInner.call(this, ctx, x, y, frame, state);
  };

  let envelope;
  try {
    envelope = Envelope.compute(THEME.player);
  } catch (e) {
    return { error: e.message };
  }

  try {
    ENGINE.start(THEME);
  } catch (e) {
    return { error: `start() threw: ${e.message}` };
  }

  env.step();                                   // render the menu
  env.fire('keydown', { code: 'Space' });        // begin
  env.fire('keyup', { code: 'Space' });

  // Seeded so a run is reproducible: the same seed replays the same mistakes.
  const wobble = Vendor.rng(seed ^ 0x5eed);
  const jitterPx = (speed) => (jitter ? (wobble() - 0.5) * 2 * jitter * speed : 0);

  let jumping = false, ducking = false, holdFor = 0;
  let frames = 0, deaths = null;
  const maxFrames = maxSeconds * FPS;
  const seenPatterns = new Set();

  /**
   * Rest is measured as the interval between inputs the player is actually
   * required to make, not as empty screen. At low speed a two-and-a-half arc
   * breather is narrower than the 800px canvas, so there is always something in
   * view even when there is nothing to do — screen emptiness measures the
   * camera, decision spacing measures the game.
   */
  const actionFrames = [];

  while (frames < maxFrames) {
    visible = [];
    env.step();
    frames++;

    if (ENGINE.getState() !== ENGINE.STATE.PLAYING) {
      deaths = { frame: frames };
      break;
    }

    const known = visible;
    if (player) for (const o of known) seenPatterns.add(o.name);

    const px = player ? player.x : 80;
    const pw = THEME.player.width;

    // The world's current speed, from the engine's own ramp. Needed because
    // every lead time below is a distance, and distance per frame IS the speed.
    const d = THEME.difficulty;
    const bonus = d.maxSpeed - d.startSpeed;
    const speed = d.startSpeed + bonus * (1 - Math.exp(-(frames / FPS) * (d.speedRampPerSecond / bonus)));

    // Nearest thing still ahead of us.
    let ground = null, air = null;
    for (const o of known) {
      const gap = o.x - (px + pw);
      // Still a threat until its trailing edge has cleared the player's leading
      // edge — the player is a box, not a point. Dropping it at gap < -width
      // makes the bot stand up into a bird it has already successfully ducked.
      if (gap < -(o.w + pw)) continue;
      if (o.type === 'ground' && (!ground || gap < ground.gap)) ground = { ...o, gap };
      if (o.type === 'air' && (!air || gap < air.gap)) air = { ...o, gap };
    }

    // Jump early enough to be above it by the time it arrives. riseFrames() is
    // exactly that lead time, straight out of the same envelope the level was
    // built from, and multiplying by speed turns it into a distance.
    //
    // The hold is the FULL arc, always. Patterns are authored against a
    // full-hold jump — that is what one "arc unit" means — so a bot that lets
    // go early is not playing the game the level was designed for.
    if (ground && !jumping) {
      const leadPx = envelope.riseFrames(ground.h) * speed + jitterPx(speed);
      if (ground.gap <= leadPx && ground.gap > -ground.w) {
        env.fire('keydown', { code: 'Space' });
        jumping = true;
        holdFor = envelope.frames;
        actionFrames.push(frames);
      }
    }
    if (jumping && --holdFor <= 0) {
      env.fire('keyup', { code: 'Space' });
      jumping = false;
    }

    // Duck while an air obstacle overlaps us, plus a little either side.
    const needDuck = !!(air && air.gap < 30 && air.gap > -(air.w + pw));
    if (needDuck && !ducking) {
      env.fire('keydown', { code: 'ArrowDown' });
      ducking = true;
      actionFrames.push(frames);
    }
    if (!needDuck && ducking) { env.fire('keyup', { code: 'ArrowDown' }); ducking = false; }
  }

  // Spacing between required inputs: the median is the game's pulse, the max is
  // the longest breather the player actually got.
  const spacing = [];
  for (let i = 1; i < actionFrames.length; i++) spacing.push(actionFrames[i] - actionFrames[i - 1]);

  return {
    survivedFrames: frames,
    survivedSeconds: frames / FPS,
    died: !!deaths,
    score: ENGINE.getScore ? Math.floor(ENGINE.getScore()) : 0,
    vocabulary: seenPatterns.size,
    actionsPerSecond: actionFrames.length / Math.max(1, frames / FPS),
    longestRestSeconds: spacing.length ? Math.max(...spacing) / FPS : 0,
    typicalGapSeconds: spacing.length ? median(spacing) / FPS : 0,
  };
}

// -------------------------------------------------------------------- report ----

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith('-'));
  if (!file) die('usage: node playtest.js <index.html> [--runs 20] [--seconds 120]');
  if (!fs.existsSync(file)) die(`no such file: ${file}`);

  const runs = parseInt(args[args.indexOf('--runs') + 1], 10) || 12;
  const seconds = parseInt(args[args.indexOf('--seconds') + 1], 10) || 90;

  // The library has to exist out here too, for the bot's reachability maths.
  const LIB = path.resolve(__dirname, '..', 'lib');
  global.Vendor = require(path.join(LIB, 'vendor.js'));
  global.Envelope = require(path.join(LIB, 'envelope.js'));

  const bundle = extractBundle(file);
  const expert = [], human = [];
  let fatal = null;

  for (let i = 0; i < runs && !fatal; i++) {
    const seed = 1000 + i;
    const e = playOne(bundle, { seed, jitter: 0, maxSeconds: seconds });
    if (e.error) { fatal = e.error; break; }
    const h = playOne(bundle, { seed, jitter: HUMAN_JITTER_FRAMES, maxSeconds: seconds });
    if (h.error) { fatal = h.error; break; }
    expert.push(e);
    human.push(h);
  }

  if (fatal) {
    console.log(`FAILED  ${fatal}`);
    process.exit(1);
  }

  const eSurv = median(expert.map((r) => r.survivedSeconds));
  const hSurv = median(human.map((r) => r.survivedSeconds));
  const gap = hSurv > 0 ? eSurv / hSurv : Infinity;
  const worst = Math.min(...human.map((r) => r.survivedSeconds));
  const aps = median(human.map((r) => r.actionsPerSecond));
  const rest = median(human.map((r) => r.longestRestSeconds));
  const pulse = median(human.map((r) => r.typicalGapSeconds));
  const vocab = Math.max(...human.map((r) => r.vocabulary));

  const note = (ok, msg) => (ok ? '' : `   <- ${msg}`);

  console.log(`playtest: ${path.basename(file)} — ${runs} runs, ${seconds}s cap\n`);
  console.log(`  expert survival (median)     ${eSurv.toFixed(1)}s`);
  console.log(`  human survival  (median)     ${hSurv.toFixed(1)}s`);
  console.log(`  earliest human death         ${worst.toFixed(1)}s${note(worst > 8, 'the opening is too sharp')}`);
  console.log(`  skill gap                    ${gap.toFixed(2)}x${note(gap <= 3, 'punishing — precision is doing too much of the work')}${gap < 1.15 ? '   <- forgiving; little room for mastery' : ''}`);
  console.log(`  decisions per second         ${aps.toFixed(2)}${note(aps <= 1.6, 'frantic')}`);
  console.log(`  typical gap between inputs   ${pulse.toFixed(2)}s`);
  console.log(`  longest breather             ${rest.toFixed(1)}s${note(rest >= 1.5, 'no real rest anywhere in the run')}`);
  console.log(`  obstacle vocabulary met      ${vocab} distinct types${note(vocab >= 3, 'the game shows too few shapes')}`);
  console.log(`  human died in                ${human.filter((r) => r.died).length}/${runs} runs`);
}

main();
