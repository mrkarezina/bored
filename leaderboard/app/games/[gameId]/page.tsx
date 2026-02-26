import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface ScoreRow {
  player_name: string;
  score: number;
  created_at: string;
}

interface GameRow {
  id: string;
  name: string;
  theme_description: string | null;
  play_count: number;
  created_at: string;
}

async function getGame(gameId: string) {
  const { data } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();
  return data as unknown as GameRow | null;
}

async function getScores(gameId: string) {
  const { data } = await supabase
    .from("scores")
    .select("player_name, score, created_at")
    .eq("game_id", gameId)
    .order("score", { ascending: false })
    .limit(50);
  return (data as unknown as ScoreRow[]) || [];
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const [game, scores] = await Promise.all([
    getGame(gameId),
    getScores(gameId),
  ]);

  if (!game) {
    notFound();
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="text-sm text-neutral-500 hover:text-neutral-300 font-mono mb-6 inline-block transition-colors"
      >
        &larr; back to all games
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
          {game.name}
        </h1>
        {game.theme_description && (
          <p className="text-neutral-400 font-mono text-sm">
            {game.theme_description}
          </p>
        )}
        <div className="flex gap-4 mt-3 text-xs text-neutral-600 font-mono">
          <span>{game.play_count || 0} plays</span>
          <span>created {formatTimeAgo(game.created_at)}</span>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4 font-mono text-yellow-400">
        Leaderboard
      </h2>

      <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
        <table className="w-full text-sm font-mono">
          <thead>
            <tr className="text-neutral-500 border-b border-neutral-800">
              <th className="text-left py-3 px-4 w-12">#</th>
              <th className="text-left py-3 px-2">Player</th>
              <th className="text-right py-3 px-2">Score</th>
              <th className="text-right py-3 px-4">When</th>
            </tr>
          </thead>
          <tbody>
            {scores.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-neutral-600"
                >
                  No scores yet. Play the game and be the first!
                </td>
              </tr>
            ) : (
              scores.map((s, i) => (
                <tr
                  key={`${s.player_name}-${s.score}-${i}`}
                  className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-neutral-500">
                    {i === 0 ? (
                      <span className="text-yellow-400">1</span>
                    ) : i === 1 ? (
                      <span className="text-neutral-300">2</span>
                    ) : i === 2 ? (
                      <span className="text-orange-400">3</span>
                    ) : (
                      i + 1
                    )}
                  </td>
                  <td className="py-3 px-2 text-white font-medium">
                    {s.player_name}
                  </td>
                  <td className="py-3 px-2 text-right text-yellow-400 font-bold">
                    {s.score.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-neutral-500">
                    {formatTimeAgo(s.created_at)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 p-4 bg-neutral-900 rounded-lg border border-neutral-800 text-center">
        <p className="text-sm text-neutral-400 font-mono">
          Want to play? Run{" "}
          <code className="bg-neutral-800 px-2 py-0.5 rounded text-yellow-400">
            /bored
          </code>{" "}
          in Claude Code to generate your own unique game.
        </p>
      </div>
    </main>
  );
}
