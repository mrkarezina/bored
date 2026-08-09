#!/usr/bin/env node
/**
 * validate.js — lint a theme against the engine contract.
 *
 *   node validate.js <theme.js>
 *
 * This is deliberately smaller than it used to be. Rules about spawn rates,
 * pacing, obstacle weighting and sound tuning are gone — not relaxed, but moved
 * into lib/, where they are enforced by construction instead of by inspection.
 * A theme can no longer express an unwinnable gap or an unreadable palette, so
 * there is nothing left here to check about them.
 *
 * What remains is the part that is still free-form, and therefore still capable
 * of being wrong: hand-written draw() bodies, and the geometry a theme declares
 * about itself.
 *
 * Exits non-zero on any error.
 */

const fs = require('fs');
const path = require('path');

const LIB_DIR = path.resolve(__dirname, '..', 'lib');
const LIB = ['vendor.js', 'envelope.js', 'patterns.js', 'rhythm.js', 'motion.js', 'palette.js', 'sound.js'];

const EFFECTS = ['shield', 'invincible', '2x-score', 'slow-mo', 'magnet'];
const COLOR_KEYS = ['bg', 'text', 'accent', 'score', 'ground', 'groundLine'];
const PARTICLE_KEYS = ['dust', 'jump', 'death', 'collect', 'trail', 'confetti'];
const SOUND_SLOTS = ['jump', 'collect', 'hit', 'nearMiss', 'milestone', 'beat'];

/**
 * Calls that break a draw() specifically. Sprites are the one place this
 * library deliberately leaves wide open — a bad sprite is only ugly — so this
 * list stays, and it is the reason validate.js did not disappear entirely.
 */
const BANNED = [
  ['Math.random', 'sprites strobe when geometry is re-randomised every frame — derive variation from the frame parameter'],
  ['shadowBlur', 'shadow blur re-rasterises every frame and flickers at speed'],
  ['createLinearGradient', 'allocate gradients outside draw(), not per frame'],
  ['createRadialGradient', 'allocate gradients outside draw(), not per frame'],
  ['getImageData', 'forces a pipeline stall every frame'],
  ['new Image', 'games must be self-contained — draw with canvas primitives'],
  ['fetch(', 'games must be self-contained — no network calls in a sprite'],
];

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

function loadTheme(file) {
  const src = fs.readFileSync(file, 'utf8');
  const lib = LIB.map((f) => fs.readFileSync(path.join(LIB_DIR, f), 'utf8')).join('\n');
  try {
    return new Function(`${lib}\n\n${src}\n;return THEME;`)();
  } catch (e) {
    console.error(`validate: could not evaluate ${path.basename(file)}: ${e.message}`);
    process.exit(1);
  }
}

/** Collect every draw function in the theme, tagged with a human-readable path. */
function collectDrawFns(theme) {
  const found = [];
  const add = (label, fn) => { if (typeof fn === 'function') found.push([label, fn]); };

  add('player.draw', theme.player && theme.player.draw);
  add('drawGround', theme.drawGround);
  (theme.obstacles || []).forEach((o, i) => add(`obstacles[${i}] (${o.name || '?'}).draw`, o.draw));
  (theme.powerups || []).forEach((p, i) => add(`powerups[${i}] (${p.name || '?'}).draw`, p.draw));
  (theme.backgrounds || []).forEach((b, i) => add(`backgrounds[${i}].draw`, b.draw));
  return found;
}

function checkStructure(theme) {
  if (!theme.name) err('THEME.name is missing');
  if (!theme.description) warn('THEME.description is missing — used as the menu subtitle');

  const colors = theme.colors || {};
  if (!theme.colors) err('THEME.colors is missing — build it with Palette.dusk() or another family');
  else {
    for (const k of COLOR_KEYS) {
      if (!colors[k]) err(`THEME.colors.${k} is missing`);
    }
  }

  const p = theme.player;
  if (!p) return err('THEME.player is missing');
  for (const k of ['width', 'height', 'duckHeight', 'groundY', 'jumpForce', 'gravity']) {
    if (typeof p[k] !== 'number') err(`THEME.player.${k} must be a number`);
  }
  if (typeof p.draw !== 'function') err('THEME.player.draw must be a function');
  if (p.jumpForce >= 0) err('THEME.player.jumpForce must be negative (up is -Y)');
  if (p.duckHeight >= p.height) err('THEME.player.duckHeight must be less than player.height');

  for (const k of PARTICLE_KEYS) {
    const spec = (theme.particles || {})[k];
    if (!spec) warn(`THEME.particles.${k} is missing — that effect falls back to accent colour`);
    else if (!Array.isArray(spec.colors) || spec.colors.length === 0) {
      err(`THEME.particles.${k}.colors must be a non-empty array`);
    }
  }

  if (typeof theme.drawGround !== 'function') err('THEME.drawGround must be a function');
}

