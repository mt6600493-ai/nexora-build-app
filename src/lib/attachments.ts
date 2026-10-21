import { isTextPath, type FileMap } from "./files";

export type Attachment = { name: string; path: string; kind: "image" | "file"; content: string };

const MAX_TEXT = 300_000;
const MAX_IMAGE_SIDE = 1280;

export const slugName = (n: string) =>
  n.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "") || "file";

/** Shrink an image so it stays small enough to save in the project and send to the AI. */
async function imageToDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("That image couldn't be opened.")); i.src = url;
    });
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return file.type === "image/png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85);
  } finally { URL.revokeObjectURL(url); }
}

export async function readAttachment(file: File): Promise<Attachment> {
  if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
    const content = await imageToDataUrl(file);
    const ext = content.startsWith("data:image/png") ? "png" : "jpg";
    const base = slugName(file.name).replace(/\.[a-z0-9]+$/, "");
    return { name: file.name, path: `assets/${base}.${ext}`, kind: "image", content };
  }
  if (!isTextPath(file.name)) throw new Error(`${file.name}: only images and text/code files (html, css, js, json, txt, csv, md…) can be added.`);
  if (file.size > MAX_TEXT) throw new Error(`${file.name} is too large (max 300 KB).`);
  return { name: file.name, path: slugName(file.name), kind: "file", content: await file.text() };
}

/** Add attachments to the project files, renaming on clashes. Returns the new map and the final paths. */
export function addAttachments(files: FileMap, list: Attachment[]): { files: FileMap; paths: string[] } {
  const next = { ...files };
  const paths: string[] = [];
  for (const a of list) {
    let p = a.path;
    for (let i = 2; next[p] != null && next[p] !== a.content; i++) p = a.path.replace(/(\.[^.]+)?$/, `-${i}$1`);
    next[p] = a.content;
    paths.push(p);
  }
  return { files: next, paths };
}

export function describeAttachments(list: Attachment[], paths: string[]) {
  if (!list.length) return "";
  return `\n\n📎 Attached: ${list.map((a, i) => `${paths[i]} (${a.kind === "image" ? "image" : "file"})`).join(", ")}`;
}
