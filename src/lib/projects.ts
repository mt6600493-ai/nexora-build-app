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

export type Version = { id: string; label: string; files: FileMap; created_at: string };

/** Snapshot the current files so the user can roll back later. Keeps the latest 30 per project. */
export async function createVersion(projectId: string, userId: string, files: FileMap, label: string) {
  if (Object.keys(files).length === 0) return;
  const { error } = await supabase.from("project_versions").insert({ project_id: projectId, user_id: userId, files: files as never, label: label.slice(0, 120) });
  if (error) throw error;
  const { data } = await supabase.from("project_versions").select("id").eq("project_id", projectId).order("created_at", { ascending: false }).range(30, 200);
  if (data?.length) await supabase.from("project_versions").delete().in("id", data.map((d) => d.id));
}

export async function listVersions(projectId: string): Promise<Version[]> {
  const { data, error } = await supabase.from("project_versions").select("id,label,files,created_at").eq("project_id", projectId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Version[];
}

export async function duplicateProject(p: Project, userId: string) {
  return createProject({
    user_id: userId, name: `${p.name} (copy)`, description: p.description, framework: p.framework, source: p.source,
    files: p.files, messages: [{ role: "assistant", content: `This is a copy of “${p.name}”. Changes here don't affect the original.` }],
  });
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
