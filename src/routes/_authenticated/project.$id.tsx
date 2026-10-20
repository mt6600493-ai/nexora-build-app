import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Monitor, Tablet, Smartphone, RefreshCw, Code2, Eye, Download, Settings, Send, Square,
  Loader2, FilePlus, AlertTriangle, MessageSquare, Rocket, FileCode, ExternalLink,
  Cloud, CloudUpload, History, Copy, Maximize2, Minimize2, Globe, FileDown, Wand2, RotateCcw, Check,
} from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
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
import { createVersion, deleteProject, duplicateProject, getProject, listVersions, timeAgo, updateProject, type ChatMsg, type Project, type Version } from "@/lib/projects";
import { SellAndConnect } from "@/components/SellAndConnect";
import { Github } from "lucide-react";
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [full, setFull] = useState(false);
  const { user } = useAuth();
  const [sellOpen, setSellOpen] = useState(false);
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
      const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? "AI change";
      if (user) createVersion(id, user.id, baseFiles, `Before: ${lastUser}`).catch(() => {});
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
  }, [active, persist, user, id]);

  useEffect(() => {
    if (!project || started.current) return;
    const last = project.messages?.[project.messages.length - 1];
    if (autostart && last?.role === "user") {
      started.current = true;
      navigate({ to: "/project/$id", params: { id }, search: {}, replace: true });
      run(project.messages, project.files ?? {});
    }
  }, [project, autostart, run, navigate, id]);

  function sendText(t: string) {
    if (!t || streaming !== null) return;
    const history = [...messages, { role: "user" as const, content: t }];
    setMessages(history); setInput("");
    run(history, files);
  }

  function fixWithAI() {
    if (!previewErr) return;
    const msg = `The live preview shows this error: "${previewErr}". Find the cause and fix it without changing anything else.`;
    setPreviewErr(null);
    setMobileTab("chat");
    sendText(msg);
  }

  async function restoreVersion(v: Version) {
    if (!user) return;
    if (!window.confirm(`Restore the version from ${timeAgo(v.created_at)}? Your current files are saved as a version first.`)) return;
    await createVersion(id, user.id, files, "Before restore").catch(() => {});
    setFiles(v.files); setPreviewKey((k) => k + 1);
    const keys = Object.keys(v.files);
    setActive(keys.find((k) => k.endsWith("index.html")) ?? keys[0] ?? null);
    await persist({ files: v.files });
    setHistoryOpen(false);
    toast.success("Version restored");
  }

  async function duplicate() {
    if (!user || !project) return;
    try {
      const nid = await duplicateProject({ ...project, files }, user.id);
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Copy created");
      navigate({ to: "/project/$id", params: { id: nid } });
    } catch (e) { toast.error((e as Error).message); }
  }

  function exportHtml() {
    if (!project) return;
    const html = buildPreview(files, "index.html", { standalone: true });
    if (!html) { toast.error("This project has no index.html page to export."); return; }
    const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([html], { type: "text/html" })); a.download = `${slug}.html`; a.click();
    URL.revokeObjectURL(a.href);
  }

  async function setPublished(on: boolean) {
    if (!project) return;
    const visibility = on ? "public" : "private";
    setProject({ ...project, visibility });
    await persist({ visibility });
    toast.success(on ? "Your project is live" : "Project unpublished");
  }

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
            <div className="flex items-center gap-1">
              <VoiceButton disabled={streaming !== null} onText={(t) => setInput((p) => (p ? p.trimEnd() + " " : "") + t)} onDone={() => taRef.current?.focus()} />
              <span className="hidden px-1 text-[11px] text-muted-foreground sm:inline">Enter to send · any language</span>
            </div>
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
    <div className={full ? "fixed inset-0 z-50 flex flex-col bg-background" : "flex h-full min-h-0 flex-col"}>
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
        <button onClick={() => setFull((f) => !f)} aria-label={full ? "Exit full screen" : "Full screen"} className="text-muted-foreground hover:text-foreground">{full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
      </div>
      {previewErr && <div className="flex items-center gap-2 border-b border-border bg-destructive/15 px-3 py-1.5 text-xs text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> {previewErr}
        <button className="ml-auto flex shrink-0 items-center gap-1 rounded-md bg-destructive px-2 py-0.5 font-medium text-destructive-foreground disabled:opacity-50" disabled={streaming !== null} onClick={fixWithAI}><Wand2 className="h-3 w-3" />Fix with AI</button>
      </div>}
      <div className="flex flex-1 justify-center overflow-auto bg-muted/40 p-3">
        {srcDoc ? (
          <iframe key={previewKey} title="Live preview" srcDoc={srcDoc} sandbox="allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock" allow="fullscreen; autoplay; gamepad; microphone"
            onLoad={(e) => { if (full) (e.currentTarget as HTMLIFrameElement).focus(); }}
            className="h-full rounded-lg border border-border bg-background shadow-xl transition-all" style={{ width: DEVICES[device].w, maxWidth: "100%" }} />
        ) : (
          <div className="m-auto max-w-sm text-center text-sm text-muted-foreground">
            {streaming !== null ? <><Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-glow" />Building your app…</>
              : isBuildProject ? <>
                This imported project needs a build step (it uses a framework like React or Next.js), so it can't run in the instant preview. Your code is safe and fully editable.
                <Button className="mt-4 bg-brand" disabled={streaming !== null} onClick={() => { setMobileTab("chat"); sendText("Convert this project into an instant live version: create a no-build index.html (React 18 UMD + Babel standalone or plain JS) that recreates the same pages, design and features so it runs in the live preview. Keep the original files."); }}>
                  <Wand2 className="h-4 w-4" />Convert to instant live version</Button>
              </>
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
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {saving === "saving" ? <><CloudUpload className="h-3 w-3 animate-pulse" />Saving to cloud…</>
              : <><Cloud className="h-3 w-3 text-success" />Saved to cloud · {Object.keys(files).length} files</>}
          </div>
        </div>
        <div className="mx-auto hidden items-center gap-1 rounded-lg bg-muted p-0.5 md:flex">
          <button onClick={() => setView("preview")} className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm ${view === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Eye className="h-4 w-4" />Preview</button>
          <button onClick={() => setView("code")} className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-sm ${view === "code" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Code2 className="h-4 w-4" />Code</button>
        </div>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button variant="ghost" size="icon" onClick={() => setHistoryOpen(true)} aria-label="Version history"><History className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Project settings"><Settings className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={exportZip} className="hidden sm:inline-flex"><Download className="h-4 w-4" />Export</Button>
          <Button variant="outline" size="sm" onClick={() => setSellOpen(true)}><Github className="h-4 w-4" /><span className="hidden sm:inline">GitHub, Domain & Sell</span></Button>
          <Button size="sm" className="bg-brand" onClick={() => setDeployOpen(true)}><Rocket className="h-4 w-4" /><span className="hidden sm:inline">Publish</span></Button>
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

      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} projectId={id} onRestore={restoreVersion} />

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} project={project} onDuplicate={duplicate}
        onSave={async (patch) => { setProject({ ...project, ...patch }); await persist(patch); setSettingsOpen(false); toast.success("Settings saved"); }}
        onDelete={async () => { await deleteProject(id); qc.invalidateQueries({ queryKey: ["projects"] }); navigate({ to: "/dashboard" }); }} />

      <PublishDialog open={deployOpen} onOpenChange={setDeployOpen} project={project} canPreview={!!srcDoc}
        onToggle={setPublished} onZip={exportZip} onHtml={exportHtml} />
      <SellAndConnect project={project} files={files} ownerName={user?.email ?? "the creator"}
        onSaved={(patch) => { setProject({ ...project, ...patch }); persist(patch); }}
        onTransferred={() => { qc.invalidateQueries({ queryKey: ["projects"] }); navigate({ to: "/projects" }); }} />
    </div>
  );
}

function SettingsDialog({ open, onOpenChange, project, onSave, onDelete, onDuplicate }: {
  open: boolean; onOpenChange: (o: boolean) => void; project: Project; onDuplicate: () => void;
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
                <SelectContent><SelectItem value="private">Private</SelectItem><SelectItem value="unlisted">Unlisted</SelectItem><SelectItem value="public">Published (public link)</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" className="text-destructive" onClick={() => { if (window.confirm("Delete this project permanently?")) onDelete(); }}>Delete project</Button>
            <Button variant="outline" onClick={() => { onOpenChange(false); onDuplicate(); }}><Copy className="h-4 w-4" />Make a copy</Button>
          </div>
          <Button className="bg-brand" onClick={() => onSave({ name: name.trim() || "Untitled project", description, framework, visibility })}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ open, onOpenChange, projectId, onRestore }: {
  open: boolean; onOpenChange: (o: boolean) => void; projectId: string; onRestore: (v: Version) => void;
}) {
  const [versions, setVersions] = useState<Version[] | null>(null);
  useEffect(() => {
    if (!open) return;
    setVersions(null);
    listVersions(projectId).then(setVersions).catch((e) => { toast.error((e as Error).message); setVersions([]); });
  }, [open, projectId]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Version history</DialogTitle>
          <DialogDescription>A copy of your files is saved before every AI change. Restore any of the last 30.</DialogDescription></DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto">
          {versions === null ? <div className="py-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
            : versions.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No versions yet. They appear after your first AI change.</p>
            : versions.map((v) => (
              <div key={v.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm">{v.label || "Snapshot"}</div>
                  <div className="text-xs text-muted-foreground">{timeAgo(v.created_at)} · {Object.keys(v.files ?? {}).length} files</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onRestore(v)}><RotateCcw className="h-3.5 w-3.5" />Restore</Button>
              </div>
            ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PublishDialog({ open, onOpenChange, project, canPreview, onToggle, onZip, onHtml }: {
  open: boolean; onOpenChange: (o: boolean) => void; project: Project; canPreview: boolean;
  onToggle: (on: boolean) => Promise<void>; onZip: () => void; onHtml: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const live = project.visibility === "public";
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/p/${project.id}`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Publish your project</DialogTitle>
          <DialogDescription>Put it online with a public link anyone can open, or download it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-4">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 text-glow" />
              <div className="flex-1"><div className="text-sm font-medium">Live on the web</div>
                <div className="text-xs text-muted-foreground">{live ? "Anyone with the link can open it." : "Only you can see it right now."}</div></div>
              <Switch checked={live} disabled={busy || (!canPreview && !live)} onCheckedChange={async (v) => { setBusy(true); await onToggle(v); setBusy(false); }} aria-label="Publish" />
            </div>
            {!canPreview && !live && <p className="mt-3 text-xs text-muted-foreground">This project needs an index.html page before it can go live. Use “Convert to instant live version” first.</p>}
            {live && (
              <div className="mt-3 flex gap-2">
                <Input readOnly value={url} className="text-xs" onFocus={(e) => e.currentTarget.select()} />
                <Button size="icon" variant="outline" aria-label="Copy link" onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
                <Button size="icon" variant="outline" asChild aria-label="Open live site"><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
              </div>
            )}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" onClick={onHtml}><FileDown className="h-4 w-4" />Single HTML file</Button>
            <Button variant="outline" onClick={onZip}><Download className="h-4 w-4" />All files (ZIP)</Button>
          </div>
          <div className="space-y-2 rounded-xl bg-muted/50 p-4 text-xs text-muted-foreground">
            <p><b className="text-foreground">Google Search:</b> share your live link anywhere (social media, WhatsApp, your site). Google finds pages through links; for faster results add the link in Google Search Console.</p>
            <p><b className="text-foreground">Play Store / Uptodown:</b> paste your live link into <a className="text-glow underline" href="https://www.pwabuilder.com" target="_blank" rel="noreferrer">PWABuilder</a> to get an Android app package. The Play Store needs a Google Play developer account; Uptodown accepts the APK directly.</p>
            <p><b className="text-foreground">Own hosting:</b> drop the ZIP on <a className="text-glow underline" href="https://app.netlify.com/drop" target="_blank" rel="noreferrer">Netlify Drop</a> or <a className="text-glow underline" href="https://vercel.com/new" target="_blank" rel="noreferrer">Vercel</a>.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
