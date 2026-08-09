/**
 * patterns.js — the vocabulary a game's rhythm is composed from.
 *
 * A pattern is a PRE-SOLVED CLUSTER of obstacles. Its internal spacing lives
 * entirely inside one survivable regime, so it can never contain a gap in the
 * unwinnable band (see envelope.js). The scheduler spaces patterns apart by at
 * least their trailGap, which is always more than one full arc, so the seams
 * between patterns can't fall in the band either.
 *
 * Together those two facts mean: ANY PLAYLIST OF THESE IS BEATABLE, whatever
 * order the scheduler draws them in, whatever the theme's physics, at any speed.
 * That is the whole point. It is a property of construction, not something a
 * validator has to go looking for afterwards.
 *
 * AUTHORING IN ARC UNITS
 *
 * Geometry here is expressed in arcs — fractions of one full-hold jump — never
 * pixels or milliseconds. The jump arc is self-similar: across a 1.5x range of
 * airtime the clearance-to-airtime ratio moves about 3%. So a cluster written in
 * arc units is correct at speed 3 and speed 11, with floaty physics or snappy.
 *
 * The one thing that ISN'T scale-free is obstacle width. At speed 3 a full arc
 * covers ~111px, so a 40px crate eats a third of it; at speed 11 the same arc
 * covers ~407px and the crate is a tenth. Clusters are therefore hardest to fit
 * when the game is SLOW, which is why every pattern has fits() and the scheduler
 * filters on it. The happy side effect is that complex shapes unlock as the run
 * speeds up, which is the pacing you wanted anyway.
 */
