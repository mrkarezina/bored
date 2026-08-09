/**
 * envelope.js — what the player can physically reach.
 *
 * This is the keystone the rest of the library is expressed against. It
 * simulates the engine's own jump integration (runner-engine.js updatePlayer)
 * once at boot and answers the only questions level design actually needs:
 *
 *   how long am I in the air?          -> frames
 *   how long am I above that thing?    -> clearFrames(h)
 *   how far does the world move mean-  -> span(speed), clearSpan(h, speed)
 *   while?
 *
 * WHY THIS EXISTS
 *
 * A jump takes a fixed number of frames. During it the player is above a given
 * obstacle height for a shorter, also fixed, number of frames. That splits the
 * space of gaps between two obstacles into three regions:
 *
 *   gap <= clearSpan(h)   one arc straddles both        survivable
 *   gap >= span()         land between them, jump again  survivable
 *   in between            neither                        UNWINNABLE
 *
 * The middle region is real, it is wide (~317-391px at max speed with the
 * default physics), and a spawner that picks gaps at random walks into it
 * constantly. Every pattern in this library is built so it cannot contain a gap
 * in that band, and the scheduler spaces patterns above span() so the seams
 * between them can't either.
 *
 * UNITS
 *
 * Everything internal is frames and pixels, never milliseconds. The engine steps
 * physics at a fixed 60Hz, so a frame is the natural quantum and speed is
 * px/frame. Milliseconds appear only in human-facing reports.
 */
const Envelope = (() => {
  const FPS = 60;
  const MS_PER_FRAME = 1000 / FPS;
  const MAX_FRAMES = 600;          // 10s — an arc longer than this is a bad theme
  const TAP_FRAMES = 6;            // shortest hold the variable-jump code responds to
  const REACTION_FRAMES = 15;      // ~250ms: perceive -> decide -> act

  /**
   * Replays the engine's integration step for step.
   *
   * Mirrors runner-engine.js: velocity is advanced first, then position, then
   * the ground is tested. The constants are the engine's own and are duplicated
   * deliberately — the engine must not reach into this library from its hot
   * loop, and this library must run without a browser. `test/engine-sync.test.js`
   * is what keeps the two honest; it boots the real engine and compares arcs.
   *
   * Note the variable-jump behaviour lives in TWO places in the engine, which is
   * how the velocity cut below got missed on the first pass: updatePlayer()
   * owns the gravity multipliers, but onJumpRelease() separately cuts upward
   * velocity to 40% the moment the button comes up.
   */
  function simulate(player, holdFrames) {
    const gravity = player.gravity;
    let vy = player.jumpForce;   // negative is up
    let altitude = 0;            // px above the ground line
    let cutApplied = false;
    const track = [];

    for (let f = 0; f < MAX_FRAMES; f++) {
      const held = f < holdFrames;

      // runner-engine.js onJumpRelease(): releasing while still rising cuts the
      // climb immediately. Fires once, on the frame the hold ends.
      if (!held && !cutApplied && vy < 0) {
        vy *= 0.4;
        cutApplied = true;
      }

      let mult = 1.0;
      if (vy > 0) mult = 2.0;                        // falling: snappy descent
      else if (vy < 0 && !held) mult = 1.8;          // released early while rising
      if (Math.abs(vy) < 2) mult *= 0.5;             // hang time at the apex

      vy += gravity * mult;
      altitude -= vy;
      track.push(altitude);
      if (altitude <= 0) return { frames: f + 1, track };
    }

    throw new Error(
      `Envelope: a jump with jumpForce ${player.jumpForce} and gravity ${gravity} ` +
      `never lands. jumpForce must be negative and gravity positive.`
    );
  }

  /**
   * Build the envelope for a theme's player block. Called once, at boot.
   * Throws loudly on physics that cannot produce a playable arc — a silent
   * fallback here would surface later as a game nobody can beat.
   */
  function compute(player) {
    if (!player || typeof player.jumpForce !== 'number' || typeof player.gravity !== 'number') {
      throw new Error('Envelope.compute: player needs numeric jumpForce and gravity');
    }
    if (player.jumpForce >= 0) {
      throw new Error(`Envelope.compute: jumpForce must be negative (up is -Y), got ${player.jumpForce}`);
    }
    if (player.gravity <= 0) {
      throw new Error(`Envelope.compute: gravity must be positive, got ${player.gravity}`);
    }

    const full = simulate(player, MAX_FRAMES);
    const tap = simulate(player, TAP_FRAMES);
    const peak = Math.max(...full.track);

    const height = player.height || 40;
    const width = player.width || 32;
    const duckHeight = player.duckHeight || height * 0.5;
    const duckClearance = height - duckHeight;

    /** Frames spent with the feet above altitude `h`. */
    function clearFrames(h) {
      if (h >= peak) return 0;
      let n = 0;
      for (const a of full.track) if (a > h) n++;
      return n;
    }

    const env = {
      // --- raw arc ---
      frames: full.frames,
      tapFrames: tap.frames,
      peak,
      airtimeMs: Math.round(full.frames * MS_PER_FRAME),
      tapAirtimeMs: Math.round(tap.frames * MS_PER_FRAME),

      // --- player geometry the placement rules depend on ---
      /**
       * The player is a box, not a point, so an obstacle threatens it for
       * playerWidth px longer than the obstacle's own width. Every cluster fit
       * calculation has to pay this.
       */
      playerWidth: width,
      playerHeight: height,
      duckClearance,
      /**
       * Tallest an air obstacle may be and still be duckable. The engine centres
       * air obstacles in the clearance band and gives the player 4px of collision
       * padding per side, so working the vertical AABB through gives
       * height <= clearance + 16.
       */
      maxAirHeight: duckClearance + 16,

      clearFrames,

      /**
       * Frames from takeoff until the feet are above `h`. This is how long
       * before an obstacle a jump has to start, which is exactly what a bot —
       * or a player building muscle memory — needs to know.
       */
      riseFrames(h) {
        for (let i = 0; i < full.track.length; i++) if (full.track[i] > h) return i + 1;
        return Infinity;   // never gets above it
      },

      // --- distances, given a world speed in px/frame ---
      /** Px the world moves during one full-hold arc. The land-and-rejump floor. */
      span: (speed) => speed * full.frames,
      /** Px the world moves while the player is above height `h`. The one-arc ceiling. */
      clearSpan: (h, speed) => speed * clearFrames(h),
      /** Px of world travel a human needs to see something and respond to it. */
      reactionSpan: (speed) => speed * REACTION_FRAMES,

      /**
       * The gap band with no answer, for an obstacle of height `h` at `speed`.
       * Gaps in (low, high) are survivable by neither strategy. Patterns must
       * never contain one; the scheduler must never create one at a seam.
       */
      band: (h, speed) => ({
        low: speed * clearFrames(h),
        high: speed * full.frames,
      }),

      // --- arc units: the unit patterns are authored in ---
      /** Px -> arc units. 1.0 arc == one full-hold jump's worth of world travel. */
      toArcs: (px, speed) => px / (speed * full.frames),
      /** Arc units -> px. */
      toPx: (arcs, speed) => arcs * speed * full.frames,
    };

    return env;
  }

  return { compute, FPS, MS_PER_FRAME, REACTION_FRAMES, TAP_FRAMES };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Envelope;