/**
 * The old weighted-random spawner is gone. A theme without a rhythm has nothing
 * to build a level from, and the message has to say what to do about it because
 * every theme written before v3 will land here.
 */
function checkRhythm(theme) {
  if (!theme.rhythm) {
    return err(
      'THEME.rhythm is missing. Obstacles are no longer spawned by weighted random ' +
      'roll — a playlist of patterns decides what appears and the engine spaces them ' +
      'so every gap is survivable. Add something like:\n' +
      '         rhythm: Rhythm.playlist([\n' +
      '           [3, Pattern.single(\'crate\')],\n' +
      '           [2, Pattern.pair(\'crate\', \'bird\')],\n' +
      '           [1, Pattern.gauntlet(\'bird\', 3)],\n' +
      '         ])\n' +
      '       See references/blocks.md. THEME.obstacles[].weight is no longer read.'
    );
  }
  if (!Array.isArray(theme.rhythm.entries) || !theme.rhythm.entries.length) {
    err('THEME.rhythm must come from Rhythm.playlist([[weight, pattern], ...])');
  }
}

function checkSounds(theme) {
  if (!theme.sounds) {
    return err('THEME.sounds is missing — pick a palette, e.g. sounds: Sound.chiptune()');
  }
  for (const slot of SOUND_SLOTS) {
    if (!Array.isArray(theme.sounds[slot])) {
      err(`THEME.sounds.${slot} is missing or not a ZzFX array — use Sound.chiptune() and override slots individually`);
    }
  }
}

/**
 * Reachability, checked here as well as at boot. The engine throws on an
 * unclearable obstacle when the game starts; catching it at build time means
 * whoever wrote the theme finds out before they open a browser.
 */
function checkObstacles(theme) {
  const obstacles = theme.obstacles || [];
  if (!obstacles.length) return err('THEME.obstacles is empty');

  for (const o of obstacles) {
    const label = `obstacle "${o.name || '?'}"`;
    if (!o.name) err('every obstacle needs a name — patterns refer to them by name');
    if (o.type !== 'ground' && o.type !== 'air') err(`${label}: type must be 'ground' or 'air'`);
    for (const k of ['width', 'height']) {
      if (typeof o[k] !== 'number' || o[k] <= 0) err(`${label}: ${k} must be a positive number`);
    }
    if (typeof o.draw !== 'function') err(`${label}: draw must be a function`);
    if (o.weight !== undefined) {
      warn(`${label}: weight is no longer read — how often something appears is set by its patterns' weights in THEME.rhythm`);
    }
  }

  const names = obstacles.map((o) => o.name);
  const dupes = names.filter((n, i) => n && names.indexOf(n) !== i);
  if (dupes.length) err(`duplicate obstacle names: ${[...new Set(dupes)].join(', ')} — patterns could not tell them apart`);

  if (!obstacles.some((o) => o.type === 'air')) {
    warn('no air obstacles — the duck mechanic never matters, and the game reads as one-button');
  }
  if (obstacles.length > 6) {
    warn(`${obstacles.length} obstacle types — 3-4 read better by silhouette at speed`);
  }

  // Same arithmetic the engine runs at boot, including motion sweep.
  const p = theme.player;
  if (!p || typeof p.jumpForce !== 'number' || typeof p.gravity !== 'number') return;
  let env;
  try {
    env = Envelope.compute(p);
  } catch (e) {
    return err(e.message);
  }
  for (const o of obstacles) {
    if (typeof o.height !== 'number') continue;
    const bound = o.motion ? Motion.boundsOf(o.motion, o) : { dx: 0, dy: 0 };
    const swept = o.height + bound.dy * 2;
    if (o.type === 'air' && swept > env.maxAirHeight) {
      err(`air obstacle "${o.name}" sweeps ${swept}px but the duck clearance band admits ${env.maxAirHeight}px — a ducking player still gets hit`);
    }
    if (o.type === 'ground' && o.height >= env.peak * 0.9) {
      err(`ground obstacle "${o.name}" is ${o.height}px tall but the jump peaks at ${env.peak.toFixed(0)}px — nothing clears it`);
    }
  }
}