const Pattern = (() => {
  /**
   * Spacing between separately-jumped obstacles, in arcs.
   *
   * 1.0 arcs is the bare floor: the player lands exactly as the next obstacle
   * arrives and needs a frame-perfect input. The engine's jump buffering makes
   * that survivable but not pleasant, so even 'tight' sits above it.
   */
  const GAP = { tight: 1.15, even: 1.35, loose: 1.7 };

  /**
   * Applied to the one-jump clearance window before anything is placed inside
   * it. Covers the ~3% arc-shape drift across physics settings plus the fact
   * that a player who mistimes the takeoff by a frame or two should still make
   * it. Costs a little density; buys the invariant.
   */
  const SAFETY = 0.85;

  /** A cluster obstacle must be comfortably under the apex, not scraping it. */
  const PEAK_USABLE = 0.9;

  const arcs = (ctx, n) => ctx.env.toPx(n, ctx.speed);

  function resolve(ctx, name) {
    const o = ctx.get(name);
    if (!o) {
      throw new Error(
        `Pattern: no obstacle named "${name}" in this theme. ` +
        `Available: ${ctx.names().join(', ') || '(none)'}`
      );
    }
    return o;
  }

  function requireLane(o, lane, patternName) {
    if (o.type !== lane) {
      throw new Error(
        `Pattern.${patternName}: "${o.name}" is a '${o.type}' obstacle but this ` +
        `pattern needs a '${lane}' one.`
      );
    }
  }

  /** Shared shape. Every pattern is this object with different behaviour. */
  function make(spec) {
    return {
      name: spec.name,
      cost: spec.cost,
      regime: spec.regime,
      fits: spec.fits || (() => true),
      place: spec.place,
      span(ctx) {
        const items = this.place(ctx);
        if (!items.length) return spec.emptySpan ? spec.emptySpan(ctx) : 0;
        let right = 0;
        for (const it of items) right = Math.max(right, it.at + resolve(ctx, it.name).width);
        return right;
      },
      trailGap: spec.trailGap || ((ctx) => arcs(ctx, GAP.even)),
      describe: spec.describe || (() => spec.name),
    };
  }

  // ---------------------------------------------------------------------------

  /**
   * Deliberate empty space. Not the absence of design — the thing that makes
   * everything either side of it register as pressure. The scheduler forces one
   * of these on a cadence whatever the playlist says.
   */
  function breather(opts = {}) {
    const n = opts.arcs || 2.5;
    return make({
      name: 'breather',
      cost: 0,
      regime: 'rest',
      place: () => [],
      emptySpan: (ctx) => arcs(ctx, n),
      trailGap: () => 0,          // the breather IS the gap
      describe: () => `breather(${n} arcs)`,
    });
  }

  /** One obstacle. The base unit; always fits, at any speed, for any theme. */
  function single(name) {
    return make({
      name: 'single',
      cost: 1,
      regime: 'sequence',
      // resolve() is called for its side effect: a name that isn't in this
      // theme must fail here, loudly, rather than emit an obstacle the engine
      // then quietly declines to spawn.
      place: (ctx) => { resolve(ctx, name); return [{ name, at: 0 }]; },
      describe: () => `single(${name})`,
    });
  }

  /**
   * The same obstacle n times, each jumped separately. Steady, legible, the
   * thing a player locks into. Sequence spacing means it is beatable by
   * definition — the gap is over an arc wide by construction.
   */
  function run(name, n = 3, opts = {}) {
    const gap = GAP[opts.gap] || GAP.even;
    const count = Math.max(2, Math.min(6, n));
    // A run is n repetitions of a decision the player has already made once, so
    // it costs far less than n singles. Length adds fatigue, not difficulty;
    // tight spacing is what actually raises the bar.
    const cost = 1 + Math.floor(count / 2) + (opts.gap === 'tight' ? 1 : 0);
    return make({
      name: 'run',
      cost,
      regime: 'sequence',
      place: (ctx) => {
        resolve(ctx, name);
        const step = arcs(ctx, gap);
        return Array.from({ length: count }, (_, i) => ({ name, at: i * step }));
      },
      describe: () => `run(${name} x${count}, ${opts.gap || 'even'})`,
    });
  }

  /**
   * Two or three ground obstacles packed close enough to clear in a SINGLE arc.
   *
   * This is the pattern that reads as escalation without actually costing more
   * skill than one jump — the build in a drum pattern. It is also the only
   * pattern that can fail to fit, because the cluster plus the player's own
   * width has to sit inside the clearance window of the tallest member.
   */
  function cluster(names, opts = {}) {
    const list = Array.isArray(names) ? names : [names, names];
    const count = Math.max(2, Math.min(4, opts.n || list.length));
    const members = Array.from({ length: count }, (_, i) => list[i % list.length]);

    /** Widest the cluster may be, given who is in it and how fast we're going. */
    function budget(ctx) {
      let tallest = 0, totalWidth = 0;
      for (const m of members) {
        const o = resolve(ctx, m);
        requireLane(o, 'ground', 'cluster');
        tallest = Math.max(tallest, o.height);
        totalWidth += o.width;
      }
      const window = ctx.env.clearSpan(tallest, ctx.speed) * SAFETY;
      return { tallest, totalWidth, free: window - totalWidth - ctx.env.playerWidth };
    }

    return make({
      name: 'cluster',
      cost: 2,
      regime: 'one-jump',
      fits: (ctx) => {
        const b = budget(ctx);
        return b.tallest < ctx.env.peak * PEAK_USABLE && b.free > 0;
      },
      place: (ctx) => {
        const b = budget(ctx);
        // Spread whatever slack is left evenly between members. When it is
        // tight they end up shoulder to shoulder, which still clears in one
        // jump — that is the regime's guarantee.
        const step = b.free / (members.length - 1);
        let x = 0;
        return members.map((m, i) => {
          const at = x;
          x += resolve(ctx, m).width + (i < members.length - 1 ? Math.max(0, step) : 0);
          return { name: m, at };
        });
      },
      describe: () => `cluster(${members.join('+')})`,
    });
  }

  /**
   * Jump, land, duck. The pattern that makes the duck mechanic matter, and the
   * cheapest way to stop a game reading as one-button.
   */
  function pair(groundName, airName, opts = {}) {
    const gap = GAP[opts.gap] || GAP.even;
    return make({
      name: 'pair',
      cost: 2,
      regime: 'sequence',
      place: (ctx) => {
        requireLane(resolve(ctx, groundName), 'ground', 'pair');
        requireLane(resolve(ctx, airName), 'air', 'pair');
        return [
          { name: groundName, at: 0 },
          { name: airName, at: arcs(ctx, gap) },
        ];
      },
      describe: () => `pair(${groundName} -> ${airName})`,
    });
  }

  /**
   * A row of air obstacles: one sustained duck rather than n separate decisions.
   * Ducking is a hold, not a timed press, so these pack tighter than anything
   * jumped — the difficulty is commitment, not timing. Kept short because a long
   * one stops being tense and starts being a corridor.
   */
  function gauntlet(airName, n = 3, opts = {}) {
    const count = Math.max(2, Math.min(5, n));
    const step = opts.spacing || 0.3;
    return make({
      name: 'gauntlet',
      cost: 2 + Math.floor(count / 2),
      regime: 'hold',
      fits: (ctx) => {
        const o = resolve(ctx, airName);
        return o.height <= ctx.env.maxAirHeight;
      },
      place: (ctx) => {
        const o = resolve(ctx, airName);
        requireLane(o, 'air', 'gauntlet');
        if (o.height > ctx.env.maxAirHeight) {
          throw new Error(
            `Pattern.gauntlet: "${airName}" is ${o.height}px tall but the duck ` +
            `clearance band only admits ${ctx.env.maxAirHeight}px. A ducking ` +
            `player would still be hit.`
          );
        }
        const d = arcs(ctx, step);
        return Array.from({ length: count }, (_, i) => ({ name: airName, at: i * (o.width + d) }));
      },
      // Recovering from a held duck deserves more room than a landing does.
      trailGap: (ctx) => arcs(ctx, GAP.loose),
      describe: () => `gauntlet(${airName} x${count})`,
    });
  }

  return { breather, single, run, cluster, pair, gauntlet, GAP, SAFETY };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Pattern;
