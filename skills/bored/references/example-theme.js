const THEME = {
  name: 'Jetpack Monkey',
  description: 'Soar through the jungle at sunset',
  gameId: 'b7e3a1d4-92f8-4c6b-a0e5-8f1d3c7b9a62',

  colors: {
    bg: '#1a0e2e',
    text: '#f5f0e8',
    accent: '#ff9944',
    score: '#ffdd55',
    ground: '#2a1848',
    groundLine: '#ff9944',
  },

  player: {
    width: 40, height: 48,
    duckHeight: 28,
    groundY: 296,
    jumpForce: -12.5,
    gravity: 0.65,
    draw(ctx, x, y, frame, state) {
      const duck = state === 'duck';

      // === Jetpack ===
      ctx.fillStyle = '#556';
      ctx.fillRect(x + 1, y + (duck ? 6 : 14), 9, 14);
      // Flame
      const fl = Math.sin(frame * 0.4) * 2;
      ctx.fillStyle = '#ff6622';
      ctx.beginPath();
      ctx.moveTo(x + 2, y + (duck ? 20 : 28));
      ctx.lineTo(x + 9, y + (duck ? 20 : 28));
      ctx.lineTo(x + 5, y + (duck ? 27 : 35) + fl);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffcc44';
      ctx.beginPath();
      ctx.moveTo(x + 3, y + (duck ? 20 : 28));
      ctx.lineTo(x + 8, y + (duck ? 20 : 28));
      ctx.lineTo(x + 5, y + (duck ? 24 : 32) + fl * 0.5);
      ctx.closePath();
      ctx.fill();

      // === Body ===
      ctx.fillStyle = '#8B4513';
      if (duck) {
        // Wide, flat body
        ctx.beginPath();
        ctx.ellipse(x + 22, y + 16, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(x + 22, y + 28, 12, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Belly
      ctx.fillStyle = '#ddb07a';
      if (duck) {
        ctx.beginPath();
        ctx.ellipse(x + 24, y + 16, 9, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(x + 23, y + 30, 8, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // === Head ===
      const bob = state === 'run' ? Math.sin(frame * 0.12) * 1 : 0;
      const hy = y + bob;
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.arc(x + 24, hy + (duck ? 4 : 8), 11, 0, Math.PI * 2);
      ctx.fill();

      // Face
      ctx.fillStyle = '#ddb07a';
      ctx.beginPath();
      ctx.arc(x + 25, hy + (duck ? 6 : 10), 8, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      const ey = hy + (duck ? 3 : 7);
      if (state === 'hit') {
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x+20,ey-2); ctx.lineTo(x+24,ey+2); ctx.moveTo(x+24,ey-2); ctx.lineTo(x+20,ey+2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x+27,ey-2); ctx.lineTo(x+31,ey+2); ctx.moveTo(x+31,ey-2); ctx.lineTo(x+27,ey+2); ctx.stroke();
      } else {
        // Blink
        if (frame % 100 > 5) {
          ctx.fillStyle = '#FFF';
          ctx.beginPath(); ctx.arc(x + 21, ey, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + 29, ey, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#111';
          const look = state === 'jump' ? -1 : 0.5;
          ctx.beginPath(); ctx.arc(x + 22 + look, ey + look * 0.5, 2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(x + 30 + look, ey + look * 0.5, 2, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.strokeStyle = '#111';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x+18, ey); ctx.lineTo(x+24, ey); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x+26, ey); ctx.lineTo(x+32, ey); ctx.stroke();
        }
      }

      // Smile
      if (state !== 'hit') {
        ctx.strokeStyle = '#5a2a08';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + 25, hy + (duck ? 8 : 12), 4, 0.1, Math.PI - 0.1);
        ctx.stroke();
      }

      // Ears
      ctx.fillStyle = '#6a3010';
      ctx.beginPath(); ctx.arc(x + 14, hy + (duck ? 2 : 5), 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ddb07a';
      ctx.beginPath(); ctx.arc(x + 14, hy + (duck ? 2 : 5), 2.5, 0, Math.PI * 2); ctx.fill();

      // === Legs ===
      if (!duck) {
        ctx.fillStyle = '#6a3010';
        if (state === 'run') {
          const leg = Math.sin(frame * 0.25) * 4;
          ctx.fillRect(x + 14, y + 42, 7, 6 + leg);
          ctx.fillRect(x + 25, y + 42, 7, 6 - leg);
        } else if (state === 'jump') {
          // Tucked legs
          ctx.fillRect(x + 14, y + 40, 7, 5);
          ctx.fillRect(x + 25, y + 40, 7, 5);
        } else {
          ctx.fillRect(x + 14, y + 42, 7, 6);
          ctx.fillRect(x + 25, y + 42, 7, 6);
        }
      }

      // Tail
      ctx.strokeStyle = '#6a3010';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (duck) {
        ctx.moveTo(x + 32, y + 20);
        ctx.quadraticCurveTo(x + 40, y + 14, x + 38, y + 8);
      } else {
        const wag = Math.sin(frame * 0.15) * 2;
        ctx.moveTo(x + 32, y + 36);
        ctx.quadraticCurveTo(x + 42, y + 30 + wag, x + 38, y + 22);
      }
      ctx.stroke();
    },
  },

  obstacles: [
    // === GROUND: Spikes — triangles, instantly readable as danger ===
    {
      name: 'Spike',
      type: 'ground',
      width: 30, height: 30,
      weight: 4,
      draw(ctx, x, y, frame) {
        ctx.fillStyle = '#ee4433';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 30);
        ctx.lineTo(x + 9, y + 3);
        ctx.lineTo(x + 16, y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 14, y + 30);
        ctx.lineTo(x + 21, y + 5);
        ctx.lineTo(x + 28, y + 30);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#aa2211';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + 30);
        ctx.lineTo(x + 9, y + 3);
        ctx.lineTo(x + 15, y + 20);
        ctx.lineTo(x + 21, y + 5);
        ctx.lineTo(x + 30, y + 30);
        ctx.closePath();
        ctx.stroke();
      },
    },
    // === GROUND: Tall pillar — rectangle, forces committed jump ===
    {
      name: 'Pillar',
      type: 'ground',
      width: 24, height: 50,
      weight: 2,
      draw(ctx, x, y, frame) {
        ctx.fillStyle = '#cc5533';
        ctx.fillRect(x + 2, y + 2, 20, 46);
        ctx.fillStyle = '#dd7755';
        ctx.fillRect(x + 6, y + 4, 8, 42);
        ctx.strokeStyle = '#882211';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x + 1, y + 1, 22, 48);
      },
    },
    // === GROUND: Low wide block — short hop ===
    {
      name: 'Log',
      type: 'ground',
      width: 44, height: 22,
      weight: 3,
      draw(ctx, x, y, frame) {
        ctx.fillStyle = '#bb5522';
        ctx.beginPath();
        ctx.ellipse(x + 22, y + 12, 21, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dd8855';
        ctx.beginPath();
        ctx.ellipse(x + 22, y + 10, 14, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tree rings
        ctx.strokeStyle = '#995522';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x + 22, y + 10, 8, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
        // Outline
        ctx.strokeStyle = '#773311';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(x + 22, y + 12, 22, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
      },
    },
    // === AIR: Coconut — circle, duck under ===
    {
      name: 'Coconut',
      type: 'air',
      width: 28, height: 28,
      weight: 3,
      draw(ctx, x, y, frame) {
        ctx.fillStyle = '#8B5E3C';
        ctx.beginPath();
        ctx.arc(x + 14, y + 14, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aa7755';
        ctx.beginPath();
        ctx.arc(x + 14, y + 14, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#664422';
        ctx.beginPath(); ctx.arc(x + 10, y + 11, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 18, y + 11, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 14, y + 18, 2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#442200';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(x + 14, y + 14, 13, 0, Math.PI * 2);
        ctx.stroke();
      },
    },
  ],

  powerups: [
    {
      name: 'Golden Banana',
      width: 22, height: 22,
      points: 150,
      effect: 'shield',
      duration: 0,
      spawnChance: 0.003,
      draw(ctx, x, y, frame) {
        const bob = Math.sin(frame * 0.06) * 3;
        const glow = 0.5 + Math.sin(frame * 0.08) * 0.3;
        // Soft glow
        ctx.fillStyle = 'rgba(255, 220, 80, ' + (glow * 0.12) + ')';
        ctx.beginPath();
        ctx.arc(x + 11, y + 11 + bob, 15, 0, Math.PI * 2);
        ctx.fill();
        // Banana
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x + 11, y + 6 + bob, 8, 0.3, Math.PI - 0.3);
        ctx.quadraticCurveTo(x + 5, y + 20 + bob, x + 15, y + 17 + bob);
        ctx.fill();
        ctx.strokeStyle = '#C8A200';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + 11, y + 6 + bob, 8, 0.3, Math.PI - 0.3);
        ctx.quadraticCurveTo(x + 5, y + 20 + bob, x + 15, y + 17 + bob);
        ctx.stroke();
      },
    },
    {
      name: 'Mango Boost',
      width: 20, height: 20,
      points: 100,
      effect: '2x-score',
      duration: 6000,
      spawnChance: 0.003,
      draw(ctx, x, y, frame) {
        const bob = Math.sin(frame * 0.07) * 3;
        // Glow
        ctx.fillStyle = 'rgba(100, 255, 100, 0.1)';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10 + bob, 14, 0, Math.PI * 2);
        ctx.fill();
        // Mango
        ctx.fillStyle = '#55cc55';
        ctx.beginPath();
        ctx.ellipse(x + 10, y + 11 + bob, 8, 9, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#77ee77';
        ctx.beginPath();
        ctx.ellipse(x + 9, y + 9 + bob, 4, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#339933';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(x + 10, y + 11 + bob, 8, 9, 0.2, 0, Math.PI * 2);
        ctx.stroke();
      },
    },
    {
      name: 'Coconut Milk',
      width: 20, height: 20,
      points: 200,
      effect: 'invincible',
      duration: 5000,
      spawnChance: 0.002,
      draw(ctx, x, y, frame) {
        const bob = Math.sin(frame * 0.08) * 3;
        // Glow
        ctx.fillStyle = 'rgba(180, 220, 255, 0.12)';
        ctx.beginPath();
        ctx.arc(x + 10, y + 10 + bob, 14, 0, Math.PI * 2);
        ctx.fill();
        // Cup
        ctx.fillStyle = '#eee8dd';
        ctx.fillRect(x + 3, y + 4 + bob, 14, 14);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 5, y + 6 + bob, 10, 10);
        // Coconut icon
        ctx.fillStyle = '#aa8866';
        ctx.beginPath();
        ctx.arc(x + 10, y + 11 + bob, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#bbaa99';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 2, y + 3 + bob, 16, 16);
      },
    },
  ],

  backgrounds: [
    // Layer 1 — Sunset sky with distant mountains
    {
      speed: 0.08,
      draw(ctx, scrollX, w, h) {
        // Sky gradient bands (warm sunset)
        ctx.fillStyle = '#1a0e2e';
        ctx.fillRect(0, 0, w, h * 0.3);
        ctx.fillStyle = '#2a1040';
        ctx.fillRect(0, h * 0.3, w, h * 0.15);
        ctx.fillStyle = '#3a1848';
        ctx.fillRect(0, h * 0.45, w, h * 0.1);
        ctx.fillStyle = '#4a2050';
        ctx.fillRect(0, h * 0.55, w, h * 0.1);

        // Distant mountain range — very subtle
        ctx.fillStyle = '#1f1238';
        const sp = 500;
        const off = -(scrollX % sp);
        for (let mx = off - sp; mx < w + sp; mx += sp) {
          ctx.beginPath();
          ctx.moveTo(mx, h * 0.72);
          ctx.lineTo(mx + 120, h * 0.42);
          ctx.lineTo(mx + 220, h * 0.55);
          ctx.lineTo(mx + 350, h * 0.38);
          ctx.lineTo(mx + 500, h * 0.68);
          ctx.lineTo(mx + 500, h * 0.72);
          ctx.closePath();
          ctx.fill();
        }

        // Fill below mountains
        ctx.fillStyle = '#1f1238';
        ctx.fillRect(0, h * 0.68, w, h * 0.32);
      },
    },
    // Layer 2 — Treeline silhouette
    {
      speed: 0.25,
      draw(ctx, scrollX, w, h) {
        ctx.fillStyle = '#251540';
        const sp = 200;
        const off = -(scrollX % sp);
        for (let tx = off - sp; tx < w + sp; tx += sp) {
          ctx.beginPath();
          ctx.arc(tx + 60, h * 0.64, 30, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(tx + 110, h * 0.60, 36, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(tx + 160, h * 0.66, 26, 0, Math.PI * 2);
          ctx.fill();
        }
        // Fill below treeline
        ctx.fillRect(0, h * 0.72, w, h * 0.28);
      },
    },
  ],

  drawGround(ctx, scrollX, groundY, w, h) {
    ctx.fillStyle = this.colors.ground;
    ctx.fillRect(0, groundY, w, h);

    // Single bright accent line at top
    ctx.fillStyle = this.colors.groundLine;
    ctx.fillRect(0, groundY, w, 2);
  },

  particles: {
    dust:     { colors: ['#aa8866', '#887755'], size: 4 },
    jump:     { colors: ['#ff9944'], size: 3 },
    death:    { colors: ['#ff6633', '#ffaa44', '#ffdd66'], size: 7 },
    collect:  { colors: ['#FFD700', '#ffcc44'], size: 5 },
    trail:    { colors: ['#ff8833'], size: 2 },
    confetti: { colors: ['#FFD700', '#ff6633', '#55cc55', '#ff9944'], size: 5 },
  },

  scoring: {
    distancePointsPerFrame: 1,
    milestoneInterval: 500,
    comboDecayMs: 3000,
    comboMultiplierMax: 5,
  },

  difficulty: {
    startSpeed: 3,
    maxSpeed: 11,
    speedRampPerSecond: 0.025,
    startSpawnInterval: 2000,
    minSpawnInterval: 650,
    spawnRampPerSecond: -5,
  },

  sounds: {
    jumpFreqs: [180, 440],
    collectFreqs: [440, 554, 659],
    hitFreq: 65,
    bgBPM: 100,
  },
};
