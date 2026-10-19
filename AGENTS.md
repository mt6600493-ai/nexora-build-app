<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Nexora AI architecture
- Generated projects are stored as a path→content JSON map on `public.projects` (RLS per user); the instant preview inlines local CSS/JS into an iframe srcdoc, so AI output targets static HTML/CSS/JS with no build step.
- AI generation streams from the `/api/generate` server route, which checks the caller's bearer token itself and returns plain text with `<file path>` blocks parsed on the client; this keeps one simple format for streaming, parsing and saving.
- GitHub and ZIP imports run in the browser against public endpoints, so no secrets are needed; Lovable, Vercel and Netlify imports go through their GitHub repo or a ZIP.
- No credit system: abuse protection is a per-user rate limit in the generate route.
- Version history lives in `public.project_versions` (snapshot before each AI change and restore, last 30 kept); snapshots are written client-side under RLS so no server code is needed.
- Publishing sets `projects.visibility = 'public'`; the public `/p/$id` page reads only name/description/files through the security-definer `get_published_project` function, so private columns like chat messages never leave the owner's account.
- App icons are generated from `public/favicon.svg` and listed in `public/manifest.webmanifest` (manifest only, no service worker) so installing the app shows the Nexora mark.
