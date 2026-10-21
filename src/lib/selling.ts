import { supabase } from "@/integrations/supabase/client";
import type { FileMap } from "./files";

/** Files added to a client handover / sale package. Never overwrites the creator's own files. */
export function handoverKit(files: FileMap, name: string, owner: string): FileMap {
  const year = new Date().getFullYear();
  const extra: FileMap = {};
  if (!files["LICENSE.txt"] && !files["LICENSE"]) {
    extra["LICENSE.txt"] = `Commercial License\n\nCopyright (c) ${year} ${owner}\n\nThe buyer of "${name}" may use, modify and deploy this project for personal and commercial purposes, including client work. Reselling the unmodified source code as a template is not permitted without the copyright holder's permission.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.\n`;
  }
  if (!files["HANDOVER.md"]) {
    extra["HANDOVER.md"] = `# ${name}\n\nThank you for your purchase.\n\n## Run it\nOpen \`index.html\` in a browser — no installation needed.\n\n## Put it online for free\n- **Netlify:** drag this folder onto https://app.netlify.com/drop\n- **GitHub Pages:** upload the files to a repository, then Settings → Pages → Deploy from branch.\n- **Vercel:** https://vercel.com/new → import the repository.\n\n## Use your own domain\nIn your hosting dashboard add the domain, then at your domain registrar create a CNAME record pointing \`www\` to the address your host shows.\n\nBuilt with Nexora AI.\n`;
  }
  return { ...files, ...extra };
}

export async function transferProject(id: string, email: string) {
  const { error } = await supabase.rpc("transfer_project", { _id: id, _email: email });
  if (error) throw new Error(error.message);
}

/** Pushes every file to a GitHub repository (created if missing) in one commit, using the user's own token. */
export async function pushToGithub(token: string, repoName: string, files: FileMap, onStep?: (s: string) => void) {
  const api = async (path: string, init: RequestInit = {}) => {
    const r = await fetch(`https://api.github.com${path}`, {
      ...init,
      headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    });
    const body = r.status === 204 ? null : await r.json().catch(() => null);
    if (!r.ok) throw Object.assign(new Error(body?.message || `GitHub error ${r.status}`), { status: r.status });
    return body;
  };
  onStep?.("Checking your GitHub account…");
  const me = await api("/user");
  const owner = me.login as string;
  const repo = repoName.trim().replace(/[^A-Za-z0-9._-]+/g, "-") || "nexora-project";
  let info: { default_branch: string } | null = null;
  try { info = await api(`/repos/${owner}/${repo}`); } catch (e) { if ((e as { status?: number }).status !== 404) throw e; }
  if (!info) {
    onStep?.("Creating repository…");
    info = await api("/user/repos", { method: "POST", body: JSON.stringify({ name: repo, auto_init: true, private: false }) });
    await new Promise((r) => setTimeout(r, 1500));
  }
  const branch = info!.default_branch || "main";
  const ref = await api(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
  const parent = ref.object.sha as string;
  const entries = Object.entries(files);
  const tree = [];
  let n = 0;
  for (const [path, content] of entries) {
    onStep?.(`Uploading files ${++n}/${entries.length}`);
    const b64 = /^data:[^;]+;base64,(.*)$/s.exec(content);
    const payload = b64 ? { content: b64[1], encoding: "base64" } : { content, encoding: "utf-8" };
    const blob = await api(`/repos/${owner}/${repo}/git/blobs`, { method: "POST", body: JSON.stringify(payload) });
    tree.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  }
  onStep?.("Saving commit…");
  const t = await api(`/repos/${owner}/${repo}/git/trees`, { method: "POST", body: JSON.stringify({ tree }) });
  const c = await api(`/repos/${owner}/${repo}/git/commits`, { method: "POST", body: JSON.stringify({ message: "Update from Nexora AI", tree: t.sha, parents: [parent] }) });
  await api(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: c.sha, force: true }) });
  return { url: `https://github.com/${owner}/${repo}`, pagesUrl: `https://${owner}.github.io/${repo}/` };
}
