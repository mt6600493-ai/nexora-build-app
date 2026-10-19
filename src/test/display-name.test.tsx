import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { displayName } from "@/lib/auth";

describe("displayName", () => {
  it("does not crash when a new user has no profile data yet", () => {
    const user = { email: "new.user@example.com", user_metadata: null } as unknown as User;
    expect(displayName(user)).toBe("new.user");
  });
});
