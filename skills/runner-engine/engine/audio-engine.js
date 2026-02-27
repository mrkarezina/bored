/**
 * AudioEngine — Web Audio API synth for game sounds
 * Embed verbatim. Tuned via THEME.sounds config.
 */
const AudioEngine = (() => {
  let audioCtx = null;
  let config = {};
  let bgInterval = null;
  let bgBeatOn = false;
  let masterGain = null;

  function init(soundConfig) {
    config = soundConfig || {};
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.3;
      masterGain.connect(audioCtx.destination);
    } catch (e) {
      console.warn('Web Audio not available');
    }
  }

  function ensureCtx() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return !!audioCtx;
  }

  function playTone(freq, duration, type, gainVal) {
    if (!ensureCtx()) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal || 0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  function jump() {
    if (!ensureCtx()) return;
    const freqs = config.jumpFreqs || [200, 500];
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freqs[0], audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freqs[1], audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  }

  function collect(combo) {
    if (!ensureCtx()) return;
    const freqs = config.collectFreqs || [523, 659, 784];
    // Rising pitch for combo streaks (semitone per consecutive pickup)
    const pitchMult = combo ? Math.pow(1.0595, Math.min(combo, 12)) : 1;
    // Random pitch variation (+/- 15%) for organic feel
    const variation = 0.85 + Math.random() * 0.3;
    freqs.forEach((f, i) => {
      setTimeout(() => playTone(f * pitchMult * variation, 0.15, 'sine', 0.12), i * 60);
    });
  }

  function nearMiss() {
    if (!ensureCtx()) return;
    // Quick ascending whoosh
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
  }

  function hit() {
    if (!ensureCtx()) return;
    const freq = config.hitFreq || 80;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);

    // Noise burst
    const bufferSize = audioCtx.sampleRate * 0.2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    noise.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();
  }

  function milestone() {
    if (!ensureCtx()) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2, 'sine', 0.1), i * 80);
    });
  }

  function bgBeat(on) {
    if (on && !bgBeatOn) {
      bgBeatOn = true;
      const bpm = config.bgBPM || 120;
      const interval = 60000 / bpm;
      let beat = 0;
      bgInterval = setInterval(() => {
        if (!bgBeatOn) return;
        const freq = beat % 4 === 0 ? 60 : 45;
        playTone(freq, 0.08, 'square', 0.04);
        beat++;
      }, interval);
    } else if (!on) {
      bgBeatOn = false;
      if (bgInterval) clearInterval(bgInterval);
      bgInterval = null;
    }
  }

  return { init, jump, collect, hit, nearMiss, milestone, bgBeat };
})();
