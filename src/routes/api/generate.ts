import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { GEMINI_BASE, GROQ_BASE, LOVABLE_BASE, providerPlan, type ProviderStep } from "@/lib/ai-providers";

const SYSTEM = `You are Nexora AI, an expert web engineer that builds complete, working websites and web apps.

OUTPUT FORMAT (strict):
- Emit every file you create or change as:
<file path="relative/path.ext">
...full file content...
</file>
- Always output COMPLETE file contents, never diffs or placeholders like "...rest unchanged".
- Only output files that changed. To keep a file unchanged, omit it.
- After the files, write a short friendly summary (2-5 bullet points) of what you built or changed. No other prose before the files.

TECH RULES (the live preview runs static files in a browser sandbox, no build step):
- Use plain HTML, CSS and modern JavaScript. Entry file MUST be index.html, linking ./styles.css and ./script.js (or more files) with relative paths.
- If React is genuinely needed, load React 18 + ReactDOM UMD and Babel standalone from unpkg and use <script type="text/babel">.
- Tailwind via CDN (<script src="https://cdn.tailwindcss.com"></script>) is allowed.
- Make features actually work: real state, event handlers, form validation, localStorage persistence where useful.
- Polished, responsive, accessible design with a coherent color palette. Use https://images.unsplash.com or https://picsum.photos for imagery.
- Multiple pages are allowed as separate .html files linked with relative hrefs.
- If the user's project uses another framework (imported code), edit those files faithfully in their framework.
- If asked to "convert to an instant live version", rebuild the same app as a no-build index.html (React 18 UMD + Babel standalone, or plain JS) that keeps the original design and features.

UPLOADED FILES AND IMAGES:
- Files listed as "[uploaded image asset]" are real images in the project. Use them with their exact relative path, e.g. <img src="assets/logo.jpg">. Never output or rewrite those files.
- If the user attaches a screenshot or design image, recreate that layout and style as closely as possible.

GAMES (when the user asks for a game):
- Use a <canvas> with a requestAnimationFrame loop and delta-time movement so it runs smoothly at 60fps. Keep allocations out of the loop.
- Support keyboard AND touch controls (on-screen buttons or swipe) so it works on phones. Call canvas.focus() / listen on window for keys.
- Include a start screen, score, lives/timer, pause, game over and restart. Save the high score in localStorage.
- Sound effects: generate them with the Web Audio API (oscillators), no external audio files.
- 3D games: use Three.js via an import map from https://unpkg.com/three@0.160.0/build/three.module.js (type="module"). Keep scenes light (low-poly shapes, few lights) so they run on phones. Be honest that browser games are smaller than big console/mobile titles.
- Online multiplayer: use PeerJS from https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js. Show "Create room" (generate a short room code, use it as the peer id with a "nexora-" prefix) and "Join room" (enter code). The host runs the game state and sends updates; the guest sends inputs. Also offer a same-device 2-player mode as fallback, and show clear connection status/errors.

LANGUAGE:
- Detect the language of the user's latest message and write your summary in that same language and script (English, Urdu in Urdu script, Roman Urdu in Latin letters, Hindi in Devanagari, Arabic, etc.). Code, file names and code comments stay in English. UI text inside the app should match what the user asks for (default to the user's language if they wrote in it and didn't say otherwise).

ABOUT NEXORA:
- Every change you make is saved automatically and permanently to the user's Nexora AI cloud account, with version history. Never tell the user you cannot save or that their work will be lost.
- Imported projects are the user's own independent copy; you can edit any part of them.`;

// Best-effort fair-use protection (per worker instance). No credits involved.
const hits = new Map<string, number[]>();
function allowed(userId: string) {
  const now = Date.now();
  const arr = (hits.get(userId) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (arr.length >= 1000) return false;
  if (arr.filter((t) => now - t < 60 * 1000).length >= 30) return false;
  arr.push(now);
  hits.set(userId, arr);
  return true;
}

type Body = {
  messages: { role: "user" | "assistant"; content: string }[];
  files: Record<string, string>;
  images?: string[];
};

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } });

