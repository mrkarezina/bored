/**
 * rhythm.js — what to play, and when to shut up.
 *
 * The playlist is the theme's voice: which patterns this game is made of and how
 * often each one shows up. The scheduler is everything the theme should not have
 * to think about — difficulty ramp, not repeating yourself, leaving room to
 * breathe, and never creating a seam a player cannot get through.
 *
 * A USEFUL ACCIDENT OF ARC UNITS
 *
 * One arc is a fixed number of frames, so `span(speed) / speed` is constant:
 * 1 arc is always ~0.6 SECONDS, whatever the speed. Distances measured in arcs
 * are therefore also durations, which is why the rest cadence below can be
 * written as a distance and still mean what it says about time.
 *
 * WHAT THIS GUARANTEES
 *
 * - Every gap it emits is either inside a pattern (pre-solved) or a trailGap
 *   (over a full arc). It cannot produce a gap in the unwinnable band.
 * - Pressure never runs longer than REST_EVERY_ARCS without a breather.
 * - No pattern repeats while it is in cooldown.
 * - Power-ups are placed in gaps at an altitude the jump arc actually reaches,
 *   rather than rolled per-frame at a random height and left unreachable.
 */

// In a built game every module is concatenated into one script and these are
// plain globals. Under Node — the test suite and playtest.js — they are not, so
// pull them in and publish them under the same names the bundle uses.
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  if (typeof Vendor === 'undefined') global.Vendor = require('./vendor.js');
  if (typeof Pattern === 'undefined') global.Pattern = require('./patterns.js');
}

