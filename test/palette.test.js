const { test } = require('node:test');
const assert = require('node:assert');
require('./helpers');

const FAMILIES = Object.keys(Palette.FAMILIES);
const COUNTS = [2, 3, 4, 5, 6];

/** Hue of a hex colour, for the separation check below. */
function hueOf(hex) {
  const [r, g, b] = Vendor.color.parseHex(hex).map((c) => c / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (((h * 60) % 360) + 360) % 360;
}

const hueGap = (a, b) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);

test('every obstacle colour separates from the background', () => {
  for (const fam of FAMILIES) {
    for (const n of COUNTS) {
      const p = Palette[fam](null, { obstacles: n });
      for (const c of p.obstacles) {
        const ratio = Vendor.color.contrast(c, p.bg);
        assert.ok(ratio >= Palette.TARGET.obstacle,
          `${fam}/${n}: ${c} against ${p.bg} is only ${ratio.toFixed(2)}:1`);
      }
    }
  }
});

test('text and score are comfortably readable', () => {
  for (const fam of FAMILIES) {
    const p = Palette[fam]();
    assert.ok(Vendor.color.contrast(p.text, p.bg) >= Palette.TARGET.text, `${fam}: text`);
    assert.ok(Vendor.color.contrast(p.score, p.bg) >= Palette.TARGET.score, `${fam}: score`);
    assert.ok(Vendor.color.contrast(p.groundLine, p.ground) >= Palette.TARGET.groundLine, `${fam}: ground line`);
  }
});

/**
 * Obstacles are told apart by HUE, not by luminance. Two colours can sit at a
 * WCAG contrast of 1.0 against each other and still be obviously different — a
 * pink and an orange of the same brightness, for instance. Measuring the wrong
 * one of those is how a real bug nearly got shipped here: `deep` at five
 * obstacles produced two purples 18 degrees apart.
 */
test('obstacle colours are separable from each other by hue', () => {
  for (const fam of FAMILIES) {
    for (const n of COUNTS) {
      const p = Palette[fam](null, { obstacles: n });
      for (let i = 0; i < p.obstacles.length; i++) {
        for (let j = i + 1; j < p.obstacles.length; j++) {
          const gap = hueGap(hueOf(p.obstacles[i]), hueOf(p.obstacles[j]));
          assert.ok(gap >= 24,
            `${fam}/${n}: ${p.obstacles[i]} and ${p.obstacles[j]} are only ${gap.toFixed(0)} degrees apart`);
        }
      }
    }
  }
});

test('no palette ever repeats an obstacle colour', () => {
  for (const fam of FAMILIES) {
    for (const n of COUNTS) {
      const p = Palette[fam](null, { obstacles: n });
      assert.strictEqual(new Set(p.obstacles).size, p.obstacles.length, `${fam}/${n} repeated a colour`);
    }
  }
});

test('the ground recedes rather than competing', () => {
  for (const fam of FAMILIES) {
    const p = Palette[fam]();
    const c = Vendor.color.contrast(p.ground, p.bg);
    assert.ok(c < Palette.TARGET.obstacle,
      `${fam}: ground at ${c.toFixed(2)}:1 is as loud as a hazard`);
  }
});

test('a custom background still solves', () => {
  for (const bg of ['#101020', '#000000', '#22182e', '#0f1a0f']) {
    for (const fam of FAMILIES) {
      const p = Palette[fam](bg, { obstacles: 4 });
      assert.strictEqual(p.bg, bg);
      for (const c of p.obstacles) {
        assert.ok(Vendor.color.contrast(c, bg) >= Palette.TARGET.obstacle, `${fam} on ${bg}: ${c}`);
      }
    }
  }
});

test('obstacle(i) wraps rather than running out', () => {
  const p = Palette.dusk(null, { obstacles: 3 });
  assert.strictEqual(p.obstacle(0), p.obstacle(3));
  assert.strictEqual(p.obstacle(4), p.obstacle(1));
});

test('an unknown family is named, not guessed at', () => {
  assert.throws(() => Palette.build('vaporwave'), /no family named "vaporwave"/);
});

test('contrast maths matches the WCAG reference values', () => {
  assert.ok(Math.abs(Vendor.color.contrast('#000000', '#ffffff') - 21) < 0.01);
  assert.ok(Math.abs(Vendor.color.contrast('#ffffff', '#ffffff') - 1) < 0.01);
  assert.ok(Math.abs(Vendor.color.contrast('#777777', '#ffffff') - 4.48) < 0.02);
});
