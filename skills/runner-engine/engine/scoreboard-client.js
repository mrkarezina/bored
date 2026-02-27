// --- ScoreboardClient IIFE ---
const ScoreboardClient = (() => {
  async function submitScore(gameId, gameName, description, finalScore) {
    try {
      const res = await fetch(`${LEADERBOARD_URL}/api/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, gameName, theme: description, score: Math.floor(finalScore) }),
      });
      if (res.ok) return await res.json();
      return null;
    } catch(e) { return null; }
  }
  async function getStats(gameId) {
    try {
      const res = await fetch(`${LEADERBOARD_URL}/api/scores?gameId=${gameId}`);
      if (res.ok) return await res.json();
      return null;
    } catch(e) { return null; }
  }
  return { submitScore, getStats };
})();
