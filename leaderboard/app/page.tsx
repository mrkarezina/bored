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
    <main className="relative min-h-screen">
      {/* Atmospheric glow */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% -5%, rgba(236, 72, 153, 0.08), rgba(168, 85, 247, 0.03) 50%, transparent 80%)",
        }}
      />

      <div className="relative max-w-lg mx-auto px-6 pt-24 pb-16">
        {/* Hero */}
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-6xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-500 bg-clip-text text-transparent animate-gradient-pan inline-block">
            /bored
          </h1>
          <p className="text-base text-neutral-500 font-mono mt-4">
            endless runner generator
          </p>
          <p className="text-xs text-neutral-600 mt-1 font-mono">
            a Claude Code plugin
          </p>
        </div>

        {/* Install */}
        <div
          className="mb-16 animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          <div className="text-[10px] font-mono text-neutral-600 mb-2.5 uppercase tracking-[0.2em]">
            Install
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between bg-neutral-900/80 rounded-lg border border-neutral-800/60 px-4 py-2.5">
              <code className="text-sm font-mono text-neutral-400">
                /plugin marketplace add{" "}
                <span className="text-yellow-400">mrkarezina/bored</span>
              </code>
              <CopyButton text="/plugin marketplace add mrkarezina/bored" />
            </div>
            <div className="flex items-center justify-between bg-neutral-900/80 rounded-lg border border-neutral-800/60 px-4 py-2.5">
              <code className="text-sm font-mono text-neutral-400">
                /plugin install{" "}
                <span className="text-yellow-400">bored@bored-games</span>
              </code>
              <CopyButton text="/plugin install bored@bored-games" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          className="flex justify-center gap-16 mb-16 animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          <div className="text-center">
            <div
              className="text-4xl font-bold font-mono text-yellow-400"
              style={{ textShadow: "0 0 40px rgba(250, 204, 21, 0.15)" }}
            >
              {gameCount.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-600 font-mono mt-2 tracking-wide">
              games created
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-4xl font-bold font-mono text-pink-400"
              style={{ textShadow: "0 0 40px rgba(236, 72, 153, 0.15)" }}
            >
              {totalPlays.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-600 font-mono mt-2 tracking-wide">
              total plays
            </div>
          </div>
        </div>

        {/* Commands */}
        <div
          className="mb-20 animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <div className="text-[10px] font-mono text-neutral-600 mb-3 uppercase tracking-[0.2em] text-center">
            Commands
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* /bored */}
            <div className="rounded-xl overflow-hidden">
              <div className="h-px bg-gradient-to-r from-yellow-400/50 via-yellow-400/20 to-transparent" />
              <div className="bg-neutral-900/50 border border-neutral-800/50 border-t-0 p-4 rounded-b-xl">
                <div className="flex items-center justify-between mb-2.5">
                  <code className="text-sm font-mono font-semibold text-yellow-400">
                    /bored
                  </code>
                  <CopyButton text="/bored" />
                </div>
                <p className="text-xs text-neutral-500 font-mono leading-relaxed">
                  Generate a game. Add a theme after or let it surprise you.
                </p>
                <div className="mt-3 bg-neutral-950/80 rounded-lg border border-neutral-800/30 px-3 py-2">
                  <code className="text-xs font-mono text-neutral-500">
                    /bored{" "}
                    <span className="text-pink-400/80">flying panda</span>
                  </code>
                </div>
              </div>
            </div>

            {/* /bored:share */}
            <div className="rounded-xl overflow-hidden">
              <div className="h-px bg-gradient-to-r from-pink-500/50 via-pink-500/20 to-transparent" />
              <div className="bg-neutral-900/50 border border-neutral-800/50 border-t-0 p-4 rounded-b-xl">
                <div className="flex items-center justify-between mb-2.5">
                  <code className="text-sm font-mono font-semibold text-yellow-400">
                    /bored:share
                  </code>
                  <CopyButton text="/bored:share" />
                </div>
                <p className="text-xs text-neutral-500 font-mono leading-relaxed">
                  Create a shareable link for your game.
                </p>
                <div className="mt-3 bg-neutral-950/80 rounded-lg border border-neutral-800/30 px-3 py-2">
                  <code className="text-xs font-mono text-neutral-500">
                    /play/
                    <span className="text-pink-400/80">your-game</span>
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Try a game */}
        <div
          className="mb-16 animate-fade-up"
          style={{ animationDelay: "320ms" }}
        >
          <div className="text-[10px] font-mono text-neutral-600 mb-3 uppercase tracking-[0.2em] text-center">
            Try a game
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="/play/c8e3f1a7-4b2d-4e9a-bf56-7d1c8a3e9f02"
              className="group rounded-xl overflow-hidden block"
            >
              <div className="h-px bg-gradient-to-r from-purple-500/50 via-purple-500/20 to-transparent" />
              <div className="bg-neutral-900/50 border border-neutral-800/50 border-t-0 px-4 py-3.5 rounded-b-xl group-hover:bg-neutral-800/40 transition-colors">
                <span className="text-sm font-mono font-semibold text-neutral-300 group-hover:text-white transition-colors">
                  Jetpack Monkey
                </span>
              </div>
            </a>
            <a
              href="/play/b7e3a91f-4c28-4d5e-9f1a-8e2d6c3b5a74"
              className="group rounded-xl overflow-hidden block"
            >
              <div className="h-px bg-gradient-to-r from-purple-500/50 via-purple-500/20 to-transparent" />
              <div className="bg-neutral-900/50 border border-neutral-800/50 border-t-0 px-4 py-3.5 rounded-b-xl group-hover:bg-neutral-800/40 transition-colors">
                <span className="text-sm font-mono font-semibold text-neutral-300 group-hover:text-white transition-colors">
                  Court Dash
                </span>
              </div>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div
          className="text-center animate-fade-up"
          style={{ animationDelay: "400ms" }}
        >
          <a
            href="https://github.com/mrkarezina/bored"
            className="inline-flex items-center gap-2 text-sm font-mono text-neutral-500 hover:text-neutral-200 transition-colors group"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="opacity-50 group-hover:opacity-100 transition-opacity"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            mrkarezina/bored
          </a>
        </div>
      </div>
    </main>
  );
}
