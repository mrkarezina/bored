/**
 * HUD — Score display, combo counter, multiplier bar, effect indicators
 * Embed verbatim. Styled via THEME.colors config.
 */
const HUD = (() => {
  let ctx = null;
  let theme = null;
  let comboFlash = 0;
  let comboFlashText = '';

  function init(context, themeConfig) {
    ctx = context;
    theme = themeConfig;
  }

  function draw(score, highScore, combo, multiplier, activeEffects, elapsed) {
    if (!ctx || !theme) return;
    const w = ctx.canvas.width;

    // Score (top right)
    ctx.save();
    ctx.fillStyle = theme.colors.score;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const scoreText = String(Math.floor(score)).padStart(6, '0');
    ctx.fillText(scoreText, w - 16, 16);

    // High score (smaller, below score)
    ctx.fillStyle = theme.colors.text;
    ctx.globalAlpha = 0.4;
    ctx.font = '12px monospace';
    ctx.fillText('HI ' + String(Math.floor(highScore)).padStart(6, '0'), w - 16, 48);
    ctx.globalAlpha = 1;

    // Combo multiplier (top left)
    if (multiplier > 1) {
      ctx.textAlign = 'left';
      ctx.fillStyle = theme.colors.accent;
      ctx.font = 'bold 20px monospace';
      ctx.fillText(multiplier.toFixed(1) + 'x', 16, 16);

      // Combo count
      ctx.fillStyle = theme.colors.text;
      ctx.globalAlpha = 0.6;
      ctx.font = '12px monospace';
      ctx.fillText('COMBO ' + combo, 16, 40);
      ctx.globalAlpha = 1;
    }

    // Active effects (icons below score)
    let effectY = 64;
    for (const key of Object.keys(activeEffects)) {
      const effect = activeEffects[key];
      const pct = effect.remaining / (effect.powerup.duration || 3000);
      ctx.textAlign = 'right';
      ctx.font = '11px monospace';
      ctx.fillStyle = theme.colors.accent;
      ctx.globalAlpha = 0.8;

      const label = key.toUpperCase().replace('-', ' ');
      ctx.fillText(label, w - 16, effectY);

      // Timer bar
      ctx.fillStyle = theme.colors.accent;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(w - 100, effectY + 2, 80, 4);
      ctx.globalAlpha = 0.8;
      ctx.fillRect(w - 100, effectY + 2, 80 * pct, 4);
      ctx.globalAlpha = 1;

      effectY += 18;
    }

    // Elapsed time (bottom left, subtle)
    ctx.textAlign = 'left';
    ctx.fillStyle = theme.colors.text;
    ctx.globalAlpha = 0.25;
    ctx.font = '11px monospace';
    const secs = Math.floor(elapsed / 1000);
    const mins = Math.floor(secs / 60);
    const timeStr = mins + ':' + String(secs % 60).padStart(2, '0');
    ctx.fillText(timeStr, 16, ctx.canvas.height - 12);
    ctx.globalAlpha = 1;

    // Combo flash effect
    if (comboFlash > 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = theme.colors.score;
      ctx.globalAlpha = comboFlash;
      ctx.font = 'bold ' + (24 + (1 - comboFlash) * 16) + 'px monospace';
      ctx.fillText(comboFlashText, ctx.canvas.width / 2, 80);
      ctx.globalAlpha = 1;
      comboFlash -= 0.02;
    }

    ctx.restore();
  }

  function flashCombo(combo, multiplier) {
    comboFlash = 1.0;
    if (combo >= 10) {
      comboFlashText = 'UNSTOPPABLE! x' + multiplier.toFixed(1);
    } else if (combo >= 7) {
      comboFlashText = 'ON FIRE! x' + multiplier.toFixed(1);
    } else if (combo >= 4) {
      comboFlashText = 'COMBO x' + multiplier.toFixed(1);
    } else {
      comboFlashText = '+' + multiplier.toFixed(1) + 'x';
    }
  }

  return { init, draw, flashCombo };
})();
