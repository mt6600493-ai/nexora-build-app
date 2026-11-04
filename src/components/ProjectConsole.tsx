import { useState } from "react";
import { ArrowLeft, BarChart3, Bot, CreditCard, Database, FileCode, Gauge, Github, Globe, History, Image as ImageIcon, Infinity as InfinityIcon, Mail, PenLine, Plug, Rocket, Search, Settings, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isAssetRef, isInlineImage } from "@/lib/assets";
import type { FileMap } from "@/lib/files";
import type { Project } from "@/lib/projects";

export type ConsoleAction = "settings" | "history" | "publish" | "export" | "github";

const kb = (n: number) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

const MODULES = [
  { id: "draft", label: "Draft", icon: PenLine },
  { id: "files", label: "Files & Code", icon: FileCode },
  { id: "publish", label: "Share & Publish", icon: Rocket },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "database", label: "Database", icon: Database },
  { id: "users", label: "Users", icon: Users },
  { id: "storage", label: "Storage", icon: ImageIcon },
  { id: "ai", label: "AI & Agents", icon: Bot },
  { id: "integrations", label: "Integrations", icon: Github },
  { id: "payments", label: "Payments", icon: CreditCard },
  { id: "email", label: "Email", icon: Mail },
  { id: "domains", label: "Domains", icon: Globe },
  { id: "connectors", label: "Connectors", icon: Plug },
  { id: "security", label: "Security", icon: Shield },
  { id: "seo", label: "SEO & AI Search", icon: Search },
  { id: "usage", label: "Usage", icon: Gauge },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "history", label: "History", icon: History },
  { id: "fair", label: "Free & Unlimited", icon: InfinityIcon },
] as const;
type ModuleId = (typeof MODULES)[number]["id"];

const meta = (html: string, re: RegExp) => html.match(re)?.[1]?.trim() || "";

