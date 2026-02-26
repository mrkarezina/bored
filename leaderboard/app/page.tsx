import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

interface ScoreRow {
  player_name: string;
  score: number;
  created_at: string;
  game_id: string;
  games: { name: string } | null;
}

interface GameRow {
  id: string;
  name: string;
  theme_description: string | null;
  play_count: number;
}

async function getGlobalLeaderboard() {
  const { data } = await supabase
    .from("scores")
    .select("player_name, score, created_at, game_id, games(name)")
    .order("score", { ascending: false })
    .limit(20);
  return (data as unknown as ScoreRow[]) || [];
}

async function getGames() {
  const { data } = await supabase
    .from("games")
    .select("id, name, theme_description, play_count")
    .order("play_count", { ascending: false })
    .limit(30);
  return (data as unknown as GameRow[]) || [];
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

export default async function Home() {
  const [scores, games] = await Promise.all([
    getGlobalLeaderboard(),
    getGames(),
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
          /bored
        </h1>
        <p className="text-lg text-neutral-400 font-mono">
          endless runner leaderboard
        </p>
        <p className="text-sm text-neutral-600 mt-2 font-mono">
          Run{" "}
          <code className="bg-neutral-800 px-2 py-0.5 rounded text-yellow-400">
            /bored
          </code>{" "}
          in Claude Code to generate your own game
        </p>
        <div className="mt-6 inline-flex items-center bg-neutral-900 rounded-lg border border-neutral-800 px-4 py-3">
          <code className="text-sm font-mono text-neutral-300">
            /install-plugin{" "}
            <span className="text-yellow-400">
              https://github.com/mrkarezina/bored
            </span>
          </code>
          <CopyButton text="/install-plugin https://github.com/mrkarezina/bored" />
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Global Leaderboard */}
        <div className="md:col-span-3">
          <h2 className="text-xl font-bold mb-4 font-mono text-yellow-400">
            Global Top Scores
          </h2>
          <div className="bg-neutral-900 rounded-lg border border-neutral-800 overflow-hidden">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="text-neutral-500 border-b border-neutral-800">
                  <th className="text-left py-3 px-4 w-10">#</th>
                  <th className="text-left py-3 px-2">Player</th>
                  <th className="text-right py-3 px-2">Score</th>
                  <th className="text-left py-3 px-4 hidden sm:table-cell">
                    Game
                  </th>
                </tr>
              </thead>
              <tbody>
                {scores.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-8 text-center text-neutral-600"
                    >
                      No scores yet. Be the first!
                    </td>
                  </tr>
                ) : (
                  scores.map((s, i) => (
                    <tr
                      key={`${s.game_id}-${s.player_name}-${s.score}-${i}`}
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
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <Link
                          href={`/games/${s.game_id}`}
                          className="text-neutral-400 hover:text-pink-400 transition-colors truncate block max-w-[200px]"
                        >
                          {s.games?.name || "Unknown"}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Game Gallery */}
        <div className="md:col-span-2">
          <h2 className="text-xl font-bold mb-4 font-mono text-pink-400">
            Games
          </h2>
          <div className="space-y-3">
            {games.length === 0 ? (
              <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 text-center text-neutral-600 text-sm font-mono">
                No games yet
              </div>
            ) : (
              games.map((game) => (
                <Link
                  key={game.id}
                  href={`/games/${game.id}`}
                  className="block bg-neutral-900 rounded-lg border border-neutral-800 p-4 hover:border-neutral-700 transition-colors"
                >
                  <div className="font-bold text-sm text-white truncate">
                    {game.name}
                  </div>
                  {game.theme_description && (
                    <div className="text-xs text-neutral-500 mt-1 truncate">
                      {game.theme_description}
                    </div>
                  )}
                  <div className="flex justify-between mt-2 text-xs text-neutral-600 font-mono">
                    <span>{game.play_count || 0} plays</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-16 text-sm text-neutral-700 font-mono">
        Built with /bored — a Claude Code plugin
      </div>
    </main>
  );
}