const Rhythm = (() => {
  /**
   * Difficulty budget: climbs fast, then flattens. Never becomes a wall.
   *
   * BUDGET_MIN is 2 rather than 1 on purpose. At 1 the only affordable pattern
   * is a bare single, so the opening was eight identical obstacles in a row
   * before anything else unlocked — monotony, not a gentle introduction. At 2
   * the player meets three shapes in the first stretch, all of them easy.
   */
  const BUDGET_MIN = 2;
  const BUDGET_MAX = 8;
  const BUDGET_TAU = 45;          // seconds to reach ~63% of the climb

  /**
   * Longest stretch of pressure allowed before a rest is forced, in arcs
   * (~0.6s each, so ~8.5 seconds). The fundamentals put the ceiling around ten
   * seconds; this sits under it deliberately.
   */
  const REST_EVERY_ARCS = 14;

  /** How far ahead of the screen edge to build the world. */
  const BUILD_AHEAD = 900;

  const POWERUP_CHANCE = { rare: 0.15, common: 0.35 };

  /**
   * A weighted list of patterns. Weights are relative, not probabilities — [3,
   * single] shows up three times as often as [1, gauntlet].
   */
  function playlist(entries, opts = {}) {
    if (!Array.isArray(entries) || !entries.length) {
      throw new Error('Rhythm.playlist: needs at least one [weight, pattern] entry');
    }
    const parsed = entries.map((e, i) => {
      if (!Array.isArray(e) || e.length !== 2) {
        throw new Error(`Rhythm.playlist: entry ${i} must be [weight, pattern]`);
      }
      const [weight, pattern] = e;
      if (typeof weight !== 'number' || weight <= 0) {
        throw new Error(`Rhythm.playlist: entry ${i} weight must be a positive number`);
      }
      if (!pattern || typeof pattern.place !== 'function') {
        throw new Error(`Rhythm.playlist: entry ${i} is not a Pattern — did you forget to call it? e.g. Pattern.single('crate')`);
      }
      // Rest is the scheduler's job, not the playlist's. Letting a playlist ask
      // for breathers double-counts it: a playlist that was three-quarters
      // breather produced a level with fifteen obstacles in ninety seconds and
      // nothing to do in between.
      if (pattern.regime === 'rest') {
        throw new Error(
          `Rhythm.playlist: entry ${i} is a breather. Rest is inserted automatically ` +
          `whenever pressure has run too long, so it does not belong in the playlist. ` +
          `To change how long the automatic rest is, pass it as an option instead: ` +
          `Rhythm.playlist([...], { rest: Pattern.breather({ arcs: 3 }) })`
        );
      }
      return { weight, pattern };
    });

    // One pattern is not a vocabulary. If every arrangement is the same
    // arrangement, the player is keeping time rather than making decisions.
    if (parsed.length < 2) {
      throw new Error(
        'Rhythm.playlist: needs at least two different patterns. A single repeated ' +
        'pattern gives the player nothing to recognise and nothing to get better at.'
      );
    }
    return { entries: parsed, rest: opts.rest };
  }

  /**
   * Build the scheduler. `obstacles` and `powerups` are the theme's own arrays;
   * the scheduler needs them to resolve names and to know how big things are.
   */
  function scheduler(config) {
    const { playlist: list, env, obstacles, powerups = [], seed = 1 } = config;
    if (!list || !list.entries) throw new Error('Rhythm.scheduler: playlist is required');
    if (!env) throw new Error('Rhythm.scheduler: envelope is required');

    const byName = new Map((obstacles || []).map((o) => [o.name, o]));
    const names = () => Array.from(byName.keys());
    const rand = Vendor.rng(seed);

    const restPattern = list.rest || Pattern.breather();

    let cursor = BUILD_AHEAD;       // world x where the next pattern begins
    let cooldown = [];
    let pressureArcs = 0;
    const history = [];

    const ctxFor = (speed) => ({ env, speed, get: (n) => byName.get(n), names });

    function budgetAt(elapsedSec) {
      return BUDGET_MIN + (BUDGET_MAX - BUDGET_MIN) * (1 - Math.exp(-elapsedSec / BUDGET_TAU));
    }

    function cooldownDepth() {
      return Math.max(0, Math.min(2, list.entries.length - 1));
    }

    /**
     * Everything affordable, placeable at this speed, and not just played.
     * Falls back through the constraints rather than returning nothing, because
     * an empty candidate set would stall the world.
     */
    function candidates(ctx, budget) {
      const fits = list.entries.filter((e) => e.pattern.fits(ctx));
      if (!fits.length) return [];
      const affordable = fits.filter((e) => e.pattern.cost <= budget);
      const pool = affordable.length ? affordable : [fits.reduce((a, b) => (a.pattern.cost <= b.pattern.cost ? a : b))];

      let fresh = pool.filter((e) => !cooldown.includes(e.pattern));
      // Rather than jumping straight from "full cooldown" to "anything goes",
      // relax it one step at a time. An immediate repeat is then only possible
      // when the pool genuinely holds a single option.
      for (let depth = cooldown.length - 1; depth > 0 && !fresh.length; depth--) {
        const relaxed = cooldown.slice(-depth);
        fresh = pool.filter((e) => !relaxed.includes(e.pattern));
      }
      return fresh.length ? fresh : pool;
    }

    function pick(pool) {
      const total = pool.reduce((s, e) => s + e.weight, 0);
      let r = rand() * total;
      for (const e of pool) {
        r -= e.weight;
        if (r <= 0) return e.pattern;
      }
      return pool[pool.length - 1].pattern;
    }

    /** Drop a power-up into a gap, at a height the arc actually reaches. */
    function powerupIn(worldX, widthPx, out) {
      if (!powerups.length || widthPx < 60) return;
      const pu = powerups[Math.floor(rand() * powerups.length)];
      const chance = POWERUP_CHANCE[pu.frequency] || POWERUP_CHANCE.rare;
      if (rand() > chance) return;
      out.push({
        kind: 'powerup',
        name: pu.name,
        worldX: worldX + widthPx * (0.3 + rand() * 0.4),
        // 35-75% of apex: high enough to be worth a jump, low enough to reach
        // even on a clipped one.
        altitude: env.peak * (0.35 + rand() * 0.4),
      });
    }

    /**
     * Confirm at least one entry can ever be placed at the slowest the game
     * will run. A playlist of nothing but clusters is legal to write and
     * impossible to start, so say so at boot rather than showing an empty road.
     */
    function validate(minSpeed) {
      const ctx = ctxFor(minSpeed);
      if (!list.entries.some((e) => e.pattern.fits(ctx))) {
        throw new Error(
          `Rhythm: no pattern in this playlist can be placed at the starting speed ` +
          `(${minSpeed}px/frame). Clusters need room for their obstacles plus the ` +
          `player's width inside one jump's clearance window, which is only ` +
          `${env.clearSpan(40, minSpeed).toFixed(0)}px this slow. Add a Pattern.single ` +
          `or Pattern.run so the game has something to open with.`
        );
      }
    }

    /**
     * Advance the world to `distance + BUILD_AHEAD`, returning everything that
     * should now exist. Distance-driven, not clock-driven: patterns are geometry,
     * and a timer would stretch and squash them as the speed ramps.
     */
    function update(distance, speed, elapsedSec) {
      const out = [];
      const ctx = ctxFor(speed);
      const budget = budgetAt(elapsedSec);
      let guard = 0;

      while (cursor < distance + BUILD_AHEAD) {
        if (++guard > 50) break;   // a pathological playlist must not hang the frame

        const forceRest = pressureArcs >= REST_EVERY_ARCS;
        const pattern = forceRest ? restPattern : pick(candidates(ctx, budget));

        const items = pattern.place(ctx);
        for (const it of items) {
          const o = byName.get(it.name);
          out.push({ kind: 'obstacle', name: it.name, worldX: cursor + it.at, def: o });
        }

        const span = pattern.span(ctx);
        const gap = pattern.trailGap(ctx);
        const arcPx = env.span(speed);

        if (items.length === 0) {
          // A breather: the whole thing is open road, so it is where a pick-up
          // most deserves to be.
          powerupIn(cursor, span, out);
          pressureArcs = 0;
        } else {
          powerupIn(cursor + span, gap, out);
          pressureArcs += (span + gap) / arcPx;
        }

        history.push({ pattern: pattern.describe(), at: cursor, cost: pattern.cost });
        cooldown.push(pattern);
        while (cooldown.length > cooldownDepth()) cooldown.shift();

        cursor += span + gap;
      }

      return out;
    }

    return {
      update,
      validate,
      history: () => history,
      budgetAt,
      constants: { REST_EVERY_ARCS, BUILD_AHEAD, BUDGET_MIN, BUDGET_MAX, BUDGET_TAU },
    };
  }

  return { playlist, scheduler, REST_EVERY_ARCS, BUILD_AHEAD };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Rhythm;
