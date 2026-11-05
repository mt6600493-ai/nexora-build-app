import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, DollarSign, Eye, FolderKanban, Globe, LogIn, Sparkles, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuota } from "@/lib/plan";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Command Center — Nexora AI" }, { name: "description", content: "Founder dashboard for users, premium members, visitors and revenue." }, { property: "og:title", content: "Admin — Nexora AI" }, { property: "og:description", content: "Founder dashboard." }, { name: "robots", content: "noindex" }] }),
  component: Admin,
});

type Stats = Record<string, number>;
type Row = { id: string; email: string; created_at: string; last_sign_in_at: string | null; premium: boolean; premium_until: string | null };

function Admin() {
  const { data: quota, isLoading } = useQuota();
  const isAdmin = !!quota?.admin;
  const qc = useQueryClient();
  const stats = useQuery({ queryKey: ["admin-stats"], enabled: isAdmin, refetchInterval: 30_000, queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_stats"); if (error) throw error; return data as unknown as Stats; } });
  const users = useQuery({ queryKey: ["admin-users"], enabled: isAdmin, queryFn: async () => {
    const { data, error } = await supabase.rpc("admin_users"); if (error) throw error; return (data ?? []) as Row[]; } });

  async function setPlan(u: Row, premium: boolean) {
    const { error } = await supabase.rpc("admin_set_plan", { _uid: u.id, _premium: premium, _months: 1 });
    if (error) toast.error(error.message); else { toast.success(premium ? "Premium given for 1 month" : "Moved to Free"); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); }
  }

  if (isLoading) return <AppShell><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  if (!isAdmin) return <AppShell><p className="text-sm">This page is only for the admin. <Link to="/dashboard" className="text-glow underline">Go home</Link></p></AppShell>;

  const s = stats.data ?? {};
  const cards = [
    { icon: Users, label: "Registered users", v: s.users },
    { icon: UserPlus, label: "New today", v: s.new_today },
    { icon: LogIn, label: "Logins today", v: s.logins_today },
    { icon: Crown, label: "Premium users", v: s.premium },
    { icon: Users, label: "Free users", v: s.free },
    { icon: DollarSign, label: "Monthly income", v: s.revenue_month, money: true },
    { icon: Eye, label: "App visitors (all)", v: s.visits },
    { icon: Eye, label: "Visitors today", v: s.visits_today },
    { icon: FolderKanban, label: "Projects", v: s.projects },
    { icon: Globe, label: "Published apps", v: s.published },
    { icon: Sparkles, label: "AI messages today", v: s.ai_today },
  ];

  return (
    <AppShell>
      <h1 className="text-2xl font-bold">Admin Command Center</h1>
      <p className="mt-1 text-sm text-muted-foreground">Only you can see this page. Updates every 30 seconds.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="mirror-card rounded-2xl border border-border p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><c.icon className="h-4 w-4 text-glow" />{c.label}</div>
            <div className="mt-2 text-2xl font-bold">{c.v == null ? "…" : c.money ? `$${c.v}` : c.v.toLocaleString()}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Monthly income is counted as $25 × active Premium users.</p>

      <h2 className="mt-8 text-lg font-semibold">Users</h2>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">Email</th><th className="p-3">Joined</th><th className="p-3">Last login</th><th className="p-3">Plan</th><th className="p-3" /></tr></thead>
          <tbody>
            {(users.data ?? []).map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="max-w-[200px] truncate p-3">{u.email}</td>
                <td className="p-3 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3 text-xs">{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : "—"}</td>
                <td className="p-3 text-xs">{u.premium ? <span className="text-glow">Premium{u.premium_until ? ` · until ${new Date(u.premium_until).toLocaleDateString()}` : ""}</span> : "Free"}</td>
                <td className="p-3"><Button size="sm" variant="outline" onClick={() => setPlan(u, !u.premium)}>{u.premium ? "Make Free" : "Give Premium"}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
