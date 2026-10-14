import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProjectCard } from "@/components/ProjectCard";
import { listProjects } from "@/lib/projects";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({ meta: [{ title: "My Projects — Nexora AI" }, { name: "description", content: "All your saved Nexora AI projects." }, { property: "og:title", content: "My Projects — Nexora AI" }, { property: "og:description", content: "All your saved projects." }] }),
  component: Projects,
});

function Projects() {
  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const list = (data ?? []).filter((p) => (p.name + p.description).toLowerCase().includes(q.toLowerCase()));
  return (
    <AppShell actions={
      <div className="flex max-w-md items-center gap-2 rounded-lg border border-border bg-card px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" className="h-9 flex-1 bg-transparent text-sm outline-none" />
      </div>
    }>
      <h1 className="text-2xl font-bold">My Projects</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading && Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        {list.map((p) => <ProjectCard key={p.id} p={p} />)}
      </div>
      {!isLoading && list.length === 0 && <p className="mt-8 text-muted-foreground">No projects found.</p>}
    </AppShell>
  );
}
