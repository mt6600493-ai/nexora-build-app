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
const FEATURES = [
  { icon: Wand2, title: "AI-Powered Builder", body: "Turn plain-language ideas into real, working apps." },
  { icon: Code2, title: "Code Generation", body: "Clean, readable files you can edit in a full editor." },
  { icon: MonitorPlay, title: "Live Preview", body: "See your app instantly on desktop, tablet and mobile." },
  { icon: Import, title: "Import Projects", body: "Bring code from GitHub, Lovable, Vercel, Netlify or ZIP." },
];

function Landing() {
  const [prompt, setPrompt] = useState("");
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Strict sign-in wall: everyone goes straight to sign-in (or the dashboard if already signed in).
  useEffect(() => {
    if (loading) return;
    if (user) navigate({ to: "/dashboard", replace: true });
    else navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);

  function start(p = prompt) {
    if (p.trim()) sessionStorage.setItem("nexora:pending", p.trim());
    if (user) navigate({ to: "/new" });
    else navigate({ to: "/auth", search: { redirect: "/new", mode: "signup" } });
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

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">© 2026 Nexora AI</footer>
    </div>
  );
}
