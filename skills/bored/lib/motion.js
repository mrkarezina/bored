/**
 * motion.js — how an obstacle moves, on top of the world scroll.
 *
 * THE COMPOSITION LAW
 *
 * Every motion block declares a `bound`: the furthest it will ever displace the
 * thing it is attached to. Composing motions sums their bounds, and the engine
 * inflates the collision box by that sum. So the worst case of any combination
 * is arithmetic — it never has to be discovered by simulating it.
 *
 * That is the entire reason motion is a block family instead of a callback. A
 * free-form `update(obs)` has no bound, so nothing downstream can reason about
 * what it might do, and the only way to find out is to play the game and see.
 *
 * Two rules every block here keeps:
 *   1. Deterministic given (obs, frame), and allocation-free, so a long motion
 *      list cannot tank the framerate. Most are outright pure; `dive` is the
 *      exception, latching the frame it committed onto the obstacle so it
 *      always triggers at the same place rather than drifting.
 *   2. Displacement never exceeds `bound`. Tests assert this by simulation.
 *
 * Per-instance phase comes from `obs.phase`, seeded when the obstacle spawns, so
 * three birds on screen don't bob in lockstep like a chorus line.
 */
const Motion = (() => {
  const FPS = 60;
  const toFrames = (ms) => Math.max(1, (ms / 1000) * FPS);

  function make(name, bound, apply) {
    return { name, bound, apply };
  }

  /** Rise and fall in place. The default "this thing is alive" motion. */
  function bob(amp = 8, periodMs = 900) {
    const p = toFrames(periodMs);
    return make('bob', { dx: 0, dy: amp }, (obs, frame) =>
      ({ dx: 0, dy: Math.sin(((frame + obs.phase * p) / p) * Math.PI * 2) * amp }));
  }

  /** Side to side. Same shape as bob, turned ninety degrees. */
  function sway(amp = 10, periodMs = 1200) {
    const p = toFrames(periodMs);
    return make('sway', { dx: amp, dy: 0 }, (obs, frame) =>
      ({ dx: Math.sin(((frame + obs.phase * p) / p) * Math.PI * 2) * amp, dy: 0 }));
  }

  /**
   * A steady lean in one direction that stops at `max`. Unbounded drift would
   * break the composition law — after enough frames it could be anywhere — so
   * the excursion is clamped and the clamp is the declared bound.
   */
  function drift(dxPerSec = 0, dyPerSec = 20, opts = {}) {
    const max = opts.max || 30;
    const perFrame = { x: dxPerSec / FPS, y: dyPerSec / FPS };
    return make('drift', { dx: max, dy: max }, (obs, frame) => ({
      dx: Math.max(-max, Math.min(max, perFrame.x * frame)),
      dy: Math.max(-max, Math.min(max, perFrame.y * frame)),
    }));
  }

  /**
   * Hold position until the obstacle is `at` px from the left of the screen,
   * then descend by `drop`. Reads as a bird noticing you. Because it is keyed on
   * screen position rather than frame count it commits at the same place every
   * time, which is what makes it learnable rather than a gotcha.
   */
  function dive(opts = {}) {
    const at = opts.at !== undefined ? opts.at : 320;
    const drop = opts.drop || 40;
    const overFrames = toFrames(opts.overMs || 400);
    return make('dive', { dx: 0, dy: Math.abs(drop) }, (obs, frame) => {
      if (obs.screenX > at) return { dx: 0, dy: 0 };
      if (obs.diveStart === undefined) obs.diveStart = frame;
      const t = Math.min(1, (frame - obs.diveStart) / overFrames);
      return { dx: 0, dy: drop * Vendor.ease.quadInOut(t) };
    });
  }

  /** Circular travel. Bound is the radius on both axes. */
  function orbit(radius = 12, periodMs = 1400) {
    const p = toFrames(periodMs);
    return make('orbit', { dx: radius, dy: radius }, (obs, frame) => {
      const a = ((frame + obs.phase * p) / p) * Math.PI * 2;
      return { dx: Math.cos(a) * radius, dy: Math.sin(a) * radius };
    });
  }

  /**
   * Rotation. Purely visual — the collision box does not turn, so the bound is
   * zero. Keep the sprite roughly round or the drawing will disagree with the
   * hitbox at the corners.
   */
  function spin(turnsPerSec = 0.5) {
    const per = (Math.PI * 2 * turnsPerSec) / FPS;
    return make('spin', { dx: 0, dy: 0 }, (obs, frame) => ({ dx: 0, dy: 0, rotate: frame * per }));
  }

  /**
   * Breathing scale. Unlike spin this DOES change how much space the sprite
   * appears to take, so the bound inflates by the extra half-width and
   * half-height. A sprite that looks bigger than its hitbox is the one way a
   * free-form draw() can still feel unfair, and this is where it gets paid for.
   */
  function pulse(amount = 0.12, periodMs = 800) {
    const p = toFrames(periodMs);
    return {
      name: 'pulse',
      bound: { dx: 0, dy: 0 },
      boundFor: (obs) => ({ dx: (obs.width * amount) / 2, dy: (obs.height * amount) / 2 }),
      apply: (obs, frame) => ({
        dx: 0, dy: 0,
        scale: 1 + Math.sin(((frame + obs.phase * p) / p) * Math.PI * 2) * amount,
      }),
    };
  }

  /**
   * Total displacement a motion list can produce for a given obstacle. The
   * engine calls this once at spawn and grows the collision box by it, so
   * collision stays honest whatever the composition.
   */
  function boundsOf(list, obs) {
    let dx = 0, dy = 0;
    for (const m of list || []) {
      const b = m.boundFor ? m.boundFor(obs) : m.bound;
      dx += b.dx;
      dy += b.dy;
    }
    return { dx, dy };
  }

  /** Sum a motion list into one offset. Order-independent: they simply add. */
  function applyAll(list, obs, frame) {
    let dx = 0, dy = 0, rotate = 0, scale = 1;
    for (const m of list || []) {
      const r = m.apply(obs, frame);
      dx += r.dx || 0;
      dy += r.dy || 0;
      rotate += r.rotate || 0;
      if (r.scale !== undefined) scale *= r.scale;
    }
    return { dx, dy, rotate, scale };
  }

  return { bob, sway, drift, dive, orbit, spin, pulse, boundsOf, applyAll };
})();

if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  if (typeof Vendor === 'undefined') global.Vendor = require('./vendor.js');
  module.exports = Motion;
}
