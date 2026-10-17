"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";

export function TableToolbar({
  search,
  onSearchChange,
  placeholder = "Search…",
  children,
  trailing,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  children?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
      <div className="relative w-full lg:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 bg-card pr-8 pl-8"
        />
        {search ? (
          <button
            type="button"
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2 [&>*]:w-full sm:[&>*]:w-44">{children}</div>
      {trailing ? <div className="flex items-center gap-2">{trailing}</div> : null}
    </div>
  );
}

export const matches = (query: string, ...fields: Array<string | undefined | null>) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((field) => field?.toLowerCase().includes(q));
};
