/**
 * AudioEngine — game sounds, synthesised by ZzFX from a curated palette.
 *
 * The public surface is unchanged from the hand-wired Web Audio version this
 * replaces — init/jump/collect/hit/nearMiss/milestone/bgBeat — so nothing in
 * runner-engine.js had to move. What changed is underneath: six sounds that were
 * each ~20 lines of oscillator plumbing, tunable by four scalars, are now
 * parameter arrays from lib/sound.js. Two of the six (nearMiss and milestone)
 * previously ignored the theme entirely and were identical in every game ever
 * generated; all six are themed now.
 *
 * Audio must never be able to take the game down. Every entry point is a
 * no-op when Web Audio is unavailable, and ZzFX itself is wrapped.
 */
const AudioEngine = (() => {
  let sounds = null;
  let bgInterval = null;
  let bgBeatOn = false;

  /**
   * `soundSet` comes from lib/sound.js — Sound.chiptune() and friends. A theme
   * that somehow supplies nothing still gets a working game, just a quiet one.
   */
  function init(soundSet) {
    sounds = soundSet || null;
    if (sounds && typeof Vendor !== 'undefined') Vendor.zzfx.setVolume(0.3);
  }

  function play(slot, override) {
    if (!sounds || typeof Vendor === 'undefined') return;
    const params = override || sounds[slot];
    if (params) Vendor.zzfx.play(params);
  }

  /**
   * Create/resume the AudioContext. Must be called from inside a user-gesture
   * handler: browsers suspend any context made before one, which is the whole
   * "no sound on mobile" failure mode. runner-engine calls this on first input.
   */
  function unlock() {
    if (typeof Vendor === 'undefined') return false;
    return Vendor.zzfx.ensureContext();
  }

  function jump() { play('jump'); }
  function hit() { play('hit'); }
  function nearMiss() { play('nearMiss'); }
  function milestone() { play('milestone'); }

  /**
   * Pickups rise a semitone per consecutive collect, so a streak audibly
   * climbs. Capped at an octave so a long combo doesn't end up inaudible.
   */
  function collect(combo) {
    if (!sounds || typeof Vendor === 'undefined') return;
    const steps = Math.min(combo || 0, 12);
    const mult = Math.pow(1.0595, steps);
    Vendor.zzfx.play(Sound.transpose(sounds.collect, mult));
  }

  /**
   * The music: a bass pulse and a melody over it, on an eighth-note grid.
   *
   * Bass takes the root on beat one and a fifth on beat three — half-time, so it
   * reads as a pulse rather than a metronome. A tick on every single beat is
   * what turns background into nagging.
   *
   * Melody is the palette's motif, four bars of pentatonic that loop for the
   * whole run. It is quieter than everything else in the mix on purpose: the
   * player should notice it if they listen for it and not otherwise.
   */
  function bgBeat(on) {
    if (on && !bgBeatOn) {
      if (!sounds) return;
      bgBeatOn = true;
      const eighth = 60000 / (sounds.bpm || 112) / 2;
      const motif = sounds.motif;
      let step = 0;

      bgInterval = setInterval(() => {
        if (!bgBeatOn) return;
        const inBar = step % 8;                 // eight eighths to the bar
        if (inBar === 0) play('beat', sounds.beat);
        else if (inBar === 4) play('beat', Sound.transpose(sounds.beat, 1.5));

        if (motif && motif.length && sounds.lead) {
          const note = motif[step % motif.length];
          if (note !== null && note !== undefined) {
            play('lead', Sound.semitone(sounds.lead, note));
          }
        }
        step++;
      }, eighth);
    } else if (!on) {
      bgBeatOn = false;
      if (bgInterval) clearInterval(bgInterval);
      bgInterval = null;
    }
  }

  return { init, unlock, jump, collect, hit, nearMiss, milestone, bgBeat };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = AudioEngine;
