import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { CopyButton } from "../../copy-button";

export const dynamic = "force-dynamic";

interface GameRow {
  id: string;
  name: string;
  theme_description: string | null;
  play_count: number;
  all_time_high: number;
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
  const game = await getGame(gameId);

  if (!game) {
    notFound();
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
          {game.name}
        </h1>
        {game.theme_description && (
          <p className="text-neutral-400 font-mono text-sm">
            {game.theme_description}
          </p>
        )}
        <div className="text-xs text-neutral-600 font-mono mt-3">
          created {formatTimeAgo(game.created_at)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 text-center">
          <div className="text-3xl font-bold font-mono text-pink-400">
            {(game.play_count || 0).toLocaleString()}
          </div>
          <div className="text-sm text-neutral-500 font-mono mt-1">plays</div>
        </div>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-6 text-center">
          <div className="text-3xl font-bold font-mono text-yellow-400">
            {(game.all_time_high || 0).toLocaleString()}
          </div>
          <div className="text-sm text-neutral-500 font-mono mt-1">
            all-time high
          </div>
        </div>
      </div>

      <div className="p-4 bg-neutral-900 rounded-lg border border-neutral-800 text-center">
        <p className="text-sm text-neutral-400 font-mono">
          Want to play? Run{" "}
          <code className="bg-neutral-800 px-2 py-0.5 rounded text-yellow-400">
            /bored
          </code>{" "}
          in Claude Code to generate your own unique game.
        </p>
        <div className="mt-4 pt-4 border-t border-neutral-800 flex flex-col gap-2 max-w-sm mx-auto w-full">
          <div className="flex items-center justify-between bg-neutral-950 rounded-lg border border-neutral-800 px-3 py-2">
            <code className="text-xs font-mono text-neutral-400">
              /plugin marketplace add{" "}
              <span className="text-yellow-400">mrkarezina/bored</span>
            </code>
            <CopyButton text="/plugin marketplace add mrkarezina/bored" />
          </div>
          <div className="flex items-center justify-between bg-neutral-950 rounded-lg border border-neutral-800 px-3 py-2">
            <code className="text-xs font-mono text-neutral-400">
              /plugin install{" "}
              <span className="text-yellow-400">bored@bored-games</span>
            </code>
            <CopyButton text="/plugin install bored@bored-games" />
          </div>
        </div>
      </div>
    </main>
  );
}
