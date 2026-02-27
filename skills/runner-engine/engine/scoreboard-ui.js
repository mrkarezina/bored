/**
 * ScoreboardUI — Game-over screen with anonymous stats
 * Embed verbatim. Shows score, personal best, global stats.
 */
const ScoreboardUI = (() => {
  let theme = null;

  function init(themeConfig) { theme = themeConfig; }

  function showGameOver(score, highScore, apiResult) {
    const screen = document.getElementById('gameover-screen');
    const scoreEl = document.getElementById('gameover-score');
    const hsEl = document.getElementById('gameover-highscore');
    const newRecordEl = document.getElementById('gameover-newrecord');
    const worldRecordEl = document.getElementById('gameover-world-record');
    const statsEl = document.getElementById('game-stats');
    if (!screen) return;

    screen.classList.remove('hidden');

    // Animate score count-up
    if (scoreEl) {
      let current = 0;
      const target = Math.floor(score);
      const step = Math.max(1, Math.floor(target / 40));
      const countUp = () => {
        current = Math.min(current + step, target);
        scoreEl.textContent = current.toLocaleString();
        if (current < target) requestAnimationFrame(countUp);
      };
      countUp();
    }

    const isPersonalBest = score > 0 && score > highScore;
    const displayBest = isPersonalBest ? score : highScore;
    if (hsEl) hsEl.textContent = 'Best: ' + Math.floor(displayBest).toLocaleString();
    const isWorldRecord = apiResult && apiResult.isNewRecord;

    if (newRecordEl) newRecordEl.style.display = isPersonalBest && !isWorldRecord ? 'block' : 'none';
    if (worldRecordEl) worldRecordEl.style.display = isWorldRecord ? 'block' : 'none';

    // Show game stats
    if (statsEl && apiResult) {
      statsEl.innerHTML = '';
      const items = [
        { value: (apiResult.allTimeHigh || 0).toLocaleString(), label: 'All-Time High' },
        { value: (apiResult.playCount || 0).toLocaleString(), label: 'Total Plays' },
      ];
      items.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'stat-item';
        div.style.animationDelay = (i * 100) + 'ms';
        const val = document.createElement('div');
        val.className = 'stat-value';
        val.textContent = item.value;
        const lbl = document.createElement('div');
        lbl.className = 'stat-label';
        lbl.textContent = item.label;
        div.appendChild(val);
        div.appendChild(lbl);
        statsEl.appendChild(div);
      });
    }
  }

  return { init, showGameOver };
})();
