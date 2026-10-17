"use client";

import { cn } from "@/lib/utils";

export function StatusTabs<T extends string>({
  value,
  onChange,
  tabs,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: Array<{ value: T; label: string; count: number }>;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto border-b border-border px-4">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "-mb-px flex items-center gap-2 border-b-2 px-3 py-3 text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
            value === tab.value ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
          <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", value === tab.value ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
