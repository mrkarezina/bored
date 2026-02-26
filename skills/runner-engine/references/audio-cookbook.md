# Audio Cookbook — Procedural Sound Recipes

Ready-to-use Web Audio API sound recipes for the game engine. Each recipe is a function that takes `(audioCtx, masterGain)`.

All sounds are short, procedural, and use only built-in Web Audio API nodes — no samples or external files needed.

## Helper: Create Noise Buffer

Some recipes need a noise source. Create one like this:

```js
function createNoise(ac, duration) {
  const bufferSize = ac.sampleRate * duration;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const node = ac.createBufferSource();
  node.buffer = buffer;
  return node;
}
```

---

## Jump — Ascending Chirp

A quick upward sweep. Square wave for retro feel, sine for softer.

```js
jump(ac, g) {
  const o = ac.createOscillator();
  const v = ac.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(300, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(600, ac.currentTime + 0.1);
  v.gain.setValueAtTime(0.15, ac.currentTime);
  v.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
  o.connect(v).connect(g);
  o.start(); o.stop(ac.currentTime + 0.12);
}
```

## Double Jump — Higher Chirp

Same pattern but higher pitch range:

```js
doubleJump(ac, g) {
  const o = ac.createOscillator();
  const v = ac.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(500, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(900, ac.currentTime + 0.08);
  v.gain.setValueAtTime(0.12, ac.currentTime);
  v.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
  o.connect(v).connect(g);
  o.start(); o.stop(ac.currentTime + 0.1);
}
```

## Land — Low Thud

Short sine wave pitch drop simulating impact:

```js
land(ac, g) {
  const o = ac.createOscillator();
  const v = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(50, ac.currentTime + 0.1);
  v.gain.setValueAtTime(0.2, ac.currentTime);
  v.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
  o.connect(v).connect(g);
  o.start(); o.stop(ac.currentTime + 0.12);
}
```

## Die — Descending Death

Dramatic sawtooth wave falling in pitch with longer duration:

```js
die(ac, g) {
  const o = ac.createOscillator();
  const v = ac.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(400, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, ac.currentTime + 0.5);
  v.gain.setValueAtTime(0.2, ac.currentTime);
  v.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
  o.connect(v).connect(g);
  o.start(); o.stop(ac.currentTime + 0.5);
}
```

## Score 100 — Quick Blip

Short, cheerful ascending note:

```js
score100(ac, g) {
  const o = ac.createOscillator();
  const v = ac.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(800, ac.currentTime);
  o.frequency.exponentialRampToValueAtTime(1200, ac.currentTime + 0.06);
  v.gain.setValueAtTime(0.1, ac.currentTime);
  v.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
  o.connect(v).connect(g);
  o.start(); o.stop(ac.currentTime + 0.08);
}
```

## Score 1000 — Triumphant Arpeggio

Three-note ascending sequence:

```js
score1000(ac, g) {
  [523, 659, 784].forEach((freq, i) => {
    const o = ac.createOscillator();
    const v = ac.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    v.gain.setValueAtTime(0.001, ac.currentTime + i * 0.08);
    v.gain.linearRampToValueAtTime(0.1, ac.currentTime + i * 0.08 + 0.01);
    v.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.08 + 0.15);
    o.connect(v).connect(g);
    o.start(ac.currentTime + i * 0.08);
    o.stop(ac.currentTime + i * 0.08 + 0.15);
  });
}
```

## Near Miss — Whoosh

Bandpass-filtered noise burst:

```js
nearMiss(ac, g) {
  const bufferSize = ac.sampleRate * 0.15;
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ac.createBufferSource();
  noise.buffer = buffer;
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(1000, ac.currentTime);
  bp.frequency.exponentialRampToValueAtTime(4000, ac.currentTime + 0.1);
  bp.Q.value = 2;
  const v = ac.createGain();
  v.gain.setValueAtTime(0.15, ac.currentTime);
  v.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
  noise.connect(bp).connect(v).connect(g);
  noise.start(); noise.stop(ac.currentTime + 0.15);
}
```

## Milestone — Achievement Jingle

Two-note fanfare:

