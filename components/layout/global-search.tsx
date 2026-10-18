"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { $api } from "@/lib/api/client";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

interface Result {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  href: string;
}

const ROUTES: Record<string, string> = {
  Plumber: "/plumbers",
  Retailer: "/retailers",
  Product: "/products",
  Scan: "/scans",
  Invoice: "/invoices",
  Redemption: "/redemptions",
  Scheme: "/schemes",
};

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "/" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const term = useDebouncedValue(query.trim(), 250);
  const { data, isFetching } = $api.useQuery("get", "/api/v1/admin/search", { params: { query: { q: term } } }, { enabled: term.length >= 2 });
  const results: Result[] =
    term.length >= 2 ? (data ?? []).map((r) => ({ ...r, href: `${ROUTES[r.type] ?? ""}/${encodeURIComponent(r.id)}` })) : [];

  const go = (result: Result) => {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  };

  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (event.key === "Enter" && results[active]) {
            go(results[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        placeholder="Search plumbers, retailers, products, invoices…"
        aria-label="Global search"
        role="combobox"
        aria-expanded={open && query.trim().length >= 2}
        aria-controls="global-search-results"
        className="h-9 rounded-lg border-transparent bg-muted pl-9 focus-visible:bg-card"
      />
      <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border border-border bg-card px-1.5 text-[10px] text-muted-foreground sm:block">
        /
      </kbd>
      {open && query.trim().length >= 2 ? (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute top-11 right-0 left-0 z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">{isFetching || term !== query.trim() ? "Searching…" : `No matches for “${query}”.`}</p>
          ) : (
            results.map((result, index) => (
              <button
                key={`${result.type}-${result.id}`}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => go(result)}
                onMouseEnter={() => setActive(index)}
                className={cn("flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left", index === active && "bg-accent")}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">{result.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span>
                </span>
                <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground uppercase">
                  {result.type}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
