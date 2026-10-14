import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { LogoMark } from "@/components/Logo";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { redirect: location.href } });
  },
  pendingComponent: () => (
    <div className="grid min-h-screen place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <LogoMark className="h-12 w-12 animate-pulse" />
        <span className="text-sm">Loading Nexora AI…</span>
      </div>
    </div>
  ),
  component: () => <Outlet />,
});
