import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Gamepad2, Box, Users, Puzzle, ArrowRight, Languages, Sparkles, Play, Share2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const URL = "https://create-ai-zone.lovable.app/free-ai-game-maker";
const TITLE = "How to Make a Game with AI for Free — Nexora AI Game Maker";
const DESC = "Make 2D and 3D browser games with AI for free, no coding needed. Describe your game in English, Urdu or Hindi and play it instantly.";

const STEPS = [
  { icon: Languages, t: "Describe your game", b: "Write your idea in English, Urdu or Hindi — for example “a car racing game with coins and a timer”." },
  { icon: Sparkles, t: "AI builds it", b: "Nexora AI writes the game code: controls, scoring, levels and graphics." },
  { icon: Play, t: "Play and improve", b: "Play it right in your browser, then ask the AI for changes until it feels right." },
  { icon: Share2, t: "Share it", b: "Download your game as files and share or host it anywhere." },
];

const IDEAS = [
  { icon: Gamepad2, t: "2D arcade games", b: "Runners, shooters, snake, flappy-style and platformers.", p: "Make a 2D endless runner game with jumping, coins, score and increasing speed." },
  { icon: Puzzle, t: "Puzzle & board games", b: "Memory, match-3, tic-tac-toe, chess-style boards.", p: "Make a colorful match-3 puzzle game with levels and a move counter." },
  { icon: Box, t: "Simple 3D games", b: "Browser 3D scenes with a camera, movement and obstacles.", p: "Make a simple 3D game where a ball rolls through obstacles to reach the goal." },
  { icon: Users, t: "Two-player games", b: "Same-screen games for two players on one keyboard.", p: "Make a two-player pong game on one keyboard with a score to 10." },
];

const FAQ = [
  { q: "Can I really make a game with AI for free?", a: "Yes. Nexora AI has no credit system — you only need a free account. Fair-use limits apply to prevent abuse." },
  { q: "Do I need to know how to code?", a: "No. You describe the game in plain words. If you want, you can also open the code editor and change anything yourself." },
  { q: "Can I write my idea in Urdu or Hindi?", a: "Yes. You can describe your game in English, Urdu, Roman Urdu or Hindi." },
  { q: "What kind of games can AI make?", a: "Browser games built with HTML, CSS and JavaScript: 2D arcade, puzzle, board and simple 3D games work best." },
  { q: "Do I own the game I make?", a: "Your project is saved in your account and you can download all its files at any time." },
];

export const Route = createFileRoute("/free-ai-game-maker")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to make a game with AI for free",
          description: DESC,
          step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.t, text: s.b })),
        }),
      },
    ],
  }),
  component: GameMakerPage,
});

function GameMakerPage() {
  const [prompt, setPrompt] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  function start(p = prompt) {
    if (p.trim()) sessionStorage.setItem("nexora:pending", p.trim());
    if (user) navigate({ to: "/new" });
    else navigate({ to: "/auth", search: { redirect: "/new", mode: "signup" } });
  }

  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link to="/"><Logo /></Link>
        <Button className="bg-brand" onClick={() => start("")}>Start free</Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        <section className="py-14 text-center">
          <p className="mb-3 text-sm font-medium text-primary">Free AI game maker · No coding</p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-5xl">
            How to make a game with AI for free
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Describe your game idea and Nexora AI builds a playable browser game in minutes — in English, Urdu or Hindi.
          </p>
          <form
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl border bg-card p-2 sm:flex-row"
            onSubmit={(e) => { e.preventDefault(); start(); }}
          >
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A space shooter with lasers, enemies and a high score"
              className="flex-1 bg-transparent px-3 py-2 outline-none"
              aria-label="Describe your game"
            />
            <Button type="submit" className="bg-brand">Make my game <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </form>
        </section>

        <section className="py-10">
          <h2 className="mb-6 text-2xl font-semibold">Make a game with AI in 4 steps</h2>
          <ol className="grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.t} className="rounded-xl border bg-card p-5">
                <s.icon className="mb-3 h-6 w-6 text-primary" />
                <h3 className="font-semibold">{i + 1}. {s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.b}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-10">
          <h2 className="mb-6 text-2xl font-semibold">Game ideas you can try right now</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {IDEAS.map((g) => (
              <button key={g.t} onClick={() => start(g.p)} className="rounded-xl border bg-card p-5 text-left transition hover:border-primary">
                <g.icon className="mb-3 h-6 w-6 text-primary" />
                <h3 className="font-semibold">{g.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g.b}</p>
                <p className="mt-3 text-sm text-primary">Try: “{g.p}”</p>
              </button>
            ))}
          </div>
        </section>

        <section className="py-10">
          <h2 className="mb-6 text-2xl font-semibold">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="rounded-xl border bg-card p-5">
                <summary className="cursor-pointer font-medium">{f.q}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border bg-card p-8 text-center">
          <h2 className="text-2xl font-semibold">Ready to build your first game?</h2>
          <p className="mt-2 text-muted-foreground">Free, no credit card, no coding. Built by Muhammad Talha in Peshawar.</p>
          <Button className="mt-5 bg-brand" onClick={() => start("")}>Start making games free</Button>
        </section>
      </main>
    </div>
  );
}
