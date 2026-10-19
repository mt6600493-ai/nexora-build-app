import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Wand2, Github, FileArchive, Loader2, Upload, ArrowLeftRight, Info } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { LogoMark } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEMPLATES, GAME_TEMPLATES } from "@/lib/templates";
import { VoiceButton } from "@/components/VoiceButton";
import { createProject, nameFromPrompt } from "@/lib/projects";
import { detectFramework, filesFromGithub, filesFromZip, type FileMap } from "@/lib/files";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/new")({
  head: () => ({ meta: [{ title: "Create New Project — Nexora AI" }, { name: "description", content: "Start a project with AI, a template, or import existing code." }, { property: "og:title", content: "New Project — Nexora AI" }, { property: "og:description", content: "Start with AI, a template or an import." }] }),
  component: NewProject,
});

const SOURCES = [
  { id: "lovable", name: "Lovable", hint: "Import via the GitHub repo your Lovable project syncs to", kind: "github" },
  { id: "github", name: "GitHub", hint: "Import any public GitHub repository", kind: "github" },
  { id: "vercel", name: "Vercel", hint: "Import the GitHub repo connected to your Vercel project", kind: "github" },
  { id: "netlify", name: "Netlify", hint: "Import the repo linked to your Netlify site", kind: "github" },
  { id: "zip", name: "ZIP / File", hint: "Upload your project as a .zip file", kind: "zip" },
] as const;

function NewProject() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [src, setSrc] = useState<(typeof SOURCES)[number]["id"]>("github");
  const [repo, setRepo] = useState("");
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = sessionStorage.getItem("nexora:pending");
    if (p) { sessionStorage.removeItem("nexora:pending"); setPrompt(p); }
  }, []);

  async function startAI(text: string, source = "ai", name?: string) {
    if (!text.trim() || !user) { toast.error("Describe what you'd like to build."); return; }
    setBusy(true);
    try {
      const id = await createProject({ user_id: user.id, name: name ?? nameFromPrompt(text), description: text, source, messages: [{ role: "user", content: text }] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/project/$id", params: { id }, search: { autostart: true } });
    } catch (e) { toast.error((e as Error).message); setBusy(false); }
  }

  async function finishImport(files: FileMap, source: string, name: string) {
    if (!user) return;
    const count = Object.keys(files).length;
    if (count === 0) throw new Error("No readable source files were found.");
    const id = await createProject({
      user_id: user.id, name, source, files, framework: detectFramework(files),
      description: `Imported from ${source}`,
      messages: [{ role: "assistant", content: `Imported ${count} files from ${source}. This is your own independent copy, saved permanently in your account — the original is never touched. Tell me what to change, or edit the code directly.` }],
    });
    qc.invalidateQueries({ queryKey: ["projects"] });
    toast.success(`Imported ${count} files`);
    navigate({ to: "/project/$id", params: { id } });
  }

  async function importGithub() {
    setBusy(true); setProgress("Reading repository…");
    try {
      const files = await filesFromGithub(repo, (n, t) => setProgress(`Downloading files ${n}/${t}`));
      const name = repo.replace(/\.git$/, "").split("/").filter(Boolean).pop() ?? "Imported project";
      await finishImport(files, src, name);
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); setProgress(""); }
  }

  async function importZip(f: File) {
    setBusy(true); setProgress("Unpacking ZIP…");
    try { await finishImport(await filesFromZip(f), "zip", f.name.replace(/\.zip$/i, "")); }
    catch (e) { toast.error((e as Error).message || "That file isn't a valid ZIP."); }
    finally { setBusy(false); setProgress(""); }
  }

  const current = SOURCES.find((s) => s.id === src)!;

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Create New Project</h1>
      <Tabs defaultValue="ai" className="mt-6">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="ai">Create with AI</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
          <TabsTrigger value="template">From Template</TabsTrigger>
          <TabsTrigger value="import">Import Project</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6 max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-5">
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={6}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) startAI(prompt); }}
              placeholder="Describe your app or website in detail…  e.g. Create a modern e-commerce website with product search, cart and checkout."
              className="border-0 bg-transparent text-base focus-visible:ring-0" />
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Write or speak in any language — Nexora replies in yours.</span>
              <VoiceButton disabled={busy} onText={(t) => setPrompt((p) => (p ? p.trimEnd() + " " : "") + t)} />
            </div>
            <Button disabled={busy} onClick={() => startAI(prompt)} className="mt-3 w-full bg-brand shadow-glow">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Generate
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="games" className="mt-6">
          <p className="mb-4 max-w-2xl text-sm text-muted-foreground">Pick a starting game. Offline games run on any device; online games let you play a friend by sharing a room code. You can change everything afterwards by chatting with the AI.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAME_TEMPLATES.map((t) => (
              <button key={t.id} disabled={busy} onClick={() => startAI(t.prompt, "template", t.title)}
                className="rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/60 hover:shadow-glow">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent"><t.icon className="h-5 w-5 text-glow" /></div>
                <div className="mt-4 font-medium">{t.title}</div>
                <div className="text-sm text-muted-foreground">{t.blurb}</div>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="template" className="mt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map((t) => (
              <button key={t.id} disabled={busy} onClick={() => startAI(t.prompt, "template", t.title)}
                className="rounded-2xl border border-border bg-card p-5 text-left transition hover:border-primary/60 hover:shadow-glow">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent"><t.icon className="h-5 w-5 text-glow" /></div>
                <div className="mt-4 font-medium">{t.title}</div>
                <div className="text-sm text-muted-foreground">{t.blurb}</div>
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="import" className="mt-6 max-w-3xl">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center justify-center gap-3">
              <LogoMark className="h-12 w-12" /><ArrowLeftRight className="h-5 w-5 text-muted-foreground" />
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent"><Upload className="h-5 w-5" /></div>
            </div>
            <h2 className="mt-4 text-center text-lg font-semibold">Import from Other App</h2>
            <p className="text-center text-sm text-muted-foreground">Bring your existing projects from other platforms to Nexora AI.</p>
            <div className="mt-6 space-y-2">
              {SOURCES.map((s) => (
                <button key={s.id} onClick={() => setSrc(s.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${src === s.id ? "border-primary bg-accent" : "border-border hover:bg-muted"}`}>
                  {s.kind === "zip" ? <FileArchive className="h-5 w-5" /> : <Github className="h-5 w-5" />}
                  <div className="flex-1"><div className="text-sm font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.hint}</div></div>
                </button>
              ))}
            </div>
            <div className="mt-6">
              {current.kind === "github" ? (
                <div className="flex gap-2">
                  <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/owner/repository" />
                  <Button disabled={busy || !repo} onClick={importGithub} className="bg-brand">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}</Button>
                </div>
              ) : (
                <>
                  <input ref={fileRef} type="file" accept=".zip,application/zip" className="hidden" onChange={(e) => e.target.files?.[0] && importZip(e.target.files[0])} />
                  <Button disabled={busy} onClick={() => fileRef.current?.click()} className="w-full bg-brand">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Choose ZIP file
                  </Button>
                </>
              )}
              {progress && <p className="mt-2 text-sm text-muted-foreground">{progress}</p>}
              <p className="mt-4 flex gap-2 text-xs text-muted-foreground"><Info className="h-4 w-4 shrink-0" />
                Lovable, Vercel and Netlify projects are imported through their connected GitHub repository (public repos), or export your code as a ZIP. Every import becomes your own independent copy in My Projects, saved permanently to your account, so you can change anything.</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
