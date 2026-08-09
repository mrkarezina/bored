/**
 * Shared fixtures for the block test suite.
 *
 * The library is written as browser globals — every module is concatenated into
 * one script in a built game — so the tests publish them under the same names
 * rather than juggling module objects.
 */
const path = require('path');

const LIB = path.resolve(__dirname, '..', 'skills', 'bored', 'lib');

global.Vendor = require(path.join(LIB, 'vendor.js'));
global.Envelope = require(path.join(LIB, 'envelope.js'));
global.Pattern = require(path.join(LIB, 'patterns.js'));
global.Rhythm = require(path.join(LIB, 'rhythm.js'));
global.Motion = require(path.join(LIB, 'motion.js'));
global.Palette = require(path.join(LIB, 'palette.js'));
global.Sound = require(path.join(LIB, 'sound.js'));

/**
 * Physics settings spanning the range a theme can plausibly ask for: a 1.5x
 * spread in airtime, from very floaty to very snappy. Everything the library
 * promises has to hold across all of them, because the theme picks freely.
 */
const PHYSICS = [
  { name: 'default', width: 32, height: 48, duckHeight: 24, jumpForce: -12.5, gravity: 0.65 },
  { name: 'snappy', width: 32, height: 48, duckHeight: 24, jumpForce: -14, gravity: 0.8 },
  { name: 'floaty', width: 32, height: 48, duckHeight: 24, jumpForce: -11, gravity: 0.55 },
  { name: 'very floaty', width: 30, height: 44, duckHeight: 22, jumpForce: -10, gravity: 0.45 },
  { name: 'very snappy', width: 36, height: 52, duckHeight: 26, jumpForce: -16, gravity: 1.0 },
  { name: 'mid', width: 34, height: 46, duckHeight: 23, jumpForce: -13, gravity: 0.7 },
];

/** Every speed tier a run passes through, start to cap. */
const SPEEDS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const OBSTACLES = [
  { name: 'crate', type: 'ground', width: 40, height: 40 },
  { name: 'spike', type: 'ground', width: 28, height: 30 },
  { name: 'block', type: 'ground', width: 34, height: 34 },
  { name: 'bird', type: 'air', width: 30, height: 18 },
];

const POWERUPS = [{ name: 'star', effect: 'shield', frequency: 'common' }];

const envFor = (p) => Envelope.compute(p);

const ctxFor = (env, speed, obstacles = OBSTACLES) => ({
  env,
  speed,
  get: (n) => obstacles.find((o) => o.name === n),
  names: () => obstacles.map((o) => o.name),
});

/**
 * The core question, asked of one pair of obstacles: could a player get through
 * this? Either one arc straddles both, or there is room to land between them.
 * Anything else is the unwinnable band.
 */
function pairIsSurvivable(env, speed, a, b) {
  const tallest = Math.max(a.height, b.height);
  const oneJump = (b.at + b.width) - a.at + env.playerWidth <= env.clearSpan(tallest, speed);
  const landBetween = (b.at - a.at) >= env.span(speed);
  return oneJump || landBetween;
}

module.exports = { PHYSICS, SPEEDS, OBSTACLES, POWERUPS, envFor, ctxFor, pairIsSurvivable, LIB };
