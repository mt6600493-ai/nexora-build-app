import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { displayName, useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Nexora AI" }, { name: "description", content: "Manage your Nexora AI account." }, { property: "og:title", content: "Settings — Nexora AI" }, { property: "og:description", content: "Account settings." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  useEffect(() => { setName(displayName(user)); }, [user]);

  async function saveName() {
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    error ? toast.error(error.message) : toast.success("Profile updated");
  }
  async function savePw() {
    if (pw.length < 8) return toast.error("Use at least 8 characters.");
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: current } as never);
    if (error) return toast.error(error.message);
    toast.success("Password changed"); setPw(""); setCurrent("");
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="mt-6 max-w-xl space-y-6">
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Profile</h2>
          <div className="space-y-1.5"><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div className="space-y-1.5"><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <Button className="bg-brand" onClick={saveName}>Save</Button>
        </section>
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Change password</h2>
          <div className="space-y-1.5"><Label>Current password</Label><Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>New password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
          <Button variant="outline" onClick={savePw}>Update password</Button>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          <h2 className="mb-2 font-semibold text-foreground">Plan</h2>
          Nexora AI has no credit system. Fair-use limits (a few requests per minute) protect the service from abuse.
        </section>
      </div>
    </AppShell>
  );
}
