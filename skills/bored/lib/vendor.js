/**
 * vendor.js — small, well-known third-party pieces, vendored rather than reinvented.
 *
 * Everything here is public-domain or MIT and small enough to inline. Games must
 * stay self-contained in one file, so there is no CDN and no package manager.
 *
 * Contents:
 *   Vendor.zzfx        ZzFXMicro v1.3.2 — Frank Force, MIT
 *   Vendor.rng         mulberry32 seeded PRNG — public domain
 *   Vendor.ease        Robert Penner's easing curves — BSD/public domain
 *   Vendor.contrast    WCAG 2.x relative luminance + contrast ratio
 */
const Vendor = (() => {
  // ---------------------------------------------------------------- ZzFX ----
  // ZzFXMicro - Zuper Zmall Zound Zynth - v1.3.2 by Frank Force
  // https://github.com/KilledByAPixel/ZzFX — MIT License, (c) 2019 Frank Force
  //
  // The synth function below is VERBATIM upstream. The only change to the
  // original file is that `zzfxX` is no longer initialised to `new AudioContext`
  // at parse time. Two reasons that mattered:
  //   1. Node has no AudioContext, and this file is loaded by the test suite.
  //   2. Browsers suspend a context created before a user gesture, which is the
  //      documented "no sound on mobile" failure mode.
  // `play()` below guarantees the context exists before calling in, so the DSP
  // body sees exactly what upstream expects.
  let zzfxV = 0.3;   // master volume
  let zzfxX = null;  // AudioContext, created lazily by ensureContext()

  const zzfx =            // play sound
  (p=1,k=.05,b=220,e=0,r=0,t=.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0
  ,N=0)=>{let M=Math,d=2*M.PI,R=44100,G=u*=500*d/R/R,C=b*=(1-k+2*k*M.random(k=[]))*d/R,
  g=0,H=0,a=0,n=1,I=0,J=0,f=0,h=N<0?-1:1,x=d*h*N*2/R,L=M.cos(x),Z=M.sin,K=Z(x)/4,O=1+K,
  X=-2*L/O,Y=(1-K)/O,P=(1+h*L)/2/O,Q=-(h+L)/O,S=P,T=0,U=0,V=0,W=0;e=R*e+9;m*=R;r*=R;t*=
  R;c*=R;y*=500*d/R**3;A*=d/R;v*=d/R;z*=R;l=R*l|0;p*=zzfxV;for(h=e+m+r+t+c|0;a<h;k[a++]
  =f*p)++J%(100*F|0)||(f=q?1<q?2<q?3<q?4<q?(g/d%1<D/2)*2-1:Z(g**3):M.max(M.min(M.tan(g)
  ,1),-1):1-(2*g/d%2+2)%2:1-4*M.abs(M.round(g/d)-g/d):Z(g),f=(l?1-B+B*Z(d*a/l):1)*(4<q?
  f:(f<0?-1:1)*M.abs(f)**D)*(a<e?a/e:a<e+m?1-(a-e)/m*(1-w):a<e+m+r?w:a<h-c?(h-a-c)/t*w:
  0),f=c?f/2+(c>a?0:(a<h-c?1:(h-a)/c)*k[a-c|0]/2/p):f,N?f=W=S*T+Q*(T=U)+P*(U=f)-Y*V-X*(
  V=W):0),x=(b+=u+=y)*M.cos(A*H++),g+=x+x*E*Z(a**5),n&&++n>z&&(b+=v,C+=v,n=0),!l||++I%l
  ||(b=C,u=G,n=n||1);X=zzfxX,p=X.createBuffer(1,h,R);p.getChannelData(0).set(k);b=X.
  createBufferSource();b.buffer=p;b.connect(X.destination);b.start()};

  /**
   * Create the AudioContext on demand and resume it if the browser suspended it.
   * Must be reachable from a user-gesture handler or mobile stays silent.
   */
  function ensureContext() {
    if (!zzfxX) {
      const AC = typeof AudioContext !== 'undefined' ? AudioContext
        : typeof webkitAudioContext !== 'undefined' ? webkitAudioContext
          : null;
      if (!AC) return false;      // Node, or a browser without Web Audio
      try {
        zzfxX = new AC();
      } catch (e) {
        return false;
      }
    }
    if (zzfxX.state === 'suspended') zzfxX.resume();
    return true;
  }

  /** Play a ZzFX parameter array. Silent no-op wherever audio is unavailable. */
  function play(params) {
    if (!ensureContext()) return;
    try {
      zzfx(...(params || []));
    } catch (e) {
      // A malformed parameter array must never take the game down with it.
    }
  }

  function setVolume(v) { zzfxV = v; }

  // ------------------------------------------------------------------ RNG ----
  /**
   * mulberry32 — a 32-bit seeded PRNG. Public domain (Tommy Ettinger).
   *
   * The engine needs randomness that is reproducible: a playtest run has to be
   * repeatable, and a sprite that re-randomises its geometry every frame
   * strobes. Seeded streams give variation without either problem.
   */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // --------------------------------------------------------------- Easing ----
  // Robert Penner's easing equations, normalised to t in [0, 1] -> [0, 1].
  const ease = {
    linear: (t) => t,
    quadIn: (t) => t * t,
    quadOut: (t) => t * (2 - t),
    quadInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    cubicOut: (t) => 1 - Math.pow(1 - t, 3),
    sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    backOut: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
    elasticOut: (t) => (t === 0 || t === 1 ? t
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
    bounceOut: (t) => {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
  };

  // -------------------------------------------------------------- Contrast ----
  /** '#rgb' or '#rrggbb' -> [r, g, b] in 0-255. */
  function parseHex(hex) {
    let h = String(hex).trim().replace(/^#/, '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    if (h.length !== 6 || Number.isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function toHex(rgb) {
    return '#' + rgb.map((c) => {
      const v = Math.max(0, Math.min(255, Math.round(c)));
      return v.toString(16).padStart(2, '0');
    }).join('');
  }

  /** WCAG 2.x relative luminance. */
  function luminance(hex) {
    const [r, g, b] = parseHex(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /** WCAG contrast ratio, 1 (identical) to 21 (black on white). */
  function contrast(a, b) {
    const la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  return {
    zzfx: { play, setVolume, ensureContext },
    rng,
    ease,
    color: { parseHex, toHex, luminance, contrast },
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = Vendor;
