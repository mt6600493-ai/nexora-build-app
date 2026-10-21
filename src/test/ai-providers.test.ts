import { describe, expect, it } from "vitest";
import { providerPlan } from "@/lib/ai-providers";

describe("AI provider fallback chain", () => {
  it("never uses the retired model names", () => {
    const models = providerPlan({ gemini: true, groq: true, lovable: true }).map((s) => s.model);
    expect(models).not.toContain("llama-3.3-70b-versatile");
    expect(models).not.toContain("gemini-2.5-flash");
  });

  it("tries the free Gemini and Groq keys before the paid workspace gateway", () => {
    const plan = providerPlan({ gemini: true, groq: true, lovable: true });
    expect(plan[0]!.provider).toBe("gemini");
    expect(plan.at(-1)!.provider).toBe("lovable");
  });

  it("puts image-capable models first when the user attached an image", () => {
    const plan = providerPlan({ gemini: true, groq: true }, true);
    expect(plan.slice(0, 2).every((s) => s.vision)).toBe(true);
    expect(plan.at(-1)!.provider).toBe("groq");
  });

  it("skips providers without a key", () => {
    expect(providerPlan({ groq: true }).every((s) => s.provider === "groq")).toBe(true);
  });
});
