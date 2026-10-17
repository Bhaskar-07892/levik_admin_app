import { cn } from "@/lib/utils";

export function ProgressBar({ value, className, tone }: { value: number; className?: string; tone?: "primary" | "gold" | "success" | "warning" }) {
  const pct = Math.max(0, Math.min(100, value));
  const resolved = tone ?? (pct >= 100 ? "success" : pct >= 60 ? "primary" : "warning");
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          "h-full rounded-full transition-all",
          resolved === "primary" && "bg-primary",
          resolved === "gold" && "bg-gold",
          resolved === "success" && "bg-success",
          resolved === "warning" && "bg-warning",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
