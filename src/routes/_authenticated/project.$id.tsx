import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Monitor, Tablet, Smartphone, RefreshCw, Code2, Eye, Download, Settings, Send, Square,
  Loader2, FilePlus, AlertTriangle, MessageSquare, Rocket, FileCode, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { LogoMark } from "@/components/Logo";
import { CodeEditor } from "@/components/CodeEditor";
import { FileTree } from "@/components/FileTree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteProject, getProject, updateProject, type ChatMsg, type Project } from "@/lib/projects";
import { buildPreview, filesToZip, parseGenerated, type FileMap } from "@/lib/files";
import { streamGenerate } from "@/lib/generate";

export const Route = createFileRoute("/_authenticated/project/$id")({
  validateSearch: z.object({ autostart: z.boolean().optional() }),
  head: () => ({ meta: [{ title: "Project Workspace — Nexora AI" }, { name: "description", content: "Chat with AI, edit code and preview your project live." }, { property: "og:title", content: "Workspace — Nexora AI" }, { property: "og:description", content: "Build with AI, edit code and preview live." }] }),
  component: Workspace,
});

const DEVICES = { desktop: { w: "100%", icon: Monitor }, tablet: { w: "768px", icon: Tablet }, mobile: { w: "390px", icon: Smartphone } } as const;
type Device = keyof typeof DEVICES;

