/** Public link segment: readable app name followed by the project id, e.g. "nova-ai-<uuid>". */
export function publicSlug(name: string, id: string) {
  const s = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return s ? `${s}-${id}` : id;
}

/** Extracts the project id from a public link segment (works for old id-only links too). */
export function idFromSlug(slug: string) {
  const m = slug.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return m ? m[1] : null;
}
