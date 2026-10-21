// Pure, browser-safe description of the AI provider fallback chain used by /api/generate.
// Model names are checked against the providers' live model lists; update here when they retire a model.

export type ProviderId = "gemini" | "groq" | "lovable";
export type ProviderStep = { provider: ProviderId; model: string; vision: boolean };

export const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
export const GROQ_BASE = "https://api.groq.com/openai/v1";
export const LOVABLE_BASE = "https://ai.gateway.lovable.dev/v1";

const CHAIN: ProviderStep[] = [
  // Gemini first: large free context window, handles full websites and can see uploaded images.
  { provider: "gemini", model: "gemini-3-flash-preview", vision: true },
  // Groq: very fast, but its free tier allows only ~8k tokens per minute per model.
  { provider: "groq", model: "openai/gpt-oss-120b", vision: false },
  { provider: "groq", model: "qwen/qwen3.8-27b", vision: false },
  { provider: "gemini", model: "gemini-flash-latest", vision: true },
  { provider: "lovable", model: "openai/gpt-6-astra", vision: true },
];

/** Ordered attempts for the keys that are configured. With images, vision models go first. */
export function providerPlan(keys: Partial<Record<ProviderId, boolean>>, hasImages = false): ProviderStep[] {
  const steps = CHAIN.filter((s) => keys[s.provider]);
  if (!hasImages) return steps;
  return [...steps.filter((s) => s.vision), ...steps.filter((s) => !s.vision)];
}
