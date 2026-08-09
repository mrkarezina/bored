# Fundamentals

How runners work, and why. This is the file to read. [blocks.md](blocks.md) is the vocabulary you
build with; it is a reference card, not an argument. If you hit a situation neither file covers,
derive it from §0.

## 0. The reduction

Strip a runner down to what the player actually does.

They cannot steer, pick a route, manage resources, retreat, or change their mind. They press a
button, or they don't.

**An endless runner is one binary timing decision, repeated a few thousand times.**

Art, score, sound, power-ups, story — all of it decorates that one decision. Everything below is
derived from that sentence, and so is every rule you will need that isn't below.

## 1. A decision with a constant answer is not a decision

If the right moment to press is always "now," the player isn't deciding, they're keeping time. The
only content a runner has is **variation in *when*.**

But variation is not randomness. Random gaps produce a distribution; nothing the player learns from
gap 40 helps them with gap 41, so there is no decision to get better at — only a reflex test.

What creates a decision is **variation among a small set of recognisable situations**. The player
learns the vocabulary, and then every new arrangement is something they are equipped to read.

> Build your rhythm from 5–7 recurring patterns. The 40th time a pattern appears it should still be
> recognisably that pattern. Recognition is the thing you are manufacturing.

The library refuses a playlist with fewer than two patterns for exactly this reason.

## 2. A decision needs its information before it is needed

Perceive → decide → act costs a human roughly **250ms**. Information that arrives inside that window
isn't information. It's a coin flip wearing a costume.

Everything about readability descends from this one number:

- The hazard must enter the screen far enough ahead to be *seen*, not just far enough to be drawn.
- Its **silhouette** must carry the instruction. At speed, detail arrives too late — colour and
  outline reach the player after the shape already has.
- Nothing else may compete for that glance. A decorative object inside the play area is not free: it
  spends part of the player's 250ms getting ruled out.

> One action per shape. Tall and narrow means jump. Overhead bar means duck. Give each hazard a
> different silhouette *and* a different colour — two hazards with one silhouette are one hazard with
> extra confusion. Decoration lives behind the action, never among it.

`Palette` solves obstacle colours against the background so they cannot come out muddy. Silhouette
is still yours: it is the half of readability no library can compute.

## 3. A decision must have a right answer that exists

There must be *some* press-time that survives. When there isn't, the player experiences the game as
cheating, and they are correct.

This has an exact shape, worth knowing even though you never have to compute it. With the default
physics a jump lasts **37 frames**, and the player is above a 40px obstacle for **30** of them. So
two obstacles are survivable in exactly two ways:

- **close enough** that one arc clears both, or
- **far enough** that you land, and then jump again.

**Between those is a band with no answer at all.** At full speed it runs roughly 330–407px. The old
spawner — a fixed interval plus a weighted coin flip — landed inside it constantly: at maximum speed
**47% of the gaps it produced were unwinnable**, which is precisely the "it gets unfair when it
speeds up" complaint, and it was not fixable by tuning the interval.

This is why the unit of design is a **pattern** and not an obstacle. A pattern is a pre-solved
cluster: it lives entirely in one regime, so it cannot contain the band. The scheduler spaces
patterns more than a full arc apart, so the seams cannot either.

> Fair is not the same as easy. Fair means a correct answer existed and the player could have known
> it. You can be brutal and fair. You cannot be gentle and unfair.

## 4. Failure must be legible, or repetition teaches nothing

The player will die hundreds of times. Each death is only worth something if they know, within a
moment, *which decision was wrong*. Ambiguous deaths don't compound into skill — they compound into
resentment.

> At low difficulty, one hazard at a time. Never stack two demands the player cannot separate in
> hindsight. Hit-freeze and screen shake exist to point at the moment of failure; don't bury it.

## 5. Skill must compound

Run 200 must go better than run 2 **because of what happened in between**. That requires a world made
of things that recur, and recur recognisably.

This is why an authored vocabulary beats procedural noise even when noise is measurably more varied.
Varied is not the goal. **Learnable but not memorised** is the goal: the pieces repeat, the
arrangement doesn't.

> Repetition with variation. Same patterns, different order, different spacing, different speed.

## 6. Pressure is only perceptible against rest

Loudness is relative. A game that is continuously hard reads as flat, and then as exhausting — the
player never gets the contrast that makes the hard parts feel hard.

Rest is not the absence of design. It is the thing that makes everything else register. A runner is
closer to music than to a test: bars, fills, and rests, and the rest is doing real work.

> Never run pressure more than about ten seconds unbroken. Empty space is content.

The scheduler forces a breather once pressure has run 14 arcs — about 8.5 seconds — whatever your
playlist says. **This is also why you cannot put a breather in a playlist**: rest is already
guaranteed, and asking for it twice just empties the road. Tune its length with
`Rhythm.playlist([...], { rest: Pattern.breather({ arcs: 3 }) })`.

## 7. The ceiling must sit above the floor

If playing perfectly looks the same as playing adequately, mastery has nowhere to go and the loop
dies at competence. There has to be something a good player can reach for that a surviving player
can't.

> Near-misses, optional risk, combo chains. Reward the player who could have jumped safe and didn't.
> The reward can be small — it only has to be visible.

`playtest.js` reports this as the **skill gap**: how much longer perfect timing survives than human
timing. Under about 1.15x there is nothing to master; over about 3x the game is punishing precision
rather than rewarding it.

## 8. Difficulty is a rate, not a property

Speed and density are the same knob: both change decisions per second. Obstacles are not "hard" in
isolation — a wall is trivial with room and lethal without.

The right curve rises fast, then flattens. The early climb tells the player the game is responding to
them; the late flattening is what stops it becoming a wall. A player who feels competent before the
game gets hard will stay; one who dies in the first ten seconds won't.

> Your first thirty seconds are a tutorial that must not look like one. Introduce one idea, let it be
> survived, then combine.

## What you actually decide

The library holds these mechanically. You cannot violate §3 or §6 with it even deliberately. That
frees your judgement for the part no library can hold:

| Fundamental | Held by the library | Yours |
|---|---|---|
| §1 recognisable vocabulary | patterns are the spawn unit; ≥2 required | which 5–7, and what they mean in your world |
| §2 readable at speed | contrast-solved palette, fixed lanes | the shape language, the art |
| §3 an answer exists | arc-unit geometry, enforced gap floor | how close to the edge you push |
| §4 legible failure | one lane per hazard type | what the hazards *are* |
| §5 compounding skill | no-repeat cooldown | the character of the repeats |
| §6 rest | forced breather cadence | where the peaks land |
| §7 ceiling | near-miss and combo scoring | where the optional risk sits |
| §8 rate | budgeted difficulty curve | how brutal it eventually gets |

Every row's right column is where your game stops being a template. Spend everything there.

## One thing the library cannot check

Hitboxes come from the `width` and `height` an obstacle declares, not from what its `draw()`
actually paints. A sprite drawn wider than its box will feel unfair and nothing will catch it. Draw
inside the box you declared.
