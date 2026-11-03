import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { publicSlug } from "@/lib/slug";

const SITE = "https://create-ai-zone.lovable.app";
const STATIC = ["/", "/free-ai-game-maker"];

// Lists Nexora's own pages plus every published project so Google can find them.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient(process.env["SUPABASE_URL"]!, key, {
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
        const { data } = await sb.rpc("list_published_projects");
        const rows = (data ?? []) as { id: string; name?: string; updated_at: string }[];
        const urls = [
          ...STATIC.map((p) => `<url><loc>${SITE}${p}</loc></url>`),
          ...rows.map((r) => `<url><loc>${SITE}/p/${publicSlug(r.name ?? "", r.id)}</loc><lastmod>${new Date(r.updated_at).toISOString().slice(0, 10)}</lastmod></url>`),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
        return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
      },
    },
  },
});
