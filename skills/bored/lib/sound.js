/**
 * sound.js — curated sound palettes over ZzFX.
 *
 * WHY THIS IS BLOCKS AND NOT FREEDOM
 *
 * Everywhere else in this library, drawing is left wide open: a bad sprite is
 * only ugly, and whoever writes the theme can reason about geometry directly.
 * Audio inverts both halves of that. A bad sound doesn't read as ugly, it reads
 * as broken — and a 20-number ZzFX array cannot be evaluated by reasoning. You
 * have to hear it.
 *
 * So the palettes below are authored by a human in the ZzFX designer
 * (https://killedbyapixel.github.io/ZzFX/), listened to, and shipped as tested
 * blocks. A theme picks a palette and optionally overrides one slot. Raw arrays
 * still work — they are the escape hatch, not the path.
 *
 * ZzFX parameter order, for anyone authoring a replacement:
 *   volume, randomness, frequency, attack, sustain, release, shape, shapeCurve,
 *   slide, deltaSlide, pitchJump, pitchJumpTime, repeatTime, noise, modulation,
 *   bitCrush, delay, sustainVolume, decay, tremolo, filter
 * shape: 0 sine · 1 triangle · 2 sawtooth · 3 tan · 4 noise
 */
const Sound = (() => {
  const SLOTS = ['jump', 'collect', 'hit', 'nearMiss', 'milestone', 'beat', 'lead'];

  /**
   * Pentatonic scales, as semitone offsets from the root. Motifs are written in
   * these because every note in a pentatonic scale is consonant with the root
   * and the fifth — so a phrase cannot land wrong against the bass underneath,
   * whatever order the notes come in. That is what makes it safe to loop for an
   * entire game.
   */
  const PENT_MINOR = [0, 3, 5, 7, 10, 12];

  /**
   * Real note frequencies, so the intervals in the palettes below are legible as
   * music rather than as magic numbers. `pitchJump` is an offset in Hz, so a
   * fifth up from E4 is written NOTE.B4 - NOTE.E4 and reads as what it is.
   */
  const NOTE = {
    E2: 82.41, G2: 98.00, A2: 110.00, C3: 130.81, E3: 164.81, G3: 196.00,
    A3: 220.00, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
    B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00,
  };

  /**
   * PALETTES
   *
   * Design rules, learned the hard way after the first set shipped sounding like
   * "hollow brushes":
   *
   *   - Sine (shape 0) and triangle (shape 1) ONLY. ZzFX shape 4 is sin(g**3),
   *     a noise waveform — it was on `beat`, which fires twice a second forever.
   *     That was the brushing.
   *   - No bitCrush, and noise only as a trace on `hit`, where a bit of body is
   *     wanted. Everything else stays clean.
   *   - shapeCurve left at its default of 1. Above that the waveform thins out
   *     and turns harsh, which is what the old values were doing.
   *   - Every pitch is a real note and every pitchJump is a real interval —
   *     mostly fifths and octaves, which is what makes a repeated motif sit
   *     still rather than nag.
   *   - Soft attacks, long-ish releases, sustainVolume around 0.5-0.7 so notes
   *     decay instead of stopping dead.
   *
   * TWO VOICES
   *
   * `beat` is the bass: low, quiet, root on beat one and a fifth on beat three.
   * On its own that is a pulse, not music — root and fifth alternating forever
   * reads as a tick however good the timbre is.
   *
   * `lead` is the melody voice, an octave above the bass, and `motif` is what it
   * plays: thirty-two eighth notes (four bars) given as semitone offsets from
   * the lead's root, with `null` for a rest. Every motif is pentatonic, so no
   * note can clash with the root and fifth underneath it, and every motif is
   * more rest than note, because this loops for the entire game and a busy line
   * is exactly what turns music back into nagging.
   */
  const PALETTES = {
    /** Bright triangle, pentatonic. The safe default. */
    chiptune: {
      //           vol rand  freq       atk  sus  rel  shp  -  sld  -  pitchJump          pjTime  -  -  -  -  delay susVol
      jump:      [.70, .02, NOTE.E4,   .01, .04, .16,  1, , ,  , NOTE.B4 - NOTE.E4,       .03, , , , , .02, .60],
      collect:   [.60, .02, NOTE.C5,   .01, .05, .20,  0, , ,  , NOTE.G5 - NOTE.C5,       .04, , , , , .03, .70],
      hit:       [.90, .04, NOTE.A2,   .02, .09, .30,  0, , -1.5, , ,                        , , .12, , , , .50],
      nearMiss:  [.30, .03, NOTE.E5,   .02, .03, .10,  0, ,  4,  , ,                        , , , , , .02, .50],
      milestone: [.65, .02, NOTE.C5,   .03, .12, .28,  0, , ,  , NOTE.E5 - NOTE.C5,       .05, , , , , .04, .70],
      beat:      [.35, .01, NOTE.A2,   .02, .05, .13,  1, , ,  , ,                        , , , , , .02, .45],
      lead:      [.24, .01, NOTE.A3,   .02, .05, .19,  1, , ,  , ,                        , , , , , .02, .55],
      // A minor pentatonic: climb to the fifth, touch the octave, settle back.
      motif: [
        0, null, null, 7, null, 5, null, null,
        3, null, 5, null, 7, null, null, null,
        12, null, 10, null, 7, null, 5, null,
        3, null, null, 0, null, null, null, null,
      ],
    },
    /** Low warm sine. Animals, nature, anything soft. */
    organic: {
      jump:      [.60, .03, NOTE.A3,   .02, .05, .20,  0, , ,  , NOTE.E4 - NOTE.A3,       .04, , , , , .03, .60],
      collect:   [.55, .02, NOTE.A4,   .02, .06, .24,  0, , ,  , NOTE.E5 - NOTE.A4,       .05, , , , , .04, .70],
      hit:       [.85, .05, NOTE.E2,   .03, .10, .34,  0, ,  -1, , ,                        , , .10, , , , .50],
      nearMiss:  [.28, .03, NOTE.C5,   .03, .04, .12,  0, ,  3,  , ,                        , , , , , .03, .50],
      milestone: [.60, .02, NOTE.A4,   .04, .14, .32,  0, , ,  , NOTE.A5 - NOTE.A4,       .06, , , , , .05, .70],
      beat:      [.30, .01, NOTE.E2,   .03, .06, .16,  0, , ,  , ,                        , , , , , .03, .50],
      lead:      [.22, .01, NOTE.E3,   .03, .06, .24,  0, , ,  , ,                        , , , , , .03, .60],
      // Sparser and slower to turn than the others — long notes, long gaps.
      motif: [
        0, null, null, null, 5, null, null, null,
        7, null, null, 5, null, null, 3, null,
        0, null, null, null, 3, null, null, null,
        5, null, 3, null, 0, null, null, null,
      ],
    },
    /** Bright triangle in a high register, fourths. Machines, cities, ice. */
    metallic: {
      jump:      [.70, .02, NOTE.G4,   .01, .03, .14,  1, , ,  , NOTE.C5 - NOTE.G4,       .02, , , , , .02, .55],
      collect:   [.60, .02, NOTE.E5,   .01, .04, .16,  1, , ,  , NOTE.A5 - NOTE.E5,       .03, , , , , .03, .65],
      hit:       [.95, .05, NOTE.C3,   .02, .08, .28,  0, ,  -2, , ,                        , , .15, , , , .45],
      nearMiss:  [.30, .03, NOTE.G5,   .01, .03, .09,  1, ,  5,  , ,                        , , , , , .02, .50],
      milestone: [.70, .02, NOTE.E5,   .02, .10, .24,  1, , ,  , NOTE.A5 - NOTE.E5,       .04, , , , , .03, .65],
      beat:      [.32, .01, NOTE.C3,   .02, .04, .11,  1, , ,  , ,                        , , , , , .02, .40],
      lead:      [.22, .01, NOTE.C4,   .01, .04, .16,  1, , ,  , ,                        , , , , , .02, .50],
      // Descending — starts high and walks down, which reads as machinery
      // winding rather than a tune going somewhere.
      motif: [
        12, null, 10, null, 7, null, null, null,
        10, null, 7, null, 5, null, null, null,
        7, null, 5, null, 3, null, null, null,
        5, null, 3, null, 0, null, null, null,
      ],
    },
    /** Triangle, octaves and fifths. Classic arcade, without the buzz. */
    retro: {
      jump:      [.75, .03, NOTE.C4,   .01, .04, .18,  1, , ,  , NOTE.C5 - NOTE.C4,       .03, , , , , .02, .60],
      collect:   [.60, .02, NOTE.D5,   .01, .05, .20,  1, , ,  , NOTE.A5 - NOTE.D5,       .04, , , , , .03, .70],
      hit:       [.90, .05, NOTE.G2,   .02, .10, .32,  0, , -1.5, , ,                        , , .12, , , , .50],
      nearMiss:  [.30, .03, NOTE.D5,   .02, .03, .11,  1, ,  4,  , ,                        , , , , , .02, .50],
      milestone: [.68, .02, NOTE.G4,   .03, .12, .30,  1, , ,  , NOTE.D5 - NOTE.G4,       .05, , , , , .04, .70],
      beat:      [.33, .01, NOTE.G2,   .02, .05, .14,  1, , ,  , ,                        , , , , , .02, .45],
      lead:      [.23, .01, NOTE.G3,   .01, .04, .17,  1, , ,  , ,                        , , , , , .02, .55],
      // A rising arpeggio and then a whole bar of nothing. The silence is the
      // hook — it is what stops four bars on a loop becoming wallpaper.
      motif: [
        0, null, 3, null, 5, null, 7, null,
        null, null, null, null, 10, null, 7, null,
        5, null, 3, null, 0, null, null, null,
        null, null, null, null, null, null, null, null,
      ],
    },
  };

  /**
   * Tempos are deliberately unhurried. The pulse plays on half the beats (see
   * AudioEngine.bgBeat), so these read slower than the number suggests — which
   * is the point: something you hear a thousand times should sit under the game,
   * not tap you on the shoulder.
   */
  const BPM = { chiptune: 112, organic: 96, metallic: 120, retro: 104 };

  function validateSlot(slot, params, where) {
    if (!Array.isArray(params)) {
      throw new Error(`Sound: ${where}.${slot} must be a ZzFX parameter array, got ${typeof params}`);
    }
    if (params.length > 21) {
      throw new Error(`Sound: ${where}.${slot} has ${params.length} parameters; ZzFX takes at most 21`);
    }
    for (const v of params) {
      if (v !== undefined && typeof v !== 'number') {
        throw new Error(`Sound: ${where}.${slot} contains a non-number (${JSON.stringify(v)})`);
      }
    }
  }

  /**
   * Build a full sound set from a named palette, with optional per-slot
   * overrides. Unknown slot names throw rather than being silently ignored —
   * a typo'd sound that never plays is exactly the class of dead code this
   * library exists to make impossible.
   */
  function build(name, overrides = {}) {
    const base = PALETTES[name];
    if (!base) {
      throw new Error(`Sound: no palette named "${name}". Try: ${Object.keys(PALETTES).join(', ')}`);
    }
    for (const key of Object.keys(overrides)) {
      if (key === 'bpm' || key === 'motif') continue;
      if (!SLOTS.includes(key)) {
        throw new Error(`Sound: "${key}" is not a sound slot. Slots are: ${SLOTS.join(', ')}, bpm, motif`);
      }
      validateSlot(key, overrides[key], 'override');
    }

    const motif = overrides.motif || base.motif;
    if (motif !== undefined) {
      if (!Array.isArray(motif)) throw new Error('Sound: motif must be an array of semitone offsets, with null for a rest');
      for (const n of motif) {
        if (n === null || n === undefined) continue;
        if (typeof n !== 'number' || !Number.isInteger(n)) {
          throw new Error(`Sound: motif contains ${JSON.stringify(n)}; entries must be whole semitone offsets or null`);
        }
      }
    }

    const set = {};
    for (const slot of SLOTS) set[slot] = (overrides[slot] || base[slot]).slice();
    set.palette = name;
    // Tempo of the background pulse. Each palette has a resting pace that suits
    // its character; 100-110 reads relaxed, 130+ reads urgent.
    set.bpm = overrides.bpm || BPM[name];
    set.motif = motif ? motif.slice() : null;
    return set;
  }

  /**
   * Return the same sound at a different pitch. Used for the combo ramp, where
   * each pickup in a streak rises a semitone. Copies rather than mutating, since
   * the palette arrays are shared across every play.
   */
  function transpose(params, mult) {
    const out = params.slice();
    out[2] = (out[2] || 220) * mult;
    return out;
  }

  /**
   * The same sound `n` semitones up. Twelve semitones is an octave, hence the
   * twelfth root of two. Used to play a motif from one stored note rather than
   * storing a parameter array per pitch.
   */
  function semitone(params, n) {
    return transpose(params, Math.pow(2, n / 12));
  }

  const api = { build, transpose, semitone, SLOTS, PENT_MINOR, PALETTES };
  for (const name of Object.keys(PALETTES)) {
    api[name] = (overrides) => build(name, overrides);
  }
  return api;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Sound;
