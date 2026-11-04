import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wand2, Code2, MonitorPlay, Rocket, ArrowRight, Import, Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexora AI — Build anything with AI" },
      { name: "description", content: "Turn your ideas into real web apps and websites. Describe what you need, preview it live, edit the code and export it." },
      { property: "og:title", content: "Nexora AI — Build anything with AI" },
      { property: "og:description", content: "Describe your app or website and Nexora AI builds it, with live preview and a full code editor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const CHIPS = ["Web App", "Website", "Dashboard", "E-commerce", "Portfolio", "Education"];
const SAMPLES = [
  { e: "🎮", t: "3D Racing Game", p: "A 3D car racing game with neon tracks, score and timer" },
  { e: "🧩", t: "Puzzle Game", p: "A colorful match-3 puzzle game with levels and sound" },
  { e: "📱", t: "Todo Web App", p: "A beautiful todo app with categories, dark mode and saving" },
  { e: "🌐", t: "Business Website", p: "A modern restaurant website with menu, gallery and contact form" },
];
const FEATURES = [
  { icon: Wand2, title: "AI-Powered Builder", body: "Turn plain-language ideas into real, working apps." },
  { icon: Code2, title: "Code Generation", body: "Clean, readable files you can edit in a full editor." },
  { icon: MonitorPlay, title: "Live Preview", body: "See your app instantly on desktop, tablet and mobile." },
  { icon: Import, title: "Import Projects", body: "Bring code from GitHub, Vercel, Netlify or a ZIP file." },
];

function Landing() {
  const [prompt, setPrompt] = useState("");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [askLogin, setAskLogin] = useState(false);
  void loading; void useEffect;

  function start(p = prompt) {
    if (!p.trim()) { navigate({ to: user ? "/new" : "/auth", search: user ? undefined : { redirect: "/new", mode: "signup" } } as never); return; }
    localStorage.setItem("nexora:pending", p.trim());
    if (user) navigate({ to: "/new" });
    else setAskLogin(true);
  }

  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <Link to="/free-ai-game-maker" className="hover:text-foreground">AI Game Maker</Link>
          <Link to="/help" className="hover:text-foreground">Docs</Link>
        </nav>
        <div className="flex gap-2">
          {user ? (
            <Button asChild className="bg-brand"><Link to="/dashboard">Open dashboard</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
              <Button asChild className="bg-brand"><Link to="/auth" search={{ mode: "signup" }}>Get Started</Link></Button>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-2 lg:pt-20">
        <div>
          <h1 className="text-5xl font-bold leading-[1.05] md:text-6xl">
            Build Anything<br />with <span className="text-brand">Nexora AI</span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-muted-foreground">
            Turn your ideas into real web apps and websites — just describe what you need, and let AI do the rest.
          </p>
          <form onSubmit={(e) => { e.preventDefault(); start(); }}
            className="mt-8 flex items-center gap-2 rounded-2xl border border-border bg-card/80 p-2 shadow-glow backdrop-blur">
            <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your app or website…"
              className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-muted-foreground" />
            <Button type="submit" className="bg-brand">Generate <ArrowRight className="h-4 w-4" /></Button>
          </form>
          <div className="mt-4 flex flex-wrap gap-2">
            {CHIPS.map((c) => (
              <button key={c} onClick={() => setPrompt(`A modern ${c.toLowerCase()} for `)}
                className="rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground hover:text-foreground">
                {c}
              </button>
            ))}
          </div>
        </div>
        <img src={hero} alt="Nexora AI app previews" width={1280} height={1024} className="w-full rounded-3xl" />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="mb-5 text-2xl font-bold">Try one in a click</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SAMPLES.map((x) => (
            <button key={x.t} onClick={() => start(x.p)} className="mirror-card rounded-2xl border border-border bg-card/60 p-5 text-left transition hover:-translate-y-1">
              <div className="text-3xl">{x.e}</div>
              <h3 className="mt-3 font-semibold">{x.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{x.p}</p>
            </button>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto grid max-w-7xl gap-6 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border bg-card/60 p-6">
            <f.icon className="h-6 w-6 text-glow" />
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </section>

      <section id="pricing" className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <h2 className="text-3xl font-bold">No credit system. Ever.</h2>
        <p className="mt-3 text-muted-foreground">Build and chat without counters, top-ups or surprise deductions. Fair-use limits only protect the service from abuse.</p>
        <ul className="mx-auto mt-8 grid max-w-xl gap-3 text-left sm:grid-cols-2">
          {["Unlimited projects", "AI chat & code generation", "Live responsive preview", "Code editor & ZIP export", "GitHub & ZIP import", "Saved to your account"].map((x) => (
            <li key={x} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" />{x}</li>
          ))}
        </ul>
        <Button onClick={() => start()} size="lg" className="mt-10 bg-brand shadow-glow"><Rocket className="h-4 w-4" /> Start building free</Button>
      </section>

      {askLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur" onClick={() => setAskLogin(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 text-center shadow-glow" onClick={(e) => e.stopPropagation()}>
            <Rocket className="mx-auto h-8 w-8 text-brand" />
            <h3 className="mt-3 text-xl font-bold">Your idea is saved!</h3>
            <p className="mt-2 text-sm text-muted-foreground">Sign in once and building starts right away. You'll stay signed in.</p>
            <Button className="mt-5 w-full bg-brand" onClick={() => navigate({ to: "/auth", search: { redirect: "/new", mode: "signup" } })}>Sign in & build</Button>
            <button className="mt-3 text-xs text-muted-foreground" onClick={() => setAskLogin(false)}>Not now</button>
          </div>
        </div>
      )}
      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">© 2026 Nexora AI</footer>
    </div>
  );
}
