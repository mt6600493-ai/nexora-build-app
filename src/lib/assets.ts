import { supabase } from "@/integrations/supabase/client";
import type { FileMap } from "./files";
import { hasAlpha } from "./attachments";

// Images live in their own table so project saves stay small; the file map keeps a short reference.
export const ASSET_PREFIX = "nexora-asset:";
export type AssetMap = Record<string, string>;

export const isAssetRef = (v: string) => v.startsWith(ASSET_PREFIX);
export const isInlineImage = (v: string) => /^data:image\//.test(v);
export const assetId = (v: string) => v.slice(ASSET_PREFIX.length);

/** Replace asset references with the real image data (for preview, export and GitHub push). */
export function resolveAssets(files: FileMap, assets: AssetMap): FileMap {
  const out: FileMap = {};
  for (const [p, v] of Object.entries(files)) out[p] = isAssetRef(v) ? assets[assetId(v)] ?? v : v;
  return out;
}

export function hasInlineImages(files: FileMap) {
  return Object.values(files).some(isInlineImage);
}

export async function loadAssets(files: FileMap): Promise<AssetMap> {
  const ids = [...new Set(Object.values(files).filter(isAssetRef).map(assetId))];
  const out: AssetMap = {};
  for (let i = 0; i < ids.length; i += 20) {
    const { data, error } = await supabase.from("project_assets").select("id,data").in("id", ids.slice(i, i + 20));
    if (error) throw error;
    for (const r of data ?? []) out[r.id] = r.data;
  }
  return out;
}

/** Shrink oversized images (old uploads were saved full size) before storing them. */
async function shrink(dataUrl: string): Promise<string> {
  if (dataUrl.length < 400_000 || typeof document === "undefined") return dataUrl;
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = dataUrl; });
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const out = hasAlpha(ctx, c.width, c.height) ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.85);
    return out.length < dataUrl.length ? out : dataUrl;
  } catch { return dataUrl; }
}

/** Move inline images out of the file map into cloud asset storage. Images that fail stay inline. */
export async function externalizeAssets(files: FileMap, projectId: string, userId: string): Promise<{ files: FileMap; assets: AssetMap }> {
  const out: FileMap = { ...files };
  const assets: AssetMap = {};
  for (const [p, v] of Object.entries(files)) {
    if (!isInlineImage(v)) continue;
    const data = await shrink(v);
    const { data: row, error } = await supabase.from("project_assets").insert({ project_id: projectId, user_id: userId, path: p, data }).select("id").single();
    if (error || !row) continue;
    out[p] = ASSET_PREFIX + row.id;
    assets[row.id] = data;
  }
  return { files: out, assets };
}
