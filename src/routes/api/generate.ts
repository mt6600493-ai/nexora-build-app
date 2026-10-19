import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";

const MODEL = "openai/gpt-6-astra";

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
  if (arr.length >= 60) return false;
  if (arr.filter((t) => now - t < 60 * 1000).length >= 6) return false;
  arr.push(now);
  hits.set(userId, arr);
  return true;
}

type Body = {
  messages: { role: "user" | "assistant"; content: string }[];
  files: Record<string, string>;
};

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { "Content-Type": "application/json" } });

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

        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, "No AI provider is configured on the server.");

        const body = (await request.json()) as Body;
        if (!Array.isArray(body.messages) || body.messages.length === 0) return json(400, "Missing prompt.");

        const fileEntries = Object.entries(body.files ?? {});
        let ctx = "";
        let budget = 120_000;
        for (const [p, c] of fileEntries) {
          if (budget <= 0) { ctx += `\n(${p} omitted for length)`; continue; }
          const chunk = `<file path="${p}">\n${c}\n</file>\n`;
          ctx += chunk; budget -= chunk.length;
        }
        const instructions = SYSTEM + (fileEntries.length
          ? `\n\nCURRENT PROJECT FILES:\n${ctx}`
          : "\n\nThe project is empty. Create it from scratch.");

        const messages: ModelMessage[] = body.messages.slice(-20).map((m) => ({
          role: m.role,
          content: m.content.slice(0, 20_000),
        }));

        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });

        const result = streamText({
          model: provider.responses(MODEL),
          instructions,
          messages,
          abortSignal: request.signal,
          maxRetries: 0,
          providerOptions: {
            openai: { store: false, forceReasoning: true, reasoningEffort: "low", include: ["reasoning.encrypted_content"] },
          },
        });

        const enc = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const part of result.fullStream) {
                if (part.type === "text-delta") controller.enqueue(enc.encode(part.text));
                else if (part.type === "error") {
                  const e = part.error as { statusCode?: number; message?: string };
                  const msg =
                    e?.statusCode === 402 ? "The AI service has run out of its usage allowance for this workspace."
                    : e?.statusCode === 429 ? "The AI service is busy right now. Please try again shortly."
                    : e?.message || "The AI request failed.";
                  controller.enqueue(enc.encode(`\n[[NEXORA_ERROR]]${msg}`));
                }
              }
            } catch (err) {
              if ((err as Error)?.name !== "AbortError")
                controller.enqueue(enc.encode(`\n[[NEXORA_ERROR]]${(err as Error)?.message ?? "Generation failed."}`));
            }
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
