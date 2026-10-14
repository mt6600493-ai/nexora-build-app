import { supabase } from "@/integrations/supabase/client";
import type { FileMap } from "./files";

export type ChatMsg = { role: "user" | "assistant"; content: string; error?: boolean };
export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  framework: string;
  visibility: string;
  source: string;
  files: FileMap;
  messages: ChatMsg[];
  created_at: string;
  updated_at: string;
};

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase.from("projects").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Project[];
}

export async function getProject(id: string): Promise<Project> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).single();
  if (error) throw error;
  return data as unknown as Project;
}

export async function createProject(p: Partial<Project> & { user_id: string }) {
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: p.user_id,
      name: p.name ?? "Untitled project",
      description: p.description ?? "",
      framework: p.framework ?? "html",
      source: p.source ?? "ai",
      files: (p.files ?? {}) as never,
      messages: (p.messages ?? []) as never,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function updateProject(id: string, patch: Partial<Project>) {
  const { error } = await supabase
    .from("projects")
    .update({ ...(patch as Record<string, unknown>), updated_at: new Date().toISOString() } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}

export function nameFromPrompt(prompt: string) {
  const words = prompt.replace(/[^\w\s-]/g, "").split(/\s+/).filter(Boolean).slice(0, 5).join(" ");
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Untitled project";
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86400)} days ago`;
}
