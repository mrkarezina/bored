/**
 * palette.js — colour that is readable by construction.
 *
 * A runner gives the player about 250ms to see a hazard and decide what to do
 * with it. Colour that doesn't separate from the background eats that budget,
 * and "the game looks muddy" is the single most common way a good design still
 * plays badly.
 *
 * So obstacle colours are not chosen here, they are SOLVED: pick a hue family
 * for the mood, then search lightness until the WCAG contrast ratio against the
 * background clears a threshold. A palette that fails to reach its target throws
 * rather than shipping something unreadable.
 *
 * The theme still picks the mood and the background. It just cannot pick an
 * unreadable combination, the same way it cannot pick an unwinnable gap.
 */
const Palette = (() => {
  /** Hazards must be obvious; text must be comfortable; ground must recede. */
  const TARGET = {
    obstacle: 4.5,     // WCAG AA for graphical objects
    text: 7.0,
    score: 8.0,
    accent: 4.5,
    groundLine: 3.0,   // measured against the ground, not the background
  };
  const GROUND_RANGE = [1.25, 2.6];

  /** Hue families. Each is a mood, not a fixed set of colours. */
  const FAMILIES = {
    dusk: { bg: '#2b1b3d', hues: [28, 344, 200], sat: 0.72 },
    neon: { bg: '#0a0a14', hues: [180, 300, 56], sat: 0.95 },
    slate: { bg: '#1e2430', hues: [200, 340, 130], sat: 0.45 },
    candy: { bg: '#3a1030', hues: [330, 160, 48], sat: 0.8 },
    deep: { bg: '#0b1d2e', hues: [190, 208, 44], sat: 0.7 },
    ember: { bg: '#1a0f0c', hues: [18, 40, 355], sat: 0.85 },
  };

  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    const seg = Math.floor(h / 60) % 6;
    const [r, g, b] = [
      [c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x],
    ][seg];
    return Vendor.color.toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
  }

  /**
   * Walk lightness across its whole range and take the candidate that clears
   * `target` while sitting closest to `preferred`. Exhaustive rather than clever
   * because it runs once, at boot, and a binary search would need the contrast
   * curve to be monotonic — which it is not, on either side of the background's
   * own luminance.
   */
  function solve(hue, sat, against, target, preferred) {
    let best = null;
    for (let i = 0; i <= 100; i++) {
      const l = i / 100;
      const hex = hslToHex(hue, sat, l);
      if (Vendor.color.contrast(hex, against) >= target) {
        const d = Math.abs(l - preferred);
        if (!best || d < best.d) best = { hex, d, l };
      }
    }
    return best;
  }

  function solveOrThrow(label, hue, sat, against, target, preferred) {
    const hit = solve(hue, sat, against, target, preferred);
    if (!hit) {
      throw new Error(
        `Palette: could not find a ${label} colour at hue ${hue} reaching ` +
        `${target}:1 contrast against ${against}. Use a darker or lighter ` +
        `background, or a different palette family.`
      );
    }
    return hit.hex;
  }

  /**
   * Build a full colour set.
   *
   *   Palette.dusk()                       — the family's own background
   *   Palette.neon('#101020')              — your background, their mood
   *   Palette.candy(null, { accent: '#f0f' }) — override one slot
   *
   * `obstacles` is as many mutually distinct, background-separated colours as
   * the theme asked for.
   */
  function build(familyName, bg, opts = {}) {
    const fam = FAMILIES[familyName];
    if (!fam) {
      throw new Error(`Palette: no family named "${familyName}". Try: ${Object.keys(FAMILIES).join(', ')}`);
    }
    const background = bg || fam.bg;
    const count = opts.obstacles || 4;
    const sat = opts.saturation !== undefined ? opts.saturation : fam.sat;

    // Spread hues around the family's anchors so N obstacles stay separable by
    // hue alone, which is what a player actually reads at speed.
    //
    // Naively nudging by a fixed step collides: with anchors at 18 and 40, the
    // fourth obstacle lands on 18+22 = 40 and duplicates the second exactly.
    // So each hue is pushed around the wheel until it clears every hue already
    // taken.
    const HUE_MIN_SEP = 25;
    const usedHues = [];
    // Shortest way round the wheel between two hues.
    const hueGap = (a, b) => Math.abs((((a - b) % 360) + 540) % 360 - 180);
    const separated = (h) => usedHues.every((u) => hueGap(h, u) >= HUE_MIN_SEP);

    const obstacles = [];
    for (let i = 0; i < count; i++) {
      let hue = fam.hues[i % fam.hues.length] + Math.floor(i / fam.hues.length) * 37;
      for (let tries = 0; tries < 30 && !separated(hue); tries++) hue += 13;
      usedHues.push(((hue % 360) + 360) % 360);
      obstacles.push(solveOrThrow('obstacle', hue, sat, background, TARGET.obstacle, 0.58));
    }

    // Belt and braces: identical obstacle colours would mean two hazards a
    // player cannot tell apart, which is exactly what this module exists to
    // prevent. Never ship it quietly.
    const seen = new Set();
    for (const c of obstacles) {
      if (seen.has(c)) {
        throw new Error(
          `Palette: family "${familyName}" produced the duplicate obstacle colour ${c} ` +
          `for ${count} obstacles. Ask for fewer, or pick a family with more hue anchors.`
        );
      }
      seen.add(c);
    }

    const accent = opts.accent
      || solveOrThrow('accent', fam.hues[0], Math.min(1, sat + 0.1), background, TARGET.accent, 0.62);

    // The ground should read as floor, not as a hazard: present, but quiet.
    let ground = null;
    for (let i = 0; i <= 100 && !ground; i++) {
      const hex = hslToHex(fam.hues[0], sat * 0.35, i / 100);
      const c = Vendor.color.contrast(hex, background);
      if (c >= GROUND_RANGE[0] && c <= GROUND_RANGE[1]) ground = hex;
    }
    if (!ground) ground = hslToHex(fam.hues[0], sat * 0.3, 0.28);

    return {
      bg: background,
      text: solveOrThrow('text', fam.hues[0], sat * 0.25, background, TARGET.text, 0.9),
      score: solveOrThrow('score', fam.hues[1 % fam.hues.length], sat * 0.5, background, TARGET.score, 0.88),
      accent,
      ground,
      groundLine: solveOrThrow('groundLine', fam.hues[0], sat, ground, TARGET.groundLine, 0.6),
      obstacles,
      /** Stable colour for obstacle index i — wraps rather than running out. */
      obstacle: (i) => obstacles[i % obstacles.length],
      family: familyName,
    };
  }

  const api = { build, FAMILIES, TARGET, hslToHex };
  for (const name of Object.keys(FAMILIES)) {
    api[name] = (bg, opts) => build(name, bg, opts);
  }
  return api;
})();

if (typeof require !== 'undefined' && typeof module !== 'undefined') {
  if (typeof Vendor === 'undefined') global.Vendor = require('./vendor.js');
  module.exports = Palette;
}
