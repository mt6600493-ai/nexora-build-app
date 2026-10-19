import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = { session: Session | null; user: User | null; loading: boolean };
const AuthCtx = createContext<AuthState>({ session: null, user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, user: null, loading: true });
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setState({ session, user: session?.user ?? null, loading: false });
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ session, user: session?.user ?? null, loading: false });
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);

export function displayName(user: User | null | undefined) {
  if (!user) return "there";
  const m = (user.user_metadata ?? {}) as { full_name?: unknown; name?: unknown };
  const pick = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");
  return pick(m.full_name) || pick(m.name) || user.email?.split("@")[0] || "there";
}
