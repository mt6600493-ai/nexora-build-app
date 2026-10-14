import { useMemo, useState } from "react";
import { ChevronRight, File, Folder, FolderOpen, Trash2 } from "lucide-react";

type Node = { name: string; path: string; children?: Node[] };

function build(paths: string[]): Node[] {
  const root: Node = { name: "", path: "", children: [] };
  for (const p of [...paths].sort()) {
    const parts = p.split("/");
    let cur = root;
    parts.forEach((part, i) => {
      const path = parts.slice(0, i + 1).join("/");
      const leaf = i === parts.length - 1;
      let n = cur.children!.find((c) => c.name === part && !!c.children === !leaf);
      if (!n) { n = { name: part, path, children: leaf ? undefined : [] }; cur.children!.push(n); }
      cur = n;
    });
  }
  const sort = (ns: Node[]): Node[] =>
    ns.sort((a, b) => (!!b.children as unknown as number) - (!!a.children as unknown as number) || a.name.localeCompare(b.name))
      .map((n) => (n.children ? { ...n, children: sort(n.children) } : n));
  return sort(root.children!);
}

export function FileTree({ paths, active, onSelect, onDelete }: { paths: string[]; active: string | null; onSelect: (p: string) => void; onDelete: (p: string) => void }) {
  const tree = useMemo(() => build(paths), [paths]);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const render = (nodes: Node[], depth: number) =>
    nodes.map((n) =>
      n.children ? (
        <div key={n.path}>
          <button onClick={() => setClosed((s) => { const x = new Set(s); x.has(n.path) ? x.delete(n.path) : x.add(n.path); return x; })}
            className="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-muted" style={{ paddingLeft: depth * 12 + 8 }}>
            <ChevronRight className={`h-3 w-3 transition ${closed.has(n.path) ? "" : "rotate-90"}`} />
            {closed.has(n.path) ? <Folder className="h-4 w-4 text-glow" /> : <FolderOpen className="h-4 w-4 text-glow" />}
            <span className="truncate">{n.name}</span>
          </button>
          {!closed.has(n.path) && render(n.children, depth + 1)}
        </div>
      ) : (
        <div key={n.path} className={`group flex items-center rounded ${active === n.path ? "bg-accent" : "hover:bg-muted"}`}>
          <button onClick={() => onSelect(n.path)} className="flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left text-sm" style={{ paddingLeft: depth * 12 + 26 }}>
            <File className="h-4 w-4 shrink-0 text-muted-foreground" /><span className="truncate">{n.name}</span>
          </button>
          <button onClick={() => onDelete(n.path)} className="mr-1 hidden p-1 text-muted-foreground hover:text-destructive group-hover:block" aria-label={`Delete ${n.name}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    );
  return <div className="py-2">{render(tree, 0)}</div>;
}
