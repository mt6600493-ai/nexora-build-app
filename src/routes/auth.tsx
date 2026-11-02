import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";

const search = z.object({
  mode: z.enum(["signin", "signup", "forgot", "magic"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Sign in — Nexora AI" },
      { name: "description", content: "Sign in or create your Nexora AI account to start building." },
      { property: "og:title", content: "Sign in — Nexora AI" },
      { property: "og:description", content: "Access your Nexora AI projects." },
    ],
  }),
  component: AuthPage,
});

const safe = (r?: string) => {
  if (!r) return "/dashboard";
  try {
    const u = new URL(r, "http://x");
    return r.startsWith("/") && !r.startsWith("//") ? u.pathname + u.search : "/dashboard";
  } catch { return "/dashboard"; }
};

function AuthPage() {
  const { mode = "signin", redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const target = safe(redirect);

  const [finishing, setFinishing] = useState(false);

  // Coming back from Google / an email link: finish the sign-in from the URL before showing the form,
  // so the page never bounces back to the login screen.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const access_token = hash.get("access_token");
    const refresh_token = hash.get("refresh_token");
    const code = query.get("code");
    const err = hash.get("error_description") || query.get("error_description");
    if (err) { toast.error(err); return; }
    if (!(access_token && refresh_token) && !code) return;
    setFinishing(true);
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const r = access_token && refresh_token
          ? await supabase.auth.setSession({ access_token, refresh_token })
          : await supabase.auth.exchangeCodeForSession(code!);
        if (r.error) { toast.error("Sign-in didn't finish. Please try again."); setFinishing(false); return; }
      }
      window.history.replaceState(null, "", window.location.pathname);
      const after = sessionStorage.getItem("nexora:after-auth");
      sessionStorage.removeItem("nexora:after-auth");
      navigate({ to: safe(after ?? redirect) as "/dashboard", replace: true });
    })();
  }, [navigate, redirect]);

  useEffect(() => {
    if (!loading && user) {
      const after = sessionStorage.getItem("nexora:after-auth");
      sessionStorage.removeItem("nexora:after-auth");
      navigate({ to: (after ? safe(after) : target) as "/dashboard", replace: true });
    }
  }, [user, loading, target, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters.");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin + target, data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) setSent("Check your inbox to confirm your email, then sign in.");
      } else if (mode === "magic") {
        if (redirect) sessionStorage.setItem("nexora:after-auth", target);
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${window.location.origin}/auth` } });
        if (error) throw error;
        setSent("We emailed you a one-click sign-in link. Open it on this device to sign in — no password needed.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setSent("If an account exists, a password reset link is on its way.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  async function google() {
    sessionStorage.setItem("nexora:after-auth", target);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) { toast.error("Google sign-in failed. Please try again."); return; }
    if (r.redirected) return;
    navigate({ to: target as "/dashboard", replace: true });
  }

  const title = mode === "signup" ? "Create Your Account" : mode === "forgot" ? "Reset your password" : mode === "magic" ? "One-click sign in" : "Welcome Back";
  const sub = mode === "signup" ? "Join Nexora AI and start building today." : mode === "forgot" ? "We'll email you a reset link." : mode === "magic" ? "Enter your email and we'll send you a sign-in link. No password needed." : "Sign in to continue to your account";

  if (finishing || (user && !loading)) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Signing you into Nexora AI…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
          {sent ? (
            <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm">
              <CheckCircle2 className="mb-2 h-5 w-5 text-success" />{sent}
              <Link to="/auth" search={{ mode: "signin", redirect }} className="mt-4 block text-glow">Back to sign in</Link>
            </div>
          ) : (
            <>
              <form onSubmit={submit} className="mt-8 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5"><Label htmlFor="name">Full name</Label>
                    <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" /></div>
                )}
                <div className="space-y-1.5"><Label htmlFor="email">Email address</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
                {mode !== "forgot" && mode !== "magic" && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between"><Label htmlFor="pw">Password</Label>
                      {mode === "signin" && <Link to="/auth" search={{ mode: "forgot", redirect }} className="text-xs text-glow">Forgot password?</Link>}</div>
                    <div className="relative">
                      <Input id="pw" type={show ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={mode === "signup" ? "Create a strong password" : "Enter your password"} />
                      <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-2.5 text-muted-foreground" aria-label="Toggle password">
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={busy} className="w-full bg-brand">
                  {busy ? "Please wait…" : mode === "signup" ? "Sign Up" : mode === "forgot" ? "Send reset link" : mode === "magic" ? "Email me a sign-in link" : "Sign In"}
                </Button>
              </form>
              {mode !== "forgot" && (
                <>
                  <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or continue with<div className="h-px flex-1 bg-border" /></div>
                  <Button variant="outline" className="w-full" onClick={google}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1a5.98 5.98 0 0 1 0-11.96c1.84 0 3.07.78 3.78 1.46l2.58-2.49A9.4 9.4 0 0 0 12 2.6a9.4 9.4 0 1 0 0 18.8c5.42 0 9.02-3.81 9.02-9.18 0-.62-.07-1.09-.15-1.56z" /></svg>
                    Google
                  </Button>
                  {mode === "magic" ? (
                    <Button asChild variant="ghost" className="mt-2 w-full"><Link to="/auth" search={{ mode: "signin", redirect }}>Sign in with password instead</Link></Button>
                  ) : (
                    <Button asChild variant="ghost" className="mt-2 w-full"><Link to="/auth" search={{ mode: "magic", redirect }}><Mail className="h-4 w-4" />Email me a one-click link</Link></Button>
                  )}
                </>
              )}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signup" ? <>Already have an account? <Link to="/auth" search={{ mode: "signin", redirect }} className="text-glow">Sign in</Link></>
                  : <>Don't have an account? <Link to="/auth" search={{ mode: "signup", redirect }} className="text-glow">Sign up</Link></>}
              </p>
            </>
          )}
        </div>
      </div>
      <div className="relative hidden overflow-hidden border-l border-border bg-card/30 backdrop-blur-md lg:flex lg:flex-col lg:justify-center lg:px-16">
        <h2 className="text-4xl font-bold">Build anything<br />with AI</h2>
        <ul className="mt-8 space-y-3 text-muted-foreground">
          {["Create websites & apps", "Edit with natural language", "Live preview on every device", "No credit system"].map((x) => (
            <li key={x} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-glow" />{x}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
