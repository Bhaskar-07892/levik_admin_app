"use client";

import { PERIOD_LABELS, type Period } from "@/lib/utils/period";
import { cn } from "@/lib/utils";

export function PeriodFilter({ value, onChange }: { value: Period; onChange: (period: Period) => void }) {
  return (
    <div role="radiogroup" aria-label="Reporting period" className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {(Object.keys(PERIOD_LABELS) as Period[]).map((period) => (
        <button
          key={period}
          type="button"
          role="radio"
          aria-checked={value === period}
          onClick={() => onChange(period)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none",
            value === period ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {period === "all" ? "All" : period.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
