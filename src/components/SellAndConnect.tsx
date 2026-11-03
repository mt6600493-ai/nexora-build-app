import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Github, Globe, Loader2, PackageCheck, Send, Smartphone, Tag } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { filesToZip, type FileMap } from "@/lib/files";
import { handoverKit, pushToGithub, transferProject } from "@/lib/selling";
import type { Project } from "@/lib/projects";

type Patch = Partial<Pick<Project, "sale_contact" | "sale_price" | "custom_domain">>;

export function SellAndConnect({ open, onOpenChange, project, files, ownerName, onSaved, onTransferred }: {
  open: boolean; onOpenChange: (o: boolean) => void; project: Project; files: FileMap; ownerName: string;
  onSaved: (p: Patch) => void; onTransferred: () => void;
}) {
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
  const [token, setToken] = useState("");
  const [repo, setRepo] = useState(slug);
  const [step, setStep] = useState("");
  const [result, setResult] = useState<{ url: string; pagesUrl: string } | null>(null);
  const [domain, setDomain] = useState(project.custom_domain ?? "");
  const [contact, setContact] = useState(project.sale_contact ?? "");
  const [price, setPrice] = useState(project.sale_price ?? "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setToken(localStorage.getItem("nexora:gh-token") ?? "");
    setDomain(project.custom_domain ?? ""); setContact(project.sale_contact ?? ""); setPrice(project.sale_price ?? "");
  }, [open, project]);

  async function push() {
    setBusy(true); setResult(null);
    try {
      localStorage.setItem("nexora:gh-token", token.trim());
      setResult(await pushToGithub(token.trim(), repo, files, setStep));
      toast.success("Pushed to GitHub");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); setStep(""); }
  }

  async function kit() {
    const blob = await filesToZip(handoverKit(files, project.name, ownerName), slug);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${slug}-handover.zip`; a.click();
    URL.revokeObjectURL(a.href);
  }

  async function transfer() {
    if (!window.confirm(`Move "${project.name}" to ${email}? It will leave your account.`)) return;
    setBusy(true);
    try { await transferProject(project.id, email); toast.success("Project transferred"); onOpenChange(false); onTransferred(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  }

  const host = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>GitHub, domain & selling</DialogTitle>
          <DialogDescription>Works for every project — including imported copies, which are fully yours.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="github">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="github"><Github className="mr-1 h-4 w-4" />GitHub</TabsTrigger>
            <TabsTrigger value="domain"><Globe className="mr-1 h-4 w-4" />Domain</TabsTrigger>
            <TabsTrigger value="app"><Smartphone className="mr-1 h-4 w-4" />App</TabsTrigger>
            <TabsTrigger value="sell"><Tag className="mr-1 h-4 w-4" />Sell</TabsTrigger>
          </TabsList>

          <TabsContent value="github" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="gh-token">GitHub access token</Label>
              <Input id="gh-token" type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="ghp_… or github_pat_…" />
              <p className="text-xs text-muted-foreground">Create one at <a className="text-glow underline" href="https://github.com/settings/tokens/new?scopes=repo&description=Nexora%20AI" target="_blank" rel="noreferrer">GitHub → Tokens</a> with “repo” access. It stays only on this device.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gh-repo">Repository name</Label>
              <Input id="gh-repo" value={repo} onChange={(e) => setRepo(e.target.value)} />
            </div>
            <Button className="w-full bg-brand" disabled={busy || !token.trim() || !repo.trim()} onClick={push}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />} Push to GitHub
            </Button>
            {step && <p className="text-xs text-muted-foreground">{step}</p>}
            {result && (
              <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-xs">
                <p>Repository: <a className="text-glow underline" href={result.url} target="_blank" rel="noreferrer">{result.url}</a></p>
                <p>Free website: turn on <b>Settings → Pages → Deploy from branch</b> in the repository, then open <a className="text-glow underline" href={result.pagesUrl} target="_blank" rel="noreferrer">{result.pagesUrl}</a></p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="domain" className="space-y-3 pt-3 text-sm">
            <div className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Free domains</p>
              <p className="mt-1"><b>GitHub Pages:</b> push to GitHub (first tab) → free address <code>username.github.io/{repo}</code>.</p>
              <p className="mt-1"><b>Netlify:</b> download the ZIP and drop it on <a className="text-glow underline" href="https://app.netlify.com/drop" target="_blank" rel="noreferrer">Netlify Drop</a> → free <code>name.netlify.app</code>.</p>
              <p className="mt-1"><b>Vercel:</b> import your GitHub repository at <a className="text-glow underline" href="https://vercel.com/new" target="_blank" rel="noreferrer">vercel.com/new</a> → free <code>name.vercel.app</code>.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="domain">Your own domain</Label>
              <Input id="domain" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="www.mygame.com" />
            </div>
            {host && (
              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Steps for {host}</p>
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  <li>Push to GitHub or upload to Netlify/Vercel (above).</li>
                  <li>In that host’s settings add the custom domain <code>{host}</code>.</li>
                  <li>At your domain seller add a <b>CNAME</b> record: name <code>www</code> → value <code>username.github.io</code> (or the address Netlify/Vercel shows).</li>
                  <li>Wait up to a few hours — free HTTPS turns on automatically.</li>
                </ol>
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => { onSaved({ custom_domain: host }); toast.success("Domain saved"); }}>Save domain</Button>
          </TabsContent>

          <TabsContent value="app" className="space-y-3 pt-3 text-xs text-muted-foreground">
            <div className="rounded-lg border border-border p-3">
              <p className="font-medium text-foreground">Google Play Store</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>Publish this project, or put it on your own domain (Domain tab).</li>
                <li>Open <a className="text-glow underline" href="https://www.pwabuilder.com" target="_blank" rel="noreferrer">PWABuilder</a>, paste your public link and choose <b>Android</b> → download the package.</li>
                <li>Create a Google Play developer account (one-time $25) and upload the package.</li>
              </ol>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="font-medium text-foreground">Uptodown and other stores</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>Make the Android package with PWABuilder (above) and get the APK file.</li>
                <li>Sign up at <a className="text-glow underline" href="https://developers.uptodown.com" target="_blank" rel="noreferrer">Uptodown for developers</a> (free) and upload the APK.</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="sell" className="space-y-4 pt-3">
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">“Buy this project” button</p>
              <p className="text-xs text-muted-foreground">Shown on your public link when the project is published.</p>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="WhatsApp number, email or link" />
              <Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (e.g. $49 or Rs 5000)" />
              <Button variant="outline" className="w-full" onClick={() => { onSaved({ sale_contact: contact.trim(), sale_price: price.trim() }); toast.success(contact.trim() ? "Buy button is on" : "Buy button removed"); }}>Save</Button>
            </div>
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Client handover kit</p>
              <p className="text-xs text-muted-foreground">ZIP with all files plus a commercial license and setup guide for the buyer.</p>
              <Button variant="outline" className="w-full" onClick={kit}><PackageCheck className="h-4 w-4" />Download kit</Button>
            </div>
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Transfer to buyer</p>
              <p className="text-xs text-muted-foreground">Moves this project into the buyer’s Nexora account. It leaves yours — make a copy first if you want to keep one.</p>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="buyer@email.com" />
              <Button variant="destructive" className="w-full" disabled={busy || !email.includes("@")} onClick={transfer}><Send className="h-4 w-4" />Transfer project</Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
