import { supabase } from "@/integrations/supabase/client";
import type { ChatMsg } from "./projects";
import type { FileMap } from "./files";
import { isAssetRef } from "./assets";

export async function streamGenerate(
  messages: ChatMsg[],
  files: FileMap,
  onText: (full: string) => void,
  signal?: AbortSignal,
  images: string[] = [],
): Promise<{ text: string; error?: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { text: "", error: "Please sign in to use the AI builder." };
  // Uploaded images live in the project as data URLs; the AI only needs to know their paths.
  const slimFiles: FileMap = Object.fromEntries(
    Object.entries(files).map(([p, c]) => [p, c.startsWith("data:") || isAssetRef(c) ? "data:" : c]),
  );
  let res: Response;
  try {
    res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages: messages.filter((m) => !m.error).map(({ role, content }) => ({ role, content })), files: slimFiles, images }),
      signal: signal ?? null,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") return { text: "", error: "Stopped." };
    return { text: "", error: "Couldn't reach the AI service. Check your connection." };
  }
  if (!res.ok || !res.body) {
    const j = await res.json().catch(() => ({}));
    return { text: "", error: (j as { error?: string }).error ?? `Request failed (${res.status}).` };
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      text += dec.decode(value, { stream: true });
      const errIdx = text.indexOf("[[NEXORA_ERROR]]");
      if (errIdx >= 0) return { text: text.slice(0, errIdx), error: text.slice(errIdx + 16).trim() };
      onText(text);
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return { text, error: "Stopped." };
    return { text, error: "The connection dropped during generation." };
  }
  return { text };
}
