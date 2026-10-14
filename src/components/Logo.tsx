import { Link } from "@tanstack/react-router";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <div className={`${className} grid place-items-center rounded-lg bg-brand shadow-glow`}>
      <svg viewBox="0 0 24 24" className="h-[60%] w-[60%]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 19V5l14 14V5" className="text-primary-foreground" />
      </svg>
    </div>
  );
}

export function Logo({ to = "/" }: { to?: "/" | "/dashboard" }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 font-display text-lg font-semibold">
      <LogoMark />
      <span>Nexora AI</span>
    </Link>
  );
}
