const { test } = require('node:test');
const assert = require('node:assert');
const { PHYSICS, OBSTACLES, POWERUPS, envFor, pairIsSurvivable } = require('./helpers');

const FPS = 60;

const fullPlaylist = () => Rhythm.playlist([
  [3, Pattern.single('crate')],
  [2, Pattern.run('spike', 3, { gap: 'even' })],
  [2, Pattern.cluster(['crate', 'block'])],
  [2, Pattern.pair('crate', 'bird')],
  [1, Pattern.run('block', 2, { gap: 'tight' })],
  [1, Pattern.gauntlet('bird', 3)],
]);

/** Play a scheduler forward through a realistic speed ramp. */
function runFor(seconds, { env, playlist, seed = 7, startSpeed = 4, maxSpeed = 11 }) {
  const s = Rhythm.scheduler({ playlist, env, obstacles: OBSTACLES, powerups: POWERUPS, seed });
  s.validate(startSpeed);
  const events = [];
  const bonus = maxSpeed - startSpeed;
  let distance = 0;
  for (let f = 0; f < seconds * FPS; f++) {
    const t = f / FPS;
    const speed = startSpeed + bonus * (1 - Math.exp(-t * (0.05 / bonus)));
    distance += speed;
    for (const ev of s.update(distance, speed, t)) events.push({ ...ev, speed });
  }
  return { events, history: s.history() };
}

test('a full run never emits an unwinnable gap, under any physics', () => {
  for (const p of PHYSICS) {
    const env = envFor(p);
    const { events } = runFor(180, { env, playlist: fullPlaylist() });
    const ground = events
      .filter((e) => e.kind === 'obstacle' && e.def.type === 'ground')
      .sort((a, b) => a.worldX - b.worldX);

    assert.ok(ground.length > 50, `only ${ground.length} obstacles in 3 minutes of ${p.name}`);

    for (let i = 1; i < ground.length; i++) {
      const a = { at: ground[i - 1].worldX, width: ground[i - 1].def.width, height: ground[i - 1].def.height };
      const b = { at: ground[i].worldX, width: ground[i].def.width, height: ground[i].def.height };
      assert.ok(pairIsSurvivable(env, ground[i].speed, a, b),
        `${p.name}: ${(b.at - a.at).toFixed(0)}px between ${ground[i - 1].name} and ${ground[i].name} at speed ${ground[i].speed.toFixed(1)} is in the unwinnable band`);
    }
  }
});

test('rest is forced regardless of what the playlist asked for', () => {
  // A playlist with no breather in it at all still gets them, because the
  // scheduler inserts one whenever pressure has run too long.
  const env = envFor(PHYSICS[0]);
  const { history } = runFor(180, { env, playlist: fullPlaylist() });
  const breathers = history.filter((h) => h.pattern.startsWith('breather'));
  assert.ok(breathers.length > 8, `only ${breathers.length} breathers in 3 minutes`);

  let sinceRest = 0, longest = 0;
  for (const h of history) {
    if (h.pattern.startsWith('breather')) { longest = Math.max(longest, sinceRest); sinceRest = 0; }
    else sinceRest++;
  }
  assert.ok(longest <= 14, `${longest} patterns in a row without rest`);
});

test('patterns do not repeat back to back', () => {
  const env = envFor(PHYSICS[0]);
  for (const seed of [1, 42, 999, 12345]) {
    const { history } = runFor(180, { env, playlist: fullPlaylist(), seed });
    for (let i = 1; i < history.length; i++) {
      assert.notStrictEqual(history[i].pattern, history[i - 1].pattern,
        `seed ${seed}: ${history[i].pattern} repeated immediately at ${history[i].at}`);
    }
  }
});

test('the whole vocabulary gets used', () => {
  const env = envFor(PHYSICS[0]);
  const { history } = runFor(180, { env, playlist: fullPlaylist() });
  const kinds = new Set(history.map((h) => h.pattern.split('(')[0]));
  assert.ok(kinds.size >= 5, `only ${kinds.size} distinct pattern kinds appeared: ${[...kinds]}`);
});

