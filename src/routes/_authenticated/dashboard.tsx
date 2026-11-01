import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import { listProjects } from "@/lib/projects";
import { displayName, useAuth } from "@/lib/auth";
import { TEMPLATES } from "@/lib/templates";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Nexora AI" }, { name: "description", content: "Your Nexora AI projects at a glance." }, { property: "og:title", content: "Dashboard — Nexora AI" }, { property: "og:description", content: "Your projects at a glance." }] }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const projects = data ?? [];
  const stats = [
    { label: "Total Projects", value: projects.length },
    { label: "Built with AI", value: projects.filter((p) => p.source === "ai" || p.source === "template").length },
    { label: "Imported", value: projects.filter((p) => !["ai", "template"].includes(p.source)).length },
    { label: "Templates", value: TEMPLATES.length },
  ];
  return (
    <AppShell>
      <h1 className="text-2xl font-bold">{greeting()}, {displayName(user)} 👋</h1>
      <p className="mt-1 text-sm text-muted-foreground">Here's what's happening with your projects today.</p>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border mirror-card p-5">
            <div className="text-sm text-muted-foreground">{s.label}</div>
            <div className="mt-2 font-display text-3xl font-semibold">{isLoading ? "–" : s.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Projects</h2>
        <Link to="/projects" className="text-sm text-glow">View all</Link>
      </div>
      {error && <p className="mt-4 text-sm text-destructive">Couldn't load projects: {(error as Error).message}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        {projects.slice(0, 8).map((p) => <ProjectCard key={p.id} p={p} />)}
      </div>
      {!isLoading && projects.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-muted-foreground">No projects yet. Describe your first idea and Nexora AI will build it.</p>
          <Button asChild className="mt-4 bg-brand"><Link to="/new">Create your first project</Link></Button>
        </div>
      )}
    </AppShell>
  );
}
