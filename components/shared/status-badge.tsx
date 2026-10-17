import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "gold";

const TONE_BY_STATUS: Record<string, Tone> = {
  Approved: "success",
  Verified: "success",
  Active: "success",
  Delivered: "success",
  "In Stock": "success",
  Resolved: "success",
  Posted: "success",
  Pending: "warning",
  Submitted: "warning",
  Requested: "warning",
  "Low Stock": "warning",
  Open: "warning",
  "More Information Required": "warning",
  "Under Review": "info",
  Processing: "info",
  Dispatched: "info",
  Scheduled: "info",
  "In Progress": "info",
  Rejected: "danger",
  Suspended: "danger",
  Failed: "danger",
  Flagged: "danger",
  "Out of Stock": "danger",
  High: "danger",
  Medium: "warning",
  Low: "neutral",
  Inactive: "neutral",
  Draft: "neutral",
  Closed: "neutral",
  Cancelled: "neutral",
  Completed: "neutral",
  Paused: "neutral",
  Achieved: "gold",
};

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-emerald-50 text-success ring-emerald-600/20",
  warning: "bg-amber-50 text-warning ring-amber-600/25",
  danger: "bg-red-50 text-destructive ring-red-600/20",
  info: "bg-sky-50 text-primary ring-sky-700/20",
  neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
  gold: "bg-gold-soft text-[#7a5f2c] ring-[#b8975a]/40",
};

const DOT_CLASSES: Record<Tone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  info: "bg-primary",
  neutral: "bg-slate-400",
  gold: "bg-gold",
};

export function StatusBadge({ status, tone, className }: { status: string; tone?: Tone; className?: string }) {
  const resolved = tone ?? TONE_BY_STATUS[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        TONE_CLASSES[resolved],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT_CLASSES[resolved])} aria-hidden />
      {status}
    </span>
  );
}

export function RoleBadge({ role }: { role: "plumber" | "retailer" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        role === "plumber" ? "bg-secondary text-secondary-foreground" : "bg-gold-soft text-[#7a5f2c]",
      )}
    >
      {role}
    </span>
  );
}
