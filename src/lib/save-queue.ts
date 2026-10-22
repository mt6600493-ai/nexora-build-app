// Reliable cloud save: one save at a time, newest changes merged, automatic retries.
// Pure (no browser or database imports) so it can be unit tested.

export type SaveState = "saved" | "saving" | "error";

type Opts = { retries?: number; delays?: number[]; wait?: (ms: number) => Promise<void> };

export function createSaveQueue<T extends object>(
  save: (patch: T) => Promise<void>,
  onState: (state: SaveState, error?: string) => void,
  opts: Opts = {},
) {
  const retries = opts.retries ?? 3;
  const delays = opts.delays ?? [1000, 3000, 6000];
  const wait = opts.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let pending: T | null = null;
  let current: Promise<boolean> | null = null;

  async function loop(): Promise<boolean> {
    while (pending) {
      const patch = pending;
      pending = null;
      onState("saving");
      let error: unknown = null;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try { await save(patch); error = null; break; }
        catch (e) { error = e; if (attempt < retries) await wait(delays[Math.min(attempt, delays.length - 1)] ?? 1000); }
      }
      if (error) {
        // Keep the failed changes, with anything newer layered on top, for the next retry.
        pending = { ...patch, ...(pending ?? {}) } as T;
        onState("error", (error as Error)?.message ?? "Save failed");
        return false;
      }
    }
    onState("saved");
    return true;
  }

  function flush(): Promise<boolean> {
    if (!current) current = loop().finally(() => { current = null; });
    return current;
  }

  return {
    /** Queue changes; resolves true once everything queued so far reached the cloud. */
    push(patch: T): Promise<boolean> {
      pending = { ...(pending ?? {}), ...patch } as T;
      if (current) return current.then(() => (pending ? flush() : true));
      return flush();
    },
    retry(): Promise<boolean> { return pending ? flush() : Promise.resolve(true); },
    get dirty() { return !!current || !!pending; },
  };
}
