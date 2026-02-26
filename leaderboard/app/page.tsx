import { supabase } from "@/lib/supabase";
import { CopyButton } from "./copy-button";

export const dynamic = "force-dynamic";

async function getGlobalStats() {
  const { data } = await supabase
    .from("games")
    .select("play_count");
  const rows = (data as unknown as { play_count: number }[]) || [];
  const gameCount = rows.length;
  const totalPlays = rows.reduce((sum, r) => sum + (r.play_count || 0), 0);
  return { gameCount, totalPlays };
}

export default async function Home() {
  const { gameCount, totalPlays } = await getGlobalStats();

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
          /bored
        </h1>
        <p className="text-lg text-neutral-400 font-mono">
          endless runner generator
        </p>
        <p className="text-sm text-neutral-600 mt-2 font-mono">
          Run{" "}
          <code className="bg-neutral-800 px-2 py-0.5 rounded text-yellow-400">
            /bored
          </code>{" "}
          in Claude Code to generate your own game
        </p>
        <div className="mt-6 flex flex-col gap-2 w-full max-w-md mx-auto">
          <div className="flex items-center justify-between bg-neutral-900 rounded-lg border border-neutral-800 px-4 py-2.5">
            <code className="text-sm font-mono text-neutral-300">
              /plugin marketplace add{" "}
              <span className="text-yellow-400">mrkarezina/bored</span>
            </code>
            <CopyButton text="/plugin marketplace add mrkarezina/bored" />
          </div>
          <div className="flex items-center justify-between bg-neutral-900 rounded-lg border border-neutral-800 px-4 py-2.5">
            <code className="text-sm font-mono text-neutral-300">
              /plugin install{" "}
              <span className="text-yellow-400">bored@bored-games</span>
            </code>
            <CopyButton text="/plugin install bored@bored-games" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex justify-center gap-12 mb-16">
        <div className="text-center">
          <div className="text-4xl font-bold font-mono text-yellow-400">
            {gameCount.toLocaleString()}
          </div>
          <div className="text-sm text-neutral-500 font-mono mt-1">
            games created
          </div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold font-mono text-pink-400">
            {totalPlays.toLocaleString()}
          </div>
          <div className="text-sm text-neutral-500 font-mono mt-1">
            total plays
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-16 text-sm text-neutral-700 font-mono">
        Built with{" "}
        <a
          href="https://github.com/mrkarezina/bored"
          className="hover:text-neutral-400 transition-colors underline underline-offset-2"
        >
          /bored
        </a>
        {" "}— a Claude Code plugin
      </div>
      <div className="flex justify-center gap-4 mt-4 text-xs font-mono">
        <a
          href="https://www.bored.run/play/a3c7e5f1-d8b2-4a96-bf40-6e9d1c3a5b82"
          className="text-neutral-600 hover:text-pink-400 transition-colors"
        >
          Jungle Boogie
        </a>
        <span className="text-neutral-800">·</span>
        <a
          href="https://www.bored.run/play/f8e2d1c0-b9a8-4765-9f3e-2d1c0b9a8765"
          className="text-neutral-600 hover:text-pink-400 transition-colors"
        >
          Cupids Rush
        </a>
      </div>
    </main>
  );
}
