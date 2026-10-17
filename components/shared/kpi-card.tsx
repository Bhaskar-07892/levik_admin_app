import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  href,
  accent = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  accent?: "primary" | "gold" | "success" | "warning";
}) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">{value}</p>
        {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          accent === "primary" && "bg-secondary text-primary",
          accent === "gold" && "bg-gold-soft text-[#8a6a2f]",
          accent === "success" && "bg-emerald-50 text-success",
          accent === "warning" && "bg-amber-50 text-warning",
        )}
      >
        <Icon className="size-4.5" />
      </div>
    </div>
  );
  const className =
    "block rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(23,53,80,0.04)] transition-colors";
  return href ? (
    <Link href={href} className={cn(className, "hover:border-brand-slate/50 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
