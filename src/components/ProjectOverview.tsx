import { Cloud, CloudOff, CloudUpload, Download, FileCode, Github, Globe, History, Image as ImageIcon, Rocket, Settings, HardDrive, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { timeAgo, type Project } from "@/lib/projects";
import { isAssetRef, isInlineImage } from "@/lib/assets";
import type { FileMap } from "@/lib/files";
import type { SaveState } from "@/lib/save-queue";

type Action = "settings" | "history" | "publish" | "export" | "github";

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

export function ProjectOverview({ open, onOpenChange, project, files, saveState, hasUnpublished, onAction }: {
  open: boolean; onOpenChange: (o: boolean) => void; project: Project; files: FileMap; saveState: SaveState;
  hasUnpublished: boolean; onAction: (a: Action) => void;
}) {
  const values = Object.values(files);
  const images = values.filter((v) => isAssetRef(v) || isInlineImage(v)).length;
  const codeFiles = values.length - images;
  const codeSize = values.reduce((n, v) => (isAssetRef(v) || isInlineImage(v) ? n : n + v.length), 0);
  const pages = Object.keys(files).filter((p) => p.endsWith(".html")).length;
  const live = project.visibility === "public";
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/p/${project.id}`;
  const go = (a: Action) => { onOpenChange(false); onAction(a); };

  const stats = [
    { icon: FileCode, label: "Code files", value: String(codeFiles) },
    { icon: ImageIcon, label: "Images", value: String(images) },
    { icon: Globe, label: "Pages", value: String(pages) },
    { icon: HardDrive, label: "Code size", value: kb(codeSize) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="truncate">{project.name}</DialogTitle>
          <DialogDescription>{project.description || "Everything about this project in one place."}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><s.icon className="h-3.5 w-3.5" />{s.label}</div>
              <div className="mt-1 text-lg font-semibold">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="space-y-2 rounded-xl border border-border p-3 text-sm">
          <Row label="Cloud save">
            {saveState === "saving" ? <span className="flex items-center gap-1"><CloudUpload className="h-3.5 w-3.5 animate-pulse" />Saving…</span>
              : saveState === "error" ? <span className="flex items-center gap-1 text-destructive"><CloudOff className="h-3.5 w-3.5" />Not saved yet — retrying</span>
              : <span className="flex items-center gap-1 text-success"><Cloud className="h-3.5 w-3.5" />Saved {timeAgo(project.updated_at)}</span>}
          </Row>
          <Row label="Website status">
            {live ? <span className={hasUnpublished ? "text-glow" : "text-success"}>{hasUnpublished ? "Live · new changes not published" : "Live · up to date"}</span>
              : <span className="text-muted-foreground">Not published</span>}
          </Row>
          {live && <Row label="Live link"><a href={url} target="_blank" rel="noreferrer" className="truncate text-glow underline">{url.replace(/^https?:\/\//, "")}</a></Row>}
          {project.published_at && <Row label="Last published">{timeAgo(project.published_at)}</Row>}
          <Row label="App data">Saved in each visitor's own browser</Row>
          <Row label="Created"><span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(project.created_at).toLocaleDateString()}</span></Row>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button className="bg-brand" onClick={() => go("publish")}><Rocket className="h-4 w-4" />{live ? (hasUnpublished ? "Publish changes" : "Publish settings") : "Publish"}</Button>
          <Button variant="outline" onClick={() => go("history")}><History className="h-4 w-4" />Version history</Button>
          <Button variant="outline" onClick={() => go("github")}><Github className="h-4 w-4" />GitHub, Domain & Sell</Button>
          <Button variant="outline" onClick={() => go("export")}><Download className="h-4 w-4" />Download ZIP</Button>
          <Button variant="outline" className="col-span-2" onClick={() => go("settings")}><Settings className="h-4 w-4" />Project settings</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right">{children}</span>
    </div>
  );
}
