import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export type PublishedProject = { name: string; description: string; files: Record<string, string>; updated_at: string };

/** Public read of a project the owner has published. Only returns name, description and files. */
export const getPublishedProject = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<PublishedProject | null> => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows, error } = await sb.rpc("get_published_project", { _id: data.id });
    if (error) throw new Error(error.message);
    const row = (rows as unknown as PublishedProject[] | null)?.[0];
    return row ?? null;
  });
