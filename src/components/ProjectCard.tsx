import { Link } from "@tanstack/react-router";
import { Globe, Github, FileArchive, Sparkles as _s, Code2 } from "lucide-react";
import { timeAgo, type Project } from "@/lib/projects";
import { buildPreview } from "@/lib/files";

void _s;
const ICON: Record<string, typeof Globe> = { github: Github, zip: FileArchive, lovable: Github, vercel: Github, netlify: Github };

export function ProjectCard({ p }: { p: Project }) {
  const Icon = ICON[p.source] ?? Code2;
  const doc = buildPreview(p.files);
  return (
    <Link to="/project/$id" params={{ id: p.id }}
      className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/60 hover:shadow-glow">
      <div className="relative h-36 overflow-hidden bg-muted">
        {doc ? (
          <iframe title={p.name} srcDoc={doc} sandbox="allow-scripts" tabIndex={-1}
            className="pointer-events-none h-[576px] w-[1024px] origin-top-left scale-[0.3] border-0 bg-background" />
        ) : (
          <div className="grid h-full place-items-center"><Icon className="h-8 w-8 text-glow" /></div>
        )}
      </div>
      <div className="p-4">
        <div className="truncate font-medium">{p.name}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3 w-3" /> Updated {timeAgo(p.updated_at)}
        </div>
      </div>
    </Link>
  );
}
