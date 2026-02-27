/**
 * Scoreboard — Anonymous score tracking via bored.run API
 * Embed verbatim. Gracefully degrades when offline.
 */
const Scoreboard = (() => {
  const API_URL = 'https://www.bored.run/api/scores';

  async function submitScore(gameId, gameName, theme, score) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, gameName, theme, score: Math.floor(score) })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json(); // { playCount, allTimeHigh, isNewRecord }
    } catch (e) {
      console.warn('Score submission failed (offline?):', e.message);
      return null;
    }
  }

  async function getStats(gameId) {
    try {
      const res = await fetch(API_URL + '?gameId=' + encodeURIComponent(gameId));
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json(); // { playCount, allTimeHigh }
    } catch (e) {
      console.warn('Stats fetch failed:', e.message);
      return null;
    }
  }

  return { submitScore, getStats };
})();