```js
milestone(ac, g) {
  [440, 880].forEach((freq, i) => {
    const o = ac.createOscillator();
    const v = ac.createGain();
    o.type = 'triangle';
    o.frequency.value = freq;
    v.gain.setValueAtTime(0.001, ac.currentTime + i * 0.12);
    v.gain.linearRampToValueAtTime(0.15, ac.currentTime + i * 0.12 + 0.02);
    v.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + i * 0.12 + 0.25);
    o.connect(v).connect(g);
    o.start(ac.currentTime + i * 0.12);
    o.stop(ac.currentTime + i * 0.12 + 0.25);
  });
}
```

---

## Background Music Recipes

### Simple Kick + Hi-Hat Pattern

```js
bpm: 120,
playBeat(ac, g, beatNum, time) {
  // Kick on beats 0, 4, 8, 12 (every bar)
  if (beatNum % 4 === 0) {
    const kick = ac.createOscillator();
    const kv = ac.createGain();
    kick.type = 'sine';
    kick.frequency.setValueAtTime(150, time);
    kick.frequency.exponentialRampToValueAtTime(30, time + 0.15);
    kv.gain.setValueAtTime(0.25, time);
    kv.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    kick.connect(kv).connect(g);
    kick.start(time); kick.stop(time + 0.2);
  }

  // Hi-hat on every beat
  const bufSize = ac.sampleRate * 0.05;
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
  const hat = ac.createBufferSource();
  hat.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 8000;
  const hv = ac.createGain();
  hv.gain.setValueAtTime(beatNum % 2 === 0 ? 0.08 : 0.04, time);
  hv.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
  hat.connect(hp).connect(hv).connect(g);
  hat.start(time); hat.stop(time + 0.05);
}
```

### Kick + Snare + Hi-Hat with Bass

```js
bpm: 130,
playBeat(ac, g, beatNum, time) {
  const bar = beatNum % 8;

  // Kick on 0, 4
  if (bar === 0 || bar === 4) {
    const o = ac.createOscillator();
    const v = ac.createGain();
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(30, time + 0.15);
    v.gain.setValueAtTime(0.2, time);
    v.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    o.connect(v).connect(g);
    o.start(time); o.stop(time + 0.2);
  }

  // Snare on 2, 6
  if (bar === 2 || bar === 6) {
    const buf = ac.createBuffer(1, ac.sampleRate * 0.1, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const n = ac.createBufferSource();
    n.buffer = buf;
    const v = ac.createGain();
    v.gain.setValueAtTime(0.12, time);
    v.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    n.connect(v).connect(g);
    n.start(time); n.stop(time + 0.1);
  }

  // Hi-hat on every beat
  const hBuf = ac.createBuffer(1, ac.sampleRate * 0.03, ac.sampleRate);
  const hd = hBuf.getChannelData(0);
  for (let i = 0; i < hd.length; i++) hd[i] = Math.random() * 2 - 1;
  const hat = ac.createBufferSource();
  hat.buffer = hBuf;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 9000;
  const hv = ac.createGain();
  hv.gain.setValueAtTime(0.05, time);
  hv.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
  hat.connect(hp).connect(hv).connect(g);
  hat.start(time); hat.stop(time + 0.03);

  // Bass on 0, 3, 4, 7
  if (bar === 0 || bar === 3 || bar === 4 || bar === 7) {
    const bass = ac.createOscillator();
    const bv = ac.createGain();
    bass.type = 'triangle';
    const notes = [55, 65, 55, 73]; // A, C, A, D
    bass.frequency.value = notes[[0,3,4,7].indexOf(bar)] || 55;
    bv.gain.setValueAtTime(0.1, time);
    bv.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
    bass.connect(bv).connect(g);
    bass.start(time); bass.stop(time + 0.2);
  }
}
```

---

## Tips

- Always use `ac.currentTime` (or the `time` parameter for beats) for scheduling
- Use `exponentialRampToValueAtTime` for natural-sounding decays (never ramp to exactly 0 — use 0.001)
- Keep gain values low (0.05-0.25) to avoid clipping
- The engine's `masterGain` is set to 0.4, so your sounds are already attenuated
- For variety, add slight randomness to frequency or gain values
- Triangle waves are softer, square waves are buzzy/retro, sawtooth is harsh/aggressive, sine is pure
- Shorter durations (0.05-0.15s) for UI sounds, longer (0.3-0.5s) for death/milestone
