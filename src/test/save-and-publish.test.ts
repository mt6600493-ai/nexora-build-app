import { describe, expect, it } from "vitest";
import { createSaveQueue, type SaveState } from "@/lib/save-queue";
import { filesHash } from "@/lib/files";
import { resolveAssets } from "@/lib/assets";

const noWait = () => Promise.resolve();

describe("cloud save queue", () => {
  it("retries a failed save 3 times before reporting an error", async () => {
    let calls = 0;
    const states: SaveState[] = [];
    const q = createSaveQueue(async () => { calls++; throw new Error("statement timeout"); }, (s) => states.push(s), { wait: noWait });
    expect(await q.push({ a: 1 })).toBe(false);
    expect(calls).toBe(4); // first try + 3 retries
    expect(states.at(-1)).toBe("error");
    expect(q.dirty).toBe(true);
  });

  it("keeps failed changes and saves them on retry", async () => {
    let fail = true;
    const saved: object[] = [];
    const q = createSaveQueue<{ files?: string; name?: string }>(async (p) => { if (fail) throw new Error("offline"); saved.push(p); }, () => {}, { wait: noWait });
    await q.push({ files: "v1" });
    fail = false;
    await q.push({ name: "New name" });
    expect(saved).toEqual([{ files: "v1", name: "New name" }]);
    expect(q.dirty).toBe(false);
  });

  it("never runs two saves at the same time and always saves the newest files", async () => {
    let running = 0, maxRunning = 0;
    const saved: string[] = [];
    const q = createSaveQueue<{ files: string }>(async (p) => {
      running++; maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 5));
      saved.push(p.files); running--;
    }, () => {});
    q.push({ files: "v1" }); q.push({ files: "v2" });
    await q.push({ files: "v3" });
    expect(maxRunning).toBe(1);
    expect(saved.at(-1)).toBe("v3");
  });
});

describe("publish changes detection", () => {
  it("changes when any file changes and ignores key order", () => {
    const a = filesHash({ "index.html": "<h1>Hi</h1>", "style.css": "body{}" });
    expect(filesHash({ "style.css": "body{}", "index.html": "<h1>Hi</h1>" })).toBe(a);
    expect(filesHash({ "index.html": "<h1>Hi!</h1>", "style.css": "body{}" })).not.toBe(a);
  });
});

describe("cloud image assets", () => {
  it("swaps asset references for the stored image", () => {
    const out = resolveAssets({ "assets/logo.jpg": "nexora-asset:abc", "index.html": "<img src=assets/logo.jpg>" }, { abc: "data:image/jpeg;base64,AAA" });
    expect(out["assets/logo.jpg"]).toBe("data:image/jpeg;base64,AAA");
    expect(out["index.html"]).toBe("<img src=assets/logo.jpg>");
  });
});
