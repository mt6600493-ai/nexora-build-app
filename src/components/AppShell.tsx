import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Shield, Crown, Home, FolderKanban, LayoutTemplate, Plug, Settings, LifeBuoy, LogOut, Menu, Plus, X } from "lucide-react";
import { Logo } from "./Logo";
import { PricingDialog } from "./PricingDialog";
import { useQuota, creditsLeft } from "@/lib/plan";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { displayName, useAuth } from "@/lib/auth";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/projects", label: "My Projects", icon: FolderKanban },
  { to: "/new", label: "Templates", icon: LayoutTemplate },
  { to: "/integrations", label: "Integrations", icon: Plug },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help & Support", icon: LifeBuoy },
] as const;

export function AppShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pricing, setPricing] = useState(false);
  const { data: quota } = useQuota();
  const left = quota ? creditsLeft(quota) : null;
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 flex items-center justify-between">
        <Logo to="/dashboard" />
        <button className="md:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      {NAV.map((n) => {
        const active = path.startsWith(n.to);
        return (
          <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"}`}>
            <n.icon className="h-4 w-4" /> {n.label}
          </Link>
        );
      })}
      {quota?.admin && (
        <Link to="/admin" onClick={() => setOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${path.startsWith("/admin") ? "bg-sidebar-accent" : "text-glow hover:bg-sidebar-accent/60"}`}>
          <Shield className="h-4 w-4" /> Admin Dashboard
        </Link>
      )}
      {quota?.admin && (
        <div className="mt-3 rounded-xl border border-primary/50 bg-primary/10 p-3 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-glow"><Shield className="h-3.5 w-3.5" /> You are Admin</div>
          <p className="mt-1 text-muted-foreground">Unlimited credits. Open Admin Dashboard to see users, visitors and revenue.</p>
        </div>
      )}
      {quota && !quota.admin && (
        <button onClick={() => setPricing(true)} className="mt-3 rounded-xl border border-sidebar-border p-3 text-left text-xs hover:bg-sidebar-accent/60">
          <div className="flex items-center justify-between font-semibold"><span>{quota.plan === "free" ? "Free plan" : quota.plan === "pro" ? "Pro" : "Pro Plus"}</span><Crown className="h-3.5 w-3.5 text-glow" /></div>
          <div className="mt-1 text-muted-foreground">{left} credits left{quota.plan === "free" ? " today" : " this month"} · 2 per change</div>
          {quota.plan === "free" && <div className="mt-1 text-glow">Upgrade →</div>}
        </button>
      )}
      <div className="mt-auto flex items-center gap-3 rounded-lg border border-sidebar-border p-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-semibold text-primary-foreground">
          {displayName(user).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{displayName(user)}</div>
          <div className="truncate text-xs text-muted-foreground">{quota?.admin ? "Admin · Lifetime" : quota?.plan === "pro" ? "Pro" : quota?.plan === "pro_plus" ? "Pro Plus" : "Free plan"}</div>
        </div>
        <button onClick={() => setConfirm(true)} aria-label="Log out" className="text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-sidebar">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="flex-1">{actions}</div>
          <Button asChild size="sm" className="bg-brand shadow-glow">
            <Link to="/new"><Plus className="h-4 w-4" /> New Project</Link>
          </Button>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
      <PricingDialog open={pricing} onOpenChange={setPricing} />
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>You will be signed out of your account and redirected to the login page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={signOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
