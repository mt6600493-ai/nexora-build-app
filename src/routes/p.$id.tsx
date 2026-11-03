import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { buildPreview } from "@/lib/files";
import { getPublishedProject } from "@/lib/published.functions";
import { idFromSlug } from "@/lib/slug";

export const Route = createFileRoute("/p/$id")({
  loader: async ({ params }) => {
    const id = idFromSlug(params.id);
    if (!id) throw notFound();
    const project = await getPublishedProject({ data: { id } });
    if (!project) throw notFound();
    return { project };
  },
  head: ({ loaderData, params }) => {
    const name = loaderData?.project.name ?? "Published project";
    const desc = (loaderData?.project.description || name).slice(0, 160);
    return {
      meta: [
        { title: name },
        { name: "description", content: desc },
        { property: "og:title", content: name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `https://create-ai-zone.lovable.app/p/${params.id}` },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: name },
        { name: "twitter:description", content: desc },
        { name: "robots", content: "index, follow" },
      ],
      links: [{ rel: "canonical", href: `https://create-ai-zone.lovable.app/p/${params.id}` }],
    };
  },
  notFoundComponent: () => (
    <div className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <LogoMark className="mx-auto h-12 w-12" />
        <h1 className="mt-4 text-xl font-semibold">This project isn't published</h1>
        <p className="mt-2 text-sm text-muted-foreground">The link may be wrong, or the owner has unpublished it.</p>
        <Link to="/" className="mt-6 inline-block text-glow underline">Go home</Link>
      </div>
    </div>
  ),
  component: PublishedPage,
});

function PublishedPage() {
  const { project } = Route.useLoaderData();
  const [page, setPage] = useState("index.html");
  const srcDoc = useMemo(() => buildPreview(project.files, page), [project.files, page]);

  useEffect(() => {
    const h = (e: MessageEvent) => {
      if (e.data?.type === "nexora-nav") setPage(String(e.data.href).replace(/^\.?\//, "").split("?")[0] || "index.html");
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, []);

  if (!srcDoc) return (
    <div className="grid min-h-screen place-items-center px-6 text-center text-sm text-muted-foreground">
      This project has no web page to show yet.
    </div>
  );

  return (
    <div className="fixed inset-0 bg-background">
      <h1 className="sr-only">{project.name}</h1>
      {project.description && <p className="sr-only">{project.description}</p>}
      <iframe title={project.name} srcDoc={srcDoc} className="h-full w-full border-0"
        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-pointer-lock" allow="fullscreen; autoplay; gamepad" />
      {project.sale_contact && (
        <a href={buyHref(project.sale_contact, project.name)} target="_blank" rel="noreferrer"
          className="fixed bottom-3 left-3 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg">
          Buy this project{project.sale_price ? ` · ${project.sale_price}` : ""}
        </a>
      )}
    </div>
  );
}

function buyHref(c: string, name: string) {
  const msg = encodeURIComponent(`Hi, I'd like to buy "${name}".`);
  if (/^https?:\/\//.test(c)) return c;
  if (c.includes("@")) return `mailto:${c}?subject=${msg}`;
  return `https://wa.me/${c.replace(/\D/g, "")}?text=${msg}`;
}