const IMG_RE = /^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/;

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json(401, "Please sign in to use the AI builder.");
        const url = process.env["SUPABASE_URL"]!;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const sb = createClient(url, key, { auth: { persistSession: false } });
        const { data: userData, error: authErr } = await sb.auth.getUser(token);
        if (authErr || !userData.user) return json(401, "Your session expired. Please sign in again.");
        if (!allowed(userData.user.id)) return json(429, "You're sending requests very quickly. Please wait a minute and try again.");

        const groqKey = process.env["GROQ_API_KEY"];
        const geminiKey = process.env["GEMINI_API_KEY"];
        const lovableKey = process.env["LOVABLE_API_KEY"];
        if (!groqKey && !geminiKey && !lovableKey) return json(500, "No AI provider is configured on the server.");

        const body = (await request.json()) as Body;
        if (!Array.isArray(body.messages) || body.messages.length === 0) return json(400, "Missing prompt.");

        const images = (Array.isArray(body.images) ? body.images : [])
          .slice(0, 4)
          .map((d) => (typeof d === "string" && d.length < 2_000_000 ? IMG_RE.exec(d) : null))
          .filter((m): m is RegExpExecArray => !!m)
          .map((m) => ({ mediaType: m[1]!, data: m[2]! }));

        // Pages and their own styles/scripts first, so they survive when a large project is trimmed.
        const rank = (p: string) => (/\.html?$/.test(p) ? 0 : /\.(css|js)$/.test(p) && !p.includes("/") ? 1 : /\.(css|js|jsx|ts|tsx|json)$/.test(p) ? 2 : 3);
        const fileEntries = Object.entries(body.files ?? {}).sort((a, b) => rank(a[0]) - rank(b[0]));
        const buildCtx = (limit: number) => {
          let ctx = "";
          let budget = limit;
          for (const [p, c] of fileEntries) {
            if (typeof c === "string" && c.startsWith("data:")) { ctx += `\n<file path="${p}">[uploaded image asset]</file>\n`; continue; }
            const chunk = `<file path="${p}">\n${c}\n</file>\n`;
            if (chunk.length > budget) { ctx += `\n(${p} omitted for length)`; continue; }
            ctx += chunk; budget -= chunk.length;
          }
          return SYSTEM + (fileEntries.length ? `\n\nCURRENT PROJECT FILES:\n${ctx}` : "\n\nThe project is empty. Create it from scratch.");
        };
        const instructions = buildCtx(120_000);
        // Groq's free tier only accepts small requests, so it gets a trimmed view of big projects.
        const smallInstructions = buildCtx(16_000);

        // Old replies carry full file code that is already in CURRENT PROJECT FILES; strip it so long chats never overflow.
        const recent = body.messages.slice(-12);
        const textMessages: ModelMessage[] = recent.map((m, i) => {
          const last = i === recent.length - 1;
          const c = m.role === "assistant" ? m.content.replace(/<file path="([^"]+)">[\s\S]*?(<\/file>|$)/g, "[updated $1]") : m.content;
          return { role: m.role, content: c.slice(0, last ? 20_000 : 3_000) };
        });
        // Attach images to the latest user message for vision-capable models.
        const visionMessages: ModelMessage[] = images.length
          ? textMessages.map((m, i) => i === textMessages.length - 1 && m.role === "user"
            ? { role: "user", content: [{ type: "text", text: String(m.content) }, ...images.map((img) => ({ type: "file" as const, data: img.data, mediaType: img.mediaType }))] }
            : m)
          : textMessages;
        const noteForBlind = images.length ? `\n\n(The user attached ${images.length} image(s) that you cannot see; build from the text description.)` : "";

        const gemini = geminiKey ? createOpenAI({ baseURL: GEMINI_BASE, apiKey: geminiKey }) : null;
        // Groq sits behind Cloudflare, which blocks requests without a User-Agent.
        const groq = groqKey ? createOpenAI({ baseURL: GROQ_BASE, apiKey: groqKey, headers: { "User-Agent": "nexora-ai/1.0" } }) : null;
        const lovable = lovableKey ? createOpenAI({
          baseURL: LOVABLE_BASE, apiKey: lovableKey,
          headers: { "Lovable-API-Key": lovableKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        }) : null;

        const plan = providerPlan({ gemini: !!gemini, groq: !!groq, lovable: !!lovable }, images.length > 0);
        const runStep = (s: ProviderStep) => {
          const messages = s.vision ? visionMessages : textMessages;
          const system = s.vision ? instructions : instructions + noteForBlind;
          if (s.provider === "lovable") {
            return streamText({
              model: lovable!.responses(s.model), instructions: system, messages, abortSignal: request.signal, maxRetries: 0,
              providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", include: ["reasoning.encrypted_content"] } },
            } as Parameters<typeof streamText>[0]);
          }
          const p = s.provider === "groq" ? groq! : gemini!;
          const sys = s.provider === "groq" ? smallInstructions + (s.vision ? "" : noteForBlind) : system;
          return streamText({
            model: p.chat(s.model), system: sys, messages, abortSignal: request.signal, maxRetries: 0,
            ...(s.maxOutputTokens ? { maxOutputTokens: s.maxOutputTokens } : {}),
            providerOptions: { openai: { reasoningEffort: "low" } },
          });
        };

        const enc = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            let lastMsg = "The AI request failed.";
            for (const step of plan) {
              let sent = false;
              let failed = false;
              try {
                const result = runStep(step);
                for await (const part of result.fullStream) {
                  if (part.type === "text-delta") { sent = true; controller.enqueue(enc.encode(part.text)); }
                  else if (part.type === "error") {
                    const e = part.error as { statusCode?: number; message?: string };
                    console.error(`[generate] ${step.provider}/${step.model} failed`, e?.statusCode, e?.message);
                    const busy = "All free AI engines are busy right now. Please wait a minute and try again — your project is safe.";
                    // Keep the most useful reason: a later "out of allowance" from the last backup shouldn't hide that the free engines were just busy.
                    lastMsg = e?.statusCode === 429 || e?.statusCode === 402 || e?.statusCode === 413 ? busy
                      : lastMsg === busy ? busy : e?.message || lastMsg;
                    failed = true;
                    break;
                  }
                }
              } catch (err) {
                if ((err as Error)?.name === "AbortError") { controller.close(); return; }
                console.error(`[generate] ${step.provider}/${step.model} threw`, (err as Error)?.message);
                lastMsg = (err as Error)?.message ?? lastMsg;
                failed = true;
              }
              if (!failed && sent) { controller.close(); return; }
              if (!failed && !sent) { lastMsg = "The AI returned an empty answer."; continue; }
              if (sent) break; // partial output already sent; don't mix providers
            }
            controller.enqueue(enc.encode(`\n[[NEXORA_ERROR]]${lastMsg}`));
            controller.close();
          },
        });
        return new Response(stream, {
          headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache, no-transform" },
        });
      },
    },
  },
});
