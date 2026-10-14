import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Github, Triangle, Database, FileArchive, Globe } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({ meta: [{ title: "Integrations — Nexora AI" }, { name: "description", content: "Services connected to Nexora AI." }, { property: "og:title", content: "Integrations — Nexora AI" }, { property: "og:description", content: "Connected services." }] }),
  component: Integrations,
});

const ITEMS = [
  { icon: Bot, name: "AI Builder", desc: "AI models & chat", status: "Connected" },
  { icon: Database, name: "Cloud Database & Auth", desc: "Saves projects to your account", status: "Connected" },
  { icon: Github, name: "GitHub", desc: "Import public repositories", status: "Available" },
  { icon: FileArchive, name: "ZIP Import / Export", desc: "Move code in and out", status: "Available" },
  { icon: Triangle, name: "Vercel", desc: "Deploy via ZIP or connected repo", status: "Manual" },
  { icon: Globe, name: "Netlify", desc: "Deploy via Netlify Drop", status: "Manual" },
];

function Integrations() {
  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Integrations</h1>
      <p className="mt-1 text-sm text-muted-foreground">Connect third-party services to extend your projects.</p>
      <div className="mt-6 max-w-3xl space-y-3">
        {ITEMS.map((i) => (
          <div key={i.name} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent"><i.icon className="h-5 w-5" /></div>
            <div className="flex-1"><div className="font-medium">{i.name}</div><div className="text-sm text-muted-foreground">{i.desc}</div></div>
            <span className={`rounded-full px-2.5 py-0.5 text-xs ${i.status === "Connected" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>{i.status}</span>
            {i.status !== "Connected" && <Button asChild size="sm" variant="outline"><Link to="/new">Use</Link></Button>}
          </div>
        ))}
      </div>
    </AppShell>
  );
}
