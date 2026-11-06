import { Check, Crown, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plan";

const TIERS = [
  { name: "Free", price: 0, features: ["10 credits every day (100 per month)", "2 credits per change or fix", "First publish free, then 2 credits", "Free Chat mode (100/day, refreshes at midnight)"], live: true },
  { name: PLANS.pro.name, price: PLANS.pro.price, features: [`${PLANS.pro.credits.toLocaleString()} credits every month`, `${PLANS.pro.publishes} app publishes per month`, "Faster advanced AI", "Connect your own domain"], live: false },
  { name: PLANS.pro_plus.name, price: PLANS.pro_plus.price, features: [`${PLANS.pro_plus.credits.toLocaleString()} credits every month`, `${PLANS.pro_plus.publishes} app publishes per month`, "Fastest pro AI for 3D games", "Priority support"], live: false },
];

export function PricingDialog({ open, onOpenChange, reason }: { open: boolean; onOpenChange: (o: boolean) => void; reason?: string }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-glow" />Choose your plan</DialogTitle>
          <DialogDescription>{reason || "Build more, publish more."}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          {TIERS.map((t) => (
            <div key={t.name} className={`mirror-card flex flex-col rounded-2xl border p-4 ${t.live ? "border-border" : "border-primary"}`}>
              <div className="flex items-center gap-1 text-sm font-semibold">{!t.live && <Sparkles className="h-4 w-4 text-glow" />}{t.name}</div>
              <div className="mt-1 text-2xl font-bold">${t.price}<span className="text-sm font-normal text-muted-foreground">/month</span></div>
              <ul className="mt-3 flex-1 space-y-1.5 text-xs">{t.features.map((f) => <li key={f} className="flex gap-1.5"><Check className="h-3.5 w-3.5 shrink-0 text-success" />{f}</li>)}</ul>
              <Button className="mt-4 w-full" variant={t.live ? "outline" : "default"} disabled>{t.live ? "Current free plan" : "Coming soon"}</Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