test('difficulty climbs and then flattens', () => {
  const env = envFor(PHYSICS[0]);
  const s = Rhythm.scheduler({ playlist: fullPlaylist(), env, obstacles: OBSTACLES, seed: 1 });
  const at = (t) => s.budgetAt(t);
  assert.ok(at(0) < at(30), 'budget must climb early');
  assert.ok(at(30) < at(90), 'and keep climbing');
  assert.ok(at(180) - at(120) < at(60) - at(0), 'but flatten, so it never becomes a wall');
  assert.ok(at(600) <= s.constants.BUDGET_MAX + 1e-9, 'and stay capped');
});

test('the opening is not one obstacle repeated', () => {
  // Regression: at BUDGET_MIN = 1 only a bare single was affordable, so every
  // game began with eight identical obstacles in a row.
  const env = envFor(PHYSICS[0]);
  for (const seed of [1, 2, 3, 4, 5]) {
    const { history } = runFor(30, { env, playlist: fullPlaylist(), seed });
    const opening = new Set(history.slice(0, 6).map((h) => h.pattern.split('(')[0]));
    assert.ok(opening.size >= 3, `seed ${seed}: opening used only ${opening.size} shapes: ${[...opening]}`);
  }
});

test('power-ups land where the jump can actually reach them', () => {
  const env = envFor(PHYSICS[0]);
  const { events } = runFor(180, { env, playlist: fullPlaylist() });
  const pus = events.filter((e) => e.kind === 'powerup');
  assert.ok(pus.length > 10, `only ${pus.length} power-ups in 3 minutes`);
  for (const pu of pus) {
    assert.ok(pu.altitude > 0 && pu.altitude < env.peak,
      `power-up at ${pu.altitude.toFixed(0)}px is outside a jump that peaks at ${env.peak.toFixed(0)}px`);
  }
});

test('a playlist that cannot open the game says so', () => {
  const env = envFor(PHYSICS[0]);
  // Nothing but big clusters, which need more room than speed 3 gives.
  const onlyClusters = Rhythm.playlist([
    [1, Pattern.cluster(['crate', 'crate', 'crate'])],
    [1, Pattern.cluster(['crate', 'block', 'crate'])],
  ]);
  const s = Rhythm.scheduler({ playlist: onlyClusters, env, obstacles: OBSTACLES, seed: 1 });
  assert.throws(() => s.validate(3), /no pattern in this playlist can be placed/);
});

test('malformed playlists are rejected with a usable message', () => {
  assert.throws(() => Rhythm.playlist([]), /at least one/);
  assert.throws(() => Rhythm.playlist([[1]]), /\[weight, pattern\]/);
  assert.throws(() => Rhythm.playlist([[0, Pattern.single('crate')]]), /positive number/);
  assert.throws(() => Rhythm.playlist([[1, Pattern.single]]), /did you forget to call it/);
});

test('a playlist cannot ask for rest, because rest is automatic', () => {
  // Found by the composition fuzz: a playlist that was three-quarters breather
  // produced fifteen obstacles in ninety seconds. Rest is inserted by pressure,
  // so asking for it in the playlist as well just empties the road.
  assert.throws(
    () => Rhythm.playlist([[2, Pattern.single('crate')], [1, Pattern.breather()]]),
    /Rest is inserted automatically/
  );
  // The supported way to tune it:
  const p = Rhythm.playlist(
    [[2, Pattern.single('crate')], [1, Pattern.single('spike')]],
    { rest: Pattern.breather({ arcs: 3 }) }
  );
  assert.ok(p.rest);
});

test('a one-pattern playlist is refused as having no vocabulary', () => {
  assert.throws(() => Rhythm.playlist([[1, Pattern.single('crate')]]), /at least two different patterns/);
});

test('the same seed replays the same level', () => {
  const env = envFor(PHYSICS[0]);
  const a = runFor(60, { env, playlist: fullPlaylist(), seed: 4242 });
  const b = runFor(60, { env, playlist: fullPlaylist(), seed: 4242 });
  assert.deepStrictEqual(a.history.map((h) => h.pattern), b.history.map((h) => h.pattern));
});
