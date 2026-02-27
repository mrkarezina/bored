// --- AudioEngine IIFE ---
const AudioEngine = (() => {
  let ac = null;
  let master = null;
  let bgInterval = null;
  let bgBeatOn = false;
  let beatNum = 0;
  let config = {};

  function init(soundConfig) {
    config = soundConfig || {};
  }

  function ensure() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain();
        master.gain.value = 0.4;
        master.connect(ac.destination);
      } catch(e) { return false; }
    }
    if (ac.state === 'suspended') ac.resume();
    return true;
  }

  // Slight pitch variation so repeated sounds don't feel robotic
  function pv(freq) { return freq * (0.95 + Math.random() * 0.1); }

  function tone(freq, dur, type, vol) {
    if (!ensure()) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g).connect(master);
    o.start(); o.stop(ac.currentTime + dur);
  }

  function sweep(f0, f1, dur, type, vol) {
    if (!ensure()) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, ac.currentTime);
    o.frequency.exponentialRampToValueAtTime(f1, ac.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.12, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur + 0.05);
    o.connect(g).connect(master);
    o.start(); o.stop(ac.currentTime + dur + 0.05);
  }

  function noise(dur, hpFreq, vol) {
    if (!ensure()) return;
    const sz = ac.sampleRate * dur;
    const buf = ac.createBuffer(1, sz, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const n = ac.createBufferSource();
    n.buffer = buf;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol || 0.1, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    if (hpFreq) {
      const hp = ac.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = hpFreq;
      n.connect(hp).connect(g).connect(master);
    } else {
      n.connect(g).connect(master);
    }
    n.start(); n.stop(ac.currentTime + dur);
  }

  // Sound functions — use custom overrides from THEME.sounds if provided
  function jump() {
    if (config.jump) { if (ensure()) config.jump(ac, master); return; }
    const f = config.jumpFreqs || [200, 500];
    sweep(pv(f[0]), pv(f[1]), 0.15, 'square', 0.12);
  }

  function doubleJump() {
    if (config.doubleJump) { if (ensure()) config.doubleJump(ac, master); return; }
    const f = config.jumpFreqs || [200, 500];
    sweep(pv(f[0] * 1.5), pv(f[1] * 1.5), 0.1, 'square', 0.1);
  }

  function land() {
    if (config.land) { if (ensure()) config.land(ac, master); return; }
    sweep(pv(150), pv(50), 0.1, 'sine', 0.15);
  }

  function die() {
    if (config.die) { if (ensure()) config.die(ac, master); return; }
    const f = config.hitFreq || 80;
    sweep(pv(400), pv(f), 0.4, 'sawtooth', 0.2);
    noise(0.2, 0, 0.1);
  }

  function collect() {
    if (config.collect) { if (ensure()) config.collect(ac, master); return; }
    const freqs = config.collectFreqs || [523, 659, 784];
    if (!ensure()) return;
    const pvMult = 0.95 + Math.random() * 0.1;
    freqs.forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'sine';
      o.frequency.value = f * pvMult;
      g.gain.setValueAtTime(0.001, ac.currentTime + i * 0.06);
      g.gain.linearRampToValueAtTime(0.12, ac.currentTime + i * 0.06 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.06 + 0.15);
      o.connect(g).connect(master);
      o.start(ac.currentTime + i * 0.06);
      o.stop(ac.currentTime + i * 0.06 + 0.15);
    });
  }

  function score100() {
    if (config.score100) { if (ensure()) config.score100(ac, master); return; }
    sweep(pv(800), pv(1200), 0.06, 'sine', 0.08);
  }

  function score1000() {
    if (config.score1000) { if (ensure()) config.score1000(ac, master); return; }
    if (!ensure()) return;
    [523, 659, 784].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(0.001, ac.currentTime + i * 0.08);
      g.gain.linearRampToValueAtTime(0.1, ac.currentTime + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.08 + 0.15);
      o.connect(g).connect(master);
      o.start(ac.currentTime + i * 0.08);
      o.stop(ac.currentTime + i * 0.08 + 0.15);
    });
  }

  function nearMiss() {
    if (config.nearMiss) { if (ensure()) config.nearMiss(ac, master); return; }
    if (!ensure()) return;
    const sz = ac.sampleRate * 0.15;
    const buf = ac.createBuffer(1, sz, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < sz; i++) d[i] = Math.random() * 2 - 1;
    const n = ac.createBufferSource();
    n.buffer = buf;
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1000, ac.currentTime);
    bp.frequency.exponentialRampToValueAtTime(4000, ac.currentTime + 0.1);
    bp.Q.value = 2;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.15, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
    n.connect(bp).connect(g).connect(master);
    n.start(); n.stop(ac.currentTime + 0.15);
  }

  function milestone() {
    if (config.milestone) { if (ensure()) config.milestone(ac, master); return; }
    if (!ensure()) return;
    [440, 880].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.001, ac.currentTime + i * 0.12);
      g.gain.linearRampToValueAtTime(0.15, ac.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.12 + 0.25);
      o.connect(g).connect(master);
      o.start(ac.currentTime + i * 0.12);
      o.stop(ac.currentTime + i * 0.12 + 0.25);
    });
  }

  function bgBeat(on) {
    if (on && !bgBeatOn) {
      bgBeatOn = true;
      beatNum = 0;
      const bpm = config.bgBPM || 120;
      const interval = 60000 / bpm;

      if (config.playBeat) {
        // Custom beat function — use lookahead scheduling
        let nextBeatTime = ac ? ac.currentTime + 0.1 : 0;
        bgInterval = setInterval(() => {
          if (!bgBeatOn || !ac) return;
          while (nextBeatTime < ac.currentTime + 0.1) {
            try { config.playBeat(ac, master, beatNum, nextBeatTime); } catch(e) {}
            beatNum++;
            nextBeatTime += 60 / bpm;
          }
        }, 25);
      } else {
        // Default simple beat
        bgInterval = setInterval(() => {
          if (!bgBeatOn) return;
          const freq = beatNum % 4 === 0 ? 60 : 45;
          tone(freq, 0.08, 'square', 0.04);
          beatNum++;
        }, interval);
      }
    } else if (!on) {
      bgBeatOn = false;
      if (bgInterval) clearInterval(bgInterval);
      bgInterval = null;
    }
  }

  return { init, ensure, jump, doubleJump, land, die, collect, score100, score1000, nearMiss, milestone, bgBeat };
})();
