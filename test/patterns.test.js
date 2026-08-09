const { test } = require('node:test');
const assert = require('node:assert');
const { PHYSICS, SPEEDS, OBSTACLES, envFor, ctxFor, pairIsSurvivable } = require('./helpers');

const catalogue = () => [
  Pattern.single('crate'),
  Pattern.run('crate', 3, { gap: 'tight' }),
  Pattern.run('spike', 4, { gap: 'even' }),
  Pattern.run('block', 2, { gap: 'loose' }),
  Pattern.cluster(['crate', 'crate', 'crate']),
  Pattern.cluster(['spike', 'block']),
  Pattern.pair('crate', 'bird'),
  Pattern.gauntlet('bird', 4),
  Pattern.breather(),
];

/**
 * THE CENTRAL CLAIM OF THE LIBRARY.
 *
 * Every pattern, at every speed, under every physics setting a theme can pick,
 * places its obstacles so that consecutive ones are always survivable. If this
 * ever fails, games become unfair and no amount of validation downstream will
 * find it.
 */
test('no pattern ever contains an unwinnable gap', () => {
  let checked = 0, skipped = 0;
  for (const p of PHYSICS) {
    const env = envFor(p);
    for (const speed of SPEEDS) {
      const ctx = ctxFor(env, speed);
      for (const pat of catalogue()) {
        if (!pat.fits(ctx)) { skipped++; continue; }
        const items = pat.place(ctx).map((it) => ({ ...it, ...OBSTACLES.find((o) => o.name === it.name) }));
        checked++;

        if (pat.regime === 'one-jump' && items.length > 1) {
          const tallest = Math.max(...items.map((i) => i.height));
          const right = Math.max(...items.map((i) => i.at + i.width));
          const total = right + env.playerWidth;
          assert.ok(total <= env.clearSpan(tallest, speed),
            `${pat.describe()} ${p.name}@${speed}: cluster spans ${total.toFixed(0)}px but one arc only clears ${env.clearSpan(tallest, speed).toFixed(0)}px`);
        }

        if (pat.regime === 'sequence') {
          for (let i = 1; i < items.length; i++) {
            assert.ok(pairIsSurvivable(env, speed, items[i - 1], items[i]),
              `${pat.describe()} ${p.name}@${speed}: gap ${(items[i].at - items[i - 1].at).toFixed(0)}px falls in the unwinnable band`);
          }
        }
      }
    }
  }
  assert.ok(checked > 300, `expected a broad sweep, only checked ${checked}`);
});

test('trailing gaps always clear a full arc, so pattern seams are safe too', () => {
  for (const p of PHYSICS) {
    const env = envFor(p);
    for (const speed of SPEEDS) {
      const ctx = ctxFor(env, speed);
      for (const pat of catalogue()) {
        if (!pat.fits(ctx) || pat.regime === 'rest') continue;
        assert.ok(pat.trailGap(ctx) >= env.span(speed),
          `${pat.describe()} ${p.name}@${speed}: trailGap ${pat.trailGap(ctx).toFixed(0)}px is under one arc (${env.span(speed).toFixed(0)}px)`);
      }
    }
  }
});

test('clusters decline to place themselves when they would not fit', () => {
  // Obstacle width is the one thing that is not scale-free: at low speed a
  // 40px crate eats a third of the whole arc. A cluster must say so rather
  // than cram.
  const env = envFor(PHYSICS[0]);
  const big = Pattern.cluster(['crate', 'crate', 'crate']);
  assert.strictEqual(big.fits(ctxFor(env, 3)), false, 'three crates cannot fit one arc at speed 3');
  assert.strictEqual(big.fits(ctxFor(env, 11)), true, 'and should fit comfortably at speed 11');
});

test('a single is always placeable, so a game can always open', () => {
  for (const p of PHYSICS) {
    for (const speed of SPEEDS) {
      assert.ok(Pattern.single('crate').fits(ctxFor(envFor(p), speed)));
    }
  }
});

test('patterns name the problem when a theme misuses them', () => {
  const ctx = ctxFor(envFor(PHYSICS[0]), 8);
  assert.throws(() => Pattern.single('nope').place(ctx), /no obstacle named "nope"/);
  assert.throws(() => Pattern.pair('bird', 'bird').place(ctx), /needs a 'ground' one/);
  assert.throws(() => Pattern.cluster(['bird', 'bird']).place(ctx), /needs a 'ground' one/);
  assert.throws(() => Pattern.gauntlet('crate', 3).place(ctx), /needs a 'air' one/);
});

test('a gauntlet refuses an air obstacle that would clip a ducking player', () => {
  const env = envFor(PHYSICS[0]);
  const tall = [{ name: 'wall', type: 'air', width: 30, height: 90 }];
  const ctx = ctxFor(env, 8, tall);
  assert.strictEqual(Pattern.gauntlet('wall', 3).fits(ctx), false);
  assert.throws(() => Pattern.gauntlet('wall', 3).place(ctx), /duck clearance band/);
});

test('breathers are pure space and cost nothing', () => {
  const ctx = ctxFor(envFor(PHYSICS[0]), 7);
  const b = Pattern.breather({ arcs: 3 });
  assert.strictEqual(b.cost, 0);
  assert.deepStrictEqual(b.place(ctx), []);
  assert.ok(b.span(ctx) > 0, 'a breather still occupies distance');
});
