import { Check, Crown, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PREMIUM_PRICE_USD } from "@/lib/plan";

const FREE = ["10 credits every day (100 per month)", "1 credit = 1 change or fix", "Free Chat mode (refreshes at midnight)", "2 apps published, then 1 more each month"];
const PREMIUM = ["Unlimited building & editing", "Unlimited Chat mode", "10 app publishes every month", "Advanced AI for bigger apps & 3D games", "Connect your own custom domain"];

export function PricingDialog({ open, onOpenChange, reason }: { open: boolean; onOpenChange: (o: boolean) => void; reason?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-glow" />Upgrade to Premium</DialogTitle>
          <DialogDescription>{reason || "Build without limits."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="mirror-card rounded-2xl border border-border p-4">
            <div className="text-sm font-semibold">Free</div>
            <div className="mt-1 text-2xl font-bold">$0</div>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">{FREE.map((f) => <li key={f} className="flex gap-1.5"><Check className="h-3.5 w-3.5 shrink-0" />{f}</li>)}</ul>
          </div>
          <div className="mirror-card rounded-2xl border border-primary p-4">
            <div className="flex items-center gap-1 text-sm font-semibold"><Sparkles className="h-4 w-4 text-glow" />Premium</div>
            <div className="mt-1 text-2xl font-bold">${PREMIUM_PRICE_USD}<span className="text-sm font-normal text-muted-foreground">/month</span></div>
            <ul className="mt-3 space-y-1.5 text-xs">{PREMIUM.map((f) => <li key={f} className="flex gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-success" />{f}</li>)}</ul>
          </div>
        </div>
        <Button className="w-full bg-brand" disabled>Online payment coming soon</Button>
        <p className="text-center text-xs text-muted-foreground">Card payment is being set up. Until then, contact support from the Help page to get Premium.</p>
      </DialogContent>
    </Dialog>
  );
}
