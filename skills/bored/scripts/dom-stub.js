/**
 * dom-stub.js — enough of a browser to run a real built game under Node.
 *
 * Used by playtest.js to bot-play games, and by the test suite to measure what
 * the engine's physics actually does. It stubs the environment, never the game:
 * input-handler binds to `document`, so firing events here drives the REAL input
 * path including coyote time and jump buffering, and the engine cannot tell the
 * difference.
 *
 * There is deliberately no AudioContext, which exercises the "browser without
 * Web Audio" path the audio engine is supposed to survive.
 */

const STEP_MS = 1000 / 60;

/**
 * How far the fake clock moves per step() — a hair more than one frame.
 *
 * The engine runs physics on a fixed-timestep accumulator. Advancing by exactly
 * 1000/60 leaves it on a knife edge: floating point makes some frames fall a
 * fraction short, so that frame runs no physics and the next runs two. Rendering
 * happens once per frame, after all of them, so a double step is invisible from
 * outside and the world appears to jump.
 *
 * The excess here is 1/500000th of a frame, so it takes half a million frames to
 * drift into a genuine double step — far beyond any run — and in exchange every
 * step() is exactly one simulated frame.
 */
const CLOCK_STEP = STEP_MS + 0.0001;

/** Every canvas 2D call the engine or a theme might make, as a no-op. */
function makeContext() {
  const state = {};
  const noop = () => {};
  const target = {
    measureText: (t) => ({ width: String(t).length * 6 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    getImageData: () => ({ data: [] }),
  };
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      if (k in state) return state[k];
      return noop;
    },
    set(t, k, v) { state[k] = v; return true; },
  });
}

function makeElement(id) {
  return {
    id,
    width: 800,
    height: 400,
    style: {},
    classList: { add: () => {}, remove: () => {}, toggle: () => {} },
    textContent: '',
    innerHTML: '',
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => makeContext(),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 400 }),
    parentElement: null,
    appendChild: () => {},
    querySelector: () => null,
  };
}

/**
 * A sandbox suitable for `vm.createContext`, plus the controls to drive it:
 *
 *   fire(type, init)  dispatch a document/window event (keydown, keyup, ...)
 *   step()            advance exactly one 60Hz frame and run the queued rAF
 */
function makeEnv() {
  const listeners = {};
  const elements = {};
  const canvas = makeElement('game-canvas');
  canvas.parentElement = makeElement('wrap');

  const document = {
    hidden: false,
    getElementById: (id) => {
      if (id === 'game-canvas') return canvas;
      if (!elements[id]) elements[id] = makeElement(id);
      return elements[id];
    },
    querySelector: () => null,
    createElement: (tag) => makeElement(tag),
    addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener: () => {},
    documentElement: { style: { setProperty: () => {} } },
    body: { style: {}, appendChild: () => {} },
  };

  let now = 0;
  const rafQueue = [];

  const sandbox = {
    document,
    window: {
      addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); },
      innerWidth: 1200,
      innerHeight: 800,
      devicePixelRatio: 1,
    },
    performance: { now: () => now },
    requestAnimationFrame: (fn) => { rafQueue.push(fn); return rafQueue.length; },
    cancelAnimationFrame: () => {},
    localStorage: {
      _d: {},
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._d, k) ? this._d[k] : null; },
      setItem(k, v) { this._d[k] = String(v); },
      removeItem(k) { delete this._d[k]; },
    },
    setInterval: () => 0,          // background beat: nothing to hear out here
    clearInterval: () => {},
    setTimeout: () => 0,
    clearTimeout: () => {},
    fetch: () => Promise.reject(new Error('offline')),
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Math, JSON, Date, Object, Array, String, Number, Boolean, Error, Set, Map, isNaN, parseInt, parseFloat,
  };
  sandbox.globalThis = sandbox;
  sandbox.window.document = document;

  return {
    sandbox,
    fire(type, init) {
      for (const fn of listeners[type] || []) fn({ preventDefault: () => {}, ...init });
    },
    step() {
      now += CLOCK_STEP;
      const due = rafQueue.splice(0, rafQueue.length);
      for (const fn of due) fn(now);
    },
    reset() { now = 0; rafQueue.length = 0; },
  };
}

module.exports = { makeEnv, makeContext, makeElement, STEP_MS };
