import JSZip from "jszip";

export type FileMap = Record<string, string>;

/** Parse AI output of the form <file path="...">...</file>. Partial final file is included while streaming. */
export function parseGenerated(text: string): { files: FileMap; summary: string } {
  const files: FileMap = {};
  const re = /<file path="([^"]+)">\n?([\s\S]*?)(<\/file>|$)/g;
  let m: RegExpExecArray | null;
  let firstIdx = -1;
  while ((m = re.exec(text))) {
    if (firstIdx < 0) firstIdx = m.index;
    files[m[1]!.replace(/^\.?\//, "")] = m[2]!.replace(/\n$/, "");
  }
  const tail = text.replace(/<file path="[^"]+">[\s\S]*?(<\/file>|$)/g, "").trim();
  return { files, summary: tail };
}

const TEXT_EXT = /\.(html?|css|scss|js|jsx|mjs|cjs|ts|tsx|json|md|txt|svg|xml|ya?ml|toml|env|gitignore|vue|svelte|astro|py|rb|go|rs|java|php|sh|lock|prettierrc|eslintrc|editorconfig|npmrc|example)$/i;
export const isTextPath = (p: string) => TEXT_EXT.test(p) || !p.split("/").pop()!.includes(".");
const SKIP = /(^|\/)(node_modules|\.git|dist|build|\.next|\.vercel|\.netlify|\.turbo|coverage)\//;
export const shouldSkip = (p: string) => SKIP.test(p) || /\.lock$|lock\.json$|bun\.lockb?$/.test(p);
const MAX_FILES = 300;
const MAX_SIZE = 300_000;

/** Turn index.html + linked local css/js into a self-contained srcdoc. */
export function buildPreview(files: FileMap, page = "index.html"): string | null {
  const htmlPath = files[page] != null ? page : Object.keys(files).find((p) => p.endsWith("index.html")) ?? Object.keys(files).find((p) => p.endsWith(".html"));
  if (!htmlPath) return null;
  const base = htmlPath.includes("/") ? htmlPath.slice(0, htmlPath.lastIndexOf("/") + 1) : "";
  const resolve = (href: string) => {
    const clean = href.replace(/^\.\//, "").split("?")[0] ?? "";
    if (/^(https?:)?\/\//.test(clean) || clean.startsWith("data:")) return null;
    const p = clean.startsWith("/") ? clean.slice(1) : base + clean;
    return files[p] != null ? p : files[clean.replace(/^\//, "")] != null ? clean.replace(/^\//, "") : null;
  };
  let html = files[htmlPath]!;
  html = html.replace(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/gi, (tag, href) => {
    if (!/stylesheet/i.test(tag)) return tag;
    const p = resolve(href);
    return p ? `<style data-src="${p}">\n${files[p]}\n</style>` : tag;
  });
  html = html.replace(/<script\b([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi, (tag, a, src, b) => {
    const p = resolve(src);
    if (!p) return tag;
    const attrs = `${a} ${b}`.replace(/\s+/g, " ").trim();
    return `<script ${attrs} data-src="${p}">\n${files[p]!.replace(/<\/script>/gi, "<\\/script>")}\n</script>`;
  });
  // Intercept internal links between html pages so navigation stays inside the preview.
  const nav = `<script>document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(!h||h.startsWith('#')||/^(https?:|mailto:|tel:)/.test(h))return;if(/\\.html?$/.test(h.split('?')[0])){e.preventDefault();parent.postMessage({type:'nexora-nav',href:h},'*');}});window.onerror=function(m,s,l){parent.postMessage({type:'nexora-error',message:String(m)+' (line '+l+')'},'*');};</script>`;
  return html.includes("<head>") ? html.replace("<head>", `<head>${nav}`) : nav + html;
}

export function detectFramework(files: FileMap): string {
  const pkg = files["package.json"];
  if (pkg) {
    if (/"next"/.test(pkg)) return "nextjs";
    if (/"vue"/.test(pkg)) return "vue";
    if (/"svelte"/.test(pkg)) return "svelte";
    if (/"react"/.test(pkg)) return "react";
    return "node";
  }
  return "html";
}

export async function filesFromZip(file: Blob): Promise<FileMap> {
  const zip = await JSZip.loadAsync(file);
  const out: FileMap = {};
  const entries = Object.values(zip.files).filter((f) => !f.dir);
  // Strip common top-level folder (e.g. repo-main/)
  const names = entries.map((e) => e.name);
  const first = names[0]?.split("/")[0];
  const common = first && names.every((n) => n.startsWith(first + "/")) ? first + "/" : "";
  for (const e of entries) {
    const path = e.name.slice(common.length);
    if (!path || shouldSkip(path) || !isTextPath(path)) continue;
    if (Object.keys(out).length >= MAX_FILES) break;
    const content = await e.async("string");
    if (content.length > MAX_SIZE) continue;
    out[path] = content;
  }
  return out;
}

export async function filesToZip(files: FileMap, name: string) {
  const zip = new JSZip();
  for (const [p, c] of Object.entries(files)) zip.file(`${name}/${p}`, c);
  return zip.generateAsync({ type: "blob" });
}

export function parseGithubUrl(url: string): { owner: string; repo: string; branch?: string } | null {
  const m = url.trim().match(/github\.com[/:]([^/]+)\/([^/#?]+?)(?:\.git)?(?:\/tree\/([^/?#]+))?\/?(?:[?#].*)?$/i)
    ?? url.trim().match(/^([\w.-]+)\/([\w.-]+)$/);
  if (!m) return null;
  return { owner: m[1]!, repo: m[2]!, ...(m[3] ? { branch: m[3] } : {}) };
}

/** Import a public GitHub repository using the public GitHub API (no token needed for public repos). */
export async function filesFromGithub(url: string, onProgress?: (n: number, total: number) => void): Promise<FileMap> {
  const parsed = parseGithubUrl(url);
  if (!parsed) throw new Error("That doesn't look like a GitHub repository link.");
  const { owner, repo } = parsed;
  let branch = parsed.branch;
  if (!branch) {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (r.status === 404) throw new Error("Repository not found. Make sure it's public.");
    if (!r.ok) throw new Error(`GitHub responded with ${r.status}. Try again in a minute.`);
    branch = (await r.json()).default_branch as string;
  }
  const t = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!t.ok) throw new Error(`Couldn't read the repository files (GitHub ${t.status}).`);
  const tree = (await t.json()).tree as { path: string; type: string; size?: number }[];
  const blobs = tree
    .filter((n) => n.type === "blob" && !shouldSkip(n.path) && isTextPath(n.path) && (n.size ?? 0) < MAX_SIZE)
    .slice(0, MAX_FILES);
  const out: FileMap = {};
  let done = 0;
  const queue = [...blobs];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (queue.length) {
        const n = queue.shift()!;
        const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${n.path}`);
        if (res.ok) out[n.path] = await res.text();
        onProgress?.(++done, blobs.length);
      }
    }),
  );
  return out;
}

export function languageOf(path: string) {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext ?? "txt";
}
