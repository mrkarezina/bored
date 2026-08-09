/**
 * Rooftop Run — a complete worked theme.
 *
 * Read this for the shape, then write something entirely your own. Note what is
 * NOT here: no spawn intervals, no obstacle weights, no per-frame power-up
 * probabilities, no hand-picked colour values, no sound frequencies. Those are
 * all library concerns now. What is left is the part that makes it this game and
 * not some other one — the drawing, and the rhythm.
 */

// Colours are solved, not chosen: every obstacle colour is guaranteed to clear
// a contrast threshold against the background and to sit at least 25 degrees of
// hue from the others, so nothing can end up muddy or indistinguishable.
const PALETTE = Palette.dusk('#2b1b3d', { accent: '#ff9f43', obstacles: 4 });

const THEME = {
  name: 'Rooftop Run',
  description: 'A cat with somewhere to be',
  gameId: 'GENERATED',

  colors: PALETTE,

  player: {
    width: 34, height: 44,
    duckHeight: 24,
    groundY: 296,
    jumpForce: -12.5,
    gravity: 0.65,

    draw(ctx, x, y, frame, state) {
      const c = PALETTE.accent;
      const dark = '#c9762f';
      const ducking = state === 'duck';
      const h = ducking ? 24 : 44;
      const top = y + (ducking ? 20 : 0);

      // Body
      ctx.fillStyle = c;
      ctx.fillRect(x + 4, top + h - 22, 26, 18);

      // Head
      ctx.fillRect(x + (ducking ? 20 : 18), top + h - 34, 14, 14);

      // Ears
      ctx.beginPath();
      ctx.moveTo(x + (ducking ? 21 : 19), top + h - 34);
      ctx.lineTo(x + (ducking ? 24 : 22), top + h - 41);
      ctx.lineTo(x + (ducking ? 27 : 25), top + h - 34);
      ctx.fill();

      // Eye — blinks on a slow cycle, driven by frame so it never strobes
      ctx.fillStyle = '#1b1026';
      if (frame % 140 > 8) ctx.fillRect(x + (ducking ? 28 : 26), top + h - 30, 3, 3);

      // Tail, higher when airborne
      ctx.strokeStyle = dark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 4, top + h - 18);
      const lift = state === 'jump' ? -10 : Math.sin(frame * 0.25) * 4;
      ctx.quadraticCurveTo(x - 6, top + h - 22 + lift, x - 8, top + h - 30 + lift);
      ctx.stroke();

      // Legs
      ctx.fillStyle = dark;
      if (state === 'run') {
        const swing = Math.sin(frame * 0.35) * 5;
        ctx.fillRect(x + 7, top + h - 4, 5, 4 + swing);
        ctx.fillRect(x + 20, top + h - 4, 5, 4 - swing);
      } else if (!ducking) {
        ctx.fillRect(x + 7, top + h - 4, 5, 3);
        ctx.fillRect(x + 20, top + h - 4, 5, 3);
      }
    },
  },

  obstacles: [
    {
      name: 'AC unit', type: 'ground', width: 40, height: 38,
      draw(ctx, x, y) {
        ctx.fillStyle = PALETTE.obstacle(0);
        ctx.fillRect(x, y, 40, 38);
        ctx.strokeStyle = '#1b1026';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 1, y + 1, 38, 36);
        ctx.beginPath();
        for (let i = 0; i < 3; i++) { ctx.moveTo(x + 8, y + 12 + i * 8); ctx.lineTo(x + 32, y + 12 + i * 8); }
        ctx.stroke();
      },
    },
    {
      name: 'chimney', type: 'ground', width: 26, height: 52,
      draw(ctx, x, y) {
        ctx.fillStyle = PALETTE.obstacle(1);
        ctx.fillRect(x, y, 26, 52);
        ctx.fillRect(x - 3, y, 32, 8);
        ctx.strokeStyle = '#1b1026';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 1, y + 1, 24, 50);
      },
    },
    {
      name: 'crate', type: 'ground', width: 34, height: 30,
      draw(ctx, x, y) {
        ctx.fillStyle = PALETTE.obstacle(2);
        ctx.fillRect(x, y, 34, 30);
        ctx.strokeStyle = '#1b1026';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 1, y + 1, 32, 28);
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 32, y + 28);
        ctx.moveTo(x + 32, y + 2); ctx.lineTo(x + 2, y + 28);
        ctx.stroke();
      },
    },
    {
      name: 'pigeon', type: 'air', width: 30, height: 18,
      // Bounded motion: the engine adds the sweep to the hitbox and refuses to
      // start if it would carry the bird into a ducking player.
      motion: [Motion.bob(6, 900)],
      draw(ctx, x, y, frame) {
        ctx.fillStyle = PALETTE.obstacle(3);
        ctx.beginPath();
        ctx.ellipse(x + 15, y + 9, 13, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        const flap = Math.sin(frame * 0.4) * 6;
        ctx.strokeStyle = '#1b1026';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 8); ctx.lineTo(x + 4, y + 4 - flap);
        ctx.moveTo(x + 20, y + 8); ctx.lineTo(x + 26, y + 4 + flap);
        ctx.stroke();
        ctx.fillStyle = '#1b1026';
        ctx.fillRect(x + 22, y + 6, 3, 3);
      },
    },
  ],

  /**
   * The playlist is the voice of the game. Weights are relative, so singles show
   * up three times as often as the gauntlet. Everything about spacing, ramping,
   * not repeating and leaving room to breathe is the scheduler's job.
   */
  rhythm: Rhythm.playlist([
    [3, Pattern.single('AC unit')],
    [2, Pattern.run('crate', 3, { gap: 'even' })],
    [2, Pattern.cluster(['crate', 'AC unit'])],
    [2, Pattern.pair('chimney', 'pigeon')],
    [1, Pattern.run('chimney', 2, { gap: 'tight' })],
    [1, Pattern.gauntlet('pigeon', 3)],
  ]),

  powerups: [
    {
      name: 'catnip', effect: 'magnet', duration: 5000, points: 100,
      width: 22, height: 22, frequency: 'common',
      draw(ctx, x, y, frame) {
        const pulse = 1 + Math.sin(frame * 0.15) * 0.12;
        ctx.fillStyle = '#7ee787';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          ctx.ellipse(x + 11 + Math.cos(a) * 6, y + 11 + Math.sin(a) * 6, 5 * pulse, 3 * pulse, a, 0, Math.PI * 2);
        }
        ctx.fill();
      },
    },
    {
      name: 'nine lives', effect: 'shield', points: 150,
      width: 24, height: 24, frequency: 'rare',
      draw(ctx, x, y, frame) {
        ctx.strokeStyle = PALETTE.score;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + 12, y + 12, 9 + Math.sin(frame * 0.12) * 1.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = PALETTE.score;
        ctx.font = 'bold 12px monospace';
        ctx.fillText('9', x + 8, y + 16);
      },
    },
  ],

  // Two layers, both well behind the action. Anything drawn where the player is
  // making decisions costs them reaction time.
  backgrounds: [
    {
      speed: 0.18,
      draw(ctx, scrollX, w, h) {
        ctx.fillStyle = '#41285a';
        const spacing = 220;
        const offset = -(scrollX % spacing);
        for (let x = offset - spacing; x < w + spacing; x += spacing) {
          ctx.fillRect(x + 20, h - 210, 70, 210);
          ctx.fillRect(x + 110, h - 260, 55, 260);
        }
      },
    },
    {
      speed: 0.42,
      draw(ctx, scrollX, w, h) {
        ctx.fillStyle = '#33204a';
        const spacing = 160;
        const offset = -(scrollX % spacing);
        for (let x = offset - spacing; x < w + spacing; x += spacing) {
          ctx.fillRect(x, h - 150, 90, 150);
          ctx.fillRect(x + 30, h - 168, 12, 20);
        }
      },
    },
  ],

  drawGround(ctx, scrollX, groundY, w, h) {
    ctx.fillStyle = PALETTE.ground;
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.fillStyle = PALETTE.groundLine;
    ctx.fillRect(0, groundY, w, 3);
    const spacing = 90;
    const offset = -(scrollX % spacing);
    for (let x = offset - spacing; x < w + spacing; x += spacing) {
      ctx.fillRect(x, groundY + 14, 34, 2);
    }
  },

  particles: {
    dust:     { colors: ['#6b5a80', '#4a3a5e'], size: 4 },
    jump:     { colors: [PALETTE.accent], size: 3 },
    death:    { colors: [PALETTE.accent, '#ff5e5e', '#ffd166'], size: 6 },
    collect:  { colors: ['#7ee787', PALETTE.score], size: 4 },
    trail:    { colors: [PALETTE.accent], size: 3 },
    confetti: { colors: [PALETTE.accent, PALETTE.score, '#7ee787', '#5eb0ff'], size: 5 },
  },

  scoring: {
    distancePointsPerFrame: 1,
    milestoneInterval: 500,
    comboDecayMs: 3000,
    comboMultiplierMax: 5,
  },

  // Only the speed ramp is left here. How often obstacles arrive is a property
  // of the patterns and the scheduler, not a number to tune.
  difficulty: {
    startSpeed: 4,
    maxSpeed: 11,
    speedRampPerSecond: 0.05,
  },

  sounds: Sound.chiptune(),
};
