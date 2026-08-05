#!/usr/bin/env node
/**
 * validate.js — lint a theme against the engine contract.
 *
 *   node validate.js <theme.js>
 *
 * Every check here corresponds to a bug that has actually shipped: a missing
 * colour key that renders the HUD invisible, a typo'd power-up effect that does
 * nothing, Math.random() inside draw() that makes sprites strobe, an air
 * obstacle too tall to duck under. Exits non-zero on any error.
 */

const fs = require('fs');
const path = require('path');

const EFFECTS = ['shield', 'invincible', '2x-score', 'slow-mo', 'magnet'];
const COLOR_KEYS = ['bg', 'text', 'accent', 'score', 'ground', 'groundLine'];
const PARTICLE_KEYS = ['dust', 'jump', 'death', 'collect', 'trail', 'confetti'];
const SOUND_KEYS = ['jumpFreqs', 'collectFreqs', 'hitFreq', 'bgBPM'];

// Calls that cause per-frame flicker, allocation churn, or network access.
const BANNED = [
  ['Math.random', 'sprites strobe when geometry is re-randomised every frame'],
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
  try {
    return new Function(`${src}\n;return THEME;`)();
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
  if (!theme.colors) err('THEME.colors is missing');
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

  for (const k of PARTICLE_KEYS) {
    const spec = (theme.particles || {})[k];
    if (!spec) warn(`THEME.particles.${k} is missing — that effect falls back to accent colour`);
    else if (!Array.isArray(spec.colors) || spec.colors.length === 0) {
      err(`THEME.particles.${k}.colors must be a non-empty array`);
    }
  }

  if (!theme.difficulty) warn('THEME.difficulty is missing — engine defaults apply');

  // AudioEngine synthesises everything from four scalars. Anything else in
  // THEME.sounds — custom jump()/collect()/die() functions in particular — is
  // never called, and has been written into shipped themes before.
  if (!theme.sounds) warn('THEME.sounds is missing — engine defaults apply');
  else {
    for (const k of Object.keys(theme.sounds)) {
      if (!SOUND_KEYS.includes(k)) {
        err(`THEME.sounds.${k} is dead code — the engine only reads ${SOUND_KEYS.join(', ')}`);
      }
    }
  }

  if (typeof theme.drawGround !== 'function') err('THEME.drawGround must be a function');
}

function checkObstacles(theme) {
  const obstacles = theme.obstacles || [];
  if (!obstacles.length) return err('THEME.obstacles is empty');

  const ground = obstacles.filter((o) => o.type === 'ground');
  const air = obstacles.filter((o) => o.type === 'air');

  for (const o of obstacles) {
    const label = `obstacle "${o.name || '?'}"`;
    if (o.type !== 'ground' && o.type !== 'air') err(`${label}: type must be 'ground' or 'air'`);
    for (const k of ['width', 'height', 'weight']) {
      if (typeof o[k] !== 'number' || o[k] <= 0) err(`${label}: ${k} must be a positive number`);
    }
    if (typeof o.draw !== 'function') err(`${label}: draw must be a function`);
  }

  if (ground.length < 3) err(`need at least 3 ground obstacles, found ${ground.length}`);
  if (!air.length) err('need at least 1 air obstacle for the duck mechanic to matter');
  if (obstacles.length > 6) {
    warn(`${obstacles.length} obstacle types — 3-4 read better by silhouette at speed`);
  }

  // The engine centres air obstacles in the band between the standing and
  // ducking hitbox tops, then applies 4px of collision padding per side
  // (runner-engine.js checkCollision). Working the vertical AABB through:
  //   duckable  <=>  height <= clearance + 16
  //   a threat  <=>  height + clearance > 16
  // Outside that window the obstacle is either impossible to duck (unfair
  // death) or impossible to hit (free decoration).
  const player = theme.player;
  if (player && typeof player.height === 'number' && typeof player.duckHeight === 'number') {
    const clearance = player.height - player.duckHeight;
    if (clearance <= 0) {
      err(`player.duckHeight (${player.duckHeight}) must be less than player.height (${player.height})`);
    } else {
      for (const o of air) {
        const label = `air obstacle "${o.name || '?'}"`;
        if (o.height > clearance + 16) {
          err(`${label} is ${o.height}px tall — with a ${clearance}px duck clearance band it hits even a ducking player. Cap it at ${clearance + 16}px or raise player.height - player.duckHeight.`);
        } else if (o.height + clearance <= 16) {
          warn(`${label} is only ${o.height}px tall — collision padding means it never hits a standing player either`);
        }
      }
    }
  }
}

function checkPowerups(theme) {
  const powerups = theme.powerups || [];
  if (powerups.length < 2) warn(`only ${powerups.length} power-up(s) — 2-3 gives more variety`);

  for (const p of powerups) {
    const label = `power-up "${p.name || '?'}"`;
    if (!EFFECTS.includes(p.effect)) {
      err(`${label}: effect '${p.effect}' is not one of ${EFFECTS.join(', ')}`);
    }
    if (typeof p.draw !== 'function') err(`${label}: draw must be a function`);
    if (typeof p.spawnChance !== 'number') {
      err(`${label}: spawnChance must be a number`);
    } else if (p.spawnChance <= 0) {
      err(`${label}: spawnChance is ${p.spawnChance} — it will never spawn`);
    } else if (p.spawnChance > 0.02) {
      warn(`${label}: spawnChance ${p.spawnChance} is very high (0.001-0.005 is typical)`);
    }
    if (p.effect !== 'shield' && !p.duration) {
      warn(`${label}: timed effect with no duration — set duration in ms`);
    }
  }
}

function checkBackgrounds(theme) {
  const layers = theme.backgrounds || [];
  if (!layers.length) return warn('no parallax layers — the game will feel static');
  if (layers.length > 2) {
    warn(`${layers.length} parallax layers — 2 is the ceiling. A third competes with obstacles for attention (see references/design-guide.md)`);
  }
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

  const theme = loadTheme(path.resolve(file));
  if (!theme || typeof theme !== 'object') {
    console.error('validate: THEME is not an object');
    process.exit(1);
  }

  checkStructure(theme);
  checkObstacles(theme);
  checkPowerups(theme);
  checkBackgrounds(theme);
  checkDrawBodies(theme);

  for (const w of warnings) console.log(`warn   ${w}`);
  for (const e of errors) console.log(`ERROR  ${e}`);

  if (errors.length) {
    console.log(`\n${errors.length} error(s), ${warnings.length} warning(s) — fix the errors and re-run.`);
    process.exit(1);
  }
  console.log(`\nok — ${warnings.length} warning(s), 0 errors.`);
}

main();