function checkPowerups(theme) {
  const powerups = theme.powerups || [];
  if (powerups.length < 2) warn(`only ${powerups.length} power-up(s) — 2-3 gives more variety`);

  for (const p of powerups) {
    const label = `power-up "${p.name || '?'}"`;
    if (!p.name) err('every power-up needs a name');
    if (!EFFECTS.includes(p.effect)) {
      err(`${label}: effect '${p.effect}' is not one of ${EFFECTS.join(', ')}`);
    }
    if (typeof p.draw !== 'function') err(`${label}: draw must be a function`);
    if (p.spawnChance !== undefined) {
      warn(`${label}: spawnChance is no longer read — power-ups are placed in gaps by the scheduler. Use frequency: 'rare' or 'common'`);
    }
    if (p.frequency && !['rare', 'common'].includes(p.frequency)) {
      err(`${label}: frequency must be 'rare' or 'common'`);
    }
    if (p.effect !== 'shield' && !p.duration) {
      warn(`${label}: timed effect with no duration — set duration in ms`);
    }
  }
}

function checkBackgrounds(theme) {
  const layers = theme.backgrounds || [];
  if (!layers.length) return warn('no parallax layers — the game will feel static');
  layers.forEach((l, i) => {
    if (typeof l.draw !== 'function') err(`backgrounds[${i}].draw must be a function`);
    if (typeof l.speed !== 'number') err(`backgrounds[${i}].speed must be a number`);
    else if (l.speed >= 1) warn(`backgrounds[${i}].speed ${l.speed} matches or outruns the foreground`);
  });
}

function checkDrawBodies(theme) {
  for (const [label, fn] of collectDrawFns(theme)) {
    const src = fn.toString();
    for (const [needle, why] of BANNED) {
      if (src.includes(needle)) err(`${label}: uses ${needle} — ${why}`);
    }
    const saves = (src.match(/\.save\(\)/g) || []).length;
    const restores = (src.match(/\.restore\(\)/g) || []).length;
    if (saves !== restores) {
      err(`${label}: ${saves} save() vs ${restores} restore() — unbalanced canvas state leaks into the engine`);
    }
  }
}

/**
 * The one check that has to actually run the library: build the level the way
 * the engine will and confirm the playlist can open the game. A playlist of
 * nothing but clusters is legal to write and impossible to start.
 */
function checkPlaylistStarts(theme) {
  if (!theme.rhythm || !theme.player || !theme.obstacles) return;
  let env;
  try {
    env = Envelope.compute(theme.player);
  } catch (e) {
    return;   // already reported by checkObstacles
  }
  try {
    const s = Rhythm.scheduler({
      playlist: theme.rhythm,
      env,
      obstacles: theme.obstacles,
      powerups: theme.powerups || [],
      seed: 1,
    });
    s.validate((theme.difficulty && theme.difficulty.startSpeed) || 4);
  } catch (e) {
    err(e.message);
  }
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node validate.js <theme.js>');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`validate: no such file: ${file}`);
    process.exit(1);
  }

  // The library has to exist in this process too, so the reachability checks
  // above can run the same code the engine will.
  global.Vendor = require(path.join(LIB_DIR, 'vendor.js'));
  global.Envelope = require(path.join(LIB_DIR, 'envelope.js'));
  global.Pattern = require(path.join(LIB_DIR, 'patterns.js'));
  global.Rhythm = require(path.join(LIB_DIR, 'rhythm.js'));
  global.Motion = require(path.join(LIB_DIR, 'motion.js'));

  const theme = loadTheme(path.resolve(file));
  if (!theme || typeof theme !== 'object') {
    console.error('validate: THEME is not an object');
    process.exit(1);
  }

  checkStructure(theme);
  checkRhythm(theme);
  checkSounds(theme);
  checkObstacles(theme);
  checkPowerups(theme);
  checkBackgrounds(theme);
  checkDrawBodies(theme);
  checkPlaylistStarts(theme);

  for (const w of warnings) console.log(`warn   ${w}`);
  for (const e of errors) console.log(`ERROR  ${e}`);

  if (errors.length) {
    console.log(`\n${errors.length} error(s), ${warnings.length} warning(s) — fix the errors and re-run.`);
    process.exit(1);
  }
  console.log(`\nok — ${warnings.length} warning(s), 0 errors.`);
}

main();
