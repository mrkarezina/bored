const { test } = require('node:test');
const assert = require('node:assert');

/**
 * SOUNDS MUST BE TONAL.
 *
 * The first set of palettes shipped sounding, in the user's words, like "hollow
 * brushes". The cause was `beat` using ZzFX shape 4 — which is sin(g**3), a
 * noise waveform, not an instrument — firing twice a second for the whole game.
 * Measured, it produced a zero-crossing rate of 10.5kHz against an intended
 * 70Hz. It was never a note.
 *
 * Nobody writing this code can hear it, which is exactly why the palettes are
 * curated rather than generated. This test is the substitute for ears: it
 * renders each sound to samples and checks the waveform actually oscillates at
 * something near the pitch it claims. It cannot tell you a sound is pleasant. It
 * can tell you a sound is a pitch.
 */

// Web Audio, stubbed just enough to capture what ZzFX renders. Must be defined
// before the first play() — Vendor creates its context lazily.
let lastBuffer = null;
global.AudioContext = class {
  constructor() { this.sampleRate = 44100; this.destination = {}; this.state = 'running'; }
  createBuffer(channels, length, rate) {
    const data = new Float32Array(length);
    lastBuffer = { data, rate };
    return { length, getChannelData: () => data };
  }
  createBufferSource() { return { buffer: null, connect() {}, start() {} }; }
  resume() {}
};

const Vendor = require('../skills/bored/lib/vendor.js');
const Sound = require('../skills/bored/lib/sound.js');

/**
 * Render a ZzFX array and measure its zero-crossing rate over the audible part.
 * A sine or triangle crosses zero exactly twice per cycle, so ZCR/2 is the
 * pitch. Noise crosses constantly and reads orders of magnitude high.
 */
function pitchOf(params) {
  // ZzFX applies its `randomness` parameter via Math.random(), detuning every
  // play by a percent or so. Pinning it to 0.5 makes the multiplier exactly 1,
  // so the measurement below is of the note as written rather than of one
  // random instance of it.
  const realRandom = Math.random;
  Math.random = () => 0.5;
  try {
    lastBuffer = null;
    Vendor.zzfx.play(params);
  } finally {
    Math.random = realRandom;
  }
  assert.ok(lastBuffer, 'ZzFX rendered nothing');

  const { data, rate } = lastBuffer;
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  assert.ok(peak > 0.001, 'sound is silent');

  const threshold = peak * 0.15;
  let start = 0, end = data.length - 1;
  while (start < data.length && Math.abs(data[start]) < threshold) start++;
  while (end > start && Math.abs(data[end]) < threshold) end--;

  // Measure between the FIRST and LAST zero crossing, not across the whole
  // window. That spans a whole number of half-cycles, so there is no partial
  // cycle at either edge — at 82Hz over 150ms the naive version carried about
  // 4% error, which is more than the thing being asserted.
  let first = -1, last = -1, crossings = 0;
  for (let i = start + 1; i <= end; i++) {
    if ((data[i - 1] < 0) !== (data[i] < 0)) {
      if (first < 0) first = i;
      last = i;
      crossings++;
    }
  }
  if (crossings < 2) return { hz: 0, peak };

  const seconds = (last - first) / rate;
  return { hz: (crossings - 1) / 2 / seconds, seconds, peak };
}

const PALETTES = Object.keys(Sound.PALETTES);

test('the noise waveform is gone from every palette', () => {
  // ZzFX shape 4 is sin(g**3). Nothing in a musical palette should use it.
  for (const name of PALETTES) {
    const set = Sound[name]();
    for (const slot of Sound.SLOTS) {
      const shape = set[slot][6];
      assert.ok(shape === undefined || shape < 4,
        `${name}.${slot} uses shape ${shape}; 4 is a noise waveform, not an instrument`);
    }
  }
});

test('every sound oscillates near the pitch it declares', () => {
  for (const name of PALETTES) {
    const set = Sound[name]();
    for (const slot of Sound.SLOTS) {
      const intended = set[slot][2];
      const { hz } = pitchOf(set[slot]);
      const ratio = hz / intended;
      // Generous bounds: sounds that slide down read low, sounds with a pitch
      // jump up read high. What this excludes is noise, which reads 50x+.
      assert.ok(ratio > 0.4 && ratio < 2.5,
        `${name}.${slot}: declared ${Math.round(intended)}Hz but the waveform ` +
        `oscillates at ${Math.round(hz)}Hz (${ratio.toFixed(1)}x). That is not a note.`);
    }
  }
});