function Workspace() {
  const { id } = Route.useParams();
  const { autostart } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [project, setProject] = useState<Project | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [files, setFiles] = useState<FileMap>({});
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string | null>(null);
  const [view, setView] = useState<"preview" | "code">("preview");
  const [mobileTab, setMobileTab] = useState<"chat" | "work">("chat");
  const [device, setDevice] = useState<Device>("desktop");
  const [active, setActive] = useState<string | null>(null);
  const [page, setPage] = useState("index.html");
  const [previewKey, setPreviewKey] = useState(0);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const started = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getProject(id).then((p) => {
      setProject(p); setFiles(p.files ?? {}); setMessages(p.messages ?? []);
      const keys = Object.keys(p.files ?? {});
      setActive(keys.find((k) => k.endsWith("index.html")) ?? keys[0] ?? null);
    }).catch((e) => setLoadErr((e as Error).message));
  }, [id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streaming]);

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.data?.type === "nexora-nav") setPage(String(e.data.href).replace(/^\.?\//, "").split("?")[0] ?? "index.html");
      if (e.data?.type === "nexora-error") setPreviewErr(e.data.message);
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, []);

  const persist = useCallback((patch: Partial<Project>) => {
    setSaving("saving");
    return updateProject(id, patch)
      .then(() => { setSaving("saved"); qc.invalidateQueries({ queryKey: ["projects"] }); })
      .catch((e) => { setSaving("idle"); toast.error(`Couldn't save: ${(e as Error).message}`); });
  }, [id, qc]);

  const run = useCallback(async (history: ChatMsg[], baseFiles: FileMap) => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreaming("");
    setPreviewErr(null);
    const { text, error } = await streamGenerate(history, baseFiles, (t) => setStreaming(t), ctrl.signal);
    abortRef.current = null;
    setStreaming(null);
    const { files: out, summary } = parseGenerated(text);
    const changed = Object.keys(out);
    let nextFiles = baseFiles;
    let reply: ChatMsg;
    if (error && changed.length === 0) {
      reply = { role: "assistant", content: `**Generation failed:** ${error}`, error: true };
    } else if (changed.length === 0) {
      reply = { role: "assistant", content: summary || "I didn't change any files. Could you describe what you'd like in more detail?" };
    } else {
      nextFiles = { ...baseFiles, ...out };
      setFiles(nextFiles);
      if (!active || !nextFiles[active]) setActive(changed.find((c) => c.endsWith("index.html")) ?? changed[0] ?? null);
      setPreviewKey((k) => k + 1);
      reply = { role: "assistant", content: `${summary || "Done."}\n\n_Updated ${changed.length} file${changed.length > 1 ? "s" : ""}: ${changed.map((c) => `\`${c}\``).join(", ")}_${error ? `\n\n⚠️ ${error}` : ""}` };
    }
    const nextMsgs = [...history, reply];
    setMessages(nextMsgs);
    await persist({ files: nextFiles, messages: nextMsgs });
    taRef.current?.focus();
  }, [active, persist]);

  useEffect(() => {
    if (!project || started.current) return;
    const last = project.messages?.[project.messages.length - 1];
    if (autostart && last?.role === "user") {
      started.current = true;
      navigate({ to: "/project/$id", params: { id }, search: {}, replace: true });
      run(project.messages, project.files ?? {});
    }
  }, [project, autostart, run, navigate, id]);

  function send() {
    const t = input.trim();
    if (!t || streaming !== null) return;
    const history = [...messages, { role: "user" as const, content: t }];
    setMessages(history); setInput("");
    run(history, files);
  }

  function editFile(p: string, v: string) {
    setFiles((f) => {
      const next = { ...f, [p]: v };
      clearTimeout(saveTimer.current);
      setSaving("saving");
      saveTimer.current = setTimeout(() => { persist({ files: next }); setPreviewKey((k) => k + 1); }, 900);
      return next;
    });
  }

  function newFile() {
    const p = window.prompt("New file path (e.g. about.html or js/app.js)")?.trim().replace(/^\/+/, "");
    if (!p) return;
    if (files[p] != null) { toast.error("That file already exists."); return; }
    const next = { ...files, [p]: "" };
    setFiles(next); setActive(p); setView("code"); persist({ files: next });
  }

  function removeFile(p: string) {
    if (!window.confirm(`Delete ${p}?`)) return;
    const next = { ...files }; delete next[p];
    setFiles(next); if (active === p) setActive(Object.keys(next)[0] ?? null);
    persist({ files: next }); setPreviewKey((k) => k + 1);
  }

  async function exportZip() {
    if (!project) return;
    const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
    const blob = await filesToZip(files, slug);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${slug}.zip`; a.click();
    URL.revokeObjectURL(a.href);
  }

  function openTab() {
    if (!srcDoc) return;
    const w = window.open();
    if (w) { w.document.open(); w.document.write(srcDoc); w.document.close(); }
  }

  const live = streaming !== null ? parseGenerated(streaming) : null;
  const srcDoc = useMemo(() => buildPreview(files, page), [files, page]);
  const htmlPages = Object.keys(files).filter((p) => p.endsWith(".html"));
  const isBuildProject = !!files["package.json"] && !srcDoc;

  if (loadErr) return (
    <div className="grid min-h-screen place-items-center text-center">
      <div><p className="text-destructive">Couldn't open this project: {loadErr}</p>
        <Button asChild className="mt-4"><Link to="/dashboard">Back to dashboard</Link></Button></div>
    </div>
  );
  if (!project) return <div className="grid min-h-screen place-items-center"><LogoMark className="h-12 w-12 animate-pulse" /></div>;

  const chat = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && <p className="text-sm text-muted-foreground">Tell Nexora AI what to build or change.</p>}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-8 rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground" : `text-sm ${m.error ? "text-destructive" : ""}`}>
            {m.role === "assistant" ? (
              <div className="flex gap-2.5"><LogoMark className="h-6 w-6 shrink-0" />
                <div className="prose-sm min-w-0 space-y-2 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_ul]:list-disc [&_ul]:pl-4"><ReactMarkdown>{m.content}</ReactMarkdown></div></div>
            ) : <span className="whitespace-pre-wrap">{m.content}</span>}
          </div>
        ))}
        {live && (
          <div className="flex gap-2.5 text-sm"><LogoMark className="h-6 w-6 shrink-0 animate-pulse" />
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />{Object.keys(live.files).length ? "Writing code…" : "Thinking…"}</div>
              {Object.keys(live.files).map((f) => <div key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground"><FileCode className="h-3 w-3" />{f} <span className="opacity-60">({live.files[f]!.split("\n").length} lines)</span></div>)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-border p-3">
        <div className="rounded-xl border border-border bg-card p-2 focus-within:border-primary">
          <textarea ref={taRef} autoFocus value={input} onChange={(e) => setInput(e.target.value)} rows={3}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Nexora AI to add a feature, fix a bug, change the design…" className="w-full resize-none bg-transparent px-2 py-1 text-sm outline-none" />
          <div className="flex items-center justify-between">
            <span className="px-2 text-[11px] text-muted-foreground">Enter to send · Shift+Enter for newline</span>
            {streaming !== null ? (
              <Button size="sm" variant="secondary" onClick={() => abortRef.current?.abort()}><Square className="h-3.5 w-3.5" /> Stop</Button>
            ) : (
              <Button size="sm" onClick={send} disabled={!input.trim()} className="bg-brand"><Send className="h-3.5 w-3.5" /></Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const preview = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          {(Object.keys(DEVICES) as Device[]).map((d) => { const I = DEVICES[d].icon; return (
            <button key={d} onClick={() => setDevice(d)} aria-label={d} className={`rounded-md px-2 py-1 ${device === d ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><I className="h-4 w-4" /></button>
          ); })}
        </div>
        {htmlPages.length > 1 && (
          <Select value={page} onValueChange={setPage}>
            <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>{htmlPages.map((p) => <SelectItem key={p} value={p}>/{p}</SelectItem>)}</SelectContent>
          </Select>
        )}
        <div className="flex-1 truncate rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground">nexora.app/preview/{page}</div>
        <button onClick={() => { setPreviewErr(null); setPreviewKey((k) => k + 1); }} aria-label="Reload preview" className="text-muted-foreground hover:text-foreground"><RefreshCw className="h-4 w-4" /></button>
        <button onClick={openTab} aria-label="Open in new tab" className="text-muted-foreground hover:text-foreground"><ExternalLink className="h-4 w-4" /></button>
      </div>
      {previewErr && <div className="flex items-center gap-2 border-b border-border bg-destructive/15 px-3 py-1.5 text-xs text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> {previewErr}
        <button className="ml-auto underline" onClick={() => { setInput(`Fix this error in the preview: ${previewErr}`); taRef.current?.focus(); }}>Ask AI to fix</button>
      </div>}
      <div className="flex flex-1 justify-center overflow-auto bg-muted/40 p-3">
        {srcDoc ? (
          <iframe key={previewKey} title="Live preview" srcDoc={srcDoc} sandbox="allow-scripts allow-forms allow-modals allow-popups"
            className="h-full rounded-lg border border-border bg-background shadow-xl transition-all" style={{ width: DEVICES[device].w, maxWidth: "100%" }} />
        ) : (
          <div className="m-auto max-w-sm text-center text-sm text-muted-foreground">
            {streaming !== null ? <><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-glow" />Building your app…</>
              : isBuildProject ? <>This imported project needs a build step (it uses a framework like React or Next.js), so it can't run in the instant preview. You can still edit the code, export it, or ask the AI to convert it to a previewable version.</>
              : <>No preview yet. Describe what you want to build in the chat.</>}
          </div>
        )}
      </div>
    </div>
  );

  const code = (
    <div className="flex h-full min-h-0">
      <div className="w-56 shrink-0 overflow-y-auto border-r border-border">
        <div className="flex items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Files <button onClick={newFile} aria-label="New file"><FilePlus className="h-4 w-4" /></button>
        </div>
        <FileTree paths={Object.keys(files)} active={active} onSelect={setActive} onDelete={removeFile} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {active && files[active] != null ? (
          <>
            <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">{active}</div>
            <div className="min-h-0 flex-1"><CodeEditor value={files[active]} onChange={(v) => editFile(active, v)} readOnly={streaming !== null} /></div>
          </>
        ) : <div className="m-auto text-sm text-muted-foreground">Select a file to edit.</div>}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-3">
        <Link to="/dashboard" aria-label="Back" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <LogoMark className="h-7 w-7" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{project.name}</div>
          <div className="text-[11px] text-muted-foreground">{saving === "saving" ? "Saving…" : saving === "saved" ? "All changes saved" : `${Object.keys(files).length} files`}</div>
        </div>
        <div className="mx-auto hidden items-center gap-1 rounded-lg bg-muted p-0.5 md:flex">
          <button onClick={() => setView("preview")} className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm ${view === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Eye className="h-4 w-4" />Preview</button>
          <button onClick={() => setView("code")} className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm ${view === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Code2 className="h-4 w-4" />Code</button>
        </div>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Project settings"><Settings className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={exportZip}><Download className="h-4 w-4" /><span className="hidden sm:inline">Export</span></Button>
          <Button size="sm" className="bg-brand" onClick={() => setDeployOpen(true)}><Rocket className="h-4 w-4" /><span className="hidden sm:inline">Deploy</span></Button>
        </div>
      </header>

      <div className="flex border-b border-border md:hidden">
        {(["chat", "work"] as const).map((t) => (
          <button key={t} onClick={() => setMobileTab(t)} className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-sm ${mobileTab === t ? "border-b-2 border-primary" : "text-muted-foreground"}`}>
            {t === "chat" ? <><MessageSquare className="h-4 w-4" />Chat</> : <>{view === "preview" ? <Eye className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}Workspace</>}
          </button>
        ))}
        {mobileTab === "work" && <button className="px-3 text-xs text-glow" onClick={() => setView(view === "preview" ? "code" : "preview")}>{view === "preview" ? "Code" : "Preview"}</button>}
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className={`${mobileTab === "chat" ? "flex" : "hidden"} w-full flex-col border-r border-border md:flex md:w-[380px] md:shrink-0`}>{chat}</aside>
        <section className={`${mobileTab === "work" ? "flex" : "hidden"} min-w-0 flex-1 flex-col md:flex`}>{view === "preview" ? preview : code}</section>
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} project={project}
        onSave={async (patch) => { setProject({ ...project, ...patch }); await persist(patch); setSettingsOpen(false); toast.success("Settings saved"); }}
        onDelete={async () => { await deleteProject(id); qc.invalidateQueries({ queryKey: ["projects"] }); navigate({ to: "/dashboard" }); }} />

      <Dialog open={deployOpen} onOpenChange={setDeployOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy your project</DialogTitle>
            <DialogDescription>One-click hosting needs a connected deployment service. Until then, you can publish in under a minute:</DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Click <b className="text-foreground">Download ZIP</b> below.</li>
            <li>Open <a className="text-glow underline" href="https://app.netlify.com/drop" target="_blank" rel="noreferrer">Netlify Drop</a> or <a className="text-glow underline" href="https://vercel.com/new" target="_blank" rel="noreferrer">Vercel</a>.</li>
            <li>Drag the unzipped folder in — your site goes live instantly.</li>
          </ol>
          <DialogFooter><Button className="bg-brand" onClick={exportZip}><Download className="h-4 w-4" />Download ZIP</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsDialog({ open, onOpenChange, project, onSave, onDelete }: {
  open: boolean; onOpenChange: (o: boolean) => void; project: Project;
  onSave: (p: Partial<Project>) => Promise<void>; onDelete: () => Promise<void>;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [framework, setFramework] = useState(project.framework);
  const [visibility, setVisibility] = useState(project.visibility);
  useEffect(() => { if (open) { setName(project.name); setDescription(project.description); setFramework(project.framework); setVisibility(project.visibility); } }, [open, project]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Project Settings</DialogTitle><DialogDescription>General information about this project.</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Project Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Framework</Label>
              <Select value={framework} onValueChange={setFramework}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["html", "react", "nextjs", "vue", "svelte", "node"].map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Visibility</Label>
              <Select value={visibility} onValueChange={setVisibility}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="private">Private</SelectItem><SelectItem value="unlisted">Unlisted</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" className="text-destructive" onClick={() => { if (window.confirm("Delete this project permanently?")) onDelete(); }}>Delete project</Button>
          <Button className="bg-brand" onClick={() => onSave({ name: name.trim() || "Untitled project", description, framework, visibility })}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