export function ProjectConsole({ project, files, url, hasUnpublished, go }: {
  project: Project; files: FileMap; url: string; hasUnpublished: boolean; go: (a: ConsoleAction) => void;
}) {
  const [active, setActive] = useState<ModuleId | null>(null);
  const entries = Object.entries(files);
  const images = entries.filter(([, v]) => isAssetRef(v) || isInlineImage(v));
  const code = entries.filter(([, v]) => !(isAssetRef(v) || isInlineImage(v)));
  const codeSize = code.reduce((n, [, v]) => n + v.length, 0);
  const all = code.map(([, v]) => v).join("\n");
  const html = files["index.html"] ?? "";
  const live = project.visibility === "public";
  const uses = (re: RegExp) => re.test(all);

  if (!active) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {MODULES.map((m) => (
          <button key={m.id} onClick={() => setActive(m.id)}
            className="mirror-card flex flex-col items-center gap-1.5 rounded-xl border border-border p-3 text-center text-xs transition active:scale-95 hover:border-glow">
            <m.icon className="h-5 w-5 text-glow" />{m.label}
          </button>
        ))}
      </div>
    );
  }

  const mod = MODULES.find((m) => m.id === active)!;
  const Info = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;
  const List = ({ items }: { items: [string, string][] }) => (
    <div className="space-y-1.5 rounded-xl border border-border p-3 text-sm">
      {items.map(([k, v]) => <div key={k} className="flex justify-between gap-3"><span className="text-muted-foreground">{k}</span><span className="min-w-0 truncate text-right">{v}</span></div>)}
    </div>
  );
  const Act = ({ a, children }: { a: ConsoleAction; children: React.ReactNode }) => <Button className="w-full bg-brand" onClick={() => go(a)}>{children}</Button>;

  const body: Record<ModuleId, React.ReactNode> = {
    draft: <><List items={[["Status", hasUnpublished ? "Draft has new changes" : live ? "Draft matches live" : "Draft only"], ["Last saved", new Date(project.updated_at).toLocaleString()]]} /><Act a="publish">Publish draft</Act></>,
    files: <><List items={code.slice(0, 30).map(([p, v]) => [p, kb(v.length)])} /><Act a="export">Download all files (ZIP)</Act></>,
    publish: <>{live ? <List items={[["Live link", url.replace(/^https?:\/\//, "")]]} /> : <Info>This project is not live yet.</Info>}
      {live && <img alt="QR code for the live link" className="mx-auto h-36 w-36 rounded-lg bg-card p-2" src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`} />}
      <Act a="publish">{live ? "Publish settings" : "Publish now"}</Act></>,
    analytics: <><List items={[["Status", live ? "Live" : "Not published"], ["Pages", String(code.filter(([p]) => p.endsWith(".html")).length)], ["Published", project.published_at ? new Date(project.published_at).toLocaleDateString() : "—"]]} />
      <Info>Visitor counting for your published apps is not switched on yet. Ask the AI in chat to "add a visitor counter" if you want one inside your app.</Info></>,
    database: <><List items={[["Saves data in browser", uses(/localStorage|indexedDB/) ? "Yes" : "No"], ["Storage type", "Each visitor's own device"]]} /><Info>Ask the AI to "save high scores" or "save form entries" and it will add data saving to your app.</Info></>,
    users: <><List items={[["Login in app", uses(/login|sign ?in|password/i) ? "Has a login screen" : "No login"]]} /><Info>Ask the AI to "add a login screen" to let your app's visitors create accounts.</Info></>,
    storage: <>{images.length ? <List items={images.map(([p]) => [p, "image"])} /> : <Info>No images uploaded yet. Use the + button in chat to add pictures.</Info>}</>,
    ai: <><List items={[["Builder AI", "Gemini → Groq → backup"], ["Prompt limit", "100,000 / hour"], ["Uses AI inside app", uses(/openai|gemini|groq|generativelanguage/i) ? "Yes" : "No"]]} /><Info>Use "Fix with AI" in the preview to let the AI find and fix bugs automatically.</Info></>,
    integrations: <><Info>Push code to GitHub, download a ZIP, or hand the project over to someone.</Info><Act a="github">Open GitHub & export</Act><Button variant="outline" className="w-full" onClick={() => go("export")}>Download ZIP</Button></>,
    payments: <><List items={[["Payment button", uses(/stripe|paypal|checkout|payment/i) ? "Found in app" : "Not added"]]} /><Info>Ask the AI to "add a Buy button with my payment link" and paste your Stripe, PayPal or other payment link.</Info></>,
    email: <><List items={[["Contact form", uses(/mailto:|<form/i) ? "Found in app" : "Not added"]]} /><Info>Ask the AI to "add a contact form that emails me" with your email address.</Info></>,
    domains: <><List items={[["Custom domain", project.custom_domain || "Not connected"]]} /><Info>Buy a domain (like nova.com) from any seller, then follow the step-by-step guide.</Info><Act a="github">Connect my domain</Act></>,
    connectors: <><List items={[["Outside services", uses(/fetch\(|XMLHttpRequest|webhook/i) ? "App calls outside services" : "None"]]} /><Info>Ask the AI to "send form data to my Discord/Telegram webhook" or connect any public API.</Info></>,
    security: <List items={[["HTTPS lock", "On"], ["Private chat & code", "Only you"], ["Public page shows", "App files only"], ["Visibility", live ? "Public" : "Private"]]} />,
    seo: <><List items={[["Page title", meta(html, /<title>([^<]*)<\/title>/i) || "Missing"], ["Description", meta(html, /name=["']description["'][^>]*content=["']([^"']*)/i) || "Missing"], ["Share image", /og:image/i.test(html) ? "Set" : "Missing"], ["Sitemap", live ? "Included" : "After publish"]]} />
      <Info>Ask the AI to "improve SEO: add title, description and share image" to fill anything missing.</Info></>,
    usage: <List items={[["Code files", String(code.length)], ["Images", String(images.length)], ["Code size", kb(codeSize)], ["Hosting", "Free"]]} />,
    settings: <Act a="settings">Open project settings</Act>,
    history: <><Info>Every AI change saves a snapshot. Restore any older version in one click.</Info><Act a="history">Open version history</Act></>,
    fair: <List items={[["Credits", "None — free"], ["Per hour", "100,000 prompts"], ["Per minute", "2,000 prompts"], ["Hosting", "Free"]]} />,
  };

  return (
    <div className="space-y-3">
      <button onClick={() => setActive(null)} className="flex items-center gap-1 text-sm text-glow"><ArrowLeft className="h-4 w-4" />All tools</button>
      <h3 className="flex items-center gap-2 font-semibold"><mod.icon className="h-5 w-5 text-glow" />{mod.label}</h3>
      {body[active]}
    </div>
  );
}