test('the background pulse is dead on pitch, because it repeats forever', () => {
  // Every other sound is occasional and can afford a slide or a jump. This one
  // plays for the entire game, so it has to be a clean, stable note.
  for (const name of PALETTES) {
    const set = Sound[name]();
    const { hz } = pitchOf(set.beat);
    const ratio = hz / set.beat[2];
    assert.ok(Math.abs(ratio - 1) < 0.05,
      `${name}.beat: declared ${set.beat[2]}Hz, measured ${Math.round(hz)}Hz`);
  }
});

test('the pulse stays quiet enough to sit under the game', () => {
  for (const name of PALETTES) {
    const set = Sound[name]();
    assert.ok(set.beat[0] <= 0.4, `${name}.beat volume ${set.beat[0]} is too loud for something on a loop`);
    // And low: a repeating tone in the mid range is a nag, in the bass it is a pulse.
    assert.ok(set.beat[2] <= 140, `${name}.beat at ${set.beat[2]}Hz is too high to disappear under the game`);
  }
});

test('pitch jumps land on real musical intervals', () => {
  // A repeated motif only sits still if the interval is consonant. Anything
  // else reads as a mistake however carefully the envelope is shaped.
  const CONSONANT = [1.2, 1.25, 1.333, 1.5, 1.667, 2];   // m3, M3, P4, P5, M6, octave
  for (const name of PALETTES) {
    const set = Sound[name]();
    for (const slot of Sound.SLOTS) {
      const base = set[slot][2];
      const jump = set[slot][10];
      if (!jump) continue;
      const ratio = (base + jump) / base;
      const nearest = CONSONANT.reduce((a, b) => (Math.abs(b - ratio) < Math.abs(a - ratio) ? b : a));
      assert.ok(Math.abs(nearest - ratio) < 0.03,
        `${name}.${slot}: jumps by ${ratio.toFixed(3)}x, which is not a musical interval`);
    }
  }
});

test('every palette has a melody, not just a pulse', () => {
  for (const name of PALETTES) {
    const set = Sound[name]();
    assert.ok(Array.isArray(set.motif) && set.motif.length, `${name} has no motif`);
    assert.strictEqual(set.motif.length % 8, 0,
      `${name}.motif is ${set.motif.length} eighths, which does not divide into whole bars`);
    assert.ok(Array.isArray(set.lead), `${name} has no lead voice to play the motif`);
  }
});

test('motifs are pentatonic, so nothing can clash with the bass', () => {
  for (const name of PALETTES) {
    const { motif } = Sound[name]();
    for (const n of motif) {
      if (n === null) continue;
      assert.ok(Sound.PENT_MINOR.includes(n),
        `${name}.motif uses semitone ${n}, which is outside the pentatonic scale ` +
        `[${Sound.PENT_MINOR}] and can land wrong against the root and fifth underneath`);
    }
  }
});

test('motifs are mostly rest, because they loop for the whole game', () => {
  for (const name of PALETTES) {
    const { motif } = Sound[name]();
    const notes = motif.filter((n) => n !== null).length;
    const density = notes / motif.length;
    assert.ok(density <= 0.5,
      `${name}.motif plays on ${(density * 100).toFixed(0)}% of its steps — too busy to sit under a game`);
    assert.ok(notes >= 4, `${name}.motif has only ${notes} notes, which is not a phrase`);
  }
});

test('the melody sits under the sound effects, never over them', () => {
  for (const name of PALETTES) {
    const set = Sound[name]();
    assert.ok(set.lead[0] < set.jump[0], `${name}: lead is louder than the jump sound`);
    assert.ok(set.lead[0] <= 0.28, `${name}: lead volume ${set.lead[0]} is too present for a loop`);
    // An octave above the bass keeps them out of each other's way.
    const ratio = set.lead[2] / set.beat[2];
    assert.ok(ratio > 1.5 && ratio < 4.5,
      `${name}: lead is ${ratio.toFixed(2)}x the bass; it should sit roughly an octave up`);
  }
});

test('every note the motif can play is in tune', () => {
  for (const name of PALETTES) {
    const set = Sound[name]();
    for (const n of new Set(set.motif.filter((x) => x !== null))) {
      const expected = set.lead[2] * Math.pow(2, n / 12);
      const { hz } = pitchOf(Sound.semitone(set.lead, n));
      assert.ok(Math.abs(hz / expected - 1) < 0.05,
        `${name}.motif note +${n}: expected ${Math.round(expected)}Hz, waveform measured ${Math.round(hz)}Hz`);
    }
  }
});

test('transpose keeps a sound tonal', () => {
  const beat = Sound.chiptune().beat;
  const base = pitchOf(beat).hz;
  const fifth = pitchOf(Sound.transpose(beat, 1.5)).hz;
  assert.ok(Math.abs(fifth / base - 1.5) < 0.08,
    `a fifth above ${Math.round(base)}Hz measured ${Math.round(fifth)}Hz`);
});
